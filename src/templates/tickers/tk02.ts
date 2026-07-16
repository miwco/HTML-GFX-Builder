// tk02 "Volt Rail" - the sport ticker, sibling of lt05 (Angle Slab) / lt06 (Split Bar).
// Same family tokens: zero radius, the -8deg forward lean, condensed heavy caps, one loud
// volt accent. Skew placement note: lt05 paints its lean on a ::before layer because the
// snap-stinger preset tweens the box's own skewX. Here the marquee preset only animates
// .ticker-box (opacity) and #ticker-track (x) - the label chip is never touched by any
// preset, so a direct skewX(-8deg) on the chip with a counter-skewed inner span is the
// SIMPLER correct choice: no pseudo-layer, no stacking-context care, same painted lean.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTickerVariant } from './shared';

const ITEMS_SAMPLE = [
  'Welcome to tonight’s live show',
  'Guest lineup announced for next week',
  'Send your questions with #ontheair',
  'Tickets for the summer tour are on sale now',
].join('\n');

export const tk02: TemplateVariant = defineTickerVariant(
  {
    id: 'tk02',
    category: 'ticker',
    name: 'Volt Rail',
    styleTag: 'sport',
    description: 'A dark zero-radius rail with a skewed volt label chip - fast, loud esport energy.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Ticker items', sample: ITEMS_SAMPLE },
      { title: 'Label', sample: 'LIVE' },
    ],
    logo: 'none',
    animationPresets: ['ticker-marquee'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Volt Rail',
    description:
      'The sport rail: a hard-cornered dark slab strip with a forward-leaning solid-accent ' +
      'label chip - the same -8deg lean as Angle Slab. Items run in condensed uppercase with ' +
      'a volt "///" separator between them. Built for esport and match-night feeds.',
    uicolor: '5',
  },
  (o) => ({
    // Structure: the rail (.ticker-box) holds the leaning label chip, then the clipping
    // viewport whose #ticker-track is filled (twice) by rebuildTicker() and slid by the preset.
    html: `    <!-- Volt Rail: dark slab strip - leaning label chip, then the scrolling window. -->
    <div class="ticker-box">
      <!-- The label chip: skewed directly (no preset ever animates it); the span counter-skews. -->
      <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'LIVE'}</span></div>
      <!-- The viewport clips the endlessly travelling track. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
    </div>`,
    css: `/* The rail: a hard-cornered dark slab. The marquee preset fades THIS element. */
.ticker-box {
  display: flex;                   /* label chip + viewport side by side */
  align-items: stretch;            /* both run the rail's full height */
  width: calc(1680px * var(--scale));   /* wide strip - most of a 1920 frame */
  height: calc(78px * var(--scale));    /* the rail's fixed thickness */
  background: var(--panel-bg);     /* near-black slab behind everything */
  border-radius: 0;                /* hard corners - sport shape language */
}

/* The label chip: solid accent, leaning -8deg like lt05's slab. Safe to skew directly -
   the marquee preset never transforms this element (only .ticker-box and #ticker-track). */
.ticker-label {
  display: flex;                   /* centers the label text ... */
  align-items: center;             /* ... vertically in the chip */
  flex-shrink: 0;                  /* the chip never squeezes; the viewport takes the rest */
  padding: 0 calc(36px * var(--scale));  /* wide horizontal air around the word */
  background: var(--accent);       /* the one loud color moment */
  transform: skewX(-8deg);         /* SKEW: the forward lean - the family's sport signature.
                                      The chip's toe kicks ~6px past the rail's left edge:
                                      deliberate, mid-sprint energy */
}

/* The label text: counter-skewed so the word reads dead straight inside the leaning chip. */
.ticker-label span {
  transform: skewX(8deg);          /* cancels the chip's -8deg - text stays upright */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* chip scale - louder than the items */
  font-weight: 700;                /* maximum punch */
  text-transform: uppercase;       /* labels are shouted, not spoken */
  letter-spacing: 0.08em;          /* wide tracking - sport label convention */
  color: var(--panel-bg);          /* dark text on the volt chip - highest contrast */
}

/* The viewport: the clipping window the items travel through. */
.ticker-viewport {
  flex-grow: 1;                    /* takes all rail width the chip leaves over */
  overflow: hidden;                /* clips the track - only the window shows */
  display: flex;                   /* lets the track center ... */
  align-items: center;             /* ... vertically in the rail */
}

/* The track: one long row of items; the marquee preset slides its x forever. */
#ticker-track {
  display: inline-flex;            /* items in one row, sized by content */
  align-items: center;             /* items and separators share a baseline band */
  white-space: nowrap;             /* never wrap - the row must stay one line */
  will-change: transform;          /* the endless x-travel runs on the compositor */
}

/* One item: condensed uppercase, primary text color. */
.ticker-item {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* readable at speed, clearly under the chip */
  font-weight: 600;                /* heavy enough to survive motion blur */
  text-transform: uppercase;       /* the whole rail shouts */
  letter-spacing: 0.04em;          /* slight air between the caps */
  color: var(--text-color);        /* primary text on the dark rail */
}

/* The separator: the volt '///' between items - the accent's only echo on the rail. */
.ticker-sep {
  margin: 0 calc(26px * var(--scale));   /* even air on both sides of every item */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* matches the items */
  font-weight: 700;                /* solid slashes, not hairlines */
  color: var(--accent);            /* volt - ties the rail to the chip */
}`,
    // One item's markup: the text, then the '///' separator that trails EVERY item so the
    // doubled set loops with a perfectly even rhythm.
    rowBuilderJs: `// renderTickerItem(text): one condensed uppercase item plus its trailing volt separator.
function renderTickerItem(text) {
  return '<span class="ticker-item">' + text + '</span>' +
         '<span class="ticker-sep">///</span>';
}`,
    doubleItems: true, // marquee design - items render twice for the seamless -50% loop
  }),
);
