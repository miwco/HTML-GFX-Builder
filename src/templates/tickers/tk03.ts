// tk03 "Glass Flip" — glass style. One compact fully-rounded glass capsule (the ticker
// sibling of lt09 "Gradient Pill"): translucent panel, blur, and the same softened accent
// ring. A small accent label chip sits left; the viewport shows ONE item at a time and the
// flip preset cycles them. Creator-stream energy.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTickerVariant } from './shared';

export const tk03: TemplateVariant = defineTickerVariant(
  {
    id: 'tk03',
    category: 'ticker',
    name: 'Glass Flip',
    styleTag: 'glass',
    description: 'A compact glass pill that flips one item at a time - creator-stream energy.',
    maxLines: 2,
    suggestedLines: [
      {
        title: 'Ticker items',
        sample: [
          'Welcome to tonight’s live show',
          'Guest lineup announced for next week',
          'Send your questions with #ontheair',
          'Tickets for the summer tour are on sale now',
        ].join('\n'),
      },
      { title: 'Label', sample: 'NOW' },
    ],
    hasLogoSlot: false,
    animationPresets: ['ticker-flip'],
    defaultPalette: paletteById('orchid'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Glass Flip',
    description:
      'A compact fully-rounded capsule in translucent glass with a soft accent ring - the ' +
      'sibling of the Gradient Pill lower third. An accent label dot sits left; the items ' +
      'take turns flipping through the single-line window. Made for creators and streams.',
    uicolor: '3',
  },
  (o) => ({
    // Structure: .ticker-box is the glass capsule; the label chip and the item viewport
    // sit side by side inside it. rebuildTicker() injects the items into #ticker-track.
    html: `    <!-- Glass Flip: one glass capsule - label chip left, single-item flip window right. -->
    <div class="ticker-box">
      <!-- Label chip: accent dot + the strip's label (SPX writes field f1 into the span). -->
      <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'NOW'}</span></div>
      <!-- Viewport: the one-item window; the flip preset cycles the items inside it. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
    </div>`,
    css: `/* The strip: one glass capsule - same glass language as the Gradient Pill lower third. */
.ticker-box {
  display: flex;                   /* label chip and item viewport sit side by side */
  align-items: center;             /* both center on the capsule's horizontal axis */
  gap: calc(18px * var(--scale));  /* air between the label chip and the items */
  width: calc(920px * var(--scale));   /* fixed strip width - the items flip inside it */
  height: calc(64px * var(--scale));   /* compact pill height */
  box-sizing: border-box;          /* padding stays inside the fixed width and height */
  padding: 0 calc(32px * var(--scale));  /* generous capsule end-caps for the text */
  border-radius: 999px;            /* full pill - a cap, not a size, so it is not scaled */
  background: var(--panel-bg);     /* the palette's glass tint - retints via the :root contract */
  backdrop-filter: blur(18px);     /* frosted glass: softly blurs the video behind the strip */
  -webkit-backdrop-filter: blur(18px);  /* Safari spelling of the same effect */
  position: relative;              /* anchors the ::after accent ring to the capsule */
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);  /* one soft wide shadow lifts the pill off the video */
}

/* Accent edge: the same softened ring lt09 draws - the border stays pure var(--accent)
   (so the Style panel retints it) and opacity does the softening. */
.ticker-box::after {
  content: '';                     /* pseudo-elements need content to render */
  position: absolute;              /* pinned over the capsule, out of the flex flow */
  inset: 0;                        /* cover the whole capsule */
  border: calc(2px * var(--scale)) solid var(--accent);  /* the accent-tinted edge */
  border-radius: inherit;          /* follow the pill's full rounding */
  opacity: 0.55;                   /* soften the ring without leaving the accent variable */
  pointer-events: none;            /* purely decorative overlay */
}

/* Label chip: a small accent dot + the uppercase label, glued together on the left. */
.ticker-label {
  display: flex;                   /* the dot and the label text sit in a row */
  align-items: center;             /* dot and text share the capsule's center line */
  gap: calc(9px * var(--scale));   /* small gap between the dot and the label */
  flex-shrink: 0;                  /* long items never squeeze the label */
  font-size: calc(15px * var(--scale));  /* small-caps kicker size */
  font-weight: 700;                /* bold - the label reads as a badge */
  letter-spacing: 0.12em;          /* small caps breathe */
  text-transform: uppercase;       /* label is always set in caps */
  color: var(--accent);            /* the label wears the one accent color */
}

/* The dot: a small round accent marker in front of the label - the pill's "on air" light. */
.ticker-label::before {
  content: '';                     /* pseudo-elements need content to render */
  width: calc(10px * var(--scale));   /* small dot diameter */
  height: calc(10px * var(--scale));  /* keep it perfectly round */
  border-radius: 999px;            /* full circle */
  background: var(--accent);       /* the dot is pure accent - retints with the palette */
}

/* Viewport: the one-item window - the flip's vertical travel is clipped inside it. */
.ticker-viewport {
  position: relative;              /* the absolutely positioned items anchor to this window */
  flex-grow: 1;                    /* take all the capsule width the label leaves free */
  height: 100%;                    /* full capsule height so the items center vertically */
  overflow: hidden;                /* clip the flip's y-travel (and any over-long item) */
}

/* Track: for the flip design the items stack in place - no marquee travel. */
#ticker-track {
  position: relative;              /* the inset:0 items position against the track */
  height: 100%;                    /* fill the viewport so the items get its full height */
}

/* One item: an absolutely positioned layer - the items take turns in the same spot. */
.ticker-item {
  position: absolute;              /* all items occupy the same slot and take turns */
  inset: 0;                        /* fill the viewport window */
  display: flex;                   /* flex layout for clean vertical centering */
  align-items: center;             /* text sits on the capsule's center line */
  font-size: calc(21px * var(--scale));  /* single-line item size - clearly bigger than the label */
  font-weight: 600;                /* semibold - present without shouting */
  line-height: 1.2;                /* a touch of leading for the single line */
  color: var(--text-color);        /* primary text color */
  white-space: nowrap;             /* one line per item - never wrap inside the pill */
  opacity: 0;                      /* hidden until the flip cycle reveals it */
  will-change: transform, opacity; /* the preset animates y + opacity - keep it composited */
}`,
    rowBuilderJs: `// renderTickerItem(text): the markup for ONE item. Flip designs show one item at a
// time, so there is no separator - each item is a full-window layer that takes its turn.
function renderTickerItem(text) {
  return '<div class="ticker-item">' + text + '</div>';
}`,
    doubleItems: false, // flip cycles the single set - doubling would repeat every item twice
  }),
);
