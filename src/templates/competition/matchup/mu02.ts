// mu02 "House Match-up" — the NoaCG match-up, sibling of lt11 House Strap and es02 House
// Series. The house void: a near-black stage, an amber seam with the family's glow, mono
// labels and flat display type. The pick lifts a column onto an amber keyline rather than
// recolouring it — the house never shouts twice.

import { fontById, labelFontFaceCss } from '../../../model/fonts';
import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  MATCHUP_FIELDS,
  MATCHUP_RUNTIME_JS,
  P,
  defineMatchupVariant,
  matchupMarkup,
  matchupStructureCss,
} from './shared';

export const mu02: TemplateVariant = defineMatchupVariant(
  {
    id: 'mu02',
    category: 'matchup',
    name: 'House Match-up',
    styleTag: 'noacg',
    description: 'The house match-up: void stage, amber seam, and an amber-keylined winner.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Side A', sample: 'TEAM LIQUID' },
      { title: 'Side B', sample: 'NAVI' },
      { title: 'Event line', sample: 'GRAND FINAL · BEST OF 5' },
    ],
    logo: 'none',
    animationPresets: ['comp-bloom', 'comp-rise', 'comp-impact'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Match-up',
    description:
      'The NoaCG match-up card: a void stage with an amber glowing seam, mono event and note ' +
      'lines, flat house display type, and a winner marked by an amber keyline and chip.',
    uicolor: '4',
  },
  (o) => ({
    html: matchupMarkup(o),
    fields: compFieldsFor(MATCHUP_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: MATCHUP_RUNTIME_JS,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

${matchupStructureCss()}

/* The stage — the house void, deepest at the edges. */
.${P}-box {
  background: radial-gradient(110% 80% at 50% 50%,
    rgba(12, 14, 19, 0.92) 0%,
    rgba(8, 9, 12, 0.97) 55%,
    rgba(5, 6, 8, 1) 100%);
}

/* The accent seam — amber, glowing, down the middle of the stage. */
.${P}-accent {
  position: absolute;
  left: calc(50% - calc(var(--accent-weight) / 2));
  top: 26%;
  bottom: 26%;
  width: var(--accent-weight);
  background: var(--accent);
  box-shadow: var(--accent-glow);  /* the house glow — follows the accent colour */
  transform-origin: center;
}

/* The event line — mono, wide-tracked: the house label voice. */
.${P}-event {
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* The competitor name — flat house display type. */
.${P}-name {
  font-size: calc(66px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.02;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The note under the name — mono, dim. */
.${P}-note {
  font-family: var(--font-label);
  font-size: calc(16px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-dim);
}

/* The VS mark — an amber-keylined void chip, not a filled slab. */
.${P}-vs {
  padding: calc(10px * var(--scale)) calc(18px * var(--scale));
  border-radius: calc(6px * var(--scale));  /* the house chip radius */
  background: rgba(10, 12, 16, 0.7);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent);
  color: var(--accent);
  font-size: calc(34px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1;
}

/* The crest slot — a void plate until a file lands in it. */
.${P}-logo {
  border-radius: calc(6px * var(--scale));
  background: rgba(10, 12, 16, 0.6);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: calc(12px * var(--scale));
}
.${P}-logo.has-image {
  background: transparent;
  box-shadow: none;
}

/* The verdict chip — amber ink on the void, the house's way of naming a winner. */
.${P}-verdict {
  padding: calc(5px * var(--scale)) calc(14px * var(--scale));
  border-radius: calc(6px * var(--scale));
  background: var(--accent);
  color: var(--accent-ink);
  font-family: var(--font-label);
  font-size: calc(15px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: 0.2em;
  box-shadow: var(--accent-glow);
}

/* ── The pick (applied by the machine's states, never by a data update). ── */

/* The winning column sits on an amber keyline — lifted, not recoloured. */
.${P}-win {
  padding: calc(18px * var(--scale)) calc(14px * var(--scale));
  background: rgba(10, 12, 16, 0.55);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent);
}

.${P}-lose {
  opacity: 0.4;
}

/* Locked — the seam runs the full height: the pick is final. */
.${P}-locked .${P}-accent {
  top: 14%;
  bottom: 14%;
}`,
  }),
);
