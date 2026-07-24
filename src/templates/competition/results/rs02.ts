// rs02 "House Roster" — the NoaCG line-up board, sibling of ig08 House Schedule. Void rows
// with mono numbers and roles, an amber rule under the heading, and an amber-glowing block on
// the spotlit player. Same runtime and same rows as every roster design — the house look is
// the only thing that differs, which is the point of a type owning its rebuild.

import { fontById, labelFontFaceCss } from '../../../model/fonts';
import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  P,
  ROSTER_FIELDS,
  ROSTER_RUNTIME_JS,
  boardStructureCss,
  defineResultsVariant,
  rosterMarkup,
} from './shared';

export const rs02: TemplateVariant = defineResultsVariant(
  {
    id: 'rs02',
    category: 'results-board',
    name: 'House Roster',
    styleTag: 'noacg',
    description: 'The house line-up: void rows, mono roles, an amber spotlight block.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Title', sample: 'STARTING LINE-UP' },
      { title: 'Team', sample: 'TEAM LIQUID' },
    ],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-left',
  },
  {
    name: 'House Roster',
    description:
      'The NoaCG line-up board: a void blur panel with an amber top edge, mono player numbers ' +
      'and roles, and an amber-glowing block marking the spotlit player.',
    uicolor: '4',
  },
  (o) => ({
    html: rosterMarkup(o),
    fields: compFieldsFor(ROSTER_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: ROSTER_RUNTIME_JS,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

${boardStructureCss()}

/* The board — the house void with its amber top edge. */
.${P}-box {
  display: flex;
  flex-direction: column;
  gap: calc(18px * var(--scale));
  padding: calc(20px * var(--scale)) calc(24px * var(--scale)) calc(22px * var(--scale));
  background: var(--panel-bg);
  backdrop-filter: var(--panel-blur);
  -webkit-backdrop-filter: var(--panel-blur);
  box-shadow: var(--panel-shadow);
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
  min-width: calc(500px * var(--scale));
}

/* The accent rule under the heading, wearing the house glow. */
.${P}-accent {
  height: calc(2px * var(--scale));
  background: var(--accent);
  box-shadow: var(--accent-glow);
  transform-origin: left center;
}

/* The heading. */
.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(14px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

.${P}-title {
  font-size: calc(34px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.06;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The crest slot — a void plate until a file lands in it. */
.${P}-logo {
  border-radius: calc(6px * var(--scale));
  background: rgba(10, 12, 16, 0.55);
  padding: calc(8px * var(--scale));
}
.${P}-logo.has-image {
  background: transparent;
}

/* One player row — a denser void tile. */
.${P}-row {
  position: relative;
  padding: calc(8px * var(--scale)) calc(12px * var(--scale)) calc(8px * var(--scale)) calc(14px * var(--scale));
  border-radius: calc(6px * var(--scale));
  background: rgba(10, 12, 16, 0.5);
}

.${P}-row-index {
  min-width: calc(24px * var(--scale));
  font-family: var(--font-label);
  font-size: calc(13px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  color: var(--accent);
}

.${P}-row-name {
  font-size: calc(24px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.12;
  color: var(--text-color);
}

.${P}-row-note {
  flex-shrink: 0;
  font-family: var(--font-label);
  font-size: calc(12px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── The spotlight (applied by the machine's state, never by a data update). ── */

.${P}-spotlit .${P}-row {
  opacity: 0.42;
}

.${P}-spotlit .${P}-row-on {
  opacity: 1;
  background: rgba(10, 12, 16, 0.78);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);
}

.${P}-row-on::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: calc(4px * var(--scale));
  border-radius: calc(6px * var(--scale)) 0 0 calc(6px * var(--scale));
  background: var(--accent);
  box-shadow: var(--accent-glow);
}`,
  }),
);
