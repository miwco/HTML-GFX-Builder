// pc02 "House Player" — the NoaCG competitor card, sibling of lt11 House Strap. The portrait
// sits in a void frame with an amber keyline; the tagline is a mono chip, the name flat house
// display type, and the stat figures amber. Same two moments as every player card: the stats
// land on the Continue press, and the MVP flourish is its own state.

import { fontById, labelFontFaceCss } from '../../../model/fonts';
import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  PLAYER_FIELDS,
  PLAYER_RUNTIME_JS,
  P,
  defineMatchupVariant,
  playerMarkup,
  playerStructureCss,
} from './shared';

export const pc02: TemplateVariant = defineMatchupVariant(
  {
    id: 'pc02',
    category: 'matchup',
    name: 'House Player',
    styleTag: 'noacg',
    description: 'The house competitor card: void portrait frame, mono chip, amber figures.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'S1MPLE' },
      { title: 'Role / team', sample: 'AWPER · NAVI' },
      { title: 'Tagline', sample: 'PLAYER OF THE SERIES' },
    ],
    logo: 'none',
    animationPresets: ['comp-rise', 'comp-bloom', 'comp-impact'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Player',
    description:
      'The NoaCG competitor card: a void stage, the portrait in an amber-keylined frame, a ' +
      'mono tagline chip, flat house display type, and amber stat figures revealed on the ' +
      'Continue press.',
    uicolor: '4',
  },
  (o) => ({
    html: playerMarkup(o),
    fields: compFieldsFor(PLAYER_FIELDS, o),
    hasAccent: true,
    revealSteps: [{ name: 'Stats', call: 'revealStats', duration: 0.5 }],
    runtimeExtraJs: PLAYER_RUNTIME_JS,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

${playerStructureCss()}

/* The stage — the house void. */
.${P}-box {
  padding: 0 8%;
  background: radial-gradient(120% 90% at 30% 50%,
    rgba(12, 14, 19, 0.94) 0%,
    rgba(8, 9, 12, 0.97) 60%,
    rgba(5, 6, 8, 1) 100%);
  align-items: flex-start;
}

/* The accent bar down the card's leading edge, wearing the house glow. */
.${P}-accent {
  position: absolute;
  left: 8%;
  top: 26%;
  bottom: 26%;
  width: var(--accent-weight);
  background: var(--accent);
  box-shadow: var(--accent-glow);
  transform-origin: left center;
}

/* The portrait — a void frame with an amber keyline. */
.${P}-portrait {
  margin-left: calc(22px * var(--scale));
  border-radius: calc(6px * var(--scale));
  background: rgba(10, 12, 16, 0.6);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);
}

/* The tagline — a mono chip in amber ink. */
.${P}-tagline {
  padding: calc(4px * var(--scale)) calc(12px * var(--scale));
  border-radius: calc(6px * var(--scale));
  background: rgba(10, 12, 16, 0.7);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent);
  color: var(--accent);
  font-family: var(--font-label);
  font-size: calc(14px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
}

/* The name — flat house display type. */
.${P}-name {
  font-size: calc(68px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.02;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The role / team line — mono, dim. */
.${P}-role {
  font-family: var(--font-label);
  font-size: calc(18px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-dim);
}

/* The stat block. */
.${P}-stat-value {
  font-size: calc(40px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.${P}-stat-label {
  font-family: var(--font-label);
  font-size: calc(12px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── The MVP flourish (its own state). ── */

.${P}-mvp .${P}-tagline {
  background: var(--accent);
  color: var(--accent-ink);
  box-shadow: var(--accent-glow);
}

.${P}-mvp .${P}-portrait {
  box-shadow: inset 0 0 0 calc(2px * var(--scale)) var(--accent), var(--accent-glow);
}`,
  }),
);
