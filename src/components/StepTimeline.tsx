import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { parseAnimData, type AnimData } from '../blocks/animData';
import { importAnimData } from '../blocks/animImport';
import { stepSeconds } from '../blocks/animEval';
import { getTemplateParts } from '../model/structure';
import { loadPrefs, savePrefs } from '../model/prefs';
import TimelineView from './TimelineView';
import type { SpxWindow } from './PlayoutSimulator';

// Timeline v2 Phase 3 (docs/TIMELINE_V2_PLAN.md) — the step timeline, read-first.
// A familiar clip-style timeline where the clips are the graphic's STEPS: a time ruler
// with the operator's cue markers at every boundary (▶ play · » next presses · the hold
// wait · ■ stop), a draggable playhead that scrubs the real preview, one row per layer
// with aggregate keyframe diamonds, and zoom. Rendering only — editing arms in later
// phases. Opt-in via the dock toggle below; templates without readable animation data
// keep the classic strip.

const RULER_H = 18;
const CLIPS_H = 24;
const ROW_H = 20;
const HOLD_PX = 26; // the un-clocked hold break (manual/none) — a fixed visual pause

interface Props {
  iframeRef: RefObject<HTMLIFrameElement>;
}

/** The dock: the classic strip and the v2 timeline share the slot under the preview;
 *  the corner chip switches (persisted). V2 needs readable data — otherwise the classic
 *  strip keeps its honest legacy behavior (banner / no strip). */
export default function TimelineDock({ iframeRef }: Props) {
  const template = useTemplateStore((s) => s.template);
  const [v2, setV2] = useState<boolean>(() => loadPrefs().timelineV2);
  const data = useMemo(() => parseAnimData(template.js) ?? importAnimData(template), [template]);
  const toggle = () => {
    savePrefs({ timelineV2: !v2 });
    setV2(!v2);
  };
  return (
    <div className="timeline-dock">
      {v2 && data ? <StepTimeline iframeRef={iframeRef} data={data} /> : <TimelineView iframeRef={iframeRef} />}
      {data && (
        <button
          className="timeline-dock-toggle"
          onClick={toggle}
          title={v2 ? 'Back to the classic strip' : 'Try the new step timeline (in progress — read view for now)'}
          data-testid="timeline-v2-toggle"
        >
          {v2 ? '⧉ classic strip' : '⧉ new timeline'}
        </button>
      )}
    </div>
  );
}

/** Map a step index onto the simulator scrub protocol's phase ids. */
function phaseIdOf(data: AnimData, stepIndex: number): string {
  if (stepIndex === 0) return 'in';
  if (stepIndex === data.steps.length - 1) return 'out';
  return `step-${stepIndex + 1}`;
}

