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

  // A press that neither reveals nor animates anything is a dead Continue — drop it.
  for (let i = next.steps.length - 2; i >= 1; i--) {
    const s = next.steps[i];
    if ((s.reveals ?? []).length === 0 && Object.keys(s.layers).length === 0) next.steps.splice(i, 1);
  }
  // Default names follow their position (a user's rename is left alone).
  for (let i = 1; i < next.steps.length - 1; i++) {
    if (/^Step \d+$/.test(next.steps[i].name)) next.steps[i].name = `Step ${i + 1}`;
  }
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
