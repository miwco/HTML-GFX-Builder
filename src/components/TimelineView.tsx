import { useEffect, useRef, useState, useMemo, type RefObject } from 'react';
import { useTemplateStore } from '../store/templateStore';
import {
  parseTimeline,
  patchStepEase,
  patchStepTiming,
  patchTweenEase,
  patchTweenTiming,
} from '../blocks/timelineModel';
import { EASINGS } from '../model/easings';
import { loadPrefs, savePrefs } from '../model/prefs';
import { useIsMobile } from './useIsMobile';
import type { SpxWindow } from './PlayoutSimulator';

interface Props {
  iframeRef: RefObject<HTMLIFrameElement>;
}

/** One playout segment on the strip: the entrance, a Continue step, or the exit. */
interface Segment {
  id: string; // 'in' | 'step-N' | 'out'
  marker: string; // the playout cue glyph: ▶ » ■
  label: string;
  duration: number;
  infinite: boolean;
  kind: 'in' | 'out' | 'step';
  stepIndex?: number;
}

/** A bar drag in progress (T2/T3.2): move = slide the start, resize = stretch the duration. */
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

/** The per-tween ease options for a phase: the vocabulary's phase-correct half, deduped by
 *  the actual GSAP string (several presets share a curve), plus 'auto' (inherit the knob). */
function easeOptionsFor(direction: 'in' | 'out'): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const e of EASINGS) {
    const value = direction === 'in' ? e.gsapIn : e.gsapOut;
    if (!seen.has(value)) seen.set(value, e.tag === 'standard' ? e.name : `${e.name} ·${e.tag}`);
  }
  return [...seen.entries()].map(([value, label]) => ({ value, label }));
}

/**
 * The preview timeline strip (Era 6 — docs/TIMELINE_PLAN.md): the graphic as a playout
 * segment chain `▶ In · » 2 · » 3 · … · ■ Out`, exactly what the operator's buttons do.
 * Parsed from the marked ANIMATION region (parse-by-construction); a live playhead follows
 * the simulator's running timeline through Play, every Continue, and Stop; scrubbing pauses
 * the preview; bars drag/stretch and eases pick — each edit is ONE readable literal patch in
 * the region (undoable). A hand-edited region the parser can't read makes the strip step
 * aside — the code is the truth.
 */
