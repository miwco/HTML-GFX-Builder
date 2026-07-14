// The credits' MEASURED motion — the travel a keyframe cannot describe.
//
// A roll travels the height of its own content and stops with the logo centered; a crawl
// travels its own width; a page swap runs one segment per page and holds each one long
// enough to read. Every one of those magnitudes comes from the operator's text, which
// changes on air — so no static keyframe number can hold them
// (docs/DYNAMIC_MOTION_SCOPE.md). Instead each is a named BUILDER: a plain function that
// measures the DOM and returns a GSAP object. The animation data references it by name
// (`"dynamics": [{ "build": "creditsRoll", … }]`) and the interpreter adds what it returns.
//
// These ship OUTSIDE the marked ANIMATION region — design-owned runtime, like the countdown
// clock engine — so the timeline never rewrites them and you can edit the reading speed
// here. All three ship in every credits template: the data names the live one, and swapping
// the motion preset just swaps that name.

import { motionSpeedJs } from '../shared/base';

/** The credits motion builders, emitted before the marked region in every credits template. */
export const CREDITS_MOTION_JS = `// ---- Measured motion (the animation data references these by name) ----
${motionSpeedJs}

// creditsRoll(): the classic upward roll. Starts just below the viewport and stops with the
// end block (logo + year) centered — both measured here, at play() time, because they
// depend on how many names the operator listed.
function creditsRoll(target) {
  var track = document.querySelector(target);
  var box = document.querySelector('.credits-box');
  if (!track || !box) return null;
  var endBlock = track.querySelector('.credits-end');

  var startY = box.clientHeight;                              // enter from below the viewport…
  var endY = -(track.scrollHeight - box.clientHeight / 2 - (endBlock ? endBlock.offsetHeight : 0) / 2);
  var distance = startY - endY;                               // …and stop on the end block
  var pixelsPerSecond = 90 * motionSpeed();                   // reading speed — raise for faster credits
  if (distance <= 0) return null;

  return gsap.fromTo(track,
    { y: startY },
    { y: endY, duration: distance / pixelsPerSecond, ease: 'none' }  // constant speed — never eased
  );
}

// creditsCrawl(): a single-line horizontal crawl. Same idea as the roll, along x — the
// travel is the track's own width, so it always finishes on the end block.
// Flip the direction by swapping startX/endX.
function creditsCrawl(target) {
  var track = document.querySelector(target);
  var box = document.querySelector('.credits-box');
  if (!track || !box) return null;

  var startX = box.clientWidth;                               // enter from the right edge…
  var endX = -(track.scrollWidth - box.clientWidth);          // …stop with the track's end visible
  var distance = startX - endX;
  var pixelsPerSecond = 160 * motionSpeed();                  // crawl speed
  if (distance <= 0) return null;

  return gsap.fromTo(track,
    { x: startX },
    { x: endX, duration: distance / pixelsPerSecond, ease: 'none' }  // constant speed — never eased
  );
}

// creditsPages(): each section appears as a full page, holds, then swaps to the next. One
// segment PER PAGE, and each page's hold is derived from its own row count — a content-
// driven shape, which is the other thing keyframes can't express. The last page (logo +
// year) stays up until stop().
function creditsPages(target) {
  var track = document.querySelector(target);
  if (!track) return null;
  var pages = track.querySelectorAll('.credits-page, .credits-end');
  if (!pages.length) return null;
  var speed = motionSpeed();

  var seq = gsap.timeline();
  seq.set(pages, { opacity: 0 }, 0);            // all pages start hidden
  pages.forEach(function (page, i) {
    var rows = page.children.length;
    var holdSeconds = Math.max(2.5, rows * 0.9) / speed;      // longer pages hold longer
    seq.fromTo(page, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 / speed, ease: 'power2.out' });
    // Hold, then hand over to the next page. The final page holds until stop().
    if (i < pages.length - 1) {
      seq.to(page, { opacity: 0, duration: 0.4 / speed, ease: 'power2.in' }, '+=' + holdSeconds);
    }
  });
  return seq;
}`;
