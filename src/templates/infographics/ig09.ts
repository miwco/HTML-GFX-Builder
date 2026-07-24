// ig09 "Frost Schedule" — the GLASS agenda board, sibling of lt08 "Frosted Card" / ig02
// "Glass Bars". A frosted glass panel holding a running order: a soft accent caps heading
// over a keyline, then time/show rows with tabular times and an accent dot. Same schedule
// rebuild as ig06 (dataRuntimes.ts), in the glass skin.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineInfographicVariant } from './shared';
import { scheduleRowsRuntimeJs } from './dataRuntimes';

const ROWS_SAMPLE = '20:00 | Doors open\n21:00 | Live set\n22:30 | DJ until late';

export const ig09: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig09',
    category: 'infographic',
    name: 'Frost Schedule',
    styleTag: 'glass',
    description: 'A frosted glass running order: a soft heading over time/show rows.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Schedule', sample: ROWS_SAMPLE },
      { title: 'Heading', sample: 'TONIGHT' },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Schedule',
    description:
      'The glass running order, sibling of lt08 Frosted Card and ig02 Glass Bars: a ' +
      'translucent blurred panel with a soft accent caps heading over a keyline and ' +
      'time/show rows with tabular times and an accent dot. Type one "time | show" line per ' +
      'row; rows-cascade rises them in.',
    uicolor: '3',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS_SAMPLE;
    const headingText = o.lines[1]?.sample || 'TONIGHT';

    return {
      html: `    <!-- Frost Schedule: frosted panel — caps heading, keyline, time/show rows. -->
    <div class="infographic-box">
      <!-- Heading — the panel's soft accent caps kicker (SPX writes field f1 here). -->
      <div class="infographic-heading" id="f1">${headingText}</div>
      <!-- The rule — a soft keyline under the heading. -->
      <div class="infographic-rule"></div>
      <!-- Schedule rows — rendered by rebuildInfographic() from the hidden source below. -->
      <div id="infographic-rows"></div>
    </div>
    <!-- Hidden schedule source — SPX writes field f0 here; JS renders it. One "time | show" per line. -->
    <div id="f0" class="noacg-data-source">${rowsText}</div>`,

      css: `/* The frosted panel — same glass language as the Frosted Card lower third. */
.infographic-box {
  min-width: calc(560px * var(--scale));  /* a board, not a strap — short names keep air */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(30px * var(--scale)) calc(38px * var(--scale)) calc(14px * var(--scale));  /* generous air */
  background: var(--panel-bg);     /* the glass tint — retints via the :root contract */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* Heading — a soft accent caps kicker (glass carries the accent in the label). */
.infographic-heading {
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* kicker scale — a label, not a headline */
  font-weight: 700;                /* bold keeps small caps legible */
  line-height: 1.25;               /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* glass carries the accent in the label */
  text-wrap: balance;              /* a long heading wraps into even rows */
}

/* The rule — a soft keyline under the heading. */
.infographic-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin-top: calc(16px * var(--scale));  /* air between the caps and the rule */
  background: rgba(255, 255, 255, 0.18);  /* soft glass keyline */
}

/* The board — schedule rows stacked; each row carries its own separator. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one row under another */
}

/* One schedule row: [time] [accent dot] [show name] on a shared baseline. */
.infographic-row {
  display: flex;                   /* time, dot and show share one line */
  align-items: baseline;           /* the two text sizes sit on one baseline */
  gap: calc(24px * var(--scale));  /* clear air between time, dot and show */
  padding: calc(15px * var(--scale)) 0;  /* even vertical rhythm down the board */
}
.infographic-row + .infographic-row {
  border-top: 1px solid rgba(255, 255, 255, 0.12);  /* soft keyline between rows */
}

/* The time — tabular so every row's digits line up in one column. */
.infographic-time {
  flex-shrink: 0;                  /* a long show name never squeezes the time */
  min-width: calc(96px * var(--scale));  /* one shared column width — the dots align */
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* the anchor of each row */
  font-weight: 700;                /* the glass families run heavier weights */
  line-height: 1.15;               /* tight leading */
  font-variant-numeric: tabular-nums;  /* equal-width digits — times align across rows */
  white-space: nowrap;             /* a time never wraps mid-value */
  color: var(--text-color);        /* primary text color */
}

/* The dot — a small accent circle between time and show. */
.infographic-dot {
  flex-shrink: 0;                  /* the dot keeps its size */
  width: calc(8px * var(--scale)); /* a small glass dot */
  height: calc(8px * var(--scale));  /* a true circle */
  border-radius: 50%;              /* stays round at any scale */
  background: var(--accent);       /* the accent dose threading the rows */
  position: relative;              /* so the nudge below can move it */
  top: calc(-6px * var(--scale));  /* lift off the baseline — optically centered */
}

/* The show name — quiet against the time: smaller, lighter, dimmed. */
.infographic-show {
  min-width: 0;                    /* allow the name to shrink and wrap inside flex */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* clearly subordinate to the time */
  font-weight: 500;                /* medium; contrast comes from the time */
  line-height: 1.35;               /* relaxed leading in case a title wraps */
  color: var(--text-dim);          /* dimmed — never full white twice in one row */
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
