// Timeline v2 (docs/TIMELINE_V2_PLAN.md) — the declarative animation data model.
// The marked ANIMATION region carries `var NOACG_ANIM = { ... };` (strict JSON inside the
// braces) plus a fixed interpreter. This module is the editor's side of the contract:
// extract the literal from template.js, parse and validate it, and serialize it back
// CANONICALLY — fixed key order, fixed indentation, one keyframe per line — so a visual
// edit produces a minimal, stable diff and a hand edit round-trips losslessly.

/** One keyframe on a step's local clock. `value` is a number (transforms, opacity) or a
 *  string (filter, clipPath — GSAP interpolates those natively). `ease` is the ease INTO
 *  this keyframe; omitted = the step's default ease. */
export interface AnimKeyframe {
  time: number;
  value: number | string;
  ease?: string;
}

/** Property tracks for one layer: prop name → keyframes sorted by time. */
export type AnimLayerTracks = Record<string, AnimKeyframe[]>;

/** One lifecycle hook on a step's local clock — a side effect, not layer motion. `call` is
 *  the NAME of a global function defined in the template's own JS (e.g. the clock engine's
 *  `startClock`); the interpreter resolves it by name at fire time. Strictly a bare
 *  identifier — never an expression, never arguments (docs/TIMELINE_V2_PLAN.md §3b). */
export interface AnimCall {
  time: number;
  call: string;
}

/** A valid `call` / `build` value: a bare JS identifier, so the interpreter's `window[name]`
 *  lookup never becomes an expression evaluator (the no-eval posture is absolute). */
export const ANIM_CALL_NAME_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** One DYNAMIC motion segment — motion whose shape is MEASURED from the live DOM and so
 *  cannot be written as static keyframes (docs/DYNAMIC_MOTION_SCOPE.md): a marquee travels
 *  by its track's scrollWidth, a credits roll by its content height, a ticker flip runs one
 *  segment per item. `build` is the NAME of a global builder function defined in the
 *  template's own JS OUTSIDE the marked region (design-owned runtime, exactly like the clock
 *  engine); it measures the DOM and RETURNS a GSAP tween/timeline that the interpreter adds
 *  to the step. Strictly a bare identifier — the data holds a name and a target, never code.
 *
 *  This is the motion twin of `calls`: the timeline UI renders it read-only, because "travel
 *  by measured width" is not something you can meaningfully keyframe by hand — it is honestly
 *  code-owned, and the visual editor steps aside for it. */
export interface AnimDynamic {
  /** When the segment joins the step's clock (speed-relative seconds; default 0). */
  time?: number;
  /** The builder's global name (a bare identifier — resolved via `window[name]`, no eval). */
  build: string;
  /** Optional selector handed to the builder, so one builder can serve many targets. */
  target?: string;
}

/** How one track repeats within its step — the loop/yoyo/repeat primitive
 *  (docs/PRESET_MODEL_REVIEW.md gap 6). Values mirror GSAP: `repeat` -1 loops forever,
 *  N adds N extra passes; `yoyo` reverses alternate passes (a breath up then down);
 *  `repeatDelay` pauses (speed-relative seconds) between passes. A looping track's
 *  keyframes play in their own repeating sub-timeline, so an infinite ambient loop (a
 *  breathing pulse, a shimmering accent) lives in the same data every other track does. */
export interface AnimLoop {
  /** GSAP repeat count: -1 = forever, N ≥ 0 = N extra passes after the first. */
  repeat: number;
  /** Reverse every other pass (1→1.04→1→1.04…) instead of restarting. */
  yoyo?: boolean;
  /** Speed-relative pause between passes (seconds; playback divides by `speed`). */
  repeatDelay?: number;
}

/** One step — the timeline's "clip". steps[0] plays on ▶ Play, the middle steps each on
 *  one » Next press, the last on ■ Stop (the Out step). */
