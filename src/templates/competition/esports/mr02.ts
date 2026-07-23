// mr02 "House Maps" — the NoaCG map indicator, sibling of es02 House Series and ig08 House
// Schedule. The house void card: mono row numbers, display map names, and an amber cursor
// block on the map being played. Won maps are marked with the side's short name; the amber
// keyline under a won row is the house's way of saying "this one is settled".

import { fontById, labelFontFaceCss } from '../../../model/fonts';
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

export const mr02: TemplateVariant = defineEsportsVariant(
  {
    id: 'mr02',
    category: 'esports-score',
    name: 'House Maps',
    styleTag: 'noacg',
    description: 'The house map card: void rows, mono numbers, an amber cursor on the live map.',
    maxLines: 1,
    suggestedLines: [{ title: 'Series title', sample: 'BEST OF 5 · GRAND FINAL' }],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-right',
  },
  {
    name: 'House Maps',
    description:
      'The NoaCG map indicator: a void blur card with an amber top edge, mono row numbers, ' +
      'the winning side marked on each played map, and an amber cursor block on the map ' +
      'being played.',
    uicolor: '4',
  },
  (o) => ({
    html: mapMarkup(o),
    fields: compFieldsFor(MAP_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: MAP_RUNTIME_JS,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

${mapStructureCss()}

/* The card — the house void with its amber top edge. */
.${P}-box {
  display: flex;                   /* head above the map list */
  flex-direction: column;          /* stacked */
  gap: calc(14px * var(--scale));
  padding: calc(18px * var(--scale)) calc(22px * var(--scale)) calc(20px * var(--scale));
  background: var(--panel-bg);
  backdrop-filter: var(--panel-blur);
  -webkit-backdrop-filter: var(--panel-blur);
  box-shadow: var(--panel-shadow);
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
  min-width: calc(360px * var(--scale));
}

/* The accent rule between the title and the maps, wearing the house glow. */
.${P}-accent {
  height: calc(2px * var(--scale));
  background: var(--accent);
  box-shadow: var(--accent-glow);
  transform-origin: left center;
}

/* The series title — house display type. */
.${P}-title {
  font-size: calc(21px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* One map row — a denser void tile with room for the cursor. */
.${P}-row {
  position: relative;
  padding: calc(8px * var(--scale)) calc(12px * var(--scale)) calc(8px * var(--scale)) calc(16px * var(--scale));
  border-radius: calc(6px * var(--scale));  /* the house chip radius */
  background: rgba(10, 12, 16, 0.55);
}

/* The map number — mono, wide-tracked, dim: the house label voice. */
.${P}-row-index {
  min-width: calc(22px * var(--scale));
  font-family: var(--font-label);
  font-size: calc(13px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
}

/* The map name. */
.${P}-row-map {
  font-size: calc(18px * var(--scale) * var(--type-scale));
  font-weight: 600;
  color: var(--text-color);
}

/* The mark — the short name of the side that took the map, in mono. */
.${P}-row-mark {
  min-width: calc(56px * var(--scale));
  font-family: var(--font-label);
  font-size: calc(13px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  color: var(--accent);
}

/* A map still to play — quiet, dot-marked. */
.${P}-open {
  opacity: 0.5;
}
.${P}-open .${P}-row-mark {
  color: var(--text-dim);
}

/* A settled row carries an amber keyline; side B's mark stays paper white. */
.${P}-won-a,
.${P}-won-b {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 28%, transparent);
}
.${P}-won-b .${P}-row-mark {
  color: var(--text-color);
}

/* The cursor — an amber block, glowing, on the map being played. */
.${P}-current {
  opacity: 1;
  background: rgba(10, 12, 16, 0.75);
}
.${P}-current::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: calc(4px * var(--scale));
  border-radius: calc(6px * var(--scale)) 0 0 calc(6px * var(--scale));
  background: var(--accent);
  box-shadow: var(--accent-glow);
}

/* Decided — the maps that were never needed fall back, and the cursor stops glowing. */
.${P}-decided .${P}-open {
  opacity: 0.22;
}
.${P}-decided .${P}-current::before {
  background: var(--text-color);
  box-shadow: none;
}`,
  }),
);
