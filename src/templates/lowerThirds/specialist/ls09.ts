// ls09 "Player Stats" — the player strap that carries a stat line.
//
// The graphic a broadcast cuts to during a replay or a substitution: who the player is, and
// the three numbers that justify showing them. The numbers are the content — the name is the
// caption on them — so the composition inverts the usual strap: a compact name row on top and
// a wide stat rail beneath it, the rail divided into equal cells so three figures of
// different lengths still line up.
//
// Each stat is its OWN SPX field. That is the difference between a stat strap and a lower
// third with a long subtitle: an operator retypes one cell between plays without touching the
// other two, and the design can set every cell in tabular figures so nothing shifts when 9
// becomes 10.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { TABULAR_FIGURES, hasLine, slot } from './shared';

export const ls09: TemplateVariant = defineVariant(
  {
    id: 'ls09',
    category: 'lower-third',
    name: 'Player Stats',
    styleTag: 'sport',
    description: 'A compact player name over a rail of three equal stat cells.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Player', sample: 'JAKE MORRISON' },
      { title: 'Club', sample: 'Northgate United' },
      { title: 'Stat 1', sample: '24 PTS' },
      { title: 'Stat 2', sample: '11 AST' },
      { title: 'Stat 3', sample: '38 MIN' },
    ],
    logo: 'none',
    // The rail wipes open left to right, so the cells arrive in reading order — which is the
    // order a commentator reads them out in.
    animationPresets: ['mask-wipe', 'snap-stinger', 'slide-left', 'fade', 'slide-up', 'pop-spring'],
    defaultPalette: paletteById('royal'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Player Stats',
    description:
      'The replay strap: a compact name-and-club row over a rail of three equal stat cells. ' +
      'Each stat is an independent SPX field set in tabular figures, so a cell can be ' +
      'retyped between plays and a figure gaining a digit never shifts the ones beside it. ' +
      'Remove cells and the rail closes up around the ones that are left.',
    uicolor: '3',
  },
  (o) => {
    const stats = [2, 3, 4].filter((i) => hasLine(o, i));
    const statRail = stats.length
      ? `
      <!-- The stat rail: one cell per figure, each an independent field. -->
      <div class="lower-third-stats">
${stats.map((i) => slot(o, i, 'lower-third-stat', '        ')).join('\n')}
      </div>`
      : '';

    return {
      html: `    <!-- The slab: [name · club row] over [the stat rail]. -->
    <div class="lower-third-box">
      <div class="lower-third-head">
        <div class="lower-third-accent"></div>
${slot(o, 0, 'lower-third-name', '        ')}
${slot(o, 1, 'lower-third-title', '        ')}
      </div>${statRail}
    </div>`,

      css: `/* The slab — flat, zero radius: the sport family's surface. */
.lower-third-box {
  background: var(--panel-bg);      /* the flat dark slab */
  box-shadow: var(--panel-shadow);  /* the family's hard lift */
  width: fit-content;               /* the rail below decides the width */
}

/* The name row — compact, because the numbers below are the reason the strap is up. */
.lower-third-head {
  display: flex;                    /* accent tick · name · club, in a row */
  align-items: baseline;            /* one shared baseline across the row */
  gap: calc(14px * var(--scale));
  padding: calc(13px * var(--scale)) calc(26px * var(--scale)) calc(14px * var(--scale));
  min-width: 0;                     /* allow shrinking rather than pushing the slab wide */
}

/* The accent tick leading the name — the graphic's accent NODE, so line-reveal and the
   step reveals have a real element to address. */
.lower-third-accent {
  align-self: center;               /* centred on the row, not on the baseline */
  flex: none;                       /* never squeezed by a long name */
  width: var(--accent-weight);      /* the family's bar weight */
  height: calc(26px * var(--scale));  /* as tall as the name it introduces */
  background: var(--accent);        /* the one accent surface */
  transform-origin: center;         /* line-reveal scales it from the middle */
}

/* The player name — the row's primary voice, but small next to a real headline: the
   figures below are what the strap is for. */
.lower-third-name {
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* compact headline (1080p reference) */
  line-height: 1.05;                /* condensed caps sit tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;        /* matchday voice */
  color: var(--text-color);         /* primary text color */
}

/* The club — the quiet half of the row. */
.lower-third-title {
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* well under the name */
  line-height: 1.2;                 /* single tight row */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* keeps the row uniform */
  color: var(--label-color);        /* the family's label color */
}
.lower-third-head > .lower-third-mask {
  display: flex;                    /* each value hugs its own text… */
  min-width: 0;                     /* …and may shrink */
}

/* ── The stat rail ──
   Equal cells, not content-sized ones. This is the one place in the pack where a symmetric
   grid is right: three figures of different lengths must line up as a table, and a cell that
   tracked its own text would put "9 REB" and "112 YDS" on different rhythms. */
.lower-third-stats {
  display: grid;                    /* the cells sit in a row… */
  grid-auto-flow: column;           /* …as columns */
  grid-auto-columns: minmax(calc(112px * var(--scale)), 1fr);  /* EQUAL cells — a stat table, not a sentence */
  border-top: 1px solid rgba(255, 255, 255, 0.12);  /* the rail's own edge */
  background: rgba(0, 0, 0, 0.30);  /* a shade darker than the slab — a rail, not a stripe */
}

/* One stat cell. */
.lower-third-stat {
  display: block;                   /* fills its cell */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* the figures are the content */
  line-height: 1.1;                 /* single tight figure row */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* 24 PTS, whatever the operator types */
  ${TABULAR_FIGURES}
  color: var(--text-color);         /* primary text color — the numbers lead */
  text-align: center;               /* centred in its own cell */
}
.lower-third-stats > .lower-third-mask {
  padding: calc(10px * var(--scale)) calc(16px * var(--scale)) calc(12px * var(--scale));
}
.lower-third-stats > .lower-third-mask + .lower-third-mask {
  border-left: 1px solid rgba(255, 255, 255, 0.12);  /* the cell divider — drawn, and only between */
}`,
      hasAccent: true,
      tokens: { labelColor: 'var(--text-dim)' },
    };
  },
);
