// card43 "House Lot" — the NoaCG listing card, sibling of lt11 "House Strap" / card38
// "House Product". The house grammar (an amber bar fused to a void blur panel) shaped for the
// auction register: the lot photo on the left, the lot title and its description beside it,
// and the live value block held apart on the right behind a keyline.
//
// Same five-field listing contract as card42 Clean Listing, because the shape belongs to the
// type and only the skin belongs to the family: title · meta · value label · value · status.
// An auction says "Current bid"; a property walk-through says "Guide price"; a stock counter
// says "Remaining". None of those is a different graphic — they are the same graphic with a
// different label typed into it.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { designFieldId, maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card43: TemplateVariant = defineCardVariant(
  {
    id: 'card43',
    category: 'info-card',
    name: 'House Lot',
    styleTag: 'noacg',
    description: 'An auction/listing card: the lot photo and title beside a live labelled value.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Title', sample: 'Lot 24 — Blue Period Study' },
      { title: 'Meta', sample: 'Oil on canvas · 1961 · 92 × 65 cm' },
      { title: 'Value label', sample: 'Current bid' },
      { title: 'Value', sample: '€18,500' },
      { title: 'Status', sample: 'Bidding open' },
    ],
    logo: 'none',
    animationPresets: ['slide-up', 'line-reveal', 'mask-wipe', 'fade', 'slide-down', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'House Lot',
    description:
      'The NoaCG listing card: an 8px amber bar fused to a void blur panel, the lot photo and ' +
      'its title on the left, and a value block behind a keyline on the right — a mono caps ' +
      'label ("Current bid", "Guide price", "Remaining") over one large accent figure. The ' +
      'status line under the title disappears when cleared.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- House Lot: [amber bar] | [void panel: photo | title / meta / status | value block]. -->
    <div class="info-card-accent"></div>
    <div class="info-card-box">
      <!-- The lot photo. Empty = the img stays hidden and the slot shows its dashed mark. -->
      <div class="info-card-shot">
        <img id="${designFieldId(o)}" class="info-card-photo" style="display: none" alt="" />
      </div>
      <div class="info-card-body">
${maskLines([
  maskLine('info-card', o, 0, 'info-card-listing-title', '        '),
  maskLine('info-card', o, 1, 'info-card-meta', '        '),
  maskLine('info-card', o, 4, 'info-card-status', '        '),
])}
      </div>
${
      // The value block carries a visible keyline, so it is only emitted when it has
      // something in it — a listing used with fewer lines must not leave a rule floating.
      o.lines[2] || o.lines[3]
        ? `      <!-- The value block: its mono label sits above the figure, both right-aligned. -->
      <div class="info-card-value-block">
${maskLines([
  maskLine('info-card', o, 2, 'info-card-value-label', '        '),
  maskLine('info-card', o, 3, 'info-card-value', '        '),
])}
      </div>`
        : ''
    }
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

/* The panel — the house void, laid out as [photo] | [copy] | [value]. */
.info-card-box {
  display: flex;                    /* the three blocks sit in one row */
  align-items: center;              /* they centre against each other */
  gap: calc(26px * var(--scale));   /* the seams between them */
  margin-left: var(--accent-weight);  /* starts where the accent bar ends */
  padding: calc(22px * var(--scale)) calc(34px * var(--scale)) calc(22px * var(--scale)) calc(24px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* one deep lifting shadow */
}

/* The lot photo — a fixed square so the copy column never shifts between lots. */
.info-card-shot {
  position: relative;               /* the empty-slot mark is placed against this box */
  flex: none;                       /* never squeezed by a long lot title */
  width: calc(120px * var(--scale));   /* photo width */
  height: calc(120px * var(--scale));  /* …and height — a square crop */
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
  object-fit: cover;                /* crop to fill; never stretch a lot photo */
  display: block;                   /* no inline baseline gap under the image */
}

/* The copy column — title, description, status. */
.info-card-body {
  min-width: 0;                     /* let a long title wrap instead of widening the panel */
  flex: 1 1 auto;                   /* takes the room the photo and the value block leave */
}

/* The lot title — the card's confident display line. */
.info-card-listing-title {
  font-size: calc(34px * var(--scale) * var(--type-scale));  /* card heading size (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.12;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);         /* primary text color */
}

/* The description — the facts about the lot, dimmed. */
.info-card-meta {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* body scale under the title */
  font-weight: 400;                 /* regular weight */
  line-height: 1.35;                /* body text gets room to breathe */
  margin-top: calc(8px * var(--scale));  /* title → meta: one clear break */
  color: var(--text-dim);           /* dimmed — never full white twice */
}

/* The status line — led by a small amber dot. Empty field = no line at all (:empty). */
.info-card-status {
  display: inline-flex;             /* the dot and the text share one baseline row */
  align-items: center;              /* dot centred against the text */
  gap: calc(8px * var(--scale));    /* a thin seam between the dot and the words */
  font-family: var(--font-label);   /* the house label face */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* label scale */
  font-weight: 700;                 /* bold — a status is a signal */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* reads as a status, whatever the operator types */
  margin-top: calc(10px * var(--scale));  /* meta → status: a small break */
  color: var(--accent);             /* the accent's second, small appearance */
}
.info-card-status::before {
  content: '';                      /* the dot — decoration, so it never becomes text */
  width: calc(9px * var(--scale));  /* a small round marker… */
  height: calc(9px * var(--scale));  /* …a true circle */
  border-radius: 50%;               /* round it */
  background: currentColor;         /* follows the status colour */
  box-shadow: var(--accent-glow);   /* the house glow, at dot scale */
}
.info-card-status:empty {
  display: none;                    /* nothing to announce = no row; no JS, nothing to reset */
}

/* The value block — held apart on the right behind a keyline, never squeezed. */
.info-card-value-block {
  flex: none;                       /* the figure keeps its room whatever the title does */
  padding-left: calc(26px * var(--scale));  /* air on the keyline's inner side */
  border-left: 1px solid rgba(255, 255, 255, 0.12);  /* the panel's one internal rule */
  text-align: right;                /* label and figure hang from the right edge */
}

/* The value label — what the figure means: current bid, guide price, remaining. */
.info-card-value-label {
  font-family: var(--font-label);   /* the house label face */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* label scale — a caption, not a headline */
  font-weight: 700;                 /* bold keeps small caps legible over video */
  line-height: 1.2;                 /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* reads as a label, whatever the operator types */
  color: var(--text-dim);           /* dimmed — the figure below carries the weight */
}

/* The figure — live money, in the accent: the number a bidder is watching. */
.info-card-value {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* the block's one large voice */
  font-weight: 700;                 /* heavy — the loudest number on the card */
  line-height: 1.05;                /* no dead leading around the figure */
  letter-spacing: -0.01em;          /* large glyphs tighten */
  font-variant-numeric: tabular-nums;  /* digits keep one width as the bid climbs */
  margin-top: calc(4px * var(--scale));  /* label and figure read as one unit */
  color: var(--accent);             /* the accent's main moment in this card */
}`,
    hasAccent: true,
    extraFields: [
      {
        field: designFieldId(o),
        ftype: 'filelist',
        title: 'Photo',
        value: o.logoAssetPath ?? '',
        assetfolder: './images/',
        extension: 'png',
      },
    ],
  }),
);
