// tr01 "Volt Stinger" — the SPORT transition, sibling of lt05 "Angle Slab" / vs01. Three
// leaning slabs slam across the frame — near-black, accent, near-black — until nothing of the
// picture is left, with the programme mark snapping on over them. The classic esports /
// match-coverage sting.
//
// The slabs are over-tall and over-wide on purpose: at an -8° lean a band exactly the height of
// the frame would leave a triangle of picture showing at each corner, and a transition that
// leaves a gap is a transition that exposes the cut it exists to hide.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTransitionVariant } from './shared';

export const tr01: TemplateVariant = defineTransitionVariant(
  {
    id: 'tr01',
    category: 'transition',
    name: 'Volt Stinger',
    styleTag: 'sport',
    description: 'A full-frame sting: leaning slabs slam across, the mark snaps on, then it clears.',
    maxLines: 1,
    suggestedLines: [{ title: 'Label', sample: 'MATCHDAY' }],
    logo: 'none',
    animationPresets: ['transition-slam', 'transition-wipe', 'transition-sweep'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Volt Stinger',
    description:
      'A sport sting that covers the whole frame so a cut can happen underneath: three leaning ' +
      'slabs slam across — dark, accent, dark — and the programme mark snaps on over them, then ' +
      'the whole thing carries on out. It clears itself after about a second (the transition ' +
      'type\'s timer), and Continue clears it early.',
    uicolor: '1',
  },
  () => ({
    html: `    <div class="transition-box">
      <!-- The covering slabs. Authored AT cover, over-sized so the lean leaves no corner gap. -->
      <div class="transition-panel transition-panel-1"></div>
      <div class="transition-panel transition-panel-2"></div>
      <div class="transition-panel transition-panel-3"></div>
      <!-- The programme mark, centred over the cover. -->
      <div class="transition-mark">
        <!-- Label (f0) — SPX writes this field's value straight into the element. -->
        <div class="transition-mask"><span id="f0" class="transition-label">MATCHDAY</span></div>
      </div>
    </div>`,

    css: `/* The slabs — three leaning bands that together cover the frame with room to spare.
   MEASURED IN PERCENT OF THE STAGE, not in scaled pixels, and that is load-bearing: a
   transition's whole job is to leave no picture showing, and a size knob below 1 would shrink
   scaled-px bands away from the frame edges and expose the cut they exist to hide. Percentages
   follow the stage, which is always the full canvas. */
.transition-panel {
  left: -6%;                          /* over-width at the left… */
  width: 112%;                        /* …and the right, so the lean leaves no corner gap */
  transform: skewX(-8deg);            /* the sport family's lean */
}

/* Slab 1 — the leading dark band, covering the top of the frame. */
.transition-panel-1 {
  top: -8%;                           /* over the top edge */
  height: 44%;
  background: var(--panel-bg);        /* the near-black slab */
}

/* Slab 2 — the accent band through the middle: the sting's one loud surface. */
.transition-panel-2 {
  top: 36%;                           /* overlapping slab 1, so no seam of picture survives */
  height: 28%;
  background: var(--accent);          /* the one accent surface */
}

/* Slab 3 — the trailing dark band, covering the bottom. */
.transition-panel-3 {
  top: 64%;                           /* overlapping slab 2 */
  height: 44%;                        /* …and running past the bottom edge */
  background: var(--panel-bg);        /* the near-black slab */
}

/* The mark — huge condensed caps over the cover, in the accent's ink so it reads on the
   accent band as well as on the dark ones. */
.transition-label {
  font-size: calc(96px * var(--scale) * var(--type-scale));  /* the sting's one voice (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight — heavy condensed */
  line-height: 1;                     /* huge condensed caps sit very tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;          /* the sport register is always caps */
  color: var(--accent-ink);           /* readable ink where the accent band sits behind it */
  text-shadow: 0 6px 30px rgba(0, 0, 0, 0.45);  /* lift it off the accent band */
}
.transition-label:empty {
  display: none;                      /* a mark-less sting is a legitimate choice */
}`,
  }),
);
