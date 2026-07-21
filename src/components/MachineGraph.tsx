import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useTemplateStore } from '../store/templateStore';
import type { AnimData, AnimGroup, AnimTransition } from '../blocks/animData';
import { deriveMachine, isWalkEdge } from '../blocks/animMachine';
import { renameStep } from '../blocks/animEdit';
import {
  renameOffPathState,
  setTransitionAfter,
  setTransitionEvent,
  setTransitionTrigger,
} from '../blocks/machineEdit';
import { writeAnimData } from '../templates/shared/animRuntime';
import type { SpxWindow } from './PlayoutSimulator';

// Phase 4 (docs/noacg-master-goals.md): the node editor's read-first surface. The machine
// GRAPH beneath the canvas — states as boxes, transitions as arrows, the default path as the
// amber spine, the live current state highlighted — toggling with the step timeline in
// TimelineDock (Rive-style). One generic editor for every graphic: a template without an
// explicit machine shows its DERIVED linear machine (exactly what next() really does), so
// the view is never empty and never lies. Rendering + snap-to-state only; structural editing
// arms in later steps of the phase.

interface StateBox {
  groupId: string;
  id: string;
  name: string;
  /** ▶ » ■ for default-path waypoints (the timeline's cue vocabulary), ○ for the rest state. */
  badge: string | null;
  poseOnly: boolean;
  initial: boolean;
  /** The state's default-path position (steps[pathIndex] is its timeline), or null off-path. */
  pathIndex: number | null;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Arrow {
  key: string;
  groupId: string;
  /** The transition behind an authored arrow; null for the walk's synthetic edges. */
  t: AnimTransition | null;
  /** Its index in group.transitions — the mutators' handle; null for synthetic edges. */
  tIndex: number | null;
  kind: 'walk' | 'walk-stop' | 'operator' | 'timer' | 'reserved';
  label: string;
  path: string;
  labelX: number;
  labelY: number;
}

interface LaneModel {
  group: AnimGroup;
  y: number;
  h: number;
}

interface GraphModel {
  boxes: StateBox[];
  arrows: Arrow[];
  lanes: LaneModel[];
  width: number;
  height: number;
}

const BOX_H = 34;
const COL_GAP = 72; // room between boxes for arrowheads + labels
const ROW_GAP = 58; // the off-path row sits well clear of below-box bows
const LANE_PAD_TOP = 40; // lane label + above-box bows
const LANE_PAD_BOTTOM = 34; // below-box bows
const PAD_X = 26;

const boxWidth = (name: string) => Math.min(180, Math.max(76, 26 + name.length * 7.5));

/** Cubic bezier path + its midpoint (t = 0.5) for the label. */
function bezier(
  x1: number,
  y1: number,
  cx1: number,
  cy1: number,
  cx2: number,
  cy2: number,
  x2: number,
  y2: number,
): { path: string; mx: number; my: number } {
  return {
    path: `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`,
    mx: (x1 + 3 * cx1 + 3 * cx2 + x2) / 8,
    my: (y1 + 3 * cy1 + 3 * cy2 + y2) / 8,
  };
}

/** Route one arrow between two boxes. `bow` lifts parallel/branch arrows clear of the
 *  straight spine: positive bows below the boxes, negative above. */
function route(from: StateBox, to: StateBox, bow: number): { path: string; mx: number; my: number } {
  if (from.id === to.id && from.groupId === to.groupId) {
    // Self-transition: a loop arced well clear of the box (a ticker's cycle beat).
    const x1 = from.x + from.w * 0.18;
    const x2 = from.x + from.w * 0.62;
    const y = from.y;
    return bezier(x1, y, x1 - 22, y - 52, x2 + 22, y - 52, x2, y);
  }
  const sameRow = Math.abs(from.y - to.y) < 1;
  if (sameRow && bow === 0) {
    // The spine: straight, right edge to left edge.
    const y = from.y + BOX_H / 2;
    const x1 = from.x + from.w;
    const x2 = to.x;
    return bezier(x1, y, x1 + (x2 - x1) * 0.4, y, x2 - (x2 - x1) * 0.4, y, x2, y);
  }
  if (sameRow) {
    // A branch on the same row: bow below (forward) or above (backward) the boxes.
    const below = bow > 0;
    const y1 = below ? from.y + BOX_H : from.y;
    const y2 = below ? to.y + BOX_H : to.y;
    const x1 = from.x + from.w / 2;
    const x2 = to.x + to.w / 2;
    return bezier(x1, y1, x1, y1 + bow, x2, y2 + bow, x2, y2);
  }
  // Across rows: leave the lower edge of the upper box, arrive at the upper edge of the
  // lower box (or the reverse). `bow` bends the curve sideways so parallel arrows between
  // the same pair (locked → reveal on both "judge" and "next") stay apart.
  const down = to.y > from.y;
  const x1 = from.x + from.w / 2;
  const y1 = down ? from.y + BOX_H : from.y;
  const x2 = to.x + to.w / 2;
  const y2 = down ? to.y : to.y + BOX_H;
  const dy = (y2 - y1) * 0.5;
  return bezier(x1, y1, x1 + bow, y1 + dy, x2 + bow, y2 - dy, x2, y2);
}

/** Lay the machine out: one lane per group (main first), the default path as the top row
 *  left to right, off-path states on a second row beneath. Deterministic — same machine,
 *  same picture. */
function buildModel(data: AnimData): GraphModel {
  const machine = data.machine ?? deriveMachine(data);
  const boxes: StateBox[] = [];
  const arrows: Arrow[] = [];
  const lanes: LaneModel[] = [];
  let laneY = 0;
  let width = 0;

  machine.groups.forEach((group, gi) => {
    const isMain = gi === 0;
    const path = isMain ? (group.defaultPath ?? []) : [];
    const row0: string[] = [group.initial, ...path.filter((id) => id !== group.initial)];
    if (!isMain) {
      for (const s of group.states) if (!row0.includes(s.id)) row0.push(s.id);
    }
    const row1 = group.states.map((s) => s.id).filter((id) => !row0.includes(id));

    const byId = new Map<string, StateBox>();
    const layRow = (ids: string[], y: number) => {
      let x = PAD_X;
      for (const id of ids) {
        const state = group.states.find((s) => s.id === id);
        if (!state) continue;
        const name = state.name ?? state.id;
        const pi = path.indexOf(id);
        const badge =
          pi < 0 ? (id === group.initial ? '○' : null) : pi === 0 ? '▶' : pi === path.length - 1 ? '■' : '»';
        const box: StateBox = {
          groupId: group.id,
          id,
          name,
          badge,
          poseOnly: pi < 0 && !state.timeline,
          initial: id === group.initial,
          pathIndex: isMain && pi >= 0 ? pi : null,
          x,
          y,
          w: boxWidth(name),
          h: BOX_H,
        };
        boxes.push(box);
        byId.set(id, box);
        x += box.w + COL_GAP;
      }
      width = Math.max(width, x - COL_GAP + PAD_X);
    };
    const rowY0 = laneY + LANE_PAD_TOP;
    layRow(row0, rowY0);
    if (row1.length > 0) layRow(row1, rowY0 + BOX_H + ROW_GAP);

    // The walk's own edges: play into the first waypoint, then waypoint to waypoint. The
    // runtime walks the path POSITIONALLY, so the spine is drawn whether or not each edge is
    // authored — an authored edge lends the arrow its event name. The edge into the final
    // waypoint is stop's unless the author drew the opt-in next arrow (v1 parity).
    const authoredWalk = (from: string, to: string) =>
      group.transitions.find((t) => t.from === from && t.to === to && t.trigger !== 'data-condition');
    const walkPairs: Array<[string, string]> = [];
    if (path.length > 0 && group.initial !== path[0]) walkPairs.push([group.initial, path[0]]);
    for (let i = 0; i + 1 < path.length; i++) walkPairs.push([path[i], path[i + 1]]);
    walkPairs.forEach(([fromId, toId], wi) => {
      const from = byId.get(fromId);
      const to = byId.get(toId);
      if (!from || !to) return;
      const authored = authoredWalk(fromId, toId) ?? null;
      const intoFinal = toId === path[path.length - 1] && path.length > 1;
      const isPlay = wi === 0 && fromId === group.initial;
      const kind: Arrow['kind'] = intoFinal && !authored ? 'walk-stop' : 'walk';
      const label = isPlay ? 'play' : authored?.event ?? (intoFinal ? 'stop' : 'next');
      const r = route(from, to, 0);
      arrows.push({
        key: `${group.id}-walk-${wi}`,
        groupId: group.id,
        t: authored,
        tIndex: authored ? group.transitions.indexOf(authored) : null,
        kind,
        label,
        path: r.path,
        labelX: r.mx,
        labelY: r.my - 6,
      });
    });

    // Authored branch arrows (everything the walk didn't draw). Parallel arrows between the
    // same pair bow at increasing depths so they never overlap; a bow below the lane's LAST
    // row widens the lane so nothing clips at the dock's edge.
    const bowCount = new Map<string, number>();
    const lastRowY = row1.length > 0 ? rowY0 + BOX_H + ROW_GAP : rowY0;
    let belowDepth = 0;
    group.transitions.forEach((t, ti) => {
      if (isMain && isWalkEdge(group, t)) return;
      if (isMain && t.from === group.initial && path[0] === t.to) return; // drawn as play
      const from = byId.get(t.from);
      const to = byId.get(t.to);
      if (!from || !to) return;
      const pairKey = [t.from, t.to].sort().join('|');
      const n = bowCount.get(pairKey) ?? 0;
      bowCount.set(pairKey, n + 1);
      const self = from.id === to.id;
      const sameRow = !self && Math.abs(from.y - to.y) < 1;
      const backward = sameRow && to.x < from.x;
      const bow = self ? 0 : (backward ? -1 : 1) * (30 + 16 * n);
      if (sameRow && bow > 0 && Math.abs(from.y - lastRowY) < 1) {
        belowDepth = Math.max(belowDepth, bow + 20);
      }
      const r = route(from, to, bow);
      const kind: Arrow['kind'] = t.trigger === 'operator' ? 'operator' : t.trigger === 'timer' ? 'timer' : 'reserved';
      const label =
        t.trigger === 'operator' ? (t.event ?? '') : t.trigger === 'timer' ? `⏱ ${t.after ?? 0}s` : 'reserved';
      arrows.push({
        key: `${group.id}-t-${ti}`,
        groupId: group.id,
        t,
        tIndex: ti,
        kind,
        label,
        path: r.path,
        labelX: r.mx,
        // Same-row bows label outside the curve; cross-row parallels stagger vertically.
        labelY: self ? r.my - 10 : sameRow ? r.my + (bow < 0 ? -6 : 12) : r.my - 4 + n * 14,
      });
    });

    const laneH =
      LANE_PAD_TOP +
      BOX_H +
      (row1.length > 0 ? ROW_GAP + BOX_H : 0) +
      Math.max(LANE_PAD_BOTTOM, belowDepth);
    lanes.push({ group, y: laneY, h: laneH });
    laneY += laneH;
  });

  return { boxes, arrows, lanes, width: Math.max(width, 320), height: laneY };
}

const ARROW_CLASS: Record<Arrow['kind'], string> = {
  walk: 'mg-arrow-walk',
  'walk-stop': 'mg-arrow-walk mg-arrow-stop',
  operator: 'mg-arrow-op',
  timer: 'mg-arrow-timer',
  reserved: 'mg-arrow-reserved',
};

interface Props {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  data: AnimData;
  /** Open the step timeline parked at a default-path state's step (the dock swaps surface). */
  onOpenStep: (stepIndex: number) => void;
}

type Selection =
  | { kind: 'state'; groupId: string; id: string }
  | { kind: 'arrow'; groupId: string; tIndex: number }
  | null;

/** The machine graph (Phase 4). Click a state to SNAP the preview there — instant, parked
 *  (no timers), exactly the schema's "preview without playback" — and to inspect it; click
 *  an authored arrow to inspect and edit the transition (trigger, event, timer delay). A
 *  DERIVED machine is read-only: its graph is a description of the steps, and editing it
 *  first materializes an explicit machine (a later step of the phase). */
export default function MachineGraph({ iframeRef, data, onOpenStep }: Props) {
  const template = useTemplateStore((s) => s.template);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const sendSnap = useTemplateStore((s) => s.sendSnap);
  const model = useMemo(() => buildModel(data), [data]);
  const derived = !data.machine;

  const [sel, setSel] = useState<Selection>(null);
  // A structural change can invalidate the selection (an arrow index past the end, a state
  // gone) — drop it rather than pointing the card at the wrong thing.
  useEffect(() => {
    setSel((s) => {
      if (!s) return s;
      const group = (data.machine ?? deriveMachine(data)).groups.find((g) => g.id === s.groupId);
      if (!group) return null;
      if (s.kind === 'state') return group.states.some((st) => st.id === s.id) ? s : null;
      return s.tIndex < group.transitions.length ? s : null;
    });
  }, [data]);

  /** Make a machine edit real: the ONE undoable apply through the pairing-rule writer. */
  const applyData = (next: AnimData | null) => {
    if (!next) return false;
    const js = writeAnimData(template.js, next);
    if (!js) return false;
    applyTemplate({ ...template, js });
    return true;
  };

  // The live current-state pointers — the same cheap poll the simulator's chip uses (the
  // sandboxed iframe has no subscription surface). null until the runtime answers, which
  // also tells us whether snap-on-click can work (a saved template's frozen interpreter may
  // predate the machine engine — the graph still renders, clicks just don't snap).
  const [current, setCurrent] = useState<Record<string, string> | null>(null);
  const currentRef = useRef(current);
  currentRef.current = current;
  useEffect(() => {
    const tick = () => {
      const w = iframeRef.current?.contentWindow as SpxWindow | null;
      const state = w?.noacgMachineState?.();
      const next = state ? state.groups : null;
      const prev = currentRef.current;
      if (JSON.stringify(next) !== JSON.stringify(prev)) setCurrent(next);
    };
    tick();
    const handle = setInterval(tick, 500);
    return () => clearInterval(handle);
  }, [iframeRef, data]);

  const selectState = (box: StateBox) => {
    setSel({ kind: 'state', groupId: box.groupId, id: box.id });
    if (current) sendSnap({ [box.groupId]: box.id }); // no machine runtime → inspect only
  };

  const selectedBox =
    sel?.kind === 'state' ? model.boxes.find((b) => b.groupId === sel.groupId && b.id === sel.id) ?? null : null;
  const selectedArrow =
    sel?.kind === 'arrow'
      ? model.arrows.find((a) => a.groupId === sel.groupId && a.tIndex === sel.tIndex) ?? null
      : null;

  return (
    <div className="machine-graph" data-testid="machine-graph">
      <div
        className="mg-canvas"
        style={{ width: model.width, height: model.height }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) setSel(null); // empty canvas clears, like the stage
        }}
      >
        <svg className="mg-wires" width={model.width} height={model.height}>
          <defs>
            <marker id="mg-head-walk" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 z" className="mg-head-walk" />
            </marker>
            <marker id="mg-head-dim" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 z" className="mg-head-dim" />
            </marker>
          </defs>
          {model.lanes.length > 1 &&
            model.lanes.slice(1).map((lane) => (
              <line key={lane.group.id} x1="0" y1={lane.y} x2={model.width} y2={lane.y} className="mg-lane-line" />
            ))}
          {model.arrows.map((a) => {
            const selectable = !derived && a.tIndex !== null;
            const isSel = selectedArrow === a;
            return (
              <g key={a.key} className={`${ARROW_CLASS[a.kind]}${isSel ? ' mg-arrow-selected' : ''}`}>
                <path
                  d={a.path}
                  fill="none"
                  markerEnd={`url(#${isSel || a.kind === 'walk' || a.kind === 'walk-stop' ? 'mg-head-walk' : 'mg-head-dim'})`}
                />
                <text
                  x={a.labelX}
                  y={a.labelY}
                  textAnchor="middle"
                  className={selectable ? 'mg-label-hit' : undefined}
                  onClick={selectable ? () => setSel({ kind: 'arrow', groupId: a.groupId, tIndex: a.tIndex! }) : undefined}
                >
                  {a.label}
                </text>
                {selectable && (
                  <path
                    d={a.path}
                    fill="none"
                    className="mg-hit"
                    onClick={() => setSel({ kind: 'arrow', groupId: a.groupId, tIndex: a.tIndex! })}
                    data-testid={`mg-arrow-${a.key}`}
                  />
                )}
              </g>
            );
          })}
        </svg>
        {model.lanes.map((lane) => (
          <span key={lane.group.id} className="mg-lane-label" style={{ top: lane.y + 8 }}>
            {lane.group.id}
          </span>
        ))}
        {model.boxes.map((box) => (
          <button
            key={`${box.groupId}/${box.id}`}
            type="button"
            className={[
              'mg-state',
              box.initial ? 'mg-initial' : '',
              current && current[box.groupId] === box.id ? 'mg-current' : '',
              selectedBox === box ? 'mg-selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
            onClick={() => selectState(box)}
            title={
              current
                ? `Snap the preview to "${box.name}" — instant, no animation replay`
                : 'This preview was emitted before the machine engine — re-emit via any timeline edit to enable snapping'
            }
            data-testid={`mg-state-${box.groupId}-${box.id}`}
          >
            {box.badge && <span className="mg-badge">{box.badge}</span>}
            <span className="mg-name">{box.name}</span>
          </button>
        ))}
      </div>
      {derived && (
        <span
          className="mg-derived-chip"
          title="This template has no authored machine — the graph shown is the implicit linear walk derived from its steps (exactly what play/next/stop do)"
        >
          derived from the steps
        </span>
      )}
      {selectedBox && (
        <StateCard
          key={`${selectedBox.groupId}/${selectedBox.id}`}
          box={selectedBox}
          data={data}
          derived={derived}
          onOpenStep={onOpenStep}
          applyData={applyData}
        />
      )}
      {selectedArrow && sel?.kind === 'arrow' && (
        <TransitionCard
          key={`${sel.groupId}/${sel.tIndex}/${selectedArrow.t?.trigger}`}
          arrow={selectedArrow}
          groupId={sel.groupId}
          tIndex={sel.tIndex}
          data={data}
          applyData={applyData}
        />
      )}
    </div>
  );
}

/** The selected state's detail card: identity, what its content is, and the way into its
 *  timeline (a default-path state's step). Renaming an off-path state edits its label; a
 *  path state's name IS its step's name, renamed through the same mutator the timeline uses
 *  so the two can never fork. */
function StateCard({
  box,
  data,
  derived,
  onOpenStep,
  applyData,
}: {
  box: StateBox;
  data: AnimData;
  derived: boolean;
  onOpenStep: (stepIndex: number) => void;
  applyData: (next: AnimData | null) => boolean;
}) {
  const [name, setName] = useState(box.name);
  const commitName = () => {
    if (name.trim() === box.name || !name.trim()) {
      setName(box.name);
      return;
    }
    const next =
      box.pathIndex !== null
        ? renameStep(data, box.pathIndex, name.trim())
        : renameOffPathState(data, box.groupId, box.id, name);
    if (!applyData(next)) setName(box.name);
  };
  const content =
    box.pathIndex !== null
      ? `step ${box.pathIndex + 1} of the default path`
      : box.poseOnly
        ? 'pose only — entering plays nothing'
        : 'its own inline timeline';
  return (
    <div className="mg-card" data-testid="mg-state-card">
      <div className="mg-card-title">
        {box.badge && <span className="mg-badge">{box.badge}</span>} State
      </div>
      {derived ? (
        <div className="mg-card-name">{box.name}</div>
      ) : (
        <input
          className="mg-card-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setName(box.name);
          }}
          data-testid="mg-state-name"
        />
      )}
      <div className="mg-card-row">{content}</div>
      {box.initial && <div className="mg-card-row">the rest state (off air, and after reset)</div>}
      {box.pathIndex !== null && (
        <button type="button" className="mg-card-action" onClick={() => onOpenStep(box.pathIndex!)} data-testid="mg-open-step">
          ≡ Open its timeline
        </button>
      )}
    </div>
  );
}

