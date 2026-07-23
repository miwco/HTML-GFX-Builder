// nm03 "Clean Nominees" — the minimal finalist card, sibling of lt01 Hairline. The names run
// as a plain list with hairline rules; suspense simply lowers every name, and the winner is
// said with an accent rule and the accent colour. The design to use when the shot behind the
// graphic is the point and the reveal must not cover it.

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

export const nm03: TemplateVariant = defineRevealVariant(
  {
    id: 'nm03',
    category: 'reveal',
    name: 'Clean Nominees',
    styleTag: 'minimal',
    description: 'A quiet finalist list — the winner is said with a rule, not a flood.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Category', sample: 'PLAY OF THE TOURNAMENT' },
      { title: 'Kicker', sample: 'THE NOMINEES' },
    ],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-bloom', 'comp-rise'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Clean Nominees',
    description:
      'The quiet nominee reveal: a soft scrim, the finalists as a hairline-ruled list, a ' +
      'suspense hold that lowers them all, and the winner marked by an accent rule.',
    uicolor: '7',
  },
  (o) => ({
    html: nomineeMarkup(o),
    fields: compFieldsFor(NOMINEE_FIELDS, o),
    hasAccent: true,
    revealSteps: [{ name: 'Reveal', call: 'revealWinner', duration: 0.55 }],
    runtimeExtraJs: NOMINEE_RUNTIME_JS,
    css: `${revealStructureCss()}

/* The stage — barely there: a scrim, so white type holds over any picture. */
.${P}-box {
  background: linear-gradient(180deg,
    rgba(6, 8, 12, 0.5) 0%,
    rgba(6, 8, 12, 0.78) 100%);
}

/* The accent — a hairline under the category. */
.${P}-accent {
  height: var(--accent-weight);
  background: var(--accent);
  transform-origin: center;
}

/* The kicker. */
.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(17px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* The category. */
.${P}-title {
  font-size: calc(40px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.1;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* One nominee — a line in a list, ruled beneath. */
.${P}-nominee {
  padding: calc(10px * var(--scale)) calc(6px * var(--scale));
  border-bottom: 1px solid rgba(255, 255, 255, 0.16);
  min-width: calc(420px * var(--scale));
}

.${P}-nominee-name {
  font-size: calc(34px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.12;
  color: var(--text-color);
}

.${P}-nominee-detail {
  font-size: calc(12px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── Suspense and the reveal (machine states, never data writes). ── */

.${P}-suspense .${P}-nominee {
  opacity: 0.5;
}

/* The winner — an accent rule and the accent colour. Nothing else changes. */
.${P}-won {
  opacity: 1;
  border-bottom-color: var(--accent);
}
.${P}-won .${P}-nominee-name {
  color: var(--accent);
}

.${P}-out {
  opacity: 0.3;
}`,
  }),
);
