// mr01 "Map Ladder" — the sport map / round indicator. The series as a ladder: one row per
// map, numbered, with the short name of whichever side took it on the right. The map being
// played carries the cursor (an accent block down its left edge); maps still to come stay
// open. When the series is decided the unplayed maps drop away.

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

export const mr01: TemplateVariant = defineEsportsVariant(
  {
    id: 'mr01',
    category: 'esports-score',
    name: 'Map Ladder',
    styleTag: 'sport',
    description: 'The series as a ladder: every map, who took it, and where play is now.',
    maxLines: 1,
    suggestedLines: [{ title: 'Series title', sample: 'BEST OF 5 · GRAND FINAL' }],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-impact'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-right',
  },
  {
    name: 'Map Ladder',
    description:
      'The sport map indicator: a numbered ladder of the series, the winning side marked on ' +
      'each played map, and an accent cursor on the map being played. The rows are rebuilt ' +
      'from a source field, so the cascade is measured from the data.',
    uicolor: '5',
  },
  (o) => ({
    html: mapMarkup(o),
    fields: compFieldsFor(MAP_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: MAP_RUNTIME_JS,
    css: `${mapStructureCss()}

/* The card — a square-cut sport panel on its hard shadow. */
.${P}-box {
  display: flex;                   /* head above the ladder */
  flex-direction: column;          /* stacked */
  gap: calc(14px * var(--scale));  /* air under the title */
  padding: calc(18px * var(--scale)) calc(24px * var(--scale)) calc(20px * var(--scale));
  background: var(--panel-bg);
  border-radius: var(--panel-radius);  /* sport: square */
  box-shadow: var(--panel-shadow);
  min-width: calc(360px * var(--scale));
}

/* The accent rule between the title and the ladder. */
.${P}-accent {
  height: calc(3px * var(--scale));
  background: var(--accent);
  transform-origin: left center;   /* the rise/cascade presets draw it out from the left */
}

/* The series title. */
.${P}-title {
  font-size: calc(22px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  letter-spacing: var(--display-tracking);
  text-transform: uppercase;
  color: var(--text-color);
}

/* One map row — a dark tile, with room on the left for the cursor block. */
.${P}-row {
  position: relative;              /* anchors the cursor block */
  padding: calc(8px * var(--scale)) calc(12px * var(--scale)) calc(8px * var(--scale)) calc(16px * var(--scale));
  background: rgba(0, 0, 0, 0.35);
}

/* The map number — dim, tabular, the ladder's spine. */
.${P}-row-index {
  min-width: calc(20px * var(--scale));  /* two-digit series still line up */
  font-family: var(--font-label);
  font-size: calc(14px * var(--scale) * var(--type-scale));
  font-weight: 600;
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
}

/* The map name. */
.${P}-row-map {
  font-size: calc(19px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--text-color);
}

/* The mark — the short name of the side that took the map. */
.${P}-row-mark {
  min-width: calc(52px * var(--scale));
  font-family: var(--font-label);
  font-size: calc(15px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
}

/* A map still to play — quiet, and its mark is only a dot. */
.${P}-open {
  opacity: 0.55;
}
.${P}-open .${P}-row-mark {
  color: var(--text-dim);
}

/* Won maps: side A takes the accent, side B the paper white — so a glance reads the ladder. */
.${P}-won-b .${P}-row-mark {
  color: var(--text-color);
}

/* The cursor — the map being played wears an accent block down its left edge. */
.${P}-current {
  opacity: 1;                      /* an unplayed current map is still the loud one */
  background: rgba(0, 0, 0, 0.55);
}
.${P}-current::before {
  content: "";                     /* the cursor block itself */
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: calc(5px * var(--scale));
  background: var(--accent);
}

/* Decided — the maps that were never needed drop away entirely. */
.${P}-decided .${P}-open {
  opacity: 0.25;
}
.${P}-decided .${P}-current::before {
  background: var(--text-color);   /* the cursor stops meaning "in progress" */
}`,
  }),
);
