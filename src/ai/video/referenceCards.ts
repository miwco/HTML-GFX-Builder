// Design DNA reference cards: compact craft vocabularies injected into the Motion Director's
// prompt as INSPIRATION - never the answer. The injection text requires an ORIGINAL design;
// the brief always outranks the reference.
//
// Two provenance families live here:
//   - the first six are distilled from NoaCG's own shipped SPX template families
//     (docs/DESIGN_LANGUAGE.md §8 tokens + the catalog's signature reveals);
//   - the rest are abstracted BROADCAST CONVENTIONS - genre and regional design languages
//     observed across many packages, written from scratch for this file.
//
// LEGAL CONTRACT (docs/BROADCAST_DESIGN_SYSTEM_RESEARCH.md §6.1, §7.3-7.4). Cards store no
// images and no copied prose, and no card may name a real network, studio or package as a
// thing to imitate - a card describes a GENRE, never a work. `provenance.sources` is for a
// human to verify against; it is never fetched and never reaches a model. Only `card` text
// is sent. The surviving legal claims in this area are trademark, not copyright, so the
// brand-blind boundary between `provenance` and everything else is load-bearing.
//
// `axes` drives contrast selection (referenceSelect.ts) and is NOT sent to the model.

import {
  pickContrasting,
  recentReferenceIds,
  USE_CONTRAST_SELECTION,
  type ReferenceAxes,
} from '../referenceSelect';

export type BroadcastGenre =
  | 'sport'
  | 'news'
  | 'entertainment'
  | 'factual'
  | 'esports'
  | 'financial'
  | 'music'
  | 'kids'
  | 'promo'
  | 'corporate';

export interface ReferenceCard {
  id: string;
  keywords: RegExp;
  /** Genres this card suits. A memorial brief never sees the celebration card. */
  genres: BroadcastGenre[];
  axes: ReferenceAxes;
  /** The only field that reaches a model. */
  card: string;
  provenance: {
    kind: 'noacg-family' | 'observed-convention';
    note: string;
    sources?: string[];
  };
}

const NOACG: ReferenceCard['provenance']['kind'] = 'noacg-family';
const OBSERVED: ReferenceCard['provenance']['kind'] = 'observed-convention';

