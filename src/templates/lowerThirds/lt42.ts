// lt42 "Right Slam" — the right-anchored sport strap: a heavy accent bar on the outside edge with
// the name and stat line ragged-left against it. Mirroring the family for the right of the frame
// matters more here than anywhere else, because a sport slab is opaque: a left-built slab moved
// across the frame puts its accent bar in the middle of the picture, pointing the wrong way.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt42: TemplateVariant = defineVariant(
  {
    id: 'lt42',
    category: 'lower-third',
    name: 'Right Slam',
    styleTag: 'sport',
    description: 'Right-anchored slab: accent bar on the outside edge, type ragged-left.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'JAKE MORRISON' },
      { title: 'Stat line', sample: '24 PTS · 11 AST' },
    ],
    logo: 'none',
    animationPresets: ['slide-left', 'snap-stinger', 'mask-wipe', 'pop-spring', 'fade'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-right',
  },
  {
    name: 'Right Slam',
    description:
      'The sport slab built for the right of the frame: the accent bar on the outside edge, the ' +
      'name and stat line ragged-left against it. Pairs with lt05 or lt40 on the opposite side ' +
      'for head-to-head coverage. Sibling of lt06 Split Bar.',
    uicolor: '7',
  },
  (o) => ({
    html: `    <!-- Right Slam: [name / stat line, ragged-left] | [accent bar on the outside edge]. -->
    <div class="lower-third-box">
      <div class="lower-third-text">
${lineMasks(o, '        ')}
      </div>
      <div class="lower-third-accent"></div>
    </div>`,
    css: `/* The slab — words and bar fused, zero radius, one hard offset shadow. */
.lower-third-box {
  display: flex;                   /* words and bar sit side by side */
  align-items: stretch;            /* the bar runs the slab's full height */
  background: var(--panel-bg);     /* dark panel behind the text stack */
  box-shadow: var(--panel-shadow);  /* the family's hard offset lift */
}

/* The accent bar — on the OUTSIDE edge, where a right-anchored graphic wants it. */
.lower-third-accent {
  flex: none;                      /* never squeezed by long text */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the accent used boldly, sport-style */
  will-change: transform;          /* hint the browser: presets animate this bar */
}

/* The text stack, ragged-left against the bar. */
.lower-third-text {
  display: flex;                   /* stack the lines vertically */
  flex-direction: column;          /* top to bottom */
  align-items: flex-end;           /* every row ends at the bar */
  text-align: right;               /* …and wrapped rows do too */
  min-width: 0;                    /* lets a long unbroken name wrap instead of overflowing */
  padding: calc(16px * var(--scale)) calc(26px * var(--scale)) calc(18px * var(--scale)) calc(40px * var(--scale));
}

/* Name — condensed heavy caps; size does the shouting. */
.lower-third-name {
  font-size: calc(50px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.04;               /* big display text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* the matchday voice */
  color: var(--text-color);        /* primary text */
}

/* Stat line — the support voice: smaller caps, tracked. */
.lower-third-title {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.2;                /* a touch more air than the headline */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* matches the headline's voice */
  color: var(--label-color);       /* the family's label colour */
  margin-top: calc(6px * var(--scale));  /* name + stat read as one unit */
}`,
    hasAccent: true,
  }),
);
