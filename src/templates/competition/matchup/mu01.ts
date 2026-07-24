// mu01 "Match-up Slam" — the sport match-up, sibling of vs01. Two columns meet either side of
// an accent VS slab on a dark stage; each side carries its crest, name and seed note. When the
// operator picks a winner that column lifts and takes the accent, the other falls back, and
// the WINNER mark appears under the name. Locking dims the pick's controls-visible finality
// into the graphic: the seam goes solid.

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

export const mu01: TemplateVariant = defineMatchupVariant(
  {
    id: 'mu01',
    category: 'matchup',
    name: 'Match-up Slam',
    styleTag: 'sport',
    description: 'Two sides meet around an accent VS slab — then one is picked as the winner.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Side A', sample: 'TEAM LIQUID' },
      { title: 'Side B', sample: 'NAVI' },
      { title: 'Event line', sample: 'GRAND FINAL · BEST OF 5' },
    ],
    logo: 'none',
    animationPresets: ['comp-impact', 'comp-bloom', 'comp-rise'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Match-up Slam',
    description:
      'The sport match-up card: two crest-and-name columns either side of an accent VS slab ' +
      'on a dark stage, with seed notes beneath. A picked winner lifts and takes the accent; ' +
      'the locked pick fuses the seam.',
    uicolor: '5',
  },
  (o) => ({
    html: matchupMarkup(o),
    fields: compFieldsFor(MATCHUP_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: MATCHUP_RUNTIME_JS,
    css: `${matchupStructureCss()}

/* The stage — a dark wash so the two sides read whatever is behind the graphic. */
.${P}-box {
  background: radial-gradient(120% 90% at 50% 45%,
    rgba(10, 12, 16, 0.86) 0%,
    rgba(6, 7, 10, 0.96) 60%,
    rgba(4, 5, 7, 0.99) 100%);
}

/* The accent seam — a vertical accent bar the two sides meet on. */
.${P}-accent {
  position: absolute;              /* pinned down the frame's middle */
  left: calc(50% - calc(var(--accent-weight) / 2));
  top: 24%;                        /* stops short of the frame, top and bottom */
  bottom: 24%;
  width: var(--accent-weight);
  background: linear-gradient(180deg,
    transparent,
    var(--accent) 25%,
    var(--accent) 75%,
    transparent);                  /* fades out at both ends */
  transform-origin: center;
}

/* The event line — sport label voice, above the match-up. */
.${P}-event {
  font-family: var(--font-label);
  font-size: calc(24px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* The competitor name — the loudest type on the card. */
.${P}-name {
  font-size: calc(72px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1;
  letter-spacing: var(--display-tracking);
  text-transform: uppercase;
  color: var(--text-color);
}

/* The seed / record note under the name. */
.${P}-note {
  font-family: var(--font-label);
  font-size: calc(18px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* The VS slab in the corridor between the columns. */
.${P}-vs {
  padding: calc(8px * var(--scale)) calc(18px * var(--scale));
  background: var(--accent);
  color: var(--accent-ink);
  font-size: calc(38px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1;
  letter-spacing: 0.04em;
}

/* The logo slot — a dim plate until a crest lands in it. */
.${P}-logo {
  background: rgba(255, 255, 255, 0.05);
}
.${P}-logo.has-image {
  background: transparent;
}

/* The verdict mark — only ever rendered on the winning column. */
.${P}-verdict {
  padding: calc(4px * var(--scale)) calc(14px * var(--scale));
  background: var(--accent);
  color: var(--accent-ink);
  font-family: var(--font-label);
  font-size: calc(17px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.2em;
}

/* ── The pick (applied by the machine's states, never by a data update). ── */

/* The winning column lifts and its name takes the accent. */
.${P}-win .${P}-name {
  color: var(--accent);
}

/* The other column falls back — beaten, not erased. */
.${P}-lose {
  opacity: 0.45;
}

/* Locked — the seam fuses into a solid bar: the pick is final. */
.${P}-locked .${P}-accent {
  background: var(--accent);
  top: 18%;
  bottom: 18%;
}`,
  }),
);
