// tk05 "House Wire" — the NoaCG news ticker, rebuilt from the brand kit's ticker-news
// overlay: a void blur strip with a half-strength accent top edge, a solid accent label
// block in dark mono ink, items travelling endlessly, and a live mono clock in the right
// cap. Sibling of lt11 House Strap (same bar-and-void voice turned horizontal).

import { paletteById, type ResolvedOptions, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineTickerVariant, type TickerDesign } from './shared';

export const tk05: TemplateVariant = defineTickerVariant(
  {
    id: 'tk05',
    category: 'ticker',
    name: 'House Wire',
    styleTag: 'noacg',
    description: 'The house news strip: accent label block, endless items, and a live clock cap.',
    maxLines: 2,
    suggestedLines: [
      {
        title: 'Ticker items',
        sample: [
          'Parliament passes 2026 budget after all-night session',
          'Central bank holds rate at 3.25%',
          'National team qualifies for the final',
          'Storm warning issued for the coast',
        ].join('\n'),
      },
      { title: 'Label', sample: 'News' },
    ],
    logo: 'none',
    animationPresets: ['ticker-marquee'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-center',
  },
  {
    name: 'House Wire',
    description:
      'The NoaCG news wire: a void blur strip edged by a half-strength accent line, a solid ' +
      'accent label block in dark mono caps, stories separated by accent dots, and a live ' +
      'HH:MM clock holding the right cap. Sibling of lt11 House Strap.',
    uicolor: '4',
  },
  (o) => houseWire(o),
);

/**
 * The House Wire look. Exported because tk07 wears the same strip and advances it differently
 * (a timed rotation rather than endless travel) — the two share a face, not a motion.
 */
export function houseWire(o: ResolvedOptions): TickerDesign {
  return {
    // Strip = label block (left) + marquee viewport (middle) + live clock cap (right).
    html: `    <!-- House Wire: accent label left, endless marquee middle, live clock right. -->
    <div class="ticker-box">
      <!-- The label block — the strip's one solid accent surface. -->
      <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'News'}</span></div>
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
  height: calc(96px * var(--scale));   /* the strip's fixed height */
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);      /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-top: calc(3px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
  will-change: opacity;            /* hint the browser: the preset fades this */
}

/* The label block — solid accent, dark mono ink, the house glow. */
.ticker-label {
  display: flex;                   /* center the label text inside the block */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the scrolling viewport */
  padding: 0 calc(36px * var(--scale));  /* generous horizontal breathing room */
  background: var(--accent);       /* the one solid accent surface */
  box-shadow: var(--accent-glow);  /* the house glow around the accent block */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(22px * var(--scale) * var(--type-scale)); /* label scale */
  font-weight: 700;                /* bold mono caps read as a stamp */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a tag, whatever the operator types */
  color: var(--accent-ink);        /* dark ink on the accent block */
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
  align-items: center;             /* items and separators share a baseline zone */
  white-space: nowrap;             /* never wrap — the track is one continuous line */
  padding-left: calc(44px * var(--scale)); /* air between the label block and the first story */
  will-change: transform;          /* the marquee animates x every frame */
}

/* One story — comfortable reading size at travel speed. */
.ticker-item {
  font-size: calc(28px * var(--scale) * var(--type-scale)); /* the strip's main voice */
  font-weight: 500;                /* a touch of presence without shouting */
  color: var(--text-color);        /* primary text color */
}

/* The dot between stories — the accent as punctuation, like the brand overlay. */
.ticker-sep {
  margin: 0 calc(36px * var(--scale)); /* even air on both sides of the dot */
  font-size: calc(16px * var(--scale) * var(--type-scale)); /* small — a pause, not a bullet point */
  color: var(--accent);            /* accent dots chain the stories together */
}

/* The clock cap — live mono figures holding the strip's right edge. */
.ticker-clock {
  display: flex;                   /* center the figures inside the cap */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the scrolling viewport */
  padding: 0 calc(36px * var(--scale));  /* mirrors the label block's breathing room */
  font-family: var(--font-label);  /* the family's label face — the clock shares the label voice */
  font-size: calc(26px * var(--scale) * var(--type-scale)); /* quiet — present, not competing with stories */
  font-variant-numeric: tabular-nums;   /* every digit same width — no tick wobble */
  color: var(--text-color);        /* primary text color */
}`,
    // renderTickerItem(text): one story + its accent dot. The live clock painter rides
    // along here — it is design-owned runtime, safely outside the marked ANIMATION region.
    rowBuilderJs: `// renderTickerItem(text): one story followed by a small accent dot separator.
function renderTickerItem(text) {
  return '<span class="ticker-item">' + text + '</span>' +
         '<span class="ticker-sep">\\u2022</span>';
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
    // (A rotating strip shows one item at a time; assembleTicker turns this off for it.)
    doubleItems: true,
    // The strip tracks its label tighter than the family's 0.2em, and its dark-on-accent ink
    // is a notch more opaque than the panel colour the family points at. Both kept as
    // authored — this pass moves no pixels.
    tokens: { labelTracking: '0.18em', accentInk: 'rgba(10, 12, 16, 0.95)' },
  };
}
