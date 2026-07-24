// nm01 "House Nominees" — the NoaCG nominee card. The category on a void stage, the finalists
// cascading in beneath it, a suspense state that dims the room, and then the winner: the name
// lifts into amber while the others fall away. The reveal is the Continue press, so a playout
// server with nothing but a Continue button still runs the whole moment.

import { fontById, labelFontFaceCss } from '../../../model/fonts';
import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  NOMINEE_FIELDS,
  NOMINEE_RUNTIME_JS,
  P,
  defineRevealVariant,
  nomineeMarkup,
  revealStructureCss,
} from './shared';

export const nm01: TemplateVariant = defineRevealVariant(
  {
    id: 'nm01',
    category: 'reveal',
    name: 'House Nominees',
    styleTag: 'noacg',
    description: 'The finalists on a void stage — then the winner lifts into amber.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Category', sample: 'PLAY OF THE TOURNAMENT' },
      { title: 'Kicker', sample: 'THE NOMINEES' },
    ],
    logo: 'none',
    animationPresets: ['comp-bloom', 'comp-cascade', 'comp-rise'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Nominees',
    description:
      'The NoaCG nominee reveal: a void stage with an amber rule, the finalists in house ' +
      'display type, a suspense hold, and the winner lifted into amber while the rest fall away.',
    uicolor: '4',
  },
  (o) => ({
    html: nomineeMarkup(o),
    fields: compFieldsFor(NOMINEE_FIELDS, o),
    hasAccent: true,
    // The reveal IS the Continue press — a real step, so SPX's step count stays derived.
    revealSteps: [{ name: 'Reveal', call: 'revealWinner', duration: 0.55 }],
    runtimeExtraJs: NOMINEE_RUNTIME_JS,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

${revealStructureCss()}

/* The stage — the house void, deepest at the edges. */
.${P}-box {
  background: radial-gradient(110% 85% at 50% 45%,
    rgba(12, 14, 19, 0.93) 0%,
    rgba(8, 9, 12, 0.97) 55%,
    rgba(5, 6, 8, 1) 100%);
}

/* The accent — an amber rule under the category, glowing. */
.${P}-accent {
  height: calc(2px * var(--scale));
  background: var(--accent);
  box-shadow: var(--accent-glow);
  transform-origin: center;
}

/* The kicker — mono, wide-tracked: the house label voice. */
.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* The category. */
.${P}-title {
  font-size: calc(46px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.08;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* One nominee. */
.${P}-nominee {
  padding: calc(10px * var(--scale)) calc(24px * var(--scale));
  border-radius: calc(6px * var(--scale));
  background: rgba(10, 12, 16, 0.5);
}

.${P}-nominee-name {
  font-size: calc(38px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.08;
  color: var(--text-color);
}

.${P}-nominee-detail {
  font-family: var(--font-label);
  font-size: calc(14px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── Suspense and the reveal (machine states, never data writes). ── */

/* The hold — everything falls back a step and the room waits. */
.${P}-suspense .${P}-nominee {
  opacity: 0.55;
}

/* The winner — an amber keyline, amber name, and the glow the house reserves for accents. */
.${P}-won {
  background: rgba(10, 12, 16, 0.85);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent), var(--accent-glow);
}
.${P}-won .${P}-nominee-name {
  color: var(--accent);
}

/* The rest fall away — beaten, not deleted. */
.${P}-out {
  opacity: 0.3;
}`,
  }),
);
