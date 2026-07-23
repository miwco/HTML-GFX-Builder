// h203 "Clean Compare" — the minimal comparison board, sibling of lt01 Hairline and card01
// Hairline Card. Hairline-separated rows, figures in the text colour, and the leading side of
// each row simply set in the accent. Nothing is boxed: the board is a table of type, which is
// what an analyst segment actually wants behind a talking head.

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

export const h203: TemplateVariant = defineMatchupVariant(
  {
    id: 'h203',
    category: 'matchup',
    name: 'Clean Compare',
    styleTag: 'minimal',
    description: 'A quiet comparison table: hairline rows, accent on whichever side leads.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Side A', sample: 'TEAM LIQUID' },
      { title: 'Side B', sample: 'NAVI' },
      { title: 'Title', sample: 'HEAD TO HEAD' },
    ],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Clean Compare',
    description:
      'The quiet comparison board: no panels, hairline-separated stat rows, thin share bars, ' +
      'and the leading figure of each row set in the accent colour.',
    uicolor: '7',
  },
  (o) => ({
    html: h2hMarkup(o),
    fields: compFieldsFor(H2H_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: H2H_RUNTIME_JS,
    css: `${h2hStructureCss()}

/* The stage — a soft scrim, just enough to hold white type over video. */
.${P}-box {
  justify-content: flex-start;
  padding: 10% 7%;
  background: linear-gradient(180deg,
    rgba(6, 8, 12, 0.52) 0%,
    rgba(6, 8, 12, 0.76) 100%);
}

/* The accent — a hairline under the title. */
.${P}-accent {
  height: var(--accent-weight);
  background: var(--accent);
  transform-origin: center;
}

/* The title. */
.${P}-event {
  font-family: var(--font-label);
  font-size: calc(19px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* The side names. */
.${P}-name {
  font-size: calc(34px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.06;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The crest slot — plateless; an empty one shows nothing at all. */
.${P}-logo {
  width: calc(72px * var(--scale));
  height: calc(72px * var(--scale));
}

/* Each row is separated by a hairline rather than boxed. */
.${P}-row {
  padding-bottom: calc(10px * var(--scale));
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}

/* The figures. */
.${P}-row-value {
  font-size: calc(28px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1;
  color: var(--text-color);
}

.${P}-row-lead {
  color: var(--accent);
}

/* The stat label. */
.${P}-row-label {
  font-size: calc(13px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* The share bars — thin, and only as loud as the accent needs to be. */
.${P}-row-track {
  height: calc(3px * var(--scale));
  background: rgba(255, 255, 255, 0.12);
}
.${P}-row-fill {
  background: var(--accent);
}
.${P}-row-track-b .${P}-row-fill {
  background: rgba(255, 255, 255, 0.5);
}

/* ── The highlight (applied by the machine's state, never by a data update). ── */

.${P}-lead-a .${P}-head-side[data-side="B"],
.${P}-lead-b .${P}-head-side[data-side="A"] {
  opacity: 0.4;
}

.${P}-lead-a .${P}-row-a,
.${P}-lead-b .${P}-row-b {
  color: var(--accent);
}`,
  }),
);
