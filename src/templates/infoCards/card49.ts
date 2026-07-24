// card49 "Clean Partners" — the MINIMAL sponsor panel, sibling of lt01 "Hairline" /
// card42 "Clean Listing". The full-attention version of the sponsor strip: a quiet keyline
// panel with a tracked-caps heading over a two-by-three grid of partner slots — the "our
// partners" card a conference, ceremony or telethon holds on screen between segments, rather
// than the thin bar card48 runs under live action.
//
// Like card48 "House Sponsors", it does NOT rotate and unused slots show a faint reserved
// mark rather than collapsing. That file's header carries the reasoning for both.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { designFieldId, maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

/** Six slots in a 3 × 2 grid — the shape a partners board takes when it is the whole graphic. */
const SLOTS = 6;

export const card49: TemplateVariant = defineCardVariant(
  {
    id: 'card49',
    category: 'info-card',
    name: 'Clean Partners',
    styleTag: 'minimal',
    description: 'A partners board: a quiet heading over a grid of six sponsor logo slots.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Heading', sample: 'With thanks to our partners' },
      { title: 'Detail', sample: 'Supporting the festival since 2014' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'line-reveal', 'slide-up', 'mask-wipe', 'blur-in', 'slide-down'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Clean Partners',
    description:
      'A quiet keyline panel topped by an accent hairline: a heading and a supporting line over ' +
      'a three-by-two grid of partner logo slots. Every partner is on screen at once — this ' +
      'design does not rotate. A slot with no image shows a faint reserved mark; clear the ' +
      'Detail field to drop that line.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Clean Partners: [accent hairline panel: heading / detail / 3 × 2 partner grid]. -->
    <div class="info-card-box">
${maskLines([
  maskLine('info-card', o, 0, 'info-card-partners-head', '      '),
  maskLine('info-card', o, 1, 'info-card-detail', '      '),
])}
      <!-- The partner grid. Each slot holds one image field; empty = a reserved mark. -->
      <div class="info-card-slots">
${Array.from(
  { length: SLOTS },
  (_, i) => `        <div class="info-card-slot">
          <img id="${designFieldId(o, i)}" class="info-card-slot-image" style="display: none" alt="" />
        </div>`,
).join('\n')}
      </div>
    </div>`,
    css: `/* The panel — the quiet keyline card, capped by one accent hairline. */
.info-card-box {
  padding: calc(30px * var(--scale)) calc(38px * var(--scale)) calc(32px * var(--scale));  /* generous inner air */
  background: var(--panel-bg);      /* the panel color (retints via the :root contract) */
  border: 1px solid rgba(255, 255, 255, 0.14);  /* hairline keyline lifts the panel off video */
  border-top: var(--accent-weight) solid var(--accent);  /* the family's accent weight, on top */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  text-align: center;               /* a partners board is a centred, formal object */
}

/* The heading — the panel's one display line, set quietly. */
.info-card-partners-head {
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* card heading size (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.2;                 /* headline leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The supporting line — dimmed, and gone entirely when cleared (:empty). */
.info-card-detail {
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* body scale under the heading */
  font-weight: 400;                 /* regular weight */
  line-height: 1.4;                 /* body text gets room to breathe */
  margin-top: calc(8px * var(--scale));  /* heading → detail: one clear break */
  color: var(--text-dim);           /* dimmed — never full white twice */
}
.info-card-detail:empty {
  display: none;                    /* nothing to add = no row; no JS, nothing to reset */
}

/* The partner grid — three across, two down, with even gutters. */
.info-card-slots {
  display: grid;                    /* a real grid: rows stay aligned however tall a mark is */
  grid-template-columns: repeat(3, calc(180px * var(--scale)));  /* three equal columns */
  gap: calc(10px * var(--scale)) calc(14px * var(--scale));  /* the gutters between marks */
  margin-top: calc(24px * var(--scale));  /* air between the words and the marks */
}

/* One partner slot — equal cells so no mark dominates by accident. */
.info-card-slot {
  position: relative;               /* the reserved mark is placed against this cell */
  height: calc(76px * var(--scale));  /* the cell's booked height */
  padding: calc(10px * var(--scale));  /* air so two neighbouring marks never touch */
}

/* The reserved mark: a faint dashed box shown until an image arrives. setFieldValue()
   puts .has-image on this wrapper the moment the operator picks a file. */
.info-card-slot::after {
  content: '';                      /* a pure decoration, no text */
  position: absolute;               /* inside the cell's padding */
  inset: calc(4px * var(--scale));  /* the space a logo will occupy */
  border: 1px dashed rgba(255, 255, 255, 0.2);  /* faint: booked, not filled */
  border-radius: calc(3px * var(--scale));  /* minimal corners: 0-3px */
}
.info-card-slot.has-image::after {
  content: none;                    /* a real partner mark needs no reserve */
}

/* The mark itself — the WHOLE logo, never cropped: a wordmark cut in half is worse than
   a small one, and sponsors are contractual. */
.info-card-slot-image {
  width: 100%;                      /* fill the cell's inner width… */
  height: 100%;                     /* …and its height */
  object-fit: contain;              /* the whole mark, undistorted — never 'cover' here */
  display: block;                   /* no inline baseline gap under the image */
}`,
    hasAccent: false,
    // Six real SPX image fields — one per partner, numbered after the two text lines.
    extraFields: Array.from({ length: SLOTS }, (_, i) => ({
      field: designFieldId(o, i),
      ftype: 'filelist' as const,
      title: `Partner ${i + 1}`,
      value: i === 0 ? (o.logoAssetPath ?? '') : '',
      assetfolder: './images/',
      extension: 'png',
    })),
  }),
);
