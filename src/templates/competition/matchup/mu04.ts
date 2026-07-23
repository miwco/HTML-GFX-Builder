// mu04 "Clean Match-up" — the minimal match-up, sibling of lt01 Hairline. No panels and no
// stage wash: the two names sit either side of a hairline seam over whatever is behind the
// graphic, and the pick is said with a rule and a small caps mark rather than a colour flood.
// The analytical prediction card — for a desk segment that wants the picture to stay visible.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  MATCHUP_FIELDS,
  MATCHUP_RUNTIME_JS,
  P,
  defineMatchupVariant,
  matchupMarkup,
  matchupStructureCss,
} from './shared';

export const mu04: TemplateVariant = defineMatchupVariant(
  {
    id: 'mu04',
    category: 'matchup',
    name: 'Clean Match-up',
    styleTag: 'minimal',
    description: 'Two names either side of a hairline seam — the pick is a rule, not a flood.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Side A', sample: 'TEAM LIQUID' },
      { title: 'Side B', sample: 'NAVI' },
      { title: 'Event line', sample: 'GRAND FINAL · BEST OF 5' },
    ],
    logo: 'none',
    animationPresets: ['comp-rise', 'comp-bloom', 'comp-impact'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Clean Match-up',
    description:
      'The quiet match-up card: no panel, a hairline accent seam between two names, notes in ' +
      'small caps, and a picked winner marked by an accent underline rather than a fill.',
    uicolor: '7',
  },
  (o) => ({
    html: matchupMarkup(o),
    fields: compFieldsFor(MATCHUP_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: MATCHUP_RUNTIME_JS,
    css: `${matchupStructureCss()}

/* The stage — barely there: just enough scrim to keep white type legible over video. */
.${P}-box {
  background: linear-gradient(180deg,
    rgba(6, 8, 12, 0.5) 0%,
    rgba(6, 8, 12, 0.72) 100%);
}

/* The accent seam — a hairline down the middle. */
.${P}-accent {
  position: absolute;
  left: calc(50% - calc(var(--accent-weight) / 2));
  top: 34%;
  bottom: 34%;
  width: var(--accent-weight);     /* the family's hairline weight */
  background: var(--accent);
  transform-origin: center;
}

/* The event line — small caps, wide-tracked, dim. */
.${P}-event {
  font-family: var(--font-label);
  font-size: calc(18px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* The competitor name — quiet display type, generously sized. */
.${P}-name {
  font-size: calc(60px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.04;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The note under the name. */
.${P}-note {
  font-size: calc(15px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* The VS mark — set, not boxed. */
.${P}-vs {
  font-size: calc(22px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.24em;
  line-height: 1;
  color: var(--text-dim);
}

/* The crest slot — no plate at all; an empty one simply shows nothing. */
.${P}-logo {
  width: calc(110px * var(--scale));
  height: calc(110px * var(--scale));
}

/* The verdict mark — the accent's colour, said in small caps. */
.${P}-verdict {
  font-size: calc(14px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.24em;
  color: var(--accent);
}

/* ── The pick (applied by the machine's states, never by a data update). ── */

/* The winner takes an accent underline — the quietest way to name one. A border rather
   than a shadow: the name sits in an overflow-hidden mask, which would clip a shadow. */
.${P}-win .${P}-name {
  border-bottom: calc(4px * var(--scale)) solid var(--accent);
  padding-bottom: calc(6px * var(--scale));
}

.${P}-lose {
  opacity: 0.42;
}

/* Locked — the seam runs the full height of the card. */
.${P}-locked .${P}-accent {
  top: 24%;
  bottom: 24%;
}`,
  }),
);
