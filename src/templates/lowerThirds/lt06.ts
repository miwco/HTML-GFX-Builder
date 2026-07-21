// lt06 "Split Bar" — sport lower third built from two stacked bars instead of one panel.
// The name line paints a heavy dark slab; the team line below it paints a solid accent bar
// (sport's deliberate bold-accent exception). Each bar hugs its own line's text, so unequal
// line lengths create a stepped, badge-like silhouette. Zero radius, zero gap.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt06: TemplateVariant = defineVariant(
  {
    id: 'lt06',
    category: 'lower-third',
    name: 'Split Bar',
    styleTag: 'sport',
    description: 'Two stacked bars — a heavy dark name slab over a solid accent team bar.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'RIVERA' },
      { title: 'Team', sample: 'FC VOLTA' },
    ],
    logo: 'none',
    animationPresets: ['mask-wipe', 'snap-stinger', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('inferno'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Split Bar',
    description:
      'Two stacked bars that each hug their own text: a heavy dark slab for the name and a ' +
      'solid accent bar for the team line, touching with zero gap so unequal line lengths ' +
      'form a stepped, sport-badge silhouette.',
    uicolor: '6',
  },
  (o) => ({
    // No .lower-third-accent element: the accent IS the second bar's background.
    html: `    <!-- Split Bar: no shared panel — each line's span paints its own bar, so the bars step. -->
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `/* No shared panel here: the box is only a stack of line masks (normal block flow,
   zero gap — the bars touch). Each span paints its own bar and hugs its own text. */

/* The name line: a heavy dark slab. */
.lower-third-name {
  background: var(--panel-bg);     /* the dark slab behind the name */
  color: var(--text-color);        /* primary text color */
  padding: calc(16px * var(--scale)) calc(34px * var(--scale));  /* generous slab padding, wide sides */
  font-size: calc(54px * var(--scale) * var(--type-scale));  /* headline size — the loudest thing on screen */
  font-weight: var(--display-weight);  /* the name's authored display weight */
  line-height: 1.1;                /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the name's authored display tracking */
  text-transform: uppercase;       /* sport graphics shout */
}

/* The team line: a solid accent bar — sport's deliberate bold-accent exception. */
.lower-third-title {
  background: var(--accent);       /* the accent moment: a full accent slab */
  color: var(--accent-ink);        /* the family's ink on an accent-filled bar */
  padding: calc(10px * var(--scale)) calc(34px * var(--scale));  /* slimmer bar; sides match the name slab so text edges align */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* clearly subordinate to the name (~2.1:1) */
  font-weight: 700;                /* bold, but a step below the name */
  line-height: 1.3;                /* small caps get room to breathe */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* matches the name's caps */
}`,
    hasAccent: false,
    tokens: {
      displayWeight: '900',
    },
  }),
);
