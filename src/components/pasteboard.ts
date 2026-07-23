// The editor pasteboard — the working margin around the canvas so content positioned OUTSIDE
// the canvas (an entrance that starts off the left edge) is visible and editable.
//
// Pad is a PURE EDITOR-VIEW concept. It only ever affects preview geometry (the iframe
// viewport, the gesture overlay, the guides). It NEVER enters template code, keyframes,
// inspector values, presets, save/load, undo, or exports — those stay canvas-local, so an
// element 300px left of the canvas is always x = -300 regardless of pad. Keep it that way.
//
// The AMOUNT is derived from the graphic's OWN authored motion, because the pasteboard is not
// free: the stage fits the PADDED document, so every px of margin shrinks the canvas the user
// is actually working on. A flat third of the frame on every side spent two thirds of the stage
// on empty grey for the majority of templates, which never move anything off-canvas at all.
// What the margin has to hold is how far the keyframes push a layer out — that is code-derived
// and knowable before the document is composed, so no measure-then-resize loop is involved.
//
// Where the reach CANNOT be known the pad stays at the fallback, honestly - a legacy or
// unparsable region (nothing to read), MEASURED motion (docs/DYNAMIC_MOTION_SCOPE.md), whose
// travel is a marquee's scrollWidth at play time and is deliberately not in the data, and
// PERCENT travel (`xPercent`/`yPercent`), which moves a layer by a fraction of its OWN size,
// a number the data does not carry. Measured across the catalog: of 79 variants, 34 are
// px-only and 32 of those never push a layer more than 90 canvas px out - they were each
// being handed 672 × 378 px of margin for it. Two (Arena Duel, Collision Card) travel ~1200
// px horizontally, MORE than the old flat pad, so their entrances were being clipped by the
// very margin meant to show them.
//
// One place owns the amount, so it is easy to tune. Tests must NOT hard-code the fractions —
// they derive the canvas origin and scale from the rendered DOM (the guides' `canvas-bounds`
// rect).

import { parseAnimData, type AnimData } from '../blocks/animData';
import type { SpxTemplate } from '../model/types';

/** What a graphic whose reach cannot be read gets, as a fraction of the canvas on each side —
 *  the flat pad every template used to get. */
const PASTEBOARD_PAD_FALLBACK_FRAC = 0.35;

/** The least — a working margin that always exists, so an element sitting ON the canvas edge
 *  still has room around it to grab, and a small authored overshoot needs no re-fit. */
const PASTEBOARD_PAD_MIN_FRAC = 0.05;

/** The most a KNOWN reach may claim. A graphic that flings a layer clear across the frame would
 *  otherwise shrink its own canvas to a third of the stage to show the two frames where it is
 *  out there; past this the far end of the travel is allowed to run off the pasteboard. */
const PASTEBOARD_PAD_MAX_FRAC = 0.5;

/** The pad is rounded UP to a multiple of this. Authoring changes the reach (a drag off the
 *  edge, a slide preset), and a pad that tracked it exactly would re-fit the stage on almost
 *  every commit; in steps, the canvas holds still until the motion genuinely needs more room. */
const PAD_STEP_FRAC = 0.05;

export interface CanvasPad {
  /** Horizontal margin each side, in canvas px. */
  padX: number;
  /** Vertical margin each side, in canvas px. */
  padY: number;
}

/** Transform tracks that MOVE a layer by a canvas-px amount, per axis. */
const TRAVEL_X = 'x';
const TRAVEL_Y = 'y';

/** Tracks that move a layer by a fraction of its OWN size: the amount is real motion, but the
 *  size it is a fraction of lives in the DOM, so the reach is unknowable here. */
const TRAVEL_PERCENT = new Set(['xPercent', 'yPercent']);

/**
 * How far the authored keyframes push any layer away from its resting place, in canvas px per
 * axis — or null when the answer is unknowable and the caller must fall back to the flat pad.
 */
function authoredReach(data: AnimData): { x: number; y: number } | null {
  let x = 0;
  let y = 0;
  for (const step of data.steps) {
    // Measured motion travels by something only the live DOM knows; assume the worst.
    if (step.dynamics?.length) return null;
    for (const tracks of Object.values(step.layers)) {
      for (const [prop, keyframes] of Object.entries(tracks)) {
        if (TRAVEL_PERCENT.has(prop)) return null;
        if (prop !== TRAVEL_X && prop !== TRAVEL_Y) continue;
        for (const kf of keyframes) {
          if (typeof kf.value !== 'number') continue;
          const reach = Math.abs(kf.value);
          if (prop === TRAVEL_X) x = Math.max(x, reach);
          else y = Math.max(y, reach);
        }
      }
    }
  }
  return { x, y };
}

/** Round a needed margin (canvas px) to the pad fraction actually used for that axis. */
function padFor(need: number | null, dimension: number): number {
  if (need === null) return Math.round(dimension * PASTEBOARD_PAD_FALLBACK_FRAC);
  const wanted = need / dimension;
  const stepped = Math.ceil(wanted / PAD_STEP_FRAC) * PAD_STEP_FRAC;
  const frac = Math.min(PASTEBOARD_PAD_MAX_FRAC, Math.max(PASTEBOARD_PAD_MIN_FRAC, stepped));
  return Math.round(dimension * frac);
}

/** The pad (canvas px) for a template — rounded so the padded document stays on whole pixels. */
export function computePad(template: SpxTemplate): CanvasPad {
  const data = parseAnimData(template.js);
  const reach = data ? authoredReach(data) : null;
  return {
    padX: padFor(reach ? reach.x : null, template.resolution.width),
    padY: padFor(reach ? reach.y : null, template.resolution.height),
  };
}
