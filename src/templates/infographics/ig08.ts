// ig08 "House Schedule" — the NoaCG agenda board, sibling of lt11 "House Strap" / card06
// "House Topic". The house void panel holding a running order: a mono accent heading over a
// dim keyline, then time/show rows with bold tabular times and an amber dot. Same schedule
// rebuild as ig06 (dataRuntimes.ts), in the house skin.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { scheduleRowsRuntimeJs } from './dataRuntimes';

const ROWS_SAMPLE = '20:00 | News at Eight\n21:00 | The Debate\n22:15 | Late Edition';

export const ig08: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig08',
    category: 'infographic',
    name: 'House Schedule',
    styleTag: 'noacg',
    description: 'The house running order: a void panel with mono heading and time/show rows.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Schedule', sample: ROWS_SAMPLE },
      { title: 'Heading', sample: 'COMING UP TONIGHT' },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Schedule',
    description:
      'The NoaCG running order, sibling of lt11 House Strap and card06 House Topic: the house ' +
      'void panel with an amber top edge, a tracked mono heading in the accent color over a ' +
      'dim keyline, and time/show rows with bold tabular times and an amber dot. Type one ' +
      '"time | show" line per row; rows-cascade rises them in.',
    uicolor: '4',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS_SAMPLE;
    const headingText = o.lines[1]?.sample || 'COMING UP TONIGHT';

    return {
      html: `    <!-- House Schedule: void panel — mono heading, keyline, time/show rows. -->
    <div class="infographic-box">
      <!-- Heading — the house mono accent kicker (SPX writes field f1 here). -->
      <div class="infographic-heading" id="f1">${headingText}</div>
      <!-- The rule — a dim keyline under the heading. -->
      <div class="infographic-rule"></div>
      <!-- Schedule rows — rendered by rebuildInfographic() from the hidden source below. -->
      <div id="infographic-rows"></div>
    </div>
    <!-- Hidden schedule source — SPX writes field f0 here; JS renders it. One "time | show" per line. -->
    <div id="f0" class="noacg-data-source">${rowsText}</div>`,

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The panel — the house void, sized as a board with an amber top edge (the house strip). */
.infographic-box {
  min-width: calc(560px * var(--scale));  /* a board, not a strap — short show names keep air */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(30px * var(--scale)) calc(38px * var(--scale)) calc(14px * var(--scale));  /* generous air; rows carry their own bottom padding */
  background: var(--panel-bg);     /* the house void — retints via the :root contract */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);  /* the house strip's amber top edge */
}

/* Heading — the house mono accent kicker, the panel's loudest color moment. */
.infographic-heading {
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* kicker scale — a label, not a headline */
  font-weight: 500;                /* medium keeps tracked mono caps crisp */
  line-height: 1.25;               /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the house's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the label carries the accent */
  text-wrap: balance;              /* a long heading wraps at spaces into even rows */
}

/* The rule — a thin dim keyline under the heading, closing the header block. */
.infographic-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin-top: calc(18px * var(--scale));  /* air between the caps and the rule */
  background: rgba(255, 255, 255, 0.14);  /* dim, not accent — the color stays in the caps and dots */
}

/* The board — schedule rows stacked; each row carries its own separator. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one schedule row under another */
}

/* One schedule row: [bold time] [accent dot] [show name] on a shared text baseline. */
.infographic-row {
  display: flex;                   /* time, dot and show share one line */
  align-items: baseline;           /* the two text sizes sit on one baseline */
  gap: calc(26px * var(--scale));  /* clear air between time, dot and show */
  padding: calc(16px * var(--scale)) 0;  /* even vertical rhythm down the board */
}

/* Thin dim separators between rows (not above the first or below the last). */
.infographic-row + .infographic-row {
  border-top: 1px solid rgba(255, 255, 255, 0.10);  /* keyline hairline between rows */
}

/* The time — bold and tabular so every row's digits line up in one column. */
.infographic-time {
  flex-shrink: 0;                  /* a long show name never squeezes the time */
  min-width: calc(96px * var(--scale));  /* one shared column width — the dots align vertically */
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* the anchor of each row */
  font-weight: var(--display-weight);  /* the house display weight */
  line-height: 1.15;               /* tight leading for the biggest text on the board */
  letter-spacing: -0.01em;         /* large digits tighten slightly */
  font-variant-numeric: tabular-nums;  /* equal-width digits — times align across rows */
  white-space: nowrap;             /* a time never wraps mid-value */
  color: var(--text-color);        /* primary text color */
}

/* The dot — a small, sharp dose of accent between time and show. */
.infographic-dot {
  flex-shrink: 0;                  /* the dot keeps its size whatever the text does */
  width: calc(7px * var(--scale)); /* small on purpose — a marker, not a bullet slab */
  height: calc(7px * var(--scale));  /* same as the width — a true circle */
  border-radius: 50%;              /* a ratio cap, not a size — stays round at any scale */
  background: var(--accent);       /* the accent dose that threads the rows together */
  box-shadow: var(--accent-glow);  /* the house glow, on the dot */
  position: relative;              /* so the nudge below can move it */
  top: calc(-6px * var(--scale));  /* lift off the baseline — optically centered on the lowercase */
}

/* The show name — quiet against the bold time: smaller, lighter, dimmed. */
.infographic-show {
  min-width: 0;                    /* allow the name to shrink and wrap inside flex */
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* clearly subordinate to the time */
  font-weight: 400;                /* regular; contrast comes from the bold time */
  line-height: 1.35;               /* relaxed leading in case a long title wraps */
  color: var(--text-dim);          /* dimmed — never full white twice in one row */
  overflow-wrap: break-word;       /* break a very long unbroken title */
  text-wrap: balance;              /* wrapped rows get even lengths */
}`,

      tokens: {
        labelTracking: '0.2em',
      },
      fields: [
        { field: 'f0', ftype: 'textarea', title: o.lines[0]?.title || 'Schedule', value: rowsText },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Heading', value: headingText },
      ],

      // Shared schedule rebuild — one "time | show" per line (dataRuntimes.ts).
      runtimeExtraJs: scheduleRowsRuntimeJs(),
    };
  },
);
