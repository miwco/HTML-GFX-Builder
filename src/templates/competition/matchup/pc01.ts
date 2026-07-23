// pc01 "Player Card" — the sport competitor card. A portrait slot beside the name, role and
// team crest, with the stat block held back until the Continue press: the caster introduces
// the player, then the numbers land one at a time. The MVP flourish is its own state, so an
// operator can call the player of the series without touching the data.

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

export const pc01: TemplateVariant = defineMatchupVariant(
  {
    id: 'pc01',
    category: 'matchup',
    name: 'Player Card',
    styleTag: 'sport',
    description: 'Portrait, name and role — with the stat block revealed on the press.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'S1MPLE' },
      { title: 'Role / team', sample: 'AWPER · NAVI' },
      { title: 'Tagline', sample: 'PLAYER OF THE SERIES' },
    ],
    logo: 'none',
    animationPresets: ['comp-impact', 'comp-rise', 'comp-bloom'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Player Card',
    description:
      'The sport competitor card: a cropped portrait beside the name, role and crest on a ' +
      'dark stage, an accent slab down the portrait edge, and a stat block that arrives on ' +
      'the Continue press.',
    uicolor: '5',
  },
  (o) => ({
    html: playerMarkup(o),
    fields: compFieldsFor(PLAYER_FIELDS, o),
    hasAccent: true,
    // The Continue press IS the reveal — a real step, so SPX's step count stays derived.
    revealSteps: [{ name: 'Stats', call: 'revealStats', duration: 0.5 }],
    runtimeExtraJs: PLAYER_RUNTIME_JS,
    css: `${playerStructureCss()}

/* The stage — a dark wash under the card. */
.${P}-box {
  padding: 0 8%;
  background: linear-gradient(110deg,
    rgba(6, 7, 10, 0.97) 0%,
    rgba(10, 12, 16, 0.9) 55%,
    rgba(6, 7, 10, 0.8) 100%);
  align-items: flex-start;         /* the card sits left on the stage */
  justify-content: center;
}

/* The accent slab down the portrait's leading edge. */
.${P}-accent {
  position: absolute;
  left: 8%;
  top: 24%;
  bottom: 24%;
  width: var(--accent-weight);
  background: var(--accent);
  transform-origin: left center;
}

/* The portrait — cropped square-cut, with a dim plate until a file lands in it. */
.${P}-portrait {
  margin-left: calc(20px * var(--scale));  /* clears the accent slab */
  background: rgba(255, 255, 255, 0.05);
}

/* The tagline above the name. */
.${P}-tagline {
  padding: calc(4px * var(--scale)) calc(12px * var(--scale));
  background: var(--accent);
  color: var(--accent-ink);
  font-family: var(--font-label);
  font-size: calc(16px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

/* The name — the loudest type on the card. */
.${P}-name {
  font-size: calc(76px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1;
  letter-spacing: var(--display-tracking);
  text-transform: uppercase;
  color: var(--text-color);
}

/* The role / team line. */
.${P}-role {
  font-family: var(--font-label);
  font-size: calc(22px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* The crest under the identity block. */
.${P}-logo.has-image {
  background: transparent;
}

/* The stat block: figure over label, in a row of columns. */
.${P}-stat-value {
  font-size: calc(44px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.${P}-stat-label {
  font-family: var(--font-label);
  font-size: calc(14px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── The MVP flourish (its own state — the control page offers it as a button). ── */

.${P}-mvp .${P}-tagline {
  box-shadow: 0 0 calc(26px * var(--scale)) color-mix(in srgb, var(--accent) 65%, transparent);
}

.${P}-mvp .${P}-name {
  color: var(--accent);
}`,
  }),
);
