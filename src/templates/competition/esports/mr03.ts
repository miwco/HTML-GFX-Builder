// mr03 "Round Strip" — the glass map / round indicator, drawn as a horizontal strip instead
// of a ladder: the same rows, laid side by side as game chips, so it can live along the top of
// the frame during play. Same DOM and the same runtime as mr01/mr02 — only the CSS turns the
// column into a row, which is what makes the type's one rebuild serve every shape of it.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  MAP_FIELDS,
  MAP_RUNTIME_JS,
  P,
  defineEsportsVariant,
  mapMarkup,
  mapStructureCss,
} from './shared';

export const mr03: TemplateVariant = defineEsportsVariant(
  {
    id: 'mr03',
    category: 'esports-score',
    name: 'Round Strip',
    styleTag: 'glass',
    description: 'The series as a row of game chips — for the top of the frame during play.',
    maxLines: 1,
    suggestedLines: [{ title: 'Series title', sample: 'BEST OF 5 · GRAND FINAL' }],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'top-center',
  },
  {
    name: 'Round Strip',
    description:
      'The glass round indicator: a frosted strip of game chips, one per map or round, the ' +
      'played ones marked with the side that took them and the live one carrying the accent ' +
      'cursor.',
    uicolor: '2',
  },
  (o) => ({
    html: mapMarkup(o),
    fields: compFieldsFor(MAP_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: MAP_RUNTIME_JS,
    css: `${mapStructureCss()}

/* The strip — frosted glass, softly rounded, laid across the frame. */
.${P}-box {
  display: flex;                   /* the title and the chips share one row */
  align-items: center;             /* on the strip's center line */
  gap: calc(20px * var(--scale));  /* air between the title and the chips */
  padding: calc(12px * var(--scale)) calc(22px * var(--scale));
  background: var(--panel-bg);
  backdrop-filter: var(--panel-blur);
  -webkit-backdrop-filter: var(--panel-blur);
  border-radius: var(--panel-radius);
  box-shadow: var(--panel-shadow), var(--panel-keyline);
}

/* The accent — a soft vertical seam between the title and the chips. It sits in the FLOW
   (the strip is a row), so it lands between them whatever the title's length. */
.${P}-accent {
  width: calc(2px * var(--scale));
  align-self: stretch;             /* full height of the strip's content */
  margin: calc(4px * var(--scale)) 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 60%, transparent);
  transform-origin: center;
  flex-shrink: 0;
}

/* The head keeps the title from stretching — the chips take the slack. */
.${P}-head {
  flex-shrink: 0;
}

/* The title — the glass label voice. */
.${P}-title {
  font-family: var(--font-label);
  font-size: calc(14px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* THE SHAPE CHANGE: the same rows, laid side by side as chips. */
.${P}-body {
  flex-direction: row;             /* a row of games, not a ladder */
  gap: calc(8px * var(--scale));
}

/* One game chip: number over map name, with the winner mark beneath. */
.${P}-row {
  position: relative;
  flex-direction: column;          /* the chip stacks its three parts */
  align-items: center;             /* centered in the chip */
  gap: calc(2px * var(--scale));
  min-width: calc(96px * var(--scale));
  padding: calc(7px * var(--scale)) calc(12px * var(--scale));
  border-radius: calc(10px * var(--scale));
  background: rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}

/* The game number — the chip's kicker. */
.${P}-row-index {
  font-size: calc(11px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
}

/* The map name. */
.${P}-row-map {
  flex: 0 0 auto;                  /* inside a chip the name no longer takes the slack */
  font-size: calc(15px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--text-color);
  white-space: nowrap;             /* a chip is one line by design */
}

/* The winner mark. */
.${P}-row-mark {
  min-width: 0;                    /* the chip centres it rather than right-aligning */
  text-align: center;
  font-size: calc(12px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
}

/* A game still to play. */
.${P}-open {
  opacity: 0.5;
}
.${P}-open .${P}-row-mark {
  color: var(--text-dim);
}

/* Played games take a solid glass surface; side B's mark stays white. */
.${P}-won-a,
.${P}-won-b {
  background: rgba(255, 255, 255, 0.16);
}
.${P}-won-b .${P}-row-mark {
  color: var(--text-color);
}

/* The cursor — the live game's chip is ringed in the accent. */
.${P}-current {
  opacity: 1;
  box-shadow: inset 0 0 0 calc(2px * var(--scale)) var(--accent);
}

/* Decided — unplayed games fall back and the live ring goes neutral. */
.${P}-decided .${P}-open {
  opacity: 0.22;
}
.${P}-decided .${P}-current {
  box-shadow: inset 0 0 0 calc(2px * var(--scale)) var(--text-color);
}`,
  }),
);
