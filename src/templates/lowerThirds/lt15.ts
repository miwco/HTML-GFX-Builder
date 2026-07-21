// lt15 "Frost Strap" — a GLASS lower third with a real accent element, so the lower-third
// graphic type (which requires a .lower-third-accent node and exactly two lines) has a glass
// design to ship. The catalog's other glass lower thirds cannot fill that cell: lt08 and lt09
// carry their accent in a keyline or an edge ring, with no accent NODE for a timeline to
// address, and lt08/lt10 run to three lines. This one keeps lt08's frosted card but leads it
// with a soft accent edge and holds to two lines — name over a dimmed title.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt15: TemplateVariant = defineVariant(
  {
    id: 'lt15',
    category: 'lower-third',
    name: 'Frost Strap',
    styleTag: 'glass',
    description: 'A frosted glass strap led by a soft accent edge — name over a dimmed title.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Sofia Lindqvist' },
      { title: 'Title', sample: 'Creative Director' },
    ],
    logo: 'none',
    // Glass resolves out of blur and pops softly; line-reveal stays available to draw the edge.
    animationPresets: ['blur-in', 'pop-spring', 'line-reveal', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Frost Strap',
    description:
      'The glass lower third with a real accent edge: lt08\'s frosted card, translucent and ' +
      'heavily blurred with a hairline keyline, led by a soft accent-tinted edge that fades ' +
      'down its left side. The name sits over a dimmed title. Sibling of lt08 Frosted Card.',
    uicolor: '3',
  },
  (o) => ({
    html: `    <!-- Frost Strap: [soft accent edge] | [frosted card with the two lines]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `/* The accent edge — a soft accent-tinted bar fading down the panel's left side.
   A real element (the graphic type addresses it), fading to nothing in the glass way. */
.lower-third-accent {
  position: absolute;              /* pinned inside the positioned root */
  left: 0;                         /* at the panel's leading edge */
  top: calc(18px * var(--scale));  /* inset so the edge clears the panel's 16px rounding… */
  bottom: calc(18px * var(--scale));  /* …top and bottom */
  width: var(--accent-weight);     /* the glass family's accent weight (4px) */
  border-radius: var(--accent-weight);  /* rounded ends — a soft edge, not a hard slab */
  background: linear-gradient(to bottom,
              var(--accent) 0%,
              color-mix(in srgb, var(--accent) 20%, transparent) 100%);  /* fades down — glass gradient edge */
  will-change: transform;          /* hint the browser: line-reveal can grow this */
}

/* The panel — lt08's frosted card: translucent, heavily blurred, hairline keyline, soft lift.
   Starts flush with the accent edge, which fuses to its left side like the house strap's bar. */
.lower-third-box {
  margin-left: var(--accent-weight);  /* the panel begins where the accent edge ends — fused */
  padding: calc(20px * var(--scale)) calc(40px * var(--scale)) calc(20px * var(--scale)) calc(28px * var(--scale));
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* Name — the line the viewer reads first. */
.lower-third-name {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* headline size (2:1 over the title) */
  font-weight: var(--display-weight);  /* the glass families run heavier weights */
  line-height: 1.1;                /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* Title — a dimmed supporting line under the name. */
.lower-third-title,
.lower-third-extra {
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* clearly subordinate to the name */
  font-weight: 500;                /* medium — quiet next to the name */
  line-height: 1.25;               /* a touch of air at small sizes */
  color: var(--text-dim);          /* dimmed — never pure white twice */
  margin-top: calc(6px * var(--scale));  /* name + title read as one unit */
}`,
    hasAccent: true,
  }),
);