export interface AnimStep {
  name: string;
  /** Step length in speed-relative seconds (playback divides by `speed`). */
  duration: number;
  /** The step's default GSAP ease (keyframes may override per-keyframe). */
  ease: string;
  /** Layers that FIRST become visible when this step plays (activation is explicit data,
   *  never inferred from keyframes). Only meaningful on the middle steps. */
  reveals?: string[];
  /** Layers that LEAVE when this step plays — the early-exit twin of `reveals`. The layer
   *  animates out with this step's keyframes and is hidden afterward (its existence span
   *  ends here instead of at the final Out). Only meaningful on the middle steps. */
  hides?: string[];
  /** Lifecycle hooks that fire at their moment on the step's clock — named template
   *  functions (a clock engine's `startClock`/`stopClock`), not layer motion. Written by
   *  the importer and whole-graphic preset applies; pros edit the JSON line. */
  calls?: AnimCall[];
  /** Measured motion segments — a named builder returns a GSAP tween/timeline the
   *  interpreter adds to this step (a marquee's width-derived travel, a credits roll). The
   *  keyframe model deliberately cannot express these; see AnimDynamic. */
  dynamics?: AnimDynamic[];
  /** Looping tracks: `loops[selector][prop]` makes that layer's track repeat (an ambient
   *  breath, a marquee-style cycle). Per-track so an element can hold a one-shot entrance on
   *  one property and loop on another; a track with no entry plays once, exactly as before. */
  loops?: Record<string, Record<string, AnimLoop>>;
  layers: Record<string, AnimLayerTracks>;
}

export interface AnimData {
  version: 1;
  /** The graphic's root selector (CSS-hidden at rest; the interpreter shows/hides it). */
  root: string;
  /** The speed knob: every duration and keyframe time is divided by it at playback. */
  speed: number;
  /** At least two steps — the entrance and the Out step. */
  steps: AnimStep[];
}

const DECL = 'var NOACG_ANIM = ';

/** Locate the `var NOACG_ANIM = {...};` literal in the JS: returns the index range of the
 *  object text (the braces, inclusive), or null. Brace matching respects JSON strings, so
 *  a hand-edited block doesn't need to match the canonical layout to be found. */
export function locateAnimData(js: string): { start: number; end: number } | null {
  const at = js.indexOf(DECL);
  if (at === -1) return null;
  const start = js.indexOf('{', at + DECL.length);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < js.length; i++) {
    const c = js[i];
    if (inString) {
      if (c === '\\') i++; // skip the escaped character
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { start, end: i + 1 };
    }
  }
  return null;
}

/** Parse the animation data out of template.js. Returns null when the block is absent or
 *  not valid strict JSON / not a recognizable shape — the timeline then treats the
 *  template as hand-crafted (legacy or custom code), exactly like an unparsable region. */
export function parseAnimData(js: string): AnimData | null {
  const loc = locateAnimData(js);
  if (!loc) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(js.slice(loc.start, loc.end));
  } catch {
    return null;
  }
  return isAnimData(raw) ? raw : null;
}

/** Structural validation — the editor must never crash on a hand-edited block; anything
 *  off-shape degrades to "hand-crafted" honestly. */
