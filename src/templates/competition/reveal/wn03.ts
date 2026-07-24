// wn03 "Frost Champion" — the glass final-result card. The whole moment sits on one frosted
// panel: crest, champion, and then the score line arriving on the press. Celebrating rings the
// panel in the accent rather than recolouring the type — the glass family's way of raising its
// voice without changing it.

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

export const wn03: TemplateVariant = defineRevealVariant(
  {
    id: 'wn03',
    category: 'reveal',
    name: 'Frost Champion',
    styleTag: 'glass',
    description: 'The result on one frosted panel — the score arrives on the press.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Kicker', sample: 'GRAND FINAL' },
      { title: 'Winner', sample: 'TEAM LIQUID' },
      { title: 'Result', sample: '3 — 1' },
    ],
    logo: 'none',
    animationPresets: ['comp-bloom', 'comp-rise', 'comp-impact'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Champion',
    description:
      'The glass final-result card: crest, champion and score on one frosted, softly-rounded ' +
      'panel, the score revealed on the press, and an accent ring for the celebration.',
    uicolor: '2',
  },
  (o) => ({
    html: winnerMarkup(o),
    fields: compFieldsFor(WINNER_FIELDS, o),
    hasAccent: true,
    revealSteps: [{ name: 'Result', call: 'revealResult', duration: 0.5 }],
    runtimeExtraJs: WINNER_RUNTIME_JS,
    css: `${revealStructureCss()}

${heldResultCss()}

/* The stage — a cool wash the panel sits on. */
.${P}-box {
  background: linear-gradient(160deg,
    rgba(14, 20, 30, 0.8) 0%,
    rgba(8, 12, 20, 0.92) 60%,
    rgba(6, 9, 15, 0.96) 100%);
}

/* THE PANEL: the head and the result share one frosted surface, so the press adds to a card
   that is already there rather than opening a second one. */
.${P}-head {
  padding: calc(30px * var(--scale)) calc(44px * var(--scale)) calc(26px * var(--scale));
  background: var(--panel-bg);
  backdrop-filter: var(--panel-blur);
  -webkit-backdrop-filter: var(--panel-blur);
  border-radius: var(--panel-radius) var(--panel-radius) 0 0;
  box-shadow: var(--panel-keyline);
}

.${P}-body {
  margin-top: 0;                   /* the result block continues the same panel */
  padding: calc(22px * var(--scale)) calc(44px * var(--scale)) calc(30px * var(--scale));
  background: var(--panel-bg);
  backdrop-filter: var(--panel-blur);
  -webkit-backdrop-filter: var(--panel-blur);
  border-radius: 0 0 var(--panel-radius) var(--panel-radius);
  box-shadow: var(--panel-shadow), var(--panel-keyline);
}

/* The accent — a soft rule across the seam between the two halves. */
.${P}-accent {
  height: var(--accent-weight);
  border-radius: 999px;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--accent) 15%, transparent),
    color-mix(in srgb, var(--accent) 90%, transparent) 50%,
    color-mix(in srgb, var(--accent) 15%, transparent));
  transform-origin: center;
}

/* The kicker. */
.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(18px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* The champion. */
.${P}-title {
  font-size: calc(70px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.04;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The crest. */
.${P}-logo.has-image {
  background: transparent;
}

/* The score line. */
.${P}-subject {
  font-size: calc(48px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

/* The beaten side. */
.${P}-runner {
  font-size: calc(18px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* The event note. */
.${P}-note {
  font-size: calc(13px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── The celebration (its own state). ── */

.${P}-celebrating .${P}-body {
  box-shadow: var(--panel-shadow), inset 0 0 0 calc(2px * var(--scale)) var(--accent);
}

.${P}-celebrating .${P}-head {
  box-shadow: inset 0 0 0 calc(2px * var(--scale)) var(--accent);
}`,
  }),
);
