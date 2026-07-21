// tk09 "Volt Rotator" — the SPORT ticker rotator, sibling of lt05 "Angle Slab" / lt06 "Split
// Bar" / tk02 "Volt Rail". A hard-cornered dark rail with a forward-leaning solid-accent label
// chip (the family -8° lean); the viewport holds one story at a time and the graphic's own
// timer advances it, so an operator can pause, resume, or skip. tk02 stays the marquee.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTickerVariant } from './shared';

const ITEMS_SAMPLE = [
  'HOME SIDE TAKES THE LEAD IN THE 62ND MINUTE',
  'SUBSTITUTION: NUMBER 9 ON FOR NUMBER 11',
  'YELLOW CARD SHOWN FOR A LATE CHALLENGE',
  'FIVE MINUTES OF STOPPAGE TIME SIGNALLED',
].join('\n');

export const tk09: TemplateVariant = defineTickerVariant(
  {
    id: 'tk09',
    category: 'ticker',
    name: 'Volt Rotator',
    styleTag: 'sport',
    description: 'A dark rail with a leaning accent chip, holding one story at a time — pausable on air.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Ticker items', sample: ITEMS_SAMPLE },
      { title: 'Label', sample: 'LIVE' },
    ],
    logo: 'none',
    animationPresets: ['ticker-rotate'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Volt Rotator',
    description:
      'The sport ticker in rotating form, sibling of lt05/lt06 and tk02 Volt Rail: a ' +
      'hard-cornered dark rail with a forward-leaning solid-accent label chip (the family -8° ' +
      'lean), holding each story in condensed caps long enough to read. The cycle is the ' +
      'graphic’s own timer, so an operator can hold it mid-story.',
    uicolor: '5',
  },
  (o) => ({
    // Rail = leaning accent label chip (left) + the single-item viewport (right).
    html: `    <!-- Volt Rotator: dark rail — leaning accent label chip left, one-story window right. -->
    <div class="ticker-box">
      <!-- The label chip: skewed directly (no preset animates it); the span counter-skews. -->
      <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'LIVE'}</span></div>
      <!-- The window — rebuildTicker() shows one story; the machine rotates them. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
    </div>`,
    css: `/* The rail — a hard-cornered dark slab. */
.ticker-box {
  display: flex;                   /* label chip + viewport side by side */
  align-items: stretch;            /* the chip runs the rail's full height */
  width: calc(1280px * var(--scale));  /* a wide reading rail */
  min-height: calc(72px * var(--scale));  /* the rail's height (grows if a story wraps) */
  background: var(--panel-bg);     /* near-black slab behind everything */
  border-radius: var(--panel-radius);  /* the family's panel corner radius (0) */
}

/* The label chip — solid accent, leaning -8° like lt05's slab (safe to skew: no preset
   ever transforms this element). */
.ticker-label {
  display: flex;                   /* centers the label text… */
  align-items: center;             /* …vertically in the chip */
  flex-shrink: 0;                  /* the chip never squeezes; the viewport takes the rest */
  padding: 0 calc(34px * var(--scale));  /* wide horizontal air around the word */
  background: var(--accent);       /* the one loud color moment */
  transform: skewX(-8deg);         /* SKEW: the forward lean — the sport signature */
}

/* The label text — counter-skewed so the word reads dead straight inside the leaning chip. */
.ticker-label span {
  transform: skewX(8deg);          /* cancels the chip's -8° — text stays upright */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* chip scale — louder than the story */
  font-weight: 700;                /* maximum punch */
  text-transform: uppercase;       /* labels are shouted, not spoken */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  color: var(--accent-ink);        /* the family's ink on an accent-filled chip */
}

/* The viewport — the story window. In rotate mode ROTATE_CSS lets it grow and wrap. */
.ticker-viewport {
  display: flex;                   /* so the story centers vertically in the rail */
  align-items: center;             /* the story sits on the rail's center line */
  flex-grow: 1;                    /* take all the rail width the chip leaves */
  min-width: 0;                    /* allow a long story to wrap inside flex */
  padding: calc(10px * var(--scale)) calc(30px * var(--scale));  /* air around the story */
}

/* One story — condensed uppercase, held long enough to read. */
.ticker-item {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* readable at the hold */
  font-weight: 600;                /* heavy enough to carry the rail */
  text-transform: uppercase;       /* the whole rail shouts */
  letter-spacing: 0.03em;          /* slight air between the caps */
  line-height: 1.2;                /* leading if a long story wraps */
  color: var(--text-color);        /* primary text on the dark rail */
}`,
    rowBuilderJs: `// renderTickerItem(text): one condensed uppercase story — the rotator shows one at a time.
function renderTickerItem(text) {
  return '<span class="ticker-item">' + text + '</span>';
}`,
    doubleItems: false, // a rotator shows one item at a time — never doubled
  }),
);
