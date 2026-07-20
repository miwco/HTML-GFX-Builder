// Ticker motion presets. Same marked-region + knob contract as every category, and — per the
// easing doctrine — the travel/loop itself is LINEAR (ease: 'none'); only entrances/exits ease.
//
// The ticker structure contract (see shared.ts):
//   .ticker (root, opacity:0) → .ticker-box (the strip) → [.ticker-label with #f1]
//     → .ticker-viewport (overflow hidden) → #ticker-track (items injected by rebuildTicker())
//
// The strip's fade is ordinary keyframeable motion and lives here. The TRAVEL is not: a
// marquee slides by its track's measured width, a flip runs one segment per item, and both
// depend on the operator's text. So the region does not inline that code — it calls a named
// builder from tickerMotion.ts (emitted outside the region) and adds what it returns. That
// keeps the region fully parseable, which is what lets these templates be data blocks with a
// read-only "measured motion" segment on the timeline (docs/DYNAMIC_MOTION_SCOPE.md).

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster (scales the loop speed)
var easeIn = '${cfg.easeIn}';   // entrance ease (the strip's fade-in — the loop itself stays linear)
var easeOut = '${cfg.easeOut}';   // exit ease (the fade-out)`;
}

/** The exit is the same fade for every ticker preset — the loop just stops. */
function outTimeline(): string {
  return `// buildOutTimeline(): fade the strip away and stop the motion.
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.ticker-box', { opacity: 0, duration: 0.4 / animSpeed, ease: easeOut });
  tl.set('.ticker', { opacity: 0 });           // fully hidden; ready to play again
  return tl;
}`;
}

export const TICKER_PRESETS: AnimPreset[] = [
  {
    id: 'ticker-marquee' as AnimPresetId,
    name: 'Marquee loop',
    description: 'The classic news ticker — items travel across the strip in a seamless, endless loop.',
    autoEase: { easeIn: 'power2.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Marquee loop — a seamless, endless right-to-left travel.
${knobs(cfg)}

// buildInTimeline(): fade the strip in, then run the marquee forever (until stop()).
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.ticker', { opacity: 1 });           // reveal the (CSS-hidden) graphic
  tl.fromTo('.ticker-box', { opacity: 0 }, { opacity: 1, duration: 0.5 / animSpeed, ease: easeIn });
  // The travel itself is MEASURED from the rendered items — see tickerMarquee() above.
  tl.add(tickerMarquee('#ticker-track'));
  return tl;
}

${outTimeline()}
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
  var tl = gsap.timeline();
  tl.set('.ticker', { opacity: 1 });           // reveal the (CSS-hidden) graphic
  tl.fromTo('.ticker-box', { opacity: 0 }, { opacity: 1, duration: 0.5 / animSpeed, ease: easeIn });
  // One flip segment PER ITEM — the count comes from the operator's text. See tickerFlipCycle().
  tl.add(tickerFlipCycle('#ticker-track'));
  return tl;
}

${outTimeline()}
${MARK_CLOSE}`,
  },

  {
    id: 'ticker-rotate' as AnimPresetId,
    name: 'Timed rotate',
    description: 'One item at a time, advanced by the graphic’s own timer — pausable on air.',
    autoEase: { easeIn: 'power2.out', easeOut: 'power2.in' },
    // Rotating is a create-time decision, not a motion swap: the assembler emits
    // TICKER_ROTATE / TICKER_DOUBLE_ITEMS and the rotate CSS outside the marked region, and
    // the cycling itself comes from the state machine. Applying this to a marquee template
    // after creation would drop the marquee's dynamic while those knobs stayed marquee-shaped,
    // leaving a ticker that renders a doubled row and never moves again.
    structural: true,
    // The entrance FINISHES. That is the whole point of this preset: the cycling comes from
    // the graphic's state machine, and a machine timer arms only when its state's timeline
    // ends. The two endless presets above can never carry one (a call scheduled at an endless
    // timeline's end never fires), which is why a timed ticker needs an entrance of its own
    // rather than a flag on theirs.
    emit: (cfg) => `${MARK_OPEN}
// Preset: Timed rotate — fade the strip in and show the first item. The ADVANCE between
// items is a state-machine timer, not motion authored here, so this timeline ends.
${knobs(cfg)}

// buildInTimeline(): reveal the strip and put the first item up.
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.ticker', { opacity: 1 });           // reveal the (CSS-hidden) graphic
  tl.fromTo('.ticker-box', { opacity: 0 }, { opacity: 1, duration: 0.5 / animSpeed, ease: easeIn });
  // Show item one. Every later item arrives on the machine's beat (see tickerShowNext).
  tl.call(function () { if (typeof tickerShowNext === 'function') tickerShowNext(); });
  return tl;
}

${outTimeline()}
${MARK_CLOSE}`,
  },
];

export function tickerPresetById(id: AnimPresetId): AnimPreset {
  const p = TICKER_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown ticker preset: ${id}`);
  return p;
}
