// Infographic motion presets. Same marked-region + knob contract as every category.
// One preset per data shape:
//   - 'count-up' (stat designs): the big number counts from 0 to its value; any
//     accompanying .infographic-bar-fill progress bars grow to their data-value percent.
//   - 'bars-grow' (bar designs): every .infographic-bar-fill grows to its data-value percent.
//   - 'ring-fill' (ring designs): an SVG ring draws to the stat's percent while it counts.
//   - 'rows-cascade' (list designs): the rows of #infographic-rows rise in one after another.
//
// The infographic structure contract (see shared.ts):
//   .infographic (root, opacity:0) → .infographic-box (the panel) → stat value #f0 / #infographic-bars rows
//     / .infographic-ring-fill circle (pathLength="100") / #infographic-rows list rows

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster
var easeIn = '${cfg.easeIn}';   // entrance ease — arrives fast, settles smooth
var easeOut = '${cfg.easeOut}';   // exit ease — starts naturally, leaves quickly`;
}

export const IG_PRESETS: AnimPreset[] = [
  {
    id: 'count-up' as AnimPresetId,
    name: 'Count up',
    description: 'The panel rises in, then the big number counts from zero up to its value.',
    autoEase: { easeIn: 'expo.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Count up — reveal the panel, then count the stat (#f0) from 0 to its value.
${knobs(cfg)}

// buildInTimeline(): panel fades and rises in, then the number counts up.
function buildInTimeline() {
  var el = document.getElementById('f0');
  // Read the target from data-target (update() keeps it current) — NOT from the live
  // textContent, which is a mid-count value like "43%" if the last play was interrupted.
  var text = el.getAttribute('data-target');
  if (text === null) {                         // first play before any update():
    text = el.textContent;                     // seed it from the markup once
    el.setAttribute('data-target', text);
  }
  var target = parseFloat(text.replace(/,/g, '')); // leading number: "1,234%" -> 1234
  var suffix = text.replace(/^\\s*[-+]?[0-9.,]+/, ''); // what follows it: '%', ' pts'…

  var tl = gsap.timeline();
  tl.set('.infographic', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.infographic-box',
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.6 / animSpeed, ease: easeIn }
  );

  // Count only when the text actually starts with a number — otherwise leave it alone.
  if (!isNaN(target)) {
    var counter = { value: 0 };                // a plain object GSAP can tween
    tl.set(el, { textContent: '0' + suffix }); // zero AFTER storing the target above
    tl.to(counter, {
      value: target,
      duration: 1.6 / animSpeed,
      ease: easeIn,
      onUpdate: function () {
        el.textContent = Math.round(counter.value) + suffix;  // whole numbers read best
      },
      onComplete: function () {
        el.textContent = text;                 // restore the exact text (keeps decimals)
      },
    }, '-=0.2');                               // start while the panel is still settling
  }

  // Designs may pair progress bars with the counter — grow each one to its data-value
  // percent after the count. Harmless when the design has none (empty selection).
  var fills = document.querySelectorAll('.infographic-bar-fill');
  if (fills.length > 0) {
    tl.fromTo(fills,
      { width: '0%' },                         // fromTo = replay-safe (always starts empty)
      {
        width: function (i, bar) { return bar.getAttribute('data-value') + '%'; },
        duration: 0.9 / animSpeed,
        ease: easeIn,
        stagger: 0.1 / animSpeed,              // bars arrive one after another
      }
    );
  }
  return tl;
}

// buildOutTimeline(): quick fade away — exits run faster than entrances.
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.infographic-box', { opacity: 0, duration: 0.35 / animSpeed, ease: easeOut });
  tl.set('.infographic', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: 'bars-grow' as AnimPresetId,
    name: 'Bars grow',
    description: 'The panel pops in, then the bars grow to their values one after another.',
    autoEase: { easeIn: 'back.out(1.4)', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Bars grow — pop the panel in, then each bar grows to its data-value percent.
// The staged reveal runs past the usual 0.5-0.9s entrance window on purpose: a data
// chart earns the extra beats (panel first, then one bar per stagger step).
${knobs(cfg)}

// buildInTimeline(): the panel pops in (glass-family entrance), then the bars grow.
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.infographic', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.set('#infographic-bars .infographic-bar-fill', { width: '0%' });  // rebuilds render fills at value — empty them so they grow
  tl.fromTo('.infographic-box',
    { opacity: 0, y: 20, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.6 / animSpeed, ease: easeIn }
  );
  // Each fill grows from empty to its own data-value (0–100, written by the rebuild).
  // Deliberate width tween (not scaleX): scaling would squash the fill's rounded cap.
  // Fills keep power3.out whatever the entrance ease — a data bar must land exactly
  // on its value, so the panel's back.out overshoot never applies to the bars.
  tl.fromTo('#infographic-bars .infographic-bar-fill',
    { width: '0%' },
    {
      width: function (i, el) { return el.getAttribute('data-value') + '%'; },
      duration: 0.9 / animSpeed,
      ease: 'power3.out',
      stagger: 0.12 / animSpeed,               // bars arrive one after another
    }
  );
  return tl;
}

// buildOutTimeline(): quick fade away, then reset the bars for the next play().
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.infographic-box', { opacity: 0, duration: 0.35 / animSpeed, ease: easeOut });
  tl.set('.infographic', { opacity: 0 });               // fully hidden; ready to play again
  tl.set('#infographic-bars .infographic-bar-fill', { width: '0%' });  // bars grow again on replay
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: 'ring-fill' as AnimPresetId,
    name: 'Ring fill',
    description: 'The panel rises in, then a ring draws around the stat while the number counts up.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Ring fill — reveal the panel, then draw the ring to the stat's percent while
// the number (#f0) counts up in sync. The ring is an SVG circle with pathLength="100",
// so dashoffset 100 = empty and dashoffset (100 - percent) = filled to that percent.
${knobs(cfg)}

// buildInTimeline(): panel fades and rises in, then ring + counter run together.
function buildInTimeline() {
  var el = document.getElementById('f0');
  // Read the target from data-target (update() keeps it current) — NOT from the live
  // textContent, which is a mid-count value if the last play was interrupted.
  var text = el.getAttribute('data-target');
  if (text === null) {                         // first play before any update():
    text = el.textContent;                     // seed it from the markup once
    el.setAttribute('data-target', text);
  }
  var target = parseFloat(text);               // leading number: "87%" -> 87
  if (isNaN(target)) target = 0;               // non-numeric text: ring stays empty
  target = Math.max(0, Math.min(100, target)); // a ring can only show 0–100
  var suffix = text.replace(/^\\s*[-+]?[0-9.,]+/, ''); // what follows it: '%', ' pts'…

  var tl = gsap.timeline();
  tl.set('.infographic', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.set('.infographic-ring-fill', { strokeDashoffset: 100 });  // replay-safe: always start empty
  tl.fromTo('.infographic-box',
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.6 / animSpeed, ease: easeIn }
  );

  // Draw the ring and count the number in ONE tween block so they finish together.
  var counter = { value: 0 };                  // a plain object GSAP can tween
  tl.set(el, { textContent: '0' + suffix });   // zero AFTER storing the target above
  tl.to('.infographic-ring-fill', {
    strokeDashoffset: 100 - target,            // dash offset shrinks as the ring fills
    duration: 1.4 / animSpeed,
    ease: easeIn,
  }, '-=0.2');                                 // start while the panel is still settling
  tl.to(counter, {
    value: target,
    duration: 1.4 / animSpeed,
    ease: easeIn,
    onUpdate: function () {
      el.textContent = Math.round(counter.value) + suffix;  // whole numbers read best
    },
    onComplete: function () {
      el.textContent = text;                   // restore the exact text (keeps decimals)
    },
  }, '<');                                     // '<' = in sync with the ring draw

  return tl;
}

// buildOutTimeline(): quick fade away, then reset the ring for the next play().
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.infographic-box', { opacity: 0, duration: 0.35 / animSpeed, ease: easeOut });
  tl.set('.infographic', { opacity: 0 });               // fully hidden; ready to play again
  tl.set('.infographic-ring-fill', { strokeDashoffset: 100 });  // ring draws again on replay
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: 'rows-cascade' as AnimPresetId,
    name: 'Rows cascade',
    description: 'The panel rises in, then the rows cascade up into place one after another.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Rows cascade — reveal the panel, then each row of #infographic-rows rises in with a
// short stagger. fromTo tweens make the cascade replay-safe (rows always start hidden).
${knobs(cfg)}

// buildInTimeline(): panel fades and rises in, then the rows cascade up one by one.
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.infographic', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.infographic-box',
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.6 / animSpeed, ease: easeIn }
  );
  // Every direct child of #infographic-rows is one row — rise + fade, staggered down the list.
  tl.fromTo('#infographic-rows > *',
    { y: 16, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.4 / animSpeed,
      stagger: 0.08 / animSpeed,               // rows arrive one after another
      ease: easeIn,
    },
    '-=0.2'                                    // start while the panel is still settling
  );
  return tl;
}

// buildOutTimeline(): quick fade away — fromTo entrances make replays reset themselves.
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.infographic-box', { opacity: 0, duration: 0.35 / animSpeed, ease: easeOut });
  tl.set('.infographic', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },
];

export function igPresetById(id: AnimPresetId): AnimPreset {
  const p = IG_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown infographic preset: ${id}`);
  return p;
}