export const REFERENCE_CARDS: ReferenceCard[] = [
  {
    id: 'minimal',
    // "nordic"/"scandi" belong to public-service-nordic, which answers them better; leaving
    // them here made two near-identical cards fire on the same word.
    keywords: /minimal|clean|simple|elegant|subtle|quiet|modern/i,
    genres: ['news', 'factual', 'corporate', 'promo'],
    axes: {
      infoLayers: 1,
      graphicImageRelation: 'beside',
      density: 1,
      geometry: 'orthogonal',
      typeVoice: 'geometric-sans',
      colorBehavior: 'restrained',
      motionLanguage: 'glide',
      surface: 'flat-graphic',
      holdCharacter: 'brief',
      idleLoop: false,
      reducesVideoWindow: false,
    },
    card: `MINIMAL family - whitespace does the design work: hairline accents (2-4px lines,
short underlines), panels absent or a 1px keyline rgba(255,255,255,0.14), radius 0-2px,
normal-width type at weights 400-700, expo/power-curve reveals with text sliding from
behind masked lines. Alignment is strict; margins are optically balanced.`,
    provenance: { kind: NOACG, note: 'DESIGN_LANGUAGE.md §8 minimal tokens' },
  },
  {
    id: 'sport',
    keywords: /sport|match|team|derby|versus|vs\b|league|goal|energy|fast|aggressive/i,
    genres: ['sport', 'esports', 'promo'],
    axes: {
      infoLayers: 3,
      graphicImageRelation: 'beside',
      density: 3,
      geometry: 'skewed',
      typeVoice: 'condensed-caps',
      colorBehavior: 'committed',
      motionLanguage: 'snap',
      surface: 'lit-material',
      holdCharacter: 'none',
      idleLoop: false,
      reducesVideoWindow: false,
    },
    card: `SPORT family - impact through geometry: solid slabs skewed about -8deg, 0 radius,
hard offset shadows (a sticker-slab look), condensed heavy caps with 0.02-0.1em tracking
on labels, bold accent slabs as LIT surfaces (same-hue shading + edge keylines where
slabs meet), snap entrances at or under 0.5s, x-slides that carry their skew.`,
    provenance: { kind: NOACG, note: 'DESIGN_LANGUAGE.md §8 sport tokens' },
  },
  {
    id: 'glass',
    keywords: /glass|frosted|translucent|soft|stream|social|friendly|rounded/i,
    genres: ['entertainment', 'promo', 'corporate', 'music'],
    axes: {
      infoLayers: 2,
      graphicImageRelation: 'beside',
      density: 2,
      geometry: 'circular',
      typeVoice: 'geometric-sans',
      colorBehavior: 'restrained',
      motionLanguage: 'glide',
      surface: 'glass',
      holdCharacter: 'brief',
      idleLoop: false,
      reducesVideoWindow: false,
    },
    card: `GLASS family - soft depth: translucent panels rgba(255,255,255,0.08-0.14) with
heavy backdrop blur (≈18px) and a 1px inner keyline rgba(255,255,255,0.18), radius
14-18px, one soft wide shadow (0 20px 60px rgba(0,0,0,0.35)), dot/ring/gradient-edge
accents, rounded families at weights 500-800, back-overshoot pops and blur-in reveals.`,
    provenance: { kind: NOACG, note: 'DESIGN_LANGUAGE.md §8 glass tokens' },
  },
  {
    id: 'noacg-house',
    keywords: /noacg|house style|control.room|on.air look/i,
    genres: ['news', 'corporate', 'promo', 'factual'],
    axes: {
      infoLayers: 2,
      graphicImageRelation: 'beside',
      density: 3,
      geometry: 'orthogonal',
      typeVoice: 'mono-technical',
      colorBehavior: 'restrained',
      motionLanguage: 'glide',
      surface: 'lit-material',
      holdCharacter: 'brief',
      idleLoop: false,
      reducesVideoWindow: false,
    },
    card: `NOACG HOUSE family (only when the brief asks for the NoaCG look) - dark
control-room: void near-black panels rgba(10,12,16,0.86-0.92) with subtle backdrop blur,
ONE amber #f6a623 accent as an 8px bar fused to a panel edge, restrained amber glow on
accent elements only, display type at 700 with -0.01/-0.02em tracking, mono small-caps
labels tracked 0.14-0.28em, controlled newsroom expo reveals - the glow never animates
on its own.`,
    provenance: { kind: NOACG, note: 'DESIGN_LANGUAGE.md §8 noacg tokens' },
  },
  {
    id: 'editorial-warm',
    keywords:
      /warm|cooking|kitchen|food|cozy|morning|lifestyle|documentary|editorial|film|cinematic|elegant serif/i,
    genres: ['factual', 'entertainment', 'promo'],
    axes: {
      infoLayers: 1,
      graphicImageRelation: 'is-the-image',
      density: 1,
      geometry: 'organic',
      typeVoice: 'serif-editorial',
      colorBehavior: 'committed',
      motionLanguage: 'glide',
      surface: 'paper-texture',
      holdCharacter: 'brief',
      idleLoop: false,
      reducesVideoWindow: false,
    },
    card: `EDITORIAL-WARM world - daylight premium: paper/cream/earth/amber palettes built
in layered same-hue depth (never one flat wall), serif or humanist display faces, thin
drawn rules and small hand-crafted flourishes, slow confident reveals with gentle
parallax between layers, generous air around the type.`,
    provenance: { kind: NOACG, note: 'genre world implied by the catalog' },
  },
  {
    id: 'celebration',
    keywords: /award|winner|celebrat|gala|reveal the winner|champion|anniversary|premiere/i,
    genres: ['entertainment', 'music', 'promo'],
    axes: {
      infoLayers: 2,
      graphicImageRelation: 'is-the-image',
      density: 2,
      geometry: 'organic',
      typeVoice: 'display-expressive',
      colorBehavior: 'drenched',
      motionLanguage: 'organic',
      surface: 'lit-material',
      holdCharacter: 'dramatised',
      idleLoop: false,
      reducesVideoWindow: false,
    },
    card: `CELEBRATION world - the big moment: deep stage darks with ONE metallic (gold or
silver) doing generous work, shimmer/particle fields BEHIND the hero, chip/badge labels,
a spotlight or bloom timed to the reveal beat, decisive holds - grandeur through light
and timing, not through clutter.`,
    provenance: { kind: NOACG, note: 'genre world implied by the catalog' },
  },

  // ── Broadcast conventions (abstracted; no package is named or imitated) ─────────────

  {
    id: 'public-service-nordic',
    keywords: /public service|nordic|scandinav|calm|trust|civic|understated|restrained/i,
    genres: ['news', 'factual', 'corporate'],
    axes: {
      infoLayers: 1,
      graphicImageRelation: 'beside',
      density: 1,
      geometry: 'orthogonal',
      typeVoice: 'humanist',
      colorBehavior: 'restrained',
      motionLanguage: 'glide',
      surface: 'flat-graphic',
      holdCharacter: 'brief',
      idleLoop: false,
      reducesVideoWindow: false,
    },
    card: `NORDIC PUBLIC-SERVICE convention - legibility as an ethic, and the hardest
discipline here is subtraction: ONE humanist sans doing every job (no pairing), sentence
case rather than caps, and a visible modular grid where the safe-area margin is treated as
part of the design instead of a limit. Colour is a named PROGRAM - flat, mid-chroma,
systematic, often coded by section - and gradients are actively avoided; white is a colour,
not a background. The graphic occupies its own zone BESIDE the picture, never marking it up.
Motion is slow, singular and physical: one transform per beat, 400-800ms, symmetric easing,
and NO overshoot anywhere. Nothing on screen shouts louder than anything else.`,
    provenance: {
      kind: OBSERVED,
      note: 'Nordic public-broadcasting conventions, abstracted across many packages',
      sources: ['https://www.newscaststudio.com/graphics/'],
    },
  },
  {
    id: 'dense-telop',
    keywords: /telop|variety|dense|packed|information|annotat|caption|reaction|subtitle/i,
    genres: ['entertainment', 'news', 'factual'],
    axes: {
      infoLayers: 6,
      graphicImageRelation: 'overlay-annotated',
      density: 5,
      geometry: 'orthogonal',
      typeVoice: 'display-expressive',
      colorBehavior: 'full-palette',
      motionLanguage: 'cut',
      surface: 'screen-native',
      holdCharacter: 'none',
      idleLoop: false,
      reducesVideoWindow: false,
    },
    card: `DENSE ANNOTATED-OVERLAY convention (East Asian variety/news lineage) - the screen
carries five or more simultaneous layers and the graphic ANNOTATES the picture rather than
sitting beside it. Caption text is multi-coloured PER PHRASE (a single line changes colour
mid-sentence for emphasis), and every glyph survives over arbitrary video via heavy outlining
- frequently a double outline plus a drop shadow - rather than via a panel behind it. Text is
word-synchronous: it pops in on-frame with the beat, hard cut, no ease. Colour is a legend
rather than a mood (one hue means urgency, another means information), so it is assigned, not
chosen. Density is the point; the design succeeds by staying readable while packed.`,
    provenance: {
      kind: OBSERVED,
      note: 'telop-style overlay conventions, abstracted; see Sasamoto/O’Hagan/Doherty 2017',
      sources: ['https://journals.sagepub.com/doi/10.1177/1527476416677099'],
    },
  },
  {
    id: 'data-terminal',
    keywords: /financ|market|stock|ticker|trading|data|index|quote|business|economic/i,
    genres: ['financial', 'news', 'corporate'],
    axes: {
      infoLayers: 5,
      graphicImageRelation: 'beside',
      density: 5,
      geometry: 'orthogonal',
      typeVoice: 'mono-technical',
      colorBehavior: 'restrained',
      motionLanguage: 'mechanical',
      surface: 'screen-native',
      holdCharacter: 'none',
      idleLoop: true,
      reducesVideoWindow: true,
    },
    card: `DATA-TERMINAL convention - the NUMERAL is the primary design object, not the label.
Figures are tabular and near-monospaced so a value ending .00 and one ending .99 occupy
identical width and nothing jitters as digits change; labels sit small-caps at 60-70% of the
numeral size. The graphic STRUCTURALLY shrinks the picture - an L-shaped or wrapped band takes
two or three edges and the video keeps only 70-80% of the frame. Palette is deliberately
narrow (blacks, greys, one blue) with saturated hues RESERVED as state indicators so they
never appear decoratively; carry state redundantly with an arrow or triangle as well as
colour. Motion is continuous rather than event-based: a steady crawl, and a value updating by
flashing its cell for a few frames then decaying back. Restraint reads as seriousness here.`,
    provenance: {
      kind: OBSERVED,
      note: 'financial-television conventions, abstracted across many packages',
      sources: ['https://www.newscaststudio.com/graphics/'],
    },
  },
  {
    id: 'stage-format',
    keywords: /quiz|game show|question|contestant|round|prize|answer|ladder|vote|elimination/i,
    genres: ['entertainment', 'kids', 'music'],
    axes: {
      infoLayers: 2,
      graphicImageRelation: 'is-the-image',
      density: 2,
      geometry: 'circular',
      typeVoice: 'display-expressive',
      colorBehavior: 'committed',
      motionLanguage: 'organic',
      surface: 'lit-material',
      holdCharacter: 'dramatised',
      idleLoop: true,
      reducesVideoWindow: false,
    },
    card: `STAGE-FORMAT convention - here the graphic IS the content, not an overlay, and it
must survive being a LIT OBJECT in a room as well as a keyed layer, so contrast stays high and
mid-tones stay clean. The lozenge/pill capsule is the signature primitive; circles and arcs
carry ladders, wheels and timers. Type is the largest on television - it reads on a phone and
on a studio monitor across the room. Colour is a STATE MACHINE, not decoration: pending,
locked, correct and incorrect are distinct designed states, not restyled variants. Bloom,
bevel and volumetric light remain legitimate here where they were abandoned elsewhere - a flat
treatment reads as wrong. And THE HOLD IS THE DESIGN: build, then a real beat of dead air on a
pulse loop while the tension sits, then resolve, then celebrate. Do not fill that pause.`,
    provenance: {
      kind: OBSERVED,
      note: 'game-show / studio-format conventions, abstracted across many formats',
    },
  },
  {
    id: 'competitive-overlay',
    keywords: /esport|gaming|tournament|bracket|scoreboard|hud|stream overlay|match stats/i,
    genres: ['esports', 'sport'],
    axes: {
      infoLayers: 6,
      graphicImageRelation: 'overlay-annotated',
      density: 5,
      geometry: 'chamfered',
      typeVoice: 'mono-technical',
      colorBehavior: 'committed',
      motionLanguage: 'snap',
      surface: 'screen-native',
      holdCharacter: 'none',
      idleLoop: true,
      reducesVideoWindow: false,
    },
    card: `COMPETITIVE-OVERLAY convention - the densest register in broadcast, and it works only
because the picture underneath is itself a designed, legible surface. A persistent bar plus
both flanks can take a fifth of the frame. Two type registers: a display face for names, and a
compact technical face for the stat layer set far smaller than any traditional sport would
accept, because the audience reads it at a glance. SIDE colour is structural and outranks brand
colour. The chassis is dark and semi-transparent so it composites over a bright render, with
accent glows carrying state. Geometry is chamfered and bracketed - corner ticks, angled cuts,
1px grid or scanline texture. Motion is the fastest anywhere: 4-10 frame builds, sub-elements
arriving 1-2 frames apart. Elements BREATHE at rest - idle pulses and drifting textures - which
is the real break from sport and news, where a resting element is genuinely static.`,
    provenance: {
      kind: OBSERVED,
      note: 'competitive-gaming broadcast conventions, abstracted across many packages',
    },
  },
  {
    id: 'graphic-poster',
    keywords: /bold|poster|graphic|statement|typographic|brand film|manifesto|striking|loud/i,
    genres: ['promo', 'entertainment', 'music', 'corporate'],
    axes: {
      infoLayers: 1,
      graphicImageRelation: 'is-the-image',
      density: 1,
      geometry: 'orthogonal',
      typeVoice: 'geometric-sans',
      colorBehavior: 'drenched',
      motionLanguage: 'cut',
      surface: 'flat-graphic',
      holdCharacter: 'brief',
      idleLoop: false,
      reducesVideoWindow: false,
    },
    card: `GRAPHIC-POSTER convention - the flat, committed, type-first register. The SURFACE IS
THE COLOUR: one saturated hue floods the whole frame edge to edge, and the type is knocked out
of it rather than sitting on a panel. Type runs enormous - a word can span 80% of the width and
crop deliberately at the frame edge - set in one geometric or grotesque family, tightly tracked,
usually two or three words total. No panels, no shadows, no depth: the composition works through
scale, alignment and negative space alone. Motion is the CUT - frames replace each other on the
beat rather than easing between states, colour fields swapping wholesale. Where most broadcast
design adds material, this one removes it and gets its power from commitment.`,
    provenance: {
      kind: OBSERVED,
      note: 'flat graphic/typographic channel-branding conventions, abstracted',
    },
  },
];

