// The editor pasteboard — the working margin around the canvas so content positioned OUTSIDE
// the canvas (an entrance that starts off the left edge) is visible and editable.
//
// Pad is a PURE EDITOR-VIEW concept. It only ever affects preview geometry (the iframe
// viewport, the gesture overlay, the guides). It NEVER enters template code, keyframes,
// inspector values, presets, save/load, undo, or exports — those stay canvas-local, so an
// element 300px left of the canvas is always x = -300 regardless of pad. Keep it that way.
//
// One place owns the amount, so it is easy to tune. Tests must NOT hard-code PAD_FRAC — they
// derive the canvas origin and scale from the rendered DOM (the guides' `canvas-bounds` rect).

import type { Resolution } from '../model/types';

/** Pasteboard margin as a fraction of the canvas on every side (0 = no pasteboard). */
export const PASTEBOARD_PAD_FRAC = 0.35;

export interface CanvasPad {
  /** Horizontal margin each side, in canvas px. */
  padX: number;
  /** Vertical margin each side, in canvas px. */
  padY: number;
}

/** The pad (canvas px) for a template resolution — rounded so the padded document stays on
 *  whole pixels. */
export function computePad(resolution: Resolution): CanvasPad {
  return {
    padX: Math.round(resolution.width * PASTEBOARD_PAD_FRAC),
    padY: Math.round(resolution.height * PASTEBOARD_PAD_FRAC),
  };
}
