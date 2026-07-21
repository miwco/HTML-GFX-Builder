// lt16 "Frost Handle" — the GLASS social handle, the small sibling of lt08/lt15: a compact
// frosted strip that parks bottom-right for a segment, holding a handle over its platform.
// Sized to persist quietly, not to announce itself. Its accent is a small dot (glass geometry)
// standing before the handle — a real element, so the social-handle graphic type can address it.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt16: TemplateVariant = defineVariant(
  {
    id: 'lt16',
    category: 'lower-third',
    name: 'Frost Handle',
    styleTag: 'glass',
    description: 'A compact frosted social strip: a handle over its platform, led by an accent dot.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Handle', sample: '@lunamakes' },
      { title: 'Platform', sample: 'INSTAGRAM' },
    ],
    logo: 'none',
    animationPresets: ['blur-in', 'pop-spring', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-right',
  },
  {
    name: 'Frost Handle',
    description:
      'A compact glass social strip in the lt08 family: a translucent blurred tile with a ' +
      'small accent dot before the handle and the platform as a soft caps label beneath. ' +
      'Sized to sit bottom-right through a whole segment. Sibling of lt08 Frosted Card.',
    uicolor: '3',
  },
  (o) => ({
    html: `    <!-- Frost Handle: a compact frosted strip — [accent dot] handle over platform. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `/* The accent dot — a small round accent mark (glass draws dots and rings) standing at
   the strip's top-left. A real element, so the graphic type can address it. */
.lower-third-accent {
  position: absolute;              /* pinned inside the positioned root */
  left: calc(20px * var(--scale));    /* sits just inside the panel's left padding */
  top: calc(18px * var(--scale));     /* aligned with the handle's cap height */
  width: calc(10px * var(--scale));   /* a small dot… */
  height: calc(10px * var(--scale));  /* …round */
  border-radius: 50%;              /* the glass dot */
  background: var(--accent);       /* the one accent moment */
  will-change: transform;          /* hint the browser: presets may pop this */
}

/* The panel — a compact frosted tile: this is a persistent mark, not a title card. */
.lower-third-box {
  padding: calc(14px * var(--scale)) calc(24px * var(--scale)) calc(14px * var(--scale)) calc(38px * var(--scale));
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* The handle — the line the viewer is meant to read and remember. */
.lower-third-name {
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* compact — a mark, not a headline */
  font-weight: var(--display-weight);  /* the glass families run heavier weights */
  line-height: 1.1;                /* tight */
  letter-spacing: var(--display-tracking);  /* the handle's authored tracking */
  color: var(--text-color);        /* primary text color */
}

/* The platform — a soft caps label under the handle, in the accent color. */
.lower-third-title,
.lower-third-extra {
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* clearly subordinate */
  font-weight: 600;                /* semibold keeps small caps crisp */
  line-height: 1.3;                /* air if it wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a platform label, not a sentence */
  color: var(--label-color);       /* glass carries the accent in the label */
  margin-top: calc(5px * var(--scale));  /* handle + platform read as one unit */
}`,
    hasAccent: true,
  }),
);
