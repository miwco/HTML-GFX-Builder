import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { detectPrefix } from '../model/structure';
import { parseAnimData } from '../blocks/animData';
import { canonicalPath, deriveMachine, machineControls } from '../blocks/animMachine';
import { parseStatePhase } from '../blocks/timelineLens';
import { eventLegality, isEventLegal } from '../control/controlModel';

interface Props {
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

type GsapTimeline = {
  pause: (t?: number) => void;
  /** suppressEvents=true jumps without firing callbacks (clocks/loops stay idle). */
  progress: (p: number, suppressEvents?: boolean) => void;
  duration: () => number;
  time: () => number;
  kill: () => void;
};
export type SpxWindow = Window & {
  play?: () => void;
  stop?: () => void;
  next?: () => void;
  update?: (data: string) => void;
  gsap?: {
    killTweensOf: (target: string) => void;
    set: (targets: unknown, vars: Record<string, unknown>) => void;
    /** Read a live transform channel (the canvas keyframe drag samples x/y with it). */
    getProperty?: (target: unknown, prop: string) => number | string;
  };
  buildInTimeline?: () => GsapTimeline;
  buildOutTimeline?: () => GsapTimeline;
  /** Steps templates: reveal the next Continue line; returns the tween (null when done). */
  revealNextStep?: () => GsapTimeline | null;
  /** State machine (v2 interpreter): dispatch one operator event through the serial queue. */
  noacgDispatch?: (event: string, payload?: Record<string, string>) => GsapTimeline | null;
  /** State machine: snap to states instantly ({group: state}; null = all to initial). */
  noacgSnap?: (
    assignments: Record<string, string> | null,
    opts?: { timers?: boolean },
  ) => { groups: Record<string, string> };
  /** State machine: the current state pointers (the event strip's chip reads it). */
  noacgMachineState?: () => { groups: Record<string, string> };
  /** State machine: the machine the interpreter is running (groups, for the lookups below). */
  noacgMachine?: { groups: Array<{ id: string }> };
  /** State machine: the timeline a state plays when ENTERED — a path waypoint's positional
   *  step, or a branch state's own inline one. The branch scrub builds this and pauses it,
   *  so the editor previews a branch through the runtime's own recipe, never a second one. */
  noacgEnterTimeline?: (group: { id: string }, stateId: string) => GsapTimeline | null;
  /** The timeline the simulator is currently running (drives the timeline strip's playhead).
   *  Phase: 'in' | 'out' | 'step-N' (N = the 2-based Continue step). */
  __activeTl?: { phase: string; tl: GsapTimeline } | null;
  /** The timeline view's paused scrub timeline — rebuilt per phase. */
  __scrubTl?: { phase: string; tl: GsapTimeline } | null;
};

// The preview rebuilds on a ~350 ms debounce after an apply — replay after it settles.
const REPLAY_AFTER_REBUILD_MS = 550;

/** Kill whatever the simulator started (timelines own object-target tweens too, which a
 *  plain killTweensOf('*') would miss — same reasoning as the infographics runtime). */
function killAll(w: SpxWindow) {
  w.__activeTl?.tl.kill();
  w.__scrubTl?.tl.kill();
  w.__activeTl = null;
  w.__scrubTl = null;
  w.gsap?.killTweensOf('*');
}

/**
 * Which state a branch is entered FROM, for the branch scrub's opening pose. Read off the
 * editor's own graph seam (animMachine `canonicalPath`), which the interpreter's
 * `noacgCanonicalPath` mirrors — so the pose the editor composes is the pose the runtime
 * would. `from` falls back to the group's initial when nothing reaches the state.
 */
function branchRoute(groupId: string, stateId: string): { from: string } {
  const data = parseAnimData(useTemplateStore.getState().template.js);
  const machine = data?.machine ?? (data ? deriveMachine(data) : null);
  const gi = machine?.groups.findIndex((g) => g.id === groupId) ?? -1;
  const group = gi >= 0 ? machine!.groups[gi] : null;
  if (!group) return { from: stateId };
  const route = canonicalPath(group, gi === 0, stateId);
  // route excludes the initial state, so its second-to-last entry is the predecessor.
  return { from: route && route.length > 1 ? route[route.length - 2] : group.initial };
}

/** Return the graphic to its clean CSS resting state before a fresh entrance. An exit can
 *  leave inline props the next entrance never resets — most visibly when the phases are a
 *  mix (a Blur exit leaves filter:blur on the box; a Slide entrance never touches filter,
 *  so the replay starts already blurred). Clearing GSAP's inline props on the root subtree
 *  reverts every leaked property to the stylesheet, and the in-timeline's fromTo calls
 *  re-establish their own starting state from there. clearProps only removes properties
 *  GSAP itself set, so update()-written text and inline widths are untouched. */
function resetGraphic(w: SpxWindow) {
  if (!w.gsap) return;
  const prefix = detectPrefix(useTemplateStore.getState().template.html);
  if (!prefix) return;
  const root = w.document.querySelector('.' + prefix);
  if (!root) return;
  w.gsap.set([root, ...root.querySelectorAll('*')], { clearProps: 'all' });
}

/**
 * Simulate SPX playout on the live preview. The simulator OWNS the running timeline
 * (window.__activeTl) so the timeline strip can draw a live playhead; templates without the
 * builder contract (blank/imported) fall back to the plain play()/stop() globals.
 *
 * Design view: after every rebuild the graphic is shown SETTLED (entrance jumped to its end
 * with callbacks suppressed, so countdowns/loops stay idle) — the canvas is never blank, and
 * dragging / inline editing always has something visible to work on.
 */
export default function PlayoutSimulator({ iframeRef }: Props) {
  const sampleData = useTemplateStore((s) => s.sampleData);
  const replayNonce = useTemplateStore((s) => s.replayNonce);
  const controlCommand = useTemplateStore((s) => s.controlCommand);
  const scrubCommand = useTemplateStore((s) => s.scrubCommand);
  const templateJs = useTemplateStore((s) => s.template.js);
  const sendEvent = useTemplateStore((s) => s.sendEvent);

  // The EVENT STRIP: one button per authored operator event plus a current-state chip — only
  // when the template carries an EXPLICIT machine, so ordinary templates see zero change.
  // Buttons wear the machine's declared control labels (Phase 5) when it carries any.
  const machineEvents = useMemo(() => {
    const data = parseAnimData(templateJs);
    return data?.machine ? machineControls(data.machine) : null;
  }, [templateJs]);
  // Which states each event fires from — the structural guard, mirrored as greying exactly
  // the way a generated control page mirrors it. Without this the strip took every press and
  // silently dropped the illegal ones, so "Select answer" after "Lock it in" looked broken
  // rather than impossible.
  const eventLegal = useMemo(() => eventLegality(templateJs), [templateJs]);
  const [machineState, setMachineState] = useState('');
  // The machine's raw pointers go to the STORE, not to local state: the simulator owns the
  // iframe and is the only thing that can poll it, but the Control panel shows the same event
  // buttons and has to grey them by the same rule.
  const machineGroups = useTemplateStore((s) => s.machineGroups);
  const setMachineGroups = useTemplateStore((s) => s.setMachineGroups);

  const win = (): SpxWindow | null => (iframeRef.current?.contentWindow as SpxWindow) ?? null;

  const latestData = () => JSON.stringify(useTemplateStore.getState().sampleData);

  const sendUpdate = () => {
    const w = win();
    if (w && typeof w.update === 'function') w.update(JSON.stringify(sampleData));
  };

  // Which Continue press we are on (1 = the entrance) — drives the step playhead phase ids.
  const stepRef = useRef(1);
  // A pending auto-out timer (the SPX `out` = N ms setting): the graphic leaves by itself
  // after the hold. Any manual play/stop/next/scrub or a rebuild-replay cancels it.
  const autoOutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAutoOut = () => {
    if (autoOutRef.current) clearTimeout(autoOutRef.current);
    autoOutRef.current = null;
  };

  /** Schedule the automatic exit when the template's `out` setting is a millisecond value:
   *  the graphic holds for that long AFTER the entrance settles, then plays out — the same
   *  "play in → hold → play out" the ● On air card promises, made real in the preview. */
  const scheduleAutoOut = (inDurationMs: number) => {
    clearAutoOut();
    const out = useTemplateStore.getState().template.settings.out ?? '';
    if (!/^\d+$/.test(out)) return; // 'manual' (until Stop) or 'none' (stays) — no timer
    autoOutRef.current = setTimeout(() => playOut(), inDurationMs + Number(out));
  };

  /** An entrance that never ends (a marquee's `repeat: -1`, any measured endless motion) is
   *  reported by GSAP as a ~1e10 s duration. Passed on as a delay, that is 1e13 ms — past
   *  setTimeout's 32-bit argument, so it wraps to an arbitrary time (~15 days, measured) and
   *  the exit never comes: the SPX `out` hold was silently dead on every endless graphic, which
   *  is exactly the class of setting an operator trusts. A continuous phase costs no fixed
   *  time, so the hold runs from the entrance's start instead. Same threshold the render
   *  schedule uses (src/render/runtimeScript.ts CONTINUOUS_S), for the same reason. */
  const CONTINUOUS_S = 1e7;
  const holdBaselineMs = (tl: { duration: () => number }) => {
    const seconds = tl.duration();
    return seconds >= CONTINUOUS_S ? 0 : seconds * 1000;
  };

  /** Run the entrance (Play): data in, then the in-timeline — simulator-owned. */
  const playIn = () => {
    const w = win();
    if (!w) return;
    stepRef.current = 1; // a fresh play restarts the Continue chain
    clearAutoOut();
    if (typeof w.buildInTimeline === 'function') {
      killAll(w);
      resetGraphic(w); // wipe any inline props a prior exit left, so the entrance is clean
      w.update?.(latestData());
      const tl = w.buildInTimeline();
      w.__activeTl = { phase: 'in', tl };
      scheduleAutoOut(holdBaselineMs(tl));
    } else {
      w.update?.(latestData());
      w.play?.(); // no builder contract (blank/imported) — the template's own play()
    }
  };

  /** Advance a Continue step (Next) — own the reveal tween so the playhead follows it. */
  const playNext = () => {
    const w = win();
    if (!w) return;
    clearAutoOut(); // the operator is driving the reveal chain — don't auto-leave under them
    if (typeof w.revealNextStep === 'function') {
      const tw = w.revealNextStep();
      if (tw) {
        stepRef.current += 1;
        w.__activeTl = { phase: `step-${stepRef.current}`, tl: tw };
      }
    } else {
      w.next?.(); // no builder contract (blank/imported/hand-written) — the template's own next()
    }
  };

  /** Run the exit (Stop) — simulator-owned. */
  const playOut = () => {
    const w = win();
    if (!w) return;
    clearAutoOut();
    if (typeof w.buildOutTimeline === 'function') {
      killAll(w);
      w.__activeTl = { phase: 'out', tl: w.buildOutTimeline() };
    } else {
      w.stop?.();
    }
  };

  /** Design view: show the settled on-air state without animating or firing callbacks. */
  const settle = () => {
    const w = win() as (SpxWindow & { __settled?: boolean }) | null;
    if (!w || typeof w.buildInTimeline !== 'function') return; // blank/imported: stays blank
    if (w.__activeTl || w.__scrubTl || w.__settled) return; // running, paused, or already settled
    w.__settled = true;
    resetGraphic(w); // a same-document settle after an exit must not inherit its leftovers
    w.update?.(latestData());
    const tl = w.buildInTimeline();
    tl.pause();
    tl.progress(1, true); // jump to the end; suppressed events keep clocks/loops idle
    // Suppressed callbacks skip callback-written text (e.g. count-up's final value), and the
    // jump may have rendered mid-animation text (its zeroing set()). A second update() rewrites
    // every field to its true value — rebuild-driven designs re-render truthful static states
    // (bar fills carry inline widths at their data-value).
    w.update?.(latestData());
  };

  // Settle after every iframe (re)load — the canvas always shows the graphic at rest.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => settle();
    iframe.addEventListener('load', onLoad);
    settle(); // the current document may already be loaded
    return () => iframe.removeEventListener('load', onLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iframeRef]);

