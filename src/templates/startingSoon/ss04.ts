// ss04 "House Hold" — the NoaCG holding screen, sibling of lt11 "House Strap" and card05
// "House Title". The house void panel as a pre-show front door: a mono kicker in the accent
// color, the show name in big display type, and the countdown breathing inside a void chip
// with a thin amber keyline. The chip carries starting-soon-pulse, so the hold-loop preset
// breathes it while the clock ticks; no panel radius, house grammar throughout.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineStartingSoonVariant } from './shared';

export const ss04: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss04',
    category: 'starting-soon',
    name: 'House Hold',
    styleTag: 'noacg',
    description: 'The house holding screen: mono kicker, display show name, a breathing void clock chip.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Title', sample: 'STARTING SOON' },
      { title: 'Show name', sample: 'The Late Line' },
    ],
    logo: 'none',
    animationPresets: ['hold-loop'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Hold',
    description:
      'The NoaCG pre-show screen, sibling of lt11 House Strap and card05 House Title: the house ' +
      'void panel holding a tracked mono kicker in the accent color, the show name in big ' +
      'display type, and the countdown inside a void chip with a thin amber keyline that ' +
      'breathes while the clock ticks.',
    uicolor: '4',
  },
  (o) => ({
    // Panel = kicker mask + show mask + the clock chip. The chip carries starting-soon-pulse,
    // the hold-loop breath target; #f2 (minutes) is the hidden source appended by the assembler.
    html: `    <!-- House Hold: void panel — mono kicker, display show name, breathing clock chip. -->
    <div class="starting-soon-box">
      <!-- Kicker (f0) — the mono accent label (mask-wrapped for the reveal). -->
      <div class="starting-soon-mask"><span id="f0" class="starting-soon-title">${o.lines[0]?.sample || 'STARTING SOON'}</span></div>
      <!-- Show name (f1) — the display headline. -->
      <div class="starting-soon-mask"><span id="f1" class="starting-soon-show">${o.lines[1]?.sample || 'The Late Line'}</span></div>
      <!-- The clock chip — starting-soon-pulse is the hold-loop's breath target. -->
      <div class="starting-soon-chip starting-soon-pulse">
        <span class="starting-soon-clock">5:00</span>
      </div>
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The panel — the house void, sized as a front door (front-door air, not strap padding). */
.starting-soon-box {
  display: flex;                   /* the pieces stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* centered under the mid anchor */
  text-align: center;              /* wrapped rows center too */
  padding: calc(44px * var(--scale)) calc(72px * var(--scale));  /* front-door air */
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);  /* the house strip's amber top edge */
}

/* The kicker (f0) — the house label voice announcing the wait, in the accent color. */
.starting-soon-title {
  font-family: var(--font-label);  /* the family's mono label face */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* label scale — announces, never competes */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.2;                /* single tight label line */
  letter-spacing: var(--label-tracking);  /* wide tracking — the label breathes */
  text-transform: uppercase;       /* label voice, whatever the operator types */
  color: var(--label-color);       /* the label carries the accent */
}

/* The show name (f1) — the display headline the audience is waiting for. */
.starting-soon-show {
  font-size: calc(64px * var(--scale) * var(--type-scale));  /* front-door headline scale */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                /* tight leading — big text needs less */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
  margin-top: calc(18px * var(--scale));  /* kicker and name read as one unit */
}

/* The clock chip — a void chip (house radius 6) with a thin amber keyline; the breath target. */
.starting-soon-chip {
  display: inline-flex;            /* hug the clock; centered by the panel */
  align-items: center;             /* the time sits on the chip's centerline */
  margin-top: calc(30px * var(--scale));  /* clear air — the clock is its own moment */
  padding: calc(12px * var(--scale)) calc(38px * var(--scale));  /* generous chip padding */
  border-radius: calc(6px * var(--scale));  /* the house chip radius */
  background: rgba(10, 12, 16, 0.6);  /* a second, denser layer of the void */
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent);  /* the amber keyline */
  will-change: transform;          /* hint the browser: the hold-loop breathes its scale */
}

/* The clock — mono figures, tabular so nothing jitters as it ticks. */
.starting-soon-clock {
  font-family: var(--font-label);  /* the house mono face */
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* the chip's focal figure */
  font-weight: 500;                /* medium — size carries the moment */
  line-height: 1;                  /* one tight row of digits */
  letter-spacing: 0.04em;          /* a touch of air between figures */
  font-variant-numeric: tabular-nums;  /* every digit the same width — no tick wobble */
  color: var(--text-color);        /* the brightest element on screen */
}`,
    tokens: {
      labelTracking: '0.24em',
    },
  }),
);
