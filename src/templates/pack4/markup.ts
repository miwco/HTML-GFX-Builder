// The pack's shared MARKUP helpers.
//
// Every design in this pack lays its lines out by hand rather than through `cardLineMasks`,
// because a title card's visual order is not its field order (the kicker sits above the title
// it is declared after) and because each line wants a class that names what it IS — the
// generic `-name`/`-title`/`-extra` ladder stops describing anything past the third line.
//
// Two rules the whole pack follows, and the reason both are here rather than in each design:
//
//  1. A line the operator LEFT EMPTY must take no space. Every vertical rhythm margin is
//     therefore authored on the line's SPAN (never on its mask), and every span carries the
//     `:empty` rule below. An empty span collapses, its margin goes with it, and a card with
//     three of its five fields filled still looks composed. This is what makes "missing text"
//     a supported state rather than a hole in the layout.
//  2. A line the DESIGN doesn't have is simply not emitted. The wizard can hand a design
//     fewer lines than it draws for (the user removed one), so every emitter is index-safe.

import type { ResolvedOptions } from '../../model/wizard';

/**
 * One masked text line: `<div class="{prefix}-mask"><span id="fN" class="{cls}">…</span></div>`.
 * Returns '' when the design has no line at that index. The mask is the structure contract's
 * (shared/standard.ts) — the presets slide the span inside it.
 */
export function maskLine(o: ResolvedOptions, prefix: string, index: number, cls: string, indent = '      '): string {
  const line = o.lines[index];
  if (!line) return '';
  return (
    `${indent}<!-- ${line.title} (f${index}) — SPX writes this field's value straight into the element. -->\n` +
    `${indent}<div class="${prefix}-mask"><span id="f${index}" class="${cls}">${line.sample}</span></div>`
  );
}

/** Join the emitted pieces of a design's body, dropping the ones that came back empty. */
export function stack(...parts: string[]): string {
  return parts.filter((p) => p !== '').join('\n');
}

/**
 * A selector list for line classes, scoped INSIDE their mask: `.{prefix}-mask > .{cls}`.
 *
 * Needed because the category assembler already styles `.{prefix}-mask > span` — including
 * `text-wrap: balance`, which is right for a two-word name and wrong for a paragraph. A bare
 * `.{prefix}-body` rule loses to it on specificity (one class beats one class plus an element
 * only in the other direction), so a design that wants to decide its own wrapping has to say so
 * at the same depth. Everything else a line rule sets — size, weight, colour, margins — has no
 * such conflict and stays on the plain class.
 */
export function maskScoped(prefix: string, classes: string[]): string {
  return classes.map((cls) => `.${prefix}-mask > ${cls}`).join(',\n');
}

/** The accent motif element (styled by skin.ts accentCss). */
export function accentDiv(prefix: string, indent = '      '): string {
  return `${indent}<!-- The accent motif — the design's one loud color moment. -->\n${indent}<div class="${prefix}-accent"></div>`;
}

/**
 * The rule that makes an empty field disappear instead of leaving a gap. Emitted once per
 * design, listing that design's own line classes.
 */
export function emptyLineCss(selectors: string[]): string {
  return `/* A field the operator left empty takes NO space: the span collapses and its margin
   goes with it, so a half-filled card still reads as a composed layout rather than one
   with holes in it. (Every vertical margin in this design sits on a span for exactly
   this reason.) */
${selectors.map((s) => `${s}:empty`).join(',\n')} {
  display: none;                   /* no box, no margin, no gap */
}`;
}
