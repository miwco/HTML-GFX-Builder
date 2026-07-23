// wn01 "Champion Card" — the sport final-result card. The champion's name fills the frame with
// their crest above it; the score line and the beaten side are held back until the Continue
// press, so a caster can name the winner and then say by how much. The celebration is its own
// state, which is what lets the operator hold the moment for as long as the room does.

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

export const wn01: TemplateVariant = defineRevealVariant(
  {
    id: 'wn01',
    category: 'reveal',
    name: 'Champion Card',
    styleTag: 'sport',
    description: 'The champion fills the frame — the score lands on the press.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Kicker', sample: 'GRAND FINAL' },
      { title: 'Winner', sample: 'TEAM LIQUID' },
      { title: 'Result', sample: '3 — 1' },
    ],
    logo: 'none',
    animationPresets: ['comp-impact', 'comp-bloom', 'comp-rise'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Champion Card',
    description:
      'The sport final-result card: the champion’s crest and name filling a dark stage, with ' +
      'the score line and the beaten side revealed on the Continue press and a celebration ' +
      'state the operator calls.',
    uicolor: '5',
  },
  (o) => ({
    html: winnerMarkup(o),
    fields: compFieldsFor(WINNER_FIELDS, o),
    hasAccent: true,
    revealSteps: [{ name: 'Result', call: 'revealResult', duration: 0.5 }],
    runtimeExtraJs: WINNER_RUNTIME_JS,
    css: `${revealStructureCss()}

${heldResultCss()}

/* The stage — a dark wash under the champion. */
.${P}-box {
  background: radial-gradient(120% 95% at 50% 40%,
    rgba(10, 12, 16, 0.9) 0%,
    rgba(6, 7, 10, 0.97) 60%,
    rgba(4, 5, 7, 1) 100%);
}

/* The accent — a slab under the kicker. */
.${P}-accent {
  height: calc(5px * var(--scale));
  background: var(--accent);
  transform-origin: center;
}

/* The kicker above the champion. */
.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(22px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* The champion. */
.${P}-title {
  font-size: calc(88px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1;
  letter-spacing: var(--display-tracking);
  text-transform: uppercase;
  color: var(--text-color);
}

/* The crest, between the kicker and the name. */
.${P}-logo.has-image {
  background: transparent;
}

/* The score line — the press's payload. */
.${P}-subject {
  font-size: calc(56px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

/* The beaten side. */
.${P}-runner {
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* The event note. */
.${P}-note {
  font-family: var(--font-label);
  font-size: calc(15px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── The celebration (its own state — the operator decides when the room gets there). ── */

.${P}-celebrating .${P}-title {
  color: var(--accent);
}

.${P}-celebrating .${P}-accent {
  width: calc(640px * var(--scale));                      /* the slab opens out across the frame */
}`,
  }),
);
