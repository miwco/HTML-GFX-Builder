// The TITLE / TOPIC / INFORMATION pack's shared style vocabulary.
//
// The pack ships nine graphic types in four looks each. Those four looks are not new: they are
// the catalog's existing style families (docs/DESIGN_LANGUAGE.md §8) with the same motifs the
// lower thirds established — lt01's hairline, lt05's slab, lt08's frosted panel, lt11's amber
// bar — so a title card and a name strap made in one project still read as siblings.
//
// What lives here is only the part that is IDENTICAL across the pack's types: the panel
// treatment, the leading accent motif, the small-caps label rule, and the hairline divider.
// Everything that makes a notice different from a now/next card — its structure, its type
// ramp, its hierarchy — stays in that type's own builder, because that is the design work.
//
// Every emitter is prefix-parameterized ('info-card', 'infographic'), for the same reason the
// preset bank is: the structure contract is shared, so the skin can serve both categories.

import type { StyleTag } from '../../model/fonts';
import type { Resolution } from '../../model/types';
import type { TokenOverrides } from '../../model/themeTokens';
import { paletteById, type Palette } from '../../model/wizard';

/** The four looks, named for what they are rather than for their family id. */
export type Pack4SkinId = 'clean' | 'frost' | 'volt' | 'house';

export interface Pack4Skin {
  id: Pack4SkinId;
  family: StyleTag;
  palette: Palette;
  fontId: string;
  /** Whether the skin paints a panel behind the words. A panel-less skin buys its legibility
   *  with a text shadow instead (see `textLegibilityCss`). */
  hasPanel: boolean;
  /** Family token disagreements every design in this skin carries. Kept empty on purpose —
   *  the override map is conformance debt (model/themeTokens.ts). */
  tokens?: TokenOverrides;
}

export const CLEAN: Pack4Skin = {
  id: 'clean',
  family: 'minimal',
  palette: paletteById('ivory'),
  fontId: 'inter',
  hasPanel: false,
};

export const FROST: Pack4Skin = {
  id: 'frost',
  family: 'glass',
  palette: paletteById('frost'),
  fontId: 'manrope',
  hasPanel: true,
};

export const VOLT: Pack4Skin = {
  id: 'volt',
  family: 'sport',
  palette: paletteById('volt'),
  fontId: 'oswald',
  hasPanel: true,
};

export const HOUSE: Pack4Skin = {
  id: 'house',
  family: 'noacg',
  palette: paletteById('noacg'),
  fontId: 'space-grotesk',
  hasPanel: true,
};

/**
 * Padding for a design's panel, in 1080p design px (every emitted value scales by --scale).
 * `left` may also be a complete CSS length, which is how a design reserves room for an accent
 * motif whose width is a token rather than a number (see `accentInset`).
 */
export interface BoxPad {
  top: number;
  right: number;
  bottom: number;
  left: number | string;
}

/** A design-px length that follows the graphic's size knob. `0` stays `0` — `calc(0px * …)`
 *  is correct CSS and unreadable code, and the generated stylesheet is meant to be read. */
export const px = (n: number) => (n === 0 ? '0' : `calc(${n}px * var(--scale))`);
/** A pad value as CSS: a number is design px, a string is already a length. */
const len = (v: number | string) => (typeof v === 'number' ? px(v) : v);

/**
 * One commented declaration, aligned the way the hand-written catalog aligns them (the same
 * column base.ts uses for the zone block). A value too long for the column simply gets two
 * spaces before its comment — never zero, which is what an unguarded padEnd produces and what
 * silently swallowed the semicolon of every long declaration in the first draft of this pack.
 */
export function decl(prop: string, value: string, comment: string): string {
  const line = `  ${prop}: ${value};`;
  return (line.length > 33 ? `${line}  ` : line.padEnd(35)) + `/* ${comment} */`;
}

/**
 * The panel rule for a pack-4 design: `.{prefix}-box`.
 *
 * The four treatments are the families' own: minimal paints nothing (the words sit on the
 * video), sport is a flat solid slab with the family's hard offset shadow, glass is the
 * frosted blur panel, and the house is the void panel behind its amber bar. `extra` is the
 * design's own additions to the same rule (a wider measure, a flex stack).
 */
