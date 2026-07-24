// card41 "Clean Offer" — the MINIMAL offer card, sibling of lt01 "Hairline" / lt02 "Underline"
// / card07 "Clean Title". No panel at all: a short accent rule, a tracked-caps kicker, one large
// offer line, its terms, and a footer holding the promo code in an outlined chip beside the
// deadline. Whitespace does the work, which is what makes this the offer card for a retailer
// whose own brand should stay louder than the graphic.
//
// Same five-field contract as card40 Volt Offer — the offer type's shape is fixed and only its
// skin changes — including the two `:empty` elements (code, deadline) that vanish rather than
// leaving a hole when the operator has nothing to put in them.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card41: TemplateVariant = defineCardVariant(
  {
    id: 'card41',
    category: 'info-card',
    name: 'Clean Offer',
    styleTag: 'minimal',
    description: 'A panel-free offer card: a large offer line over its terms, promo code, and deadline.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Kicker', sample: 'Members' },
      { title: 'Offer', sample: 'Two for one' },
      { title: 'Detail', sample: 'On every hardback in the autumn list' },
      { title: 'Code', sample: 'AUTUMN2' },
      { title: 'Ends', sample: 'Until Sunday' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'mask-wipe', 'slide-up', 'fade', 'slide-down', 'blur-in'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-left',
  },
  {
    name: 'Clean Offer',
    description:
      'A panel-free offer card in the minimal family: a short accent rule over a tracked-caps ' +
      'kicker, one large offer line, its terms, and a footer with an outlined promo-code chip ' +
      'beside the deadline. Clear the Code or Ends field and that element disappears entirely.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Clean Offer: [accent rule] / kicker / offer / terms / [code chip + deadline]. -->
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
    css: `/* The accent rule — a short horizontal hairline above the copy. The minimal family's
   one accent moment; line-reveal grows it from its left end. */
.info-card-accent {
  width: calc(84px * var(--scale));  /* a short rule, not a full-width edge */
  height: var(--accent-weight);      /* the family's rule weight */
  margin-bottom: calc(18px * var(--scale));  /* air between the rule and the kicker */
  background: var(--accent);         /* the one accent surface */
  will-change: transform;            /* hint the browser: presets grow this rule in */
}

/* No panel: the card is type on the picture. The box exists for the presets to move. */
.info-card-box {
  /* deliberately unstyled — the auto-fit width cap and wrap rules come from the assembler */
}

/* The kicker — small tracked caps, the quiet label above the offer. */
.info-card-kicker {
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* label scale — a caption, not a headline */
  font-weight: 700;                 /* bold keeps small caps legible over video */
  line-height: 1.2;                 /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* reads as a label, whatever the operator types */
  color: var(--label-color);        /* the family's label colour */
}

/* The offer line — the card's one large voice. Set light, not heavy: the minimal family
   makes its point with size and space rather than weight. */
.info-card-claim {
  font-size: calc(60px * var(--scale) * var(--type-scale));  /* the whole design IS this line (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.05;                /* large type sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  margin-top: calc(10px * var(--scale));  /* kicker and offer read as one unit */
  color: var(--text-color);         /* primary text color */
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.55);  /* the panel-free family's legibility over video */
}

/* The terms — what the offer applies to, one clear step down. */
.info-card-terms {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* body scale under the offer */
  font-weight: 400;                 /* regular weight */
  line-height: 1.4;                 /* body text gets room to breathe */
  margin-top: calc(12px * var(--scale));  /* offer → terms: a real break */
  color: var(--text-dim);           /* dimmed — never full white twice */
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.5);  /* the same legibility insurance, softer */
}

/* The footer row — code chip and deadline, sharing a baseline, wrapping as a unit. */
.info-card-offer-foot {
  display: flex;                    /* the chip and the deadline sit side by side */
  flex-wrap: wrap;                  /* a long deadline wraps under the chip instead of overflowing */
  align-items: baseline;            /* both sit on the same text baseline */
  gap: calc(16px * var(--scale));   /* clear air between two different kinds of value */
  margin-top: calc(20px * var(--scale));  /* terms → footer: the card's largest break */
}

/* The promo code — an outlined chip. The minimal family never fills a surface it can
   simply draw. Empty field = no chip at all (:empty). */
.info-card-code {
  padding: calc(5px * var(--scale)) calc(14px * var(--scale));  /* a compact badge */
  border: 1px solid var(--accent);  /* outlined, not filled */
  border-radius: calc(3px * var(--scale));  /* minimal corners: 0-3px, never a pill */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* bigger than a label: it must be copied */
  font-weight: 700;                 /* heavy — a code is read under time pressure */
  letter-spacing: 0.1em;            /* code glyphs are read one at a time */
  text-transform: uppercase;        /* codes are always shown in caps */
  white-space: nowrap;              /* a promo code never breaks across lines */
  color: var(--accent);             /* the outline's own colour, not filled ink */
}
.info-card-code:empty {
  display: none;                    /* no code = no chip; no JS, nothing to reset */
}

/* The deadline — stated quietly; the offer line keeps the volume. */
.info-card-ends {
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* footer scale */
  font-weight: 400;                 /* regular — urgency without shouting */
  color: var(--text-dim);           /* dimmed — the third voice on the card */
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.5);  /* legibility over an unknown picture */
}
.info-card-ends:empty {
  display: none;                    /* an open-ended offer shows no deadline line */
}`,
    hasAccent: true,
  }),
);
