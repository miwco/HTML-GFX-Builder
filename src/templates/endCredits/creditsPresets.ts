// End-credits motion presets. Same marked-region + knob contract as every category
// (animSpeed / easeIn / easeOut), but the travel itself is LINEAR (ease: 'none') per the
// easing doctrine — continuous motion never eases. animSpeed scales the travel speed.
//
// The credits structure contract (see shared.ts):
//   .credits (root, opacity:0) → .credits-box (viewport, overflow hidden)
//     → #credits-track (rows injected by rebuildCredits())
// The end of the track is the .credits-end block (logo placeholder + year).
//
// The box's fade is ordinary keyframeable motion and lives here. The TRAVEL is not: a roll
// covers its own content height, a crawl its own width, a page swap runs one segment per
// page — all measured from the operator's text. So the region does not inline that code — it
// calls a named builder from creditsMotion.ts (emitted outside the region) and adds what it
// returns. That keeps the region fully parseable, which is what lets these templates be data
// blocks with a read-only "measured motion" segment on the timeline
// (docs/DYNAMIC_MOTION_SCOPE.md).

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster (scales travel speed)
var easeIn = '${cfg.easeIn}';   // entrance ease (the fade-in — travel itself stays linear)
var easeOut = '${cfg.easeOut}';   // exit ease (the fade-out)`;
}

/** The exit is the same clean fade for every credits preset — credits never roll back down. */
function outTimeline(seconds: number): string {
  return `// buildOutTimeline(): a clean fade — credits don't animate back down.
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.credits-box', { opacity: 0, duration: ${seconds} / animSpeed, ease: easeOut });
  tl.set('.credits', { opacity: 0 });          // fully hidden; ready to play again
  return tl;
}`;
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
  var tl = gsap.timeline();
  tl.set('.credits', { opacity: 1 });          // reveal the (CSS-hidden) graphic
  tl.fromTo('.credits-box', { opacity: 0 }, { opacity: 1, duration: 0.6 / animSpeed, ease: easeIn });
  // The roll's distance is MEASURED from the rendered rows — see creditsRoll() above.
  tl.add(creditsRoll('#credits-track'));
  return tl;
}

${outTimeline(0.5)}
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

// buildInTimeline(): sequence every page in the track.
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.credits', { opacity: 1 });          // reveal the (CSS-hidden) graphic
  tl.set('.credits-box', { opacity: 1 });      // undo a previous stop()'s box fade — replays start visible
  // One segment PER PAGE, each holding as long as its own row count needs. See creditsPages().
  tl.add(creditsPages('#credits-track'));
  return tl;
}

${outTimeline(0.5)}
${MARK_CLOSE}`,
  },

  {
    id: 'credits-crawl' as AnimPresetId,
    name: 'Horizontal crawl',
    description: 'A single-line crawl across the frame — linear, ticker-style, ends on the logo + year.',
    autoEase: { easeIn: 'power2.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Horizontal crawl — the track travels across the frame at constant speed and
// finishes with the logo + year block.
${knobs(cfg)}

// buildInTimeline(): fade in the strip, then crawl the track from right to left.
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.credits', { opacity: 1 });          // reveal the (CSS-hidden) graphic
  tl.fromTo('.credits-box', { opacity: 0 }, { opacity: 1, duration: 0.4 / animSpeed, ease: easeIn });
  // The crawl's distance is MEASURED from the rendered track — see creditsCrawl() above.
  tl.add(creditsCrawl('#credits-track'));
  return tl;
}

${outTimeline(0.4)}
${MARK_CLOSE}`,
  },
];

export function creditsPresetById(id: AnimPresetId): AnimPreset {
  const p = CREDITS_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown credits preset: ${id}`);
  return p;
}
