// aw02 "Frost Award" — the glass award reveal. The category sits on a frosted plate; the press
// blooms the subject out beneath it with its logo, and the celebration rings the plate in the
// accent. The ceremonial end of the pack: an awards evening, a hall-of-fame induction, a
// partnership announcement.

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

export const aw02: TemplateVariant = defineRevealVariant(
  {
    id: 'aw02',
    category: 'reveal',
    name: 'Frost Award',
    styleTag: 'glass',
    description: 'A frosted category plate — the subject blooms out on the press.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Kicker', sample: 'AND THE AWARD GOES TO' },
      { title: 'Category', sample: 'BROADCAST INNOVATION OF THE YEAR' },
      { title: 'Subject', sample: 'NOACG STUDIO' },
    ],
    logo: 'none',
    animationPresets: ['comp-bloom', 'comp-rise', 'comp-impact'],
    defaultPalette: paletteById('orchid'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Award',
    description:
      'The glass award reveal: the category on a frosted plate, the winner sealed until the ' +
      'press, then the subject blooming out beneath with its logo and note.',
    uicolor: '3',
  },
  (o) => ({
    html: awardMarkup(o),
    fields: compFieldsFor(AWARD_FIELDS, o),
    hasAccent: true,
    revealSteps: [{ name: 'Open', call: 'openEnvelope', duration: 0.7 }],
    runtimeExtraJs: AWARD_RUNTIME_JS,
    css: `${revealStructureCss()}

${heldEnvelopeCss()}

/* The stage — a deep, cool wash for a ceremony. */
.${P}-box {
  background: radial-gradient(120% 100% at 50% 35%,
    rgba(20, 16, 32, 0.85) 0%,
    rgba(10, 10, 20, 0.94) 55%,
    rgba(6, 7, 14, 0.98) 100%);
}

/* The category sits on its own frosted plate. */
.${P}-head {
  padding: calc(22px * var(--scale)) calc(40px * var(--scale)) calc(24px * var(--scale));
  background: var(--panel-bg);
  backdrop-filter: var(--panel-blur);
  -webkit-backdrop-filter: var(--panel-blur);
  border-radius: var(--panel-radius);
  box-shadow: var(--panel-shadow), var(--panel-keyline);
}

/* The accent — a soft rule under the plate. */
.${P}-accent {
  height: var(--accent-weight);
  border-radius: 999px;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--accent) 10%, transparent),
    color-mix(in srgb, var(--accent) 95%, transparent) 50%,
    color-mix(in srgb, var(--accent) 10%, transparent));
  transform-origin: center;
}

/* The kicker. */
.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(17px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* The category. */
.${P}-title {
  font-size: calc(40px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.12;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The logo, revealed with the subject. */
.${P}-logo.has-image {
  background: transparent;
}

/* The subject. */
.${P}-subject {
  font-size: calc(74px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.04;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The note. */
.${P}-note {
  font-size: calc(14px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── The applause beat (its own state). ── */

.${P}-celebrating .${P}-head {
  box-shadow: var(--panel-shadow), inset 0 0 0 calc(2px * var(--scale)) var(--accent);
}

.${P}-celebrating .${P}-subject {
  color: var(--accent);
}`,
  }),
);
