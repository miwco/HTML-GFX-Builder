// lt40 "Chevron" — the sport strap whose accent is a CHEVRON rather than a bar: a clip-path arrow
// pointing into the name, with the slab's leading edge cut to match. The lean is drawn with
// clip-path on the accent element itself, so it survives every preset — including the snap
// stinger, which skews the box and would flatten a transform-based angle.
//
// Sibling of lt05 Angle Slab: same forward-leaning energy, built from a cut instead of a skew.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt40: TemplateVariant = defineVariant(
  {
    id: 'lt40',
    category: 'lower-third',
    name: 'Chevron',
    styleTag: 'sport',
    description: 'A clip-path chevron driving into a hard slab — name over a caps stat line.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'JAKE MORRISON' },
      { title: 'Stat line', sample: '24 PTS · 11 AST' },
    ],
    logo: 'none',
    animationPresets: ['snap-stinger', 'mask-wipe', 'slide-right', 'pop-spring', 'fade'],
    defaultPalette: paletteById('inferno'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Chevron',
    description:
      'A chevron of accent colour driving into a dark slab, with the name above a caps stat or ' +
      'team line. The angle is cut with clip-path rather than skewed, so it holds its shape ' +
      'through every entrance. Sibling of lt05 Angle Slab.',
    uicolor: '7',
  },
  (o) => ({
    html: `    <!-- Chevron: [accent chevron] | [name / stat line] — one hard-edged slab. -->
    <div class="lower-third-box">
      <div class="lower-third-accent"></div>
      <div class="lower-third-text">
${lineMasks(o, '        ')}
      </div>
    </div>`,
    css: `/* The slab — chevron and text fused, zero radius, one hard offset shadow. */
.lower-third-box {
  display: flex;                   /* chevron and text sit side by side */
  align-items: stretch;            /* the chevron runs the slab's full height */
  background: var(--panel-bg);     /* dark panel behind the text stack */
  box-shadow: var(--panel-shadow);  /* the family's hard offset lift */
}

/* The chevron — an arrow cut out of a solid accent block. clip-path (not a transform) is
   what lets the angle survive the snap stinger, which skews the box around it. */
.lower-third-accent {
  flex: none;                      /* fixed width; long text never squeezes it */
  width: calc(46px * var(--scale));  /* wide enough for the cut to read at broadcast size */
  background: var(--accent);       /* the accent used boldly, sport-style */
  clip-path: polygon(0 0, 62% 0, 100% 50%, 62% 100%, 0 100%);  /* the arrow driving right */
  will-change: transform;          /* hint the browser: presets animate this element */
}

/* The text stack, set clear of the chevron's point. */
.lower-third-text {
  display: flex;                   /* stack the lines vertically */
  flex-direction: column;          /* top to bottom */
  justify-content: center;         /* centred against the chevron */
  min-width: 0;                    /* lets a long unbroken name wrap instead of overflowing */
  padding: calc(16px * var(--scale)) calc(40px * var(--scale)) calc(18px * var(--scale)) calc(24px * var(--scale));
}

/* Name — condensed heavy caps; size does the shouting. */
.lower-third-name {
  font-size: calc(50px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.04;               /* big display text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* the matchday voice */
  color: var(--text-color);        /* primary text */
}

/* Stat line — the support voice: smaller caps, tracked, full-strength ink. */
.lower-third-title {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.2;                /* a touch more air than the headline */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* matches the headline's voice */
  color: var(--label-color);       /* the family's label colour */
  margin-top: calc(6px * var(--scale));  /* name + stat read as one unit */
}`,
    hasAccent: true,
  }),
);
