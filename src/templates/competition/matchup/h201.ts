// h201 "Head to Head" — the sport comparison board. The two sides at the top with their
// crests, then one row per stat: each side's figure on its own side of the frame, and between
// them a pair of bars showing the SHARE of the pair each side holds. The leading figure in a
// row takes the accent, and the operator can lift one side entirely with the highlight event.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  H2H_FIELDS,
  H2H_RUNTIME_JS,
  P,
  defineMatchupVariant,
  h2hMarkup,
  h2hStructureCss,
} from './shared';

export const h201: TemplateVariant = defineMatchupVariant(
  {
    id: 'h201',
    category: 'matchup',
    name: 'Head to Head',
    styleTag: 'sport',
    description: 'Stat-by-stat comparison with share bars that grow from the operator figures.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Side A', sample: 'TEAM LIQUID' },
      { title: 'Side B', sample: 'NAVI' },
      { title: 'Title', sample: 'HEAD TO HEAD' },
    ],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Head to Head',
    description:
      'The sport comparison board: crests and names at the top, then a row per stat with each ' +
      'side’s figure and a pair of share bars measured from the numbers the operator typed.',
    uicolor: '5',
  },
  (o) => ({
    html: h2hMarkup(o),
    fields: compFieldsFor(H2H_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: H2H_RUNTIME_JS,
    css: `${h2hStructureCss()}

/* The stage — a dark wash so the figures read over any backdrop. */
.${P}-box {
  justify-content: flex-start;     /* the board starts high and grows downward */
  padding: 9% 6%;
  background: radial-gradient(120% 90% at 50% 30%,
    rgba(10, 12, 16, 0.88) 0%,
    rgba(6, 7, 10, 0.96) 65%,
    rgba(4, 5, 7, 0.99) 100%);
}

/* The accent — a rule under the title, drawn across the head. */
.${P}-accent {
  height: calc(3px * var(--scale));
  background: var(--accent);
  transform-origin: center;
}

/* The title over the two sides. */
.${P}-event {
  font-family: var(--font-label);
  font-size: calc(26px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* The side names. */
.${P}-name {
  font-size: calc(40px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.05;
  letter-spacing: var(--display-tracking);
  text-transform: uppercase;
  color: var(--text-color);
}

/* The crest slot — a dim plate until a file lands in it. */
.${P}-logo {
  background: rgba(255, 255, 255, 0.05);
}
.${P}-logo.has-image {
  background: transparent;
}

/* One row's figures. */
.${P}-row-value {
  font-size: calc(34px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1;
  color: var(--text-dim);
}

/* The leading figure of a row takes the accent — read at a glance, no legend needed. */
.${P}-row-lead {
  color: var(--accent);
}

/* The stat's label, between the two figures. */
.${P}-row-label {
  font-family: var(--font-label);
  font-size: calc(15px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* The share bars: two tracks meeting in the middle. */
.${P}-row-track {
  background: rgba(255, 255, 255, 0.08);
}
.${P}-row-fill {
  background: var(--accent);
}
.${P}-row-track-b .${P}-row-fill {
  background: rgba(255, 255, 255, 0.55);  /* side B reads in white against the accent */
}

/* ── The highlight (applied by the machine's state, never by a data update). ── */

.${P}-lead-a .${P}-head-side[data-side="B"],
.${P}-lead-b .${P}-head-side[data-side="A"] {
  opacity: 0.42;                   /* the side that is not being talked about falls back */
}

.${P}-lead-a .${P}-row-a,
.${P}-lead-b .${P}-row-b {
  color: var(--accent);            /* the highlighted side's whole column lifts */
}`,
  }),
);
