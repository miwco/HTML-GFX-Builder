// THE THEME TOKEN CONTRACT — the shape half of the :root style contract.
//
// The colour half already existed: --accent / --text-color / --text-dim / --panel-bg /
// --font-heading / --scale / --type-scale (templates/shared/base.ts rootVarsCss). Everything
// that actually distinguishes the four style families in practice — panel treatment, radius,
// shadow, keyline, accent geometry, the label typeface and its tracking — was a hand-typed
// literal in every variant's CSS, mirrored by eye from the table in DESIGN_LANGUAGE §8.
//
// This file is that table, in code. §8 stays the prose rationale; these are the values.
//
// **Why tokens and not an override block.** A theme has to be re-applicable — the whole point
// of a types × themes catalog is that the same design is emitted in four looks — and an
// appended override block is not idempotent, cannot reach the JS the motion lives in, and
// fights the Style panel over the same declarations. Reading a variable is none of those
// things, and it keeps the generated CSS readable, which is a product pillar.
//
// **Values are complete CSS values, not numbers.** `calc(18px * var(--scale))`, not `18`. That
// is what lets one token cover a scaled length, a percentage and a keyword (`50%`, `999px`,
// `none`) without the consuming rule needing to know which it got.

import type { StyleTag } from './fonts';

/** A shadow slot that contributes nothing. `none` cannot be used: these tokens compose into
 *  comma-separated `box-shadow` lists, and `none, none` is not valid CSS. A zero-size
 *  transparent shadow is, and paints nothing. */
export const NO_SHADOW = '0 0 0 0 transparent';

/**
 * The shape tokens. Every one is a CSS value, and every one has a family default below.
 *
 * Deliberately NOT here yet:
 * - **density / padding** — DESIGN_LANGUAGE has no density row, padding is genuinely
 *   per-design (a lower third and an infographic do not share one), and it is the one
 *   designAdjust dimension that has never worked (it reads the auto-fit rule, which has no
 *   padding). It needs measuring before it needs tokenizing.
 * - **the sport skew** — `transform: skewX(0deg)` is not inert: it creates a stacking context
 *   and can change text rasterization, so a "neutral" skew token would not be neutral. It
 *   stays a literal until the render baseline proves otherwise.
 * - **motion feel** — motion lives in the NOACG_ANIM data block in the JS, not in CSS. It
 *   belongs to a theme, but it does not belong in :root.
 */
export interface ThemeTokens {
  /** Panel backdrop treatment. `none`, or a `blur(Npx)`. */
  panelBlur: string;
  /** Panel corner radius. */
  panelRadius: string;
  /** The panel's lift. Pairs with panelKeyline in one box-shadow list. */
  panelShadow: string;
  /** The panel's 1px inner edge, as an inset shadow. */
  panelKeyline: string;
  /** Thickness of the accent bar / rule / slab. */
  accentWeight: string;
  /** The accent element's glow, as a box-shadow. House only, by doctrine. */
  accentGlow: string;
  /** Text colour ON an accent-filled chip — the dark-on-accent ink. */
  accentInk: string;
  /** The label / kicker typeface. The heading font unless the family owns a second face. */
  fontLabel: string;
  /** Label tracking. Small caps breathe; §8 gives the per-family range. */
  labelTracking: string;
  /** Label colour. */
  labelColor: string;
  /** Display/heading weight. */
  displayWeight: string;
  /** Display/heading tracking. Big text tightens; sport opens up and shouts. */
  displayTracking: string;
}

/** The CSS custom-property name a token is emitted as. */
export const TOKEN_VARS: Record<keyof ThemeTokens, string> = {
  panelBlur: '--panel-blur',
  panelRadius: '--panel-radius',
  panelShadow: '--panel-shadow',
  panelKeyline: '--panel-keyline',
  accentWeight: '--accent-weight',
  accentGlow: '--accent-glow',
  accentInk: '--accent-ink',
  fontLabel: '--font-label',
  labelTracking: '--label-tracking',
  labelColor: '--label-color',
  displayWeight: '--display-weight',
  displayTracking: '--display-tracking',
};

/** What each token does, emitted as its comment so the generated CSS stays teachable. */
export const TOKEN_COMMENTS: Record<keyof ThemeTokens, string> = {
  panelBlur: 'panel backdrop treatment',
  panelRadius: 'panel corner radius',
  panelShadow: "the panel's lift",
  panelKeyline: "the panel's inner edge",
  accentWeight: 'thickness of the accent bar',
  accentGlow: 'glow on accent elements only',
  accentInk: 'text colour on an accent-filled chip',
  fontLabel: 'the label/kicker typeface',
  labelTracking: 'label letter-spacing (small caps breathe)',
  labelColor: 'label colour',
  displayWeight: 'heading weight',
  displayTracking: 'heading letter-spacing (big text tightens)',
};

/** The house label face. A design-owned second typeface: the Style panel's heading-font swap
 *  never touches it (DESIGN_LANGUAGE §8), which is why it is a token and not --font-heading. */
const MONO_LABEL = '"JetBrains Mono", Consolas, "Courier New", monospace';

