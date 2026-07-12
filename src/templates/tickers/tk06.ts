// tk06 "House Markets" — the NoaCG markets strip, rebuilt from the brand kit's
// ticker-markets overlay: the House Wire strip carrying "SYMBOL +1.24%" items in mono,
// with the delta colored by its sign (green up, red down — fixed semantic colors, not
// the accent). Sibling of tk05 House Wire / lt11 House Strap.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineTickerVariant } from './shared';

export const tk06: TemplateVariant = defineTickerVariant(
  {
    id: 'tk06',
    category: 'ticker',
    name: 'House Markets',
    styleTag: 'noacg',
    description: 'Markets strip: mono "SYMBOL +1.24%" items with sign-colored deltas and a clock cap.',
    maxLines: 2,
    suggestedLines: [
      {
        title: 'Market items',
        sample: [
          'OMXH +1.24%',
          'EUR/USD −0.31%',
          'BRENT +0.82%',
          'GOLD +0.14%',
          'NDX +0.66%',
          'DAX −0.12%',
        ].join('\n'),
      },
      { title: 'Label', sample: 'Markets' },
    ],
    hasLogoSlot: false,
    animationPresets: ['ticker-marquee'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-center',
  },
  {
    name: 'House Markets',
    description:
      'The house strip built for numbers: mono market items whose trailing +/− delta is ' +
      'colored by its sign (fixed green/red — semantic, independent of the accent), an ' +
      'accent label block, and a quiet live clock cap. Sibling of tk05 House Wire.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- House Markets: accent label left, mono market items middle, live clock right. -->
    <div class="ticker-box">
      <!-- The label block — the strip's one solid accent surface. -->
      <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'Markets'}</span></div>
      <!-- The scrolling window — rebuildTicker() injects the items into the track. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
      <!-- The clock cap — paintTickerClock() (in the JS) repaints this every second. -->
      <div class="ticker-clock" id="ticker-clock">20:14</div>
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The strip — the house void turned horizontal, with a half-strength accent top edge. */
.ticker-box {
  display: flex;                   /* label left, viewport filling, clock right */
  align-items: stretch;            /* the caps span the full strip height */
  width: calc(1680px * var(--scale));  /* near full-width, inside the safe areas */
  height: calc(88px * var(--scale));   /* slightly slimmer than the news wire */
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: blur(8px);      /* the house blur */
  -webkit-backdrop-filter: blur(8px);  /* Safari spelling of the same effect */
  border-top: calc(3px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
  will-change: opacity;            /* hint the browser: the preset fades this */
}

/* The label block — solid accent, dark mono ink, the house glow. */
.ticker-label {
  display: flex;                   /* center the label text inside the block */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the scrolling viewport */
  padding: 0 calc(32px * var(--scale));  /* generous horizontal breathing room */
  background: var(--accent);       /* the one solid accent surface */
  box-shadow: 0 0 calc(24px * var(--scale)) color-mix(in srgb, var(--accent) 40%, transparent);
  font-family: "JetBrains Mono", Consolas, "Courier New", monospace;  /* the house label face */
  font-size: calc(20px * var(--scale)); /* label scale */
  font-weight: 700;                /* bold mono caps read as a stamp */
  letter-spacing: 0.16em;          /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a tag, whatever the operator types */
  color: rgba(10, 12, 16, 0.95);   /* dark ink on the accent block (house void) */
}

/* The scrolling window — items travel through it and clip at its edges. */
.ticker-viewport {
  flex-grow: 1;                    /* take all the width the caps leave */
  overflow: hidden;                /* the marquee window — items vanish at the edges */
  display: flex;                   /* so the track can be vertically centered */
  align-items: center;             /* items sit on the strip's centerline */
}

/* The track — one endless row of items; the marquee preset slides its x. */
#ticker-track {
  display: inline-flex;            /* items in a single row, width = content */
  align-items: center;             /* items share a baseline zone */
  white-space: nowrap;             /* never wrap — the track is one continuous line */
  padding-left: calc(44px * var(--scale)); /* air between the label block and the first item */
  will-change: transform;          /* the marquee animates x every frame */
}

/* One market item — mono, tabular: numbers deserve even digits. */
.ticker-item {
  font-family: "JetBrains Mono", Consolas, "Courier New", monospace;  /* the house label face */
  font-size: calc(26px * var(--scale)); /* the strip's main voice */
  font-weight: 400;                /* regular mono — the deltas carry the color */
  font-variant-numeric: tabular-nums;   /* even digits across every item */
  color: var(--text-color);        /* the symbol in primary text color */
  margin-right: calc(56px * var(--scale)); /* generous air between instruments */
}

/* The deltas — fixed semantic market colors (BRAND-MANUAL §3), NOT the accent:
   green must stay green and red must stay red whatever the project palette is. */
.ticker-up   { color: #4ac47a; }   /* gains */
.ticker-down { color: #e57a7d; }   /* losses */

/* The clock cap — quiet dimmed figures holding the strip's right edge. */
.ticker-clock {
  display: flex;                   /* center the figures inside the cap */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the scrolling viewport */
  padding: 0 calc(32px * var(--scale));  /* mirrors the label block's breathing room */
  font-family: "JetBrains Mono", Consolas, "Courier New", monospace;  /* the house label face */
  font-size: calc(24px * var(--scale)); /* the quietest voice on the strip */
  font-variant-numeric: tabular-nums;   /* every digit same width — no tick wobble */
  color: var(--text-dim);          /* dimmed — the markets are the point, not the time */
}`,
    // renderTickerItem(text): "SYMBOL +1.24%" — the trailing signed token becomes the
    // colored delta. Items without a delta render plain. The live clock painter rides
    // along here — design-owned runtime, safely outside the marked ANIMATION region.
    rowBuilderJs: `// renderTickerItem(text): a market item — the trailing +/− token gets its sign color.
function renderTickerItem(text) {
  var m = text.match(/^(.*\\S)\\s+([+\\-\\u2212][\\d.,]+%?)$/);
  if (m) {
    var dir = m[2].charAt(0) === '+' ? 'ticker-up' : 'ticker-down';
    return '<span class="ticker-item">' + m[1] +
           ' <span class="' + dir + '">' + m[2] + '</span></span>';
  }
  return '<span class="ticker-item">' + text + '</span>';
}

// ── Live clock (right cap) ────────────────────────────────────────────────────
// Paints the local time as HH:MM into the clock cap every second.
function paintTickerClock() {
  var el = document.getElementById('ticker-clock');
  if (!el) return;
  var d = new Date();
  var pad = function (n) { return String(n).padStart(2, '0'); };
  el.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
}
// Start ticking once the DOM exists (this file loads in <head> in exported packages).
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { paintTickerClock(); setInterval(paintTickerClock, 1000); });
} else {
  paintTickerClock(); setInterval(paintTickerClock, 1000);
}`,
    // Marquee design: the items render twice so sliding one set length loops seamlessly.
    doubleItems: true,
  }),
);
