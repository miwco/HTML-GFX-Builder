// aw03 "Launch Reveal" — the same envelope, aimed at a product moment rather than a prize: a
// teaser line on screen, then the name landing hard on the press. Sport family, because a
// launch beat wants the slab and the weight; the machine underneath is identical to the award
// card's, which is the point of a type owning the moment rather than a design owning it.

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

export const aw03: TemplateVariant = defineRevealVariant(
  {
    id: 'aw03',
    category: 'reveal',
    name: 'Launch Reveal',
    styleTag: 'sport',
    description: 'A teaser line, then the name lands — the launch take on the envelope.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Kicker', sample: 'ANNOUNCING' },
      { title: 'Category', sample: 'THE 2026 SEASON PARTNER' },
      { title: 'Subject', sample: 'NOACG STUDIO' },
    ],
    logo: 'none',
    animationPresets: ['comp-impact', 'comp-bloom', 'comp-rise'],
    defaultPalette: paletteById('inferno'),
    defaultFontId: 'archivo',
    defaultZone: 'mid-center',
  },
  {
    name: 'Launch Reveal',
    description:
      'The launch take on the envelope card: a teaser kicker over the announcement line, the ' +
      'subject held back until the press, then the name landing on an accent slab.',
    uicolor: '6',
  },
  (o) => ({
    html: awardMarkup(o),
    fields: compFieldsFor(AWARD_FIELDS, o),
    hasAccent: true,
    revealSteps: [{ name: 'Open', call: 'openEnvelope', duration: 0.7 }],
    runtimeExtraJs: AWARD_RUNTIME_JS,
    css: `${revealStructureCss()}

${heldEnvelopeCss()}

/* The stage — a hard dark wash with the accent's heat at the bottom edge. */
.${P}-box {
  background:
    radial-gradient(90% 60% at 50% 100%, color-mix(in srgb, var(--accent) 22%, transparent) 0%, transparent 70%),
    linear-gradient(180deg, rgba(8, 8, 10, 0.94) 0%, rgba(4, 4, 6, 0.99) 100%);
}

/* The accent — a slab behind the announcement line. */
.${P}-accent {
  height: calc(6px * var(--scale));
  background: var(--accent);
  transform-origin: center;
}

/* The teaser kicker. */
.${P}-kicker {
  padding: calc(4px * var(--scale)) calc(14px * var(--scale));
  background: var(--accent);
  color: var(--accent-ink);
  font-family: var(--font-label);
  font-size: calc(18px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

/* The announcement line. */
.${P}-title {
  font-size: calc(38px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.12;
  letter-spacing: var(--display-tracking);
  text-transform: uppercase;
  color: var(--text-dim);
}

/* The logo, revealed with the subject. */
.${P}-logo.has-image {
  background: transparent;
}

/* The subject — the name that lands. */
.${P}-subject {
  font-size: calc(92px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1;
  letter-spacing: var(--display-tracking);
  text-transform: uppercase;
  color: var(--text-color);
}

/* The note. */
.${P}-note {
  font-family: var(--font-label);
  font-size: calc(15px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── The applause beat (its own state). ── */

.${P}-celebrating .${P}-subject {
  color: var(--accent);
}

.${P}-celebrating .${P}-accent {
  width: calc(640px * var(--scale));
}`,
  }),
);
