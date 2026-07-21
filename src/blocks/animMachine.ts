// The state machine's editor-side seam (docs/STATE_MACHINE_SCHEMA.md). animData.ts is the
// literal's contract; this module answers GRAPH questions about it: derive the implicit
// machine for machine-less data, count the SPX Continue presses, query legal events (the
// operator's "Action"), compute the canonical snap path, and judge a machine semantically
// for validateTemplate. Everything is pure. The emitted runtime interpreter
// (templates/shared/animRuntime.ts) re-implements the derivation and the canonical path in
// ES5 — the two must stay in agreement, exactly like animEval mirrors the playback math.

import {
  RESERVED_EVENTS,
  TRANSITION_STYLES,
  type AnimData,
  type AnimGroup,
  type AnimMachine,
  type AnimState,
  type AnimStep,
  type AnimTransition,
} from './animData';

export { RESERVED_EVENTS };

/** The derived machine's one group id — and the id every v1-era template's group answers to
 *  in noacgMachineState()/noacgSnap(). */
export const MAIN_GROUP_ID = 'main';

/** The derived machine's synthesized off-air initial state. */
export const OFF_STATE_ID = 'off';

/** A step name as a state id: lowercased, non-alphanumerics folded to '-'. The interpreter
 *  applies the identical fold, so editor and runtime name the same states. */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'state'
  );
}

/** The machine a graphic ANSWERS TO: the explicit one when authored, else the implicit
 *  one-group linear machine derived from the step chain — states named after the steps, the
 *  synthesized pose-only `off` as initial, an operator `next` edge along the path, and (v1
 *  parity) NO next edge into the final Out: next() no-ops when only Out remains, stop()
 *  takes the graphic out. Derived on every read, never persisted. */
export function deriveMachine(data: AnimData): AnimMachine {
  if (data.machine) return data.machine;
  const used = new Set<string>([OFF_STATE_ID]);
  const states: AnimState[] = [{ id: OFF_STATE_ID, name: 'Off' }];
  const defaultPath: string[] = [];
  for (const step of data.steps) {
    let id = slugify(step.name);
    for (let n = 2; used.has(id); n++) id = `${slugify(step.name)}-${n}`;
    used.add(id);
    states.push({ id, name: step.name });
    defaultPath.push(id);
  }
  const transitions: AnimTransition[] = [];
  for (let i = 0; i + 2 < defaultPath.length; i++) {
    transitions.push({
      from: defaultPath[i],
      to: defaultPath[i + 1],
      trigger: 'operator',
      event: 'next',
    });
  }
  return { groups: [{ id: MAIN_GROUP_ID, initial: OFF_STATE_ID, defaultPath, states, transitions }] };
}

/** THE `settings.steps` rule: the SPX steps number is derived from the default path's
 *  length (numerically identical to the historical `steps.length - 1` by the positional-
 *  binding invariant). This function exists so the rule lives once — every site that
 *  re-syncs `settings.steps` calls it. */
export function spxSteps(data: AnimData): number {
  const path = data.machine?.groups[0]?.defaultPath;
  return (path ? path.length : data.steps.length) - 1;
}

export function stateById(group: AnimGroup, id: string): AnimState | null {
  return group.states.find((s) => s.id === id) ?? null;
}

/** The default-path group, or null when the data carries no explicit machine. Every
 *  structural step edit goes through this: `steps` and `defaultPath` are bound positionally,
 *  so an edit to one is an edit to the other. */
export function mainGroup(data: AnimData): AnimGroup | null {
  return data.machine?.groups[0] ?? null;
}

/** A state id for a new waypoint, folded from its step name exactly as deriveMachine folds
 *  one, then de-duplicated — so a hand-added step is named like a derived one. */
