// lt45 "Glass Chip" — the compact centre-anchored glass design: a small frosted card with an
// accent rule across its top, the name under it and a dimmed role below. It is the glass family's
// smallest footprint — a chip rather than a card — for stage cameras and vertical crops where a
// full-width strap would swallow the shot.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt45: TemplateVariant = defineVariant(
  {
    id: 'lt45',
    category: 'lower-third',
    name: 'Glass Chip',
    styleTag: 'glass',
    description: 'A small centred frosted chip: accent rule, name, dimmed role.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Sofia Lindqvist' },
      { title: 'Title', sample: 'Creative Director' },
    ],
    logo: 'none',
    animationPresets: ['pop-spring', 'blur-in', 'fade', 'line-reveal', 'slide-up'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Glass Chip',
    description:
      'The smallest glass design in the set: a frosted chip centred at the bottom of the frame, ' +
      'opened by a short accent rule. Made for stage and vertical framings where the subject sits ' +
      'centre and there is no room for a full strap. Sibling of lt08 Frosted Card.',
    uicolor: '3',
  },
  (o) => ({
    html: `    <!-- Glass Chip: [accent rule] / [name] / [role] inside one centred frosted chip. -->
    <div class="lower-third-box">
      <div class="lower-third-accent"></div>
${lineMasks(o, '      ')}
    </div>`,
    css: `/* The chip — the family's frosted surface, kept small and centred. */
.lower-third-box {
  display: flex;                   /* the rule and the lines stack as centred items */
  flex-direction: column;          /* one above the other */
  align-items: center;             /* the symmetric composition this design is built on */
  text-align: center;              /* …and wrapped rows centre too */
  padding: calc(18px * var(--scale)) calc(40px * var(--scale)) calc(20px * var(--scale));
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* The accent rule — a short mark opening the chip, with the family's rounded ends. */
.lower-third-accent {
  width: calc(46px * var(--scale));  /* a short centred mark */
  height: var(--accent-weight);    /* the family's accent weight */
  margin-bottom: calc(14px * var(--scale));  /* air between the mark and the name */
  border-radius: var(--accent-weight);  /* rounded ends — glass geometry, never a hard slab */
  background: var(--accent);       /* the one accent surface in the design */
  will-change: transform;          /* hint the browser: presets draw this mark in */
}

/* The name — the line the viewer reads first. */
.lower-third-name {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the glass families run heavier weights */
  line-height: 1.1;                /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* The role — a dimmed supporting line under the name. */
.lower-third-title {
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 500;                /* medium — quiet next to the name */
  line-height: 1.25;               /* a touch of air at small sizes */
  color: var(--text-dim);          /* dimmed — never pure white twice */
  margin-top: calc(4px * var(--scale));  /* name + role read as one unit */
}`,
    hasAccent: true,
  }),
);
