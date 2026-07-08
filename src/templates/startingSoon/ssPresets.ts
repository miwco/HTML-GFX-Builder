// Starting-soon motion presets. Same marked-region + knob contract as every category.
// A holding screen is CALM by design: one gentle entrance, a ticking clock, and a barely
// visible breath — nothing else moves. The countdown itself lives OUTSIDE the marked
// region (templates/shared/clock.ts); the preset only calls startClock() / stopClock().
//
// The starting-soon structure contract (see shared.ts):
//   .starting-soon (root, opacity:0) → .starting-soon-box (the panel) → .starting-soon-mask #f0/#f1 lines, .starting-soon-clock,
//     and exactly one element with class "starting-soon-pulse" — the breath target.

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster (also paces the breath)
var easeIn = '${cfg.easeIn}';   // entrance ease (the panel's rise — the breath stays sine)
var easeOut = '${cfg.easeOut}';   // exit ease (the fade-out)`;
}

export const SS_PRESETS: AnimPreset[] = [
  {
    id: 'hold-loop' as AnimPresetId,
    name: 'Hold loop',
    description: 'A calm hold — the panel fades in, the countdown starts, and one element breathes gently until stop().',
    autoEase: { easeIn: 'power2.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Hold loop — one gentle entrance, then the screen simply holds: the clock
// ticks and the pulse element breathes. Calm, not busy — it may hold for minutes.
${knobs(cfg)}

// The running timeline. killTweensOf('*') only reaches DOM tweens, so each build
// kills the previous timeline too — that also cancels a still-pending startClock call.
var activeTl = null;

// buildInTimeline(): fade the panel in, start the countdown, then breathe forever.
function buildInTimeline() {
  if (activeTl) activeTl.kill();               // cancel the previous in/out completely
  var tl = gsap.timeline();
  activeTl = tl;
  tl.set('.starting-soon', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.starting-soon-box',
    { opacity: 0, y: 24 },                     // start slightly low and invisible
    { opacity: 1, y: 0, duration: 0.7 / animSpeed, ease: easeIn }
  );
  tl.call(startClock);                         // the countdown begins as the panel settles
  // The ambient hold: a subtle breath on the pulse element, looping until stop().
  tl.fromTo('.starting-soon-pulse',
    { scale: 1 },
    {
      scale: 1.04,                             // barely there — a breath, not a bounce
      duration: 2.4 / animSpeed,               // slow enough to feel like waiting music
      ease: 'sine.inOut',                      // the softest curve for a loop
      yoyo: true,                              // back down as smoothly as up
      repeat: -1,                              // loop until stop()
    }
  );
  return tl;
}

// buildOutTimeline(): stop the countdown and fade the screen away.
function buildOutTimeline() {
  if (activeTl) activeTl.kill();               // a mid-entrance stop() must win cleanly
  var tl = gsap.timeline();
  activeTl = tl;
  tl.call(stopClock);                          // freeze the clock before it fades
  tl.to('.starting-soon-box', { opacity: 0, duration: 0.5 / animSpeed, ease: easeOut });
  tl.set('.starting-soon', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },
];

export function ssPresetById(id: AnimPresetId): AnimPreset {
  const p = SS_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown starting-soon preset: ${id}`);
  return p;
}
