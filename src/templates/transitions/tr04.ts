// tr04 "Frost Sweep" — the GLASS transition, sibling of lt08 "Frosted Card" / card03 "Frosted
// Panel". Four frosted columns rise over the frame one after another until it is covered, with
// the label resolving in the middle. The soft transition, for a programme whose cuts should
// feel like a dissolve rather than a hit.
//
// A GLASS PANEL DOES NOT COVER ANYTHING, which is the one real design problem here: the
// family's whole recipe is translucency, and a translucent transition would show the cut
// straight through itself. So these columns keep the family's blur and keyline but sit on an
// OPAQUE base — the glass reading is carried by the backdrop blur and the edge highlights, not
// by letting the picture through. That is the honest way to have this family in this category.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTransitionVariant } from './shared';

/** Four columns read as a sweep without any one of them being wide enough to look like a slab. */
const COLUMNS = 4;

export const tr04: TemplateVariant = defineTransitionVariant(
  {
    id: 'tr04',
    category: 'transition',
    name: 'Frost Sweep',
    styleTag: 'glass',
    description: 'Frosted columns rise over the frame one after another, then lift away upward.',
    maxLines: 1,
    suggestedLines: [{ title: 'Label', sample: 'Coming up' }],
    logo: 'none',
    animationPresets: ['transition-sweep', 'transition-wipe', 'transition-slam'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Sweep',
    description:
      'A soft full-frame sweep: four frosted columns rise over the frame one after another until ' +
      'it is covered, the label resolves in the middle, then the whole thing lifts away upward. ' +
      'The columns sit on an opaque base on purpose — a see-through transition would show the ' +
      'cut it exists to hide. It clears itself after about a second; Continue clears it early.',
    uicolor: '5',
  },
  () => ({
    html: `    <div class="transition-box">
${Array.from(
  { length: COLUMNS },
  (_, i) => `      <div class="transition-panel transition-panel-${i + 1}"></div>`,
).join('\n')}
      <!-- The label, centred over the cover. -->
      <div class="transition-mark">
        <!-- Label (f0) — SPX writes this field's value straight into the element. -->
        <div class="transition-mask"><span id="f0" class="transition-label">Coming up</span></div>
      </div>
    </div>`,

    css: `/* The columns — each a quarter of the frame, over-height so the sweep leaves no band of
   picture at the top or bottom. Opaque base + the family's blur and keyline: see this file's
   header for why a translucent transition would defeat itself.
   MEASURED IN PERCENT OF THE STAGE, not in scaled pixels, and that is load-bearing: a
   transition's whole job is to leave no picture showing, and a size knob below 1 would shrink
   scaled-px columns away from the frame edges and expose the cut they exist to hide. */
.transition-panel {
  top: -4%;                            /* over-height at the top… */
  height: 108%;                        /* …and the bottom */
  width: 26%;                          /* a quarter of the frame, plus an overlap */
  background: #0d1117;                 /* the opaque base the frost sits on — it must cover */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment, kept */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-keyline);    /* the family's 1px inner edge, on every column */
}

/* The frosted wash — the family's translucent white, laid ON the opaque base rather than
   instead of it. This is what keeps the columns reading as glass while still covering. */
.transition-panel::after {
  content: '';                         /* a pure decoration, no text */
  position: absolute;                  /* over the whole column */
  inset: 0;                            /* edge to edge */
  background: var(--panel-bg);         /* the translucent white wash */
}

/* Each column's own quarter of the frame — the 1 % overlaps are what stop a hairline of
   picture surviving between two neighbours. */
.transition-panel-1 { left: -1%; }
.transition-panel-2 { left: 24.5%; }
.transition-panel-3 { left: 50%; }
.transition-panel-4 { left: 75.5%; }

/* The label — set large and calm, the glass family's voice at scale. */
.transition-label {
  font-size: calc(76px * var(--scale) * var(--type-scale));  /* the sweep's one voice (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.08;                   /* large type sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);            /* primary text color */
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.45);  /* one soft lift off the frosted columns */
}
.transition-label:empty {
  display: none;                       /* a wordless sweep is a legitimate choice */
}`,
  }),
);
