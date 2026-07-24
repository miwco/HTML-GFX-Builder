// card40 "Volt Offer" — the SPORT offer card, sibling of lt05 "Angle Slab" / card02 "Slab Card"
// / card08 "Slab Title". Same sport DNA: a near-black slab painted at the family -8° lean on
// ::before (a layer no preset ever flattens), a chunky accent edge fused to the leaning side.
//
// The offer card is the price drop announced on its own, without the product beside it — the
// full-attention moment of a live-shopping or flash-sale segment. Its five values are five
// separate fields so each carries its own weight: a small kicker, one enormous claim, the
// terms line, a promo code in a solid chip, and a deadline line. Both the code chip and the
// deadline disappear when their field is cleared (`:empty`), which is how one design serves a
// coded promo, an uncoded one, and an open-ended offer without any of them being a special case.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card40: TemplateVariant = defineCardVariant(
  {
    id: 'card40',
    category: 'info-card',
    name: 'Volt Offer',
    styleTag: 'sport',
    description: 'A flash-offer slab: a huge discount claim over its terms, promo code, and deadline.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Kicker', sample: 'FLASH DEAL' },
      { title: 'Offer', sample: '40% OFF' },
      { title: 'Detail', sample: 'EVERYTHING IN THE WINTER RANGE' },
      { title: 'Code', sample: 'WINTER40' },
      { title: 'Ends', sample: 'ENDS TONIGHT 23:59' },
    ],
    logo: 'none',
    animationPresets: ['snap-stinger', 'mask-wipe', 'slide-left', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-left',
  },
  {
    name: 'Volt Offer',
    description:
      'A forward-leaning sport slab with a chunky accent edge: a small accent kicker over one ' +
      'enormous discount claim, the terms line under it, then a solid promo-code chip and a ' +
      'deadline line. Clear the Code or Ends field and that element disappears — one design ' +
      'covers a coded promo, an uncoded one, and an offer with no deadline.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Volt Offer: [accent edge] | [leaning slab: kicker / claim / terms / code + deadline]. -->
    <div class="info-card-accent"></div>
    <div class="info-card-box">
${maskLines([
  maskLine('info-card', o, 0, 'info-card-kicker', '      '),
  maskLine('info-card', o, 1, 'info-card-claim', '      '),
  maskLine('info-card', o, 2, 'info-card-terms', '      '),
  `      <!-- The footer row: the promo code chip and the deadline share one baseline. -->
      <div class="info-card-offer-foot">
${maskLines([
  maskLine('info-card', o, 3, 'info-card-code', '        '),
  maskLine('info-card', o, 4, 'info-card-ends', '        '),
])}
      </div>`,
])}
    </div>`,
    css: `/* The accent edge — a chunky bar fused to the slab's leaning left side. It carries the
   SAME -8° lean as the slab, painted on a pseudo-layer for the same reason: presets tween
   .info-card-accent itself (line-reveal scales it), and a skew written there would be flattened. */
.info-card-accent {
  position: absolute;               /* pinned inside the positioned .info-card root */
  left: 0;                          /* at the very left edge */
  top: 0;                           /* full slab height… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's bar weight */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}
.info-card-accent::before {
  content: '';                      /* the painted surface — the element itself stays unskewed */
  position: absolute;               /* fills its parent… */
  inset: 0;                         /* …edge to edge */
  background: var(--accent);        /* the one accent surface */
  transform: skewX(-8deg);          /* the sport family's lean */
}

/* The slab — near-black, leaning, painted on ::before so no preset can straighten it. */
.info-card-box {
  position: relative;               /* the painted slab is placed against this box */
  padding: calc(24px * var(--scale)) calc(52px * var(--scale)) calc(26px * var(--scale)) calc(34px * var(--scale));
}
.info-card-box::before {
  content: '';                      /* the slab surface itself */
  position: absolute;               /* behind the text… */
  inset: 0;                         /* …across the whole box */
  z-index: -1;                      /* …and under it */
  background: var(--panel-bg);      /* the near-black slab */
  transform: skewX(-8deg);          /* the family's lean, matching the accent edge */
  box-shadow: var(--panel-shadow);  /* the family's lift */
}

/* The kicker — a small tracked-caps label in the accent colour. */
.info-card-kicker {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* label scale — a caption, not a headline */
  font-weight: 700;                 /* bold keeps small caps legible over video */
  line-height: 1.2;                 /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* reads as a label, whatever the operator types */
  color: var(--label-color);        /* the family's label colour */
}

/* The claim — the reason the card exists. Everything else in it is support. */
.info-card-claim {
  font-size: calc(78px * var(--scale) * var(--type-scale));  /* the whole design IS this line (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight — heavy condensed */
  line-height: 0.98;                /* huge condensed caps sit very tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;        /* the sport register is always caps */
  margin-top: calc(4px * var(--scale));  /* kicker and claim read as one unit */
  color: var(--text-color);         /* primary text color */
}

/* The terms — what the claim actually applies to. Dimmed, one clear step down. */
.info-card-terms {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* body scale under the claim */
  font-weight: 400;                 /* regular weight — contrast through weight, not more fonts */
  line-height: 1.3;                 /* body text gets room to breathe */
  letter-spacing: 0.04em;           /* condensed caps need a little air to stay readable */
  margin-top: calc(10px * var(--scale));  /* claim → terms: a real break */
  color: var(--text-dim);           /* dimmed — never full white twice */
}

/* The footer row — code chip and deadline, sharing a baseline, wrapping as a unit. */
.info-card-offer-foot {
  display: flex;                    /* the chip and the deadline sit side by side */
  flex-wrap: wrap;                  /* a long deadline wraps under the chip instead of overflowing */
  align-items: baseline;            /* both sit on the same text baseline */
  gap: calc(16px * var(--scale));   /* clear air between two different kinds of value */
  margin-top: calc(18px * var(--scale));  /* terms → footer: the card's largest break */
}

/* The promo code — a solid accent chip: the one thing a viewer has to write down.
   Empty field = no chip at all (:empty), so an uncoded offer leaves no gap behind. */
.info-card-code {
  padding: calc(6px * var(--scale)) calc(16px * var(--scale));  /* a compact, tappable-looking badge */
  border-radius: var(--panel-radius);  /* the family's corner treatment */
  background: var(--accent);        /* solid accent — the loudest small surface */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* bigger than a label: it must be copied */
  font-weight: 700;                 /* heavy — a code is read under time pressure */
  letter-spacing: 0.08em;           /* code glyphs are read one at a time */
  text-transform: uppercase;        /* codes are always shown in caps */
  white-space: nowrap;              /* a promo code never breaks across lines */
  color: var(--accent-ink);         /* readable ink ON the accent surface */
}
.info-card-code:empty {
  display: none;                    /* no code = no chip; no JS, nothing to reset */
}

/* The deadline — urgency, stated quietly so the claim keeps the volume. */
.info-card-ends {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* footer scale */
  font-weight: 700;                 /* bold — it is still a warning */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* the sport register is always caps */
  color: var(--text-dim);           /* dimmed — the third voice on the slab */
}
.info-card-ends:empty {
  display: none;                    /* an open-ended offer shows no deadline line */
}`,
    hasAccent: true,
  }),
);
