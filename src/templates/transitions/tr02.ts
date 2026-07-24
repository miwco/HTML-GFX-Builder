// tr02 "Clean Wipe" — the MINIMAL transition, sibling of lt01 "Hairline" / card07 "Clean
// Title". One solid band travels straight across the frame, carrying a thin accent edge on its
// leading side and a quiet label in the middle. The quietest way to hide a cut: no lean, no
// bounce, one direction of travel.
//
// The leading edge is what makes a plain band read as deliberate rather than as a dropped
// frame — it is the only ornament in the design and it does the whole job.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTransitionVariant } from './shared';

export const tr02: TemplateVariant = defineTransitionVariant(
  {
    id: 'tr02',
    category: 'transition',
    name: 'Clean Wipe',
    styleTag: 'minimal',
    description: 'A single band wipes across the frame behind a thin accent edge, then wipes on off.',
    maxLines: 1,
    suggestedLines: [{ title: 'Label', sample: 'Next' }],
    logo: 'none',
    animationPresets: ['transition-wipe', 'transition-sweep', 'transition-slam'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Clean Wipe',
    description:
      'A quiet full-frame wipe: one solid band travels across the frame behind a thin accent ' +
      'leading edge, holds it covered so a cut can happen underneath, then carries on off the ' +
      'far side. It clears itself after about a second (the transition type\'s timer), and ' +
      'Continue clears it early. Leave the Label blank for a wipe with no words at all.',
    uicolor: '2',
  },
  () => ({
    html: `    <div class="transition-box">
      <!-- The covering band, authored AT cover. Its leading edge is drawn on ::after. -->
      <div class="transition-panel"></div>
      <!-- The label, centred over the cover. -->
      <div class="transition-mark">
        <!-- Label (f0) — SPX writes this field's value straight into the element. -->
        <div class="transition-mask"><span id="f0" class="transition-label">Next</span></div>
      </div>
    </div>`,

    css: `/* The band — a full-frame solid, over-wide so no edge of picture survives at either
   side while it is covering. */
.transition-panel {
  inset: 0;                           /* covers the whole stage */
  left: calc(-40px * var(--scale));   /* a little over-width on the leading side… */
  right: calc(-40px * var(--scale));  /* …and the trailing one */
  background: var(--panel-bg);        /* the quiet solid this family covers with */
}

/* The leading edge — a thin accent rule on the band's right side, which is the edge that
   arrives first as the band travels rightward into cover. */
.transition-panel::after {
  content: '';                        /* a pure decoration, no text */
  position: absolute;                 /* pinned to the band's leading side */
  top: 0;                             /* full height, top… */
  bottom: 0;                          /* …to bottom */
  right: 0;                           /* the leading edge */
  width: var(--accent-weight);        /* the family's rule weight */
  background: var(--accent);          /* the one accent surface */
}

/* The label — set large and light, the way this family says anything at scale. */
.transition-label {
  font-size: calc(72px * var(--scale) * var(--type-scale));  /* the wipe's one voice (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.08;                  /* large type sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);           /* primary text color */
}
.transition-label:empty {
  display: none;                      /* a wordless wipe is a legitimate choice */
}`,
  }),
);
