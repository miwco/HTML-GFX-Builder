// Timeline v2 Phase 4 — pure keyframe mutators over the animation data model. Every
// editing surface (Inspector diamonds, timeline diamond drags, Delete) routes through
// these: mutate a copy of the parsed data, then spliceAnimData + one applyTemplate makes
// the edit real, undoable code. Times are on the step's SPEED-RELATIVE clock (the stored
// numbers), rounded to the same 3 decimals the serializer writes.

import type { AnimData, AnimKeyframe, AnimLayerTracks, AnimStep } from './animData';

/** Two stored times match within half a serializer step. */
const EPS = 0.005;
const round = (n: number) => Math.round(n * 1000) / 1000;

function clone(data: AnimData): AnimData {
  return JSON.parse(JSON.stringify(data)) as AnimData;
}

/** Drop empty tracks and layer entries so the emitted block never carries dead weight. */
function prune(data: AnimData): AnimData {
  for (const step of data.steps) {
    for (const [selector, tracks] of Object.entries(step.layers)) {
      for (const [prop, kfs] of Object.entries(tracks)) {
        if (kfs.length === 0) delete tracks[prop];
      }
      if (Object.keys(tracks).length === 0) delete step.layers[selector];
    }
  }
  return data;
}

/** Add or update one keyframe (matching by time). The value may be a number or a string
 *  (filter/clipPath). Returns new data. */
export function setKeyframe(
  data: AnimData,
  stepIndex: number,
  selector: string,
  prop: string,
  time: number,
  value: number | string,
  ease?: string,
): AnimData {
  const next = clone(data);
  const step = next.steps[stepIndex];
  if (!step) return data;
  const t = round(Math.max(0, Math.min(time, step.duration)));
  const layer = (step.layers[selector] ??= {});
  const track = (layer[prop] ??= []);
  const existing = track.find((k) => Math.abs(k.time - t) < EPS);
  if (existing) {
    existing.value = typeof value === 'number' ? round(value) : value;
    if (ease !== undefined) existing.ease = ease;
  } else {
    const kf: AnimKeyframe = { time: t, value: typeof value === 'number' ? round(value) : value };
    if (ease) kf.ease = ease;
    track.push(kf);
    track.sort((a, b) => a.time - b.time);
  }
  return next;
}

/** Remove one property's keyframe at a time. Returns new data (pruned). */
export function deleteKeyframe(
  data: AnimData,
  stepIndex: number,
  selector: string,
  prop: string,
  time: number,
): AnimData {
  const next = clone(data);
  const track = next.steps[stepIndex]?.layers[selector]?.[prop];
  if (!track) return data;
  const at = track.findIndex((k) => Math.abs(k.time - time) < EPS);
  if (at === -1) return data;
  track.splice(at, 1);
  return prune(next);
}

/** Move EVERY property keyframe of a layer that sits at one time — the collapsed row's
 *  aggregate diamond drag. Clamped to the step; keyframes landing on another keyframe of
 *  the same track replace it (the drag wins). */
export function moveLayerKeyframes(
  data: AnimData,
  stepIndex: number,
  selector: string,
  fromTime: number,
  toTime: number,
): AnimData {
  const next = clone(data);
  const step = next.steps[stepIndex];
  const tracks = step?.layers[selector];
  if (!tracks) return data;
  const to = round(Math.max(0, Math.min(toTime, step.duration)));
  let moved = false;
  for (const kfs of Object.values(tracks)) {
    const at = kfs.findIndex((k) => Math.abs(k.time - fromTime) < EPS);
    if (at === -1) continue;
    const landed = kfs.findIndex((k, i) => i !== at && Math.abs(k.time - to) < EPS);
    const kf = kfs[at];
    kf.time = to;
    if (landed !== -1) kfs.splice(landed, 1);
    kfs.sort((a, b) => a.time - b.time);
    moved = true;
  }
  return moved ? next : data;
}

/** Move ONE property's keyframe — a property sub-row's diamond drag. Clamped to the
 *  step; landing on another keyframe of the same track replaces it (the drag wins). */
