// ls30 "World Clock" — the strap that shows ANOTHER city's time.
//
// The multi-region graphic: a market show cutting between Tokyo, London and New York, a
// global telethon, a co-production whose contributors are in four time zones. What every one
// of them needs is a strap that says what time it is THERE, and that is a thing a text field
// cannot do — the moment someone types "09:15" it is wrong, and it gets more wrong for as
// long as the graphic is up.
//
// So the offset is the input and the time is computed. The operator sets a city and a UTC
// offset; the design's own runtime does the arithmetic on every tick and paints the result.
// The offset lives in a HIDDEN field (the countdown-duration convention): it is a real SPX
// value an operator sets and a rundown can drive, and it is never drawn.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { TABULAR_FIGURES, hasLine, slot, zoneClockJs } from './shared';

const CLOCK_ELEMENT = 'lower-third-clock';

export const ls30: TemplateVariant = defineVariant(
  {
    id: 'ls30',
    category: 'lower-third',
    name: 'World Clock',
    styleTag: 'glass',
    roleTag: 'location',
    keywords: ['time zone', 'world clock', 'city', 'utc', 'offset', 'markets', 'global', 'region', 'local time'],
    description: 'A city and its live local time, computed from a UTC offset the operator sets.',
    maxLines: 3,
    suggestedLines: [
      { title: 'City', sample: 'Tokyo' },
      { title: 'Zone', sample: 'JST' },
      { title: 'Context', sample: 'Nikkei · Opening bell' },
    ],
    logo: 'none',
    animationPresets: ['blur-in', 'fade', 'slide-up', 'pop-spring', 'slide-left', 'line-reveal'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'top-right',
  },
  {
    name: 'World Clock',
    description:
      'The multi-region strap: a city, its zone abbreviation, and the live local time there — ' +
      'COMPUTED from a UTC offset the operator sets in a hidden SPX field, not typed. A typed ' +
      'time is wrong the moment it is entered and gets worse while the graphic is up; this one ' +
      'ticks. Set the offset (+9 for Tokyo, -5 for New York) and the same template serves any city.',
    uicolor: '5',
  },
  (o) => {
    // The offset is INPUT-ONLY: a real SPX field the operator sets, held in a hidden div so
    // the runtime can read it on every tick without it ever being drawn. Its id comes after
    // every wizard field so nothing collides.
    const offsetField = `f${o.lines.length + o.extraFields.length}`;

    return {
      html: `    <!-- The card: [city · zone] over the computed local time. -->
    <div class="lower-third-box">
      <div class="lower-third-accent"></div>
      <div class="lower-third-text">
        <div class="lower-third-cityrow">
${hasLine(o, 0) ? slot(o, 0, 'lower-third-name', '          ') : ''}
${hasLine(o, 1) ? slot(o, 1, 'lower-third-zone', '          ') : ''}
        </div>
        <!-- The clock — paintZoneClock() (in the JS) computes this from the offset below. -->
        <div class="lower-third-clock" id="${CLOCK_ELEMENT}">09:15</div>
${slot(o, 2, 'lower-third-extra', '        ')}
      </div>
    </div>
    <!-- ${offsetField}: the city's UTC offset in hours (+9 Tokyo · 0 London · -5 New York).
         Input only — the runtime reads it, nothing draws it. Decimals work: 5.5 for Kolkata. -->
    <div id="${offsetField}" style="display: none">9</div>`,

      extraFields: [
        {
          field: offsetField,
          ftype: 'number',
          title: 'UTC offset (hours)',
          value: '9',
        },
      ],

      runtimeExtraJs: zoneClockJs(CLOCK_ELEMENT, offsetField),

      css: `/* The card — the glass family's surface: blurred, softly cornered, lightly lifted. */
.lower-third-box {
  display: flex;                    /* the accent edge leads the stack */
  align-items: stretch;             /* the edge runs the card's full height */
  background: var(--panel-bg);      /* the family's translucent white */
  backdrop-filter: var(--panel-blur);  /* the frost itself */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's corner radius */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* lift + the 1px inner edge */
  overflow: hidden;                 /* the accent edge follows the rounded corner */
  min-width: calc(230px * var(--scale));  /* several of these often sit in a column — one width */
}

/* The accent edge — the graphic's accent node. */
.lower-third-accent {
  flex: none;                       /* never squeezed */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  transform-origin: center;         /* line-reveal scales it from the middle */
}

.lower-third-text {
  min-width: 0;                     /* let it shrink so long city names wrap */
  padding: calc(14px * var(--scale)) calc(24px * var(--scale)) calc(16px * var(--scale)) calc(20px * var(--scale));
}

/* The city row: name and zone abbreviation on one baseline. */
.lower-third-cityrow {
  display: flex;                    /* city and zone in a row… */
  flex-wrap: wrap;                  /* …wrapping only if the city is genuinely long */
  align-items: baseline;            /* one shared baseline */
  gap: calc(9px * var(--scale));
  min-width: 0;                     /* allow shrinking */
}
.lower-third-cityrow > .lower-third-mask {
  display: flex;                    /* each value hugs its own text… */
  min-width: 0;                     /* …and may shrink */
}

/* The city (f0). */
.lower-third-name {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the label above the figure */
  font-weight: 700;                 /* bold — tracked caps at this size need the weight */
  line-height: 1.2;                 /* single tight row */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* TOKYO, whatever the operator types */
  color: var(--text-color);         /* primary text color */
}

/* The zone abbreviation (f1) — in the accent, so the pair reads as one place-and-zone label. */
.lower-third-zone {
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* a suffix, not a line */
  font-weight: 700;                 /* bold — three small caps need the weight */
  line-height: 1.2;                 /* matches the city's rhythm */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* JST, whatever the operator types */
  color: var(--accent);             /* the card's one coloured word */
  white-space: nowrap;              /* a zone abbreviation never breaks */
}

/* The computed time — the card's headline, and the reason it exists. */
.lower-third-clock {
  font-size: calc(52px * var(--scale) * var(--type-scale));  /* the figure is the content */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.02;                /* one tight figure */
  letter-spacing: 0.01em;           /* a hair of air between figures */
  ${TABULAR_FIGURES}
  color: var(--text-color);         /* primary text color */
  margin-top: calc(4px * var(--scale));  /* tied to the city row above it */
}

/* The context (f2) — why this city is on screen. */
.lower-third-extra {
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* the smallest voice on the card */
  font-weight: 400;                 /* regular — reference, not billing */
  line-height: 1.3;                 /* room if it wraps */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(4px * var(--scale));  /* tied to the figure above it */
}`,
      hasAccent: true,
    };
  },
);
