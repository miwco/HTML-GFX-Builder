// In-browser compilation + static validation of the video composition module.
//
// sucrase transforms TSX -> CommonJS ('typescript', 'jsx', 'imports'; automatic JSX
// runtime). The SAME output feeds the player host's require shim (preview) and the render
// worker's (final render), so what you see is exactly what renders. sucrase does not
// typecheck - TS type errors surface later as runtime probe errors.
//
// The static checks are the contract half the AI is prompted with: imports restricted to
// react/remotion, deterministic frame-derived animation (no wall clocks, timers, or
// Math.random), no network, no DOM/global access. Rules teach - every message says what
// to use instead - because they also feed the AI's repair rounds verbatim.

import { transform } from 'sucrase';
import type { ValidationIssue } from '../validation/validateTemplate';
import type { VideoAssetInfo } from './types';

export const MAX_TSX_BYTES = 64_000;

const ALLOWED_IMPORTS = new Set(['react', 'remotion']);

/** Forbidden API patterns, each with a teaching message (fed back to the AI on repair). */
const FORBIDDEN: { re: RegExp; what: string; instead: string }[] = [
  { re: /\bMath\.random\s*\(/, what: 'Math.random()', instead: "use remotion's random(seed) - renders must be deterministic per frame" },
  { re: /\bDate\.now\s*\(/, what: 'Date.now()', instead: 'derive all timing from useCurrentFrame()' },
  { re: /\bnew\s+Date\s*\(\s*\)/, what: 'new Date()', instead: 'derive all timing from useCurrentFrame()' },
  { re: /\bperformance\.now\s*\(/, what: 'performance.now()', instead: 'derive all timing from useCurrentFrame()' },
  { re: /\bsetTimeout\s*\(/, what: 'setTimeout', instead: 'animate with interpolate()/spring() from the current frame' },
  { re: /\bsetInterval\s*\(/, what: 'setInterval', instead: 'animate with interpolate()/spring() from the current frame' },
  { re: /\brequestAnimationFrame\s*\(/, what: 'requestAnimationFrame', instead: 'the frame comes from useCurrentFrame()' },
  { re: /\bfetch\s*\(/, what: 'fetch', instead: 'assets arrive via the `assets` prop; no network at render time' },
  { re: /\bXMLHttpRequest\b/, what: 'XMLHttpRequest', instead: 'no network at render time' },
  { re: /\bWebSocket\b/, what: 'WebSocket', instead: 'no network at render time' },
  { re: /\bEventSource\b/, what: 'EventSource', instead: 'no network at render time' },
  { re: /\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/, what: 'browser storage', instead: 'compositions are pure functions of frame + props' },
  { re: /\bdocument\.cookie\b/, what: 'document.cookie', instead: 'compositions are pure functions of frame + props' },
  { re: /\beval\s*\(/, what: 'eval', instead: 'not allowed in compositions' },
  { re: /\bnew\s+Function\s*\(/, what: 'new Function', instead: 'not allowed in compositions' },
  { re: /\bprocess\s*\./, what: 'process.*', instead: 'no environment access in compositions' },
  { re: /\bwindow\s*\./, what: 'window.*', instead: 'compositions render through React only - no direct globals' },
  { re: /\bglobalThis\s*\./, what: 'globalThis.*', instead: 'compositions render through React only - no direct globals' },
  { re: /\bdocument\s*\./, what: 'document.*', instead: 'render everything through JSX - no direct DOM access' },
  { re: /\bOffthreadVideo\b/, what: 'OffthreadVideo', instead: 'use <Video> - project assets are data/blob URLs, which OffthreadVideo’s frame extractor cannot read' },
];

/**
 * The source with every COMMENT body replaced by spaces, same length and same line breaks.
 *
 * Every rule below is a claim about what the composition DOES, and a comment does nothing.
 * Scanning raw source makes the model's own prose incriminating - and the prompts ask for
 * commented code, so the model writes exactly the sentences that trip the patterns. Measured:
 * three of three `forbidden-api` findings in a 21-run HyperFrames bench were the model
 * asserting it had AVOIDED the API - `// deterministic distance, no repeat:-1` matched
 * /repeat\s*:\s*-1/. One of them burned both repair rounds and failed the generation, because
 * the finding quotes the offending line, the model rewords the comment, and it matches again.
 * Same shape as the xmlns namespace bug in docs/HYPERFRAMES_QUALITY.md: a rule that cannot be
 * satisfied makes the repair loop unwinnable by construction.
 *
 * Blanking rather than deleting keeps every offset and line number exact, so `quoteMatch`
 * still names the right line. The scanner tracks string literals so a `//` inside a quoted
 * value (`href="//cdn"`, `'https://…'`) is never mistaken for a comment; where it cannot tell
 * (an unmatched apostrophe in HTML text) it leaves the text alone, which preserves today's
 * behaviour rather than hiding a real violation. Comments only ever LOSE the power to
 * trigger a rule - a commented-out `export default` no longer satisfies its check either.
 */
export function blankComments(source: string): string {
  const out = source.split('');
  const blank = (from: number, to: number) => {
    for (let i = from; i < to && i < out.length; i++) if (out[i] !== '\n') out[i] = ' ';
  };
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      // Skip the literal whole, honouring backslash escapes.
      let j = i + 1;
      while (j < source.length && source[j] !== ch) j += source[j] === '\\' ? 2 : 1;
      i = j + 1;
    } else if (two === '//') {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      blank(i, stop);
      i = stop;
    } else if (two === '/*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      blank(i, stop);
      i = stop;
    } else if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4);
      const stop = end === -1 ? source.length : end + 3;
      blank(i, stop);
      i = stop;
    } else {
      i++;
    }
  }
  return out.join('');
}

/**
 * Quote the exact source line a pattern matched, as a suffix for the finding's message.
 * The repair round gets the model's OWN line back instead of an abstract rule - the one
 * change that reliably converts "understood the rule, edited around it" into a real fix
 * (a banned window.* access once survived both rounds against rule text alone).
 */
export function quoteMatch(source: string, re: RegExp): string {
  const m = new RegExp(re.source, re.flags.replace('g', '')).exec(source);
  if (!m) return '';
  const line = source.slice(0, m.index).split('\n').length;
  const text = (source.split('\n')[line - 1] ?? '').trim();
  return ` Offending line ${line}: \`${text.length > 160 ? `${text.slice(0, 160)}…` : text}\``;
}

export type CompileResult = { ok: true; js: string } | { ok: false; error: string };

export function compileTsx(tsx: string): CompileResult {
  let code: string;
  try {
    code = transform(tsx, {
      transforms: ['typescript', 'jsx', 'imports'],
      jsxRuntime: 'automatic',
      production: true,
    }).code;
  } catch (e) {
    // sucrase errors carry line:col in the message.
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  // sucrase is token-based and does NO scope analysis, so it silently accepts source a JS
  // engine rejects at parse time (a duplicate `const`, a stray reserved word). Parse the
  // emitted module the way the player host will - construct a Function, never execute it -
  // so those surface here as a clean compile error instead of an opaque failure once the
  // host tries to evaluate the module. (The app already relies on Function on the main
  // thread; see model/spxDefinition.ts.)
  try {
    new Function('exports', 'require', 'module', code);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  return { ok: true, js: code };
}

/** Static contract checks on the SOURCE (before/independent of the live probe). */
export function staticValidate(
  tsxRaw: string,
  assets: VideoAssetInfo[],
  /** The inputs the emit declared, when the caller has them - see deadInputIssues. */
  declaredInputs: { key: string }[] = [],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  // Every pattern check below asks what the module DOES, so none of them may read comments.
  const tsx = blankComments(tsxRaw);

  if (tsx.length > MAX_TSX_BYTES) {
    issues.push({
      rule: 'oversized',
      message: `The module is ${Math.round(tsx.length / 1000)} kB - keep it under ${MAX_TSX_BYTES / 1000} kB.`,
    });
  }

  // Imports: static `import ... from 'x'`, dynamic import('x'), bare require('x').
  for (const m of tsx.matchAll(/import\s+(?:[\w${}\s,*]+\s+from\s+)?['"]([^'"]+)['"]/g)) {
    if (!ALLOWED_IMPORTS.has(m[1])) {
      issues.push({
        rule: 'imports',
        message: `Import "${m[1]}" is not allowed - only 'react' and 'remotion' are available.${quoteMatch(tsx, new RegExp(`import[^\\n]*['"]${m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`))}`,
      });
    }
  }
  if (/\bimport\s*\(/.test(tsx)) {
    issues.push({ rule: 'imports', message: 'Dynamic import() is not allowed - use static imports of react/remotion.' });
  }
  if (/\brequire\s*\(/.test(tsx)) {
    issues.push({ rule: 'imports', message: 'require() is not allowed - use static imports of react/remotion.' });
  }

  if (!/export\s+default\s/.test(tsx)) {
    issues.push({ rule: 'default-export', message: 'The module must default-export the composition component.' });
  }

  for (const f of FORBIDDEN) {
    if (f.re.test(tsx)) {
      issues.push({
        rule: 'forbidden-api',
        message: `${f.what} is not allowed - ${f.instead}.${quoteMatch(tsx, f.re)}`,
      });
    }
  }

  // Network URLs: nothing may load from the network (assets travel as props).
  if (/https?:\/\//.test(tsx)) {
    issues.push({
      rule: 'network-url',
      message: `http(s):// URLs are not allowed - reference uploaded assets via the \`assets\` prop instead.${quoteMatch(tsx, /https?:\/\//)}`,
    });
  }

  // Dead controls, then unknown asset references (the latter warning-level; the caller splits).
  return issues.concat(deadInputIssues(tsx, declaredInputs), assetNameWarnings(tsx, assets));
}

/**
 * A declared input the module never reads renders a control in the Content panel that does
 * nothing when the operator changes it - a promise the composition does not keep. The
 * HyperFrames side has enforced the same contract since a benchmark caught it shipping
 * (validate.ts, rule `variables`); nothing checked it here, because Remotion declares its
 * inputs in the emit tool rather than in the code, so the validator was never handed them.
 *
 * Measured at 0 occurrences across 21 real generations, which is the argument FOR adding it
 * rather than against: the rule costs nothing today and stops the defect the moment model
 * behaviour drifts. It is also why it is safe to make an error rather than a warning.
 */
function deadInputIssues(tsx: string, declared: { key: string }[]): ValidationIssue[] {
  // A module that hands `fields` on wholesale - spread into a subcomponent, passed to a
  // helper, walked with Object.entries - may never name a key literally, and every finding
  // here would then be invented. A false positive costs a repair round, so say nothing.
  if (/\.\.\.\s*fields\b|[({,]\s*fields\s*[),]/.test(tsx)) return [];

  // Every real read route counts: `fields.key`, `fields['key']`, and destructuring.
  const destructured = [...tsx.matchAll(/\{([^{}]*)\}\s*=\s*(?:props\s*\.\s*)?fields\b/g)]
    .map((m) => m[1])
    .join(',');

  const issues: ValidationIssue[] = [];
  for (const { key } of declared) {
    if (!key) continue;
    const k = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const read =
      new RegExp(`\\bfields\\s*\\??\\s*\\.\\s*${k}\\b`).test(tsx) ||
      new RegExp(`\\bfields\\s*\\??\\.?\\s*\\[\\s*['"]${k}['"]\\s*\\]`).test(tsx) ||
      new RegExp(`(^|[,{\\s])${k}\\s*(?=[,:=}]|$)`).test(destructured);
    if (!read) {
      issues.push({
        rule: 'inputs',
        message:
          `Input "${key}" is declared but the module never reads fields.${key}, so its control ` +
          `would do nothing. Read it with a fallback equal to its declared default ` +
          `(e.g. \`const ${key} = String(fields.${key} ?? '…');\`) - or drop it from the inputs array.`,
      });
    }
  }
  return issues;
}

function assetNameWarnings(tsx: string, assets: VideoAssetInfo[]): ValidationIssue[] {
  const known = new Set(assets.map((a) => a.name));
  const warned = new Set<string>();
  const issues: ValidationIssue[] = [];
  for (const m of tsx.matchAll(/assets\[['"]([^'"]+)['"]\]|assets\.([A-Za-z_$][\w$]*)/g)) {
    const name = m[1] ?? m[2];
    if (!known.has(name) && !warned.has(name)) {
      warned.add(name);
      issues.push({
        rule: 'asset-name',
        message: `assets["${name}"] is not an uploaded asset${known.size ? ` (available: ${[...known].join(', ')})` : ' (none uploaded)'}.`,
      });
    }
  }
  return issues;
}

/** Which rules are advisory (don't block apply/preview). */
export const WARNING_RULES = new Set(['asset-name']);
