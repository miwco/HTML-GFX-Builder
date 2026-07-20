// lt01 "Hairline" — the most restrained lower third in the set. No panel at all: pure
// typography beside a single thin vertical accent line. Whitespace does all the work.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt01: TemplateVariant = defineVariant(
  {
    id: 'lt01',
    category: 'lower-third',
    name: 'Hairline',
    styleTag: 'minimal',
    description: 'Pure typography beside one thin vertical line - no panel, whitespace does the work.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Title', sample: 'Chief Correspondent' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Hairline',
    description:
      'The quietest design of the set: no panel behind the text, just confident type and a ' +
      'single 3 px vertical hairline standing beside it. Best over calm, well-lit footage.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Hairline structure: [vertical accent line] | [transparent text block]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `/* The hairline — a thin vertical line spanning the full height of the text block.
   It is the design's only non-text element; presets grow it in via transform. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  left: 0;                          /* sits at the block's left edge */
  top: 0;                           /* stretches from the very top… */
  bottom: 0;                        /* …to the very bottom of the text block */
  width: var(--accent-weight);      /* the family's accent-line weight */
  background: var(--accent);        /* the one small, sharp dose of accent color */
  will-change: transform;           /* hint the browser: presets animate this line */
}

/* The text block — deliberately transparent: no panel, whitespace does the work. */
.lower-third-box {
  padding-left: calc(27px * var(--scale));  /* room for the 3px line + a generous 24px gap */
}

/* Name line — big and confident; the only heavy element in the design. */
.lower-third-name {
  font-size: calc(54px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.08;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);         /* primary text color */
}

/* Title line (and any extra line) — quiet on purpose: smaller, lighter, dimmed. */
.lower-third-title,
.lower-third-extra {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* ≈2.2:1 below the name — clear hierarchy */
  font-weight: 400;                 /* regular weight; contrast comes from the name */
  line-height: 1.3;                 /* secondary text gets room to breathe */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(6px * var(--scale));  /* small gap: name + title read as one unit */
}`,
    hasAccent: true,
  }),
);
