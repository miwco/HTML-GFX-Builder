// Timeline v2 — the editor-side playhead value resolver (docs/TIMELINE_V2_PLAN.md,
// decision 11). Deliberately the ONLY logic duplicated from the runtime interpreter,
// and deliberately tiny: the preview iframe runs the real interpreter for everything
// that plays; this resolver answers "what is this property at (step, t)" for the
// Inspector and the timeline's static rendering. Parity with the interpreter is pinned
// by e2e/anim-engine.spec.ts.

import type { AnimData, AnimKeyframe } from './animData';

/** Effective (real-second) duration of one step — stored values are speed-relative. */
export function stepSeconds(data: AnimData, index: number): number {
  return data.steps[index].duration / (data.speed || 1);
}

/** Each step's start offset on the concatenated editing ruler, in real seconds. */
export function stepOffsets(data: AnimData): number[] {
  const offsets: number[] = [];
  let at = 0;
  for (let i = 0; i < data.steps.length; i++) {
    offsets.push(at);
    at += stepSeconds(data, i);
  }
  return offsets;
}

/** The keyframes of one property in one step, time-sorted (empty when absent). */
function trackAt(data: AnimData, stepIndex: number, selector: string, prop: string): AnimKeyframe[] {
  const kfs = data.steps[stepIndex]?.layers[selector]?.[prop];
  return kfs && kfs.length ? [...kfs].sort((a, b) => a.time - b.time) : [];
}

/**
 * Resolve a property's value at (stepIndex, localT) — localT in SPEED-RELATIVE seconds
 * (the stored clock). Semantics mirror the interpreter:
 * - within a step, the first keyframe holds backward to the step start;
 * - between keyframes, numbers interpolate (LINEARLY here — the eased in-between value
 *   is the preview's job; at keyframe times the two always agree exactly);
 * - strings (filter, clipPath) hold the previous keyframe until the next one's time;
 * - a step without the track inherits the last keyframe value from an earlier step;
 * - null = no keyframe anywhere before this point: the layer's design (CSS) state.
 */
export function resolveValue(
  data: AnimData,
  selector: string,
  prop: string,
  stepIndex: number,
  localT: number,
): number | string | null {
  const kfs = trackAt(data, stepIndex, selector, prop);
  if (kfs.length > 0) {
    if (localT <= kfs[0].time) return kfs[0].value;
    for (let i = 1; i < kfs.length; i++) {
      if (localT < kfs[i].time) {
        const a = kfs[i - 1];
        const b = kfs[i];
        if (typeof a.value !== 'number' || typeof b.value !== 'number') return a.value;
        const f = (localT - a.time) / (b.time - a.time);
        return a.value + (b.value - a.value) * f;
      }
    }
    return kfs[kfs.length - 1].value;
  }
  // Inherit from earlier steps: the last keyframe value before this step.
  for (let s = stepIndex - 1; s >= 0; s--) {
    const prev = trackAt(data, s, selector, prop);
    if (prev.length > 0) return prev[prev.length - 1].value;
  }
  return null; // design state — the stylesheet's value
}

/** Every property a layer ever animates (drives the Inspector's armed diamonds). */
export function animatedProps(data: AnimData, selector: string): string[] {
  const props = new Set<string>();
  for (const step of data.steps) {
    for (const prop of Object.keys(step.layers[selector] ?? {})) props.add(prop);
  }
  return [...props];
}

/** The step where a layer first becomes active: its reveals step, else 0 (with ▶ Play).
 *  This is what "In" targets for presets — In is relative to the layer (decision 7). */
export function activationStep(data: AnimData, selector: string): number {
  for (let s = 1; s < data.steps.length - 1; s++) {
    if (data.steps[s].reveals?.includes(selector)) return s;
  }
  return 0;
}
