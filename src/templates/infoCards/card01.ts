// card01 "Hairline Card" — the info-card sibling of lt01 (Hairline). Same DNA: no panel,
// pure typography beside one thin vertical accent line, whitespace does all the work.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCardVariant, cardLineMasks } from './shared';

export const card01: TemplateVariant = defineCardVariant(
  {
    id: 'card01',
    category: 'info-card',
    name: 'Hairline Card',
    styleTag: 'minimal',
    description: 'A taller Hairline: heading and quiet body lines beside one thin vertical line - no panel.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Heading', sample: 'The Story in Numbers' },
      { title: 'Line 1', sample: 'Renewables grew 28% this year' },
      { title: 'Line 2', sample: 'Coal at its lowest share since 1965' },
    ],
    hasLogoSlot: false,
    animationPresets: ['line-reveal', 'slide-fade', 'mask-wipe'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-right',
  },
  {
    name: 'Hairline Card',
    description:
      'The info-card sibling of the Hairline lower third: no panel behind the text, just a ' +
      'confident heading, dimmed body lines, and a single 3 px vertical hairline standing ' +
      'beside them. Best over calm, well-lit footage.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Hairline Card structure: [vertical accent line] | [transparent text block]. -->
    <div class="card-accent"></div>
    <div class="card-box">
${cardLineMasks(o)}
    </div>`,
    css: `/* The hairline — a thin vertical line spanning the full height of the text block.
   Same accent geometry as the Hairline lower third, just taller; presets grow it in. */
.card-accent {
  position: absolute;               /* pinned inside the positioned .card root */
  left: 0;                          /* sits at the block's left edge */
  top: 0;                           /* stretches from the very top… */
  bottom: 0;                        /* …to the very bottom of the text block */
  width: calc(3px * var(--scale));  /* a true hairline — just visible at 1080p */
  background: var(--accent);        /* the one small, sharp dose of accent color */
  will-change: transform;           /* hint the browser: presets animate this line */
}

/* The text block — deliberately transparent: no panel, whitespace does the work. */
.card-box {
  padding-left: calc(31px * var(--scale));  /* room for the 3px line + a generous 28px gap */
}

/* Heading — big and confident; the only heavy element in the design. */
.card-name {
  font-size: calc(44px * var(--scale));  /* card heading size (values are 1080p reference) */
  font-weight: 700;                 /* bold enough to carry the design on its own */
  line-height: 1.1;                 /* big text sits tight */
  letter-spacing: -0.01em;          /* large sizes tighten slightly */
  color: var(--text-color);         /* primary text color */
}

/* Body lines — quiet on purpose: smaller, lighter, dimmed. */
.card-title,
.card-extra {
  font-size: calc(24px * var(--scale));  /* ≈1.8:1 below the heading — clear hierarchy */
  font-weight: 400;                 /* regular weight; contrast comes from the heading */
  line-height: 1.35;                /* body text gets room to breathe */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(10px * var(--scale));  /* comfortable gap between body lines */
}

/* The first body line sits a touch further from the heading than lines sit from each other. */
.card-title {
  margin-top: calc(14px * var(--scale));  /* heading → body: a slightly larger break */
}`,
    hasAccent: true,
  }),
);
