// wn02 "House Champion" — the NoaCG final-result card, sibling of card05 House Title. The void
// stage with a mono kicker, the champion in flat house display type, and the score line in
// amber once the press lands it. Celebrating widens the amber rule and lights the name — the
// house never adds a second colour to make a point.

import { fontById, labelFontFaceCss } from '../../../model/fonts';
import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  P,
  WINNER_FIELDS,
  WINNER_RUNTIME_JS,
  defineRevealVariant,
  heldResultCss,
  revealStructureCss,
  winnerMarkup,
} from './shared';

export const wn02: TemplateVariant = defineRevealVariant(
  {
    id: 'wn02',
    category: 'reveal',
    name: 'House Champion',
    styleTag: 'noacg',
    description: 'The house result card: void stage, mono kicker, amber score on the press.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Kicker', sample: 'GRAND FINAL' },
      { title: 'Winner', sample: 'TEAM LIQUID' },
      { title: 'Result', sample: '3 — 1' },
    ],
    logo: 'none',
    animationPresets: ['comp-bloom', 'comp-rise', 'comp-impact'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Champion',
    description:
      'The NoaCG final-result card: a void stage with an amber rule, a mono kicker, the ' +
      'champion in house display type, and the score line revealed in amber on the press.',
    uicolor: '4',
  },
  (o) => ({
    html: winnerMarkup(o),
    fields: compFieldsFor(WINNER_FIELDS, o),
    hasAccent: true,
    revealSteps: [{ name: 'Result', call: 'revealResult', duration: 0.5 }],
    runtimeExtraJs: WINNER_RUNTIME_JS,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

${revealStructureCss()}

${heldResultCss()}

/* The stage — the house void. */
.${P}-box {
  background: radial-gradient(110% 90% at 50% 42%,
    rgba(12, 14, 19, 0.94) 0%,
    rgba(8, 9, 12, 0.97) 58%,
    rgba(5, 6, 8, 1) 100%);
}

/* The accent — an amber rule under the kicker, glowing. */
.${P}-accent {
  height: calc(2px * var(--scale));
  background: var(--accent);
  box-shadow: var(--accent-glow);
  transform-origin: center;
}

/* The kicker — mono, wide-tracked. */
.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(19px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* The champion — flat house display type. */
.${P}-title {
  font-size: calc(80px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.02;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The crest. */
.${P}-logo.has-image {
  background: transparent;
}

/* The score line — amber, tabular. */
.${P}-subject {
  font-size: calc(52px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

/* The beaten side. */
.${P}-runner {
  font-family: var(--font-label);
  font-size: calc(18px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-dim);
}

/* The event note. */
.${P}-note {
  font-family: var(--font-label);
  font-size: calc(14px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── The celebration (its own state). ── */

.${P}-celebrating .${P}-title {
  color: var(--accent);
  text-shadow: 0 0 calc(40px * var(--scale)) color-mix(in srgb, var(--accent) 45%, transparent);
}

.${P}-celebrating .${P}-accent {
  width: calc(640px * var(--scale));
}`,
  }),
);
