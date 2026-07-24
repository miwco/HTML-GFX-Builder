// tr03 "House Replay" — the NoaCG replay transition, sibling of lt11 "House Strap" / lt12
// "House Breaking". The void covers the frame in two bands that meet at the middle, an amber
// keyline runs along the seam, and a REPLAY chip sits on it. The bumper a sports or gaming
// programme runs into and out of a replay.
//
// The two bands are one panel class, so the presets stagger them for free: the slam sends them
// across one after the other, and the sweep lifts them the same way. Nothing about the design
// assumes which preset is on.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTransitionVariant } from './shared';

export const tr03: TemplateVariant = defineTransitionVariant(
  {
    id: 'tr03',
    category: 'transition',
    name: 'House Replay',
    styleTag: 'noacg',
    description: 'A replay bumper: two void bands close over the frame with an amber seam and a chip.',
    maxLines: 1,
    suggestedLines: [{ title: 'Label', sample: 'REPLAY' }],
    logo: 'none',
    animationPresets: ['transition-sweep', 'transition-slam', 'transition-wipe'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Replay',
    description:
      'The NoaCG replay bumper: two void bands cover the frame from above and below, an amber ' +
      'keyline runs along the seam where they meet, and the label sits on it as a solid chip. ' +
      'It clears itself after about a second (the transition type\'s timer), and Continue ' +
      'clears it early. Retype the label for "HIGHLIGHT", "SLOW MOTION" or anything else.',
    uicolor: '4',
  },
  () => ({
    html: `    <div class="transition-box">
      <!-- The two covering bands, authored AT cover: they meet on the frame's centre line. -->
      <div class="transition-panel transition-panel-top"></div>
      <div class="transition-panel transition-panel-bottom"></div>
      <!-- The seam — the amber keyline where the two bands meet. -->
      <div class="transition-seam"></div>
      <!-- The chip, centred on the seam. -->
      <div class="transition-mark">
        <!-- Label (f0) — SPX writes this field's value straight into the element. -->
        <div class="transition-mask"><span id="f0" class="transition-label">REPLAY</span></div>
      </div>
    </div>`,

    css: `/* The bands — each covers half the frame plus a little, so the join is a drawn seam
   rather than a hairline of surviving picture.
   MEASURED IN PERCENT OF THE STAGE, not in scaled pixels, and that is load-bearing: a
   transition's whole job is to leave no picture showing, and a size knob below 1 would shrink
   scaled-px bands away from the frame edges and expose the cut they exist to hide. */
.transition-panel {
  left: 0;                            /* full width, left… */
  right: 0;                           /* …to right */
  height: 50.4%;                      /* half the frame plus an overlap onto the seam */
  background: var(--panel-bg);        /* the house void */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
}
.transition-panel-top {
  top: 0;                             /* from the top edge down past the centre line */
}
.transition-panel-bottom {
  top: 49.6%;                         /* from just above the centre line to the bottom */
}

/* The seam — the house amber keyline along the join, with its one restrained glow. */
.transition-seam {
  position: absolute;                 /* placed against the stage */
  left: 0;                            /* full width, left… */
  right: 0;                           /* …to right */
  top: 49.6%;                         /* on the join between the two bands */
  height: var(--accent-weight);       /* the family's bar weight */
  background: var(--accent);          /* the one accent surface */
  box-shadow: var(--accent-glow);     /* the family's glow — follows the accent color */
}

/* The label — a solid amber chip sitting on the seam, in the accent's ink. */
.transition-label {
  padding: calc(12px * var(--scale)) calc(30px * var(--scale));  /* a confident chip */
  border-radius: var(--panel-radius);  /* the family's corner treatment */
  background: var(--accent);          /* solid accent — the loudest small surface */
  font-family: var(--font-label);     /* the house label face */
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* the bumper's one voice */
  font-weight: 700;                   /* heavy — read at a glance under a cut */
  line-height: 1.1;                   /* compact inside the chip */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;          /* reads as a bumper, whatever the operator types */
  color: var(--accent-ink);           /* readable ink ON the accent surface */
  box-shadow: var(--accent-glow);     /* the house glow, at chip scale */
}
.transition-label:empty {
  display: none;                      /* a chip-less bumper is a legitimate choice */
}`,
  }),
);
