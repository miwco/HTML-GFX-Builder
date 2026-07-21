// Timeline v2 (docs/TIMELINE_V2_PLAN.md) + the state-machine schema, format version 2
// (docs/STATE_MACHINE_SCHEMA.md). The marked ANIMATION region carries
// `var NOACG_ANIM = { ... };` (strict JSON inside the braces) plus a fixed interpreter.
// This module is the editor's side of the contract: extract the literal from template.js,
// parse and validate it (migrating version 1 on read), and serialize it back CANONICALLY —
// fixed key order, fixed indentation, one keyframe per line — so a visual edit produces a
// minimal, stable diff and a hand edit round-trips losslessly.

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

/** How a transition fires. `data-condition` is RESERVED (parses, is never fired by the
 *  runtime) — the schema keeps the door open without building the feature. */
export type TriggerType = 'operator' | 'timer' | 'data-condition';

/** Built-in lifecycle events — never authorable as operator transition events. `play` resets
 *  every group to its initial state and enters the default path; `stop` is legal from EVERY
 *  state (the implicit out — an operator can always take a graphic off air). `next` is NOT
 *  reserved: on the default path it fires the walk's transitions whatever their event names,
 *  and a branch state may author its own `next` edge as the rejoin arrow. */
export const RESERVED_EVENTS = ['play', 'stop'] as const;

/** The transition-style vocabulary the interpreter's noacgStyleTimeline plays (the node
 *  editor's arrow styles). An unknown name round-trips untouched and the entry timeline
 *  plays instead — degradation, never a crash. */
export const TRANSITION_STYLES = [
  'fade',
  'push-left',
  'push-right',
  'push-up',
  'push-down',
  'wipe-left',
  'wipe-right',
] as const;

/** One arrow of a state graph. The animated change is the TARGET state's timeline (entering a
 *  state plays its content; re-entry — including a self-transition — replays it), unless the
 *  arrow carries a `style` — then the styled change (fade/push/wipe between the two poses)
 *  plays instead. */
export interface AnimTransition {
  from: string;
  /** May equal `from` — a self-transition replays the state (a ticker's cycle beat). */
  to: string;
  trigger: TriggerType;
  /** operator only: the event name (a bare identifier, never a reserved built-in). */
  event?: string;
  /** timer only: speed-relative seconds after the from-state's entry timeline settles. */
  after?: number;
  /** The arrow's own animated change (TRANSITION_STYLES) — replaces the target state's
   *  entry timeline for this arrow. Absent = the classic entry-timeline change. */
  style?: string;
  /** style only: the styled change's total seconds (speed-relative; default 0.6). */
  duration?: number;
  /** style only: the GSAP ease of each half (default power2.inOut). */
  ease?: string;
}

/** One state. Default-path states own their timeline POSITIONALLY (`defaultPath[i]` plays
 *  `steps[i]`) and must not carry one inline; off-path states and non-main groups' states
 *  carry theirs inline. A state with neither is POSE-ONLY — entering it plays nothing (Off,
 *  Paused, a hold). Inline timelines never carry `reveals`/`hides`: those are the linear
 *  walk's pre-hide mechanics, meaningless off the ordered path. */
export interface AnimState {
  /** Unique within its group. */
  id: string;
  /** Display label; defaults to the id. */
  name?: string;
  /** The node editor's box position `[x, y]` on the graph canvas. ADDITIVE OPTIONAL (no
   *  version bump): absent means auto-layout, and nothing but the graph view reads it. */
  at?: [number, number];
  timeline?: AnimStep;
}

/** One parallel state group — a small independent graph with its own current-state pointer.
 *  Parallel groups are what keep state counts small (a scorebug's flag/alert/clock/result
 *  each live in their own 2–3 state group instead of one combinatorial machine). */
export interface AnimGroup {
  id: string;
  /** The state occupied off-air and after a visual reset (usually a pose-only `off`). */
  initial: string;
  /** groups[0] ONLY — the SPX walk in order, ending at the exit state. INVARIANT:
   *  `defaultPath.length === data.steps.length`; `defaultPath[i]` owns `steps[i]`. This
   *  positional binding is what keeps every existing steps editor correct with no stored
   *  indices to go stale. */
  defaultPath?: string[];
  states: AnimState[];
  transitions: AnimTransition[];
}

/** The optional state machine. groups[0] is the main (default-path) group — order is
 *  meaning. When absent, the graphic IS the implicit one-group linear machine derived from
 *  `steps` (blocks/animMachine.ts deriveMachine) — derived on read, never persisted. */
export interface AnimMachine {
  groups: AnimGroup[];
}

