// lt33 "Wide Caps" — the cinematic NAME-ONLY strap: one line of very widely tracked caps, centred
// under a hairline, on a scrim that fades out to both sides. It is the title-card treatment used
// for a subject who needs no explanation, and the most compact design in the cinematic family.
//
// It is the one design in the pack that uses `filter: drop-shadow()` on the box for separation
// (DESIGN_LANGUAGE §3: a text-shadow inside a line's overflow-hidden mask would be clipped).
// Because the Blur in preset ANIMATES `filter` on the same element, that preset is deliberately
// not offered here — it would replace the drop-shadow and leave the type flat when it settles.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt33: TemplateVariant = defineVariant(
  {
    id: 'lt33',
    category: 'lower-third',
    name: 'Wide Caps',
    styleTag: 'cinematic',
    description: 'One name in wide tracked caps, centred under a hairline on a soft scrim.',
    maxLines: 1,
    suggestedLines: [{ title: 'Name', sample: 'Alexandra Riva' }],
    logo: 'none',
    // No 'blur-in': it animates the box's `filter`, which this design uses for its drop-shadow.
    animationPresets: ['fade', 'line-reveal', 'slide-up', 'mask-wipe', 'slide-down'],
    defaultPalette: paletteById('noir'),
    defaultFontId: 'bebas-neue',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Wide Caps',
    description:
      'The cinematic name card: a single line of widely tracked caps under a hairline, centred, ' +
      'on a scrim that fades away to both sides. For openings, chapter marks and any moment where ' +
      'one name is the whole point. Sibling of lt32 Scrim.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Wide Caps: [hairline] over [one name in tracked caps], centred on a two-sided scrim. -->
    <div class="lower-third-box">
      <div class="lower-third-accent"></div>
${lineMasks(o, '      ')}
    </div>`,
    css: `/* The scrim — symmetric here, because the composition is: it darkens under the name and
   is gone at both edges. The drop-shadow filter below gives the type its separation where
   the scrim is thinnest;
   see the file header for why the Blur in preset is withheld from this design. */
.lower-third-box {
  display: flex;                    /* the hairline and the name stack as centred items */
  flex-direction: column;           /* one above the other */
  align-items: center;              /* the symmetric composition this design is built on */
  padding: calc(44px * var(--scale)) calc(120px * var(--scale)) calc(46px * var(--scale));
  background: radial-gradient(ellipse 60% 90% at 50% 50%,
              var(--panel-bg) 0%,
              color-mix(in srgb, var(--panel-bg) 60%, transparent) 55%,
              transparent 100%);   /* darkest under the name, gone in every direction */
  filter: drop-shadow(0 calc(2px * var(--scale)) calc(14px * var(--scale)) rgba(0, 0, 0, 0.5));
}

/* The hairline — the only drawn element, centred above the name. */
.lower-third-accent {
  width: calc(72px * var(--scale));  /* a short centred mark */
  height: var(--accent-weight);     /* the family's 1px hairline */
  margin-bottom: calc(18px * var(--scale));  /* air between the mark and the name */
  background: var(--accent);        /* bone by default — cinema colour, not signal colour */
  will-change: transform;           /* hint the browser: presets draw this mark in */
}

/* The name — the widest setting in the pack. Caps and heavy tracking are what make one
   short line fill a frame without being enlarged past reading comfort. */
.lower-third-name {
  font-size: calc(52px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                 /* tracked caps sit tight vertically */
  letter-spacing: 0.22em;           /* far past the family default: this line IS the design */
  text-transform: uppercase;        /* the title-card voice */
  margin-right: -0.22em;            /* letter-spacing also trails the LAST glyph; without this
                                       the line's box is one space too wide and the caps sit
                                       visibly left of centre */
  color: var(--text-color);         /* primary text color */
}`,
    hasAccent: true,
  }),
);
