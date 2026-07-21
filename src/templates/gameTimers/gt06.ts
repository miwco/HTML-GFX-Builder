// gt06 "Frost Countdown" — the GLASS game timer, sibling of lt08 "Frosted Card" and the
// ss03 "Frost Hold" holding screen. A translucent blurred card with a soft rounded caps
// label above the clock set inside a frosted pill ringed in the accent color (lt09's pill,
// ss03's ring). Its default motion is the family's soft back.out pop (timer-run); at zero
// the clock turns the accent color and the ring flashes.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineGameTimerVariant } from './shared';

export const gt06: TemplateVariant = defineGameTimerVariant(
  {
    id: 'gt06',
    category: 'game-timer',
    name: 'Frost Countdown',
    styleTag: 'glass',
    description: 'A frosted card with a soft label over a clock set in an accent-ringed glass pill.',
    maxLines: 1,
    suggestedLines: [{ title: 'Label', sample: 'BREAK' }],
    logo: 'none',
    // Glass pops in softly (back.out); the line reveal stays available as the alternative.
    animationPresets: ['timer-run', 'timer-line-reveal'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'top-center',
  },
  {
    name: 'Frost Countdown',
    description:
      'The glass countdown, sibling of lt08 Frosted Card and the ss03 Frost Hold: a ' +
      'translucent blurred card holding a soft rounded caps label above the clock, which ' +
      'sits inside a frosted pill ringed in the accent color. It pops in on a soft back.out; ' +
      'at zero the clock turns the accent color and the ring flashes.',
    uicolor: '3',
  },
  (o) => ({
    // Card = label mask + the clock pill. The clock element itself is what the countdown
    // runtime paints (and what the type's pause/resume group dims), so the pill only wraps it.
    html: `    <!-- Frost Countdown: one frosted card — a soft label over the clock in a glass pill. -->
    <div class="game-timer-box">
      <!-- The label line — #f0 is the SPX field; presets reveal it from its mask. -->
      <div class="game-timer-mask"><span id="f0" class="game-timer-label">${o.lines[0]?.sample || 'BREAK'}</span></div>
      <!-- The clock pill — a second layer of glass with an accent ring around the time. -->
      <div class="game-timer-pill">
        <span class="game-timer-clock">3:00</span>
      </div>
    </div>`,
    css: `/* The frosted card — lt08's glass panel, sized for a label and a clock pill. */
.game-timer-box {
  display: flex;                   /* label above the pill… */
  flex-direction: column;          /* …stacked */
  align-items: center;             /* both centered on the card's axis */
  text-align: center;              /* a wrapped label stays centered */
  padding: calc(26px * var(--scale)) calc(40px * var(--scale));  /* even card air */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* The label — a soft rounded caps kicker in the accent color (glass's label voice). */
.game-timer-label {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* label scale — announces, never competes */
  font-weight: 600;                /* semibold keeps small caps legible */
  line-height: 1.2;                /* compact single-line label */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* label voice, whatever the operator types */
  color: var(--label-color);       /* glass carries the accent in the label */
}

/* The clock pill — lt09's glass capsule, a second layer of the same glass. */
.game-timer-pill {
  position: relative;              /* anchors the ::after accent ring */
  display: inline-flex;            /* hug the clock; centered by the card */
  align-items: center;             /* the time sits on the capsule's centerline */
  margin-top: calc(18px * var(--scale));  /* clear air — the clock is its own moment */
  padding: calc(12px * var(--scale)) calc(40px * var(--scale));  /* generous capsule padding */
  border-radius: 999px;            /* full pill — a cap, not a size, so it is never scaled */
  background: var(--panel-bg);     /* a second layer of the same glass reads slightly denser */
  will-change: transform, opacity; /* hint the browser: timer-run pops this in */
}

/* Accent ring — a softened halo drawn by a pseudo-element, so the border stays pure
   var(--accent) (the Style panel retints it) and opacity does the softening. */
.game-timer-pill::after {
  content: '';                     /* pseudo-elements need content to render */
  position: absolute;              /* pinned over the capsule, out of the flex flow */
  inset: 0;                        /* cover the whole pill */
  border: calc(2px * var(--scale)) solid var(--accent);  /* the accent-tinted edge */
  border-radius: inherit;          /* follow the capsule's full rounding */
  opacity: 0.55;                   /* soften the ring without leaving the accent variable */
  pointer-events: none;            /* purely decorative overlay */
}

/* The clock — big and calm; tabular figures so digits never jiggle as they tick. */
.game-timer-clock {
  font-size: calc(58px * var(--scale) * var(--type-scale));  /* the focal element inside the pill */
  font-weight: 700;                /* the glass families run heavier weights */
  line-height: 1;                  /* one tight row of digits */
  letter-spacing: 0.01em;          /* a touch of air between figures */
  font-variant-numeric: tabular-nums;  /* every digit the same width — no jiggle */
  color: var(--text-color);        /* the brightest element on screen */
}

/* ── Time's up: the clock runtime adds .game-timer-done on the root at zero. ── */

/* The clock turns the accent color and the ring flashes — opacity only, so the ring holds. */
.game-timer-done .game-timer-clock {
  color: var(--accent);            /* zero reads in the accent color */
}
.game-timer-done .game-timer-pill::after {
  opacity: 1;                      /* the ring brightens at zero… */
  animation: game-timer-flash 0.5s ease-in-out 4;  /* …and flashes four times, then holds */
}
@keyframes game-timer-flash {
  50% { opacity: 0.2; }            /* dip mid-blink; settles back at full */
}`,
    hasAccent: false, // the accent moment is the pill's ring, not a drawn accent element
  }),
);
