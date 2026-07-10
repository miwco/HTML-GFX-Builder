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
 * (version/root/speed/steps; name/duration/ease/reveals/layers; time/value/ease), fixed
 * 2-space indentation, keyframes one per line, keyframes sorted by time, numbers rounded
 * to 3 decimals. serialize(parse(serialize(x))) === serialize(x) — a fixed point — so a
 * small visual edit only ever touches the lines it changed.
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