export function panelCss(skin: Pack4Skin, prefix: string, pad: BoxPad, extra = ''): string {
  const padding = decl(
    'padding',
    `${px(pad.top)} ${px(pad.right)} ${px(pad.bottom)} ${len(pad.left)}`,
    "the design's own air",
  );
  const surface =
    skin.id === 'clean'
      ? `  /* No panel: the minimal family lets the footage through and leans on the accent rule. */`
      : skin.id === 'volt'
        ? [
            decl('background', 'var(--panel-bg)', 'the solid sport slab'),
            decl('border-radius', 'var(--panel-radius)', "the family's corner treatment (square)"),
            decl('box-shadow', 'var(--panel-shadow)', "the family's hard offset lift"),
          ].join('\n')
        : skin.id === 'frost'
          ? [
              decl('background', 'var(--panel-bg)', 'the translucent glass surface'),
              decl('backdrop-filter', 'var(--panel-blur)', "the family's backdrop treatment"),
              decl('-webkit-backdrop-filter', 'var(--panel-blur)', 'Safari spelling of the same effect'),
              decl('border-radius', 'var(--panel-radius)', "the family's rounded corners"),
              decl('box-shadow', 'var(--panel-keyline), var(--panel-shadow)', 'the authored edge, then the lift'),
            ].join('\n')
          : [
              decl('background', 'var(--panel-bg)', 'the house void — near-black and translucent'),
              decl('backdrop-filter', 'var(--panel-blur)', "the family's backdrop treatment"),
              decl('-webkit-backdrop-filter', 'var(--panel-blur)', 'Safari spelling of the same effect'),
              decl('box-shadow', 'var(--panel-shadow)', 'one deep lifting shadow'),
            ].join('\n');

  return `.${prefix}-box {
${decl('position', 'relative', 'anchors the accent motif pinned inside it')}
${decl('box-sizing', 'border-box', 'padding stays inside the measured width')}
${padding}
${surface}${extra ? `\n${extra}` : ''}
}`;
}

/**
 * The leading accent motif — the `.{prefix}-accent` part, pinned INSIDE the panel so every
 * preset moves the two as one lockup.
 *
 * One motif per family, and they are the catalog's, not new inventions: a full-height hairline
 * rule (minimal, lt01), a short rounded underline (glass, lt08's soft keyline), a full-width
 * top edge (sport, lt06's split bar), and the glowing amber bar fused to the void panel
 * (house, lt11). `inset` is the panel padding the motif has to align with.
 */
export function accentCss(skin: Pack4Skin, prefix: string, inset: BoxPad): string {
  const head = `/* The accent motif — pinned inside the panel, so presets move it with the words. */
.${prefix}-accent {
${decl('position', 'absolute', 'pinned inside the (relatively positioned) panel')}
${decl('background', 'var(--accent)', 'the one accent surface')}
${decl('will-change', 'transform', 'hint the browser: presets grow this in')}`;

  const body =
    skin.id === 'clean'
      ? [
          decl('left', '0', "flush with the text column's left edge"),
          decl('top', px(inset.top), "starts at the first line's cap height"),
          decl('bottom', px(inset.bottom), 'and ends with the last line'),
          decl('width', 'var(--accent-weight)', "the family's hairline weight"),
        ].join('\n')
      : skin.id === 'frost'
        ? [
            decl('left', len(inset.left), "aligned with the panel's text column"),
            decl('top', px(Math.round(inset.top * 0.55)), 'sits above the first line, inside the top padding'),
            decl('width', px(72), 'a short stroke — never the full panel width'),
            decl('height', 'var(--accent-weight)', "the family's accent weight"),
            decl('border-radius', '999px', 'a ratio cap: the stroke stays a lozenge at any scale'),
          ].join('\n')
        : skin.id === 'volt'
          ? [
              decl('left', '0', 'edge to edge across the slab…'),
              decl('right', '0', '…so it reads as the slab’s own top rail'),
              decl('top', '0', "flush with the slab's top"),
              decl('height', 'var(--accent-weight)', "the family's chunky accent weight"),
            ].join('\n')
          : [
              decl('left', '0', "fused to the panel's left edge"),
              decl('top', '0', 'full panel height, top…'),
              decl('bottom', '0', '…to bottom'),
              decl('width', 'var(--accent-weight)', "the family's bar weight"),
              decl('box-shadow', 'var(--accent-glow)', 'the house glow — follows the accent color'),
            ].join('\n');

  return `${head}
${body}
}`;
}

/**
 * How much left padding the accent motif needs the panel to reserve. The vertical rule and the
 * amber bar sit in the text's way; the underline and the top rail do not.
 */