export interface AnimData {
  /** The block's format version. Version 1 (the pre-machine shape) migrates on read —
   *  see parseAnimData; serialization always writes the current version. */
  version: 2;
  /** The graphic's root selector (CSS-hidden at rest; the interpreter shows/hides it). */
  root: string;
  /** The speed knob: every duration and keyframe time is divided by it at playback. */
  speed: number;
  /** At least two steps — the entrance and the Out step. Under a machine these are the
   *  default-path states' timelines in walk order (the v1 step chain, absorbed). */
  steps: AnimStep[];
  /** Absent = the implicit linear machine. */
  machine?: AnimMachine;
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
 *  template as hand-crafted (legacy or custom code), exactly like an unparsable region.
 *  This is a NORMALIZING parse: a version-1 block that validates is migrated to the
 *  current shape on read, so everything downstream sees only version 2. */
export function parseAnimData(js: string): AnimData | null {
  const loc = locateAnimData(js);
  if (!loc) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(js.slice(loc.start, loc.end));
  } catch {
    return null;
  }
  if ((raw as { version?: unknown }).version === 1) raw = migrateAnimData(raw);
  return isAnimData(raw) ? raw : null;
}

/** Why a NOACG_ANIM block did not parse. The distinction matters at the export gate: an
 *  unreadable block is usually an honest hand-crafted or legacy region, which the platform
 *  deliberately tolerates — but a block that declares a MACHINE and gets it wrong would ship
 *  and then run UNCHECKED on air (the interpreter reads `NOACG_ANIM.machine` verbatim), so
 *  that one case is an error rather than advice. */
export type AnimDataFault = 'not-json' | 'off-shape' | 'off-shape-machine';

/** Diagnose a block that failed to parse; null when it parses fine (or is absent). */
export function animDataFault(js: string): AnimDataFault | null {
  const loc = locateAnimData(js);
  if (!loc) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(js.slice(loc.start, loc.end));
  } catch {
    return 'not-json';
  }
  const version = (raw as { version?: unknown }).version;
  if (version === 1) raw = migrateAnimData(raw);
  if (isAnimData(raw)) return null;
  // A version we don't know is a FUTURE document, not a broken one — degrading it to
  // hand-crafted is the whole point of the version doctrine, and erroring would mean an older
  // build could not export a project a newer one saved. Only a block speaking a version we DO
  // understand can be judged as a broken machine.
  const known = version === 1 || version === 2;
  return known && (raw as { machine?: unknown })?.machine !== undefined ? 'off-shape-machine' : 'off-shape';
}

/** The version 1 → 2 migration. Deliberately trivial and total: the v1 step chain IS the
 *  default-path content under v2 (the machine stays implicit/derived), so migrating is the
 *  version bump alone. The format-version doctrine (docs/STATE_MACHINE_SCHEMA.md): any
 *  breaking shape change bumps the version and ships its migration here the same commit;
 *  additive optional fields never bump; an unknown version degrades to hand-crafted. */
export function migrateAnimData(raw: unknown): AnimData {
  return { ...(raw as object), version: 2 } as AnimData;
}

/** Structural validation — the editor must never crash on a hand-edited block; anything
 *  off-shape degrades to "hand-crafted" honestly. Validates the CURRENT (version 2) shape;
 *  parseAnimData migrates version 1 before calling this. */
export function isAnimData(raw: unknown): raw is AnimData {
  const d = raw as AnimData;
  if (!d || typeof d !== 'object') return false;
  if (d.version !== 2) return false;
  if (typeof d.root !== 'string' || !d.root) return false;
  if (typeof d.speed !== 'number' || !(d.speed > 0)) return false;
  if (!Array.isArray(d.steps) || d.steps.length < 2) return false;
  for (const step of d.steps) {
    if (!isAnimStepShape(step, true)) return false;
  }
  if (d.machine !== undefined && !isMachineShape(d.machine, d.steps.length)) return false;
  return true;
}

/** One step's structural check. `revealsAllowed` is false for a state's INLINE timeline —
 *  reveals/hides are the ordered walk's pre-hide mechanics and must not appear off it. */
function isAnimStepShape(step: AnimStep, revealsAllowed: boolean): boolean {
  if (!step || typeof step !== 'object') return false;
  if (typeof step.name !== 'string') return false;
  if (typeof step.duration !== 'number' || !(step.duration > 0)) return false;
  if (typeof step.ease !== 'string') return false;
  if (!revealsAllowed && (step.reveals !== undefined || step.hides !== undefined)) return false;
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
  return true;
}

