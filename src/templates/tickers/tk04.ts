// tk04 "Index Strip" — the minimal financial ticker, sibling of lt01 (Hairline).
// Same family tokens: a 2px accent hairline (here it underlines the whole strip),
// zero radius, quiet tracking-wide caps, whitespace-led. Each item is a parsed market
// quote — "NAME 12345 +0.4" — set as dim caps name · bold tabular value · signed change
// with a ▲/▼ arrow. The up/down greens and reds are SEMANTIC state colors (markets are
// green-up/red-down everywhere on earth), so they deliberately bypass the accent system.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTickerVariant } from './shared';

const ITEMS_SAMPLE = [
  'DAX 18123 +0.4',
  'FTSE 100 7689 -0.2',
  'DOW JONES 39112 +0.7',
  'NASDAQ 17442 -0.3',
].join('\n');

export const tk04: TemplateVariant = defineTickerVariant(
  {
    id: 'tk04',
    category: 'ticker',
    name: 'Index Strip',
    styleTag: 'minimal',
    description: 'A precise financial strip - dim caps names, tabular values, signed green/red changes.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Indices', sample: ITEMS_SAMPLE },
      { title: 'Label', sample: 'MARKETS' },
    ],
    logo: 'none',
    animationPresets: ['ticker-marquee', 'ticker-flip'],
    defaultPalette: paletteById('porcelain'),
    defaultFontId: 'inter',
    defaultZone: 'top-center',
  },
  {
    name: 'Index Strip',
    description:
      'The markets strip: a porcelain bar underlined by a 2px accent hairline (the lt01 ' +
      'hairline motif laid flat), a quiet tracking-caps label, and parsed index quotes - ' +
      'dim caps name, bold tabular value, and a green/red arrowed change. Built for ' +
      'business bulletins and morning shows.',
    uicolor: '1',
  },
  (o) => {
    // The flip preset shows ONE quote at a time in a fixed window; the marquee slides an
    // endless row. The two need different item positioning, so we branch the layout CSS
    // (and drop the separator hairline in flip mode) on the chosen preset.
    const flip = o.animation.presetId === 'ticker-flip';

    return {
      // Structure: label block (left, with its own hairline divider) + the quote window.
      html: `    <!-- Index Strip: quiet caps label left, parsed market quotes right. -->
    <div class="ticker-box">
      <!-- The label — small tracking-wide caps, the strip's only accent-colored text. -->
      <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'MARKETS'}</span></div>
      <!-- The quote window — rebuildTicker() parses the items into the track. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
    </div>`,
      css: `/* The strip: a light full-width bar; the accent bottom hairline is lt01's line laid flat. */
.ticker-box {
  display: flex;                   /* label left, quote window filling the rest */
  align-items: stretch;            /* the label block spans the full strip height */
  width: calc(1680px * var(--scale));  /* near full-width, inside the safe areas */
  height: calc(64px * var(--scale));   /* the strip's fixed height — slim and precise */
  background: var(--panel-bg);     /* the palette panel — porcelain-light by default */
  border-bottom: calc(2px * var(--scale)) solid var(--accent);  /* the single accent hairline */
  will-change: opacity;            /* hint the browser: the presets fade this */
}

/* The label — quiet tracking-wide caps in the accent ink, plus a hairline divider after. */
.ticker-label {
  display: flex;                   /* label text and its divider sit in a row */
  align-items: center;             /* both center on the strip's axis */
  gap: calc(24px * var(--scale));  /* air between the word and the divider */
  flex-shrink: 0;                  /* long quotes never squeeze the label */
  padding-left: calc(30px * var(--scale));   /* generous left end-cap */
  padding-right: calc(26px * var(--scale));  /* air between the divider and the quotes —
                                                travelling text never touches the hairline */
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* kicker scale — clearly a tag, not a quote */
  font-weight: 700;                /* bold so the small caps carry */
  letter-spacing: 0.18em;          /* small caps breathe — minimal family tracking */
  text-transform: uppercase;       /* reads as a tag, whatever the operator types */
  white-space: nowrap;             /* a label never wraps mid-word */
  color: var(--accent);            /* the accent's one text moment (ink on porcelain) */
}

/* The divider after the label — a dim vertical hairline, not a second accent. */
.ticker-label::after {
  content: '';                     /* pseudo-elements need content to render */
  width: calc(2px * var(--scale));    /* family hairline weight */
  height: calc(24px * var(--scale));  /* short — inset from the strip's edges */
  background: var(--text-dim);     /* dimmed ink, so the accent hairline stays alone */
  opacity: 0.35;                   /* barely-there punctuation */
}

/* The quote window — quotes ${flip ? 'take turns inside it' : 'travel through it and clip at its edges'}. */
.ticker-viewport {
  ${flip ? 'position: relative;              /* the absolutely positioned quotes anchor here */' : 'flex-grow: 1;                    /* take all the strip width the label leaves */'}
  ${flip ? 'flex-grow: 1;                    /* take all the strip width the label leaves */' : 'overflow: hidden;                /* the marquee window — quotes vanish at the edges */'}
  ${flip ? 'overflow: hidden;                /* clip the flip travel (and any over-long quote) */' : 'display: flex;                   /* so the track can be vertically centered */'}
  ${flip ? "height: 100%;                    /* full strip height so the quotes center */" : 'align-items: center;             /* quotes sit on the strip’s centerline */'}
}

${flip
? `/* The track — a stacking context: the quotes occupy the same slot and take turns. */
#ticker-track {
  position: relative;              /* the inset:0 quotes position against the track */
  height: 100%;                    /* fill the window so the quotes get its height */
}

/* One quote — an absolutely positioned layer; the flip preset cycles them. */
.ticker-item {
  position: absolute;              /* all quotes share the same slot */
  inset: 0;                        /* fill the window */
  display: flex;                   /* name · value · change in one row */
  align-items: center;             /* the row sits on the strip's centerline */
  gap: calc(14px * var(--scale));  /* distinct info gets distinct space — never touching */
  white-space: nowrap;             /* a quote is always one line */
  opacity: 0;                      /* hidden until the flip cycle reveals it */
  will-change: transform, opacity; /* the preset animates y + opacity every cycle */
}`
: `/* The track — one endless row of quotes; the marquee preset slides its x. */
#ticker-track {
  display: inline-flex;            /* quotes in a single row, width = content */
  align-items: center;             /* quotes and separators share the centerline */
  white-space: nowrap;             /* never wrap — the track is one continuous line */
  will-change: transform;          /* the marquee animates x every frame */
}

