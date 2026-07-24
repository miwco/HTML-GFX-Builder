// card38 "House Product" — the NoaCG product card, sibling of lt11 "House Strap" and card06
// "House Topic". The house grammar (an amber bar fused to a void blur panel) turned into the
// live-commerce lockup every shopping stream needs: a square product shot on the left, the
// product name over a price row on the right, and one quiet benefit line under it.
//
// The price row is the whole point of the design, so its three values are three SEPARATE
// fields with three looks — the current price large and in the accent, the previous price
// struck through and dimmed beside it, and an optional savings chip that DISAPPEARS when the
// operator clears it (`:empty`, pure CSS — no state, no JS, nothing to reset on replay).

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { designFieldId, maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card38: TemplateVariant = defineCardVariant(
  {
    id: 'card38',
    category: 'info-card',
    name: 'House Product',
    styleTag: 'noacg',
    description: 'A live-shopping product card: photo, name, price beside the old price, and a benefit line.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Product', sample: 'Aurora Studio Headphones' },
      { title: 'Price', sample: '€149' },
      { title: 'Was', sample: '€229' },
      { title: 'Saving', sample: 'SAVE 35%' },
      { title: 'Detail', sample: 'Free next-day delivery · 2-year warranty' },
    ],
    logo: 'none',
    animationPresets: ['slide-up', 'line-reveal', 'pop-spring', 'mask-wipe', 'fade', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'House Product',
    description:
      'The NoaCG product card: an 8px amber bar fused to a void blur panel, a square product ' +
      'shot beside the name, a large accent price with the previous price struck through next ' +
      'to it, an optional savings chip, and one dimmed benefit line. Clear the Saving field to ' +
      'hide the chip; clear Was to drop the strike-through price.',
    uicolor: '4',
  },
  (o) => ({
    // House structure: [amber bar] | [void panel: photo | name / price row / detail].
    html: `    <!-- House Product: [amber bar] | [void panel: product shot beside name, price row, detail]. -->
    <div class="info-card-accent"></div>
    <div class="info-card-box">
      <!-- The product shot. Empty = the img stays hidden and the slot shows its dashed mark. -->
      <div class="info-card-shot">
        <img id="${designFieldId(o)}" class="info-card-photo" style="display: none" alt="" />
      </div>
      <div class="info-card-body">
${maskLines([
  maskLine('info-card', o, 0, 'info-card-product', '        '),
  `        <!-- The price row: current price, previous price, savings chip — one baseline. -->
        <div class="info-card-price-row">
${maskLines([
  maskLine('info-card', o, 1, 'info-card-price', '          '),
  maskLine('info-card', o, 2, 'info-card-was', '          '),
  maskLine('info-card', o, 3, 'info-card-chip', '          '),
])}
        </div>`,
  maskLine('info-card', o, 4, 'info-card-detail', '        '),
])}
      </div>
    </div>`,
    css: `/* The accent bar — the house 8px amber edge with its one restrained glow. */
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

/* The panel — the house void, laid out as [shot] | [text column]. */
.info-card-box {
  display: flex;                    /* photo and copy sit side by side */
  align-items: center;              /* the shot centres against the text block */
  gap: calc(28px * var(--scale));   /* the seam between the shot and the copy */
  margin-left: var(--accent-weight);  /* starts where the accent bar ends */
  padding: calc(26px * var(--scale)) calc(40px * var(--scale)) calc(26px * var(--scale)) calc(26px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* one deep lifting shadow */
}

/* The product shot — a fixed square so the copy column never shifts between products. */
.info-card-shot {
  position: relative;               /* the empty-slot mark is placed against this box */
  flex: none;                       /* never squeezed by a long product name */
  width: calc(132px * var(--scale));   /* product shot width */
  height: calc(132px * var(--scale));  /* …and height — a square crop */
  border-radius: var(--panel-radius);  /* the family's corner treatment */
  overflow: hidden;                 /* the photo is clipped to the rounded square */
}

/* The empty-slot mark: a dashed square shown until an image arrives. setFieldValue()
   puts .has-image on this wrapper the moment the operator picks a file. */
.info-card-shot::after {
  content: '';                      /* a pure decoration, no text */
  position: absolute;               /* over the whole slot */
  inset: 0;                         /* edge to edge */
  border: 1px dashed rgba(255, 255, 255, 0.28);  /* "an image goes here" */
  border-radius: inherit;           /* follow the slot's rounding */
}
.info-card-shot.has-image::after {
  content: none;                    /* a real photo needs no mark */
}

/* The photo itself — fills the square, cropped rather than distorted. */
.info-card-photo {
  width: 100%;                      /* fill the slot's width… */
  height: 100%;                     /* …and its height */
  object-fit: cover;                /* crop to fill; never stretch a product shot */
  display: block;                   /* no inline baseline gap under the image */
}

/* The copy column — name, price row, benefit line stacked. */
.info-card-body {
  min-width: 0;                     /* let long names wrap instead of widening the panel */
}

/* The product name — the confident display line. */
.info-card-product {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* card heading size (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.12;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);         /* primary text color */
}

/* The price row — the three price values share one baseline and wrap as a unit. */
.info-card-price-row {
  display: flex;                    /* price, was-price and chip in a row */
  flex-wrap: wrap;                  /* a long price + chip wraps instead of overflowing */
  align-items: baseline;            /* all three sit on the same text baseline */
  gap: calc(16px * var(--scale));   /* clear air between three different figures */
  margin-top: calc(12px * var(--scale));  /* name → price: one clear break */
}

/* The current price — the graphic's single loudest value. */
.info-card-price {
  font-size: calc(52px * var(--scale) * var(--type-scale));  /* the number people are here for */
  font-weight: 700;                 /* heavy — it outranks the product name on purpose */
  line-height: 1;                   /* no dead leading around the figure */
  letter-spacing: -0.01em;          /* very large glyphs tighten */
  font-variant-numeric: tabular-nums;  /* digits keep one width across updates */
  color: var(--accent);             /* the accent's main moment in this card */
}

/* The previous price — struck through and dimmed: context, not an offer. */
.info-card-was {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* clearly subordinate to the price */
  font-weight: 400;                 /* regular — contrast through weight, not more fonts */
  font-variant-numeric: tabular-nums;  /* equal-width digits beside the price */
  text-decoration: line-through;    /* the broadcast shorthand for "was" */
  text-decoration-thickness: 2px;   /* visible over video at broadcast distance */
  color: var(--text-dim);           /* dimmed — never full white twice */
}

/* The savings chip — a small solid badge. Empty field = no chip at all (:empty),
   so an operator who has nothing to claim simply leaves it blank. */
.info-card-chip {
  padding: calc(5px * var(--scale)) calc(12px * var(--scale));  /* a compact badge */
  border-radius: calc(4px * var(--scale));  /* a chip, not a pill */
  background: var(--accent);        /* solid accent — the loudest small surface */
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* label scale */
  font-weight: 700;                 /* bold keeps small caps legible over video */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* reads as a badge, whatever the operator types */
  white-space: nowrap;              /* "SAVE 35%" never breaks mid-claim */
  color: var(--accent-ink);         /* readable ink ON the accent surface */
}
.info-card-chip:empty {
  display: none;                    /* nothing claimed = no badge; no JS, nothing to reset */
}

/* The benefit line — quiet on purpose: the reason to buy, not the offer. */
.info-card-detail {
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* body scale under the price row */
  font-weight: 400;                 /* regular weight */
  line-height: 1.35;                /* body text gets room to breathe */
  margin-top: calc(14px * var(--scale));  /* price row → detail: a real break */
  color: var(--text-dim);           /* dimmed — the third voice in the card */
}`,
    hasAccent: true,
    // The product shot is the design's own image field: it is a photo of the thing being
    // sold, not a logo, so it is declared here rather than through the shared logo slot.
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