export function isAnimData(raw: unknown): raw is AnimData {
  const d = raw as AnimData;
  if (!d || typeof d !== 'object') return false;
  if (d.version !== 1) return false;
  if (typeof d.root !== 'string' || !d.root) return false;
  if (typeof d.speed !== 'number' || !(d.speed > 0)) return false;
  if (!Array.isArray(d.steps) || d.steps.length < 2) return false;
  for (const step of d.steps) {
    if (!step || typeof step !== 'object') return false;
    if (typeof step.name !== 'string') return false;
    if (typeof step.duration !== 'number' || !(step.duration > 0)) return false;
    if (typeof step.ease !== 'string') return false;
    if (step.reveals !== undefined && !Array.isArray(step.reveals)) return false;
    if (step.hides !== undefined && !Array.isArray(step.hides)) return false;
    if (step.calls !== undefined) {
      if (!Array.isArray(step.calls)) return false;
      for (const c of step.calls) {
        if (!c || typeof c !== 'object') return false;
        if (typeof c.time !== 'number' || c.time < 0) return false;
        // A bare identifier only — anything else degrades the block to "hand-crafted".
        if (typeof c.call !== 'string' || !ANIM_CALL_NAME_RE.test(c.call)) return false;
      }
    }
    if (step.dynamics !== undefined) {
      if (!Array.isArray(step.dynamics)) return false;
      for (const d of step.dynamics) {
        if (!d || typeof d !== 'object') return false;
        // A bare identifier only — the `window[name]` lookup must never become an evaluator.
        if (typeof d.build !== 'string' || !ANIM_CALL_NAME_RE.test(d.build)) return false;
        if (d.time !== undefined && (typeof d.time !== 'number' || d.time < 0)) return false;
        if (d.target !== undefined && (typeof d.target !== 'string' || !d.target)) return false;
      }
    }
    if (step.loops !== undefined) {
      if (typeof step.loops !== 'object' || step.loops === null || Array.isArray(step.loops)) return false;
      for (const perProp of Object.values(step.loops)) {
        if (!perProp || typeof perProp !== 'object' || Array.isArray(perProp)) return false;
        for (const loop of Object.values(perProp) as AnimLoop[]) {
          if (!loop || typeof loop !== 'object') return false;
          // repeat is an integer ≥ -1 (GSAP: -1 = forever, N = N extra passes).
          if (typeof loop.repeat !== 'number' || !Number.isInteger(loop.repeat) || loop.repeat < -1) return false;
          if (loop.yoyo !== undefined && typeof loop.yoyo !== 'boolean') return false;
          if (loop.repeatDelay !== undefined && (typeof loop.repeatDelay !== 'number' || loop.repeatDelay < 0)) return false;
        }
      }
    }
    if (!step.layers || typeof step.layers !== 'object') return false;
    for (const tracks of Object.values(step.layers)) {
      if (!tracks || typeof tracks !== 'object') return false;
      for (const kfs of Object.values(tracks)) {
        if (!Array.isArray(kfs)) return false;
        for (const kf of kfs) {
          if (!kf || typeof kf !== 'object') return false;
          if (typeof kf.time !== 'number' || kf.time < 0) return false;
          if (typeof kf.value !== 'number' && typeof kf.value !== 'string') return false;
          if (kf.ease !== undefined && typeof kf.ease !== 'string') return false;
        }
      }
    }
  }
  return true;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** One keyframe on one line — the canonical form every diamond edit rewrites. */
function serializeKeyframe(kf: AnimKeyframe): string {
  const value = typeof kf.value === 'string' ? JSON.stringify(kf.value) : String(round(kf.value));
  const ease = kf.ease ? `, "ease": ${JSON.stringify(kf.ease)}` : '';
  return `{ "time": ${round(kf.time)}, "value": ${value}${ease} }`;
}

/**
 * Serialize the data canonically. Deterministic by construction: fixed key order
 * (version/root/speed/steps; name/duration/ease/reveals/hides/calls/dynamics/loops/layers;
 * time/value/ease), fixed 2-space indentation, keyframes, calls and dynamics one per line,
 * all sorted by time, numbers rounded to 3 decimals. serialize(parse(serialize(x))) ===
 * serialize(x) — a fixed point — so a small visual edit only ever touches the lines it
 * changed.
 */
export function serializeAnimData(data: AnimData): string {
  const lines: string[] = ['{'];
  lines.push(`  "version": 1,`);
  lines.push(`  "root": ${JSON.stringify(data.root)},`);
  lines.push(`  "speed": ${round(data.speed)},`);
  lines.push(`  "steps": [`);
  data.steps.forEach((step, si) => {
    lines.push('    {');
    lines.push(`      "name": ${JSON.stringify(step.name)},`);
    lines.push(`      "duration": ${round(step.duration)},`);
    lines.push(`      "ease": ${JSON.stringify(step.ease)},`);
    if (step.reveals && step.reveals.length > 0) {
      lines.push(`      "reveals": [${step.reveals.map((s) => JSON.stringify(s)).join(', ')}],`);
    }
    if (step.hides && step.hides.length > 0) {
      lines.push(`      "hides": [${step.hides.map((s) => JSON.stringify(s)).join(', ')}],`);
    }
    // Step calls: one per line, key order time/call — sorted so the diff stays stable.
    if (step.calls && step.calls.length > 0) {
      lines.push('      "calls": [');
      const calls = [...step.calls].sort((a, b) => a.time - b.time);
      calls.forEach((c, ci) => {
        lines.push(`        { "time": ${round(c.time)}, "call": ${JSON.stringify(c.call)} }${ci < calls.length - 1 ? ',' : ''}`);
      });
      lines.push('      ],');
    }
    // Dynamics: one measured-motion segment per line, key order time/build/target — sorted
    // by time so the diff stays stable. `time` is written even at 0: it is the segment's
    // placement on the step clock, and a hand editor should see the knob.
    if (step.dynamics && step.dynamics.length > 0) {
      lines.push('      "dynamics": [');
      const dyns = [...step.dynamics].sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
      dyns.forEach((d, di) => {
        const target = d.target ? `, "target": ${JSON.stringify(d.target)}` : '';
        lines.push(`        { "time": ${round(d.time ?? 0)}, "build": ${JSON.stringify(d.build)}${target} }${di < dyns.length - 1 ? ',' : ''}`);
      });
      lines.push('      ],');
    }
    // Loops: selector → prop → { repeat, yoyo?, repeatDelay? }, one loop per line. Sorted
    // (selectors then props) so the diff is stable regardless of insertion order.
    if (step.loops && Object.keys(step.loops).length > 0) {
      lines.push('      "loops": {');
      const sels = Object.keys(step.loops).sort();
      sels.forEach((sel, si) => {
        const perProp = step.loops![sel];
        const props = Object.keys(perProp).sort();
        lines.push(`        ${JSON.stringify(sel)}: {`);
        props.forEach((prop, pi) => {
          const l = perProp[prop];
          const parts = [`"repeat": ${round(l.repeat)}`];
          if (l.yoyo) parts.push(`"yoyo": true`);
          if (l.repeatDelay) parts.push(`"repeatDelay": ${round(l.repeatDelay)}`);
          lines.push(`          ${JSON.stringify(prop)}: { ${parts.join(', ')} }${pi < props.length - 1 ? ',' : ''}`);
        });
        lines.push(`        }${si < sels.length - 1 ? ',' : ''}`);
      });
      lines.push('      },');
    }
    // "layers" is always present (possibly empty) — one canonical shape, no comma games.
    const selectors = Object.keys(step.layers);
    if (selectors.length === 0) {
      lines.push('      "layers": {}');
    } else {
      lines.push('      "layers": {');
      selectors.forEach((selector, li) => {
        const tracks = step.layers[selector];
        const props = Object.keys(tracks);
        lines.push(`        ${JSON.stringify(selector)}: {`);
        props.forEach((prop, pi) => {
          const kfs = [...tracks[prop]].sort((a, b) => a.time - b.time);
          const body = kfs.map((kf) => `            ${serializeKeyframe(kf)}`).join(',\n');
          lines.push(`          ${JSON.stringify(prop)}: [\n${body}\n          ]${pi < props.length - 1 ? ',' : ''}`);
        });
        lines.push(`        }${li < selectors.length - 1 ? ',' : ''}`);
      });
      lines.push('      }');
    }
    lines.push(`    }${si < data.steps.length - 1 ? ',' : ''}`);
  });
  lines.push('  ]');
  lines.push('}');
  return lines.join('\n');
}

/** Write the data back into template.js, replacing only the object literal — every other
 *  character of the file (including the interpreter and any user code) is untouched. */
export function spliceAnimData(js: string, data: AnimData): string | null {
  const loc = locateAnimData(js);
  if (!loc) return null;
  return js.slice(0, loc.start) + serializeAnimData(data) + js.slice(loc.end);
}
