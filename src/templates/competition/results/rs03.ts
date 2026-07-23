// rs03 "Clean Line-up" — the minimal roster, sibling of lt01 Hairline. No panel: the names run
// down a hairline column with their roles set small beside them, and the spotlight is an accent
// rule rather than a block. Reads as a caption over a wide shot instead of a board on top of it.

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

export const rs03: TemplateVariant = defineResultsVariant(
  {
    id: 'rs03',
    category: 'results-board',
    name: 'Clean Line-up',
    styleTag: 'minimal',
    description: 'A panel-free line-up: hairline rows, roles in small caps, a quiet spotlight.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Title', sample: 'STARTING LINE-UP' },
      { title: 'Team', sample: 'TEAM LIQUID' },
    ],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-left',
  },
  {
    name: 'Clean Line-up',
    description:
      'The quiet roster board: no panel, hairline-separated player rows with roles in small ' +
      'caps, and a spotlight said with an accent rule rather than a filled block.',
    uicolor: '7',
  },
  (o) => ({
    html: rosterMarkup(o),
    fields: compFieldsFor(ROSTER_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: ROSTER_RUNTIME_JS,
    css: `${boardStructureCss()}

/* No panel — type on a rule, with a soft scrim only where it is needed for legibility. */
.${P}-box {
  display: flex;
  flex-direction: column;
  gap: calc(16px * var(--scale));
  padding-left: calc(20px * var(--scale));
  min-width: calc(430px * var(--scale));
  text-shadow: 0 calc(2px * var(--scale)) calc(12px * var(--scale)) rgba(0, 0, 0, 0.55);
}

/* The accent — a hairline rule between the heading and the line-up. */
.${P}-accent {
  height: var(--accent-weight);
  background: var(--accent);
  transform-origin: left center;
}

/* The heading. */
.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(14px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

.${P}-title {
  font-size: calc(32px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.08;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The crest slot — plateless; empty shows nothing at all. */
.${P}-logo {
  width: calc(52px * var(--scale));
  height: calc(52px * var(--scale));
}

/* One player row — separated by a hairline instead of boxed. */
.${P}-row {
  padding: calc(7px * var(--scale)) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}

.${P}-row-index {
  min-width: calc(20px * var(--scale));
  font-size: calc(13px * var(--scale) * var(--type-scale));
  font-weight: 600;
  color: var(--text-dim);
}

.${P}-row-name {
  font-size: calc(23px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.14;
  color: var(--text-color);
}

.${P}-row-note {
  flex-shrink: 0;
  font-size: calc(12px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── The spotlight (applied by the machine's state, never by a data update). ── */

.${P}-spotlit .${P}-row {
  opacity: 0.4;
}

/* The spotlit row keeps its light and takes an accent rule under it. */
.${P}-spotlit .${P}-row-on {
  opacity: 1;
  border-bottom-color: var(--accent);
}

.${P}-spotlit .${P}-row-on .${P}-row-index,
.${P}-spotlit .${P}-row-on .${P}-row-note {
  color: var(--accent);
}`,
  }),
);
