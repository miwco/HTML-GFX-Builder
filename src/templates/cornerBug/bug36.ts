// bug36 "Quiet Location Chip" — the MINIMAL location/status chip: no panel. The place, a short
// accent rule, then the status — straight on the video, carried by soft text shadows. The chip
// a lecture, church or municipal stream can leave up all day. Sibling of lt01 Hairline.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';

export const bug36: TemplateVariant = defineBugVariant(
  {
    id: 'bug36',
    category: 'corner-bug',
    name: 'Quiet Location Chip',
    styleTag: 'minimal',
    description: 'A panel-free chip: the location, a short accent rule, then the status.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Location', sample: 'City Hall' },
      { title: 'Status', sample: 'COUNCIL SESSION' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'slide-right', 'blur-in', 'slide-up', 'slide-down'],
    // Ivory, not Porcelain: with no panel the text sits straight on the video and has to be
    // the light one of the two minimal palettes.
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Quiet Location Chip',
    description:
      'No panel: the place in the display voice, a short accent rule, then the status as a ' +
      'tiny tracked-caps label — all sitting straight on the video with soft shadows for ' +
      'bright footage. The quietest way to say where the camera is.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Quiet Location Chip: the location, a short accent rule, then the status. -->
    <div class="corner-bug-box">
${bugLineMasks(o)}
    </div>`,

    css: `/* No panel here: both words sit bare over the video on one row. */
.corner-bug-box {
  display: flex;                   /* the two words sit side by side */
  align-items: center;             /* both on one baseline */
  gap: calc(12px * var(--scale));  /* air around the divider rule */
}

/* The location (f0) — the word the viewer reads first. */
.corner-bug-name {
  font-size: calc(17px * var(--scale) * var(--type-scale));   /* compact — a chip, not a strap */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text */
  white-space: nowrap;             /* the chip is one row: neither word wraps */
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);  /* readable over bright footage */
}

/* The divider — a short accent rule between the place and the status. It is drawn on the
   status line's own mask, so the two always travel together however the graphic animates. */
.corner-bug-mask + .corner-bug-mask {
  display: flex;                   /* the rule and the status word share one row */
  align-items: center;             /* the rule sits on the word's optical centre */
}
.corner-bug-mask + .corner-bug-mask::before {
  content: '';                     /* pseudo-elements need content to render */
  width: calc(18px * var(--scale));   /* a short stroke */
  height: var(--accent-weight);       /* the family's hairline weight */
  margin-right: calc(12px * var(--scale));  /* air between the rule and the status */
  background: var(--accent);          /* the one accent colour */
  flex: none;                         /* never squeezed by the word beside it */
}

/* The status (f1) — a tiny tracked-caps label, quiet over bright footage. */
.corner-bug-title,
.corner-bug-extra {
  font-size: calc(12px * var(--scale) * var(--type-scale));   /* small label size */
  font-weight: 600;                /* semibold keeps small caps crisp */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* minimal keeps its labels dim */
  white-space: nowrap;             /* the chip is one row: neither word wraps */
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);  /* readable over bright footage */
}`,

    hasAccent: false, // the accent moment is the divider rule, drawn on the second line's mask
  }),
);
