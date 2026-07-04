// Ticker motion presets. Same marked-region + knob contract as every category, and — per the
// easing doctrine — the travel/loop itself is LINEAR (ease: 'none'); only entrances/exits ease.
//
// The ticker structure contract (see shared.ts):
//   .ticker (root, opacity:0) → .ticker-box (the strip) → [.ticker-label with #f1]
//     → .ticker-viewport (overflow hidden) → #ticker-track (items injected by rebuildTicker())
// The marquee renders the items TWICE so the loop is seamless (xPercent -50 = one full set).

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster (scales the loop speed)
var easeIn = '${cfg.easeIn}';   // entrance ease (the strip's fade-in — the loop itself stays linear)
var easeOut = '${cfg.easeOut}';   // exit ease (the fade-out)`;
}

export const TICKER_PRESETS: AnimPreset[] = [
  {
    id: 'ticker-marquee' as AnimPresetId,
    name: 'Marquee loop',
    description: 'The classic news ticker — items travel across the strip in a seamless, endless loop.',
    autoEase: { easeIn: 'power2.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Marquee loop — a seamless, endless right-to-left travel. The track holds the
// items TWICE, so sliding exactly one set (-50%) and repeating looks continuous.
${knobs(cfg)}

// buildInTimeline(): fade the strip in, then run the loop forever (until stop()).
function buildInTimeline() {
  var track = document.getElementById('ticker-track');
  var oneSetWidth = track.scrollWidth / 2;     // the items are rendered twice
  var pixelsPerSecond = 140 * animSpeed;       // travel speed — raise for a faster ticker

  var tl = gsap.timeline();
  tl.set('.ticker', { opacity: 1 });           // reveal the (CSS-hidden) graphic
  tl.fromTo('.ticker-box', { opacity: 0 }, { opacity: 1, duration: 0.5 / animSpeed, ease: easeIn });
  tl.fromTo(track,
    { x: 0 },
    {
      x: -oneSetWidth,                         // one full set = a perfect loop point
      duration: oneSetWidth / pixelsPerSecond,
      ease: 'none',                            // constant speed — never eased
      repeat: -1,                              // loop until stop()
    }
  );
  return tl;
}

// buildOutTimeline(): fade the strip away and stop the loop.
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.ticker-box', { opacity: 0, duration: 0.4 / animSpeed, ease: easeOut });
  tl.set('.ticker', { opacity: 0 });           // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: 'ticker-flip' as AnimPresetId,
    name: 'Item flip',
    description: 'One item at a time — each holds long enough to read, then flips up to the next, looping.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Item flip — items take turns: flip up in, hold, flip out. Loops forever.
${knobs(cfg)}

// buildInTimeline(): fade the strip in, then cycle the items (until stop()).
function buildInTimeline() {
  var items = document.querySelectorAll('#ticker-track .ticker-item');
  var tl = gsap.timeline();
  tl.set('.ticker', { opacity: 1 });           // reveal the (CSS-hidden) graphic
  tl.fromTo('.ticker-box', { opacity: 0 }, { opacity: 1, duration: 0.5 / animSpeed, ease: easeIn });
  tl.set(items, { opacity: 0 });               // all items start hidden

  var cycle = gsap.timeline({ repeat: -1 });   // the endless item rotation
  items.forEach(function (item) {
    var holdSeconds = 3.2 / animSpeed;         // reading time per item
    cycle.fromTo(item, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 / animSpeed, ease: easeIn });
    cycle.to(item, { y: -18, opacity: 0, duration: 0.35 / animSpeed, ease: easeOut }, '+=' + holdSeconds);
  });
  tl.add(cycle);
  return tl;
}

// buildOutTimeline(): fade the strip away and stop the cycle.
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.ticker-box', { opacity: 0, duration: 0.4 / animSpeed, ease: easeOut });
  tl.set('.ticker', { opacity: 0 });           // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },
];

export function tickerPresetById(id: AnimPresetId): AnimPreset {
  const p = TICKER_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown ticker preset: ${id}`);
  return p;
}
