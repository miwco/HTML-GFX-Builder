// card48 "House Sponsors" — the NoaCG sponsor strip, sibling of lt11 "House Strap" and
// bug02 "House Clock". Where a sponsor BUG carries one mark in a corner for a whole segment,
// a sponsor STRIP carries the whole partner row at once: a mono "presented by" label, then
// four logo slots on the void panel, divided by thin keylines.
//
// NO ROTATION, AND THAT IS A DECISION. A strip that cycled through sponsors on a timer would
// be a different graphic with a different contract (the ticker type is the one that cycles,
// and it earns it: a real state machine, a timer arming at the end of a finite entry timeline,
// and a pause/resume the operator can reach). Faking rotation here — a CSS keyframe loop
// swapping opacity between slots — would be motion the timeline cannot see, the control page
// cannot pause and the operator cannot trust, so this design simply shows every partner at
// once, which is what a "presented by" bar does on air anyway.
//
// UNUSED SLOTS SHOW A RESERVED MARK rather than collapsing. A slot only learns it is empty
// when update() runs (setFieldValue toggles .has-image on its wrapper), so collapsing would
// mean the strip renders empty in the wizard preview and in every still. A faint dashed
// reserve is the honest state: the space is booked, nobody has been dropped into it yet.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { designFieldId, maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

/** How many partner slots the strip carries. Four reads across a full-width bar without
 *  any one mark becoming too small to recognise at broadcast distance. */
const SLOTS = 4;

export const card48: TemplateVariant = defineCardVariant(
  {
    id: 'card48',
    category: 'info-card',
    name: 'House Sponsors',
    styleTag: 'noacg',
    description: 'A sponsor strip: a "presented by" label and four partner logo slots on one bar.',
    maxLines: 1,
    suggestedLines: [{ title: 'Label', sample: 'PRESENTED BY' }],
    logo: 'none',
    animationPresets: ['slide-up', 'fade', 'line-reveal', 'mask-wipe', 'slide-down', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-center',
  },
  {
    name: 'House Sponsors',
    description:
      'The NoaCG sponsor strip: an 8px amber bar fused to a void blur panel, a mono "presented ' +
      'by" label, and four partner logo slots divided by keylines. Every partner is on screen ' +
      'at once — this design does not rotate (the ticker type is the one that cycles, with a ' +
      'real machine behind it). A slot with no image shows a faint reserved mark.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- House Sponsors: [amber bar] | [void panel: label | four partner slots]. -->
    <div class="info-card-accent"></div>
    <div class="info-card-box">
${maskLines([maskLine('info-card', o, 0, 'info-card-sponsor-label', '      ')])}
      <!-- The partner row. Each slot holds one image field; empty = a reserved mark. -->
      <div class="info-card-slots">
${Array.from(
  { length: SLOTS },
  (_, i) => `        <div class="info-card-slot">
          <img id="${designFieldId(o, i)}" class="info-card-slot-image" style="display: none" alt="" />
        </div>`,
).join('\n')}
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

/* The panel — the house void, laid out as [label] | [partner row]. */
.info-card-box {
  display: flex;                    /* the label and the row sit side by side */
  align-items: center;              /* the label centres against the logos */
  gap: calc(28px * var(--scale));   /* the seam between the label and the first partner */
  margin-left: var(--accent-weight);  /* starts where the accent bar ends */
  padding: calc(16px * var(--scale)) calc(32px * var(--scale)) calc(16px * var(--scale)) calc(24px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* one deep lifting shadow */
}

/* The label — the house mono caps line. It wraps to two short rows rather than pushing
   the partner row off the panel. */
.info-card-sponsor-label {
  max-width: calc(180px * var(--scale));  /* two short caps rows at most */
  font-family: var(--font-label);   /* the house label face */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* label scale — a caption, not a headline */
  font-weight: 700;                 /* bold keeps small caps legible over video */
  line-height: 1.25;                /* wrapped label rows stay readable */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* reads as a label, whatever the operator types */
  color: var(--label-color);        /* the family's label colour */
}

/* The partner row — equal slots, divided by keylines. */
.info-card-slots {
  display: flex;                    /* one slot per partner, in a row */
  align-items: center;              /* all marks share a vertical centre line */
}

/* One partner slot. Equal widths so no mark dominates by accident, and a keyline between
   neighbours — the panel's one internal rule. */
.info-card-slot {
  position: relative;               /* the reserved mark is placed against this box */
  width: calc(150px * var(--scale));   /* the slot's booked width */
  height: calc(62px * var(--scale));   /* …and its height */
  padding: 0 calc(18px * var(--scale));  /* air so two neighbouring marks never touch */
}
.info-card-slot + .info-card-slot {
  border-left: 1px solid rgba(255, 255, 255, 0.12);  /* a keyline between partners */
}

/* The reserved mark: a faint dashed box shown until an image arrives. setFieldValue()
   puts .has-image on this wrapper the moment the operator picks a file. */
.info-card-slot::after {
  content: '';                      /* a pure decoration, no text */
  position: absolute;               /* inside the slot's padding */
  inset: calc(6px * var(--scale)) calc(18px * var(--scale));  /* the space a logo will occupy */
  border: 1px dashed rgba(255, 255, 255, 0.22);  /* faint: booked, not filled */
  border-radius: calc(4px * var(--scale));  /* a soft reserve, not a hard frame */
}
.info-card-slot.has-image::after {
  content: none;                    /* a real partner mark needs no reserve */
}

/* The mark itself — the WHOLE logo, never cropped: a wordmark cut in half is worse than
   a small one, and sponsors are contractual. */
.info-card-slot-image {
  width: 100%;                      /* fill the slot's inner width… */
  height: 100%;                     /* …and its height */
  object-fit: contain;              /* the whole mark, undistorted — never 'cover' here */
  display: block;                   /* no inline baseline gap under the image */
}`,
    hasAccent: true,
    // Four real SPX image fields — one per partner, numbered after the label line.
    extraFields: Array.from({ length: SLOTS }, (_, i) => ({
      field: designFieldId(o, i),
      ftype: 'filelist' as const,
      title: `Sponsor ${i + 1}`,
      value: i === 0 ? (o.logoAssetPath ?? '') : '',
      assetfolder: './images/',
      extension: 'png',
    })),
  }),
);
