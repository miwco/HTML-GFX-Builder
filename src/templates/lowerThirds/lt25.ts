// lt25 "Masthead" — the EDITORIAL family's flagship, and the design every other editorial variant
// is judged against. Its grammar is the printed page: a rule across the top of the block, the name
// set underneath at reading weight rather than shouting weight, and the role as a wide-tracked
// small-caps line in the accent colour. No panel — the rule is the structure.
//
// Editorial next to minimal: minimal REMOVES until only type is left; editorial ORGANISES, and a
// rule plus a kicker is organisation, not decoration.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt25: TemplateVariant = defineVariant(
  {
    id: 'lt25',
    category: 'lower-third',
    name: 'Masthead',
    styleTag: 'editorial',
    description: 'A rule across the top, the name beneath it, the role as a tracked caps line.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Role', sample: 'Chief Correspondent' },
    ],
    logo: 'none',
    // The rule draws first — line-reveal is the family's entrance.
    animationPresets: ['line-reveal', 'fade', 'mask-wipe', 'slide-up', 'slide-down'],
    defaultPalette: paletteById('vermilion'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Masthead',
    description:
      'The editorial flagship: a 2 px rule across the top of the block, a name set at reading ' +
      'weight, and a role line in wide-tracked caps in the accent colour. Panel-free, so it ' +
      'belongs over calm footage — a studio two-shot, a desk interview, a stage wide.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Masthead: [rule across the top] over [name / tracked role]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `/* The masthead rule — spans the block's full width, which is the name's own width
   (the root shrink-wraps its content, so nothing has to be measured). */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  top: 0;                           /* the topmost element of the composition */
  left: 0;                          /* from the block's left edge… */
  right: 0;                         /* …to its right edge */
  height: var(--accent-weight);     /* the family's printed-rule weight */
  background: var(--accent);        /* the one accent surface in the design */
  will-change: transform;           /* hint the browser: presets draw this rule in */
}

/* The text block — no panel at all: the rule and the whitespace are the structure. */
.lower-third-box {
  padding-top: calc(20px * var(--scale));  /* clears the rule above the name */
}

/* The name — editorial weight: set, not shouted. */
.lower-third-name {
  font-size: calc(54px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight (600 — lighter than broadcast) */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The role — the masthead kicker: wide-tracked caps in the accent colour. */
.lower-third-title {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* small — the tracking gives it presence */
  font-weight: 600;                 /* small caps need weight to stay crisp */
  line-height: 1.3;                 /* a single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking — a masthead kicker breathes */
  text-transform: uppercase;        /* whatever the operator types reads as a kicker */
  color: var(--label-color);        /* the family's label colour (the accent) */
  margin-top: calc(12px * var(--scale));  /* clear air below the name — this line is its own beat */
}`,
    hasAccent: true,
  }),
);