export function accentInset(skin: Pack4Skin, gap: number): string {
  return skin.id === 'clean' || skin.id === 'house'
    ? `calc(var(--accent-weight) + ${gap}px * var(--scale))`
    : px(gap);
}

/** A small tracked-caps label (kicker, section head, "what to do") in the family's label voice. */
export function labelCss(selector: string, size: number, comment: string): string {
  return `/* ${comment} */
${selector} {
${decl('font-family', 'var(--font-label)', "the family's label face (the house uses its mono)")}
${decl('font-size', typeSize(size), 'label scale — clearly subordinate')}
${decl('font-weight', '700', 'bold keeps small caps legible')}
${decl('line-height', '1.25', 'compact label leading')}
${decl('letter-spacing', 'var(--label-tracking)', "the family's label tracking")}
${decl('text-transform', 'uppercase', 'reads as a label, whatever the operator types')}
${decl('color', 'var(--label-color)', "the family's label color")}
}`;
}

/** A font size in design px: scaled by the graphic knob AND by the text-only knob. */
export function typeSize(n: number): string {
  return `calc(${n}px * var(--scale) * var(--type-scale))`;
}

/** A hairline divider between two blocks of a card. */
export function dividerCss(selector: string, comment: string, gap: number): string {
  return `/* ${comment} */
${selector} {
${decl('height', '1px', 'a true keyline — 1px at every resolution')}
${decl('margin', `${px(gap)} 0`, 'even air above and below the rule')}
${decl('background', 'rgba(255, 255, 255, 0.16)', 'dim, not accent — the color stays in the motif')}
}`;
}

/**
 * The legibility guard for the panel-less skin. Words on live video have no controlled
 * background, so the minimal designs carry a soft shadow rather than hoping the footage is
 * calm. It is deliberately wide and low-opacity: a halo that lifts type off busy pictures
 * without ever reading as a drop shadow.
 */
export function textLegibilityCss(skin: Pack4Skin, selector: string): string {
  if (skin.hasPanel) return '';
  return `/* Legibility over live video: a wide, soft halo behind the type. The minimal family
   has no panel to sit on, so this is what keeps it readable over moving pictures. */
${selector} {
  text-shadow: 0 ${px(2)} ${px(14)} rgba(0, 0, 0, 0.55);  /* soft halo, never a drop shadow */
}`;
}

/**
 * The reading rules every long-text block in the pack shares — the ones that decide whether a
 * paragraph, a translated verse or a five-language notice is actually readable on air.
 *
 * Deliberately: no `text-transform` (uppercase mangles most non-Latin scripts and destroys
 * diacritics), no `white-space: nowrap`, and a wrapping model that breaks at spaces first and
 * only ever inside a word when the word alone overflows.
 */
export function readableTextCss(selector: string, comment: string): string {
  return `/* ${comment} */
${selector} {
  overflow-wrap: break-word;       /* a single very long word breaks instead of overflowing */
  text-wrap: pretty;               /* avoids orphans; falls back to normal wrapping when unsupported */
  hyphens: none;                   /* never hyphenate on air — broadcast type reads as written */
}`;
}

/**
 * The MEASURE — how wide a design lets its text run, as a percentage of the frame.
 *
 * The info-card category caps a panel at 56% of the frame, which is tuned for headline-sized
 * lines. Running text wants its own answer, and not always a wider one: a paragraph set to a
 * headline's measure runs to 90-odd characters a line, which nobody reads comfortably, while a
 * bilingual reading genuinely does need more room than a strap. So the long-text designs state
 * their measure here, in a rule emitted after the category's.
 */
export function measureCss(prefix: string, res: Resolution, percent: number): string {
  // Same shape as the category cap (shared/base.ts maxTextWidthCss): a --scale-following
  // measure that still stops at the frame's horizontal safe area.
  const resFactor = Math.min(res.width / 1920, res.height / 1080);
  const perScaleUnit = Math.round((res.width * percent) / 100 / resFactor);
  const safeMax = Math.round(res.width - 2 * (res.width * 0.0625));
  return `/* This design's own measure, overriding the category default: it carries running text,
   and how wide that text runs is a typographic decision rather than a panel-fitting one.
   The cap still follows --scale and still stops at the frame's horizontal safe area. */
.${prefix}-box {
${decl('max-width', `min(calc(${perScaleUnit}px * var(--scale)), ${safeMax}px)`, `${percent}% of the frame`)}
}`;
}
