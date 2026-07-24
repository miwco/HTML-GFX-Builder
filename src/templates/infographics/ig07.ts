// ig07 "Election Bars" — minimal style, the infographic sibling of lt01 "Hairline" /
// lt03 "Side Tag". A newsroom election results board, ported from a benchmark-winning
// generated design (compare-out/election-bars-A): one wide near-black panel, a caps
// title with a "LIVE COUNT" flag over an accent rule, then three candidate rows —
// name and party in a fixed label column, a chunky bar that grows to the percentage,
// and the counted-up figure riding the bar's tip. The 'bars-grow' preset drives it:
// the fills and their readouts are MEASURED motion (igMotion.ts infographicBarsGrow).
// Fields follow the source: three names, three parties, three percentages — the
// percentages live in hidden source divs and rebuildInfographic() refreshes the bars.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineInfographicVariant } from './shared';

// One wizard line per candidate: "Name | Party | Percent" (the samples come from the source).
const CAND_SAMPLES = [
  'JANE SMITH | DEMOCRATIC PARTY | 48',
  'JOHN DOE | REPUBLICAN PARTY | 44',
  'ALEX CHEN | INDEPENDENT | 8',
];

/** Split one "Name | Party | Percent" wizard line, falling back to the sample per part. */
function parseCandidate(line: string | undefined, sample: string) {
  const fallback = sample.split('|').map((s) => s.trim());
  const parts = (line ?? '').split('|').map((s) => s.trim());
  return {
    name: parts[0] || fallback[0],
    party: parts[1] || fallback[1],
    pct: parts[2] || fallback[2],
  };
}

