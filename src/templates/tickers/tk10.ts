// tk10 "Wire Rotator" — the MINIMAL ticker rotator, sibling of lt01 "Hairline" / lt02
// "Underline" / tk01 "News Strip". A restrained near-black strip with a quiet accent label
// and a thin accent keyline between the label and the story; the viewport holds one story at a
// time and the graphic's own timer advances it. tk01 stays the marquee.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTickerVariant } from './shared';

const ITEMS_SAMPLE = [
  'Markets close higher for a third straight session',
  'Central bank signals no change to rates this quarter',
  'Unemployment holds steady at a four-year low',
  'Energy prices ease as supply concerns fade',
].join('\n');

export const tk10: TemplateVariant = defineTickerVariant(
  {
    id: 'tk10',
    category: 'ticker',
    name: 'Wire Rotator',
    styleTag: 'minimal',
    description: 'A quiet strip that holds one story at a time, split by a thin accent keyline.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Ticker items', sample: ITEMS_SAMPLE },
      { title: 'Label', sample: 'NEWS' },
    ],
    logo: 'none',
    animationPresets: ['ticker-rotate'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Wire Rotator',
    description:
      'The minimal ticker in rotating form, sibling of lt01/lt02 and tk01 News Strip: a ' +
      'restrained near-black strip with a quiet tracked-caps label and a thin accent keyline ' +
      'before the story, holding each one long enough to read. The cycle is the graphic’s own ' +
      'timer, so an operator can hold it mid-story.',
    uicolor: '1',
  },
  (o) => ({
    // Strip = quiet label (left) + a thin accent keyline + the single-item viewport (right).
    html: `    <!-- Wire Rotator: quiet strip — label, an accent keyline, then the one-story window. -->
    <div class="ticker-box">
      <!-- The label — a quiet tracked-caps kicker (SPX writes field f1 into the span). -->
      <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'NEWS'}</span></div>
      <!-- The keyline — a thin accent rule between the label and the story. -->
      <div class="ticker-rule"></div>
      <!-- The window — rebuildTicker() shows one story; the machine rotates them. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
    </div>`,
    css: `/* The strip — restrained and near-black, the minimal family's quiet slab. */
.ticker-box {
  display: flex;                   /* label, keyline and viewport in a row */
  align-items: center;             /* all three center on the strip's axis */
  gap: calc(22px * var(--scale));  /* even air between the pieces */
  width: calc(1200px * var(--scale));  /* a wide reading strip */
  box-sizing: border-box;          /* padding stays inside the fixed width */
  padding: calc(15px * var(--scale)) calc(30px * var(--scale));  /* comfortable strip padding */
  background: var(--panel-bg);     /* the palette's near-black panel — retints via the :root contract */
  border-radius: var(--panel-radius);  /* the family's near-square radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the authored edge and family lift */
}

/* The label — a quiet tracked-caps kicker in the accent color. */
.ticker-label {
  flex-shrink: 0;                  /* a long story never squeezes the label */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* small label size */
  font-weight: 700;                /* bold keeps small caps legible */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--accent);            /* the label carries the one accent dose */
}

/* The keyline — a short thin accent rule between the label and the story (lt02 motif). */
.ticker-rule {
  flex-shrink: 0;                  /* keeps its width whatever the story does */
  width: var(--accent-weight);     /* the family's hairline weight, stood vertical */
  align-self: stretch;             /* runs the strip's inner height */
  background: var(--accent);       /* the accent keyline */
}

/* The viewport — the story window. In rotate mode ROTATE_CSS lets it grow and wrap. */
.ticker-viewport {
  flex-grow: 1;                    /* take all the strip width the label and rule leave */
  min-width: 0;                    /* allow a long story to wrap inside flex */
}

/* One story — a comfortable reading size, held long enough to read. */
.ticker-item {
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* the strip's main voice */
  font-weight: 400;                /* regular — the minimal family is quiet */
  line-height: 1.3;                /* leading if a long story wraps to two lines */
  color: var(--text-color);        /* primary text color */
}`,
    rowBuilderJs: `// renderTickerItem(text): one story — the rotator shows one at a time.
function renderTickerItem(text) {
  return '<span class="ticker-item">' + text + '</span>';
}`,
    doubleItems: false, // a rotator shows one item at a time — never doubled
  }),
);