/* One quote — name · value · change on a shared baseline. */
.ticker-item {
  display: inline-flex;            /* the three parts sit in one row */
  align-items: baseline;           /* mixed sizes align on the type baseline */
  gap: calc(14px * var(--scale));  /* distinct info gets distinct space — never touching */
  white-space: nowrap;             /* a quote is always one line */
}

/* The separator between quotes — a dim vertical hairline, echoing the label divider. */
.ticker-sep {
  align-self: center;              /* the hairline centers between the baselines */
  width: calc(2px * var(--scale));    /* family hairline weight */
  height: calc(22px * var(--scale));  /* short — inset from the strip's edges */
  margin: 0 calc(34px * var(--scale));  /* generous, even air around every quote */
  background: var(--text-dim);     /* dimmed ink — punctuation, never a second accent */
  opacity: 0.3;                    /* quieter than the label divider */
}`}

/* The index name — dim tracking caps, subordinate to its number. */
.tk-name {
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* small caps scale, matches the label */
  font-weight: 600;                /* semibold so the dim ink stays crisp */
  letter-spacing: 0.14em;          /* tracking-wide caps — the family voice */
  text-transform: uppercase;       /* index names are always set in caps */
  white-space: nowrap;             /* "FTSE 100" never breaks mid-name */
  color: var(--text-dim);          /* dimmed — the value is the headline */
}

/* The value — the loudest element of a quote: bold, tabular, primary ink. */
.tk-value {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* clearly above the name — instant hierarchy */
  font-weight: 700;                /* bold — the number is what viewers scan for */
  font-variant-numeric: tabular-nums;  /* equal-width digits — columns never wobble */
  color: var(--text-color);        /* primary ink */
}

/* The change — arrow + signed number, colored by market direction. */
.tk-change {
  display: inline-flex;            /* arrow and number as one unit */
  align-items: baseline;           /* the small arrow sits on the number's baseline */
  gap: calc(5px * var(--scale));   /* a sliver of air between arrow and number */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* between name and value — clearly secondary */
  font-weight: 600;                /* firm enough to read at travel speed */
  font-variant-numeric: tabular-nums;  /* equal-width digits here too */
}

/* The direction arrow — smaller than its number, purely a glyph. */
.tk-arrow {
  font-size: calc(10px * var(--scale) * var(--type-scale));  /* small triangle — a marker, not a headline */
}

/* SEMANTIC STATE COLORS — the one sanctioned bypass of the accent system: market
   direction is a universal green-up / red-down convention, so these two literals stay
   fixed whatever palette the Style panel picks. Calm, desaturated broadcast tones. */
.tk-up   { color: rgba(34, 154, 88, 0.95); }   /* calm green — index is up */
.tk-down { color: rgba(206, 66, 66, 0.95); }   /* calm red — index is down */`,
      // renderTickerItem(text): parse "NAME 12345 +0.4" — everything before the last two
      // words is the name (so "FTSE 100" survives), then the value, then the signed change.
      rowBuilderJs: `// renderTickerItem(text): one parsed market quote — dim caps name, bold tabular value,
// and a green/red change with a direction arrow. Lines that don't parse render as a
// plain dim item, so a stray headline never breaks the strip.
function renderTickerItem(text) {
  var parts = text.trim().split(/\\s+/);      // split on any run of whitespace
  if (parts.length < 3) {
    // Not "NAME VALUE CHANGE" — show the raw text quietly and keep the strip alive.
    return '${flip ? '<div class="ticker-item">' : '<span class="ticker-item">'}<span class="tk-name">' + text + '</span>${flip ? '</div>' : '</span><span class="ticker-sep"></span>'}';
  }
  var change = parts.pop();                   // last word: the signed change ("+0.4")
  var value = parts.pop();                    // second-to-last: the index value
  var name = parts.join(' ');                 // the rest: the index name ("DOW JONES")
  var down = change.charAt(0) === '-';        // a leading minus means the index fell
  var dir = down ? 'tk-down' : 'tk-up';       // semantic color class (see the CSS note)
  var arrow = down ? '\\u25BC' : '\\u25B2';     // ▼ falling · ▲ rising
  return '${flip ? '<div class="ticker-item">' : '<span class="ticker-item">'}' +
         '<span class="tk-name">' + name + '</span>' +
         '<span class="tk-value">' + value + '</span>' +
         '<span class="tk-change ' + dir + '">' +
           '<span class="tk-arrow">' + arrow + '</span>' + change +
         '</span>' +
         '${flip ? '</div>' : '</span><span class="ticker-sep"></span>'}';
}`,
      // Marquee needs the set twice for the seamless -50% loop; the flip cycle simply
      // runs the doubled set (each quote gets two turns per loop — harmless).
      doubleItems: true,
    };
  },
);
