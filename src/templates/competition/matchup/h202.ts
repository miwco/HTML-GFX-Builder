// h202 "House Compare" — the NoaCG comparison board, sibling of ig11 House Poll. The house
// void with mono stat labels; each side's share bar is amber against a void track, and the
// highlighted side keeps the amber glow while the other falls back. The analytical member of
// the house family: no slabs, no shouting, all figures.

import { fontById, labelFontFaceCss } from '../../../model/fonts';
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

export const h202: TemplateVariant = defineMatchupVariant(
  {
    id: 'h202',
    category: 'matchup',
    name: 'House Compare',
    styleTag: 'noacg',
    description: 'The house comparison: void board, mono labels, amber share bars.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Side A', sample: 'TEAM LIQUID' },
      { title: 'Side B', sample: 'NAVI' },
      { title: 'Title', sample: 'HEAD TO HEAD' },
    ],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Compare',
    description:
      'The NoaCG comparison board: a void stage, mono stat labels, amber share bars measured ' +
      'from the operator’s figures, and an amber-glowing highlight on the side being talked ' +
      'about.',
    uicolor: '4',
  },
  (o) => ({
    html: h2hMarkup(o),
    fields: compFieldsFor(H2H_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: H2H_RUNTIME_JS,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

${h2hStructureCss()}

/* The stage — the house void. */
.${P}-box {
  justify-content: flex-start;
  padding: 9% 6%;
  background: radial-gradient(110% 85% at 50% 30%,
    rgba(12, 14, 19, 0.93) 0%,
    rgba(8, 9, 12, 0.97) 60%,
    rgba(5, 6, 8, 1) 100%);
}

/* The accent rule under the title, wearing the house glow. */
.${P}-accent {
  height: calc(2px * var(--scale));
  background: var(--accent);
  box-shadow: var(--accent-glow);
  transform-origin: center;
}

/* The title — mono, wide-tracked, amber. */
.${P}-event {
  font-family: var(--font-label);
  font-size: calc(22px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* The side names — house display type. */
.${P}-name {
  font-size: calc(38px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.06;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The crest slot — a void plate until a file lands in it. */
.${P}-logo {
  border-radius: calc(6px * var(--scale));
  background: rgba(10, 12, 16, 0.6);
  padding: calc(8px * var(--scale));
}
.${P}-logo.has-image {
  background: transparent;
}

/* The figures — tabular, so both columns stay in line as the numbers change. */
.${P}-row-value {
  font-size: calc(30px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1;
  color: var(--text-dim);
}

.${P}-row-lead {
  color: var(--accent);
}

/* The stat label — the house mono label voice. */
.${P}-row-label {
  font-family: var(--font-label);
  font-size: calc(13px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-dim);
}

/* The share bars — amber on the void, side B in paper white. */
.${P}-row-track {
  border-radius: calc(3px * var(--scale));
  background: rgba(10, 12, 16, 0.7);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}
.${P}-row-fill {
  background: var(--accent);
  box-shadow: var(--accent-glow);
}
.${P}-row-track-b .${P}-row-fill {
  background: rgba(255, 255, 255, 0.6);
  box-shadow: none;
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
