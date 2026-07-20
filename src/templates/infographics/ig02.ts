// ig02 "Glass Bars" — glass style. A frosted glass panel (the infographic sibling of
// lt08 "Frosted Card" / lt09 "Gradient Pill") holding a horizontal bar chart: a small
// accent caps heading on top, then label/value rows with fully-rounded tracks that the
// 'bars-grow' preset fills one after another. Data-driven like the tickers: the operator
// types "Label | value" lines into a textarea and rebuildInfographic() renders the rows.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineInfographicVariant } from './shared';

const BARS_SAMPLE = 'Streaming | 78\nBroadcast | 54\nOn demand | 36';

export const ig02: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig02',
    category: 'infographic',
    name: 'Glass Bars',
    styleTag: 'glass',
    description: 'A frosted glass panel with growing rounded bars - one "Label | value" per line.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Bars', sample: BARS_SAMPLE },
      { title: 'Heading', sample: 'HOW WE WATCH' },
    ],
    logo: 'none',
    animationPresets: ['bars-grow'],
    defaultPalette: paletteById('orchid'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-left',
  },
  {
    name: 'Glass Bars',
    description:
      'A translucent frosted panel - the sibling of the Frosted Card lower third - holding ' +
      'a horizontal bar chart. An accent caps heading sits on top; each data row shows its ' +
      'label, its value and a fully-rounded track whose accent fill grows to the value. ' +
      'Type one "Label | value" line per bar (values 0-100).',
    uicolor: '3',
  },
  (o) => {
    const barsText = o.lines[0]?.sample || BARS_SAMPLE;
    const headingText = o.lines[1]?.sample || 'HOW WE WATCH';

    return {
      // Structure: .infographic-box is the frosted panel; #infographic-bars is rebuilt from the hidden
      // #f0 source by rebuildInfographic() — exactly like a ticker rebuilds its track.
      html: `    <!-- Glass Bars: one frosted panel — caps heading on top, the bar rows below. -->
    <div class="infographic-box">
      <!-- Heading — the panel's small-caps kicker (SPX writes field f1 here). -->
      <div class="infographic-heading" id="f1">${headingText}</div>
      <!-- Bar rows — rendered by rebuildInfographic() from the hidden source below. -->
      <div id="infographic-bars"></div>
    </div>
    <!-- Hidden bars source — SPX writes field f0 here; JS renders it. One "Label | value" per line. -->
    <div id="f0" style="display: none">${barsText}</div>`,

      css: `/* The frosted panel — same glass language as the Frosted Card lower third. */
.infographic-box {
  width: calc(560px * var(--scale));  /* fixed chart width — the tracks need a stable length */
  box-sizing: border-box;          /* padding stays inside the fixed width */
  padding: calc(26px * var(--scale)) calc(32px * var(--scale));  /* generous inner air */
  background: var(--panel-bg);     /* the palette's glass tint — retints via the :root contract */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* Heading — a small-caps kicker in the accent color, like the Frosted Card's third line. */
.infographic-heading {
  margin-bottom: calc(20px * var(--scale));  /* air before the first bar row */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* small label size */
  font-weight: 700;                /* bold keeps small caps legible */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);        /* the family's label color */
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped rows get even lengths */
}

/* The chart — bar rows stacked with even air between them. */
#infographic-bars {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one bar row under another */
  gap: calc(18px * var(--scale));  /* even rhythm between the rows */
}

/* Head line of a row: label on the left, value figure on the right. */
.infographic-bar-head {
  display: flex;                   /* label and value share one line */
  justify-content: space-between;  /* label hugs left, value hugs right */
  align-items: baseline;           /* both sit on the same text baseline */
  gap: calc(24px * var(--scale));  /* never let label and value touch */
  margin-bottom: calc(8px * var(--scale));  /* small gap down to the track */
}

/* The bar's label — the primary reading line of each row. */
.infographic-bar-label {
  min-width: 0;                    /* allow the label to shrink and wrap inside flex */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* clearly bigger than the heading kicker */
  font-weight: 600;                /* semibold carries the row */
  line-height: 1.25;               /* a touch of leading in case a long label wraps */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken words */
}

/* The value figure — the number the bar visualizes. */
.infographic-bar-value {
  flex-shrink: 0;                  /* long labels never squeeze the figure */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* same size as the label… */
  font-weight: 700;                /* …contrast through weight, not more fonts */
  font-variant-numeric: tabular-nums;  /* equal-width digits — figures align across rows */
  color: var(--text-color);        /* primary text color */
}

/* The track — a fully-rounded rgba-white lane the fill grows inside. */
.infographic-bar-track {
  height: calc(12px * var(--scale));  /* slim lane — the chart stays elegant */
  border-radius: 999px;            /* full pill — a cap, not a size, so it is not scaled */
  background: rgba(255, 255, 255, 0.14);  /* translucent white lane on the glass */
  overflow: hidden;                /* the growing fill is clipped to the lane */
}

/* The fill — the preset grows its width from 0% to its data-value percent.
   Deliberate deviation from the "transform/opacity only" motion rule: the fill tweens
   WIDTH because scaleX would squash its rounded cap; the lane is a clipped 12px strip,
   so relayout stays cheap. */
.infographic-bar-fill {
  width: 0;                        /* fallback — the rebuild renders an inline width at the value */
  height: 100%;                    /* fill the whole lane height */
  border-radius: inherit;          /* the growing end stays rounded like the lane */
  background: var(--accent);       /* the bars are the accent moment of this graphic */
  will-change: width;              /* hint for the width tween (the deviation noted above) */
}`,

      fields: [
        { field: 'f0', ftype: 'textarea', title: o.lines[0]?.title || 'Bars', value: barsText },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Heading', value: headingText },
      ],

      // rebuildInfographic(): re-render the bar rows from the hidden #f0 source.
      // Each source line is "Label | value" — the drawn fill is clamped to the 0-100 track.
      runtimeExtraJs: `// escapeHtml(): the rows below are built with innerHTML — operator text is escaped
// first so input like "Latency <500ms" reads as text and never runs as markup.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// rebuildInfographic(): parse the hidden #f0 source (one "Label | value" per line)
// and rebuild the #infographic-bars rows. Each fill is rendered already at its value so an
// on-air update() shows fresh data at once; on play() the 'bars-grow' preset resets
// the fills to 0 and grows each one back to its data-value percent.
function rebuildInfographic() {
  var bars = document.getElementById('infographic-bars');
  var lines = document.getElementById('f0').textContent.split('\\n');
  var html = '';
  lines.forEach(function (raw) {
    var line = raw.trim();
    if (line === '') return;                       // skip blank lines
    var parts = line.split('|');
    var label = parts[0].trim();
    var valueText = (parts[1] || '').trim();       // the figure exactly as the operator typed it
    var value = parseFloat(valueText);             // NaN when the value part is missing
    if (label === '' || isNaN(value)) return;      // skip lines without a label or a number
    var fill = Math.max(0, Math.min(100, value));  // clamp only the DRAWN fill to the 0-100 track
    html += '<div class="infographic-row">'
          +   '<div class="infographic-bar-head">'
          +     '<span class="infographic-bar-label">' + escapeHtml(label) + '</span>'
          +     '<span class="infographic-bar-value">' + escapeHtml(valueText) + '</span>'  // show the typed figure, never a silently altered one
          +   '</div>'
          +   '<div class="infographic-bar-track">'
          +     '<div class="infographic-bar-fill" data-value="' + fill + '" style="width: ' + fill + '%"></div>'
          +   '</div>'
          + '</div>';
  });
  bars.innerHTML = html;
}

// Render once on load so the preview shows the chart before the first update().
// This file loads in <head>, before the chart elements exist — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`,
    };
  },
);