export function moveKeyframe(
  data: AnimData,
  stepIndex: number,
  selector: string,
  prop: string,
  fromTime: number,
  toTime: number,
): AnimData {
  const next = clone(data);
  const step = next.steps[stepIndex];
  const kfs = step?.layers[selector]?.[prop];
  if (!kfs) return data;
  const at = kfs.findIndex((k) => Math.abs(k.time - fromTime) < EPS);
  if (at === -1) return data;
  const to = round(Math.max(0, Math.min(toTime, step.duration)));
  const landed = kfs.findIndex((k, i) => i !== at && Math.abs(k.time - to) < EPS);
  kfs[at].time = to;
  if (landed !== -1) kfs.splice(landed, 1);
  kfs.sort((a, b) => a.time - b.time);
  return next;
}

/** The reveal channel's default motion — the same keyframes the importer writes for a
 *  legacy press (mask lines slide up within their mask; everything else fades and rises). */
function channelTracks(channel: 'mask' | 'rise', duration: number): AnimLayerTracks {
  return channel === 'mask'
    ? { yPercent: [{ time: 0, value: 110 }, { time: duration, value: 0 }] }
    : {
        opacity: [{ time: 0, value: 0 }, { time: duration, value: 1 }],
        y: [{ time: 0, value: 14 }, { time: duration, value: 0 }],
      };
}

/** Which press a layer is revealed by (-1 = it appears with ▶ Play). */
export function layerPress(data: AnimData, selector: string): number {
  for (let i = 1; i < data.steps.length - 1; i++) {
    if (data.steps[i].reveals?.includes(selector)) return i - 1;
  }
  return -1;
}

/**
 * Phase 5 — move WHEN a layer appears (the data twin of the legacy step chain's
 * changePartPress): -1 = with ▶ Play, k = an existing » press, presses-count = a brand-new
 * press before Out. Moving between presses carries the layer's tuned reveal keyframes;
 * entering or leaving the press world writes the channel's default motion (the entrance
 * choreography belongs to the step it plays in). Emptied presses disappear; default step
 * names renumber. Returns null when the move is a no-op.
 */
export function setLayerActivation(
  data: AnimData,
  selector: string,
  toPress: number,
  channel: 'mask' | 'rise',
): AnimData | null {
  const next = clone(data);
  const fromPress = layerPress(next, selector);
  const presses = next.steps.length - 2;
  const target = Math.min(toPress, presses); // presses = "a new press"
  if (target === fromPress) return null;
  if (target < -1 || target > presses) return null;

  // Remove the layer from where it currently animates in.
  const fromIdx = fromPress === -1 ? 0 : fromPress + 1;
  const carried = fromPress > -1 ? next.steps[fromIdx].layers[selector] : undefined;
  delete next.steps[fromIdx].layers[selector];
  if (fromPress > -1) {
    next.steps[fromIdx].reveals = (next.steps[fromIdx].reveals ?? []).filter((s) => s !== selector);
  }

  if (target === -1) {
    // Back to "appears with ▶ Play": the entrance gets the channel's default motion.
    next.steps[0].layers[selector] = channelTracks(channel, 0.45);
  } else {
    let destIdx = target + 1;
    if (target === presses) {
      // A brand-new press, just before Out.
      const step: AnimStep = {
        name: `Step ${next.steps.length}`,
        duration: 0.45,
        ease: next.steps[0].ease,
        reveals: [],
        layers: {},
      };
      next.steps.splice(next.steps.length - 1, 0, step);
      destIdx = next.steps.length - 2;
    }
    const dest = next.steps[destIdx];
    (dest.reveals ??= []).push(selector);
    dest.layers[selector] = carried ?? channelTracks(channel, Math.min(0.45, dest.duration));
    const maxT = Math.max(...Object.values(dest.layers[selector]).flat().map((k) => k.time));
    if (dest.duration < maxT) dest.duration = round(maxT);
  }

  // The press the layer LEFT may now be a dead Continue (nothing revealed or animated) —
  // drop it. Only the source step: a deliberately added empty step (the + button) stays.
  if (fromPress > -1) {
    const s = next.steps[fromIdx];
    if (s && (s.reveals ?? []).length === 0 && (s.hides ?? []).length === 0 && Object.keys(s.layers).length === 0) {
      next.steps.splice(fromIdx, 1);
    }
  }
  // Default names follow their position (a user's rename is left alone).
  for (let i = 1; i < next.steps.length - 1; i++) {
    if (/^Step \d+$/.test(next.steps[i].name)) next.steps[i].name = `Step ${i + 1}`;
  }
  return next;
}