/** The selected transition's card — the arrow's own settings. Trigger, the operator event
 *  name, and a timer's delay edit here (each commit is ONE undoable apply); the reserved
 *  style fields arrive with the transition-styles step of the phase. */
function TransitionCard({
  arrow,
  groupId,
  tIndex,
  data,
  applyData,
}: {
  arrow: Arrow;
  groupId: string;
  tIndex: number;
  data: AnimData;
  applyData: (next: AnimData | null) => boolean;
}) {
  const t = arrow.t!;
  const [event, setEvent] = useState(t.event ?? '');
  const [after, setAfter] = useState(String(t.after ?? ''));
  const commitEvent = () => {
    if (event.trim() === (t.event ?? '')) return;
    if (!applyData(setTransitionEvent(data, groupId, tIndex, event))) setEvent(t.event ?? '');
  };
  const commitAfter = () => {
    const n = Number(after);
    if (n === t.after) return;
    if (!(n > 0) || !applyData(setTransitionAfter(data, groupId, tIndex, n))) setAfter(String(t.after ?? ''));
  };
  return (
    <div className="mg-card" data-testid="mg-transition-card">
      <div className="mg-card-title">Transition</div>
      <div className="mg-card-name mono">
        {t.from} → {t.to}
      </div>
      {t.trigger === 'data-condition' ? (
        <div className="mg-card-row">reserved data-condition trigger — it never fires in this version</div>
      ) : (
        <>
          <label className="mg-card-row">
            fires on
            <select
              value={t.trigger}
              onChange={(e) => applyData(setTransitionTrigger(data, groupId, tIndex, e.target.value as 'operator' | 'timer'))}
              data-testid="mg-trigger"
            >
              <option value="operator">operator event</option>
              <option value="timer">timer</option>
            </select>
          </label>
          {t.trigger === 'operator' && (
            <label className="mg-card-row">
              event
              <input
                className="mg-card-input mono"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                onBlur={commitEvent}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') setEvent(t.event ?? '');
                }}
                data-testid="mg-event"
              />
            </label>
          )}
          {t.trigger === 'timer' && (
            <label className="mg-card-row">
              after (s)
              <input
                className="mg-card-input mono"
                type="number"
                min="0.1"
                step="0.1"
                value={after}
                onChange={(e) => setAfter(e.target.value)}
                onBlur={commitAfter}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') setAfter(String(t.after ?? ''));
                }}
                data-testid="mg-after"
              />
            </label>
          )}
        </>
      )}
    </div>
  );
}
