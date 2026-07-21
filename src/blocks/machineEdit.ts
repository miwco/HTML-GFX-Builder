// Phase 4 — pure mutators for the machine GRAPH (the node editor's write side). The same
// contract as animEdit.ts: every function takes AnimData, returns a new AnimData or null
// when the edit is illegal, and the caller makes it real through writeAnimData + ONE
// applyTemplate. Legality is delegated to the shape gate (isAnimData) wherever possible —
// the graph editor must never be able to write a machine the parser would refuse.

import { isAnimData, type AnimData, type AnimGroup, type TriggerType } from './animData';

/** Deep clone — AnimData is strict JSON by contract, so this is exact. */
const clone = (data: AnimData): AnimData => JSON.parse(JSON.stringify(data)) as AnimData;

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
  const next = clone(data);
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
  const next = clone(data);
  const t = groupById(next, groupId)?.transitions[index];
  if (!t || t.trigger !== 'operator') return null;
  t.event = event.trim();
  return gated(next);
}

/** Set a timer transition's delay (speed-relative seconds after the from-state settles). */
export function setTransitionAfter(data: AnimData, groupId: string, index: number, after: number): AnimData | null {
  const next = clone(data);
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
  const next = clone(data);
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
