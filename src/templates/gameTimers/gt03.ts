// gt03 "Sunny Pop" — the children's game-show timer: a big sunny accent badge with the
// clock at its heart, a bright drain ring riding its edge, six candy dots dancing around
// it, and a heavy sticker-style heading below. Ported from an AI-generated design for the
// brief "a countdown timer for a children's game show: playful, big, friendly, bouncy
// motion", rebuilt on the house contracts. Family: sport's playful cousin — bold accent
// slab, heavy weights, hard sticker-offset shadows (judge it against lt05/lt06) — with
// the bounce dial all the way up: the whole graphic pops in on an elastic curve (the
// design's autoEase), the badge wobbles gently while it holds (design-owned CSS on an
// inner element no preset ever tweens, so it never fights the entrance), the clock
// bounces on every tick, and at zero the dots burst outward while the clock cheers.
// The drain ring, tick bounce, and last-three-seconds urgency are playout runtime
// (badgeRingRuntimeJs) riding the shared countdown clock — all OUTSIDE the marked region.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { badgeRingRuntimeJs, defineGameTimerVariant } from './shared';

export const gt03: TemplateVariant = defineGameTimerVariant(
  {
    id: 'gt03',
    category: 'game-timer',
    name: 'Sunny Pop',
    styleTag: 'sport',
    description: 'A big sunny badge clock ringed by dancing dots — elastic pop-in, a bouncing tick, and a burst at zero.',
    maxLines: 1,
    suggestedLines: [{ title: 'Heading', sample: 'GET READY!' }],
    logo: 'none',
    animationPresets: ['timer-run'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Sunny Pop',
    description:
      'The kids’ game-show timer: a big sunny accent badge with the clock at its ' +
      'heart, a bright ring that drains as time runs, six candy dots dancing around it, ' +
      'and a heavy sticker heading below. Pops in elastically, the clock bounces every ' +
      'tick, and the dots burst outward when time is up.',
    uicolor: '3',
  },
  (o) => ({
    // Stack = badge (dots + face + drain ring + clock) over the sticker heading, all
    // centered under the mid-center anchor. The hidden #f1 minutes source is appended
    // by the assembler; the drain-ring painter is design-owned runtime (runtimeExtraJs).
    html: `    <!-- Sunny Pop: [badge: dots + sunny face + drain ring + clock] / [sticker heading]. -->
    <div class="game-timer-box">
      <!-- The badge — its gentle wobble lives here (CSS), on an element no preset tweens. -->
      <div class="game-timer-badge">
        <!-- Six candy dots dancing around the badge; they burst outward at zero. -->
        <div class="game-timer-dot game-timer-dot-1"></div>
        <div class="game-timer-dot game-timer-dot-2"></div>
        <div class="game-timer-dot game-timer-dot-3"></div>
        <div class="game-timer-dot game-timer-dot-4"></div>
        <div class="game-timer-dot game-timer-dot-5"></div>
        <div class="game-timer-dot game-timer-dot-6"></div>
        <!-- The sunny face — one solid accent disc with painted light for the toy depth. -->
        <div class="game-timer-face"></div>
        <!-- The drain ring — the runtime empties it second by second as the clock runs. -->
        <svg class="game-timer-ring" viewBox="0 0 400 400" aria-hidden="true">
          <circle class="game-timer-ring-fill" cx="200" cy="200" r="180" />
        </svg>
        <!-- The clock — the countdown runtime repaints this every second as M:SS. -->
        <div class="game-timer-clock">3:00</div>
      </div>
      <!-- The heading line — #f0 is the SPX field; big friendly sticker type. -->
      <div class="game-timer-mask"><span id="f0">${o.lines[0]?.sample || 'GET READY!'}</span></div>
    </div>`,
    css: `/* The stack: badge over heading, centered — one simple flex column on the anchor. */
.game-timer-box {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* badge first, heading below */
  align-items: center;             /* everything centered on the anchor */
  text-align: center;              /* wrapped heading rows stay centered too */
  gap: calc(20px * var(--scale));  /* air between the badge and the heading */
}

/* The badge: a fixed square anchoring the face, ring, dots, and clock. The idle wobble
   lives HERE — an inner element no preset ever tweens — so the elastic entrance pop on
   .game-timer-box and the wobble never fight over one transform. */
.game-timer-badge {
  position: relative;              /* anchors the absolutely-placed layers inside */
  width: calc(400px * var(--scale));   /* the badge square (the SVG viewBox is 400 too) */
  height: calc(400px * var(--scale));
  animation: game-timer-wobble 2.6s ease-in-out infinite;  /* the playful idle wobble */
}
@keyframes game-timer-wobble {
  0%, 100% { transform: rotate(-2.5deg) translateY(0); }               /* lean left… */
  50%      { transform: rotate(2.5deg) translateY(calc(-10px * var(--scale))); }  /* …sway right and lift */
}

/* The sunny face: the accent IS the panel here (the sport family's bold slab, rounded
   for kids). The depth is painted with neutral light — highlight up top, shade below,
   a hard sticker offset — so the Style panel can retint it to any accent coherently. */
.game-timer-face {
  position: absolute;              /* sits inside the drain ring's track */
  inset: calc(30px * var(--scale));  /* disc edge meets the ring (r=180 in the viewBox) */
  border-radius: 50%;              /* a perfect disc */
  background:
    radial-gradient(circle at 35% 28%, rgba(255,255,255,0.4), rgba(255,255,255,0) 62%),
    var(--accent);                 /* one accent, worn boldly — the sunny toy face */
  box-shadow: var(--panel-shadow);  /* the face's authored panel depth */
}

/* The drain ring: rides the badge edge. The runtime moves stroke-dashoffset once a
   second and this transition glides each step — the ring EMPTIES as time runs out. */
.game-timer-ring {
  position: absolute;              /* the SVG fills the badge square exactly */
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);       /* the drain starts from 12 o'clock */
}
.game-timer-ring-fill {
  fill: none;                      /* a stroke-only circle */
  stroke: var(--text-color);       /* a bright ring — the face already owns the accent */
  stroke-width: 16;                /* viewBox units, so it scales with the badge */
  stroke-linecap: round;           /* friendly rounded end as the ring drains */
  stroke-dasharray: 1131;          /* the full circumference (2 × π × 180) */
  stroke-dashoffset: 0;            /* 0 = full ring; the runtime raises it toward 1131 */
  transition: stroke-dashoffset 0.45s ease-out;  /* glide each one-second step */
}

/* The candy dots: bright confetti around the badge, dancing on staggered delays. */
.game-timer-dot {
  position: absolute;              /* placed around the badge edge below */
  width: calc(26px * var(--scale));
  height: calc(26px * var(--scale));
  border-radius: 50%;              /* candy = circles */
  box-shadow: 0 calc(4px * var(--scale)) calc(8px * var(--scale)) rgba(0,0,0,0.3);  /* small lift */
  animation: game-timer-dance 0.8s ease-in-out infinite alternate;  /* the happy jiggle */
}
@keyframes game-timer-dance {
  from { transform: scale(1); }    /* breathe… */
  to   { transform: scale(1.35); } /* …and swell, back and forth */
}
/* Positions around the ring; accent and bright dots alternate (one-accent discipline). */
.game-timer-dot-1 { background: var(--text-color); top: calc(-10px * var(--scale)); left: calc(187px * var(--scale)); }
.game-timer-dot-2 { background: var(--accent);     top: calc(84px * var(--scale));  right: calc(-4px * var(--scale)); animation-delay: 0.13s; }
.game-timer-dot-3 { background: var(--text-color); bottom: calc(84px * var(--scale)); right: calc(-4px * var(--scale)); animation-delay: 0.26s; }
.game-timer-dot-4 { background: var(--accent);     bottom: calc(-10px * var(--scale)); left: calc(187px * var(--scale)); animation-delay: 0.39s; }
.game-timer-dot-5 { background: var(--text-color); bottom: calc(84px * var(--scale)); left: calc(-4px * var(--scale)); animation-delay: 0.52s; }
.game-timer-dot-6 { background: var(--accent);     top: calc(84px * var(--scale));  left: calc(-4px * var(--scale)); animation-delay: 0.65s; }

/* The clock: big friendly digits centered on the face — the tick bounce (runtime GSAP)
   scales this element, so it gets the will-change hint. */
.game-timer-clock {
  position: absolute;              /* centered over the whole badge… */
  inset: 0;
  display: flex;                   /* …with flexbox doing the centering */
  align-items: center;
  justify-content: center;
  font-size: calc(88px * var(--scale));  /* the loudest element on screen */
  font-weight: 800;                /* maximum friendly weight */
  letter-spacing: 0.01em;          /* a touch of air between the heavy digits */
  color: var(--text-color);        /* bright digits on the accent face */
  text-shadow:
    0 calc(6px * var(--scale)) 0 rgba(0,0,0,0.22),       /* the hard sticker offset */
    0 calc(10px * var(--scale)) calc(18px * var(--scale)) rgba(0,0,0,0.35);  /* soft depth */
  font-variant-numeric: tabular-nums;  /* every digit one width — no jiggle per tick */
  will-change: transform;          /* hint the browser: the tick bounce scales this */
}

/* This design doesn't use the masked line reveal (its preset pops the whole graphic),
   so the mask stays open — the sticker shadows below would clip against a hidden mask. */
.game-timer-mask {
  overflow: visible;               /* let the heading's offset shadows breathe */
}

/* The heading: heavy sticker type — bright fill, accent outline, hard offset shadow. */
.game-timer-mask > span {
  font-size: calc(58px * var(--scale));  /* big and friendly, still below the clock */
  font-weight: var(--display-weight);  /* the heading's authored display weight */
  line-height: 1.12;               /* tight rows when a long heading wraps */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* game-show energy, whatever the operator types */
  color: var(--text-color);        /* bright fill… */
  -webkit-text-stroke: calc(2.5px * var(--scale)) var(--accent);  /* …with the accent outline */
  text-shadow:
    0 calc(5px * var(--scale)) 0 rgba(0,0,0,0.25),       /* the hard sticker offset */
    0 calc(9px * var(--scale)) calc(16px * var(--scale)) rgba(0,0,0,0.35);  /* soft depth */
}

/* ── The last three seconds: the runtime adds .game-timer-ending on the root. ── */

/* The ring pulses to say "hurry!" — opacity only, so the drain position is untouched. */
.game-timer-ending .game-timer-ring-fill {
  animation: game-timer-urgent 0.5s ease-in-out infinite;
}
@keyframes game-timer-urgent {
  50% { stroke-opacity: 0.4; }     /* dip mid-pulse; back to full each second */
}

/* ── Time's up: the clock runtime adds .game-timer-done on the root at zero. ── */

/* The clock cheers — four quick swells, ending back at rest (alternate = clean finish). */
.game-timer-done .game-timer-clock {
  animation: game-timer-cheer 0.45s ease-in-out 4 alternate;
}
@keyframes game-timer-cheer {
  to { transform: scale(1.22); }   /* swell up… and alternate brings it back down */
}

/* The dots burst outward like confetti and fade — they return on the next play(). */
.game-timer-done .game-timer-dot {
  animation: game-timer-burst 0.8s ease-out forwards;
}
@keyframes game-timer-burst {
  to { transform: scale(2.6); opacity: 0; }  /* swell and vanish — the celebration */
}`,
    // The kids-show default: the whole badge springs in on an elastic curve. An explicit
    // easing pick in the wizard still overrides this pair.
    autoEase: { easeIn: 'elastic.out(1, 0.55)', easeOut: 'power2.in' },
    tokens: {
      panelShadow:
        '0 calc(14px * var(--scale)) 0 rgba(0,0,0,0.18), 0 calc(26px * var(--scale)) calc(50px * var(--scale)) rgba(0,0,0,0.35), inset 0 calc(-16px * var(--scale)) calc(34px * var(--scale)) rgba(0,0,0,0.16), inset 0 calc(16px * var(--scale)) calc(34px * var(--scale)) rgba(255,255,255,0.28)',
      displayWeight: '800',
    },
    // Drain ring + exuberant per-tick clock bounce + the last-three-seconds state.
    runtimeExtraJs: badgeRingRuntimeJs('bounce'),
  }),
);
