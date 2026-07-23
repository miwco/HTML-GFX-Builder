// vd03 "Clean Verdict" — the minimal ruling card, sibling of card01 Hairline Card. The mark is
// set in type rather than filled, the word sits under a hairline, and nothing shouts: a fact
// check under a talking head rather than a game-show sting.

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

export const vd03: TemplateVariant = defineRevealVariant(
  {
    id: 'vd03',
    category: 'reveal',
    name: 'Clean Verdict',
    styleTag: 'minimal',
    description: 'A quiet ruling: the mark set in type, the word under a hairline.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Prompt', sample: 'IS THAT CLAIM TRUE?' },
      { title: 'Answer', sample: 'THE RECORD WAS SET IN 2019' },
      { title: 'Note', sample: 'SOURCE: OFFICIAL RESULTS' },
    ],
    logo: 'none',
    animationPresets: ['comp-rise', 'comp-bloom', 'comp-impact'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Clean Verdict',
    description:
      'The quiet ruling card: a soft scrim, the claim in display type, and the verdict said ' +
      'with a typographic mark and a hairline rather than a colour flood.',
    uicolor: '7',
  },
  (o) => ({
    html: verdictMarkup(o),
    fields: compFieldsFor(VERDICT_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: VERDICT_RUNTIME_JS,
    css: `${revealStructureCss()}

/* The stage — a scrim, so the picture behind stays readable. */
.${P}-box {
  background: linear-gradient(180deg,
    rgba(6, 8, 12, 0.48) 0%,
    rgba(6, 8, 12, 0.76) 100%);
}

/* The accent — a hairline under the claim. */
.${P}-accent {
  height: var(--accent-weight);
  background: var(--text-dim);
  transform-origin: center;
}

/* The prompt. */
.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(16px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* The claim. */
.${P}-title {
  font-size: calc(42px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.12;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The mark — set, not filled. */
.${P}-mark {
  font-size: calc(110px * var(--scale) * var(--type-scale));
  font-weight: 300;                /* a light stroke: this family never shouts */
  line-height: 0.95;
  color: var(--text-dim);
}

/* The word, under its own hairline. */
.${P}-word {
  padding-bottom: calc(6px * var(--scale));
  border-bottom: calc(2px * var(--scale)) solid var(--text-dim);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.24em;
  color: var(--text-color);
}

/* The note. */
.${P}-note {
  font-size: calc(13px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── The ruling (one machine state; the verdict field says which). ── */

.${P}-correct .${P}-mark,
.${P}-correct .${P}-word {
  color: var(--accent);
}
.${P}-correct .${P}-word {
  border-bottom-color: var(--accent);
}
.${P}-correct .${P}-accent {
  background: var(--accent);
}

/* Incorrect keeps signal red, whatever the palette's accent happens to be. */
.${P}-incorrect .${P}-mark,
.${P}-incorrect .${P}-word {
  color: #e63946;
}
.${P}-incorrect .${P}-word {
  border-bottom-color: #e63946;
}
.${P}-incorrect .${P}-accent {
  background: #e63946;
}`,
  }),
);
