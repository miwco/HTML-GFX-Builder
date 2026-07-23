// pc03 "Frost Player" — the glass competitor card, sibling of lt08 Frosted Card. The whole
// card is one frosted panel: a rounded portrait, the identity beside it, and the stat block
// arriving on the Continue press as a row of glass tiles. The softest member of the pack — an
// interview bumper or a pre-game introduction rather than a stinger.

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

export const pc03: TemplateVariant = defineMatchupVariant(
  {
    id: 'pc03',
    category: 'matchup',
    name: 'Frost Player',
    styleTag: 'glass',
    description: 'A frosted competitor card: rounded portrait, glass stat tiles on the press.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'S1MPLE' },
      { title: 'Role / team', sample: 'AWPER · NAVI' },
      { title: 'Tagline', sample: 'PLAYER OF THE SERIES' },
    ],
    logo: 'none',
    animationPresets: ['comp-bloom', 'comp-rise', 'comp-impact'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Player',
    description:
      'The glass competitor card: one frosted panel holding a rounded portrait and the ' +
      'identity block, with the stat figures arriving as glass tiles on the Continue press.',
    uicolor: '2',
  },
  (o) => ({
    html: playerMarkup(o),
    fields: compFieldsFor(PLAYER_FIELDS, o),
    hasAccent: true,
    revealSteps: [{ name: 'Stats', call: 'revealStats', duration: 0.5 }],
    runtimeExtraJs: PLAYER_RUNTIME_JS,
    css: `${playerStructureCss()}

/* The stage — a cool wash the frosted card sits on. */
.${P}-box {
  padding: 0 10%;
  background: linear-gradient(160deg,
    rgba(14, 20, 30, 0.78) 0%,
    rgba(8, 12, 20, 0.9) 60%,
    rgba(6, 9, 15, 0.95) 100%);
}

/* THE CARD: the head and the stat block share one frosted panel, so the press adds tiles to
   a surface that is already there rather than opening a second one. */
.${P}-head,
.${P}-body {
  padding: calc(26px * var(--scale)) calc(30px * var(--scale));
  background: var(--panel-bg);
  backdrop-filter: var(--panel-blur);
  -webkit-backdrop-filter: var(--panel-blur);
  border-radius: var(--panel-radius);
  box-shadow: var(--panel-shadow), var(--panel-keyline);
}

.${P}-body {
  margin-top: calc(14px * var(--scale));
  padding: calc(18px * var(--scale)) calc(30px * var(--scale));
}

/* The accent — a soft rule down the card's left edge. */
.${P}-accent {
  position: absolute;
  left: 9%;
  top: 30%;
  bottom: 30%;
  width: var(--accent-weight);
  border-radius: 999px;
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--accent) 90%, transparent),
    color-mix(in srgb, var(--accent) 20%, transparent));
  transform-origin: top center;
}

/* The portrait — softly rounded, on a glass plate until a file lands in it. */
.${P}-portrait {
  border-radius: calc(18px * var(--scale));
  background: rgba(255, 255, 255, 0.1);
}

/* The tagline — an accent pill. */
.${P}-tagline {
  padding: calc(5px * var(--scale)) calc(14px * var(--scale));
  border-radius: 999px;
  background: var(--accent);
  /* A HARD dark ink, not var(--accent-ink): the glass family resolves that token to
     var(--panel-bg), which in a glass palette is a translucent white — light type on a light
     accent fill, which is unreadable. Anything sitting ON the accent here says so itself. */
  color: #08101a;
  font-size: calc(14px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

/* The name. */
.${P}-name {
  font-size: calc(62px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.04;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The role / team line. */
.${P}-role {
  font-size: calc(19px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* Each stat is its own glass tile. */
.${P}-stat {
  padding: calc(12px * var(--scale)) calc(18px * var(--scale));
  border-radius: calc(14px * var(--scale));
  background: rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
}

.${P}-stat-value {
  font-size: calc(38px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.${P}-stat-label {
  font-size: calc(12px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── The MVP flourish (its own state). ── */

.${P}-mvp .${P}-head {
  box-shadow: var(--panel-shadow), inset 0 0 0 calc(2px * var(--scale)) var(--accent);
}`,
  }),
);
