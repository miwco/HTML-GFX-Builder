// ls29 "Field Report" — the reporter, the place, and the time, in one strap.
//
// The correspondent's own graphic. It differs from a studio strap in exactly one structural
// way, and that difference is the whole design: the LOCATION is not a subtitle, it is a
// dateline. In print a dateline sits apart from the byline, in caps, ahead of the copy —
// "KYIV —" — and broadcast inherited the convention. So here the place is set in the house
// mono above the name, in the accent, with the clock beside it on the same rail: where and
// when together, then who.
//
// The clock reads the playout machine's time. That is correct for a gallery cutting its own
// show, and it is the reason a reporter strap can stay up through a long live without
// anybody having to remember to update it.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { fontById, labelFontFaceCss } from '../../../model/fonts';
import { defineVariant } from '../shared';
import { TABULAR_FIGURES, hasLine, liveClockJs, slot } from './shared';

const CLOCK_ELEMENT = 'lower-third-clock';

export const ls29: TemplateVariant = defineVariant(
  {
    id: 'ls29',
    category: 'lower-third',
    name: 'Field Report',
    styleTag: 'noacg',
    roleTag: 'location',
    keywords: ['reporter', 'correspondent', 'dateline', 'location', 'live', 'clock', 'field', 'on scene', 'news'],
    description: 'A dateline and live clock on one rail, with the reporter named beneath.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Dateline', sample: 'Kyiv · Ukraine' },
      { title: 'Reporter', sample: 'Tomas Reid' },
      { title: 'Role', sample: 'Eastern Europe Correspondent' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-left', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Field Report',
    description:
      'The correspondent strap: the dateline set in the house mono above the name — apart ' +
      'from it, the way print sets a dateline apart from a byline — with a live clock on the ' +
      'same rail, then the reporter and their beat beneath. The clock reads the playout ' +
      'machine’s own time, so it cannot go stale during a long live.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- House structure: [8px accent bar] | [void panel: dateline rail, then the reporter]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
      <div class="lower-third-datelinerow">
${hasLine(o, 0) ? slot(o, 0, 'lower-third-name', '        ') : ''}
        <!-- The clock — paintLowerThirdClock() (in the JS) repaints this as the minute turns. -->
        <span id="${CLOCK_ELEMENT}" class="lower-third-clock">20:14</span>
      </div>
${slot(o, 1, 'lower-third-title')}
${slot(o, 2, 'lower-third-extra')}
    </div>`,

    runtimeExtraJs: liveClockJs(CLOCK_ELEMENT),

    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The accent bar — 8px, fused to the panel's left edge, with the house's one glow. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  left: 0;                          /* at the very left edge */
  top: 0;                           /* full panel height… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  box-shadow: var(--accent-glow);   /* the family's accent glow */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}

/* The panel — the house void, starting where the accent bar ends. */
.lower-third-box {
  margin-left: calc(8px * var(--scale));    /* starts where the accent bar ends */
  padding: calc(18px * var(--scale)) calc(52px * var(--scale)) calc(24px * var(--scale)) calc(32px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
  max-width: calc(740px * var(--scale));  /* a correspondent's beat runs long */
}

/* The dateline rail: where and when, together and apart from the name. */
.lower-third-datelinerow {
  display: flex;                    /* dateline and clock on one row */
  align-items: baseline;            /* one shared baseline */
  gap: calc(14px * var(--scale));   /* the drawn separator sits in this gap */
  min-width: 0;                     /* allow shrinking */
}
.lower-third-datelinerow > .lower-third-mask {
  display: flex;                    /* the dateline hugs its own text… */
  min-width: 0;                     /* …and may shrink */
}

/* The dateline (f0) — the house label voice in the accent. */
.lower-third-name {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* a dateline is small by convention */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.3;                 /* single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* KYIV · UKRAINE, whatever the operator types */
  color: var(--accent);             /* the dateline carries the colour */
}

/* The clock — the same mono voice, dimmed, behind a drawn separator so the pair reads as
   one dateline rather than as two facts. */
.lower-third-clock {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* the dateline's own size */
  font-weight: 500;                 /* matches the dateline */
  line-height: 1.3;                 /* matches the dateline */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  ${TABULAR_FIGURES}
  color: var(--text-dim);           /* dimmed — the place leads, the time follows */
  white-space: nowrap;              /* a clock never wraps */
}
.lower-third-clock::before {
  content: "·";                     /* the separator is DRAWN, never typed into a field */
  margin-right: calc(14px * var(--scale));  /* balances the flex gap on the other side */
  color: var(--text-dim);           /* the same quiet register */
}

/* The reporter (f1) — the strap's headline, below the dateline. */
.lower-third-title {
  font-size: calc(42px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.06;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
  margin-top: calc(10px * var(--scale));  /* a clear break below the dateline rail */
}

/* The beat (f2) — the quiet closing line. */
.lower-third-extra {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* clearly below the name */
  font-weight: 400;                 /* regular — hierarchy comes from the name's weight */
  line-height: 1.25;                /* room if a long beat wraps */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(6px * var(--scale));  /* tied to the name above it */
}`,
    hasAccent: true,
  }),
);
