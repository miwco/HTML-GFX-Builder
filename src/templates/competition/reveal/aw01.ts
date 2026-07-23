// aw01 "House Award" — the NoaCG award reveal, sibling of card05 House Title. The category is
// on screen; the subject is on the card from the start but sealed, and the Continue press opens
// the envelope: the name scales up in amber with its logo and note. Celebrating lights the
// accent rule — the applause beat, called separately because the room decides when it comes.

import { fontById, labelFontFaceCss } from '../../../model/fonts';
import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  AWARD_FIELDS,
  AWARD_RUNTIME_JS,
  P,
  awardMarkup,
  defineRevealVariant,
  heldEnvelopeCss,
  revealStructureCss,
} from './shared';

export const aw01: TemplateVariant = defineRevealVariant(
  {
    id: 'aw01',
    category: 'reveal',
    name: 'House Award',
    styleTag: 'noacg',
    description: 'The sealed envelope: category on screen, subject revealed on the press.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Kicker', sample: 'AND THE AWARD GOES TO' },
      { title: 'Category', sample: 'BROADCAST INNOVATION OF THE YEAR' },
      { title: 'Subject', sample: 'NOACG STUDIO' },
    ],
    logo: 'none',
    animationPresets: ['comp-bloom', 'comp-rise', 'comp-impact'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Award',
    description:
      'The NoaCG award reveal: a void stage with a mono kicker and the category in house ' +
      'display type, the winner sealed until the press, then the name in amber with its logo ' +
      'and note.',
    uicolor: '4',
  },
  (o) => ({
    html: awardMarkup(o),
    fields: compFieldsFor(AWARD_FIELDS, o),
    hasAccent: true,
    revealSteps: [{ name: 'Open', call: 'openEnvelope', duration: 0.7 }],
    runtimeExtraJs: AWARD_RUNTIME_JS,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

${revealStructureCss()}

${heldEnvelopeCss()}

/* The stage — the house void. */
.${P}-box {
  background: radial-gradient(110% 90% at 50% 42%,
    rgba(12, 14, 19, 0.94) 0%,
    rgba(8, 9, 12, 0.97) 58%,
    rgba(5, 6, 8, 1) 100%);
}

/* The accent — an amber rule under the category, glowing. */
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

/* The category. */
.${P}-title {
  font-size: calc(44px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.1;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The logo, revealed with the subject. */
.${P}-logo.has-image {
  background: transparent;
}

/* The subject — the moment itself. */
.${P}-subject {
  font-size: calc(78px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.02;
  letter-spacing: var(--display-tracking);
  color: var(--accent);
  text-shadow: 0 0 calc(40px * var(--scale)) color-mix(in srgb, var(--accent) 35%, transparent);
}

/* The note beneath it. */
.${P}-note {
  font-family: var(--font-label);
  font-size: calc(15px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── The applause beat (its own state). ── */

.${P}-celebrating .${P}-accent {
  width: calc(640px * var(--scale));                      /* the rule opens out across the frame */
}

.${P}-celebrating .${P}-subject {
  text-shadow: 0 0 calc(70px * var(--scale)) color-mix(in srgb, var(--accent) 55%, transparent);
}`,
  }),
);
