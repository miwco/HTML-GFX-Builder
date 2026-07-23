// nm02 "Frost Nominees" — the glass nominee card, sibling of lt08 Frosted Card. Each finalist
// sits on a frosted tile; the suspense state blurs the room back, and the winner's tile rings
// in the accent while the others sink. The ceremonial member of the reveal family — an awards
// evening rather than a game show.

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

export const nm02: TemplateVariant = defineRevealVariant(
  {
    id: 'nm02',
    category: 'reveal',
    name: 'Frost Nominees',
    styleTag: 'glass',
    description: 'Finalists on frosted tiles — the winner rings in the accent.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Category', sample: 'PLAY OF THE TOURNAMENT' },
      { title: 'Kicker', sample: 'THE NOMINEES' },
    ],
    logo: 'none',
    animationPresets: ['comp-bloom', 'comp-cascade', 'comp-rise'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Nominees',
    description:
      'The glass nominee reveal: a cool stage, the finalists on frosted, softly-rounded tiles, ' +
      'a suspense hold that sinks them back, and an accent ring on the winner.',
    uicolor: '2',
  },
  (o) => ({
    html: nomineeMarkup(o),
    fields: compFieldsFor(NOMINEE_FIELDS, o),
    hasAccent: true,
    revealSteps: [{ name: 'Reveal', call: 'revealWinner', duration: 0.55 }],
    runtimeExtraJs: NOMINEE_RUNTIME_JS,
    css: `${revealStructureCss()}

/* The stage — a cool wash the frosted tiles sit on. */
.${P}-box {
  background: linear-gradient(160deg,
    rgba(14, 20, 30, 0.8) 0%,
    rgba(8, 12, 20, 0.92) 60%,
    rgba(6, 9, 15, 0.96) 100%);
}

/* The accent — a soft, fully-rounded rule under the category. */
.${P}-accent {
  height: var(--accent-weight);
  border-radius: 999px;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--accent) 20%, transparent),
    color-mix(in srgb, var(--accent) 90%, transparent) 50%,
    color-mix(in srgb, var(--accent) 20%, transparent));
  transform-origin: center;
}

/* The kicker. */
.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(19px * var(--scale) * var(--type-scale));
  font-weight: 700;
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

/* One nominee — its own frosted tile. */
.${P}-nominee {
  padding: calc(14px * var(--scale)) calc(28px * var(--scale));
  border-radius: var(--panel-radius);
  background: var(--panel-bg);
  backdrop-filter: var(--panel-blur);
  -webkit-backdrop-filter: var(--panel-blur);
  box-shadow: var(--panel-shadow), var(--panel-keyline);
}

.${P}-nominee-name {
  font-size: calc(36px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.1;
  color: var(--text-color);
}

.${P}-nominee-detail {
  font-size: calc(13px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── Suspense and the reveal (machine states, never data writes). ── */

.${P}-suspense .${P}-nominee {
  opacity: 0.5;
  box-shadow: none;                /* the room sinks: the tiles lose their lift */
}

/* The winner — brighter glass, ringed in the accent. */
.${P}-won {
  background: rgba(255, 255, 255, 0.2);
  box-shadow: var(--panel-shadow), inset 0 0 0 calc(2px * var(--scale)) var(--accent);
}
.${P}-won .${P}-nominee-detail {
  color: var(--accent);
}

.${P}-out {
  opacity: 0.32;
  box-shadow: none;
}`,
  }),
);
