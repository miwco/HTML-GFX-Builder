// br02 "House Bracket" — the NoaCG knockout tree, sibling of st02 House Standings. Void tie
// tiles with mono round labels, an amber cursor on the round being played, and an amber
// champion chip. Same grouping runtime as br01: the operator types ties, the board finds the
// rounds.

import { fontById, labelFontFaceCss } from '../../../model/fonts';
import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  BRACKET_FIELDS,
  BRACKET_RUNTIME_JS,
  P,
  boardStructureCss,
  bracketBodyCss,
  bracketMarkup,
  defineResultsVariant,
} from './shared';

export const br02: TemplateVariant = defineResultsVariant(
  {
    id: 'br02',
    category: 'results-board',
    name: 'House Bracket',
    styleTag: 'noacg',
    description: 'The house knockout tree: void ties, mono rounds, an amber cursor and crown.',
    maxLines: 1,
    suggestedLines: [{ title: 'Title', sample: 'PLAYOFF BRACKET' }],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Bracket',
    description:
      'The NoaCG playoff bracket: a void blur panel with an amber top edge, mono round labels ' +
      'over void tie tiles, an amber cursor on the live round, and an amber champion chip.',
    uicolor: '4',
  },
  (o) => ({
    html: bracketMarkup(o),
    fields: compFieldsFor(BRACKET_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: BRACKET_RUNTIME_JS,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

${boardStructureCss()}

${bracketBodyCss()}

/* The board — the house void with its amber top edge. */
.${P}-box {
  display: flex;
  flex-direction: column;
  gap: calc(18px * var(--scale));
  padding: calc(20px * var(--scale)) calc(24px * var(--scale)) calc(24px * var(--scale));
  background: var(--panel-bg);
  backdrop-filter: var(--panel-blur);
  -webkit-backdrop-filter: var(--panel-blur);
  box-shadow: var(--panel-shadow);
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
}

/* The accent rule under the heading, wearing the house glow. */
.${P}-accent {
  height: calc(2px * var(--scale));
  background: var(--accent);
  box-shadow: var(--accent-glow);
  transform-origin: left center;
}

/* The heading. */
.${P}-title {
  font-size: calc(30px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.06;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The champion chip — amber ink on the void, only rendered once there is a champion. */
.${P}-champion {
  padding: calc(5px * var(--scale)) calc(14px * var(--scale));
  border-radius: calc(6px * var(--scale));
  background: var(--accent);
  color: var(--accent-ink);
  box-shadow: var(--accent-glow);
  font-family: var(--font-label);
  font-size: calc(14px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
}

/* The round label — mono, wide-tracked. */
.${P}-round-name {
  font-family: var(--font-label);
  font-size: calc(12px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-dim);
}

/* One tie — a void tile with a quiet left edge. */
.${P}-tie {
  padding: calc(9px * var(--scale)) calc(13px * var(--scale));
  border-radius: calc(6px * var(--scale));
  background: rgba(10, 12, 16, 0.55);
  border-left: calc(3px * var(--scale)) solid rgba(255, 255, 255, 0.1);
}

.${P}-tie-side {
  font-size: calc(18px * var(--scale) * var(--type-scale));
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-color);
  font-variant-numeric: tabular-nums;
}

.${P}-tie-side + .${P}-tie-side {
  color: var(--text-dim);
}

/* ── The cursor and the crown (machine states, never data writes). ── */

.${P}-round-on .${P}-round-name {
  color: var(--accent);
}

.${P}-round-on .${P}-tie {
  background: rgba(10, 12, 16, 0.8);
  border-left-color: var(--accent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 28%, transparent);
}

.${P}-crowned .${P}-round:not(:last-child) {
  opacity: 0.45;
}

.${P}-crowned .${P}-round:last-child .${P}-tie {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent), var(--accent-glow);
}`,
  }),
);
