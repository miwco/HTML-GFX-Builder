// The bounded polish pass: ONE model call may add a visual flourish to an assembled
// grounded template — and only inside hard walls. Writable: an appended CSS override block
// (the cascade beats the design CSS; the pinned :root/@font-face/auto-fit sections are
// rejected outright) and the root element's inner HTML (for decorative elements). Never JS:
// the ANIMATION region and every runtime stay untouchable by construction.
//
// applyPolish is a pure gatekeeper: a patch that breaks any contract returns null and the
// caller REVERTS to the pre-polish template — polish can decline to improve, but it can
// never make a result worse.

import type { SpxTemplate } from '../model/types';
import type { ClaudeTool } from './anthropic';
import { detectPrefix } from '../model/structure';
import { parseAnimData } from '../blocks/animData';

export interface PolishPatch {
  summary: string;
  /** CSS appended after the design CSS as a marked override block. */
  css: string;
  /** Optional replacement for the root element's inner HTML (decorative elements). */
  html?: string;
}

export const POLISH_TOOL: ClaudeTool = {
  name: 'emit_polish',
  description:
    'Return the flourish as a bounded patch: override CSS (appended after the design CSS) ' +
    'and optionally the root element\'s new inner HTML. Never scripts, never :root/@font-face.',
  input_schema: {
    type: 'object',
    required: ['summary', 'css'],
    additionalProperties: false,
    properties: {
      summary: { type: 'string', description: 'One sentence: what the flourish adds.' },
      css: {
        type: 'string',
        description:
          'Override/addition CSS only — it is appended after the design CSS and wins by cascade. ' +
          'Use the :root vars for every colour and calc(N * var(--scale)) for every size. ' +
          'Do NOT redeclare :root or @font-face.',
      },
      html: {
        type: 'string',
        description:
          'Only when the flourish needs new decorative elements: the root element\'s COMPLETE new ' +
          'inner HTML. Keep every existing id exactly once and the mask structure intact; no <script>.',
      },
    },
  },
};

/** The classes/ids the animation data targets — a patch must keep them resolvable. */
function animSelectors(js: string): string[] {
  const data = parseAnimData(js);
  if (!data) return [];
  const selectors = new Set<string>();
  for (const step of data.steps) {
    Object.keys(step.layers).forEach((s) => selectors.add(s));
    (step.reveals ?? []).forEach((s) => selectors.add(s));
    (step.dynamics ?? []).forEach((d) => d.target && selectors.add(d.target));
  }
  return [...selectors];
}

/** Find the root element's inner-HTML range by matching its <div> nesting. */
function rootInnerRange(html: string, prefix: string): { start: number; end: number } | null {
  const open = html.match(new RegExp(`<div[^>]*class="[^"]*\\b${prefix}\\b[^"]*"[^>]*>`));
  if (!open || open.index === undefined) return null;
  const start = open.index + open[0].length;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    depth += m[0] === '</div>' ? -1 : 1;
    if (depth === 0) return { start, end: m.index };
  }
  return null;
}

const CSS_FORBIDDEN = /:root\s*\{|@font-face|== ANIMATION|<[a-z!/]/i;

const MARKER = '/* ── Polish (AI flourish — same contracts as the design CSS above) ── */';

/**
 * Apply a polish patch inside the hard walls. Returns the polished template, or null when
 * ANY gate trips (the caller reverts): CSS touching the pinned sections, a script tag, a
 * lost field id, or an animation-data selector that no longer resolves.
 */
export function applyPolish(template: SpxTemplate, patch: PolishPatch): SpxTemplate | null {
  const prefix = detectPrefix(template.html);
  if (!prefix) return null;
  if (typeof patch.css !== 'string' || !patch.css.trim()) return null;
  if (CSS_FORBIDDEN.test(patch.css)) return null;

  let html = template.html;
  if (patch.html !== undefined) {
    if (typeof patch.html !== 'string' || /<script/i.test(patch.html)) return null;
    const range = rootInnerRange(html, prefix);
    if (!range) return null;
    const originalInner = html.slice(range.start, range.end);
    // Every field id the root carried must survive, exactly once.
    const ids = [...originalInner.matchAll(/\bid="(f\d+)"/g)].map((m) => m[1]);
    for (const id of new Set(ids)) {
      const count = (patch.html.match(new RegExp(`\\bid="${id}"`, 'g')) ?? []).length;
      if (count !== 1) return null;
    }
    html = html.slice(0, range.start) + patch.html + html.slice(range.end);

    // Every selector the animation data targets must still resolve — in the patched HTML
    // or in runtime JS outside the marked region (data-driven categories build there).
    const runtime = template.js.replace(/\/\* == ANIMATION[\s\S]*?== END ANIMATION == \*\//, '');
    const declares = (re: RegExp) => re.test(html) || re.test(runtime);
    for (const sel of animSelectors(template.js)) {
      const exists = sel.startsWith('#')
        ? declares(new RegExp(`id="${sel.slice(1)}"`))
        : sel.startsWith('.')
          ? declares(new RegExp(`class="[^"]*\\b${sel.slice(1)}\\b[^"]*"`))
          : true;
      if (!exists) return null;
    }
  }

  return { ...template, html, css: `${template.css}\n\n${MARKER}\n${patch.css.trim()}\n` };
}
