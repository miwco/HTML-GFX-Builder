// lt17 "Volt Handle" — the SPORT social handle, small sibling of lt05/lt06: a compact solid
// strip with a chunky accent slab fused to its left edge, the handle in heavy condensed caps
// over its platform. Parks bottom-right for a segment. The accent slab is a real element, so
// the social-handle graphic type can address it.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt17: TemplateVariant = defineVariant(
  {
    id: 'lt17',
    category: 'lower-third',
    name: 'Volt Handle',
    styleTag: 'sport',
    description: 'A compact sport strip with an accent edge — a handle in heavy caps over its platform.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Handle', sample: '@TEAMVOLTA' },
      { title: 'Platform', sample: 'TIKTOK' },
    ],
    logo: 'none',
    animationPresets: ['slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-right',
  },
  {
    name: 'Volt Handle',
    description:
      'A compact sport social strip in the lt05/lt06 family: a solid dark strip with a chunky ' +
      'accent slab fused to its left edge, the handle in heavy condensed caps over a dimmed ' +
      'platform label. Sized to sit bottom-right through a segment. Sibling of lt06 Split Bar.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Volt Handle: [accent slab] | [solid strip: handle in caps over platform]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `/* The accent slab — a chunky bar fused to the strip's left edge (sport geometry).
   A real element, so the graphic type can address it; presets slide it with the strip. */
.lower-third-accent {
  position: absolute;              /* pinned inside the positioned root */
  left: 0;                         /* flush with the strip's left edge */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the sport family's chunky accent weight (10px) */
  background: var(--accent);       /* the one loud color moment */
  will-change: transform;          /* hint the browser: presets move this with the strip */
}

/* The strip — a solid dark bar, zero radius: a hard sport mark that persists on screen. */
.lower-third-box {
  margin-left: var(--accent-weight);  /* starts where the accent slab ends */
  padding: calc(12px * var(--scale)) calc(24px * var(--scale)) calc(12px * var(--scale)) calc(20px * var(--scale));
  background: var(--panel-bg);     /* the solid slab behind the text */
}

/* The handle — heavy condensed caps, the line the viewer reads. */
.lower-third-name {
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* compact — a mark, not a headline */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.05;               /* tight — big caps need little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* sport shouts */
  color: var(--text-color);        /* primary text color */
}

/* The platform — a dimmed caps label under the handle. */
.lower-third-title,
.lower-third-extra {
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* clearly subordinate */
  font-weight: 600;                /* semibold keeps the small caps crisp */
  line-height: 1.3;                /* air if it wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a platform label, not a sentence */
  color: var(--text-dim);          /* dimmed — the accent slab is the one color dose */
  margin-top: calc(4px * var(--scale));  /* handle + platform read as one unit */
}`,
    hasAccent: true,
  }),
);
