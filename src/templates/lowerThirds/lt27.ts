// lt27 "Column Rule" — the right-anchored editorial strap: a 2 px column rule down the right of
// the block with the name and role ragged-left against it, the way a magazine sets a sidebar.
// It is lt25 Masthead turned on its side and mirrored, and it exists for the same reason lt21
// does: a right-anchored graphic needs its accent on the outside edge, or the accent ends up
// hidden behind the subject the strap is introducing.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt27: TemplateVariant = defineVariant(
  {
    id: 'lt27',
    category: 'lower-third',
    name: 'Column Rule',
    styleTag: 'editorial',
    description: 'Right-anchored editorial sidebar: a column rule with the type ragged-left.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Role', sample: 'Chief Correspondent' },
    ],
    logo: 'none',
    animationPresets: ['slide-left', 'fade', 'line-reveal', 'mask-wipe', 'slide-up'],
    defaultPalette: paletteById('vermilion'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-right',
  },
  {
    name: 'Column Rule',
    description:
      'The editorial voice for the right of the frame: a column rule down the right edge, the ' +
      'name ragged-left against it, and the role as a tracked caps line. Pairs with lt25 Masthead ' +
      'on the opposite side for a two-guest interview. Sibling of lt25 Masthead.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Column Rule: [name / tracked role, ragged-left] | [column rule on the right]. -->
    <div class="lower-third-box">
${lineMasks(o)}
    </div>
    <div class="lower-third-accent"></div>`,
    css: `/* The column rule — the block's right edge, running its full height. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  right: 0;                         /* sits at the block's RIGHT edge */
  top: 0;                           /* the full height of the type… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's printed-rule weight */
  background: var(--accent);        /* the one accent surface in the design */
  will-change: transform;           /* hint the browser: presets animate this rule */
}

/* The text block — no panel; the rule and the ragged-left setting are the structure. */
.lower-third-box {
  text-align: right;                /* lines are ragged-LEFT: they align to the column rule */
  padding-right: calc(26px * var(--scale));  /* room for the rule plus a printed-margin gap */
}

/* The name — editorial weight: set, not shouted. */
.lower-third-name {
  font-size: calc(52px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The role — the tracked caps line, in the accent colour. */
.lower-third-title {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* small — the tracking gives it presence */
  font-weight: 600;                 /* small caps need weight to stay crisp */
  line-height: 1.3;                 /* a single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* whatever the operator types reads as a kicker */
  color: var(--label-color);        /* the family's label colour (the accent) */
  margin-top: calc(12px * var(--scale));  /* clear air below the name */
}`,
    hasAccent: true,
  }),
);
