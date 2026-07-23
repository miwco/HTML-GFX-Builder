// rs01 "Starting Line-up" — the sport roster board. The crest and team name at the top, then
// one numbered row per player with their role trailing. The operator can spotlight a player
// (the row lifts onto an accent block while the rest fall back) and move that spotlight down
// the list as the caster works through the team.

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

export const rs01: TemplateVariant = defineResultsVariant(
  {
    id: 'rs01',
    category: 'results-board',
    name: 'Starting Line-up',
    styleTag: 'sport',
    description: 'A team line-up with roles — and a spotlight the caster moves down it.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Title', sample: 'STARTING LINE-UP' },
      { title: 'Team', sample: 'TEAM LIQUID' },
    ],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-impact'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-left',
  },
  {
    name: 'Starting Line-up',
    description:
      'The sport roster board: crest and team name over a numbered line-up, each player with ' +
      'their role. A spotlit player lifts onto an accent block; the rest fall back.',
    uicolor: '5',
  },
  (o) => ({
    html: rosterMarkup(o),
    fields: compFieldsFor(ROSTER_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: ROSTER_RUNTIME_JS,
    css: `${boardStructureCss()}

/* The board — a square-cut sport panel on its hard shadow. */
.${P}-box {
  display: flex;                   /* head above the line-up */
  flex-direction: column;
  gap: calc(18px * var(--scale));
  padding: calc(22px * var(--scale)) calc(26px * var(--scale)) calc(24px * var(--scale));
  background: var(--panel-bg);
  border-radius: var(--panel-radius);
  box-shadow: var(--panel-shadow);
  min-width: calc(520px * var(--scale));
}

/* The accent rule between the heading and the line-up. */
.${P}-accent {
  height: calc(3px * var(--scale));
  background: var(--accent);
  transform-origin: left center;
}

/* The heading: the kicker above the team name. */
.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(16px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

.${P}-title {
  font-size: calc(38px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.05;
  letter-spacing: var(--display-tracking);
  text-transform: uppercase;
  color: var(--text-color);
}

/* The crest slot — a dim plate until the operator picks a file. */
.${P}-logo {
  background: rgba(255, 255, 255, 0.05);
}
.${P}-logo.has-image {
  background: transparent;
}

/* One player row. */
.${P}-row {
  position: relative;              /* anchors the spotlight block */
  padding: calc(8px * var(--scale)) calc(12px * var(--scale)) calc(8px * var(--scale)) calc(14px * var(--scale));
  background: rgba(0, 0, 0, 0.32);
}

.${P}-row-index {
  min-width: calc(22px * var(--scale));
  font-family: var(--font-label);
  font-size: calc(15px * var(--scale) * var(--type-scale));
  font-weight: 700;
  color: var(--accent);
}

.${P}-row-name {
  font-size: calc(26px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.1;
  text-transform: uppercase;
  color: var(--text-color);
}

/* The role, trailing the name. */
.${P}-row-note {
  flex-shrink: 0;
  font-family: var(--font-label);
  font-size: calc(14px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── The spotlight (applied by the machine's state, never by a data update). ── */

/* Everything that is not the spotlit player falls back. */
.${P}-spotlit .${P}-row {
  opacity: 0.45;
}

.${P}-spotlit .${P}-row-on {
  opacity: 1;
  background: rgba(0, 0, 0, 0.6);
}

/* The spotlit row wears an accent block down its left edge. */
.${P}-row-on::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: calc(5px * var(--scale));
  background: var(--accent);
}

.${P}-spotlit .${P}-row-on .${P}-row-note {
  color: var(--accent);
}`,
  }),
);
