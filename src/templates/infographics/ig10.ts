// ig10 "Volt Schedule" — the SPORT agenda board, sibling of lt06 "Split Bar" / card02 "Slab
// Card". A solid dark slab holding a running order: a heavy accent caps heading over an accent
// rule, then time/show rows with heavy condensed times and an accent block marker. Same
// schedule rebuild as ig06 (dataRuntimes.ts), in the sport skin.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineInfographicVariant } from './shared';
import { scheduleRowsRuntimeJs } from './dataRuntimes';

const ROWS_SAMPLE = '13:00 | HEAT ONE\n14:30 | SEMI FINALS\n16:00 | GRAND FINAL';

export const ig10: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig10',
    category: 'infographic',
    name: 'Volt Schedule',
    styleTag: 'sport',
    description: 'A solid sport slab running order: heavy condensed times against show names.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Schedule', sample: ROWS_SAMPLE },
      { title: 'Heading', sample: 'ORDER OF PLAY' },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Volt Schedule',
    description:
      'The sport running order, sibling of lt06 Split Bar and card02 Slab Card: a solid dark ' +
      'slab with a heavy accent caps heading over an accent rule, and time/show rows with ' +
      'heavy condensed tabular times and an accent block marker. Type one "time | show" line ' +
      'per row; rows-cascade rises them in.',
    uicolor: '5',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS_SAMPLE;
    const headingText = o.lines[1]?.sample || 'ORDER OF PLAY';

    return {
      html: `    <!-- Volt Schedule: solid slab — accent heading, accent rule, time/show rows. -->
    <div class="infographic-box">
      <!-- Heading — the slab's heavy accent caps kicker (SPX writes field f1 here). -->
      <div class="infographic-heading" id="f1">${headingText}</div>
      <!-- The rule — a solid accent bar under the heading (sport's bold accent). -->
      <div class="infographic-rule"></div>
      <!-- Schedule rows — rendered by rebuildInfographic() from the hidden source below. -->
      <div id="infographic-rows"></div>
    </div>
    <!-- Hidden schedule source — SPX writes field f0 here; JS renders it. One "time | show" per line. -->
    <div id="f0" style="display: none">${rowsText}</div>`,

      css: `/* The slab — a solid dark board, zero radius: the sport family's hard panel. */
.infographic-box {
  min-width: calc(560px * var(--scale));  /* a board, not a strap */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(28px * var(--scale)) calc(36px * var(--scale)) calc(12px * var(--scale));  /* generous air */
  background: var(--panel-bg);     /* the near-black slab — retints via the :root contract */
}

/* Heading — a heavy accent caps kicker (the sport family shouts its label). */
.infographic-heading {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* kicker scale — a label, not a headline */
  font-weight: 700;                /* bold so the caps carry */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* sport shouts, whatever the operator types */
  color: var(--accent);            /* the heading wears the accent */
  text-wrap: balance;              /* a long heading wraps into even rows */
}

/* The rule — a solid accent bar (sport's deliberate bold-accent moment). */
.infographic-rule {
  height: calc(4px * var(--scale));  /* a chunky sport rule, not a hairline */
  width: calc(64px * var(--scale)); /* short — a mark, not a full-width line */
  margin-top: calc(14px * var(--scale));  /* air between the caps and the rule */
  background: var(--accent);       /* the accent block under the heading */
}

/* The board — schedule rows stacked; each row carries its own separator. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one row under another */
  margin-top: calc(6px * var(--scale));  /* air between the rule and the first row */
}

/* One schedule row: [heavy time] [accent block] [show name] on a shared baseline. */
.infographic-row {
  display: flex;                   /* time, marker and show share one line */
  align-items: baseline;           /* the two text sizes sit on one baseline */
  gap: calc(22px * var(--scale));  /* clear air between time, marker and show */
  padding: calc(15px * var(--scale)) 0;  /* even vertical rhythm down the board */
}
.infographic-row + .infographic-row {
  border-top: 1px solid rgba(255, 255, 255, 0.12);  /* keyline hairline between rows */
}

/* The time — heavy condensed caps, tabular so digits line up in one column. */
.infographic-time {
  flex-shrink: 0;                  /* a long show name never squeezes the time */
  min-width: calc(104px * var(--scale));  /* one shared column width — the markers align */
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* the anchor of each row */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.1;                /* tight leading for big condensed digits */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  font-variant-numeric: tabular-nums;  /* equal-width digits — times align across rows */
  white-space: nowrap;             /* a time never wraps mid-value */
  color: var(--text-color);        /* primary text color */
}

/* The marker — a small accent block (sport draws slabs, not soft dots) between time and show. */
.infographic-dot {
  flex-shrink: 0;                  /* the marker keeps its size */
  width: calc(10px * var(--scale));  /* a small accent block… */
  height: calc(10px * var(--scale));  /* …square */
  background: var(--accent);       /* the accent dose threading the rows */
  position: relative;              /* so the nudge below can move it */
  top: calc(-8px * var(--scale));  /* lift off the baseline — optically centered on the caps */
}

/* The show name — dimmed caps against the loud time. */
.infographic-show {
  min-width: 0;                    /* allow the name to shrink and wrap inside flex */
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* clearly subordinate to the time */
  font-weight: 500;                /* medium; contrast comes from the time */
  line-height: 1.3;                /* relaxed leading in case a title wraps */
  letter-spacing: 0.01em;          /* a hair of air on the caps */
  text-transform: uppercase;       /* sport rows shout too */
  color: var(--text-dim);          /* dimmed — the accent stays in the times and markers */
  overflow-wrap: break-word;       /* break a very long unbroken title */
  text-wrap: balance;              /* wrapped rows get even lengths */
}`,

      fields: [
        { field: 'f0', ftype: 'textarea', title: o.lines[0]?.title || 'Schedule', value: rowsText },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Heading', value: headingText },
      ],

      // Shared schedule rebuild — one "time | show" per line (dataRuntimes.ts).
      runtimeExtraJs: scheduleRowsRuntimeJs(),
    };
  },
);
