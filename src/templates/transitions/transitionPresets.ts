// Transition motion presets — the full-frame moments that HIDE a cut: a stinger, a wipe, a
// replay bumper. Same marked-region + knob contract as every other category, so the emit is
// the SOURCE the NOACG_ANIM data block is converted from at create.
//
// THE CONTRACT A TRANSITION KEEPS, and it is the whole reason this is its own category:
//
//   play()  covers the frame and HOLDS there. That hold is the cut point — the vision mixer
//           switches underneath while nothing of either source is visible.
//   the OUT clears the frame again, revealing whatever is now behind it.
//
// So the entrance's settled pose is FULL COVER, not "the graphic is on screen". Every preset
// below ends its entrance with the covering surface across the frame, and every exit takes it
// off the other side — a transition that faded up and faded down in place would expose the cut.
//
// What fires the out is the transition TYPE's machine (src/templates/types/transitions.ts): a
// timer arrow from the entrance waypoint straight to the exit, plus `next` as the manual
// version. Nothing here schedules anything itself — a setTimeout in a preset would be motion
// the timeline cannot see and the render clock cannot drive.
//
// The transition structure contract (see shared.ts):
//   .transition (root, opacity:0) → .transition-box (the full-frame stage)
//     → .transition-panel (one or more covering surfaces)
//     → .transition-mark  (the centred lockup) → .transition-mask > #f0

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster
var easeIn = '${cfg.easeIn}';   // entrance ease — arrives fast, settles smooth
var easeOut = '${cfg.easeOut}';   // exit ease — starts naturally, leaves quickly`;
}

export const TRANSITION_PRESETS: AnimPreset[] = [
  {
    id: 'transition-slam' as AnimPresetId,
    name: 'Slam',
    description: 'In: angled slabs slam across the frame and the mark snaps on. Out: they slam off the same way.',
    autoEase: { easeIn: 'power4.out', easeOut: 'power4.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Slam — the covering slabs travel in from the left, staggered, until the frame is
// covered; the mark snaps on over them. The out sends them on out to the right, so the
// surface never reverses back over the cut it just hid.
${knobs(cfg)}

// buildInTimeline(): cover the frame. The settled pose is FULL COVER — this is the cut point.
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.transition', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.transition-panel',
    { xPercent: -128 },                                // fully off the left of the frame…
    { xPercent: 0, duration: 0.42 / animSpeed, stagger: 0.055 / animSpeed }  // …to covering it
  );
  tl.fromTo('.transition-mark',
    { scale: 1.12, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.3 / animSpeed },
    '-=0.18'                                           // the mark lands as the last slab arrives
  );
  return tl;
}

// buildOutTimeline(): clear the frame — the slabs carry on the way they came.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.transition-mark', { scale: 0.94, opacity: 0, duration: 0.18 / animSpeed });
  tl.to('.transition-panel',
    { xPercent: 128, duration: 0.4 / animSpeed, stagger: 0.05 / animSpeed },
    '-=0.1'
  );
  tl.set('.transition', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: 'transition-wipe' as AnimPresetId,
    name: 'Wipe',
    description: 'In: a band wipes across the frame until it is covered. Out: it wipes on off the far side.',
    autoEase: { easeIn: 'power3.inOut', easeOut: 'power3.inOut' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Wipe — the covering band travels straight across the frame, holds it covered, then
// continues off the far side. One direction of travel throughout: a wipe that came back the
// way it arrived would uncover the same picture it just covered.
${knobs(cfg)}

// buildInTimeline(): cover the frame. The settled pose is FULL COVER — this is the cut point.
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.transition', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.transition-panel',
    { xPercent: -112 },                                // fully off the left of the frame…
    { xPercent: 0, duration: 0.5 / animSpeed }         // …to covering it
  );
  tl.fromTo('.transition-mark',
    { opacity: 0, y: 14 },
    { opacity: 1, y: 0, duration: 0.28 / animSpeed },
    '-=0.16'                                           // the mark resolves once the band lands
  );
  return tl;
}

// buildOutTimeline(): clear the frame — the band carries on off the far side.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.transition-mark', { opacity: 0, duration: 0.16 / animSpeed });
  tl.to('.transition-panel', { xPercent: 112, duration: 0.46 / animSpeed }, '-=0.12');
  tl.set('.transition', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: 'transition-sweep' as AnimPresetId,
    name: 'Sweep',
    description: 'In: the cover rises over the frame and resolves out of a blur. Out: it lifts away upward.',
    autoEase: { easeIn: 'expo.out', easeOut: 'power3.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Sweep — the covering surface rises over the frame and resolves out of a blur, then
// lifts away upward. The softest of the three, for a programme whose cuts should feel like a
// dissolve rather than a hit.
${knobs(cfg)}

// buildInTimeline(): cover the frame. The settled pose is FULL COVER — this is the cut point.
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.transition', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.transition-panel',
    { yPercent: 108, filter: 'blur(18px)' },           // fully below the frame, soft…
    { yPercent: 0, filter: 'blur(0px)', duration: 0.56 / animSpeed, stagger: 0.05 / animSpeed }
  );
  tl.fromTo('.transition-mark',
    { opacity: 0, scale: 0.94 },
    { opacity: 1, scale: 1, duration: 0.34 / animSpeed },
    '-=0.24'
  );
  return tl;
}

// buildOutTimeline(): clear the frame — the cover lifts away upward, faster.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.transition-mark', { opacity: 0, scale: 0.96, duration: 0.2 / animSpeed });
  tl.to('.transition-panel',
    { yPercent: -108, duration: 0.44 / animSpeed, stagger: 0.045 / animSpeed },
    '-=0.14'
  );
  tl.set('.transition', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },
];

export function transitionPresetById(id: AnimPresetId): AnimPreset {
  const p = TRANSITION_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown transition preset: ${id}`);
  return p;
}
