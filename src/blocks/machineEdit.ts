// Phase 4 — pure mutators for the machine GRAPH (the node editor's write side). The same
// contract as animEdit.ts: every function takes AnimData, returns a new AnimData or null
// when the edit is illegal, and the caller makes it real through writeAnimData + ONE
// applyTemplate. Legality is delegated to the shape gate (isAnimData) wherever possible —
// the graph editor must never be able to write a machine the parser would refuse — plus
// validateMachine for the semantic rules a shape check cannot see (path connectivity).
//
// MATERIALIZATION: every mutator starts from `withExplicitMachine`. A template with no
// `machine` key IS the implicit derived machine (never persisted) — so the first graph
// edit writes that exact machine into the literal and then applies the edit on top, all in
// the caller's one undoable apply. Nothing changes behaviourally at materialization: the
// persisted machine is byte-for-byte the one the runtime was already deriving.

import {
  isAnimData,
  TRANSITION_STYLES,
  type AnimData,
  type AnimGroup,
  type AnimState,
  type AnimStep,
  type TriggerType,
} from './animData';
import { deriveMachine, freshStateId, validateMachine } from './animMachine';

/** Deep clone — AnimData is strict JSON by contract, so this is exact. */
const clone = (data: AnimData): AnimData => JSON.parse(JSON.stringify(data)) as AnimData;

/** The editable clone: the explicit machine when authored, else the derived one PERSISTED
 *  (the first edit's materialization moment). */
function withExplicitMachine(data: AnimData): AnimData {
  const next = clone(data);
  if (!next.machine) next.machine = deriveMachine(next);
  return next;
}

function groupById(data: AnimData, groupId: string): AnimGroup | null {
  return data.machine?.groups.find((g) => g.id === groupId) ?? null;
}

/** A fresh operator event name unique among the group's (from, event) pairs. */
function freshEvent(group: AnimGroup, from: string, base = 'go'): string {
  const taken = (event: string) =>
    group.transitions.some((t) => t.from === from && t.trigger === 'operator' && t.event === event);
  let event = base;
  for (let n = 2; taken(event); n++) event = `${base}${n}`;
  return event;
}

/** Validate a mutated clone through the ONE shape gate; null when the edit was illegal. */
function gated(next: AnimData): AnimData | null {
  return isAnimData(next) ? next : null;
}

/** Switch a transition's trigger. Moving to `operator` mints a unique event name (the card
 *  renames it after); moving to `timer` defaults the delay — and both moves clear the other
 *  trigger's fields, because the shape gate forbids a mixed arrow. `data-condition` is not
 *  offered: it is reserved, parsed but never fired. */
export function setTransitionTrigger(
  data: AnimData,
  groupId: string,
  index: number,
  trigger: Exclude<TriggerType, 'data-condition'>,
): AnimData | null {
  const next = withExplicitMachine(data);
  const group = groupById(next, groupId);
  const t = group?.transitions[index];
  if (!group || !t || t.trigger === trigger) return null;
  t.trigger = trigger;
  if (trigger === 'operator') {
    delete t.after;
    t.event = freshEvent(group, t.from);
  } else {
    delete t.event;
    t.after = t.after ?? 3;
  }
  return gated(next);
}

/** Rename an operator transition's event. The shape gate enforces the rules (a bare,
 *  non-reserved identifier, unique per (from, event) in the group). */
export function setTransitionEvent(data: AnimData, groupId: string, index: number, event: string): AnimData | null {
  const next = withExplicitMachine(data);
  const t = groupById(next, groupId)?.transitions[index];
  if (!t || t.trigger !== 'operator') return null;
  t.event = event.trim();
  return gated(next);
}

/** Set a timer transition's delay (speed-relative seconds after the from-state settles). */
export function setTransitionAfter(data: AnimData, groupId: string, index: number, after: number): AnimData | null {
  const next = withExplicitMachine(data);
  const t = groupById(next, groupId)?.transitions[index];
  if (!t || t.trigger !== 'timer') return null;
  t.after = after;
  return gated(next);
}

/** Rename an OFF-PATH state's label. A default-path state's name lives on its step —
 *  rename through animEdit's renameStep, which syncs the bound label; this returns null
 *  there so a caller cannot fork the two names. Ids never change: transitions, snap
 *  assignments and exported control pages all reference them. */
export function renameOffPathState(data: AnimData, groupId: string, stateId: string, name: string): AnimData | null {
  const next = withExplicitMachine(data);
  const group = groupById(next, groupId);
  const state = group?.states.find((s) => s.id === stateId);
  if (!group || !state) return null;
  const isMain = next.machine?.groups[0] === group;
  if (isMain && group.defaultPath?.includes(stateId)) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  state.name = trimmed;
  return gated(next);
}

/** Set (or clear, with null) a transition's STYLE — the arrow's own animated change. The
 *  vocabulary is TRANSITION_STYLES; clearing drops the style's duration and ease with it,
 *  returning the arrow to the classic entry-timeline change. */
export function setTransitionStyle(data: AnimData, groupId: string, index: number, style: string | null): AnimData | null {
  const next = withExplicitMachine(data);
  const t = groupById(next, groupId)?.transitions[index];
  if (!t) return null;
  if (style === null) {
    delete t.style;
    delete t.duration;
    delete t.ease;
  } else {
    if (!(TRANSITION_STYLES as readonly string[]).includes(style)) return null;
    t.style = style;
  }
  return gated(next);
}

