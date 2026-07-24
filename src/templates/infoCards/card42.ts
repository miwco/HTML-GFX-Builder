// card42 "Clean Listing" — the MINIMAL listing card, sibling of lt01 "Hairline" / lt03
// "Side Tag" / ig05 "Rising Total". A quiet keyline panel holding one listed thing: a photo,
// its title, the specification line under it, and a value block (a small caps label over one
// large figure) held apart on the right.
//
// A listing is the shape behind three formats the reference data asks for and the catalog had
// no graphic for — a property walk-through, an auction lot, a resource/inventory item. They
// differ only in what the value LABEL says ("Guide price", "Current bid", "Remaining"), which
// is exactly why the label is a field and not a design decision.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { designFieldId, maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card42: TemplateVariant = defineCardVariant(
  {
    id: 'card42',
    category: 'info-card',
    name: 'Clean Listing',
    styleTag: 'minimal',
    description: 'A listing card: a photo and title beside a labelled value — property, lot, or resource.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Title', sample: '14 Meadow Lane, Hillside' },
      { title: 'Meta', sample: '3 bed · 118 m² · garden · garage' },
      { title: 'Value label', sample: 'Guide price' },
      { title: 'Value', sample: '£415,000' },
      { title: 'Status', sample: 'Viewing today' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'blur-in'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Clean Listing',
    description:
      'A quiet keyline panel topped by a thin accent rule: a photo, the listing title and its ' +
      'specification line on the left, and a value block on the right — a small caps label ' +
      '("Guide price", "Current bid", "Remaining") over one large figure. A status line under ' +
      'the title disappears when cleared.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Clean Listing: [photo] | [title / meta / status] | [value label over value]. -->
    <div class="info-card-box">
      <!-- The listing photo. Empty = the img stays hidden and the slot shows its dashed mark. -->
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
      // The value block carries a visible divider, so it is only emitted when it has
      // something in it — a listing used with fewer lines must not leave a rule floating
      // beside an empty column.
      o.lines[2] || o.lines[3]
        ? `      <!-- The value block: its label sits above the figure, both right-aligned. -->
      <div class="info-card-value-block">
${maskLines([
  maskLine('info-card', o, 2, 'info-card-value-label', '        '),
  maskLine('info-card', o, 3, 'info-card-value', '        '),
])}
      </div>`
        : ''
    }
    </div>`,
    css: `/* The panel — the quiet keyline card of lt03 "Side Tag", capped by one accent hairline. */
.info-card-box {
  display: flex;                    /* photo | copy | value, in one row */
  align-items: center;              /* the three blocks centre against each other */
  gap: calc(26px * var(--scale));   /* the seams between them */
  padding: calc(22px * var(--scale)) calc(30px * var(--scale));  /* generous inner air */
  background: var(--panel-bg);      /* the panel color (retints via the :root contract) */
  border: 1px solid rgba(255, 255, 255, 0.14);  /* hairline keyline lifts the panel off video */
  border-top: var(--accent-weight) solid var(--accent);  /* the family's accent weight, on top */
  border-radius: var(--panel-radius);  /* the family's panel radius */
}

/* The photo — a fixed 4:3 crop so the copy column never shifts between listings. */
.info-card-shot {
  position: relative;               /* the empty-slot mark is placed against this box */
  flex: none;                       /* never squeezed by a long listing title */
  width: calc(148px * var(--scale));   /* photo width */
  height: calc(111px * var(--scale));  /* …and height — a 4:3 crop */
  border-radius: calc(3px * var(--scale));  /* minimal corners: 0-3px, never a pill */
  overflow: hidden;                 /* the photo is clipped to the rectangle */
}

/* The empty-slot mark: a dashed rectangle shown until an image arrives. setFieldValue()
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

/* The photo itself — fills the crop, never distorted. */
.info-card-photo {
  width: 100%;                      /* fill the slot's width… */
  height: 100%;                     /* …and its height */
  object-fit: cover;                /* crop to fill; never stretch a listing photo */
  display: block;                   /* no inline baseline gap under the image */
}

/* The copy column — title, specification line, status. */
.info-card-body {
  min-width: 0;                     /* let a long title wrap instead of widening the panel */
  flex: 1 1 auto;                   /* takes the room the photo and the value block leave */
}

/* The listing title — the card's display line. */
.info-card-listing-title {
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* card heading size (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;                /* headline leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The specification line — the facts, dimmed. */
.info-card-meta {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* body scale under the title */
  font-weight: 400;                 /* regular weight */
  line-height: 1.35;                /* body text gets room to breathe */
  margin-top: calc(8px * var(--scale));  /* title → meta: one clear break */
  color: var(--text-dim);           /* dimmed — never full white twice */
}

/* The status line — led by a small accent dot. Empty field = no line at all (:empty),
   so a listing with nothing to announce simply leaves the row out. */
.info-card-status {
  display: inline-flex;             /* the dot and the text share one baseline row */
  align-items: center;              /* dot centred against the text */
  gap: calc(8px * var(--scale));    /* a thin seam between the dot and the words */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* label scale */
  font-weight: 700;                 /* bold — a status is a signal */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* reads as a status, whatever the operator types */
  margin-top: calc(10px * var(--scale));  /* meta → status: a small break */
  color: var(--accent);             /* the accent's second, small appearance */
}
.info-card-status::before {
  content: '';                      /* the dot — decoration, so it never becomes text */
  width: calc(8px * var(--scale));  /* a small round marker… */
  height: calc(8px * var(--scale));  /* …a true circle */
  border-radius: 50%;               /* round it */
  background: currentColor;         /* follows the status colour */
}
.info-card-status:empty {
  display: none;                    /* nothing to announce = no row; no JS, nothing to reset */
}

/* The value block — held apart on the right, right-aligned, never squeezed. */
.info-card-value-block {
  flex: none;                       /* the figure keeps its room whatever the title does */
  padding-left: calc(26px * var(--scale));  /* air on the divider's inner side */
  border-left: 1px solid rgba(255, 255, 255, 0.14);  /* a hairline divider — the family's one rule */
  text-align: right;                /* label and figure hang from the right edge */
}

/* The value label — what the figure means: guide price, current bid, remaining. */
.info-card-value-label {
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* label scale — a caption, not a headline */
  font-weight: 700;                 /* bold keeps small caps legible over video */
  line-height: 1.2;                 /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* reads as a label, whatever the operator types */
  color: var(--text-dim);           /* dimmed — the figure below carries the weight */
}

/* The figure — the value a viewer is here for. */
.info-card-value {
  font-size: calc(44px * var(--scale) * var(--type-scale));  /* the block's one large voice */
  font-weight: 700;                 /* heavy — the loudest number on the card */
  line-height: 1.05;                /* no dead leading around the figure */
  letter-spacing: -0.01em;          /* large glyphs tighten */
  font-variant-numeric: tabular-nums;  /* digits keep one width across updates */
  margin-top: calc(4px * var(--scale));  /* label and figure read as one unit */
  color: var(--text-color);         /* primary text color */
}`,
    hasAccent: false,
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
