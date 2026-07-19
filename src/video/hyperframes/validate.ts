// The validate pipeline for a HyperFrames composition - the 'hyperframes' engine's
// counterpart of validateVideoModule (compile.ts + validate.ts): static contract checks
// with TEACHING messages (they feed the AI's repair rounds verbatim), then a live probe
// in the preview iframe at frames [0, mid, last]. Duration/fps/resolution come from the
// project settings and are injected at compose time, exactly like the Remotion path.

import type { ValidationIssue } from '../../validation/validateTemplate';
import type { AssetFile } from '../../model/types';
import { describeAssets, type VideoCompSettings, type VideoValidationResult } from '../types';
import { quoteMatch } from '../compile';
import { holdFrames, persistentTextIssues } from '../readability';
import { getActiveHyperframesBridge } from '../bridgeRegistry';
import type { HyperframesBridge } from './bridge';
import { HF_VARIABLE_TYPES, parseHyperframesComposition } from './parse';

export const MAX_HTML_BYTES = 100_000;

/** Forbidden API patterns with teaching messages (mirrors compile.ts FORBIDDEN). */
const FORBIDDEN: { re: RegExp; what: string; instead: string }[] = [
  { re: /\bMath\.random\s*\(/, what: 'Math.random()', instead: 'renders must be deterministic - precompute values or use a seeded pattern' },
  { re: /\bDate\.now\s*\(/, what: 'Date.now()', instead: 'all motion lives on the registered timeline; the renderer seeks it' },
  { re: /\bnew\s+Date\s*\(\s*\)/, what: 'new Date()', instead: 'all motion lives on the registered timeline; the renderer seeks it' },
  { re: /\bperformance\.now\s*\(/, what: 'performance.now()', instead: 'all motion lives on the registered timeline; the renderer seeks it' },
  { re: /\bsetTimeout\s*\(/, what: 'setTimeout', instead: 'sequence with timeline positions (tl.to(..., 1.2)) instead of timers' },
  { re: /\bsetInterval\s*\(/, what: 'setInterval', instead: 'sequence with timeline positions instead of timers' },
  { re: /\brequestAnimationFrame\s*\(/, what: 'requestAnimationFrame', instead: 'the driver owns time - never run your own animation loop' },
  { re: /\bfetch\s*\(/, what: 'fetch', instead: 'reference uploaded assets as asset:<name>; no network at render time' },
  { re: /\bXMLHttpRequest\b/, what: 'XMLHttpRequest', instead: 'no network at render time' },
  { re: /\bWebSocket\b/, what: 'WebSocket', instead: 'no network at render time' },
  { re: /\bEventSource\b/, what: 'EventSource', instead: 'no network at render time' },
  { re: /\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/, what: 'browser storage', instead: 'a composition is a pure function of time and its variables' },
  { re: /\beval\s*\(/, what: 'eval', instead: 'not allowed in compositions' },
  { re: /\bnew\s+Function\s*\(/, what: 'new Function', instead: 'not allowed in compositions' },
  { re: /\brepeat\s*:\s*-1\b/, what: 'repeat: -1', instead: 'compute a finite repeat count from the duration (an endless tween cannot render deterministically)' },
  { re: /\.play\s*\(/, what: 'calling .play()', instead: 'the timeline stays paused - the driver (and the renderer) seek it; never start playback yourself' },
];

/**
 * XML namespace URIs are IDENTIFIERS, never fetched - the browser matches them as strings.
 * They must not read as "this document goes to the network": an inline <svg> carries
 * xmlns="http://www.w3.org/2000/svg" as a matter of course, and rejecting it fails a
 * perfectly offline composition. Observed burning BOTH repair rounds on a countdown that
 * drew its ring pulse in SVG - the repair message told the model to reference an uploaded
 * asset instead, which is meaningless advice for a namespace, so the round was unwinnable
 * by construction and the generation failed outright.
 */
const NAMESPACE_URLS = [
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/1999/xhtml',
  'http://www.w3.org/2000/xmlns/',
  'http://www.w3.org/XML/1998/namespace',
];

/**
 * The first URL the document would actually FETCH, or null. Comments are stripped first (a
 * URL in a comment is documentation, not a request) and namespace URIs are excluded. Every
 * other http(s) reference - a remote image, a stylesheet, a font, a script - still fails,
 * which is the whole point of the rule.
 */
function findRemoteUrl(html: string): string | null {
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of withoutComments.matchAll(/https?:\/\/[^\s"'()<>]*/g)) {
    if (!NAMESPACE_URLS.some((ns) => m[0] === ns || m[0].startsWith(`${ns}/`))) return m[0];
  }
  return null;
}

/**
 * Does anything in the document actually read this variable? These three are the complete
 * set of routes a value can take into a composition - the driver substitutes `data-var-text`
 * and sets `--<id>` on the composition root, and compose resolves `data-var-src` to an asset
 * URL - so a variable matched by none of them is inert by construction.
 */
function isVariableBound(html: string, id: string): boolean {
  const safe = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    new RegExp(`data-var-(?:text|src)\\s*=\\s*["']${safe}["']`).test(html) ||
    new RegExp(`var\\(\\s*--${safe}\\b`).test(html)
  );
}

/** Static contract checks on the SOURCE (before/independent of the live probe). */
export function staticValidateHyperframes(html: string, assets: AssetFile[], settings: VideoCompSettings): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (html.length > MAX_HTML_BYTES) {
    issues.push({
      rule: 'oversized',
      message: `The document is ${Math.round(html.length / 1000)} kB - keep it under ${MAX_HTML_BYTES / 1000} kB.`,
    });
  }

  const parsed = parseHyperframesComposition(html);
  if (!parsed.root) {
    issues.push({
      rule: 'composition-root',
      message:
        'The document has no composition root - add <div data-composition-id="main" data-start="0" data-width data-height data-duration> around the content.',
    });
  } else {
    if (!Number.isFinite(parsed.root.width) || !Number.isFinite(parsed.root.height)) {
      issues.push({
        rule: 'composition-root',
        message: 'The composition root needs numeric data-width and data-height attributes (the frame size in px).',
      });
    }
    if (!Number.isFinite(parsed.root.durationSec) || parsed.root.durationSec <= 0) {
      issues.push({
        rule: 'composition-root',
        message: 'The composition root needs a positive data-duration attribute (the length in seconds).',
      });
    }
  }

  if (!/__timelines/.test(html)) {
    issues.push({
      rule: 'timeline',
      message:
        'No timeline registration found - build ONE gsap.timeline({ paused: true }) synchronously and assign window.__timelines["<composition-id>"] = tl (gsap is provided as a global).',
    });
  }

  if (/<script[^>]*\bsrc\s*=/i.test(html)) {
    issues.push({
      rule: 'external-script',
      message: `External <script src> tags are not allowed - gsap is provided as a global; write all code in inline <script> blocks.${quoteMatch(html, /<script[^>]*\bsrc\s*=/i)}`,
    });
  }
  if (/<(video|audio)\b/i.test(html)) {
    issues.push({
      rule: 'media-element',
      message: '<video>/<audio> elements are not supported in HyperFrames projects yet - build the piece from images, text, and shapes.',
    });
  }
  const remote = findRemoteUrl(html);
  if (remote) {
    issues.push({
      rule: 'network-url',
      message: `The document loads ${remote} over the network - nothing may be fetched at render time. Reference uploaded assets as asset:<name>, or draw the element instead. (XML namespace URIs like xmlns="http://www.w3.org/2000/svg" are fine - they are identifiers, not downloads.)`,
    });
  }

  for (const f of FORBIDDEN) {
    if (f.re.test(html)) {
      issues.push({
        rule: 'forbidden-api',
        message: `${f.what} is not allowed - ${f.instead}.${quoteMatch(html, f.re)}`,
      });
    }
  }

  if (parsed.variablesError) {
    issues.push({
      rule: 'variables',
      message: `data-composition-variables is not a valid JSON array of declarations: ${parsed.variablesError}`,
    });
  }
  for (const v of parsed.variables) {
    if (!HF_VARIABLE_TYPES.has(v.type)) {
      issues.push({
        rule: 'variables',
        message: `Variable "${v.id}" has unknown type "${v.type}" - use string, number, color, boolean, enum, or image.`,
      });
    } else if (!isVariableBound(html, v.id)) {
      // A declared-but-unbound variable renders a control in the Content panel that does
      // nothing when the user changes it - a promise the document does not keep. Nothing
      // else catches it: the document is otherwise perfectly legal. The contract asks the
      // model for this and it mostly complies, but "mostly" ships broken controls (measured
      // at 1 in 6 generations, then 3 in 36), so the platform enforces it.
      issues.push({
        rule: 'variables',
        message:
          `Variable "${v.id}" is declared but nothing reads it, so its control would do nothing. ` +
          `Bind it - data-var-text="${v.id}" on a text element, data-var-src="${v.id}" on an image, ` +
          `or read it in CSS as var(--${v.id}, <fallback>) - or remove the declaration.`,
      });
    }
  }

  // Advisory findings (never block preview/apply) --------------------------------
  if (parsed.root && Number.isFinite(parsed.root.durationSec)) {
    const projectSec = settings.durationInFrames / settings.fps;
    if (Math.abs(parsed.root.durationSec - projectSec) > 0.02) {
      issues.push({
        rule: 'duration-mismatch',
        message: `The root declares data-duration="${parsed.root.durationSec}" but the project is ${projectSec.toFixed(2)} s - the project settings decide the render length, so motion outside them is cut.`,
      });
    }
  }
  const known = new Set(describeAssets(assets).map((a) => a.name));
  const warned = new Set<string>();
  for (const m of html.matchAll(/asset:([a-z0-9][a-z0-9-]*)/g)) {
    if (!known.has(m[1]) && !warned.has(m[1])) {
      warned.add(m[1]);
      issues.push({
        rule: 'asset-name',
        message: `asset:${m[1]} is not an uploaded asset${known.size ? ` (available: ${[...known].join(', ')})` : ' (none uploaded)'}.`,
      });
    }
  }

  return issues;
}

/** Which rules are advisory (don't block apply/preview). */
export const HF_WARNING_RULES = new Set(['asset-name', 'duration-mismatch']);

export async function validateHyperframesComposition(
  html: string,
  settings: VideoCompSettings,
  assets: AssetFile[],
  bridge: HyperframesBridge | null,
): Promise<VideoValidationResult> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  for (const issue of staticValidateHyperframes(html, assets, settings)) {
    (HF_WARNING_RULES.has(issue.rule) ? warnings : errors).push(issue);
  }
  if (errors.length > 0) {
    return { ok: false, errors, warnings, compiledJs: null, probed: false };
  }

  // Live probe (skipped when no preview is mounted - e.g. the offline stub in tests).
  // A disposed bridge (the preview remounted mid-validation - a layout change, StrictMode)
  // retries once on the CURRENT bridge instead of quietly skipping the checks, mirroring
  // validateVideoModule. `probed` then tells the caller whether the runtime checks ran AT
  // ALL: without it a skipped probe returns an empty error list, which reads as a clean
  // composition and costs the AI harness its repair rounds.
  let probed = false;
  let probeBridge = bridge;
  const d = settings.durationInFrames;
  for (let attempt = 0; probeBridge && attempt < 2; attempt++) {
    // loadAndProbe, never load-then-probe: the preview panel shares this iframe and rebuilds
    // it on a debounce, and a rebuild enqueued in the gap between the two would run FIRST -
    // leaving the checks to measure the project's own composition and call it clean.
    const { loaded, probe } = await probeBridge.loadAndProbe(
      html,
      settings,
      assets,
      [0, Math.floor(d / 2), Math.max(0, d - 1)],
      holdFrames(d),
    );
    if (!loaded.ok && loaded.disposed) {
      const fresh = getActiveHyperframesBridge();
      probeBridge = fresh && fresh !== probeBridge ? fresh : null;
      continue;
    }
    if (!loaded.ok || !probe) {
      errors.push({ rule: 'runtime', message: loaded.ok ? 'the composition could not be probed' : loaded.message });
      return { ok: false, errors, warnings, compiledJs: null, probed: false };
    }
    for (const e of probe.errors) {
      errors.push({ rule: 'runtime', message: `frame ${e.frame}: ${e.message}` });
    }
    errors.push(...persistentTextIssues(probe.textIssues ?? [], holdFrames(d)));
    probed = true;
    break;
  }

  return { ok: errors.length === 0, errors, warnings, compiledJs: null, probed };
}
