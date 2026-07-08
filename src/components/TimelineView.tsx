import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { parseTimeline, patchTweenTiming } from '../blocks/timelineModel';
import { loadPrefs, savePrefs } from '../model/prefs';
import { useIsMobile } from './useIsMobile';
import type { SpxWindow } from './PlayoutSimulator';

/** A bar drag in progress (T2): move = slide the start, resize = stretch the duration. */
interface BarDrag {
  index: number;
  mode: 'move' | 'resize';
  startClientX: number;
  laneWidth: number;
  origStart: number;
  origDuration: number;
  /** Live values while dragging (committed to code on release). */
  start: number;
  duration: number;
}

const SNAP = 0.05; // timing grid — keeps the emitted literals readable (two decimals)

interface Props {
  iframeRef: RefObject<HTMLIFrameElement>;
}

/**
 * The preview timeline strip (Era 6 · T1.5 — docs/TIMELINE_PLAN.md): lives directly under
 * the preview like every animation tool, above the transport buttons. Read from the marked
 * ANIMATION region (parse-by-construction, blocks/timelineModel.ts): In/Out phase tabs, one
 * track per tween, a scrubber that pauses the preview, and a LIVE playhead that follows the
 * simulator's running timeline (▶ Play sweeps In, ■ Stop sweeps Out). The code is the truth:
 * a hand-edited region the parser doesn't recognize degrades to an honest note. Timing
 * edits are T2 — nothing here writes code.
 */
