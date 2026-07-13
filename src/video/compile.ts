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

export type CompileResult = { ok: true; js: string } | { ok: false; error: string };

export function compileTsx(tsx: string): CompileResult {
  try {
    const { code } = transform(tsx, {
      transforms: ['typescript', 'jsx', 'imports'],
      jsxRuntime: 'automatic',
      production: true,
    });
    return { ok: true, js: code };
  } catch (e) {
    // sucrase errors carry line:col in the message.
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Static contract checks on the SOURCE (before/independent of the live probe). */
export function staticValidate(tsx: string, assets: VideoAssetInfo[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

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
        message: `Import "${m[1]}" is not allowed - only 'react' and 'remotion' are available.`,
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
      issues.push({ rule: 'forbidden-api', message: `${f.what} is not allowed - ${f.instead}.` });
    }
  }

  // Network URLs: nothing may load from the network (assets travel as props).
  if (/https?:\/\//.test(tsx)) {
    issues.push({
      rule: 'network-url',
      message: 'http(s):// URLs are not allowed - reference uploaded assets via the `assets` prop instead.',
    });
  }

  // Unknown asset references (warning-level; surfaced separately by the caller).
  return issues.concat(assetNameWarnings(tsx, assets));
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
