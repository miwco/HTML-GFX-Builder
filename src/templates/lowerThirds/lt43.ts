// lt43 "Center Slab" — the centre-anchored sport strap: a name on a dark slab with a full-width
// accent bar under it, centred at the bottom of the frame. It is the arena graphic — the one that
// belongs on a wide court or ring shot where the subject is dead centre and a corner strap would
// look like an afterthought.
//
// The bar spans the slab, so it always measures exactly as wide as the widest line: the
// composition rebalances itself around whatever the operator types.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt43: TemplateVariant = defineVariant(
  {
    id: 'lt43',
    category: 'lower-third',
    name: 'Center Slab',
    styleTag: 'sport',
    description: 'Centred slab with a full-width accent bar under the name and its caps line.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'JAKE MORRISON' },
      { title: 'Stat line', sample: 'ROUND 3 · CHALLENGER' },
    ],
    logo: 'none',
    animationPresets: ['pop-spring', 'mask-wipe', 'snap-stinger', 'slide-up', 'fade'],
    defaultPalette: paletteById('inferno'),
    defaultFontId: 'bebas-neue',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Center Slab',
    description:
      'The arena strap: a centred dark slab, the name in all-caps display, a caps support line ' +
      'under it, and a full-width accent bar closing the block. For ring walks, podiums, and any ' +
      'wide shot with the subject centre-frame. Sibling of lt06 Split Bar.',
    uicolor: '7',
  },
  (o) => ({
    html: `    <!-- Center Slab: [name / caps line] over [a full-width accent bar], centred. -->
    <div class="lower-third-box">
${lineMasks(o, '      ')}
      <div class="lower-third-accent"></div>
    </div>`,
    css: `/* The slab — centred, zero radius, one hard offset shadow. */
.lower-third-box {
  text-align: center;              /* the symmetric composition this design is built on */
  background: var(--panel-bg);     /* dark panel behind the text stack */
  box-shadow: var(--panel-shadow);  /* the family's hard offset lift */
  padding: calc(18px * var(--scale)) calc(56px * var(--scale)) 0;  /* the bar closes the bottom */
}

/* The accent bar — closes the slab, spanning its full width. */
.lower-third-accent {
  height: var(--accent-weight);    /* the family's bar weight */
  margin: calc(18px * var(--scale)) calc(-56px * var(--scale)) 0;  /* pulls out to the slab's edges */
  background: var(--accent);       /* the accent used boldly, sport-style */
  will-change: transform;          /* hint the browser: presets animate this bar */
}

/* Name — all-caps display; size does the shouting. */
.lower-third-name {
  font-size: calc(54px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.02;               /* big display text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* the matchday voice */
  color: var(--text-color);        /* primary text */
}

/* The caps line — the support voice, tracked and centred under the name. */
.lower-third-title {
  font-size: calc(25px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.2;                /* a touch more air than the headline */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  margin-right: calc(-1 * var(--label-tracking));  /* letter-spacing trails the LAST glyph too;
                                      without this the centred line sits left of centre */
  text-transform: uppercase;       /* matches the headline's voice */
  color: var(--label-color);       /* the family's label colour */
  margin-top: calc(6px * var(--scale));  /* name + support line read as one unit */
}`,
    hasAccent: true,
  }),
);