/**
 * Legacy keyword pick (max 2). Kept as the flag-off path so the contrast selector can be
 * A/B'd against exactly what shipped before it.
 */
export function detectReferenceCards(prompt: string): ReferenceCard[] {
  return REFERENCE_CARDS.filter((c) => c.keywords.test(prompt)).slice(0, 2);
}

/**
 * Pick references for one brief: eligibility, then anti-dominance, then contrast.
 *
 * The ORDER is the point. Recency biases which cards are *eligible*; the max-min contrast
 * step runs last and is never re-weighted, so nothing can quietly narrow the spread of the
 * chosen set. That is what stops rating and repetition from collapsing everything into one
 * house style over time.
 */
export function selectReferenceCards(prompt: string, count = 2): ReferenceCard[] {
  if (!USE_CONTRAST_SELECTION) return detectReferenceCards(prompt);

  const matched = REFERENCE_CARDS.filter((c) => c.keywords.test(prompt));
  if (matched.length === 0) return []; // no signal - no reference is a valid outcome

  // ANCHOR EXACTLY ONE, then always widen. Both halves are load-bearing, and both were
  // arrived at by measurement rather than reasoning:
  //
  //  - The anchor is non-negotiable. Max-min over an unanchored pool returns the two most
  //    mutually-unlike cards and happily discards the one that matched the brief - an awards
  //    brief lost the celebration card outright. Relevance pins the first pick.
  //
  //  - Widening must happen even when several cards matched. Only anchoring what matched
  //    left the selector inert on realistic briefs: verbose real-world prose matches two
  //    cards by keyword, so "choosing" between them is no choice, and on the bench bank six
  //    of seven briefs came out byte-identical to the legacy path. Worse, the matched pair
  //    can itself be a narrow one (an awards brief matched celebration + stage-format, two
  //    cards 0.18 apart on the axes), and a matched-only pool cannot escape that.
  //
  // So: the best match anchors, and every companion is chosen from the wider genre-compatible
  // field. Widening stays appropriate because the MATCHED cards vote on genre - a cooking
  // brief never reaches the data-terminal card.
  const anchor = matched[0];
  const voted = new Set(matched.flatMap((c) => c.genres));
  const candidates = REFERENCE_CARDS.filter(
    (c) => c !== anchor && c.genres.some((g) => voted.has(g)),
  );
  if (candidates.length === 0) return [anchor];

  // Anti-dominance applies to ELIGIBILITY only: drop recently-used companions while enough
  // remain, then let the (never re-weighted) contrast step run on what is left.
  const recent = recentReferenceIds();
  const fresh = candidates.filter((c) => !recent.includes(c.id));
  const pool = fresh.length >= count - 1 ? fresh : candidates;

  return pickContrasting([anchor, ...pool], count, [anchor]);
}

/** The Director-prompt section for the picked cards ('' when none matched). */
export function referenceSection(cards: ReferenceCard[]): string {
  if (cards.length === 0) return '';
  return `## Design DNA from broadcast craft vocabularies (inspiration, NOT the answer)
These are craft vocabularies - some from sibling graphics in this product, some abstracted
from how a genre of broadcast design behaves. Borrow materials, geometry, and motion character
where they serve the brief - and design an ORIGINAL piece. The brief always outranks the
reference; ignore a card that fights it. Never imitate a specific real-world channel or
package: these describe genres, not works.

${cards.map((c) => c.card).join('\n\n')}`;
}
