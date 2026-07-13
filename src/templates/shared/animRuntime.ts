// Timeline v2 — the runtime interpreter emitted into every data-driven template
// (docs/TIMELINE_V2_PLAN.md §2). It reads the NOACG_ANIM data literal and defines the
// SAME builder globals the whole platform already depends on (buildInTimeline /
// buildOutTimeline / revealNextStep), so the simulator, wizard thumbnails, control
// engine, and every export work unchanged. Plain commented ES5, no dependencies beyond
// the bundled GSAP, no eval — a professional can read it, or delete the whole region
// and write raw GSAP (the timeline UI then steps aside).

import { ANIMATION_MARK_CLOSE, ANIMATION_MARK_OPEN } from '../lowerThirds/animPresets';
import { serializeAnimData, type AnimData } from '../../blocks/animData';

/** The interpreter body — identical in every template. Kept as one exported string so the
 *  emitter, the AI prompt, and (later) the convert-on-edit path all ship the same code. */
export const ANIM_INTERPRETER_JS = `// ---- The interpreter (the same in every template — edit the DATA above instead) ----
// Steps play on the operator's cues: steps[0] on play(), each middle step on one next()
// press, the last step on stop(). Keyframe times sit on the step's local clock and are
// divided by the speed knob. A keyframe's ease is the ease INTO it (default: the step's).
var noacgStepsPlayed = 0; // how many steps have run (play() = the first)

// Build one step's GSAP timeline from its keyframe data. The first keyframe of a track
// is the starting state, applied instantly at the step start (it "holds backward" —
// the familiar keyframe convention); later keyframes tween from the previous one.
function buildStepTimeline(index) {
  var step = NOACG_ANIM.steps[index];
  var speed = NOACG_ANIM.speed || 1;
  var tl = gsap.timeline();
  Object.keys(step.layers).forEach(function (selector) {
    var tracks = step.layers[selector];
    Object.keys(tracks).forEach(function (prop) {
      var kfs = tracks[prop];
      if (!kfs.length) return;
      var start = {};
      start[prop] = kfs[0].value;
      tl.set(selector, start, 0);
      for (var i = 1; i < kfs.length; i++) {
        var vars = {};
        vars[prop] = kfs[i].value;
        vars.duration = (kfs[i].time - kfs[i - 1].time) / speed;
        vars.ease = kfs[i].ease || step.ease;
        tl.to(selector, vars, kfs[i - 1].time / speed);
      }
    });
  });
  // Layers that LEAVE in this step: hide them at the step's end. Their keyframes above
  // animate the exit; this makes the departure definitive (the twin of reveals' pre-hide),
  // so a layer can leave before the final Out. Replay re-arms it (resetGraphic clears the
  // inline props, then step 0 shows it again).
  (step.hides || []).forEach(function (selector) {
    tl.set(selector, { opacity: 0 }, step.duration / speed);
  });
  // Step calls: named template functions fire at their moment on the step's clock (the
  // clock engine's startClock/stopClock — the timeline never owns that logic). Resolved by
  // name at fire time so hand edits and load order never matter; a missing function is a
  // silent no-op. Scrub/settle inherit GSAP's own callback suppression (progress(1, true)),
  // so a settled state never re-fires the clock.
  for (var c = 0; c < (step.calls || []).length; c++) {
    (function (name, at) {
      tl.call(function () {
        var fn = window[name];
        if (typeof fn === 'function') fn();
      }, null, at / speed);
    })(step.calls[c].call, step.calls[c].time);
  }
  // Pad to the step's full duration — settled air at the end is part of the step.
  tl.set({ noacgPad: 0 }, { noacgPad: 1 }, step.duration / speed);
  return tl;
}

// Layers revealed by a later step start hidden: pre-apply their reveal step's first
// keyframe values (their "from" state; plain opacity 0 when the step gives them no
// keyframes). Runs inside play()'s timeline, so every replay re-arms the reveals.
function noacgApplyReveals(tl) {
  var steps = NOACG_ANIM.steps;
  for (var s = 1; s < steps.length - 1; s++) {
    (steps[s].reveals || []).forEach(function (selector) {
      var tracks = steps[s].layers[selector];
      var hidden = false;
      if (tracks) Object.keys(tracks).forEach(function (prop) {
        if (!tracks[prop].length) return;
        var vars = {};
        vars[prop] = tracks[prop][0].value;
        tl.set(selector, vars, 0);
        // transformOrigin is static pivot chrome, not entrance motion — it doesn't pre-hide.
        if (prop !== 'transformOrigin') hidden = true;
      });
      if (!hidden) tl.set(selector, { opacity: 0 }, 0);
    });
  }
}

// buildInTimeline(): the entrance — the first step. Called by play().
function buildInTimeline() {
  noacgStepsPlayed = 1;
  var tl = buildStepTimeline(0);
  tl.set(NOACG_ANIM.root, { opacity: 1 }, 0); // reveal the (CSS-hidden) graphic
  noacgApplyReveals(tl);
  return tl;
}

// revealNextStep(): one middle step per next() press; null when only Out remains.
function revealNextStep() {
  if (noacgStepsPlayed >= NOACG_ANIM.steps.length - 1) return null;
  return buildStepTimeline(noacgStepsPlayed++);
}

// buildOutTimeline(): the Out step — the last one. Called by stop().
function buildOutTimeline() {
  var steps = NOACG_ANIM.steps;
  var tl = buildStepTimeline(steps.length - 1);
  // Press-revealed layers OUTSIDE the root miss its hide — fade them with the exit
  // (unless the Out step animates them itself). Containment is checked live.
  var root = document.querySelector(NOACG_ANIM.root);
  for (var s = 1; s < steps.length - 1; s++) {
    (steps[s].reveals || []).forEach(function (selector) {
      var el = document.querySelector(selector);
      if (el && root && !root.contains(el) && !steps[steps.length - 1].layers[selector]) {
        tl.to(selector, { opacity: 0, duration: 0.3 / (NOACG_ANIM.speed || 1) }, 0);
      }
    });
  }
  tl.set(NOACG_ANIM.root, { opacity: 0 }); // fully hidden; ready to play again
  return tl;
}`;

/** The data block's header comment — emitted above the literal (JSON carries no comments,
 *  so the explanation lives here, where hand edits preserve it). */
const DATA_HEADER = `// The graphic's animation as DATA. Steps play in order — the first on ▶ play(), each
// middle step on one » next() press (SPX Continue), the last on ■ stop(). Each layer's
// properties are keyframe lists on the step's local clock: { "time", "value", "ease" }.
// "reveals" names the layers that first become visible in that step; "hides" names the
// layers that leave in it; "calls" fires named template functions (a clock engine's
// startClock/stopClock) at their moment on the step's clock. The timeline UI reads and
// writes this block — and so can you: edit a number and press play.`;

/** Emit the full marked ANIMATION region for a data-driven template. */
export function emitAnimRegion(data: AnimData): string {
  return `${ANIMATION_MARK_OPEN}
${DATA_HEADER}
var NOACG_ANIM = ${serializeAnimData(data)};

${ANIM_INTERPRETER_JS}
${ANIMATION_MARK_CLOSE}`;
}

/** Swap a template's marked region for the data-driven emit (the converter's writer). */
export function replaceRegionWithAnimData(js: string, data: AnimData): string | null {
  const start = js.indexOf(ANIMATION_MARK_OPEN);
  const end = js.indexOf(ANIMATION_MARK_CLOSE);
  if (start === -1 || end === -1) return null;
  return js.slice(0, start) + emitAnimRegion(data) + js.slice(end + ANIMATION_MARK_CLOSE.length);
}