/**
 * The four families. Values are DESIGN_LANGUAGE §8's, cross-checked against a census of what
 * the 52 catalog stylesheets actually ship — per family AND per element role, because a
 * tracking or a glow means nothing until you know whether it is on the heading, the label or
 * the accent bar. Where the doc and the code disagreed, the note says which won and why.
 *
 * Confidence, from that census — it predicts where the override maps will fill up:
 *
 * - **Strong** (a clear majority ships one value): panelBlur (noacg 6/6 `blur(8px)`, glass
 *   9/10 `blur(18px)`), fontLabel (noacg 8/8 JetBrains Mono), labelColor (minimal 7/11
 *   `--text-dim`, noacg 3/3 `--accent`), displayTracking (minimal 6/19, glass 5/10, sport
 *   5/15 all clear modes), panelRadius for minimal/sport/noacg.
 * - **Weak — expect overrides**: panelShadow is per-design far more than per-family (sport
 *   ships five shadows across five variants, no two alike); glass panelRadius genuinely
 *   ranges 12–18 px, as §8 itself says.
 *
 * Where doc and code diverged:
 * - §8 gives the house chip radius as 6 px. NOTHING in the catalog ships 6 px (bug02's mark
 *   bars are 3 px, lt14 cites the token while shipping neither). Not encoded — a fiction in
 *   the doc should not become a fiction in the code.
 * - §8 gives sport a "hard offset (sticker-slab)" shadow. The flagship slabs (sb01, qz01)
 *   have no box-shadow at all. Encoded as shipped; the doc is what needs correcting.
 * - The minimal keyline is 0.14 in §8, 0.15 in §3, and 0.10/0.18/0.12 in ig06. §8 wins as the
 *   named authority; ig06 carries the difference as a variant override until it is reviewed.
 *
 * And where the census corrected a value read off a single example:
 * - noacg labelTracking is 0.2em (the mode, lt13+lt14), not lt11's 0.22em.
 * - sport labelTracking is 0.08em. The 0.02em first taken from §8 is a DISPLAY tracking and
 *   appears zero times on a sport label.
 * - glass displayTracking is -0.01em (5 of 10 uses), not 0.
 */
export const FAMILY_TOKENS: Record<StyleTag, ThemeTokens> = {
  minimal: {
    panelBlur: 'none',
    panelRadius: 'calc(2px * var(--scale))',
    panelShadow: '0 14px 40px rgba(0, 0, 0, 0.30)',
    panelKeyline: 'inset 0 0 0 1px rgba(255, 255, 255, 0.14)',
    accentWeight: 'calc(3px * var(--scale))',
    accentGlow: NO_SHADOW,
    accentInk: 'var(--panel-bg)',
    fontLabel: 'var(--font-heading)',
    labelTracking: '0.16em',
    labelColor: 'var(--text-dim)',
    displayWeight: '700',
    displayTracking: '-0.01em',
  },
  sport: {
    panelBlur: 'none',
    panelRadius: '0',
    panelShadow: NO_SHADOW,
    panelKeyline: NO_SHADOW,
    accentWeight: 'calc(10px * var(--scale))',
    accentGlow: NO_SHADOW,
    accentInk: 'var(--panel-bg)',
    fontLabel: 'var(--font-heading)',
    labelTracking: '0.08em',
    labelColor: 'var(--text-color)',
    displayWeight: '700',
    displayTracking: '0.02em',
  },
  glass: {
    panelBlur: 'blur(18px)',
    panelRadius: 'calc(16px * var(--scale))',
    panelShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
    panelKeyline: 'inset 0 0 0 1px rgba(255, 255, 255, 0.18)',
    accentWeight: 'calc(4px * var(--scale))',
    accentGlow: NO_SHADOW,
    accentInk: 'var(--panel-bg)',
    fontLabel: 'var(--font-heading)',
    labelTracking: '0.14em',
    labelColor: 'var(--accent)',
    displayWeight: '700',
    displayTracking: '-0.01em',
  },
  noacg: {
    panelBlur: 'blur(8px)',
    panelRadius: '0',
    panelShadow: '0 16px 50px rgba(0, 0, 0, 0.5)',
    panelKeyline: NO_SHADOW,
    accentWeight: 'calc(8px * var(--scale))',
    accentGlow: '0 0 calc(22px * var(--scale)) color-mix(in srgb, var(--accent) 60%, transparent)',
    accentInk: 'var(--panel-bg)',
    fontLabel: MONO_LABEL,
    labelTracking: '0.2em',
    labelColor: 'var(--accent)',
    displayWeight: '700',
    displayTracking: '-0.01em',
  },
};

/** A variant's or theme's partial override of its family's values. */
export type TokenOverrides = Partial<ThemeTokens>;

/** Family defaults with overrides layered on. The override list is the conformance debt:
 *  every entry is a place a design disagrees with its family, and §8's own rule is "reuse the
 *  exact token values — don't improvise new ones per category". */
export function resolveTokens(family: StyleTag, ...overrides: (TokenOverrides | undefined)[]): ThemeTokens {
  let out = { ...FAMILY_TOKENS[family] };
  for (const o of overrides) if (o) out = { ...out, ...o };
  return out;
}

/**
 * The `:root` lines for the tokens a stylesheet actually reads.
 *
 * Only referenced tokens are emitted, for the same reason an imported design declares no
 * `--type-scale`: a variable nothing consumes is a dead knob, and a dead knob in the style
 * contract is a control that appears to do something and does not.
 */
export function tokenVarsCss(tokens: ThemeTokens, consumerCss: string): string {
  const lines: string[] = [];
  for (const key of Object.keys(TOKEN_VARS) as (keyof ThemeTokens)[]) {
    const name = TOKEN_VARS[key];
    if (!consumerCss.includes(`var(${name})`)) continue;
    // padEnd aligns the short declarations; the trailing gap keeps a long value (a full
    // box-shadow) from running into its own comment.
    lines.push(`  ${name}: ${tokens[key]};`.padEnd(46) + `  /* ${TOKEN_COMMENTS[key]} */`);
  }
  return lines.join('\n');
}