/**
 * Set where a layer LEAVES (the early-exit twin of setLayerActivation). `toStep` is the step
 * whose play hides the layer; passing the final Out step (or beyond) clears the early exit so
 * the layer lives to the end. The target is clamped after the layer's activation — a layer
 * can't leave before it appears. Empties the old `hides` list and prunes it away.
 */
export function setLayerHide(data: AnimData, selector: string, toStep: number): AnimData {
  const next = clone(data);
  const lastIdx = next.steps.length - 1;
  // Remove the layer from every step's hides (start clean).
  for (const step of next.steps) {
    if (step.hides) {
      step.hides = step.hides.filter((s) => s !== selector);
      if (step.hides.length === 0) delete step.hides;
    }
  }
  // A middle step earlier than its activation isn't a valid exit; only a real middle step
  // records an early exit. Out (lastIdx) or beyond = no early exit (lives to the end).
  let act = 0;
  for (let s = 1; s < lastIdx; s++) {
    if (next.steps[s].reveals?.includes(selector)) { act = s; break; }
  }
  if (toStep > act && toStep < lastIdx) {
    (next.steps[toStep].hides ??= []).push(selector);
  }
  return next;
}

/** Set (or clear — back to the step's default) the ease INTO every property keyframe of a
 *  layer at one time. The aggregate diamond's ease menu: one moment, one curve. A
 *  property sub-row passes `prop` to curve only ITS keyframe at that moment. */
export function setKeyframeEase(
  data: AnimData,
  stepIndex: number,
  selector: string,
  time: number,
  ease: string | null,
  prop?: string,
): AnimData | null {
  const next = clone(data);
  const tracks = next.steps[stepIndex]?.layers[selector];
  if (!tracks) return null;
  let touched = false;
  for (const [trackProp, kfs] of Object.entries(tracks)) {
    if (prop !== undefined && trackProp !== prop) continue;
    const kf = kfs.find((k) => Math.abs(k.time - time) < EPS);
    if (!kf) continue;
    if (ease === null) delete kf.ease;
    else kf.ease = ease;
    touched = true;
  }
  return touched ? next : null;
}

/** Set a step's DEFAULT ease (what keyframes without their own ease inherit). */
export function setStepEase(data: AnimData, stepIndex: number, ease: string): AnimData | null {
  if (!data.steps[stepIndex] || data.steps[stepIndex].ease === ease) return null;
  const next = clone(data);
  next.steps[stepIndex].ease = ease;
  return next;
}

// ── Phase 6: steps as clips ──────────────────────────────────────────────────

/** The latest keyframe OR call time in a step (0 when it does nothing). Both are events on
 *  the step's clock: shrinking past a call would silently drop it, so the preserve floor
 *  must honour calls too. */
function lastEventTime(step: AnimStep): number {
  let last = 0;
  for (const tracks of Object.values(step.layers)) {
    for (const kfs of Object.values(tracks)) {
      for (const kf of kfs) last = Math.max(last, kf.time);
    }
  }
  for (const c of step.calls ?? []) last = Math.max(last, c.time);
  return last;
}

/**
 * Resize a step (the clip's right-edge drag). Default 'preserve' keeps every keyframe's
 * timing — extending leaves settled air, shrinking clamps at the last keyframe or call
 * (motion and lifecycle hooks never silently truncate). 'stretch' (Alt-drag) scales all
 * keyframe AND call times proportionally — "make this step faster/slower". Returns null on
 * a no-op.
 */