  // Auto-replay: the Motion panel bumps replayNonce after an apply so the change is
  // immediately visible. Wait out the debounced preview rebuild, then play the new code.
  const playRef = useRef(playIn);
  playRef.current = playIn;
  useEffect(() => {
    if (replayNonce === 0) return;
    const handle = setTimeout(() => playRef.current(), REPLAY_AFTER_REBUILD_MS);
    return () => clearTimeout(handle);
  }, [replayNonce]);

  // Cancel any pending auto-out when the simulator unmounts (project close, route change).
  useEffect(() => () => clearAutoOut(), []);

  // Live control: the Control panel drives the preview immediately (the template hasn't
  // changed, so no rebuild wait). Routed through the same simulator-owned paths.
  useEffect(() => {
    if (!controlCommand) return;
    const w = win();
    if (!w) return;
    if (controlCommand.action === 'update') w.update?.(latestData());
    else if (controlCommand.action === 'play') playIn();
    else if (controlCommand.action === 'stop') playOut();
    else if (controlCommand.action === 'next') playNext();
    else if (controlCommand.action === 'event') {
      clearAutoOut(); // the operator is driving the machine — don't auto-leave under them
      w.noacgDispatch?.(controlCommand.event ?? '', controlCommand.payload);
    } else if (controlCommand.action === 'snap') {
      clearAutoOut();
      killAll(w); // snap owns the wipe-and-compose; drop the simulator's timeline handles
      // The preview PARKS the snapped state ({timers: false}): a design view must never
      // auto-advance under the user. Recovery-style snaps (timers armed) are the runtime's
      // default for exports and tests.
      w.noacgSnap?.(controlCommand.snap ?? null, { timers: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlCommand?.nonce]);

  // The state chip and the buttons' legality both track the machine's pointers (ONE cheap
  // poll — the machine has no subscription surface inside the sandboxed iframe, and 500 ms is
  // plenty for a readout).
  useEffect(() => {
    if (!machineEvents) return;
    const tick = () => {
      const state = win()?.noacgMachineState?.();
      if (!state) return;
      const groups = Object.entries(state.groups);
      setMachineState(groups.map(([g, s]) => (groups.length > 1 ? `${g}:${s}` : s)).join(' · '));
      setMachineGroups(state.groups);
    };
    tick();
    const handle = setInterval(tick, 500);
    return () => clearInterval(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineEvents]);

  // Timeline scrub: pause the phase's timeline at the requested time. The paused timeline is
  // cached on the preview window per phase; an iframe rebuild clears it naturally. Scrubbing
  // OUT (or a step) first jumps everything BEFORE it to its end state, callbacks suppressed —
  // that is the state the scrubbed segment animates FROM.
  useEffect(() => {
    if (!scrubCommand) return;
    const w = win();
    if (!w || typeof w.buildInTimeline !== 'function') return;
    clearAutoOut(); // parking on a scrubbed moment must not auto-leave under the user
    if (!w.__scrubTl || w.__scrubTl.phase !== scrubCommand.phase) {
      killAll(w);
      w.update?.(latestData());
      const branch = parseStatePhase(scrubCommand.phase);
      if (branch) {
        // A BRANCH state's own timeline (blocks/timelineLens.ts). Compose the pose the state
        // is entered FROM — its canonical predecessor, the same route the runtime replays —
        // then hold its entry timeline paused. Snapping is what makes the scrubbed segment
        // animate from the right look instead of from the graphic's CSS resting state; a
        // state nothing reaches has no predecessor, so it plays from the rest pose, which is
        // honest (the node editor marks that state unreachable in the same breath).
        const group = w.noacgMachine?.groups.find((g) => g.id === branch.groupId);
        if (!group || typeof w.noacgEnterTimeline !== 'function' || typeof w.noacgSnap !== 'function') return;
        const route = branchRoute(branch.groupId, branch.stateId);
        w.noacgSnap({ [branch.groupId]: route.from }, { timers: false });
        const tl = w.noacgEnterTimeline(group, branch.stateId);
        if (!tl) return;
        w.__scrubTl = { phase: scrubCommand.phase, tl };
      } else if (scrubCommand.phase === 'in') {
        w.__scrubTl = { phase: 'in', tl: w.buildInTimeline() };
      } else if (scrubCommand.phase.startsWith('step-')) {
        // Continue segment N: run the entrance + the prior steps to their ends, then hold
        // this step's reveal tween.
        if (typeof w.revealNextStep !== 'function') return;
        const n = parseInt(scrubCommand.phase.slice(5), 10); // 2-based
        w.buildInTimeline().progress(1, true);
        for (let k = 2; k < n; k++) w.revealNextStep()?.progress(1, true);
        const tw = w.revealNextStep();
        if (!tw) return;
        w.__scrubTl = { phase: scrubCommand.phase, tl: tw };
      } else {
        if (typeof w.buildOutTimeline !== 'function') return;
        w.buildInTimeline().progress(1, true); // settled on-air state, callbacks suppressed
        // On air, every Continue step has usually played — the exit leaves from that state.
        while (typeof w.revealNextStep === 'function' && w.revealNextStep()?.progress(1, true)) { /* all steps */ }
        w.__scrubTl = { phase: 'out', tl: w.buildOutTimeline() };
      }
    }
    const tl = w.__scrubTl.tl;
    tl.pause(Math.min(scrubCommand.time, tl.duration()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrubCommand?.nonce]);

  return (
    <div className="simulator">
      <button className="primary" onClick={playIn} title="Update data + play in">
        ▶ Play
      </button>
      <button onClick={playOut} title="Animate out">
        ■ Stop
      </button>
      <button onClick={sendUpdate} title="Send current sample data to update()">
        ⟳ Update
      </button>
      <button onClick={playNext} title="Advance multi-step templates (SPX Continue)">
        » Next
      </button>
      {machineEvents && machineEvents.length > 0 && (
        <div className="simulator-events" data-testid="sim-events">
          {machineEvents.map((e) => {
            const legal = isEventLegal(eventLegal, e.event, machineGroups && { groups: machineGroups });
            return (
              <button
                key={e.event}
                onClick={() => sendEvent(e.event)}
                disabled={!legal}
                title={
                  legal
                    ? `Dispatch the "${e.event}" event`
                    : `"${e.event}" has no arrow out of the current state, so the graphic would drop it`
                }
                data-testid={`sim-event-${e.event}`}
              >
                ⚡ {e.label}
              </button>
            );
          })}
          <span className="simulator-state mono" title="The machine's current state" data-testid="sim-state-chip">
            {machineState}
          </span>
        </div>
      )}
    </div>
  );
}
