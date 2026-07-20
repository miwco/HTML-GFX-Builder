// lt09 "Gradient Pill" — glass style. One compact fully-rounded capsule: translucent
// glass, a subtle accent-tinted inner edge, and the two lines sitting side by side on a
// shared visual baseline (big name + small @handle in the accent color). Creator-stream energy.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt09: TemplateVariant = defineVariant(
  {
    id: 'lt09',
    category: 'lower-third',
    name: 'Gradient Pill',
    styleTag: 'glass',
    description: 'A compact glass pill with name and handle side by side — creator-stream energy.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Luna Park' },
      { title: 'Handle', sample: '@lunamakes' },
    ],
    logo: 'none',
    animationPresets: ['pop-spring', 'blur-in', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('orchid'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Gradient Pill',
    description:
      'A compact fully-rounded capsule in dark translucent glass with a subtle accent-tinted ' +
      'edge. The name and @handle sit side by side on one baseline — made for creators and streams.',
    uicolor: '3',
  },
  (o) => ({
    // Structure: the standard .lower-third-box panel is the pill itself; the masked lines are
    // its flex children, laid out in a row (name first, accent handle beside it).
    html: `    <!-- Gradient Pill: one glass capsule; the masked lines sit side by side inside it. -->
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `/* The pill: one glass capsule. The accent lives in the edge ring and the handle. */
.lower-third-box {
  display: flex;                   /* name and handle sit side by side, not stacked */
  /* The line masks are overflow:hidden boxes, so a real flex baseline never reaches the
     text inside them — bottom-align the masks and nudge the handle's mask up instead. */
  align-items: flex-end;           /* both line masks sit on the same bottom edge */
  flex-wrap: wrap;                 /* extreme lengths drop the handle to a new row, never overflow */
  gap: calc(14px * var(--scale));  /* breathing room between name and handle */
  padding: calc(24px * var(--scale)) calc(44px * var(--scale));  /* generous capsule padding (~0.55em / 1em of the name size) */
  border-radius: var(--panel-radius);  /* the pill's authored panel radius */
  background: var(--panel-bg);     /* the palette's glass tint — retints via the :root contract */
  backdrop-filter: var(--panel-blur);  /* the pill's authored backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  position: relative;              /* anchors the ::after accent ring to the pill */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
}

/* Accent edge: a softened ring drawn by a pseudo-element — the border stays pure
   var(--accent) (so the Style panel retints it) and opacity does the softening. */
.lower-third-box::after {
  content: '';                     /* pseudo-elements need content to render */
  position: absolute;              /* pinned over the pill, out of the flex flow */
  inset: 0;                        /* cover the whole capsule */
  border: calc(2px * var(--scale)) solid var(--accent);  /* the accent-tinted edge */
  border-radius: inherit;          /* follow the pill's full rounding */
  opacity: 0.55;                   /* soften the ring without leaving the accent variable */
  pointer-events: none;            /* purely decorative overlay */
}

/* The handle's mask: with flex-end the two line boxes bottom-align, which leaves the
   handle's baseline slightly below the name's (bigger type carries a deeper descender
   + half-leading). This lift is calibrated so the baselines coincide at 44px/22px. */
.lower-third-mask:nth-child(2) {
  margin-bottom: calc(3px * var(--scale));  /* raises the handle onto the name's baseline */
}

/* Name — the big line. */
.lower-third-name {
  font-size: calc(44px * var(--scale) * var(--type-scale));  /* headline size (2:1 against the handle) */
  font-weight: var(--display-weight);  /* the name's authored display weight */
  line-height: 1.15;               /* tight leading: big text needs less air between rows */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* Handle — the small accent-colored line beside the name. */
.lower-third-title {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* clearly smaller than the name */
  font-weight: 500;                /* medium weight — quiet next to the 800 name */
  line-height: 1.2;                /* a touch more leading at small sizes */
  color: var(--accent);            /* the handle wears the one accent color */
}`,
    hasAccent: false, // the accent moment is the edge ring + handle color, not a separate shape
    tokens: {
      panelBlur: 'blur(16px)',
      panelRadius: '999px',
      displayWeight: '800',
    },
  }),
);