export function resizeStep(
  data: AnimData,
  stepIndex: number,
  duration: number,
  mode: 'preserve' | 'stretch' = 'preserve',
): AnimData | null {
  const next = clone(data);
  const step = next.steps[stepIndex];
  if (!step) return null;
  const to =
    mode === 'preserve'
      ? round(Math.max(0.05, Math.max(duration, lastEventTime(step))))
      : round(Math.max(0.05, duration));
  if (Math.abs(to - step.duration) < EPS) return null;
  if (mode === 'stretch' && step.duration > 0) {
    const f = to / step.duration;
    for (const tracks of Object.values(step.layers)) {
      for (const kfs of Object.values(tracks)) {
        for (const kf of kfs) kf.time = round(kf.time * f);
      }
    }
    for (const c of step.calls ?? []) c.time = round(c.time * f);
  }
  step.duration = to;
  return next;
}

/** Renumber default "Step N" names after a structural change (renames are left alone). */
function renumberSteps(data: AnimData): void {
  for (let i = 1; i < data.steps.length - 1; i++) {
    if (/^Step \d+( copy)?$/.test(data.steps[i].name)) data.steps[i].name = `Step ${i + 1}`;
  }
}

/**
 * Duplicate a step: keyframes and calls copy verbatim in local time (the duplicate's
 * resolved starting state comes from its new predecessor — correct by construction; a
 * copied call is data, not magic, and the clock's start/stop are idempotent). Its
 * `reveals` are NOT copied: a layer activates once, and a second reveal of an
 * already-visible layer would replay its hidden state on air. The copy lands right
 * after the original — duplicating Out lands the copy before it, as a content step.
 */
export function duplicateStep(data: AnimData, stepIndex: number): AnimData | null {
  const src = data.steps[stepIndex];
  if (!src) return null;
  const next = clone(data);
  const copy = JSON.parse(JSON.stringify(src)) as AnimStep;
  delete copy.reveals;
  delete copy.hides; // a layer leaves once — a duplicated hide would re-hide an absent layer
  copy.name = /^Step \d+$/.test(src.name) ? src.name : `${src.name} copy`;
  const at = Math.min(stepIndex + 1, next.steps.length - 1); // never after Out
  next.steps.splice(at, 0, copy);
  renumberSteps(next);
  return next;
}

/** Rename a step (any step — Enter and Out included). */
export function renameStep(data: AnimData, stepIndex: number, name: string): AnimData | null {
  const trimmed = name.trim();
  if (!data.steps[stepIndex] || !trimmed || data.steps[stepIndex].name === trimmed) return null;
  const next = clone(data);
  next.steps[stepIndex].name = trimmed;
  return next;
}

/**
 * Delete a content step (never the entrance or Out). Layers it revealed return to
 * "appears with ▶ Play" with the channel's default motion, so nothing ends up visible
 * on air without an entrance.
 */
export function deleteStep(
  data: AnimData,
  stepIndex: number,
  channelOf: (selector: string) => 'mask' | 'rise',
): AnimData | null {
  if (stepIndex <= 0 || stepIndex >= data.steps.length - 1) return null;
  const next = clone(data);
  const [removed] = next.steps.splice(stepIndex, 1);
  for (const selector of removed.reveals ?? []) {
    next.steps[0].layers[selector] = channelTracks(channelOf(selector), 0.45);
  }
  renumberSteps(next);
  return next;
}

/** Add an empty content step just before Out — an authoring target for the next reveal
 *  or keyframes (a press that still does nothing when the show airs is the user's call). */
export function addStep(data: AnimData): AnimData {
  const next = clone(data);
  const step: AnimStep = {
    name: `Step ${next.steps.length}`,
    duration: 0.45,
    ease: next.steps[0].ease,
    layers: {},
  };
  next.steps.splice(next.steps.length - 1, 0, step);
  renumberSteps(next);
  return next;
}

/** Delete EVERY property keyframe of a layer at one time — the aggregate diamond's Delete. */
export function deleteLayerKeyframes(
  data: AnimData,
  stepIndex: number,
  selector: string,
  time: number,
): AnimData {
  const next = clone(data);
  const tracks = next.steps[stepIndex]?.layers[selector];
  if (!tracks) return data;
  let removed = false;
  for (const kfs of Object.values(tracks)) {
    const at = kfs.findIndex((k) => Math.abs(k.time - time) < EPS);
    if (at !== -1) {
      kfs.splice(at, 1);
      removed = true;
    }
  }
  return removed ? prune(next) : data;
}