export const ig07: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig07',
    category: 'infographic',
    name: 'Election Bars',
    styleTag: 'minimal',
    description: 'A newsroom results board - three candidate bars grow to counted-up percentages.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Candidate 1', sample: CAND_SAMPLES[0] },
      { title: 'Candidate 2', sample: CAND_SAMPLES[1] },
      { title: 'Candidate 3', sample: CAND_SAMPLES[2] },
    ],
    logo: 'none',
    animationPresets: ['bars-grow'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Election Bars',
    description:
      'A serious, newsroom-clean election results board - the sibling of the Hairline / ' +
      'Side Tag lower thirds. A caps title and a "LIVE COUNT" flag sit over an accent rule; ' +
      'below it three candidate rows: name and party on the left, a bar that grows to the ' +
      'percentage, and the counted-up figure riding the bar\'s tip (the leading row\'s bar ' +
      'takes the accent). Type "Name | Party | Percent" per candidate; percentages are 0-100.',
    uicolor: '6',
  },
  (o) => {
    // The three candidates, parsed from the wizard lines (source-faithful defaults).
    const cands = [0, 1, 2].map((i) => parseCandidate(o.lines[i]?.sample, CAND_SAMPLES[i]));
    // The DRAWN fill is clamped to the 0-100 track at create, exactly like the runtime does.
    const drawn = cands.map((c) => {
      const n = Number.parseFloat(c.pct);
      return Number.isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
    });

    // One candidate row: [name + party labels][track with fill; the readout cap rides the
    // fill's tip]. The name/party spans ARE the SPX field elements; the percent field is a
    // hidden source div (after the box) that rebuildInfographic() reads.
    const row = (i: number) => {
      const f = i * 3; // fields per candidate: fN name, fN+1 party, fN+2 percent
      return `      <!-- Candidate ${i + 1} — labels on the left, the growing bar on the right. -->
      <div class="infographic-row">
        <div class="infographic-labels">
          <div class="infographic-name" id="f${f}">${cands[i].name}</div>
          <div class="infographic-party" id="f${f + 1}">${cands[i].party}</div>
        </div>
        <div class="infographic-bar-track">
          <div class="infographic-bar-fill" data-value="${drawn[i]}" style="width: ${drawn[i]}%">
            <!-- The readout cap — anchored to the fill's tip, so it rides the growth. -->
            <div class="infographic-bar-cap">
              <span class="infographic-bar-num">${drawn[i]}</span><span class="infographic-bar-sign">%</span>
            </div>
          </div>
        </div>
      </div>`;
    };

    return {
      html: `    <!-- Election Bars: one results board — [title + flag over an accent rule] / three
         candidate rows / a closing accent strip. -->
    <div class="infographic-box">
      <!-- The header — caps title left, the live flag right, closed by the accent rule. -->
      <div class="infographic-header">
        <div class="infographic-title">ELECTION RESULTS</div>
        <div class="infographic-flag">LIVE COUNT</div>
      </div>
      <!-- The rows — one per candidate; rebuildInfographic() refreshes their bars. -->
      <div class="infographic-rows">
${row(0)}
${row(1)}
${row(2)}
      </div>
      <!-- The base strip — a slim accent line grounding the board. -->
      <div class="infographic-base"></div>
    </div>
    <!-- Hidden percent sources — SPX writes f2/f5/f8 here; rebuildInfographic() reads them. -->
    <div id="f2" class="noacg-data-source">${cands[0].pct}</div>
    <div id="f5" class="noacg-data-source">${cands[1].pct}</div>
    <div id="f8" class="noacg-data-source">${cands[2].pct}</div>`,

      css: `/* The board — one wide near-black results panel (lt01's quiet keyline language, sized
   for a chart). Fixed width like ig02: the bar tracks need a stable run to grow along. */
.infographic-box {
  width: calc(1000px * var(--scale));  /* fixed board width — the tracks keep a stable length */
  box-sizing: border-box;          /* padding stays inside the fixed width */
  padding: calc(32px * var(--scale)) calc(44px * var(--scale)) calc(36px * var(--scale));  /* generous inner air */
  background: var(--panel-bg);     /* the near-black panel — retints via the :root contract */
  border: 1px solid rgba(255, 255, 255, 0.10);  /* faint keyline lifts the board off video */
  box-shadow: var(--panel-shadow);  /* the board's authored lift */
}

/* The header — title and flag share one baseline; the accent rule closes the block. */
.infographic-header {
  display: flex;                   /* title hugs left, flag hugs right */
  justify-content: space-between;  /* pushed to the board's opposite edges */
  align-items: baseline;           /* both caps lines sit on one baseline */
  gap: calc(32px * var(--scale));  /* title and flag never touch */
  padding-bottom: calc(14px * var(--scale));  /* air between the caps and the rule */
  margin-bottom: calc(24px * var(--scale));   /* air before the first candidate row */
  border-bottom: var(--accent-weight) solid var(--accent);  /* the header's authored accent weight */
}

/* The title — heavy tracked caps, the board's masthead. */
.infographic-title {
  min-width: 0;                    /* allow a long title to shrink and wrap inside flex */
  font-size: calc(34px * var(--scale));  /* masthead size — the names still lead the rows */
  font-weight: var(--display-weight);  /* the masthead's authored display weight */
  line-height: 1.15;               /* tight — caps need little leading */
  letter-spacing: var(--display-tracking);  /* the masthead's authored display tracking */
  text-transform: uppercase;       /* a masthead is shouted */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped rows get even lengths */
}

/* The flag — "LIVE COUNT" in the accent color, the header's second voice. */
.infographic-flag {
  flex-shrink: 0;                  /* a long title never squeezes the flag */
  font-size: calc(20px * var(--scale));  /* clearly subordinate to the title */
  font-weight: 700;                /* bold keeps small caps legible */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the flag's authored label tracking */
  text-transform: uppercase;       /* label voice */
  white-space: nowrap;             /* a short caps flag never wraps mid-word */
  color: var(--label-color);       /* the flag's authored label color */
}

/* The rows — candidate rows stacked with even air between them. */
.infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one candidate under another */
  gap: calc(24px * var(--scale));  /* even rhythm between the rows */
}

/* One candidate row: [label column][bar track]. */
.infographic-row {
  display: flex;                   /* labels and bar share one line */
  align-items: center;             /* the bar sits on the label block's middle */
  gap: calc(26px * var(--scale));  /* labels and track never touch */
}

/* The label column — a fixed width so all three tracks start on one clean left edge. */
.infographic-labels {
  width: calc(280px * var(--scale));  /* one shared column — the bars align vertically */
  flex-shrink: 0;                  /* the bar never squeezes the labels */
}

/* The candidate name — the row's primary reading line. */
.infographic-name {
  font-size: calc(27px * var(--scale));  /* clearly the loudest text in the row */
  font-weight: 800;                /* heavy caps carry the name */
  line-height: 1.15;               /* tight — a wrapped long name stays compact */
  letter-spacing: 0.04em;          /* a touch of air between the caps */
  text-transform: uppercase;       /* ballot voice, whatever the operator types */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken names */
  text-wrap: balance;              /* wrapped rows get even lengths */
}

/* The party line — quiet caps under the name: smaller, lighter, dimmed. */
.infographic-party {
  margin-top: calc(4px * var(--scale));  /* name and party read as one unit */
  font-size: calc(17px * var(--scale));  /* clearly subordinate to the name */
  font-weight: 600;                /* semibold keeps small caps legible */
  line-height: 1.25;               /* a touch of leading in case a long party wraps */
  letter-spacing: 0.09em;          /* small caps need room to breathe */
  text-transform: uppercase;       /* label voice */
  color: var(--text-dim);          /* dimmed — never full white twice in one row */
  overflow-wrap: break-word;       /* break very long unbroken words */
}

/* The track — the dim lane the fill grows inside. The right margin reserves a landing
   lane for the readout cap, so a 100% bar's figure never leaves the board. */
.infographic-bar-track {
  position: relative;              /* the fill's percent width is measured against this */
  flex: 1;                         /* the track takes all the row's remaining width */
  height: calc(46px * var(--scale));  /* chunky newsroom bars — the design's signature */
  margin-right: calc(70px * var(--scale));  /* the cap's reserved landing lane */
  border-radius: calc(2px * var(--scale));  /* barely-there rounding (minimal style) */
  background: rgba(255, 255, 255, 0.08);    /* dim lane — the fills carry the color */
}

/* The fill — the bars-grow preset grows its width from 0% to its data-value percent.
   Deliberate deviation from the "transform/opacity only" motion rule: the fill tweens
   WIDTH because scaleX would squash its cap (and drag the readout's anchor wrongly);
   the lane is one clipped strip per row, so relayout stays cheap. */
.infographic-bar-fill {
  position: relative;              /* anchors the readout cap to the fill's tip */
  width: 0;                        /* fallback — the markup renders an inline width at the value */
  height: 100%;                    /* fill the whole lane height */
  border-radius: inherit;          /* the growing end matches the lane's rounding */
  background: rgba(255, 255, 255, 0.34);  /* trailing candidates: neutral fills, ranked by tone */
  will-change: width;              /* hint for the width tween (the deviation noted above) */
}

/* Fill tones by row — the port's one palette change: the source's per-party hues can't
   ride the one-accent :root contract, so the LEADING row takes the accent (ig03's
   leader move) and the others step down through neutral tones. */
.infographic-row:nth-child(1) .infographic-bar-fill {
  background: var(--accent);       /* the leader — the board's main accent moment */
}
.infographic-row:nth-child(3) .infographic-bar-fill {
  background: rgba(255, 255, 255, 0.20);  /* third place — one tone quieter again */
}

/* The readout cap — figure + % just past the fill's tip; it rides the growth for free. */
.infographic-bar-cap {
  position: absolute;              /* anchored to the fill, not the lane */
  left: 100%;                      /* at the fill's tip... */
  top: 50%;                        /* ...on the bar's center line */
  transform: translate(calc(12px * var(--scale)), -50%);  /* a thin seam past the tip */
  display: flex;                   /* figure and % sign share one line */
  align-items: baseline;           /* the sign rests on the figure's baseline */
  white-space: nowrap;             /* "48%" never wraps mid-figure */
}

/* The figure — bold tabular digits; infographicBarsGrow() counts this from 0. */
.infographic-bar-num {
  font-size: calc(30px * var(--scale));  /* louder than the name — the figure is the news */
  font-weight: 800;                /* heaviest weight — the counted number leads */
  line-height: 1;                  /* hugs the bar's center line */
  font-variant-numeric: tabular-nums;  /* digits keep one width — no jitter while counting */
  color: var(--text-color);        /* primary text color */
}

/* The % sign — its own static element so the counter never rewrites it. */
.infographic-bar-sign {
  margin-left: calc(3px * var(--scale));  /* a hair of air after the digits */
  font-size: calc(20px * var(--scale));  /* clearly subordinate to the figure */
  font-weight: 700;                /* matches the figure's voice at its smaller size */
  line-height: 1;                  /* hugs its baseline */
  color: var(--text-color);        /* primary text color */
}

/* The base strip — a slim accent line grounding the board (the source's tri-color strip,
   retold in the one-accent contract). */
.infographic-base {
  height: calc(4px * var(--scale));  /* slab-thin (minimal token: 2-4px) */
  margin-top: calc(28px * var(--scale));  /* clear air after the last row */
  background: var(--accent);       /* the accent closes the board like the rule opened it */
}`,

      tokens: {
        panelShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        accentWeight: 'calc(2px * var(--scale))',
        labelTracking: '0.15em',
        labelColor: 'var(--accent)',
        displayWeight: '800',
        displayTracking: '0.12em',
      },
      fields: [
        { field: 'f0', ftype: 'textfield', title: `${o.lines[0]?.title || 'Candidate 1'} name`, value: cands[0].name },
        { field: 'f1', ftype: 'textfield', title: `${o.lines[0]?.title || 'Candidate 1'} party`, value: cands[0].party },
        { field: 'f2', ftype: 'number', title: `${o.lines[0]?.title || 'Candidate 1'} percent`, value: cands[0].pct },
        { field: 'f3', ftype: 'textfield', title: `${o.lines[1]?.title || 'Candidate 2'} name`, value: cands[1].name },
        { field: 'f4', ftype: 'textfield', title: `${o.lines[1]?.title || 'Candidate 2'} party`, value: cands[1].party },
        { field: 'f5', ftype: 'number', title: `${o.lines[1]?.title || 'Candidate 2'} percent`, value: cands[1].pct },
        { field: 'f6', ftype: 'textfield', title: `${o.lines[2]?.title || 'Candidate 3'} name`, value: cands[2].name },
        { field: 'f7', ftype: 'textfield', title: `${o.lines[2]?.title || 'Candidate 3'} party`, value: cands[2].party },
        { field: 'f8', ftype: 'number', title: `${o.lines[2]?.title || 'Candidate 3'} percent`, value: cands[2].pct },
      ],

      // rebuildInfographic(): refresh each bar from its hidden percent source (f2/f5/f8).
      // The names and parties are ordinary fields update() writes straight in — only the
      // bars need this hook, because a percentage repaints a width, not a text.
      runtimeExtraJs: `// rebuildInfographic(): read the hidden percent sources (f2/f5/f8) and refresh their bars.
// Each fill is rendered already at its value so an on-air update() shows fresh results at
// once; on play() the 'bars-grow' preset empties the fills and grows each one back while
// its readout counts up (igMotion's infographicBarsGrow does both).
function rebuildInfographic() {
  var sources = ['f2', 'f5', 'f8'];              // the hidden percent fields, one per row
  var fills = document.querySelectorAll('.infographic-bar-fill');
  for (var i = 0; i < sources.length; i++) {
    var src = document.getElementById(sources[i]);
    var fill = fills[i];
    if (!src || !fill) continue;                 // markup edited away — skip, never crash
    // Read the untouched value: update() keeps data-target current, while the animation
    // rewrites the readout's live text mid-count ("0%", "23%"…).
    var text = src.getAttribute('data-target');
    if (text === null) text = src.textContent;
    var value = parseFloat(text);
    if (isNaN(value)) value = 0;                 // not a number — draw an empty bar
    var drawnValue = Math.max(0, Math.min(100, value));  // clamp only the DRAWN fill to the track
    fill.setAttribute('data-value', drawnValue);
    fill.style.width = drawnValue + '%';
    // The readout at the bar's tip shows the parsed figure ("48", "48.6" — no stray text);
    // data-target holds the same string, so the count-up lands exactly on it.
    var num = fill.querySelector('.infographic-bar-num');
    num.textContent = String(value);
    num.setAttribute('data-target', String(value));
  }
}

// Render once on load so the preview shows real bars before the first update().
// This file loads in <head>, before the board elements exist — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`,
    };
  },
);
