// ls28 "Live Remote" — the flag that says this is happening now, and where.
//
// The oldest specialist strap in news, and the one with the most rules attached to it. LIVE
// is a claim: it means the pictures are not recorded, and every newsroom style guide treats
// putting it up wrongly as a serious error. That is why the flag is a separate element from
// the place — an operator turns the claim on and off without retyping the location — and why
// it is the one thing on the graphic that moves after the entrance has finished.
//
// The pulsing dot is design-owned CSS animation, not part of the marked ANIMATION region: it
// is a property of the flag rather than a choreography, so swapping the motion preset must
// never take it away. The clock is real, ticking, and reads the playout machine's own time —
// a hand-typed one goes stale the moment the strap stays up longer than expected.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { TABULAR_FIGURES, hasLine, liveClockJs, slot } from './shared';

const CLOCK_ELEMENT = 'lower-third-clock';

export const ls28: TemplateVariant = defineVariant(
  {
    id: 'ls28',
    category: 'lower-third',
    name: 'Live Remote',
    styleTag: 'minimal',
    roleTag: 'location',
    keywords: ['live', 'location', 'remote', 'clock', 'time', 'breaking', 'on scene', 'dateline', 'news'],
    description: 'A pulsing LIVE flag, the location, and a real ticking clock.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Flag', sample: 'Live' },
      { title: 'Location', sample: 'Kyiv' },
      { title: 'Context', sample: 'Independence Square' },
    ],
    logo: 'none',
    // The rail arrives along its own axis, the way a station flag does.
    animationPresets: ['slide-left', 'mask-wipe', 'fade', 'slide-up', 'line-reveal', 'slide-down'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Live Remote',
    description:
      'The remote flag: a pulsing LIVE mark, the location beside it, and a clock that reads ' +
      'the playout machine’s own time rather than a value someone typed — so it cannot go ' +
      'stale while the strap is up. The flag is its own SPX field, so the claim is turned on ' +
      'and off without retyping the place.',
    uicolor: '2',
  },
  (o) => {
    // The flag CELL is unconditional — it holds the pulsing dot, which is this design's
    // .lower-third-accent node and is keyframed by selector in the animation data — while the
    // word is the operator's field. A dot with no word still reads as a live mark, and
    // dropping the cell would take the accent element out from under the timeline.
    const flag = `      <!-- The LIVE claim. The word is its own field, so it can be retitled or dropped alone. -->
      <div class="lower-third-flag">
        <div class="lower-third-accent"></div>
${hasLine(o, 0) ? `        <div class="lower-third-mask"><span id="f0" class="lower-third-name">${o.lines[0].sample}</span></div>\n` : ''}      </div>
`;

    return {
      html: `    <!-- The rail: [LIVE flag] | [location · context] | [ticking clock]. -->
    <div class="lower-third-box">
${flag}      <div class="lower-third-text">
${slot(o, 1, 'lower-third-title', '        ')}
${slot(o, 2, 'lower-third-extra', '        ')}
      </div>
      <!-- The clock — paintLowerThirdClock() (in the JS) repaints this as the minute turns. -->
      <div class="lower-third-clockcell"><span id="${CLOCK_ELEMENT}" class="lower-third-clock">20:14</span></div>
    </div>`,

      runtimeExtraJs: liveClockJs(CLOCK_ELEMENT),

      css: `/* The rail — one horizontal run, square-ended: a news flag is not a card. */
.lower-third-box {
  display: flex;                    /* flag, place, clock */
  align-items: stretch;             /* every cell runs the rail's full height */
  background: var(--panel-bg);      /* the quiet panel behind the text */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
}

/* The flag cell — filled in the reserved colour, so LIVE reads before anything else. */
.lower-third-flag {
  flex: none;                       /* never squeezed by a long location */
  max-width: calc(230px * var(--scale));  /* LIVE is four characters; anything longer clips
                                             inside its own cell rather than taking the rail */
  overflow: hidden;                 /* the clip is what makes the max-width real (bench) */
  display: flex;                    /* the dot and the word on one row */
  align-items: center;              /* vertically centred */
  gap: calc(9px * var(--scale));
  padding: calc(11px * var(--scale)) calc(18px * var(--scale)) calc(12px * var(--scale)) calc(16px * var(--scale));
  background: var(--accent);        /* THE live colour */
}

/* The pulsing dot — the graphic's accent node, and the one thing that keeps moving after
   the entrance settles. The animation is DESIGN-owned CSS, deliberately outside the marked
   ANIMATION region: a preset swap must never take the pulse away, because the pulse is what
   makes the flag read as live rather than as a label. */
.lower-third-accent {
  flex: none;                       /* never squeezed */
  width: calc(11px * var(--scale)); /* a small dot… */
  height: calc(11px * var(--scale));
  border-radius: 50%;               /* …round */
  background: var(--accent-ink);    /* drawn in the flag's ink, so it reads ON the fill */
  animation: lower-third-live-pulse 2s ease-in-out infinite;  /* the only continuous motion here */
}
@keyframes lower-third-live-pulse {
  0%, 100% { opacity: 1; }          /* full */
  50%      { opacity: 0.35; }       /* …and back, slowly: a heartbeat, not a blink */
}

/* The flag word (f0). Bounded and clipped: LIVE is four characters, so a long value
   ellipsizes inside the flag rather than laying out wider than the cell and colliding with
   the location beside it (the runtime bench proves it). */
.lower-third-name {
  display: block;                   /* so the width bound and the ellipsis apply */
  max-width: calc(150px * var(--scale));  /* the flag's inner width — the measured cap */
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* a mark, not a headline */
  font-weight: 800;                 /* the heaviest weight on the rail, on purpose */
  line-height: 1.2;                 /* single tight row */
  letter-spacing: 0.12em;           /* widely tracked — the flag's own voice */
  text-transform: uppercase;        /* LIVE, whatever the operator types */
  color: var(--accent-ink);         /* the family's ink for text ON accent */
  white-space: nowrap;              /* the flag never wraps… */
  overflow: hidden;                 /* …and a too-long one is clipped… */
  text-overflow: ellipsis;          /* …with an honest ellipsis */
}

/* The place cell. */
.lower-third-text {
  display: flex;                    /* location over context */
  flex-direction: column;           /* top to bottom */
  justify-content: center;          /* vertically centred against the flag */
  min-width: 0;                     /* let it shrink so long place names wrap */
  padding: calc(9px * var(--scale)) calc(24px * var(--scale)) calc(10px * var(--scale)) calc(22px * var(--scale));
}

/* The location (f1) — the rail's headline. */
.lower-third-title {
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: 600;                 /* semibold: present without shouting */
  line-height: 1.12;                /* room if a long place name wraps */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;        /* the dateline voice */
  color: var(--text-color);         /* primary text color */
}

/* The context (f2) — the more precise place, and the first line to drop. */
.lower-third-extra {
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* the smallest voice on the rail */
  font-weight: 400;                 /* regular — reference, not billing */
  line-height: 1.3;                 /* room if it wraps */
  color: var(--text-dim);           /* dimmed — never the primary ink twice */
  margin-top: calc(2px * var(--scale));  /* tied to the location above it */
}

/* The clock cell — closes the rail, behind its own divider. */
.lower-third-clockcell {
  flex: none;                       /* sized by the figure it holds */
  display: flex;                    /* centre the figure */
  align-items: center;              /* vertically */
  padding: calc(9px * var(--scale)) calc(22px * var(--scale));
  border-left: 1px solid rgba(255, 255, 255, 0.14);  /* the cell divider */
}

/* The clock. Tabular figures so the minute turning never nudges the rail's width. */
.lower-third-clock {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* reads at a glance */
  font-weight: 500;                 /* medium — a figure needs weight to hold */
  line-height: 1;                   /* one tight figure */
  letter-spacing: 0.02em;           /* a touch of air between figures */
  ${TABULAR_FIGURES}
  color: var(--text-color);         /* primary text color */
  white-space: nowrap;              /* a clock never wraps */
}`,
      hasAccent: true,
    };
  },
);
