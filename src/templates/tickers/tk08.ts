// tk08 "Frost Rotator" — the GLASS ticker rotator, sibling of lt08 "Frosted Card" / lt09
// "Gradient Pill". A translucent frosted strip with a soft accent-ringed label chip; the
// viewport holds one story at a time and the graphic's own timer advances it, so an operator
// can pause it, resume it, or skip ahead. (tk03 Glass Flip is the marquee-family flip; this is
// the machine-driven rotator the ticker graphic type ships in glass.)

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTickerVariant } from './shared';

const ITEMS_SAMPLE = [
  'Welcome to tonight’s live show',
  'Guest lineup announced for next week',
  'Send your questions with #ontheair',
  'Tickets for the summer tour are on sale now',
].join('\n');

export const tk08: TemplateVariant = defineTickerVariant(
  {
    id: 'tk08',
    category: 'ticker',
    name: 'Frost Rotator',
    styleTag: 'glass',
    description: 'A frosted strip that holds one story at a time — timed, and pausable on air.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Ticker items', sample: ITEMS_SAMPLE },
      { title: 'Label', sample: 'NOW' },
    ],
    logo: 'none',
    // Only the rotate preset suits a machine-driven ticker: a marquee's endless timeline can
    // never arm the state machine's advance timer.
    animationPresets: ['ticker-rotate'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Frost Rotator',
    description:
      'The glass ticker in rotating form, sibling of lt08 Frosted Card and lt09 Gradient Pill: ' +
      'a translucent frosted strip with a soft accent-ringed label chip, holding one story long ' +
      'enough to read before the next takes over. The cycle is the graphic’s own timer, so an ' +
      'operator can hold it mid-story.',
    uicolor: '3',
  },
  (o) => ({
    // Strip = accent-ringed label chip (left) + the single-item viewport (right).
    html: `    <!-- Frost Rotator: frosted strip — accent label chip left, one-story window right. -->
    <div class="ticker-box">
      <!-- The label chip — a soft accent tag (SPX writes field f1 into the span). -->
      <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'NOW'}</span></div>
      <!-- The window — rebuildTicker() shows one story; the machine rotates them. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
    </div>`,
    css: `/* The strip — a translucent frosted rail with the family's soft ring and lift. */
.ticker-box {
  display: flex;                   /* label chip + viewport side by side */
  align-items: center;             /* both center on the strip's axis */
  gap: calc(22px * var(--scale));  /* air between the chip and the story */
  width: calc(1200px * var(--scale));  /* a wide reading strip */
  box-sizing: border-box;          /* padding stays inside the fixed width */
  padding: calc(16px * var(--scale)) calc(30px * var(--scale));  /* comfortable strip padding */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  background: var(--panel-bg);     /* the glass tint — retints via the :root contract */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* The label chip — a soft accent caps tag with a small dot, glued left. */
.ticker-label {
  display: flex;                   /* the dot and the label text sit in a row */
  align-items: center;             /* dot and text share the strip's center line */
  gap: calc(9px * var(--scale));   /* small gap between the dot and the label */
  flex-shrink: 0;                  /* a long story never squeezes the label */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* small-caps kicker size */
  font-weight: 700;                /* bold — the label reads as a badge */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* label is always set in caps */
  color: var(--label-color);       /* glass carries the accent in the label */
}

/* The dot — a small round accent marker in front of the label (the "on air" light). */
.ticker-label::before {
  content: '';                     /* pseudo-elements need content to render */
  width: calc(10px * var(--scale));   /* small dot diameter */
  height: calc(10px * var(--scale));  /* keep it perfectly round */
  border-radius: 999px;            /* full circle */
  background: var(--accent);       /* the dot is pure accent — retints with the palette */
}

/* The viewport — the story window. In rotate mode the shared ROTATE_CSS lets it grow to the
   story and wrap; nothing travels, so there is nothing to clip. */
.ticker-viewport {
  flex-grow: 1;                    /* take all the strip width the label leaves */
  min-width: 0;                    /* allow a long story to wrap inside flex */
}

/* One story — a comfortable reading size, held long enough to read. */
.ticker-item {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* the strip's main voice */
  font-weight: 500;                /* present without shouting */
  line-height: 1.25;               /* a touch of leading if a long story wraps to two lines */
  color: var(--text-color);        /* primary text color */
}`,
    // renderTickerItem(text): one story. The rotator shows one at a time (the shared runtime
    // hides the separator in rotate mode), so no trailing separator is needed.
    rowBuilderJs: `// renderTickerItem(text): one story block — the rotator shows one at a time.
function renderTickerItem(text) {
  return '<span class="ticker-item">' + text + '</span>';
}`,
    doubleItems: false, // a rotator shows one item at a time — never doubled
  }),
);