export function freshStateId(group: AnimGroup, name: string): string {
  const base = slugify(name);
  const taken = new Set(group.states.map((s) => s.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

/** Every timeline a template can play: the default path's steps plus every state's inline
 *  timeline. Anything that must consider ALL of a graphic's motion (the validator's dangling
 *  reference guards, the bench's measured-motion exemptions) calls this rather than reading
 *  `steps` and silently missing the branches. */
export function allTimelines(data: AnimData): AnimStep[] {
  const inline = data.machine?.groups.flatMap((g) => g.states.flatMap((s) => (s.timeline ? [s.timeline] : []))) ?? [];
  return [...data.steps, ...inline];
}

/** Keep each waypoint's state NAME in step with its bound step. The state's ID deliberately
 *  never follows: transitions, snap assignments and an exported control page all reference it,
 *  so the id is identity while the name is only a label. */
export function syncWaypointNames(data: AnimData): void {
  const main = mainGroup(data);
  if (!main?.defaultPath) return;
  main.defaultPath.forEach((id, i) => {
    const state = stateById(main, id);
    const step = data.steps[i];
    if (state && step) state.name = step.name;
  });
}

/** Is this transition one of the default path's own consecutive-waypoint edges? An edge that
 *  is NOT one is an authored branch arrow, which a structural edit must never silently drop. */
export function isWalkEdge(group: AnimGroup, t: AnimTransition): boolean {
  const path = group.defaultPath;
  if (!path) return false;
  const from = path.indexOf(t.from);
  return from >= 0 && path[from + 1] === t.to;
}

/** Re-establish an operator arrow between every consecutive pair of waypoints, EXCEPT into
 *  the final one (v1 parity — stop() plays the exit; an arrow there is the author's opt-in to
 *  next-drives-out). These arrows exist for validateMachine's honesty check and for the graph
 *  the node editor will draw: the runtime walks the path POSITIONALLY and fires a synthetic
 *  edge when none is authored. An inserted waypoint INHERITS the event of the arrow it split,
 *  so the operator's press keeps its name; the new second half gets `next`. */
export function reconnectPath(group: AnimGroup): void {
  const path = group.defaultPath;
  if (!path) return;
  const taken = (from: string, event: string) =>
    group.transitions.some((t) => t.from === from && t.trigger === 'operator' && t.event === event);
  for (let i = 0; i + 2 < path.length; i++) {
    const [from, to] = [path[i], path[i + 1]];
    if (group.transitions.some((t) => t.from === from && t.to === to && t.trigger !== 'data-condition')) continue;
    // `(from, event)` must stay unique within a group or dispatch would be ambiguous.
    let event = 'next';
    for (let n = 2; taken(from, event); n++) event = `next${n}`;
    group.transitions.push({ from, to, trigger: 'operator', event });
  }
}

export function transitionsFrom(group: AnimGroup, stateId: string): AnimTransition[] {
  return group.transitions.filter((t) => t.from === stateId);
}

/** The spec's "Action": the distinct operator events legal from this state — what a control
 *  surface should offer right now. Structural guarding IS this list: an event not on it is
 *  dropped. */
export function operatorEvents(group: AnimGroup, stateId: string): string[] {
  const events: string[] = [];
  for (const t of transitionsFrom(group, stateId)) {
    if (t.trigger === 'operator' && t.event && !events.includes(t.event)) events.push(t.event);
  }
  return events;
}

/** The state's single auto-advance, or null (the validator caps timers at one per state). */
export function timerTransition(group: AnimGroup, stateId: string): AnimTransition | null {
  return transitionsFrom(group, stateId).find((t) => t.trigger === 'timer') ?? null;
}

/** Every distinct authored operator event across the machine — the simulator's event strip. */
export function allOperatorEvents(machine: AnimMachine): string[] {
  const events: string[] = [];
  for (const group of machine.groups) {
    for (const t of group.transitions) {
      if (t.trigger === 'operator' && t.event && !events.includes(t.event)) events.push(t.event);
    }
  }
  return events;
}

/** One button of a control surface: the event plus its declared presentation, resolved. */
export interface ControlButton {
  event: string;
  label: string;
  section?: string;
  payload?: string[];
  destructive?: boolean;
}

/**
 * The machine's button list — THE one merge every control surface renders (the Control tab,
 * the standalone controlpanel.html, the simulator's event strip). Every authored operator
 * event gets a button; a `machine.controls` entry dresses its event (label, section, payload,
 * destructive) and sets the order, and events nobody declared follow as plain buttons named
 * after themselves. A declared entry whose event no arrow carries is skipped here (a button
 * must fire something) — validateMachine warns about it. An UNDECLARED `next` is skipped
 * too: the lifecycle » Next button already fires it (the walk and any authored rejoin), so
 * a second ⚡ button would be the same control twice.
 */
export function machineControls(machine: AnimMachine): ControlButton[] {
  const authored = allOperatorEvents(machine);
  const declared = machine.controls ?? [];
  const byEvent = new Map(declared.map((c) => [c.event, c]));
  // Declared order first (the serializer already sorted by `order`), then the undeclared
  // events in authored order.
  const events = [
    ...declared.map((c) => c.event).filter((e) => authored.includes(e)),
    ...authored.filter((e) => !byEvent.has(e) && e !== 'next'),
  ];
  return events.map((event) => {
    const c = byEvent.get(event);
    const button: ControlButton = { event, label: c?.label ?? event };
    if (c?.section !== undefined) button.section = c.section;
    if (c?.payload !== undefined) button.payload = c.payload;
    if (c?.destructive !== undefined) button.destructive = c.destructive;
    return button;
  });
}

/** The group's traversal edges: the default-path walk's own edges first (they model the
 *  play/next built-ins), then authored operator + timer transitions (data-condition never
 *  fires). Shared by reachability and the canonical snap path. */
function traversalEdges(group: AnimGroup, isMain: boolean): Array<{ from: string; to: string }> {
  const edges: Array<{ from: string; to: string }> = [];
  if (isMain && group.defaultPath && group.defaultPath.length > 0) {
    edges.push({ from: group.initial, to: group.defaultPath[0] });
    for (let w = 0; w + 1 < group.defaultPath.length; w++) {
      edges.push({ from: group.defaultPath[w], to: group.defaultPath[w + 1] });
    }
  }
  for (const t of group.transitions) {
    if (t.trigger !== 'data-condition') edges.push(t);
  }
  return edges;
}

/** The CANONICAL path to a state: for a main-group waypoint, the default-path prefix; else
 *  BFS shortest path from the group's initial, ties broken by edge declaration order (the
 *  walk's own edges first). Snap replays the entered states' timelines along this path with
 *  suppressed callbacks. Returns the entered state ids in order (initial excluded), or null
 *  when the state is unreachable. Mirrored by the interpreter's noacgCanonicalPath — keep
 *  them in agreement. */
export function canonicalPath(group: AnimGroup, isMain: boolean, targetId: string): string[] | null {
  if (targetId === group.initial) return [];
  if (isMain && group.defaultPath) {
    const pi = group.defaultPath.indexOf(targetId);
    if (pi >= 0) return group.defaultPath.slice(0, pi + 1);
  }
  const edges = traversalEdges(group, isMain);
  const cameFrom = new Map<string, string>();
  const queue: string[] = [group.initial];
  const seen = new Set<string>([group.initial]);
  while (queue.length > 0) {
    const at = queue.shift()!;
    for (const edge of edges) {
      if (edge.from !== at || seen.has(edge.to)) continue;
      seen.add(edge.to);
      cameFrom.set(edge.to, at);
      if (edge.to === targetId) {
        const path: string[] = [];
        for (let id = targetId; id !== group.initial; id = cameFrom.get(id)!) path.unshift(id);
        return path;
      }
      queue.push(edge.to);
    }
  }
  return null;
}

/** The timeline a state plays when entered: a main-group waypoint's positional step, or an
 *  off-path state's inline one. Mirrors the interpreter's noacgStepFor. */
function stepForState(data: AnimData, group: AnimGroup, stateId: string): AnimStep | null {
  if (group === data.machine?.groups[0]) {
    const at = group.defaultPath?.indexOf(stateId) ?? -1;
    if (at >= 0) return data.steps[at] ?? null;
  }
  return stateById(group, stateId)?.timeline ?? null;
}

/**
 * Can this state's timeline be relied on to END? A timer arms with a call scheduled at the
 * timeline's end, so a state whose timeline never gets there never advances — silently.
 *
 * Two things make an end unreachable. A `repeat: -1` loop track obviously never finishes. And
 * MEASURED motion (a `dynamics` builder) returns a segment whose length is read off the DOM at
 * play time — the marquee and roll builders return endless ones — so its duration is simply
 * not knowable when the machine is authored. Both are rejected: a timer on either would be a
 * promise the runtime cannot keep.
 */
function hasEndlessMotion(data: AnimData, group: AnimGroup, stateId: string): boolean {
  const step = stepForState(data, group, stateId);
  if (!step) return false;
  if ((step.dynamics ?? []).length > 0) return true;
  for (const perProp of Object.values(step.loops ?? {})) {
    for (const loop of Object.values(perProp)) if (loop.repeat < 0) return true;
  }
  return false;
}

/** Semantic judgement for validateTemplate — runs only on a machine that already passed the
 *  shape gate (isAnimData). Errors block export; warnings advise. */
export function validateMachine(data: AnimData): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const machine = data.machine;
  if (!machine) return { errors, warnings };
  machine.groups.forEach((group, gi) => {
    const isMain = gi === 0;
    // The default path must be an AUTHORED walk: consecutive waypoints connected by a
    // transition, so the graph the node editor will draw is honest about what next() does.
    // (The runtime walks the path positionally either way — this keeps authors truthful.)
    if (isMain && group.defaultPath) {
      const start = group.defaultPath[0];
      for (let i = 0; i + 1 < group.defaultPath.length; i++) {
        const from = group.defaultPath[i];
        const to = group.defaultPath[i + 1];
        const connected = group.transitions.some((t) => t.from === from && t.to === to && t.trigger !== 'data-condition');
        // v1 parity: the edge INTO the final exit waypoint is optional (stop() plays it;
        // an authored next edge is how a template opts into next-drives-out).
        if (!connected && i + 2 < group.defaultPath.length) {
          errors.push(`Group "${group.id}": default path is not connected — no transition from "${from}" to "${to}".`);
        }
      }
      if (start === group.initial) {
        warnings.push(`Group "${group.id}": the initial state sits on the default path — Off is usually a rest outside it.`);
      }
    }
    // Unreachable states can never be entered by any event — usually a leftover.
    for (const state of group.states) {
      if (state.id === group.initial) continue;
      if (canonicalPath(group, isMain, state.id) === null) {
        warnings.push(`Group "${group.id}": state "${state.id}" is unreachable from "${group.initial}".`);
      }
    }
    for (const t of group.transitions) {
      if (t.trigger === 'data-condition') {
        warnings.push(`Group "${group.id}": "${t.from}" → "${t.to}" uses the reserved data-condition trigger — it never fires in this version.`);
      }
      // An unknown style round-trips and the entry timeline plays instead — worth saying,
      // because the author expected a styled change and will get the classic one.
      if (t.style !== undefined && !(TRANSITION_STYLES as readonly string[]).includes(t.style)) {
        warnings.push(
          `Group "${group.id}": "${t.from}" → "${t.to}" carries an unknown transition style "${t.style}" — the target state's entry timeline will play instead.`,
        );
      }
      // A timer arms when its state's entry timeline ENDS. A timeline holding endless motion
      // (a repeat:-1 loop, or a measured builder that returns one) never ends, so the timer
      // would never arm and the state would silently never advance. Verified against GSAP:
      // a call scheduled at an endless timeline's duration does not fire.
      if (t.trigger === 'timer' && hasEndlessMotion(data, group, t.from)) {
        errors.push(
          `Group "${group.id}": state "${t.from}" has a timer transition but its timeline never ends ` +
            `(it carries an endless loop or measured motion), so the timer would never fire.`,
        );
      }
    }
  });
  // A control entry for an event no arrow carries would render a dead button — machineControls
  // skips it, and this says why the declared button is missing.
  if (machine.controls) {
    const authored = allOperatorEvents(machine);
    for (const c of machine.controls) {
      if (!authored.includes(c.event)) {
        warnings.push(`Machine controls: no transition fires the event "${c.event}" — its button is not rendered.`);
      }
    }
  }
  return { errors, warnings };
}
