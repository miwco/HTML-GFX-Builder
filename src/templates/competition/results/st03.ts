// st03 "Frost Leaderboard" — the glass standings board, sibling of lt08 Frosted Card. Each row
// is its own frosted tile with the position in an accent ring, which is what makes it read as a
// leaderboard rather than a league table: the eye goes to the ranking, not the columns. The
// FINAL state rings the leader instead of filling it.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  P,
  STANDINGS_FIELDS,
  STANDINGS_RUNTIME_JS,
  boardStructureCss,
  defineResultsVariant,
  standingsMarkup,
} from './shared';

export const st03: TemplateVariant = defineResultsVariant(
  {
    id: 'st03',
    category: 'results-board',
    name: 'Frost Leaderboard',
    styleTag: 'glass',
    description: 'A frosted leaderboard: ranked glass tiles with the position in an accent ring.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Title', sample: 'LEADERBOARD' },
      { title: 'Subtitle', sample: 'AFTER ROUND 4' },
    ],
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-bloom', 'comp-rise'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Leaderboard',
    description:
      'The glass leaderboard: frosted, softly-rounded row tiles with each position in an ' +
      'accent ring, any columns the operator declares, and an accent ring on the leader once ' +
      'the standings are final.',
    uicolor: '2',
  },
  (o) => ({
    html: standingsMarkup(o),
    fields: compFieldsFor(STANDINGS_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: STANDINGS_RUNTIME_JS,
    css: `${boardStructureCss()}

/* The board — a frosted panel holding frosted rows. */
.${P}-box {
  display: flex;
  flex-direction: column;
  gap: calc(16px * var(--scale));
  padding: calc(24px * var(--scale)) calc(26px * var(--scale)) calc(26px * var(--scale));
  background: var(--panel-bg);
  backdrop-filter: var(--panel-blur);
  -webkit-backdrop-filter: var(--panel-blur);
  border-radius: var(--panel-radius);
  box-shadow: var(--panel-shadow), var(--panel-keyline);
  min-width: calc(680px * var(--scale));
}

/* The accent — a soft rule under the heading. */
.${P}-accent {
  height: var(--accent-weight);
  border-radius: 999px;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--accent) 85%, transparent),
    color-mix(in srgb, var(--accent) 10%, transparent));
  transform-origin: left center;
}

/* The heading. */
.${P}-title {
  font-size: calc(32px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.06;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

.${P}-kicker {
  font-family: var(--font-label);
  font-size: calc(14px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* The column headers. */
.${P}-col {
  font-size: calc(12px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* Each row is its own frosted tile. */
.${P}-row {
  padding: calc(10px * var(--scale)) calc(16px * var(--scale));
  border-radius: calc(14px * var(--scale));
  background: rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}

/* The position sits in a ring — the leaderboard's signature. */
.${P}-row-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(34px * var(--scale));
  height: calc(34px * var(--scale));
  border-radius: 999px;
  box-shadow: inset 0 0 0 calc(2px * var(--scale)) color-mix(in srgb, var(--accent) 70%, transparent);
  font-size: calc(15px * var(--scale) * var(--type-scale));
  font-weight: 700;
  color: var(--accent);
}

.${P}-row-name {
  font-size: calc(23px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.12;
  color: var(--text-color);
}

.${P}-cell {
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 600;
  color: var(--text-dim);
}

.${P}-cell:last-child {
  color: var(--text-color);
  font-weight: var(--display-weight);
}

/* ── The highlight and the final mark (machine states, never data writes). ── */

.${P}-spotlit .${P}-row {
  opacity: 0.45;
}

.${P}-spotlit .${P}-row-on {
  opacity: 1;
  background: rgba(255, 255, 255, 0.18);
  box-shadow: inset 0 0 0 calc(2px * var(--scale)) var(--accent);
}

/* FINAL — the leader is ringed in the accent and its position chip fills. */
.${P}-final .${P}-row:first-child {
  box-shadow: inset 0 0 0 calc(2px * var(--scale)) var(--accent);
}
.${P}-final .${P}-row:first-child .${P}-row-index {
  background: var(--accent);
  /* A HARD dark ink, not var(--accent-ink): the glass family resolves that token to
     var(--panel-bg), which in a glass palette is a translucent white — light type on a light
     accent fill, which is unreadable. Anything sitting ON the accent here says so itself. */
  color: #08101a;
}
.${P}-final .${P}-kicker::after {
  content: " · FINAL";
  color: var(--accent);
}`,
  }),
);