export default function TimelineView({ iframeRef }: Props) {
  const template = useTemplateStore((s) => s.template);
  const sendScrub = useTemplateStore((s) => s.sendScrub);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const requestReplay = useTemplateStore((s) => s.requestReplay);

  const model = useMemo(() => parseTimeline(template.js), [template.js]);
  const [phaseId, setPhaseId] = useState<'in' | 'out'>('in');
  const [time, setTime] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const scrubbingRef = useRef(false);
  scrubbingRef.current = scrubbing;
  // T2 bar-drag state — declared with the other hooks (BEFORE the model-null early return,
  // or templates without a parsable region would change the hook count and crash React).
  const [barDrag, setBarDrag] = useState<BarDrag | null>(null);
  const barDragRef = useRef<BarDrag | null>(null);
  barDragRef.current = barDrag;

  // Collapsed state: explicit preference wins; otherwise expanded on desktop, collapsed on phones.
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState<boolean>(() => loadPrefs().timelineCollapsed ?? isMobile);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      savePrefs({ timelineCollapsed: !c });
      return !c;
    });
  };

  // The live playhead: follow the simulator's running timeline (window.__activeTl). Parks at
  // the END of In when idle — that is the settled "design view" state the preview shows.
  const phaseRef = useRef(phaseId);
  phaseRef.current = phaseId;
  const lastActiveRef = useRef<unknown>(null);
  useEffect(() => {
    if (!model) return;
    let raf = 0;
    const inDur = model.phases.find((p) => p.id === 'in')?.duration ?? 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const w = iframeRef.current?.contentWindow as SpxWindow | null;
      const active = w?.__activeTl;
      // A NEW simulator run (Play/Stop) reclaims the playhead from a paused scrub.
      if (active && active !== lastActiveRef.current) {
        lastActiveRef.current = active;
        if (scrubbingRef.current) setScrubbing(false);
      }
      if (!active) lastActiveRef.current = null;
      if (scrubbingRef.current) return; // the user's scrub owns the playhead
      if (active) {
        if (active.phase !== phaseRef.current) setPhaseId(active.phase); // follow Play/Stop
        const dur = Math.max(active.tl.duration(), 0.001);
        setTime(active.tl.time() % (dur + 0.0001)); // loops (repeat:-1) wrap visually
      } else if (phaseRef.current === 'in') {
        setTime(inDur); // idle = settled at the end of the entrance
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [model, iframeRef]);

  if (!model) {
    return null; // hand-edited beyond recognition (or blank/imported) — the strip steps aside
  }

  const phase = model.phases.find((p) => p.id === phaseId) ?? model.phases[0];
  const total = Math.max(phase.duration, 0.001);
  const shown = Math.min(time, total);
  const frac = shown / total;

  // ── T2: draggable timing bars ──────────────────────────────────────────────
  const snap = (n: number) => Math.round(n / SNAP) * SNAP;

  const startBarDrag = (e: React.PointerEvent, index: number, mode: BarDrag['mode']) => {
    const tw = phase.tweens[index];
    if (!tw.editable) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const lane = (e.currentTarget as HTMLElement).closest('.timeline-lane') as HTMLElement;
    setBarDrag({
      index,
      mode,
      startClientX: e.clientX,
      laneWidth: lane?.getBoundingClientRect().width || 1,
      origStart: tw.start,
      origDuration: tw.duration,
      start: tw.start,
      duration: tw.duration,
    });
  };

  const moveBarDrag = (e: React.PointerEvent) => {
    const d = barDragRef.current;
    if (!d) return;
    const dxSec = ((e.clientX - d.startClientX) / d.laneWidth) * total;
    setBarDrag(
      d.mode === 'move'
        ? { ...d, start: Math.max(0, snap(d.origStart + dxSec)) }
        : { ...d, duration: Math.max(SNAP, snap(d.origDuration + dxSec)) },
    );
  };

  /** Release: rewrite the tween's timing literals in the marked region — one undoable patch. */
  const endBarDrag = () => {
    const d = barDragRef.current;
    setBarDrag(null);
    if (!d) return;
    if (d.start === d.origStart && d.duration === d.origDuration) return;
    const js = patchTweenTiming(template.js, phase.id, d.index, {
      start: d.mode === 'move' ? d.start : undefined,
      duration: d.mode === 'resize' ? d.duration : undefined,
    });
    if (!js) return; // not patchable after all — leave the code untouched
    applyTemplate({ ...template, js });
    requestReplay(); // hear the new timing immediately (plays after the rebuild settles)
  };

  const scrubTo = (raw: number) => {
    // Range steps accumulate float error and can stall one step short of the end — snap the
    // last step to the exact phase end so end-of-phase set() calls (e.g. the final hide) render.
    const t = raw >= total - 0.011 ? total : raw;
    setTime(t);
    sendScrub(phase.id, t);
  };

  const pickPhase = (id: 'in' | 'out') => {
    setPhaseId(id);
    setScrubbing(true); // manual phase pick pauses at 0 until the next Play/Stop
    setTime(0);
    sendScrub(id, 0);
  };

  const label = (targets: string[]) => targets.join(', ');

  return (
    <div className={`timeline-strip${collapsed ? ' collapsed' : ''}`} data-testid="timeline">
      <div className="timeline-head">
        <button className="timeline-collapse" onClick={toggleCollapsed} title={collapsed ? 'Expand the timeline' : 'Collapse the timeline'}>
          {collapsed ? '▸' : '▾'}
        </button>
        {model.phases.map((p) => (
          <button
            key={p.id}
            className={`tab ${p.id === phase.id ? 'active' : ''}`}
            onClick={() => pickPhase(p.id)}
          >
            {p.label} {p.infinite ? '∞' : `${p.duration.toFixed(2)}s`}
          </button>
        ))}
        <input
          className="grow timeline-scrub"
          type="range"
          min={0}
          max={total}
          step={0.01}
          value={shown}
          onPointerDown={() => setScrubbing(true)}
          onChange={(e) => scrubTo(Number(e.target.value))}
          title="Scrub — pauses the preview at this moment (▶ Play runs it again)"
          data-testid="timeline-scrub"
        />
        <span className="mono muted timeline-time" data-testid="timeline-time">{shown.toFixed(2)}s</span>
        {!collapsed && (
          <span className="hint timeline-knobs">×{model.animSpeed} · {model.easeIn} / {model.easeOut}</span>
        )}
      </div>

      {!collapsed && (
        <div className="timeline-tracks">
          {phase.tweens.map((tw, i) => {
            // While a bar is being dragged, render its live values instead of the parsed ones.
            const d = barDrag?.index === i ? barDrag : null;
            const start = d ? d.start : tw.start;
            const span = d ? d.duration + tw.stagger * Math.max(0, tw.targets.length - 1) : tw.end - tw.start;
            return (
              <div className="timeline-row" key={i}>
                <span className="timeline-label" title={label(tw.targets)}>{label(tw.targets)}</span>
                <div className="timeline-lane">
                  <div
                    className={`timeline-bar ${tw.kind}${tw.editable ? ' editable' : ''}${d ? ' dragging' : ''}`}
                    style={{
                      left: `${(start / total) * 100}%`,
                      width: tw.kind === 'set' ? undefined : `${Math.max(1.5, (span / total) * 100)}%`,
                    }}
                    title={
                      tw.kind === 'set'
                        ? `set · ${tw.props.join(', ')}`
                        : `${tw.props.join(', ')} · ${(d ? start : tw.start).toFixed(2)}–${(d ? start + span : tw.end).toFixed(2)}s${tw.stagger ? ` · stagger ${tw.stagger.toFixed(2)}s` : ''}${tw.editable ? ' — drag to retime, edge to stretch' : ''}`
                    }
                    data-testid={`timeline-bar-${i}`}
                    onPointerDown={tw.editable ? (e) => startBarDrag(e, i, 'move') : undefined}
                    onPointerMove={moveBarDrag}
                    onPointerUp={endBarDrag}
                    onPointerCancel={() => setBarDrag(null)}
                  >
                    {tw.editable && tw.kind !== 'set' && (
                      <span
                        className="timeline-bar-handle"
                        data-testid={`timeline-handle-${i}`}
                        onPointerDown={(e) => startBarDrag(e, i, 'resize')}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {/* The playhead — spans the lane area (past the fixed label column). */}
          <div
            className="timeline-playhead"
            data-testid="timeline-playhead"
            style={{ left: `calc(110px + (100% - 110px) * ${frac})` }}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
