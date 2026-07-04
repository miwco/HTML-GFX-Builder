// End-credits motion presets. Same marked-region + knob contract as every category
// (animSpeed / easeIn / easeOut), but the travel itself is LINEAR (ease: 'none') per the
// easing doctrine — continuous motion never eases. animSpeed scales the travel speed.
//
// The credits structure contract (see shared.ts):
//   .credits (root, opacity:0) → .credits-box (viewport, overflow hidden)
//     → #credits-track (rows injected by rebuildCredits())
// The end of the track is the .credits-end block (logo placeholder + year).

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster (scales travel speed)
var easeIn = '${cfg.easeIn}';   // entrance ease (the fade-in — travel itself stays linear)
var easeOut = '${cfg.easeOut}';   // exit ease (the fade-out)`;
}

export const CREDITS_PRESETS: AnimPreset[] = [
  {
    id: 'credits-roll' as AnimPresetId,
    name: 'Rolling credits',
    description: 'The classic upward roll — linear travel that stops with the logo + year centered.',
    autoEase: { easeIn: 'power2.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Rolling credits — linear upward travel; ends holding the logo + year centered.
${knobs(cfg)}

// buildInTimeline(): fade in, then roll the track up at a steady reading speed.
function buildInTimeline() {
  var box = document.querySelector('.credits-box');
  var track = document.getElementById('credits-track');
  var endBlock = track.querySelector('.credits-end');

  // Start with the track just below the viewport; stop when the end block is centered.
  var startY = box.clientHeight;
  var endY = -(track.scrollHeight - box.clientHeight / 2 - endBlock.offsetHeight / 2);
  var distance = startY - endY;
  var pixelsPerSecond = 90 * animSpeed;        // reading speed — raise for faster credits

  var tl = gsap.timeline();
  tl.set('.credits', { opacity: 1 });          // reveal the (CSS-hidden) graphic
  tl.fromTo('.credits-box', { opacity: 0 }, { opacity: 1, duration: 0.6 / animSpeed, ease: easeIn });
  tl.fromTo(track,
    { y: startY },
    { y: endY, duration: distance / pixelsPerSecond, ease: 'none' }  // constant speed — never eased
  );
  return tl;
}

// buildOutTimeline(): a clean fade — credits don't animate back down.
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.credits-box', { opacity: 0, duration: 0.5 / animSpeed, ease: easeOut });
  tl.set('.credits', { opacity: 0 });          // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: 'credits-pages' as AnimPresetId,
    name: 'One-pager swap',
    description: 'Each section appears as a full page, holds long enough to read, then swaps to the next.',
    autoEase: { easeIn: 'power2.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: One-pager swap — sections fade in as pages, hold, and swap; the last page
// (logo + year) stays up until stop().
${knobs(cfg)}

// buildInTimeline(): sequence every .credits-page, then the .credits-end block.
function buildInTimeline() {
  var pages = document.querySelectorAll('#credits-track .credits-page, #credits-track .credits-end');
  var tl = gsap.timeline();
  tl.set('.credits', { opacity: 1 });          // reveal the (CSS-hidden) graphic
  tl.set('.credits-box', { opacity: 1 });      // undo a previous stop()'s box fade - replays start visible
  tl.set(pages, { opacity: 0 });               // all pages start hidden

  pages.forEach(function (page, i) {
    var rows = page.children.length;
    var holdSeconds = Math.max(2.5, rows * 0.9) / animSpeed;  // longer pages hold longer
    tl.fromTo(page, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 / animSpeed, ease: easeIn });
    if (i < pages.length - 1) {
      // Hold, then hand over to the next page. The final page holds until stop().
      tl.to(page, { opacity: 0, duration: 0.4 / animSpeed, ease: easeOut }, '+=' + holdSeconds);
    }
  });
  return tl;
}

// buildOutTimeline(): fade whatever is on screen.
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.credits-box', { opacity: 0, duration: 0.5 / animSpeed, ease: easeOut });
  tl.set('.credits', { opacity: 0 });          // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: 'credits-crawl' as AnimPresetId,
    name: 'Horizontal crawl',
    description: 'A single-line crawl across the frame — linear, ticker-style, ends on the logo + year.',
    autoEase: { easeIn: 'power2.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Horizontal crawl — the track travels across the frame at constant speed and
// finishes with the logo + year block. Flip the direction by swapping startX/endX.
${knobs(cfg)}

// buildInTimeline(): fade in the strip, then crawl the track from right to left.
function buildInTimeline() {
  var box = document.querySelector('.credits-box');
  var track = document.getElementById('credits-track');

  var startX = box.clientWidth;                          // enter from the right edge…
  var endX = -(track.scrollWidth - box.clientWidth);     // …stop with the track's end visible
  var distance = startX - endX;
  var pixelsPerSecond = 160 * animSpeed;                 // crawl speed

  var tl = gsap.timeline();
  tl.set('.credits', { opacity: 1 });          // reveal the (CSS-hidden) graphic
  tl.fromTo('.credits-box', { opacity: 0 }, { opacity: 1, duration: 0.4 / animSpeed, ease: easeIn });
  tl.fromTo(track,
    { x: startX },
    { x: endX, duration: distance / pixelsPerSecond, ease: 'none' }  // constant speed — never eased
  );
  return tl;
}

// buildOutTimeline(): fade the strip away.
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.credits-box', { opacity: 0, duration: 0.4 / animSpeed, ease: easeOut });
  tl.set('.credits', { opacity: 0 });          // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },
];

export function creditsPresetById(id: AnimPresetId): AnimPreset {
  const p = CREDITS_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown credits preset: ${id}`);
  return p;
}
