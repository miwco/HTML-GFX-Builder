// lt44 "Stat Strip" — the five-input sport strap: a player, a club line, and then three stat cells
// laid out as a ROW rather than a stack. Five stacked lines would be a wall of text at matchday
// sizes; three short cells side by side read at a glance, which is the whole point of a stat
// graphic.
//
// It hand-builds its line markup instead of calling the shared `lineMasks` helper, because the
// first two lines and the stat cells live in different containers. The markup each line emits is
// the standard contract's, element for element, so every preset, the timeline, the canvas registry
// and steps mode treat these lines exactly like any other design's.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineClass } from './shared';

export const lt44: TemplateVariant = defineVariant(
  {
    id: 'lt44',
    category: 'lower-third',
    name: 'Stat Strip',
    styleTag: 'sport',
    description: 'Player and club over a row of three stat cells — five inputs, one glance.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Player', sample: 'JAKE MORRISON' },
      { title: 'Club', sample: 'NORTHGATE TITANS' },
      { title: 'Stat 1', sample: '24 PTS' },
      { title: 'Stat 2', sample: '11 AST' },
      { title: 'Stat 3', sample: '3 STL' },
    ],
    logo: 'none',
    animationPresets: ['snap-stinger', 'mask-wipe', 'slide-right', 'pop-spring', 'fade'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Stat Strip',
    description:
      'The five-input matchday strap: the player name, the club, and three stat cells in a row ' +
      'under an accent bar — points, assists, steals; laps, splits, position; sets, aces, breaks. ' +
      'Reveal the stats on a Continue to land them one at a time. Sibling of lt07 Number Badge.',
    uicolor: '7',
  },
  (o) => {
    // The standard contract's line markup, built per line so the head lines and the stat
    // cells can live in different containers. Identical output to shared/standard.ts's
    // lineMasks — same mask div, same span id and class — so nothing downstream can tell.
    const mask = (index: number, indent: string): string => {
      const line = o.lines[index];
      return (
        `${indent}<!-- ${line.title} (f${index}) — SPX writes this field's value straight into the element. -->\n` +
        `${indent}<div class="lower-third-mask"><span id="f${index}" class="${lineClass(index)}">${line.sample}</span></div>`
      );
    };
    const headLines = o.lines.slice(0, 2).map((_, i) => mask(i, '        ')).join('\n');
    const statCells = o.lines.slice(2).map((_, i) => mask(i + 2, '        ')).join('\n');

    return {
      html: `    <!-- Stat Strip: [accent bar] | [player / club] over [a row of stat cells]. -->
    <div class="lower-third-box">
      <div class="lower-third-accent"></div>
      <div class="lower-third-body">
        <div class="lower-third-head">
${headLines}
        </div>${
          statCells
            ? `
        <div class="lower-third-stats">
${statCells}
        </div>`
            : ''
        }
      </div>
    </div>`,

      css: `/* The slab — bar and body fused, zero radius, one hard offset shadow. */
.lower-third-box {
  display: flex;                   /* bar and body sit side by side */
  align-items: stretch;            /* the bar runs the slab's full height */
  background: var(--panel-bg);     /* dark panel behind everything */
  box-shadow: var(--panel-shadow);  /* the family's hard offset lift */
}

/* The accent bar — the family's heavy leading bar. */
.lower-third-accent {
  flex: none;                      /* never squeezed by long text */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the accent used boldly, sport-style */
  will-change: transform;          /* hint the browser: presets animate this bar */
}

/* The body — the head lines above, the stat row below. */
.lower-third-body {
  min-width: 0;                    /* lets a long unbroken name wrap instead of overflowing */
  padding: calc(16px * var(--scale)) calc(34px * var(--scale)) calc(16px * var(--scale)) calc(26px * var(--scale));
}

/* Player (f0) — the heaviest line on the slab. */
.lower-third-name {
  font-size: calc(44px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.04;               /* big display text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* the matchday voice */
  color: var(--text-color);        /* primary text */
}

/* Club (f1) — tracked caps in the accent colour. */
.lower-third-title {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 600;                /* tracked caps need weight to stay crisp */
  line-height: 1.2;                /* a touch more air than the headline */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* matches the headline's voice */
  color: var(--accent);            /* the one place the accent appears in the type */
  margin-top: calc(4px * var(--scale));  /* player + club read as one unit */
}

/* The stat row — three short cells side by side, divided by hairlines. A ROW is what
   makes five inputs readable: stacked, they would be a wall of text at these sizes. */
.lower-third-stats {
  display: flex;                   /* the cells sit side by side */
  flex-wrap: wrap;                 /* a very wide stat still wraps rather than overflowing */
  margin-top: calc(14px * var(--scale));  /* air below the club line */
  padding-top: calc(12px * var(--scale));  /* …and above the cells */
  border-top: 1px solid color-mix(in srgb, var(--text-color) 18%, transparent);  /* divides head from stats */
}

/* Each stat cell (f2, f3, f4) — condensed caps, evenly spaced, divided by a hairline. */
.lower-third-stats .lower-third-mask + .lower-third-mask {
  margin-left: calc(20px * var(--scale));  /* the gap between cells */
  padding-left: calc(20px * var(--scale));  /* …with the divider inside it */
  border-left: 1px solid color-mix(in srgb, var(--text-color) 18%, transparent);  /* cell divider */
}
.lower-third-extra {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* readable at a glance from the sofa */
  font-weight: 600;                /* the numbers carry weight; the labels beside them do not */
  line-height: 1.2;                /* single tight cell line */
  letter-spacing: 0.02em;          /* numerals need less tracking than caps */
  text-transform: uppercase;       /* keeps the row uniform */
  color: var(--text-color);        /* full strength — a stat the viewer is meant to read */
}`,
      hasAccent: true,
    };
  },
);
