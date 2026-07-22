// THE TIMELINE LENS — which timeline the step surface is editing.
//
// A graphic's motion lives in two places: the default path's `steps`, and a branch state's
// own `state.timeline` (docs/STATE_MACHINE_SCHEMA.md §2). The step timeline and the Inspector
// were written against the first — every mutator in animEdit.ts takes a step INDEX, and both
// surfaces read `data.steps[i]`.
//
// Teaching each of those a second address would mean touching every mutator. Instead we
// PROJECT: reading a branch target hands the surfaces an AnimData whose single step IS that
// state's timeline, so animEdit, animEval, the keyframe drags and the Inspector all keep
// working unchanged; writing folds the edited step back into the state it came from.
//
// The target lives in templateStore, not in the dock's local state, because the Inspector
// resolves values and stamps keyframes against the SAME projection — a component-local target
// would have it editing the entrance while the timeline showed a branch.

import type { AnimData, AnimStep } from './animData';

export type TimelineTarget =
  /** The default path — the ordinary surface, and what every existing template opens on. */
  | { kind: 'path' }
  /** One off-path state's own inline timeline. */
  | { kind: 'state'; groupId: string; stateId: string };

export const PATH_TARGET: TimelineTarget = { kind: 'path' };

/** An empty timeline for a state that has none yet — the shape "+ Add a timeline" writes. */
export function emptyStateTimeline(name: string): AnimStep {
  return { name, duration: 0.45, ease: 'power2.out', layers: {} };
}

function findState(data: AnimData, groupId: string, stateId: string) {
  const group = data.machine?.groups.find((g) => g.id === groupId);
  return group?.states.find((s) => s.id === stateId) ?? null;
}

/**
 * The AnimData the step surface edits for this target.
 *
 * For a state: a ONE-STEP projection carrying that state's timeline. `machine` is dropped so
 * the surface's machine-aware helpers (the walk's cue markers, `spxSteps`) see a plain
 * document and cannot describe a branch as if it sat on the path.
 *
 * Returns null when the target no longer resolves — a deleted state, a template swapped
 * underneath — so the caller can fall back to the path rather than render a lie.
 */
export function lensRead(data: AnimData, target: TimelineTarget): AnimData | null {
  if (target.kind === 'path') return data;
  const state = findState(data, target.groupId, target.stateId);
  if (!state?.timeline) return null;
  const { machine: _machine, ...rest } = data;
  return { ...rest, steps: [state.timeline] };
}

/**
 * Fold an edited projection back into the document.
 *
 * Everything TOP-LEVEL comes from the edit (speed, root — a change made while a branch was
 * open is still a change to the graphic), `steps` is restored from the original document,
 * and the single edited step becomes the state's timeline.
 *
 * `reveals` and `hides` are stripped: they are the ordered walk's pre-hide and early-exit
 * mechanics and the shape gate REFUSES them on an inline timeline (animData `isAnimStepShape`
 * with revealsAllowed false). The surface hides those affordances in branch mode anyway; this
 * is the belt to that braces, so a stray write can never produce a document the parser would
 * reject.
 */
export function lensWrite(data: AnimData, target: TimelineTarget, edited: AnimData): AnimData | null {
  if (target.kind === 'path') return edited;
  const step = edited.steps[0];
  if (!step) return null;
  const next: AnimData = { ...edited, steps: data.steps, machine: data.machine };
  if (!next.machine) return null;
  const { reveals: _reveals, hides: _hides, ...clean } = step;
  next.machine = {
    ...next.machine,
    groups: next.machine.groups.map((g) =>
      g.id !== target.groupId
        ? g
        : { ...g, states: g.states.map((s) => (s.id === target.stateId ? { ...s, timeline: clean } : s)) },
    ),
  };
  return next;
}

/** The state a branch target points at, for the surfaces that need to name it. */
export function targetState(data: AnimData, target: TimelineTarget): { id: string; name: string } | null {
  if (target.kind === 'path') return null;
  const state = findState(data, target.groupId, target.stateId);
  return state ? { id: state.id, name: state.name ?? state.id } : null;
}