/** The machine's structural rules. Everything here is SHAPE (references resolve, invariants
 *  hold); semantic advice (unreachable states, reserved-trigger presence) lives in
 *  validateTemplate as warnings via blocks/animMachine.ts. */
function isMachineShape(raw: unknown, stepCount: number): raw is AnimMachine {
  const m = raw as AnimMachine;
  if (!m || typeof m !== 'object' || Array.isArray(m)) return false;
  if (!Array.isArray(m.groups) || m.groups.length === 0) return false;
  const groupIds = new Set<string>();
  for (let g = 0; g < m.groups.length; g++) {
    const group = m.groups[g];
    if (!group || typeof group !== 'object') return false;
    if (typeof group.id !== 'string' || !group.id || groupIds.has(group.id)) return false;
    groupIds.add(group.id);
    if (!Array.isArray(group.states) || group.states.length === 0) return false;
    const stateIds = new Set<string>();
    for (const s of group.states) {
      if (!s || typeof s !== 'object') return false;
      if (typeof s.id !== 'string' || !s.id || stateIds.has(s.id)) return false;
      stateIds.add(s.id);
      if (s.name !== undefined && typeof s.name !== 'string') return false;
      if (
        s.at !== undefined &&
        (!Array.isArray(s.at) || s.at.length !== 2 || !s.at.every((n) => typeof n === 'number' && Number.isFinite(n)))
      ) {
        return false;
      }
      if (s.timeline !== undefined && !isAnimStepShape(s.timeline, false)) return false;
    }
    if (typeof group.initial !== 'string' || !stateIds.has(group.initial)) return false;
    if (g === 0) {
      // The main group MUST carry the default path — the positional binding to `steps`.
      // Each waypoint is unique (a repeated state would own two different step timelines)
      // and owns steps[i], so a path state must not ALSO carry an inline timeline.
      if (!Array.isArray(group.defaultPath) || group.defaultPath.length !== stepCount) return false;
      const pathStates = new Set<string>();
      for (const id of group.defaultPath) {
        if (typeof id !== 'string' || !stateIds.has(id) || pathStates.has(id)) return false;
        pathStates.add(id);
      }
      for (const s of group.states) {
        if (pathStates.has(s.id) && s.timeline !== undefined) return false;
      }
    } else if (group.defaultPath !== undefined) {
      return false;
    }
    if (!Array.isArray(group.transitions)) return false;
    const operatorPairs = new Set<string>();
    const timerFroms = new Set<string>();
    for (const t of group.transitions) {
      if (!t || typeof t !== 'object') return false;
      if (typeof t.from !== 'string' || !stateIds.has(t.from)) return false;
      if (typeof t.to !== 'string' || !stateIds.has(t.to)) return false;
      if (t.trigger !== 'operator' && t.trigger !== 'timer' && t.trigger !== 'data-condition') return false;
      if (t.trigger === 'operator') {
        // The event is a bare identifier and never a reserved built-in; one (from, event)
        // pair per group, so dispatch is never ambiguous.
        if (typeof t.event !== 'string' || !ANIM_CALL_NAME_RE.test(t.event)) return false;
        if ((RESERVED_EVENTS as readonly string[]).includes(t.event)) return false;
        const pair = `${t.from} ${t.event}`;
        if (operatorPairs.has(pair)) return false;
        operatorPairs.add(pair);
      } else if (t.event !== undefined) {
        return false;
      }
      if (t.trigger === 'timer') {
        // At most ONE timer transition per from-state keeps auto-advance deterministic.
        if (typeof t.after !== 'number' || !(t.after > 0)) return false;
        if (timerFroms.has(t.from)) return false;
        timerFroms.add(t.from);
      } else if (t.after !== undefined) {
        return false;
      }
      // Reserved Phase-4 styling fields: type-checked only, consumed by nothing yet.
      if (t.style !== undefined && typeof t.style !== 'string') return false;
      if (t.duration !== undefined && (typeof t.duration !== 'number' || !(t.duration > 0))) return false;
      if (t.ease !== undefined && typeof t.ease !== 'string') return false;
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

/** Serialize one step (a path step or a state's inline timeline) at `indent`. `label`
 *  prefixes the opening brace (`"timeline": ` for an inline state timeline); the CALLER
 *  appends any trailing comma to the last line. */
function serializeStep(step: AnimStep, indent: string, label = ''): string[] {
  const i1 = indent + '  ';
  const i2 = indent + '    ';
  const i3 = indent + '      ';
  const i4 = indent + '        ';
  const lines: string[] = [];
  lines.push(`${indent}${label}{`);
  lines.push(`${i1}"name": ${JSON.stringify(step.name)},`);
  lines.push(`${i1}"duration": ${round(step.duration)},`);
  lines.push(`${i1}"ease": ${JSON.stringify(step.ease)},`);
  if (step.reveals && step.reveals.length > 0) {
    lines.push(`${i1}"reveals": [${step.reveals.map((s) => JSON.stringify(s)).join(', ')}],`);
  }
  if (step.hides && step.hides.length > 0) {
    lines.push(`${i1}"hides": [${step.hides.map((s) => JSON.stringify(s)).join(', ')}],`);
  }
  // Step calls: one per line, key order time/call — sorted so the diff stays stable.
  if (step.calls && step.calls.length > 0) {
    lines.push(`${i1}"calls": [`);
    const calls = [...step.calls].sort((a, b) => a.time - b.time);
    calls.forEach((c, ci) => {
      lines.push(`${i2}{ "time": ${round(c.time)}, "call": ${JSON.stringify(c.call)} }${ci < calls.length - 1 ? ',' : ''}`);
    });
    lines.push(`${i1}],`);
  }
  // Dynamics: one measured-motion segment per line, key order time/build/target — sorted
  // by time so the diff stays stable. `time` is written even at 0: it is the segment's
  // placement on the step clock, and a hand editor should see the knob.
  if (step.dynamics && step.dynamics.length > 0) {
    lines.push(`${i1}"dynamics": [`);
    const dyns = [...step.dynamics].sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
    dyns.forEach((d, di) => {
      const target = d.target ? `, "target": ${JSON.stringify(d.target)}` : '';
      lines.push(`${i2}{ "time": ${round(d.time ?? 0)}, "build": ${JSON.stringify(d.build)}${target} }${di < dyns.length - 1 ? ',' : ''}`);
    });
    lines.push(`${i1}],`);
  }
  // Loops: selector → prop → { repeat, yoyo?, repeatDelay? }, one loop per line. Sorted
  // (selectors then props) so the diff is stable regardless of insertion order.
  if (step.loops && Object.keys(step.loops).length > 0) {
    lines.push(`${i1}"loops": {`);
    const sels = Object.keys(step.loops).sort();
    sels.forEach((sel, si) => {
      const perProp = step.loops![sel];
      const props = Object.keys(perProp).sort();
      lines.push(`${i2}${JSON.stringify(sel)}: {`);
      props.forEach((prop, pi) => {
        const l = perProp[prop];
        const parts = [`"repeat": ${round(l.repeat)}`];
        if (l.yoyo) parts.push(`"yoyo": true`);
        if (l.repeatDelay) parts.push(`"repeatDelay": ${round(l.repeatDelay)}`);
        lines.push(`${i3}${JSON.stringify(prop)}: { ${parts.join(', ')} }${pi < props.length - 1 ? ',' : ''}`);
      });
      lines.push(`${i2}}${si < sels.length - 1 ? ',' : ''}`);
    });
    lines.push(`${i1}},`);
  }
  // "layers" is always present (possibly empty) — one canonical shape, no comma games.
  const selectors = Object.keys(step.layers);
  if (selectors.length === 0) {
    lines.push(`${i1}"layers": {}`);
  } else {
    lines.push(`${i1}"layers": {`);
    selectors.forEach((selector, li) => {
      const tracks = step.layers[selector];
      const props = Object.keys(tracks);
      lines.push(`${i2}${JSON.stringify(selector)}: {`);
      props.forEach((prop, pi) => {
        const kfs = [...tracks[prop]].sort((a, b) => a.time - b.time);
        const body = kfs.map((kf) => `${i4}${serializeKeyframe(kf)}`).join(',\n');
        lines.push(`${i3}${JSON.stringify(prop)}: [\n${body}\n${i3}]${pi < props.length - 1 ? ',' : ''}`);
      });
      lines.push(`${i2}}${li < selectors.length - 1 ? ',' : ''}`);
    });
    lines.push(`${i1}}`);
  }
  lines.push(`${indent}}`);
  return lines;
}

/** Serialize one state group. Key order id/initial/defaultPath/states/transitions; states in
 *  authored order (they echo the default path for readability); a pose-only state is one
 *  line; transitions are canonically SORTED (from-state's index in `states`, then trigger,
 *  then event, then to-state's index) and one per line — the calls precedent. */
function serializeGroup(group: AnimGroup, indent: string): string[] {
  const i1 = indent + '  ';
  const i2 = indent + '    ';
  const i3 = indent + '      ';
  const lines: string[] = [`${indent}{`];
  lines.push(`${i1}"id": ${JSON.stringify(group.id)},`);
  lines.push(`${i1}"initial": ${JSON.stringify(group.initial)},`);
  if (group.defaultPath) {
    lines.push(`${i1}"defaultPath": [${group.defaultPath.map((s) => JSON.stringify(s)).join(', ')}],`);
  }
  lines.push(`${i1}"states": [`);
  group.states.forEach((st, si) => {
    const comma = si < group.states.length - 1 ? ',' : '';
    const at = st.at ? `, "at": [${round(st.at[0])}, ${round(st.at[1])}]` : '';
    if (!st.timeline) {
      const name = st.name !== undefined ? `, "name": ${JSON.stringify(st.name)}` : '';
      lines.push(`${i2}{ "id": ${JSON.stringify(st.id)}${name}${at} }${comma}`);
    } else {
      lines.push(`${i2}{`);
      lines.push(`${i3}"id": ${JSON.stringify(st.id)},`);
      if (st.name !== undefined) lines.push(`${i3}"name": ${JSON.stringify(st.name)},`);
      if (st.at) lines.push(`${i3}"at": [${round(st.at[0])}, ${round(st.at[1])}],`);
      lines.push(...serializeStep(st.timeline, i3, '"timeline": '));
      lines.push(`${i2}}${comma}`);
    }
  });
  lines.push(`${i1}],`);
  const stateIndex = new Map(group.states.map((s, i) => [s.id, i]));
  const order = (id: string) => stateIndex.get(id) ?? group.states.length;
  const trans = [...group.transitions].sort(
    (a, b) =>
      order(a.from) - order(b.from) ||
      a.trigger.localeCompare(b.trigger) ||
      (a.event ?? '').localeCompare(b.event ?? '') ||
      order(a.to) - order(b.to)
  );
  if (trans.length === 0) {
    lines.push(`${i1}"transitions": []`);
  } else {
    lines.push(`${i1}"transitions": [`);
    trans.forEach((t, ti) => {
      const parts = [
        `"from": ${JSON.stringify(t.from)}`,
        `"to": ${JSON.stringify(t.to)}`,
        `"trigger": ${JSON.stringify(t.trigger)}`,
      ];
      if (t.event !== undefined) parts.push(`"event": ${JSON.stringify(t.event)}`);
      if (t.after !== undefined) parts.push(`"after": ${round(t.after)}`);
      if (t.style !== undefined) parts.push(`"style": ${JSON.stringify(t.style)}`);
      if (t.duration !== undefined) parts.push(`"duration": ${round(t.duration)}`);
      if (t.ease !== undefined) parts.push(`"ease": ${JSON.stringify(t.ease)}`);
      lines.push(`${i2}{ ${parts.join(', ')} }${ti < trans.length - 1 ? ',' : ''}`);
    });
    lines.push(`${i1}]`);
  }
  lines.push(`${indent}}`);
  return lines;
}

/**
 * Serialize the data canonically. Deterministic by construction: fixed key order
 * (version/root/speed/steps/machine; name/duration/ease/reveals/hides/calls/dynamics/loops/
 * layers; time/value/ease; id/initial/defaultPath/states/transitions; id/name/at/timeline;
 * from/to/trigger/event/after/style/duration/ease), fixed 2-space indentation, keyframes,
 * calls, dynamics, states and transitions one per line, all sorted, numbers rounded to 3
 * decimals.
 * serialize(parse(serialize(x))) === serialize(x) — a fixed point — so a small visual edit
 * only ever touches the lines it changed. Always writes the CURRENT version: the first edit
 * of a version-1 document is its migration moment (a one-line diff).
 */
export function serializeAnimData(data: AnimData): string {
  const lines: string[] = ['{'];
  lines.push(`  "version": 2,`);
  lines.push(`  "root": ${JSON.stringify(data.root)},`);
  lines.push(`  "speed": ${round(data.speed)},`);
  lines.push(`  "steps": [`);
  data.steps.forEach((step, si) => {
    const stepLines = serializeStep(step, '    ');
    if (si < data.steps.length - 1) stepLines[stepLines.length - 1] += ',';
    lines.push(...stepLines);
  });
  lines.push(data.machine ? '  ],' : '  ]');
  if (data.machine) {
    lines.push('  "machine": {');
    lines.push('    "groups": [');
    data.machine.groups.forEach((group, gi) => {
      const groupLines = serializeGroup(group, '      ');
      if (gi < data.machine!.groups.length - 1) groupLines[groupLines.length - 1] += ',';
      lines.push(...groupLines);
    });
    lines.push('    ]');
    lines.push('  }');
  }
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
