// vd01 "Call Verdict" — the sport ruling card. The question on screen, then a tick or a cross
// the size of the frame when the operator rules. Correct paints the accent, incorrect paints
// signal red — the two verdicts are one state and one field, so a show that needs a third
// ruling adds a field value, not a graphic.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  P,
  VERDICT_FIELDS,
  VERDICT_RUNTIME_JS,
  defineRevealVariant,
  revealStructureCss,
  verdictMarkup,
} from './shared';

export const vd01: TemplateVariant = defineRevealVariant(
  {
    id: 'vd01',
    category: 'reveal',
    name: 'Call Verdict',
    styleTag: 'sport',
    description: 'A ruling card: the question, then a full-frame tick or cross.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Prompt', sample: 'WAS THE CALL CORRECT?' },
      { title: 'Answer', sample: 'THE SHOT WAS OUT OF BOUNDS' },
      { title: 'Note', sample: 'CONFIRMED BY REPLAY' },
    ],
    logo: 'none',
    animationPresets: ['comp-impact', 'comp-bloom', 'comp-rise'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Call Verdict',
    description:
      'The sport ruling card: the question over a dark stage, then a full-frame tick or cross ' +
      'with its word beneath. Correct rules in the accent; incorrect rules in red.',
    uicolor: '1',
  },
  (o) => ({
    html: verdictMarkup(o),
    fields: compFieldsFor(VERDICT_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: VERDICT_RUNTIME_JS,
    css: `${revealStructureCss()}

/* The stage — a dark wash under the ruling. */
.${P}-box {
  background: radial-gradient(120% 90% at 50% 45%,
    rgba(10, 12, 16, 0.9) 0%,
    rgba(6, 7, 10, 0.97) 60%,
    rgba(4, 5, 7, 1) 100%);
}

/* The accent — a slab under the question, tinted by the ruling. */
.${P}-accent {
  height: calc(4px * var(--scale));
  background: var(--text-dim);     /* neutral until a ruling is made */
  transform-origin: center;
}

/* The question. */
.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* What is being ruled on. */
.${P}-title {
  font-size: calc(48px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.08;
  letter-spacing: var(--display-tracking);
  text-transform: uppercase;
  color: var(--text-color);
}

/* The mark — a tick or a cross, the biggest thing on the card. */
.${P}-mark {
  font-size: calc(150px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 0.9;
  color: var(--text-dim);
}

/* The ruling's word. */
.${P}-word {
  padding: calc(6px * var(--scale)) calc(20px * var(--scale));
  font-family: var(--font-label);
  font-size: calc(26px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--accent-ink);
  background: var(--text-dim);
}

/* The note under the ruling. */
.${P}-note {
  font-family: var(--font-label);
  font-size: calc(16px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── The ruling (one machine state; the verdict field says which). ── */

.${P}-correct .${P}-mark {
  color: var(--accent);
}
.${P}-correct .${P}-word {
  background: var(--accent);
}
.${P}-correct .${P}-accent {
  background: var(--accent);
}

/* Incorrect rules in signal red, whatever the project's accent is — a wrong call has to read
   as wrong even in a palette whose accent is green. */
.${P}-incorrect .${P}-mark {
  color: #e63946;
}
.${P}-incorrect .${P}-word {
  background: #e63946;
  color: #ffffff;
}
.${P}-incorrect .${P}-accent {
  background: #e63946;
}`,
  }),
);
