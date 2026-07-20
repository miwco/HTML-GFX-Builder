// card06 "House Topic" — the NoaCG topic card, sibling of lt11 "House Strap". The house
// void panel with an 8px amber bar fused to its left edge, a confident heading and quiet
// body lines inside. Where card05 House Title is the full-frame opener, this is the card
// that stays up DURING the discussion: a heading and the points under it.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCardVariant, cardLineMasks } from './shared';

export const card06: TemplateVariant = defineCardVariant(
  {
    id: 'card06',
    category: 'info-card',
    name: 'House Topic',
    styleTag: 'noacg',
    description: 'The house topic card: an amber bar and void panel, a heading over quiet body lines.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Heading', sample: 'The Story in Numbers' },
      { title: 'Line 1', sample: 'Renewables grew 28% this year' },
      { title: 'Line 2', sample: 'Coal at its lowest share since 1965' },
    ],
    logo: 'optional',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-right',
  },
  {
    name: 'House Topic',
    description:
      'The NoaCG topic card, sibling of lt11 House Strap: one 8px amber bar with the house ' +
      'glow fused to a void blur panel, a confident heading above quiet dimmed body lines. ' +
      'The card that holds a topic and its points while the discussion runs.',
    uicolor: '4',
  },
  (o) => ({
    // House structure: [8px amber bar] | [void blur panel — heading over body lines], the
    // lt11 lockup grown into a card. cardLineMasks emits f0..fN in field order.
    html: `    <!-- House Topic: [amber bar] | [void panel: heading over body lines]. -->
    <div class="info-card-accent"></div>
    <div class="info-card-box">
${cardLineMasks(o)}
    </div>`,
    css: `/* The accent bar — 8px, fused to the panel's left edge, with the house's one glow.
   The glow follows the accent color (color-mix), so retinting keeps it coherent. */
.info-card-accent {
  position: absolute;               /* pinned inside the positioned .info-card root */
  left: 0;                          /* at the very left edge */
  top: 0;                           /* full panel height… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  box-shadow: var(--accent-glow);   /* the family's glow — follows the accent color */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}

/* The panel — the house void: near-black, translucent, softly blurring the video. */
.info-card-box {
  margin-left: var(--accent-weight);  /* starts where the accent bar ends */
  padding: calc(30px * var(--scale)) calc(48px * var(--scale)) calc(32px * var(--scale)) calc(34px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* one deep lifting shadow */
}

/* Heading — the confident display moment; the only heavy element in the card. */
.info-card-name {
  font-size: calc(44px * var(--scale) * var(--type-scale));  /* card heading size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                 /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);         /* primary text color */
}

/* Body lines — quiet on purpose: smaller, lighter, dimmed. */
.info-card-title,
.info-card-extra {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* ≈1.8:1 below the heading — clear hierarchy */
  font-weight: 400;                 /* regular weight; contrast comes from the heading */
  line-height: 1.35;                /* body text gets room to breathe */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(10px * var(--scale));  /* comfortable gap between body lines */
}

/* The first body line sits a touch further from the heading than the lines sit from each other. */
.info-card-title {
  margin-top: calc(16px * var(--scale));  /* heading → body: a slightly larger break */
}`,
    hasAccent: true,
  }),
);