function StepTimeline({ iframeRef, data }: Props & { data: AnimData }) {
  const template = useTemplateStore((s) => s.template);
  const sendScrub = useTemplateStore((s) => s.sendScrub);
  const selectedPart = useTemplateStore((s) => s.selectedPart);
  const setSelectedPart = useTemplateStore((s) => s.setSelectedPart);

  const parts = useMemo(
    () => getTemplateParts(template.html, template.fields),
    [template.html, template.fields],
  );

  // ── Geometry: steps side by side (each on its real local clock), the hold between the
  //    last content step and Out — a real segment when auto-out gives it a duration.
  const [pxPerSec, setPxPerSec] = useState(140);
  const outMs = /^\d+$/.test(template.settings.out ?? '') ? Number(template.settings.out) : null;
  const holdW = outMs !== null ? Math.max(HOLD_PX, (outMs / 1000) * pxPerSec) : HOLD_PX;
  const segs = useMemo(() => {
    let x = 0;
    return data.steps.map((step, i) => {
      const isOut = i === data.steps.length - 1;
      if (isOut) x += holdW; // the hold sits just before Out
      const w = Math.max(56, stepSeconds(data, i) * pxPerSec);
      const seg = { step, i, isOut, x, w, holdX: isOut ? x - holdW : null };
      x += w;
      return seg;
    });
  }, [data, pxPerSec, holdW]);
  const canvasW = segs.length ? segs[segs.length - 1].x + segs[segs.length - 1].w : 0;

  // Fit the whole playout once per template (the zoom buttons take over from there).
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fittedRef = useRef<string | null>(null);
  useEffect(() => {
    if (fittedRef.current === template.name) return;
    const el = scrollRef.current;
    if (!el || el.clientWidth < 120) return;
    const totalSec = data.steps.reduce((a, _s, i) => a + stepSeconds(data, i), 0);
    fittedRef.current = template.name;
    setPxPerSec(Math.min(400, Math.max(40, (el.clientWidth - HOLD_PX - 12) / Math.max(0.5, totalSec))));
  }, [data, template.name]);

  // ── The playhead: (stepIndex, localT in effective seconds). Clicking/dragging anywhere
  //    on the ruler or rows moves it and PAUSES the preview there (no undo history — this
  //    never touches the template).
  const [head, setHead] = useState<{ step: number; t: number }>({ step: 0, t: stepSeconds(data, 0) });
  const [scrubbing, setScrubbing] = useState(false);
  const scrubbingRef = useRef(false);
  scrubbingRef.current = scrubbing;

  const headX = (() => {
    const seg = segs[head.step];
    return seg ? seg.x + Math.min(head.t, stepSeconds(data, seg.i)) * pxPerSec : 0;
  })();

  const xToPlace = (px: number): { step: number; t: number } | null => {
    for (const seg of segs) {
      if (seg.holdX !== null && px >= seg.holdX && px < seg.x) return { step: seg.i - 1, t: stepSeconds(data, seg.i - 1) };
      if (px >= seg.x && px < seg.x + seg.w) {
        return { step: seg.i, t: Math.min((px - seg.x) / pxPerSec, stepSeconds(data, seg.i)) };
      }
    }
    return px >= canvasW ? { step: data.steps.length - 1, t: stepSeconds(data, data.steps.length - 1) } : null;
  };

  const scrubTo = (place: { step: number; t: number }) => {
    setHead(place);
    setScrubbing(true);
    sendScrub(phaseIdOf(data, place.step), place.t);
  };

  const onCanvasPointer = (e: React.PointerEvent, drag = false) => {
    if (drag && e.buttons !== 1) return;
    // The canvas element scrolls WITH its content, so client-to-canvas is one subtraction.
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const place = xToPlace(e.clientX - rect.left);
    if (place) scrubTo(place);
  };

  // Live follow: the simulator's running timeline reclaims the playhead from a scrub.
  const lastActiveRef = useRef<unknown>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const w = iframeRef.current?.contentWindow as SpxWindow | null;
      const active = w?.__activeTl;
      if (active && active !== lastActiveRef.current) {
        lastActiveRef.current = active;
        setScrubbing(false);
      }
      if (!active) lastActiveRef.current = null;
      if (scrubbingRef.current) return;
      if (active) {
        const idx =
          active.phase === 'in' ? 0
          : active.phase === 'out' ? data.steps.length - 1
          : active.phase.startsWith('step-') ? parseInt(active.phase.slice(5), 10) - 1
          : 0;
        if (idx >= 0 && idx < data.steps.length) setHead({ step: idx, t: active.tl.time() });
      } else {
        setHead({ step: 0, t: stepSeconds(data, 0) }); // idle = the settled entrance end
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data, iframeRef]);

  // ── Rows: registry layers that animate or reveal anywhere in the data.
  const rows = useMemo(() => {
    const active = new Set<string>();
    for (const step of data.steps) {
      Object.keys(step.layers).forEach((s) => active.add(s));
      (step.reveals ?? []).forEach((s) => active.add(s));
    }
    active.delete(data.root);
    const ordered = parts.filter((p) => active.has(p.selector)).map((p) => ({ key: p.selector, label: p.label }));
    for (const key of active) if (!ordered.some((r) => r.key === key)) ordered.push({ key, label: key });
    return ordered;
  }, [data, parts]);

  /** Aggregate keyframe diamonds for one layer: the union of keyframe times across props,
   *  per step (one diamond may stand for several properties — the Inspector splits them). */
  const diamondsFor = (key: string): { x: number; n: number }[] => {
    const out: { x: number; n: number }[] = [];
    for (const seg of segs) {
      const tracks = seg.step.layers[key];
      if (!tracks) continue;
      const byTime = new Map<number, number>();
      for (const kfs of Object.values(tracks)) {
        for (const kf of kfs) {
          const t = Math.round((kf.time / (data.speed || 1)) * 1000) / 1000;
          byTime.set(t, (byTime.get(t) ?? 0) + 1);
        }
      }
      for (const [t, n] of byTime) out.push({ x: seg.x + t * pxPerSec, n });
    }
    return out;
  };

  const cueOf = (seg: (typeof segs)[number]) => (seg.i === 0 ? '▶' : seg.isOut ? '■' : '»');

  return (
    <div className="timeline-strip tlv2" data-testid="timeline-v2">
      <div className="tlv2-body">
        {/* Left: layer names — the shared-selection handles, same as the classic strip. */}
        <div className="tlv2-labels">
          <div style={{ height: RULER_H + CLIPS_H }} aria-hidden="true" />
          {rows.map((r) => (
            <span
              key={r.key}
              className={`timeline-label clickable${selectedPart === r.key ? ' selected' : ''}`}
              data-part={r.key}
              title={`${r.key} — click to select this element (on the canvas too)`}
              style={{ height: ROW_H, lineHeight: `${ROW_H}px` }}
              onClick={() => setSelectedPart(selectedPart === r.key ? null : r.key)}
            >
              {r.label}
            </span>
          ))}
        </div>

        <div className="tlv2-scroll" ref={scrollRef}>
          <div
            className="tlv2-canvas"
            style={{ width: canvasW, height: RULER_H + CLIPS_H + rows.length * ROW_H }}
            onPointerDown={(e) => onCanvasPointer(e)}
            onPointerMove={(e) => onCanvasPointer(e, true)}
            data-testid="tlv2-canvas"
          >
            {/* The time ruler — each step's local seconds (steps wait for cues between). */}
            <div className="tlv2-ruler" style={{ height: RULER_H }}>
              {segs.map((seg) => {
                const ticks: number[] = [];
                for (let t = 0; t <= stepSeconds(data, seg.i) + 0.001; t += 0.5) ticks.push(t);
                return ticks.map((t) => (
                  <span
                    key={`${seg.i}-${t}`}
                    className={`tlv2-tick${t % 1 === 0 ? ' whole' : ''}`}
                    style={{ left: seg.x + t * pxPerSec }}
                  >
                    {pxPerSec > 70 || t % 1 === 0 ? `${t.toFixed(1).replace(/\.0$/, '')}s` : ''}
                  </span>
                ));
              })}
            </div>

            {/* The step clips, with the operator's cue at every boundary. */}
            <div className="tlv2-clips" style={{ top: RULER_H, height: CLIPS_H }}>
              {segs.map((seg) => (
                <span key={seg.i} style={{ display: 'contents' }}>
                  {seg.holdX !== null && (
                    <span
                      className="tlv2-hold"
                      style={{ left: seg.holdX, width: seg.x - seg.holdX }}
                      title={
                        outMs !== null
                          ? `The hold — on air for ${outMs} ms, then the graphic leaves by itself`
                          : 'The hold — the graphic sits on air until the ■ Stop cue'
                      }
                      data-testid="tlv2-hold"
                    >
                      ●
                    </span>
                  )}
                  <span
                    className={`tlv2-clip${head.step === seg.i ? ' active' : ''}`}
                    style={{ left: seg.x, width: seg.w }}
                    title={
                      seg.i === 0
                        ? 'Plays on ▶ Play'
                        : seg.isOut
                          ? 'Plays on ■ Stop'
                          : `Plays on press ${seg.i} of » Next`
                    }
                    data-testid={`tlv2-clip-${seg.i}`}
                  >
                    <span className="tlv2-cue">{cueOf(seg)}</span> {seg.step.name}
                    <span className="tlv2-clip-dur"> {stepSeconds(data, seg.i).toFixed(2)}s</span>
                  </span>
                </span>
              ))}
            </div>

            {/* Layer rows with aggregate keyframe diamonds. */}
            {rows.map((r, ri) => (
              <div
                key={r.key}
                className={`tlv2-row${selectedPart === r.key ? ' selected' : ''}`}
                style={{ top: RULER_H + CLIPS_H + ri * ROW_H, height: ROW_H }}
              >
                {segs.map((seg) =>
                  seg.step.reveals?.includes(r.key) ? (
                    <span key={`rv-${seg.i}`} className="tlv2-reveal" style={{ left: seg.x + 2 }} title="This layer first appears in this step">
                      ▸
                    </span>
                  ) : null,
                )}
                {diamondsFor(r.key).map((d, di) => (
                  <span
                    key={di}
                    className="tlv2-diamond"
                    style={{ left: d.x }}
                    title={d.n > 1 ? `${d.n} property keyframes` : 'keyframe'}
                    data-testid={`tlv2-kf-${r.key.replace(/[^\w-]/g, '')}`}
                  >
                    ◆
                  </span>
                ))}
              </div>
            ))}

            {/* The playhead — spans ruler to rows; drag it, or click anywhere to move it. */}
            <div className="tlv2-playhead" style={{ left: headX }} data-testid="tlv2-playhead" />
          </div>
        </div>

        {/* Zoom — buttons now; Ctrl+wheel arrives with the editing phases. */}
        <div className="tlv2-side">
          <button className="timeline-zoom-btn" onClick={() => setPxPerSec((z) => Math.max(40, z / 1.3))} title="Zoom out" data-testid="tlv2-zoom-out">−</button>
          <button className="timeline-zoom-btn" onClick={() => setPxPerSec((z) => Math.min(400, z * 1.3))} title="Zoom in" data-testid="tlv2-zoom-in">+</button>
          <span className="tlv2-time mono" data-testid="tlv2-time">{head.t.toFixed(2)}s</span>
        </div>
      </div>
    </div>
  );
}
