// lt57 "Volt Call" — the SPORT call-to-action strap, sibling of lt05 "Angle Slab" /
// lt17 "Volt Handle" / card40 "Volt Offer". The forward-leaning near-black slab with the accent
// edge fused to it, carrying the imperative in huge condensed caps, the target beneath it, and
// a small tracked reason line at the bottom.
//
// Same three-field CTA contract as lt55 "House Call" and lt56 "Frost Call" — action · target ·
// reason. Here the ACTION is the display line rather than a chip: in the sport register the
// instruction is the shout, and the address is what you read after it.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { maskLine, maskLines } from '../shared/standard';
import { defineVariant } from './shared';

export const lt57: TemplateVariant = defineVariant(
  {
    id: 'lt57',
    category: 'lower-third',
    name: 'Volt Call',
    styleTag: 'sport',
    description: 'A leaning call-to-action slab: the imperative in heavy caps over its target and reason.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Action', sample: 'BUY TICKETS' },
      { title: 'Target', sample: 'VOLTAFC.COM/TICKETS' },
      { title: 'Detail', sample: 'MEMBERS PRESALE OPENS 09:00 FRIDAY' },
    ],
    logo: 'none',
    animationPresets: ['snap-stinger', 'mask-wipe', 'slide-left', 'fade', 'slide-up', 'flip-3d'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Volt Call',
    description:
      'A forward-leaning sport slab with a chunky accent edge: the call to action in huge heavy ' +
      'condensed caps, the address or handle it points at beneath it in the accent colour, and ' +
      'one tracked reason line at the bottom. Clear the Detail field for a two-line shout.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Volt Call: [accent edge] | [leaning slab: action / target / reason]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${maskLines([
  maskLine('lower-third', o, 0, 'lower-third-action', '      '),
  maskLine('lower-third', o, 1, 'lower-third-target', '      '),
  maskLine('lower-third', o, 2, 'lower-third-reason', '      '),
])}
    </div>`,
    css: `/* The accent edge — a chunky bar fused to the slab's leaning left side. The lean is
   painted on ::before because presets tween .lower-third-accent itself (line-reveal scales it),
   and a skew written there would be flattened. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  left: 0;                          /* at the very left edge */
  top: 0;                           /* full slab height… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's bar weight */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}
.lower-third-accent::before {
  content: '';                      /* the painted surface — the element itself stays unskewed */
  position: absolute;               /* fills its parent… */
  inset: 0;                         /* …edge to edge */
  background: var(--accent);        /* the one accent surface */
  transform: skewX(-8deg);          /* the sport family's lean */
}

/* The slab — near-black, leaning, painted on ::before so no preset can straighten it. */
.lower-third-box {
  position: relative;               /* the painted slab is placed against this box */
  padding: calc(18px * var(--scale)) calc(46px * var(--scale)) calc(20px * var(--scale)) calc(28px * var(--scale));
}
.lower-third-box::before {
  content: '';                      /* the slab surface itself */
  position: absolute;               /* behind the text… */
  inset: 0;                         /* …across the whole box */
  z-index: -1;                      /* …and under it */
  background: var(--panel-bg);      /* the near-black slab */
  transform: skewX(-8deg);          /* the family's lean, matching the accent edge */
  box-shadow: var(--panel-shadow);  /* the family's lift */
}

/* The action — the shout. Everything else on the slab supports it. */
.lower-third-action {
  font-size: calc(54px * var(--scale) * var(--type-scale));  /* the strap's one huge voice (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight — heavy condensed */
  line-height: 1;                   /* huge condensed caps sit very tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;        /* the sport register is always caps */
  color: var(--text-color);         /* primary text color */
}

/* The target — the address, in the accent: what you type in after the shout. */
.lower-third-target {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* clearly under the action */
  font-weight: 700;                 /* bold — it is meant to be copied */
  line-height: 1.2;                 /* address leading */
  letter-spacing: 0.04em;           /* condensed caps need a little air to stay readable */
  text-transform: uppercase;        /* the sport register is always caps */
  overflow-wrap: anywhere;          /* a very long address breaks rather than overflowing */
  margin-top: calc(6px * var(--scale));  /* action and target read as one unit */
  color: var(--accent);             /* the accent's second, larger appearance */
}

/* The reason — the small print, tracked and dimmed. */
.lower-third-reason {
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* the smallest voice on the slab */
  font-weight: 400;                 /* regular weight */
  line-height: 1.3;                 /* body text gets room to breathe */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* the sport register is always caps */
  margin-top: calc(10px * var(--scale));  /* target → reason: a real break */
  color: var(--text-dim);           /* dimmed — never full white twice */
}`,
    hasAccent: true,
  }),
);
