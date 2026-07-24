// card39 "Frost Product" — the GLASS product card, sibling of lt08 "Frosted Card" and card03
// "Frosted Panel". Same translucent recipe grown to a commerce lockup, but stacked rather than
// side-by-side: a wide product shot across the top of the panel, then the name, the price row,
// and the benefit line beneath it. That vertical shape is what suits a portrait shopping
// stream, where a horizontal card would run out of frame.
//
// Same three-value price row as card38 (price · struck-through was · optional savings chip),
// because the price row is the type's contract and only its skin changes between families.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { designFieldId, maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card39: TemplateVariant = defineCardVariant(
  {
    id: 'card39',
    category: 'info-card',
    name: 'Frost Product',
    styleTag: 'glass',
    description: 'A frosted product card: a wide shot over the name, its price, and one benefit line.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Product', sample: 'Calm Linen Throw' },
      { title: 'Price', sample: '£68' },
      { title: 'Was', sample: '£95' },
      { title: 'Saving', sample: 'BUNDLE DEAL' },
      { title: 'Detail', sample: 'Four colours · ships in 48 hours' },
    ],
    logo: 'none',
    animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-right',
  },
  {
    name: 'Frost Product',
    description:
      'A translucent blurred glass card for live shopping: a wide product shot across the top, ' +
      'then the product name, a large price beside the struck-through previous price and an ' +
      'optional deal chip, and one quiet benefit line. Clearing the Saving or Was field removes ' +
      'that element entirely — no empty space left behind.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Frost Product: [wide shot] over [name / price row / detail], all inside one frosted panel. -->
    <div class="info-card-box">
      <!-- The product shot. Empty = the img stays hidden and the slot shows its dashed mark. -->
      <div class="info-card-shot">
        <img id="${designFieldId(o)}" class="info-card-photo" style="display: none" alt="" />
      </div>
${maskLines([
  maskLine('info-card', o, 0, 'info-card-product', '      '),
  `      <!-- The price row: current price, previous price, deal chip — one baseline. -->
      <div class="info-card-price-row">
${maskLines([
  maskLine('info-card', o, 1, 'info-card-price', '        '),
  maskLine('info-card', o, 2, 'info-card-was', '        '),
  maskLine('info-card', o, 3, 'info-card-chip', '        '),
])}
      </div>`,
  maskLine('info-card', o, 4, 'info-card-detail', '      '),
])}
    </div>`,
    css: `/* The panel — the glass family's translucent recipe at card scale. */
.info-card-box {
  width: calc(420px * var(--scale));  /* a stable column width: the shot never resizes per product */
  padding: calc(20px * var(--scale));  /* the shot sits inside the panel, not bled to its edge */
  border-radius: var(--panel-radius);  /* the family's corner treatment */
  background: var(--panel-bg);      /* the translucent white wash */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop blur — this IS the glass */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* one soft lift + the 1px inner edge */
}

/* The product shot — a wide 16:10 crop across the top of the panel. */
.info-card-shot {
  position: relative;               /* the empty-slot mark is placed against this box */
  height: calc(220px * var(--scale));  /* a fixed height keeps the card's shape between products */
  border-radius: calc(12px * var(--scale));  /* softer than the panel, nested inside it */
  overflow: hidden;                 /* the photo is clipped to the rounded rectangle */
}

/* The empty-slot mark: a dashed rectangle shown until an image arrives. setFieldValue()
   puts .has-image on this wrapper the moment the operator picks a file. */
.info-card-shot::after {
  content: '';                      /* a pure decoration, no text */
  position: absolute;               /* over the whole slot */
  inset: 0;                         /* edge to edge */
  border: 1px dashed rgba(255, 255, 255, 0.35);  /* "an image goes here" */
  border-radius: inherit;           /* follow the slot's rounding */
}
.info-card-shot.has-image::after {
  content: none;                    /* a real photo needs no mark */
}

/* The photo itself — fills the crop, never distorted. */
.info-card-photo {
  width: 100%;                      /* fill the slot's width… */
  height: 100%;                     /* …and its height */
  object-fit: cover;                /* crop to fill; never stretch a product shot */
  display: block;                   /* no inline baseline gap under the image */
}

/* The product name — the card's display line, calm rather than loud. */
.info-card-product {
  font-size: calc(34px * var(--scale) * var(--type-scale));  /* card heading size (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;                /* headline leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  margin-top: calc(20px * var(--scale));  /* air between the shot and the name */
  color: var(--text-color);         /* primary text color */
}

/* The price row — the three figures share one baseline and wrap as a unit. */
.info-card-price-row {
  display: flex;                    /* price, was-price and chip in a row */
  flex-wrap: wrap;                  /* a long price + chip wraps instead of overflowing */
  align-items: baseline;            /* all three sit on the same text baseline */
  gap: calc(14px * var(--scale));   /* clear air between three different figures */
  margin-top: calc(10px * var(--scale));  /* name → price: one clear break */
}

/* The current price — the card's single loudest value. */
.info-card-price {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* the number people are here for */
  font-weight: 700;                 /* heavy — it outranks the product name on purpose */
  line-height: 1;                   /* no dead leading around the figure */
  font-variant-numeric: tabular-nums;  /* digits keep one width across updates */
  color: var(--accent);             /* the accent's main moment in this card */
}

/* The previous price — struck through and dimmed: context, not an offer. */
.info-card-was {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* clearly subordinate to the price */
  font-weight: 400;                 /* regular — contrast through weight, not more fonts */
  font-variant-numeric: tabular-nums;  /* equal-width digits beside the price */
  text-decoration: line-through;    /* the broadcast shorthand for "was" */
  text-decoration-thickness: 2px;   /* visible over video at broadcast distance */
  color: var(--text-dim);           /* dimmed — never full white twice */
}

/* The deal chip — a soft outlined badge, the glass family's quieter answer to a solid one.
   Empty field = no chip at all (:empty), so nothing has to be reset or hidden by code. */
.info-card-chip {
  padding: calc(4px * var(--scale)) calc(12px * var(--scale));  /* a compact badge */
  border-radius: calc(999px * var(--scale));  /* a full pill — the glass family's chip shape */
  border: 1px solid var(--accent);  /* outlined, not filled: glass never shouts */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* label scale */
  font-weight: 700;                 /* bold keeps small caps legible over video */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* reads as a badge, whatever the operator types */
  white-space: nowrap;              /* the claim never breaks mid-phrase */
  color: var(--accent);             /* the outline's own colour, not filled ink */
}
.info-card-chip:empty {
  display: none;                    /* nothing claimed = no badge; no JS, nothing to reset */
}

/* The benefit line — the quiet third voice under the price. */
.info-card-detail {
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* body scale under the price row */
  font-weight: 400;                 /* regular weight */
  line-height: 1.4;                 /* body text gets room to breathe */
  margin-top: calc(12px * var(--scale));  /* price row → detail: a real break */
  color: var(--text-dim);           /* dimmed — the third voice in the card */
}`,
    hasAccent: false,
    extraFields: [
      {
        field: designFieldId(o),
        ftype: 'filelist',
        title: 'Product image',
        value: o.logoAssetPath ?? '',
        assetfolder: './images/',
        extension: 'png',
      },
    ],
  }),
);
