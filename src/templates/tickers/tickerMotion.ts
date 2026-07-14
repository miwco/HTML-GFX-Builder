// The ticker's MEASURED motion — the travel a keyframe cannot describe.
//
// A marquee slides exactly one set-width; an item flip runs one segment per item. Both
// magnitudes come from the operator's text, which changes on air — so no static keyframe
// number can hold them (docs/DYNAMIC_MOTION_SCOPE.md). Instead each one is a named BUILDER:
// a plain function that measures the DOM and returns a GSAP object. The animation data just
// references it by name (`"dynamics": [{ "build": "tickerMarquee", … }]`) and the
// interpreter adds what it returns.
//
// These ship OUTSIDE the marked ANIMATION region — design-owned runtime, like the countdown
// clock engine — so the timeline never rewrites them and you can edit the travel speed here.
// Both builders ship in every ticker: the data names the live one, and swapping the motion
// preset just swaps that name.

import { motionSpeedJs } from '../shared/base';

/** The ticker motion builders, emitted before the marked region in every ticker template. */
export const TICKER_MOTION_JS = `// ---- Measured motion (the animation data references these by name) ----
${motionSpeedJs}

// tickerMarquee(): the classic endless travel. The track holds the items TWICE, so sliding
// exactly one set width and repeating reads as seamless — and the width is measured here,
// at play() time, because it depends on how much text the operator typed.
function tickerMarquee(target) {
  var track = document.querySelector(target);
  if (!track) return null;
  var oneSetWidth = track.scrollWidth / 2;      // the items are rendered twice
  var pixelsPerSecond = 140 * motionSpeed();    // travel speed — raise for a faster ticker
  if (oneSetWidth <= 0) return null;            // nothing to scroll yet

  return gsap.fromTo(track,
    { x: 0 },
    {
      x: -oneSetWidth,                          // one full set = a perfect loop point
      duration: oneSetWidth / pixelsPerSecond,
      ease: 'none',                             // constant speed — never eased
      repeat: -1,                               // loop until stop()
    }
  );
}

// tickerFlipCycle(): items take turns — flip up in, hold long enough to read, flip out.
// One segment PER ITEM, so the sequence's length is the operator's line count: a content-
// driven shape, which is the other thing keyframes can't express.
function tickerFlipCycle(target) {
  var track = document.querySelector(target);
  if (!track) return null;
  var items = track.querySelectorAll('.ticker-item');
  if (!items.length) return null;
  var speed = motionSpeed();
  var holdSeconds = 3.2 / speed;                // reading time per item

  var cycle = gsap.timeline({ repeat: -1 });    // the endless item rotation
  cycle.set(items, { opacity: 0 }, 0);          // all items start hidden
  items.forEach(function (item) {
    cycle.fromTo(item, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 / speed, ease: 'power3.out' });
    cycle.to(item, { y: -18, opacity: 0, duration: 0.35 / speed, ease: 'power2.in' }, '+=' + holdSeconds);
  });
  return cycle;
}`;