export default function TimelineView({ iframeRef }: Props) {
  const template = useTemplateStore((s) => s.template);
  const sendScrub = useTemplateStore((s) => s.sendScrub);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const requestReplay = useTemplateStore((s) => s.requestReplay);

  const model = useMemo(() => parseTimeline(template.js), [template.js]);
  const [phaseId, setPhaseId] = useState<string>('in');
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

  // The live playhead: follow the simulator's running timeline (window.__activeTl) through
  // In, every Continue step, and Out. Parks at the END of In when idle — the settled state.
  const phaseRef = useRef(phaseId);
  phaseRef.current = phaseId;
  const lastActiveRef = useRef<unknown>(null);
  useEffect(() => {
    if (!model) return;
    let raf = 0;
    const inDur = model.phases.find((p) => p.id === 'in')?.duration ?? 0;
    const knownIds = new Set(['in', 'out', ...model.steps.map((_, k) => `step-${k + 2}`)]);
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const w = iframeRef.current?.contentWindow as SpxWindow | null;
      const active = w?.__activeTl;
      // A NEW simulator run (Play/Next/Stop) reclaims the playhead from a paused scrub.
      if (active && active !== lastActiveRef.current) {
        lastActiveRef.current = active;
        if (scrubbingRef.current) setScrubbing(false);
      }
      if (!active) lastActiveRef.current = null;
      if (scrubbingRef.current) return; // the user's scrub owns the playhead
      if (active) {
        if (active.phase !== phaseRef.current && knownIds.has(active.phase)) setPhaseId(active.phase);
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

  const inPhase = model.phases.find((p) => p.id === 'in') ?? model.phases[0];
  const outPhase = model.phases.find((p) => p.id === 'out') ?? model.phases[model.phases.length - 1];
  // The playout segment chain — what each operator button plays.
  const segments: Segment[] = [
    { id: 'in', marker: '▶', label: 'In', duration: inPhase.duration, infinite: inPhase.infinite, kind: 'in' },
    ...model.steps.map((s, k) => ({
      id: `step-${k + 2}`,
      marker: '»',
      label: String(k + 2),
      duration: s.duration,
      infinite: false,
      kind: 'step' as const,
      stepIndex: k,
    })),
    { id: 'out', marker: '■', label: 'Out', duration: outPhase.duration, infinite: outPhase.infinite, kind: 'out' },
  ];
  const seg = segments.find((s) => s.id === phaseId) ?? segments[0];
  const total = Math.max(seg.duration, 0.001);
  const shown = Math.min(time, total);
  const frac = shown / total;
  // How the layer leaves air (the SPX `out` setting) — playout truth next to the Out tab.
  const outMode = template.settings.out ?? 'manual';
  const outBadge = outMode === 'none' ? 'no out' : /^\d+$/.test(outMode) ? `auto ${outMode}ms` : null;

  // ── T2/T3.2: draggable timing bars ─────────────────────────────────────────
  const snap = (n: number) => Math.round(n / SNAP) * SNAP;

  const startBarDrag = (e: React.PointerEvent, index: number, mode: BarDrag['mode'], orig: { start: number; duration: number }) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const lane = (e.currentTarget as HTMLElement).closest('.timeline-lane') as HTMLElement;
    setBarDrag({
      index,
      mode,
      startClientX: e.clientX,
      laneWidth: lane?.getBoundingClientRect().width || 1,
      origStart: orig.start,
      origDuration: orig.duration,
      start: orig.start,
      duration: orig.duration,
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

  /** Release: rewrite the timing literals in the marked region — one undoable patch. */
  const endBarDrag = () => {
    const d = barDragRef.current;
    setBarDrag(null);
    if (!d) return;
    if (d.start === d.origStart && d.duration === d.origDuration) return;
    const js =
      seg.kind === 'step'
        ? patchStepTiming(template.js, seg.stepIndex!, d.duration)
        : patchTweenTiming(template.js, seg.id as 'in' | 'out', d.index, {
            start: d.mode === 'move' ? d.start : undefined,
            duration: d.mode === 'resize' ? d.duration : undefined,
          });
    if (!js) return; // not patchable after all — leave the code untouched
    applyTemplate({ ...template, js });
    requestReplay(); // hear the new timing immediately (plays after the rebuild settles)
  };

  /** T2.5/T3.2: set/clear an ease — one undoable patch + replay. */
  const pickEase = (index: number, value: string) => {
    const ease = value === 'auto' ? null : value;
    const js =
      seg.kind === 'step'
        ? patchStepEase(template.js, seg.stepIndex!, ease)
        : patchTweenEase(template.js, seg.id as 'in' | 'out', index, ease);
    if (!js || js === template.js) return;
    applyTemplate({ ...template, js });
    requestReplay();
  };
  // Cheap enough to build per render — and NO hooks may sit below the model-null return above.
  const easeOptions = easeOptionsFor(seg.kind === 'out' ? 'out' : 'in');

  const scrubTo = (raw: number) => {
    // Range steps accumulate float error and can stall one step short of the end — snap the
    // last step to the exact phase end so end-of-phase set() calls (e.g. the final hide) render.
    const t = raw >= total - 0.011 ? total : raw;
    setTime(t);
    sendScrub(seg.id, t);
  };

  const pickSegment = (id: string) => {
    setPhaseId(id);
    setScrubbing(true); // manual pick pauses at 0 until the next Play/Next/Stop
    setTime(0);
    sendScrub(id, 0);
  };

  const label = (targets: string[]) => targets.join(', ');

  /** The rows shown for the selected segment: the phase's tweens, or the step's one reveal. */
  const rows =
    seg.kind === 'step'
      ? [
          {
            targets: [model.steps[seg.stepIndex!].target],
            kind: 'to' as const,
            props: ['yPercent'],
            duration: model.steps[seg.stepIndex!].duration,
            stagger: 0,
            start: 0,
            end: model.steps[seg.stepIndex!].duration,
            editable: true,
            ease: model.steps[seg.stepIndex!].ease,
          },
        ]
      : (seg.kind === 'in' ? inPhase : outPhase).tweens;

  return (
    <div className={`timeline-strip${collapsed ? ' collapsed' : ''}`} data-testid="timeline">
      <div className="timeline-head">
        <button className="timeline-collapse" onClick={toggleCollapsed} title={collapsed ? 'Expand the timeline' : 'Collapse the timeline'}>
          {collapsed ? '▸' : '▾'}
        </button>
        {segments.map((s) => (
          <button
            key={s.id}
            className={`tab timeline-seg ${s.id === seg.id ? 'active' : ''}`}
            onClick={() => pickSegment(s.id)}
            title={
              s.kind === 'step'
                ? `Continue step ${s.label} — plays on the ${Number(s.label) - 1}${Number(s.label) === 2 ? 'st' : Number(s.label) === 3 ? 'nd' : 'th'} » Next press`
                : s.kind === 'in'
                  ? 'The entrance — plays on ▶ Play'
                  : `The exit — plays on ■ Stop${outBadge ? ` (${outBadge})` : ''}`
            }
            data-testid={`timeline-seg-${s.id}`}
          >
            <span className="timeline-marker">{s.marker}</span> {s.label} {s.infinite ? '∞' : `${s.duration.toFixed(2)}s`}
          </button>
        ))}
        {outBadge && <span className="timeline-outmode">{outBadge}</span>}
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
          {rows.map((tw, i) => {
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
                    onPointerDown={
                      tw.editable
                        ? (e) => startBarDrag(e, i, seg.kind === 'step' ? 'resize' : 'move', { start: tw.start, duration: tw.duration })
                        : undefined
                    }
                    onPointerMove={moveBarDrag}
                    onPointerUp={endBarDrag}
                    onPointerCancel={() => setBarDrag(null)}
                  >
                    {tw.editable && tw.kind !== 'set' && (
                      <span
                        className="timeline-bar-handle"
                        data-testid={`timeline-handle-${i}`}
                        onPointerDown={(e) => startBarDrag(e, i, 'resize', { start: tw.start, duration: tw.duration })}
                      />
                    )}
                  </div>
                </div>
                {/* The tween's own ease; 'auto' inherits the phase knob. */}
                {tw.editable ? (
                  <select
                    className="timeline-ease"
                    value={tw.ease ?? 'auto'}
                    onChange={(e) => pickEase(i, e.target.value)}
                    title="This line's own ease — 'auto' follows the phase's easing knob"
                    data-testid={`timeline-ease-${i}`}
                  >
                    <option value="auto">auto</option>
                    {easeOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                    {tw.ease && !easeOptions.some((o) => o.value === tw.ease) && (
                      <option value={tw.ease}>{tw.ease}</option>
                    )}
                  </select>
                ) : (
                  <span className="timeline-ease-spacer" aria-hidden="true" />
                )}
              </div>
            );
          })}
          {/* The playhead — spans the lane area (between the label and ease columns). */}
          <div
            className="timeline-playhead"
            data-testid="timeline-playhead"
            style={{ left: `calc(110px + (100% - 110px - 104px) * ${frac})` }}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
