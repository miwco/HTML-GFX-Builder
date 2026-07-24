// vd02 "House Verdict" — the NoaCG ruling card, sibling of qz02 House Quiz. The void stage
// with mono labels; a correct ruling takes the amber accent and its glow, an incorrect one
// takes signal red. Same one state and one field as every verdict design — the house look is
// all that changes.

import { fontById, labelFontFaceCss } from '../../../model/fonts';
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

export const vd02: TemplateVariant = defineRevealVariant(
  {
    id: 'vd02',
    category: 'reveal',
    name: 'House Verdict',
    styleTag: 'noacg',
    description: 'The house ruling: void stage, mono labels, amber tick or red cross.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Prompt', sample: 'IS THAT ANSWER CORRECT?' },
      { title: 'Answer', sample: 'THE RED PLANET IS MARS' },
      { title: 'Note', sample: 'CONFIRMED BY THE JUDGES' },
    ],
    logo: 'none',
    animationPresets: ['comp-bloom', 'comp-impact', 'comp-rise'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Verdict',
    description:
      'The NoaCG ruling card: a void stage, mono prompt and note, and a full-frame amber tick ' +
      'or red cross with its word beneath.',
    uicolor: '4',
  },
  (o) => ({
    html: verdictMarkup(o),
    fields: compFieldsFor(VERDICT_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: VERDICT_RUNTIME_JS,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

${revealStructureCss()}

/* The stage — the house void. */
.${P}-box {
  background: radial-gradient(110% 85% at 50% 45%,
    rgba(12, 14, 19, 0.93) 0%,
    rgba(8, 9, 12, 0.97) 55%,
    rgba(5, 6, 8, 1) 100%);
}

/* The accent — a rule under the question, neutral until the ruling. */
.${P}-accent {
  height: calc(2px * var(--scale));
  background: var(--text-dim);
  transform-origin: center;
}

/* The prompt — mono, wide-tracked. */
.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(18px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* What is being ruled on. */
.${P}-title {
  font-size: calc(44px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.1;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The mark. */
.${P}-mark {
  font-size: calc(140px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 0.9;
  color: var(--text-dim);
}

/* The ruling's word — a void chip until the ruling colours it. */
.${P}-word {
  padding: calc(6px * var(--scale)) calc(18px * var(--scale));
  border-radius: calc(6px * var(--scale));
  font-family: var(--font-label);
  font-size: calc(22px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: 0.2em;
  color: var(--panel-bg);
  background: var(--text-dim);
}

/* The note. */
.${P}-note {
  font-family: var(--font-label);
  font-size: calc(14px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── The ruling (one machine state; the verdict field says which). ── */

.${P}-correct .${P}-mark {
  color: var(--accent);
  text-shadow: 0 0 calc(30px * var(--scale)) color-mix(in srgb, var(--accent) 55%, transparent);
}
.${P}-correct .${P}-word {
  background: var(--accent);
  color: var(--accent-ink);
  box-shadow: var(--accent-glow);
}
.${P}-correct .${P}-accent {
  background: var(--accent);
  box-shadow: var(--accent-glow);
}

/* Incorrect stays signal red whatever the project accent is — a wrong answer must read as
   wrong even in an amber house palette. */
.${P}-incorrect .${P}-mark {
  color: #e63946;
  text-shadow: 0 0 calc(30px * var(--scale)) rgba(230, 57, 70, 0.5);
}
.${P}-incorrect .${P}-word {
  background: #e63946;
  color: #ffffff;
}
.${P}-incorrect .${P}-accent {
  background: #e63946;
  box-shadow: none;
}`,
  }),
);
