// ig06 "Schedule Board" — minimal style, the infographic sibling of lt01 "Hairline" /
// lt02 "Underline". One quiet near-black panel holding a broadcast schedule: an accent
// tracking-caps heading over a dim keyline rule, then time/show rows — bold tabular
// times, a small accent dot, the show name — separated by thin dim hairlines.
// Data-driven like ig02: the operator types "time | show" lines into a textarea and
// rebuildInfographic() renders the rows; 'rows-cascade' rises them in one by one.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineInfographicVariant } from './shared';

const ROWS_SAMPLE = '20:00 | News at Eight\n21:00 | The Debate\n22:15 | Late Edition';

export const ig06: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig06',
    category: 'infographic',
    name: 'Schedule Board',
    styleTag: 'minimal',
    description: 'A quiet dark panel listing time/show rows - one "time | show" per line.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Schedule', sample: ROWS_SAMPLE },
      { title: 'Heading', sample: 'COMING UP TONIGHT' },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Schedule Board',
    description:
      'The sibling of the Hairline / Underline lower thirds: one restrained near-black ' +
      'panel, an accent tracking-caps heading over a dim keyline, and time/show rows with ' +
      'bold tabular times and a small accent dot. Type one "time | show" line per row; ' +
      'the rows-cascade preset rises them in one after another.',
    uicolor: '1',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS_SAMPLE;
    const headingText = o.lines[1]?.sample || 'COMING UP TONIGHT';

    return {
      // Structure: .infographic-box is the panel; #infographic-rows is rebuilt from the hidden #f0
      // source by rebuildInfographic() — exactly like ig02 rebuilds its bar rows.
      html: `    <!-- Schedule Board: one dark panel — caps heading, keyline rule, time/show rows. -->
    <div class="infographic-box">
      <!-- Heading — the panel's accent tracking-caps kicker (SPX writes field f1 here). -->
      <div class="infographic-heading" id="f1">${headingText}</div>
      <!-- The rule — a dim keyline under the heading, closing the header block. -->
      <div class="infographic-rule"></div>
      <!-- Schedule rows — rendered by rebuildInfographic() from the hidden source below. -->
      <div id="infographic-rows"></div>
    </div>
    <!-- Hidden schedule source — SPX writes field f0 here; JS renders it. One "time | show" per line. -->
    <div id="f0" style="display: none">${rowsText}</div>`,

      css: `/* The panel — restrained and near-black: the minimal family's quiet slab (lt01's sibling). */
.infographic-box {
  min-width: calc(560px * var(--scale));  /* a board, not a strap — short show names keep air */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(30px * var(--scale)) calc(38px * var(--scale)) calc(14px * var(--scale));  /* generous air; rows carry their own bottom padding */
  background: var(--panel-bg);     /* the palette's near-black panel — retints via the :root contract */
  border-radius: calc(2px * var(--scale));  /* minimal family: 0-2px, barely-there corners */
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.10),  /* faint 1px keyline defines the edge */
              0 14px 40px rgba(0, 0, 0, 0.30);            /* one subtle shadow lifts the board */
}

/* Heading — the accent tracking-wide caps kicker, the panel's loudest color moment. */
.infographic-heading {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* kicker scale — a label, not a headline */
  font-weight: 700;                /* bold keeps small caps legible */
  line-height: 1.25;               /* compact label leading */
  letter-spacing: 0.16em;          /* wide tracking — small caps breathe (minimal voice) */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--accent);            /* the accent kicker — same move as its lt02 sibling */
  text-wrap: balance;              /* a long heading wraps at spaces into even rows (never mid-word) */
}

/* The rule — a thin dim keyline under the heading, closing the header block. */
.infographic-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin-top: calc(18px * var(--scale));  /* air between the caps and the rule */
  background: rgba(255, 255, 255, 0.18);  /* dim, not accent — the color stays in the caps and dots */
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
  gap: calc(26px * var(--scale));  /* clear air between time, dot and show — never touching */
  padding: calc(16px * var(--scale)) 0;  /* even vertical rhythm down the board */
}

/* Thin dim separators between rows (not above the first or below the last). */
.infographic-row + .infographic-row {
  border-top: 1px solid rgba(255, 255, 255, 0.12);  /* keyline hairline between rows */
}

/* The time — bold and tabular so every row's digits line up in one column. */
.infographic-time {
  flex-shrink: 0;                  /* a long show name never squeezes the time */
  min-width: calc(96px * var(--scale));  /* one shared column width — the dots align vertically */
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* the anchor of each row */
  font-weight: 700;                /* bold — the time carries the row's weight */
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

      fields: [
        { field: 'f0', ftype: 'textarea', title: o.lines[0]?.title || 'Schedule', value: rowsText },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Heading', value: headingText },
      ],

      // rebuildInfographic(): re-render the schedule rows from the hidden #f0 source.
      // Each source line is "time | show" — rows missing either part are skipped.
      runtimeExtraJs: `// escapeHtml(): the rows below are built with innerHTML — operator text is escaped
// first so input like "Movies <18" reads as text and never runs as markup.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// rebuildInfographic(): parse the hidden #f0 source (one "time | show" per line)
// and rebuild the #infographic-rows schedule. Only the FIRST pipe splits the line, so a show
// name may itself contain a "|". Lines without both parts are skipped, like ig02.
function rebuildInfographic() {
  var rows = document.getElementById('infographic-rows');
  var lines = document.getElementById('f0').textContent.split('\\n');
  var html = '';
  lines.forEach(function (raw) {
    var line = raw.trim();
    if (line === '') return;                       // skip blank lines
    var split = line.indexOf('|');                 // first pipe only — shows may contain one
    if (split === -1) return;                      // no pipe: not a "time | show" line
    var time = line.slice(0, split).trim();
    var show = line.slice(split + 1).trim();
    if (time === '' || show === '') return;        // skip half-empty rows
    html += '<div class="infographic-row">'
          +   '<span class="infographic-time">' + escapeHtml(time) + '</span>'
          +   '<span class="infographic-dot"></span>'
          +   '<span class="infographic-show">' + escapeHtml(show) + '</span>'
          + '</div>';
  });
  rows.innerHTML = html;
}

// Render once on load so the preview shows the board before the first update().
// This file loads in <head>, before the board elements exist — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`,
    };
  },
);
