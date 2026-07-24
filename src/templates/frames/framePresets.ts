// Camera-frame motion presets. Same marked-region + knob contract as every other category —
// this emit is the SOURCE the NOACG_ANIM data block is converted from at create
// (shared/standard.ts convertToDataRegion).
//
// A frame is chrome AROUND a picture, so its choreography has two beats and no measured
// motion at all: the window edge arrives, then the nameplate settles under it. Everything is
// ordinary keyframable transform/opacity work on real selectors, which is exactly why these
// presets need no builder and no runtime of their own — the whole thing survives the
// conversion as plain keyframes the timeline can edit.
//
// The frame structure contract (see shared.ts):
//   .frame (root, opacity:0) → .frame-box (the full-frame stage)
//     → .frame-window (one per camera hole — the drawn edge)
//     → .frame-plate  (one per nameplate) → .frame-mask > #fN lines
//
// A split-screen design carries TWO windows and TWO plates under the same classes, so one
// preset drives one camera or four without knowing how many there are.

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster
var easeIn = '${cfg.easeIn}';   // entrance ease — arrives fast, settles smooth
var easeOut = '${cfg.easeOut}';   // exit ease — starts naturally, leaves quickly`;
}

/** Selectors for the visible line elements, e.g. "'#f0', '#f1'". */
function lineList(count: number): string {
  return Array.from({ length: Math.max(1, count) }, (_, i) => `'#f${i}'`).join(', ');
}

export const FRAME_PRESETS: AnimPreset[] = [
  {
    id: 'frame-draw' as AnimPresetId,
    name: 'Frame draw',
    description: 'In: the window edge scales up into place, then the nameplate settles under it. Out: both leave together.',
    autoEase: { easeIn: 'expo.out', easeOut: 'power3.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Frame draw — the window edge scales up into place from just inside itself, then
// the nameplate rises under it and its lines slide up from behind their masks.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.frame', { opacity: 1 });                  // reveal the (CSS-hidden) graphic
  tl.fromTo('.frame-window',
    { scale: 0.965, opacity: 0 },                    // starts just inside its final size…
    { scale: 1, opacity: 1, duration: 0.55 / animSpeed }  // …and settles onto the edge
  );
  tl.fromTo('.frame-plate',
    { y: 18, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.4 / animSpeed },
    '-=0.25'                                         // the plate joins while the edge settles
  );
  tl.fromTo([${lineList(cfg.lineCount)}],
    { yPercent: 110 },                               // start hidden below the mask edge
    { yPercent: 0, duration: 0.42 / animSpeed, stagger: 0.07 / animSpeed },
    '-=0.24'
  );
  return tl;
}

// buildOutTimeline(): the exit — the plate drops away, the edge shrinks back, faster.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.frame-plate', { y: 14, opacity: 0, duration: 0.26 / animSpeed });
  tl.to('.frame-window', { scale: 0.975, opacity: 0, duration: 0.3 / animSpeed }, '-=0.16');
  tl.set('.frame', { opacity: 0 });                  // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: 'frame-fade' as AnimPresetId,
    name: 'Frame fade',
    description: 'In: the whole surround crossfades up, no movement. Out: it fades away. The calmest choice.',
    autoEase: { easeIn: 'sine.out', easeOut: 'sine.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Frame fade — a pure opacity dissolve of the whole surround. Nothing moves, which is
// what a frame that has to sit on screen for a long interview wants.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.frame', { opacity: 1 });                  // reveal the (CSS-hidden) graphic
  tl.fromTo('.frame-box',
    { opacity: 0 },
    { opacity: 1, duration: 0.6 / animSpeed }
  );
  tl.fromTo([${lineList(cfg.lineCount)}],
    { opacity: 0 },
    { opacity: 1, duration: 0.45 / animSpeed, stagger: 0.1 / animSpeed },
    '-=0.3'                                          // the names join while the surround fades up
  );
  return tl;
}

// buildOutTimeline(): the exit — fades away faster than it arrived.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.frame-box', { opacity: 0, duration: 0.4 / animSpeed });
  tl.set('.frame', { opacity: 0 });                  // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: 'frame-slide' as AnimPresetId,
    name: 'Frame slide',
    description: 'In: the surround rises into place from below and the nameplates follow. Out: it sinks back down.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Frame slide — the whole surround rises in from below; the nameplate lines follow.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.frame', { opacity: 1 });                  // reveal the (CSS-hidden) graphic
  tl.fromTo('.frame-box',
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.55 / animSpeed }
  );
  tl.fromTo([${lineList(cfg.lineCount)}],
    { yPercent: 110 },                               // start hidden below the mask edge
    { yPercent: 0, duration: 0.45 / animSpeed, stagger: 0.08 / animSpeed },
    '-=0.3'
  );
  return tl;
}

// buildOutTimeline(): the exit — sinks back down and fades, faster.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.frame-box', { y: 22, opacity: 0, duration: 0.36 / animSpeed });
  tl.set('.frame', { opacity: 0 });                  // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },
];

export function framePresetById(id: AnimPresetId): AnimPreset {
  const p = FRAME_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown frame preset: ${id}`);
  return p;
}
