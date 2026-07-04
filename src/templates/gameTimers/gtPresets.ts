// Game-timer motion presets. Same marked-region + knob contract as every category. The
// countdown itself is playout logic (shared/clock.ts, emitted outside this block) — the
// preset only choreographs the entrance/exit and calls startClock() / stopClock().
//
// The game-timer structure contract (see shared.ts):
//   .gt (root, opacity:0) → .gt-box (the panel) → [.gt-accent?] → .gt-mask with the
//     #f0 label → .gt-clock (the countdown runtime paints M:SS; .gt-done = "time's up")
//
// The countdown is real time and the on-air clock is authoritative, so every preset
// calls startClock() at t = 0 of the in-timeline — never after the entrance settles.

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster (the countdown always ticks in real seconds)
var easeIn = '${cfg.easeIn}';   // entrance ease — arrives fast, settles smooth
var easeOut = '${cfg.easeOut}';   // exit ease — starts naturally, leaves quickly`;
}

export const GT_PRESETS: AnimPreset[] = [
  {
    id: 'timer-line-reveal' as AnimPresetId,
    name: 'Timer line reveal',
    description: 'The accent line draws in, the label rises from its mask, the clock fades up — elegant.',
    autoEase: { easeIn: 'expo.out', easeOut: 'power3.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Timer line reveal — the minimal-family entrance: the accent line draws in
// first, the label slides up from behind its overflow-hidden mask, the clock fades
// up last. The countdown itself starts at t = 0 — real time waits for no animation.
${knobs(cfg)}

// buildInTimeline(): accent → label → clock, staggered — never one blob.
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.call(startClock);                         // start ticking at once — on air, time rules
${
      cfg.hasAccent
        ? `  tl.fromTo('.${cfg.prefix}-accent',
    { scaleX: 0, transformOrigin: 'left center' },   // the line grows from its left end
    { scaleX: 1, duration: 0.45 / animSpeed }
  );`
        : `  tl.fromTo('.${cfg.prefix}-box', { opacity: 0 }, { opacity: 1, duration: 0.3 / animSpeed });`
    }
  tl.fromTo('#f0',
    { yPercent: 110 },                           // start hidden below the mask edge
    { yPercent: 0, duration: 0.55 / animSpeed },
    '-=0.15'                                     // overlap the accent for flow
  );
  tl.fromTo('.${cfg.prefix}-clock',
    { y: 14, opacity: 0 },                       // fromTo: replay always starts clean
    { y: 0, opacity: 1, duration: 0.5 / animSpeed },
    '-=0.35'                                     // the clock follows the label closely
  );
  return tl;
}

// buildOutTimeline(): freeze the countdown; the text drops back behind its mask and
// the accent retracts — exits run faster than entrances.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.call(stopClock);                            // stop ticking the moment we leave
  tl.to('#f0', { yPercent: 110, duration: 0.35 / animSpeed });
  tl.to('.${cfg.prefix}-clock', { y: 10, opacity: 0, duration: 0.3 / animSpeed }, '-=0.25');${
      cfg.hasAccent
        ? `
  tl.to('.${cfg.prefix}-accent', { scaleX: 0, transformOrigin: 'right center', duration: 0.3 / animSpeed }, '-=0.2');`
        : ''
    }
  tl.set('.${cfg.prefix}', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: 'timer-run' as AnimPresetId,
    name: 'Timer run',
    description: 'The clock pops in with a game-show snap, counts down, and pops away on stop.',
    autoEase: { easeIn: 'back.out(1.4)', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Timer run — the panel pops in (scale + fade with a small overshoot) while
// the countdown ticks. stop() freezes the clock and takes the panel away fast.
${knobs(cfg)}

// buildInTimeline(): start the countdown, then pop the panel in around it.
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.gt', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.call(startClock);                         // start ticking at once — on air, time rules
  tl.fromTo('.gt-box',
    { scale: 0.85, opacity: 0 },               // fromTo: replay always starts clean
    { scale: 1, opacity: 1, duration: 0.5 / animSpeed, ease: easeIn }
  );
  return tl;
}

// buildOutTimeline(): freeze the countdown, quick exit — exits run faster than entrances.
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.call(stopClock);                          // stop ticking the moment we leave
  tl.to('.gt-box', { scale: 0.9, opacity: 0, duration: 0.35 / animSpeed, ease: easeOut });
  tl.set('.gt', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },
];

export function gameTimerPresetById(id: AnimPresetId): AnimPreset {
  const p = GT_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown game-timer preset: ${id}`);
  return p;
}
