// gt04 "Stage Ring" — the composed sibling of gt03 (Sunny Pop), ported from the refined
// iteration of the same children's game-show brief: a deep stage-dark disc with an accent
// border, the accent drain ring glowing around it, bright accent digits, small dots
// pulsing gently at the edge, and a bordered pill plate holding the label underneath.
// Family: sport worn playful (bold accent border and slab shadows, heavy rounded type —
// judge it against lt05/lt06). The source deliberately reins the bounce in: a controlled
// back-out pop for the entrance (timer-run's stock curve — the source used the exact same
// back.out(1.4)), a gentle float while it holds, a crisp snap on every tick, and the one
// exuberant moment saved for the payoff — at zero the dots burst and the clock cheers.
// The drain ring, tick snap, and last-three-seconds urgency are playout runtime
// (badgeRingRuntimeJs) riding the shared countdown clock — all OUTSIDE the marked region.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { badgeRingRuntimeJs, defineGameTimerVariant } from './shared';

export const gt04: TemplateVariant = defineGameTimerVariant(
  {
    id: 'gt04',
    category: 'game-timer',
    name: 'Stage Ring',
    styleTag: 'sport',
    description: 'A dark stage disc with a glowing accent drain ring and a pill label — controlled pop, crisp ticks, one big payoff at zero.',
    maxLines: 1,
    suggestedLines: [{ title: 'Label', sample: 'TIME LEFT' }],
    logo: 'none',
    animationPresets: ['timer-run', 'timer-line-reveal'],
    defaultPalette: paletteById('royal'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Stage Ring',
    description:
      'The composed kids’ game-show timer: a deep stage-dark disc with an accent ' +
      'border, a glowing accent ring that drains as time runs, bright accent digits, ' +
      'gently pulsing dots, and a bordered pill label plate underneath. A controlled ' +
      'pop in, a crisp snap per tick, and the bounce saved for the zero payoff.',
    uicolor: '5',
  },
  (o) => ({
    // Stack = badge (dots + dark face + track/drain rings + clock) over the pill plate,
    // all centered under the mid-center anchor. The hidden #f1 minutes source is
    // appended by the assembler; the drain-ring painter is design-owned runtimeExtraJs.
    html: `    <!-- Stage Ring: [badge: dots + dark face + drain ring + clock] / [pill label plate]. -->
    <div class="game-timer-box">
      <!-- The badge — its gentle float lives here (CSS), on an element no preset tweens. -->
      <div class="game-timer-badge">
        <!-- Six small dots pulsing at the badge edge; they burst outward at zero. -->
        <div class="game-timer-dot game-timer-dot-1"></div>
        <div class="game-timer-dot game-timer-dot-2"></div>
        <div class="game-timer-dot game-timer-dot-3"></div>
        <div class="game-timer-dot game-timer-dot-4"></div>
        <div class="game-timer-dot game-timer-dot-5"></div>
        <div class="game-timer-dot game-timer-dot-6"></div>
        <!-- The stage face — a deep panel disc with an accent border. -->
        <div class="game-timer-face"></div>
        <!-- The rings — a faint full track, and the accent ring the runtime drains. -->
        <svg class="game-timer-ring" viewBox="0 0 400 400" aria-hidden="true">
          <circle class="game-timer-ring-track" cx="200" cy="200" r="180" />
          <circle class="game-timer-ring-fill" cx="200" cy="200" r="180" />
        </svg>
        <!-- The clock — the countdown runtime repaints this every second as M:SS. -->
        <div class="game-timer-clock">3:00</div>
      </div>
      <!-- The pill plate — #f0 is the SPX field, masked inside the bordered pill. -->
      <div class="game-timer-plate">
        <div class="game-timer-mask"><span id="f0">${o.lines[0]?.sample || 'TIME LEFT'}</span></div>
      </div>
    </div>`,
    css: `/* The stack: badge over pill plate, centered — one simple flex column on the anchor. */
.game-timer-box {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* badge first, pill label below */
  align-items: center;             /* everything centered on the anchor */
  text-align: center;              /* wrapped label rows stay centered too */
  gap: calc(24px * var(--scale));  /* air between the badge and the plate */
}

/* The badge: a fixed square anchoring the face, rings, dots, and clock. The idle float
   lives HERE — an inner element no preset ever tweens — so the entrance pop on
   .game-timer-box and the float never fight over one transform. */
.game-timer-badge {
  position: relative;              /* anchors the absolutely-placed layers inside */
  width: calc(400px * var(--scale));   /* the badge square (the SVG viewBox is 400 too) */
  height: calc(400px * var(--scale));
  animation: game-timer-float 2.2s ease-in-out infinite alternate;  /* the calm hover */
}
@keyframes game-timer-float {
  to { transform: translateY(calc(-8px * var(--scale))); }  /* a gentle lift, and back */
}

/* The stage face: a deep panel disc with the accent border — the composed counterpart
   of Sunny Pop's accent face. Depth is painted with neutral light and slab shadows. */
.game-timer-face {
  position: absolute;              /* sits inside the rings */
  inset: calc(30px * var(--scale));  /* disc edge meets the ring (r=180 in the viewBox) */
  border-radius: 50%;              /* a perfect disc */
  border: calc(9px * var(--scale)) solid var(--accent);  /* the bold accent rim */
  background:
    radial-gradient(circle at 35% 28%, rgba(255,255,255,0.10), rgba(255,255,255,0) 58%),
    var(--panel-bg);               /* the deep stage panel behind the digits */
  box-shadow: var(--panel-shadow);  /* the face's authored panel depth */
}

/* The rings: a faint full track underneath, and the glowing accent ring the runtime
   drains second by second — the transition glides each step. */
.game-timer-ring {
  position: absolute;              /* the SVG fills the badge square exactly */
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);       /* the drain starts from 12 o'clock */
}
.game-timer-ring-track {
  fill: none;                      /* stroke-only circle */
  stroke: rgba(255,255,255,0.2);   /* the faint "empty" track the drain reveals */
  stroke-width: 14;                /* viewBox units, so it scales with the badge */
}
.game-timer-ring-fill {
  fill: none;                      /* stroke-only circle over the track */
  stroke: var(--accent);           /* the accent carries the remaining time */
  stroke-width: 14;                /* same weight as the track — they read as one ring */
  stroke-linecap: round;           /* a rounded end as the ring drains */
  stroke-dasharray: 1131;          /* the full circumference (2 × π × 180) */
  stroke-dashoffset: 0;            /* 0 = full ring; the runtime raises it toward 1131 */
  transition: stroke-dashoffset 0.45s ease-out;  /* glide each one-second step */
  filter: drop-shadow(0 0 calc(8px * var(--scale)) var(--accent));  /* restrained glow */
}

/* The dots: small and composed — a gentle pulse on staggered delays, not a dance. */
.game-timer-dot {
  position: absolute;              /* placed around the badge edge below */
  width: calc(20px * var(--scale));
  height: calc(20px * var(--scale));
  border-radius: 50%;              /* candy = circles, just quieter here */
  box-shadow: 0 calc(4px * var(--scale)) calc(8px * var(--scale)) rgba(0,0,0,0.35);  /* small lift */
  animation: game-timer-pulse 0.9s ease-in-out infinite alternate;  /* the calm breath */
}
@keyframes game-timer-pulse {
  from { transform: scale(1); }    /* breathe… */
  to   { transform: scale(1.18); } /* …just enough to feel alive */
}
/* Positions around the ring; accent and dimmed dots alternate (one-accent discipline). */
.game-timer-dot-1 { background: var(--accent);   top: calc(-6px * var(--scale)); left: calc(190px * var(--scale)); }
.game-timer-dot-2 { background: var(--text-dim); top: calc(88px * var(--scale)); right: calc(0px * var(--scale)); animation-delay: 0.15s; }
.game-timer-dot-3 { background: var(--accent);   bottom: calc(88px * var(--scale)); right: calc(0px * var(--scale)); animation-delay: 0.3s; }
.game-timer-dot-4 { background: var(--text-dim); bottom: calc(-6px * var(--scale)); left: calc(190px * var(--scale)); animation-delay: 0.45s; }
.game-timer-dot-5 { background: var(--accent);   bottom: calc(88px * var(--scale)); left: calc(0px * var(--scale)); animation-delay: 0.6s; }
.game-timer-dot-6 { background: var(--text-dim); top: calc(88px * var(--scale)); left: calc(0px * var(--scale)); animation-delay: 0.75s; }

/* The clock: bright accent digits on the dark stage — the tick snap (runtime GSAP)
   scales this element, so it gets the will-change hint. */
.game-timer-clock {
  position: absolute;              /* centered over the whole badge… */
  inset: 0;
  display: flex;                   /* …with flexbox doing the centering */
  align-items: center;
  justify-content: center;
  font-size: calc(88px * var(--scale));  /* the loudest element on screen */
  font-weight: 800;                /* heavy, friendly digits */
  letter-spacing: 0.01em;          /* a touch of air between the heavy digits */
  color: var(--accent);            /* the accent carries the number — the show's hero */
  text-shadow:
    0 calc(5px * var(--scale)) 0 rgba(0,0,0,0.5),        /* the hard slab offset */
    0 calc(12px * var(--scale)) calc(20px * var(--scale)) rgba(0,0,0,0.55);  /* soft depth */
  font-variant-numeric: tabular-nums;  /* every digit one width — no jiggle per tick */
  will-change: transform;          /* hint the browser: the tick snap scales this */
}

/* The pill plate: a bordered stadium holding the label — it hugs the text and wraps
   gracefully when the operator types a long line (the box's max-width is the cap). */
.game-timer-plate {
  width: fit-content;              /* the pill hugs its label */
  max-width: 100%;                 /* never wider than the auto-fit cap on the box */
  padding: calc(16px * var(--scale)) calc(44px * var(--scale));  /* generous pill padding */
  background: var(--panel-bg);     /* the same stage panel as the face */
  border: calc(3px * var(--scale)) solid var(--accent);  /* the accent rim, slimmer here */
  border-radius: calc(60px * var(--scale));  /* full stadium — stays a pill when it wraps */
  box-shadow: 0 calc(10px * var(--scale)) calc(24px * var(--scale)) rgba(0,0,0,0.4);  /* one soft lift */
}

/* The label: bright spaced-out caps — clearly a tag, never competing with the clock. */
.game-timer-mask > span {
  font-size: calc(26px * var(--scale));  /* kicker scale inside the pill */
  font-weight: 800;                /* enough weight for wide-tracked caps to carry */
  line-height: 1.3;                /* relaxed rows if a long label wraps */
  letter-spacing: var(--label-tracking);  /* the label's authored tracking */
  text-transform: uppercase;       /* whatever the operator types reads as a label */
  color: var(--label-color);       /* the family's label colour */
}

/* ── The last three seconds: the runtime adds .game-timer-ending on the root. ── */

/* The drain ring pulses to say "hurry!" — opacity only, the drain position untouched. */
.game-timer-ending .game-timer-ring-fill {
  animation: game-timer-urgent 0.5s ease-in-out infinite;
}
@keyframes game-timer-urgent {
  50% { stroke-opacity: 0.4; }     /* dip mid-pulse; back to full each second */
}

/* ── Time's up: the clock runtime adds .game-timer-done on the root at zero. ── */

/* The one saved bounce: the clock cheers — four swells, ending back at rest. */
.game-timer-done .game-timer-clock {
  animation: game-timer-cheer 0.4s ease-in-out 4 alternate;
}
@keyframes game-timer-cheer {
  to { transform: scale(1.16); }   /* swell up… and alternate brings it back down */
}

/* The dots burst outward and fade — the quiet design's confetti moment. */
.game-timer-done .game-timer-dot {
  animation: game-timer-burst 0.7s ease-out forwards;
}
@keyframes game-timer-burst {
  to { transform: scale(2.4); opacity: 0; }  /* swell and vanish — the payoff */
}`,
    tokens: {
      panelShadow:
        '0 calc(14px * var(--scale)) 0 rgba(0,0,0,0.35), 0 calc(28px * var(--scale)) calc(52px * var(--scale)) rgba(0,0,0,0.5), inset 0 calc(-14px * var(--scale)) calc(30px * var(--scale)) rgba(0,0,0,0.4), inset 0 calc(14px * var(--scale)) calc(26px * var(--scale)) rgba(255,255,255,0.07)',
      labelTracking: '0.15em',
    },
    // No autoEase override: timer-run's stock back.out(1.4) IS this source's entrance.
    // Drain ring + crisp per-tick snap + the last-three-seconds state.
    runtimeExtraJs: badgeRingRuntimeJs('snap'),
  }),
);