/** Set a styled transition's total duration (speed-relative seconds). */
export function setTransitionStyleDuration(data: AnimData, groupId: string, index: number, duration: number): AnimData | null {
  const next = withExplicitMachine(data);
  const t = groupById(next, groupId)?.transitions[index];
  if (!t || t.style === undefined) return null;
  t.duration = duration;
  return gated(next);
}

/** Set a styled transition's ease (each half of the change plays with it). */
export function setTransitionStyleEase(data: AnimData, groupId: string, index: number, ease: string): AnimData | null {
  const next = withExplicitMachine(data);
  const t = groupById(next, groupId)?.transitions[index];
  if (!t || t.style === undefined) return null;
  t.ease = ease;
  return gated(next);
}

/** Draw a new arrow: an operator transition with a freshly minted unique event name (the
 *  card is where it gets its real one). `from === to` is a legal self-transition. */
export function addTransition(data: AnimData, groupId: string, from: string, to: string): AnimData | null {
  const next = withExplicitMachine(data);
  const group = groupById(next, groupId);
  if (!group) return null;
  group.transitions.push({ from, to, trigger: 'operator', event: freshEvent(group, from) });
  return gated(next);
}

/** Remove a transition. Gated on the SEMANTIC validator as well as the shape gate: deleting
 *  the only arrow behind a default-path edge would disconnect the walk (an export-blocking
 *  error), so an edit that ADDS validation errors is refused — while deleting one of two
 *  parallel arrows, a branch arrow, or the opt-in edge into the final waypoint stays legal. */
export function removeTransition(data: AnimData, groupId: string, index: number): AnimData | null {
  const next = withExplicitMachine(data);
  const group = groupById(next, groupId);
  if (!group || index < 0 || index >= group.transitions.length) return null;
  const before = validateMachine(next).errors.length;
  group.transitions.splice(index, 1);
  if (validateMachine(next).errors.length > before) return null;
  return gated(next);
}

/** Add an OFF-PATH state — pose-only until it gets an inline timeline or the timeline
 *  grows it a waypoint. Ids fold from the name exactly like derived states' do. */
export function addState(data: AnimData, groupId: string, name: string, at?: [number, number]): AnimData | null {
  const next = withExplicitMachine(data);
  const group = groupById(next, groupId);
  if (!group) return null;
  const trimmed = name.trim() || 'State';
  const state: AnimState = { id: freshStateId(group, trimmed), name: trimmed };
  if (at) state.at = at;
  group.states.push(state);
  return gated(next);
}

/**
 * Give an OFF-PATH state its own inline timeline, or take it away (`step` null).
 *
 * This is what makes a branch able to LOOK different from the state before it. Without one a
 * branch is pose-only, and a pose's look is composed by replaying the route to it — so every
 * branch a user could author was, by construction, a copy of its predecessor.
 *
 * Refused on a default-path state: a waypoint's timeline is `steps[i]` by the positional
 * binding, and the shape gate rejects a path state carrying one. `reveals`/`hides` are the
 * ordered walk's mechanics and are invalid here too — blocks/timelineLens.ts strips them on
 * the way in, and the gate below is the proof.
 */
export function setStateTimeline(
  data: AnimData,
  groupId: string,
  stateId: string,
  step: AnimStep | null,
): AnimData | null {
  const next = withExplicitMachine(data);
  const group = groupById(next, groupId);
  if (!group || group.defaultPath?.includes(stateId)) return null;
  const state = group.states.find((s) => s.id === stateId);
  if (!state) return null;
  if (step) state.timeline = step;
  else delete state.timeline;
  return gated(next);
}

/** Delete an OFF-PATH state and every arrow touching it. The initial state is the group's
 *  rest and cannot go; default-path states belong to the timeline (delete the STEP there —
 *  the positional binding means the state and its clip are one thing). */
export function deleteState(data: AnimData, groupId: string, stateId: string): AnimData | null {
  const next = withExplicitMachine(data);
  const group = groupById(next, groupId);
  if (!group || stateId === group.initial) return null;
  if (group.defaultPath?.includes(stateId)) return null;
  if (!group.states.some((s) => s.id === stateId)) return null;
  group.states = group.states.filter((s) => s.id !== stateId);
  group.transitions = group.transitions.filter((t) => t.from !== stateId && t.to !== stateId);
  return gated(next);
}

/** Add a parallel group — the state-explosion antidote (a flag, an alert, a clock each get
 *  their own small graph). Born as one pose-only rest state; arrows and states follow. */
export function addGroup(data: AnimData, name?: string): AnimData | null {
  const next = withExplicitMachine(data);
  const machine = next.machine!;
  const taken = new Set(machine.groups.map((g) => g.id));
  const base = (name?.trim() || 'group').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'group';
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  machine.groups.push({ id, initial: 'off', states: [{ id: 'off', name: 'Off' }], transitions: [] });
  return gated(next);
}

/** Remove a parallel group. The MAIN group is the default path's home — it never goes. */
export function removeGroup(data: AnimData, groupId: string): AnimData | null {
  const next = withExplicitMachine(data);
  const machine = next.machine!;
  const gi = machine.groups.findIndex((g) => g.id === groupId);
  if (gi <= 0) return null;
  machine.groups.splice(gi, 1);
  return gated(next);
}

/** Park a state's box at a position on the graph canvas (the drag's commit). */
export function setStatePosition(
  data: AnimData,
  groupId: string,
  stateId: string,
  at: [number, number],
): AnimData | null {
  const next = withExplicitMachine(data);
  const state = groupById(next, groupId)?.states.find((s) => s.id === stateId);
  if (!state) return null;
  state.at = [Math.round(at[0]), Math.round(at[1])];
  return gated(next);
}
