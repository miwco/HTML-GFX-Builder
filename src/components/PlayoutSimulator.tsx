import { useEffect, useRef, type RefObject } from 'react';
import { useTemplateStore } from '../store/templateStore';

interface Props {
  iframeRef: RefObject<HTMLIFrameElement>;
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
  gsap?: { killTweensOf: (target: string) => void };
  buildInTimeline?: () => GsapTimeline;
  buildOutTimeline?: () => GsapTimeline;
  /** Steps templates: reveal the next Continue line; returns the tween (null when done). */
  revealNextStep?: () => GsapTimeline | null;
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

  const win = (): SpxWindow | null => (iframeRef.current?.contentWindow as SpxWindow) ?? null;

  const latestData = () => JSON.stringify(useTemplateStore.getState().sampleData);

  const sendUpdate = () => {
    const w = win();
    if (w && typeof w.update === 'function') w.update(JSON.stringify(sampleData));
  };

  // Which Continue press we are on (1 = the entrance) — drives the step playhead phase ids.
  const stepRef = useRef(1);

  /** Run the entrance (Play): data in, then the in-timeline — simulator-owned. */
  const playIn = () => {
    const w = win();
    if (!w) return;
    stepRef.current = 1; // a fresh play restarts the Continue chain
    w.update?.(latestData());
    if (typeof w.buildInTimeline === 'function') {
      killAll(w);
      w.__activeTl = { phase: 'in', tl: w.buildInTimeline() };
    } else {
      w.play?.(); // no builder contract (blank/imported) — the template's own play()
    }
  };

  /** Advance a Continue step (Next) — own the reveal tween so the playhead follows it. */
  const playNext = () => {
    const w = win();
    if (!w) return;
    if (typeof w.revealNextStep === 'function') {
      const tw = w.revealNextStep();
      if (tw) {
        stepRef.current += 1;
        w.__activeTl = { phase: `step-${stepRef.current}`, tl: tw };
      }
    } else {
      w.next?.(); // template-defined next (quiz reveal, …)
    }
  };

  /** Run the exit (Stop) — simulator-owned. */
  const playOut = () => {
    const w = win();
    if (!w) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlCommand?.nonce]);

  // Timeline scrub: pause the phase's timeline at the requested time. The paused timeline is
  // cached on the preview window per phase; an iframe rebuild clears it naturally. Scrubbing
  // OUT (or a step) first jumps everything BEFORE it to its end state, callbacks suppressed —
  // that is the state the scrubbed segment animates FROM.
  useEffect(() => {
    if (!scrubCommand) return;
    const w = win();
    if (!w || typeof w.buildInTimeline !== 'function') return;
    if (!w.__scrubTl || w.__scrubTl.phase !== scrubCommand.phase) {
      killAll(w);
      w.update?.(latestData());
      if (scrubCommand.phase === 'in') {
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
    </div>
  );
}
