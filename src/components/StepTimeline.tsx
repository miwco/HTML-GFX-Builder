import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { parseAnimData, spliceAnimData, type AnimData } from '../blocks/animData';
import { importAnimData } from '../blocks/animImport';
import {
  addStep,
  deleteLayerKeyframes,
  deleteStep,
  duplicateStep,
  moveLayerKeyframes,
  renameStep,
  resizeStep,
  setKeyframeEase,
  setStepEase,
} from '../blocks/animEdit';
import { EASINGS } from '../model/easings';
import { replaceRegionWithAnimData } from '../templates/shared/animRuntime';
import { stepSeconds } from '../blocks/animEval';
import { getTemplateParts } from '../model/structure';
import { replaceDefinitionInHtml } from '../model/spxDefinition';
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

// The editing scale: rows and type sized for comfortable keyframe work (the timeline is
// the primary motion surface, not a status readout — targets earn real estate).
const RULER_H = 20;
const CLIPS_H = 30;
const ROW_H = 28;
const HOLD_PX = 30; // the un-clocked hold break (manual/none) — a fixed visual pause

interface Props {
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

/** The dock: the classic strip and the v2 timeline share the slot under the preview.
 *  A template whose region IS the data block gets the step timeline outright (the classic
 *  strip's literal patchers cannot read it). Legacy templates keep the classic strip as
 *  the default editing surface, with the v2 read view one chip away — and from there,
 *  "use keyframes" converts the region (one undoable apply, the importer's writer). */
export default function TimelineDock({ iframeRef }: Props) {
  const template = useTemplateStore((s) => s.template);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const [v2, setV2] = useState<boolean>(() => loadPrefs().timelineV2);
  const native = useMemo(() => parseAnimData(template.js), [template.js]);
  const imported = useMemo(() => (native ? null : importAnimData(template)), [native, template]);
  const data = native ?? imported;
  const showV2 = native !== null || (v2 && data !== null);
  const toggle = () => {
    savePrefs({ timelineV2: !v2 });
    setV2(!v2);
  };
  const convert = () => {
    if (!imported) return;
    const js = replaceRegionWithAnimData(template.js, imported);
    if (!js) return;
    applyTemplate({ ...template, js });
    setActiveTab('js'); // the rewritten region is real, highlighted code
  };
  return (
    <div className="timeline-dock">
      {showV2 && data ? (
        <StepTimeline iframeRef={iframeRef} data={data} editable={native !== null} />
      ) : (
        <TimelineView iframeRef={iframeRef} />
      )}
      {native === null && data && (
        <span className="timeline-dock-chips">
          {showV2 && (
            <button
              className="timeline-dock-toggle convert"
              onClick={convert}
              title="Rewrite the animation code as an editable keyframe data block — the timeline and Inspector then edit it directly (undo with Ctrl+Z)"
              data-testid="timeline-v2-convert"
            >
              ◆ use keyframes
            </button>
          )}
          <button
            className="timeline-dock-toggle"
            onClick={toggle}
            title={showV2 ? 'Back to the classic strip' : 'Try the new step timeline'}
            data-testid="timeline-v2-toggle"
          >
            {showV2 ? '⧉ classic strip' : '⧉ new timeline'}
          </button>
        </span>
      )}
    </div>
  );
}

/** Map a step index onto the simulator scrub protocol's phase ids. */
export function phaseIdOf(data: AnimData, stepIndex: number): string {
  if (stepIndex === 0) return 'in';
  if (stepIndex === data.steps.length - 1) return 'out';
  return `step-${stepIndex + 1}`;
}

function StepTimeline({ iframeRef, data, editable }: Props & { data: AnimData; editable: boolean }) {
  const template = useTemplateStore((s) => s.template);
  const sendScrub = useTemplateStore((s) => s.sendScrub);
  const sendControl = useTemplateStore((s) => s.sendControl);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const selectedPart = useTemplateStore((s) => s.selectedPart);
  const setSelectedPart = useTemplateStore((s) => s.setSelectedPart);
  const setPlayhead = useTemplateStore((s) => s.setPlayhead);

  const parts = useMemo(
    () => getTemplateParts(template.html, template.fields),
    [template.html, template.fields],
  );

  // ── Geometry: steps side by side (each on its real local clock), the hold between the
  //    last content step and Out — a real segment when auto-out gives it a duration.
  const [pxPerSec, setPxPerSec] = useState(140);
  // A clip resize in progress: the dragged step's LIVE width (everything right of it
  // reflows with it, exactly like a video editor's ripple).
  const [clipDrag, setClipDrag] = useState<{ i: number; w: number; alt: boolean } | null>(null);
  const clipDragRef = useRef<typeof clipDrag>(null);
  clipDragRef.current = clipDrag;
  const outMs = /^\d+$/.test(template.settings.out ?? '') ? Number(template.settings.out) : null;
  const holdW = outMs !== null ? Math.max(HOLD_PX, (outMs / 1000) * pxPerSec) : HOLD_PX;
  const segs = useMemo(() => {
    const out: { step: AnimData['steps'][number]; i: number; isOut: boolean; x: number; w: number; holdX: number | null }[] = [];
    let x = 0;
    for (let i = 0; i < data.steps.length; i++) {
      const isOut = i === data.steps.length - 1;
      if (isOut) x += holdW; // the hold sits just before Out
      const w =
        clipDrag && clipDrag.i === i ? clipDrag.w : Math.max(56, stepSeconds(data, i) * pxPerSec);
      out.push({ step: data.steps[i], i, isOut, x, w, holdX: isOut ? x - holdW : null });
      x += w;
    }
    return out;
  }, [data, pxPerSec, holdW, clipDrag]);
  const canvasW = segs.length ? segs[segs.length - 1].x + segs[segs.length - 1].w : 0;
  // Live refs for the rAF playhead tick (its effect deps deliberately exclude geometry).
  const segsRef = useRef(segs);
  segsRef.current = segs;
  const pxRef = useRef(pxPerSec);
  pxRef.current = pxPerSec;

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

  const headRef = useRef(head);
  headRef.current = head;

  /** Keep the playhead comfortably in view — gentle margins, no jarring jumps. */
  const followScroll = (x: number) => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const margin = 60;
    if (x < el.scrollLeft + margin) el.scrollLeft = Math.max(0, x - margin);
    else if (x > el.scrollLeft + el.clientWidth - margin) el.scrollLeft = x - el.clientWidth + margin;
  };

  const scrubTo = (place: { step: number; t: number }) => {
    setHead(place);
    setPlayhead(place); // the Inspector stamps keyframes at the parked playhead
    setScrubbing(true);
    sendScrub(phaseIdOf(data, place.step), place.t);
    const seg = segs[place.step];
    if (seg) followScroll(seg.x + Math.min(place.t, stepSeconds(data, place.step)) * pxPerSec);
  };

  /** ONE undoable apply per edit, then re-park the preview at the playhead once the
   *  debounced rebuild settles. Structural edits (duplicate/delete/add a step) change the
   *  Continue count, so the SPX `steps` setting stays derived — same invariant as always. */
  const applyData = (next: AnimData) => {
    const js = spliceAnimData(template.js, next);
    if (!js || js === template.js) return;
    const steps = String(next.steps.length - 1);
    if (template.settings.steps !== steps) {
      const settings = { ...template.settings, steps };
      applyTemplate({ ...template, js, settings, html: replaceDefinitionInHtml(template.html, settings, template.fields) });
    } else {
      applyTemplate({ ...template, js });
    }
    const place = headRef.current;
    setTimeout(() => sendScrub(phaseIdOf(data, place.step), place.t), 650);
  };

  /** The SPX `out` setting — the hold's popover writes it (until ■ Stop / auto-out N ms /
   *  stays), synced into the definition exactly like the classic strip's On air card. */
  const setOutMode = (out: string) => {
    if (out === (template.settings.out ?? 'manual')) return;
    const settings = { ...template.settings, out };
    applyTemplate({ ...template, settings, html: replaceDefinitionInHtml(template.html, settings, template.fields) });
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
        if (idx >= 0 && idx < data.steps.length) {
          setHead({ step: idx, t: active.tl.time() });
          // The view follows the playhead through the run (zoomed-in timelines scroll).
          const seg = segsRef.current[idx];
          if (seg) followScroll(seg.x + Math.min(active.tl.time(), stepSeconds(data, idx)) * pxRef.current);
        }
      } else if (headRef.current.step !== 0 || headRef.current.t !== stepSeconds(data, 0)) {
        setHead({ step: 0, t: stepSeconds(data, 0) }); // idle = the settled entrance end
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data, iframeRef]);

  // ── Rows: EVERY visual layer has its own row (the ratified rule) — registry parts in
  //    registry order (except the root, whose motion is the preset's whole job), plus any
  //    unregistered selectors the data animates (hand-added tracks).
  const rows = useMemo(() => {
    const animated = new Set<string>();
    for (const step of data.steps) {
      Object.keys(step.layers).forEach((s) => animated.add(s));
      (step.reveals ?? []).forEach((s) => animated.add(s));
    }
    const ordered = parts
      .filter((p) => p.kind !== 'root')
      .map((p) => ({ key: p.selector, label: p.label }));
    for (const key of animated) {
      if (key !== data.root && !ordered.some((r) => r.key === key)) ordered.push({ key, label: key });
    }
    return ordered;
  }, [data, parts]);

  /** Aggregate keyframe diamonds for one layer: the union of keyframe times across props,
   *  per step (one diamond may stand for several properties — the Inspector splits them).
   *  tRel is the STORED (speed-relative) time — the mutators' clock. */
  const diamondsFor = (key: string): { x: number; tRel: number; step: number; n: number }[] => {
    const out: { x: number; tRel: number; step: number; n: number }[] = [];
    for (const seg of segs) {
      const tracks = seg.step.layers[key];
      if (!tracks) continue;
      const byTime = new Map<number, number>();
      for (const kfs of Object.values(tracks)) {
        for (const kf of kfs) byTime.set(kf.time, (byTime.get(kf.time) ?? 0) + 1);
      }
      for (const [tRel, n] of byTime) {
        out.push({ x: seg.x + (tRel / (data.speed || 1)) * pxPerSec, tRel, step: seg.i, n });
      }
    }
    return out;
  };

  // ── Keyframe interactions (data-block templates only): drag an aggregate diamond to
  //    retime every property keyframe at that moment; click selects it; Delete removes it.
  interface KfRef { key: string; step: number; tRel: number }
  const [kfSel, setKfSel] = useState<KfRef | null>(null);
  const [kfDrag, setKfDrag] = useState<(KfRef & { x: number; moved: boolean }) | null>(null);
  const kfDragRef = useRef<typeof kfDrag>(null);
  kfDragRef.current = kfDrag;

  const startKfDrag = (e: React.PointerEvent, ref: KfRef, x: number) => {
    if (!editable) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setKfDrag({ ...ref, x, moved: false });
  };
  const moveKfDrag = (e: React.PointerEvent) => {
    const d = kfDragRef.current;
    if (!d || e.buttons !== 1) return;
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).closest('.tlv2-canvas')!.getBoundingClientRect();
    setKfDrag({ ...d, x: e.clientX - rect.left, moved: true });
  };
  const endKfDrag = (e: React.PointerEvent) => {
    const d = kfDragRef.current;
    setKfDrag(null);
    if (!d) return;
    e.stopPropagation();
    if (!d.moved) {
      // A plain click: select the diamond (and its layer — shared selection).
      setKfSel(d);
      setSelectedPart(d.key);
      return;
    }
    const seg = segs[d.step];
    const speed = data.speed || 1;
    // Snap to the same 0.05 s grid every timing edit uses (effective seconds).
    const tEff = Math.round(Math.max(0, (d.x - seg.x) / pxPerSec) / 0.05) * 0.05;
    const toRel = Math.round(tEff * speed * 1000) / 1000;
    if (Math.abs(toRel - d.tRel) < 0.005) return;
    applyData(moveLayerKeyframes(data, d.step, d.key, d.tRel, toRel));
    setKfSel({ ...d, tRel: toRel });
  };

  // ── Steps as clips (Phase 6): right-edge resize, context menu, hold popover ─────
  // The clip's left edge IS the cue boundary — steps start when the operator presses, so
  // only the duration (the right edge) is draggable. Default preserves keyframe timing
  // (extending leaves settled air, shrinking clamps at the last keyframe); Alt stretches
  // everything proportionally.
  const startClipDrag = (e: React.PointerEvent, i: number, w: number) => {
    if (!editable) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setClipDrag({ i, w, alt: e.altKey });
  };
  const moveClipDrag = (e: React.PointerEvent) => {
    const d = clipDragRef.current;
    if (!d || e.buttons !== 1) return;
    e.stopPropagation();
    const seg = segs[d.i];
    const rect = (e.currentTarget as HTMLElement).closest('.tlv2-canvas')!.getBoundingClientRect();
    setClipDrag({ ...d, w: Math.max(24, e.clientX - rect.left - seg.x), alt: e.altKey });
  };
  const endClipDrag = (e: React.PointerEvent) => {
    const d = clipDragRef.current;
    setClipDrag(null);
    if (!d) return;
    e.stopPropagation();
    const speed = data.speed || 1;
    const durEff = Math.round(Math.max(0.05, d.w / pxPerSec) / 0.05) * 0.05; // the 0.05 s grid
    const next = resizeStep(data, d.i, Math.round(durEff * speed * 1000) / 1000, d.alt ? 'stretch' : 'preserve');
    if (next) applyData(next);
  };

  /** The clip context menu (Duplicate / Rename / Delete / step ease), the hold's out-mode
   *  popover, and the keyframe ease menu (right-click a diamond). */
  const [menu, setMenu] = useState<{ x: number; y: number; step: number; rename?: boolean } | null>(null);
  const [holdMenu, setHoldMenu] = useState<{ x: number; y: number } | null>(null);
  const [kfMenu, setKfMenu] = useState<{ x: number; y: number; ref: KfRef } | null>(null);
  useEffect(() => {
    if (!menu && !holdMenu && !kfMenu) return;
    const close = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('.tlv2-menu')) return;
      setMenu(null);
      setHoldMenu(null);
      setKfMenu(null);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [menu, holdMenu, kfMenu]);

  /** The ease vocabulary for one step, phase-correct: entrances settle (Out-direction
   *  halves), the Out step leaves quickly (In-direction halves). */
  const easeOptionsForStep = (stepIndex: number): { value: string; label: string }[] => {
    const dir = stepIndex === data.steps.length - 1 ? 'out' : 'in';
    const seen = new Map<string, string>();
    for (const e of EASINGS) {
      const value = dir === 'in' ? e.gsapIn : e.gsapOut;
      if (!seen.has(value)) seen.set(value, e.tag === 'standard' ? e.name : `${e.name} ·${e.tag}`);
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  };

  const channelOf = (sel: string): 'mask' | 'rise' =>
    parts.find((p) => p.selector === sel)?.channel === 'mask' ? 'mask' : 'rise';

  // Keyboard: Delete removes the selected diamond's keyframes; ←/→ nudge it on the 0.05 s
  // grid; Space plays the graphic. Never while typing in a field or the code editor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.closest('.monaco-editor'))
      ) {
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        sendControl('play');
        return;
      }
      if (!editable || !kfSel) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        setKfSel(null);
        applyData(deleteLayerKeyframes(data, kfSel.step, kfSel.key, kfSel.tRel));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const speed = data.speed || 1;
        const delta = (e.key === 'ArrowLeft' ? -0.05 : 0.05) * speed;
        const to = Math.round(Math.max(0, kfSel.tRel + delta) * 1000) / 1000;
        if (to === kfSel.tRel) return;
        const next = moveLayerKeyframes(data, kfSel.step, kfSel.key, kfSel.tRel, to);
        if (next !== data) {
          setKfSel({ ...kfSel, tRel: to });
          applyData(next);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, kfSel, data, template]);

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
                      className={`tlv2-hold${editable ? ' editable' : ''}`}
                      style={{ left: seg.holdX, width: seg.x - seg.holdX }}
                      title={
                        (outMs !== null
                          ? `The hold — on air for ${outMs} ms, then the graphic leaves by itself`
                          : template.settings.out === 'none'
                            ? 'The hold — the graphic stays (no out is set)'
                            : 'The hold — the graphic sits on air until the ■ Stop cue') +
                        (editable ? '. Click to change how it leaves.' : '')
                      }
                      data-testid="tlv2-hold"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        if (!editable) return;
                        e.stopPropagation();
                        setHoldMenu({ x: e.clientX, y: e.clientY });
                      }}
                    >
                      ●
                    </span>
                  )}
                  <span
                    className={`tlv2-clip${head.step === seg.i ? ' active' : ''}`}
                    style={{ left: seg.x, width: seg.w }}
                    title={
                      (seg.i === 0
                        ? 'Plays on ▶ Play'
                        : seg.isOut
                          ? 'Plays on ■ Stop'
                          : `Plays on press ${seg.i} of » Next`) +
                      (editable ? '. Right-click for step actions; drag the right edge to retime.' : '')
                    }
                    data-testid={`tlv2-clip-${seg.i}`}
                    onContextMenu={(e) => {
                      if (!editable) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setMenu({ x: e.clientX, y: e.clientY, step: seg.i });
                    }}
                  >
                    <span className="tlv2-cue">{cueOf(seg)}</span> {seg.step.name}
                    <span className="tlv2-clip-dur"> {stepSeconds(data, seg.i).toFixed(2)}s</span>
                    {editable && (
                      <span
                        className="tlv2-clip-handle"
                        title="Drag to change this step's duration (keyframes keep their timing; hold Alt to stretch them with it)"
                        data-testid={`tlv2-clip-handle-${seg.i}`}
                        onPointerDown={(e) => startClipDrag(e, seg.i, seg.w)}
                        onPointerMove={moveClipDrag}
                        onPointerUp={endClipDrag}
                        onPointerCancel={() => setClipDrag(null)}
                      />
                    )}
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
                {diamondsFor(r.key).map((d, di) => {
                  const dragging =
                    kfDrag && kfDrag.key === r.key && kfDrag.step === d.step && kfDrag.tRel === d.tRel && kfDrag.moved;
                  const selected =
                    kfSel && kfSel.key === r.key && kfSel.step === d.step && Math.abs(kfSel.tRel - d.tRel) < 0.005;
                  return (
                    <span
                      key={di}
                      className={`tlv2-diamond${editable ? ' editable' : ''}${selected ? ' selected' : ''}${dragging ? ' dragging' : ''}`}
                      style={{ left: dragging ? kfDrag!.x : d.x }}
                      title={
                        (d.n > 1 ? `${d.n} property keyframes` : 'keyframe') +
                        (editable ? ' — drag to retime, click to select (Delete removes)' : '')
                      }
                      data-testid={`tlv2-kf-${r.key.replace(/[^\w-]/g, '')}`}
                      onPointerDown={(e) => startKfDrag(e, { key: r.key, step: d.step, tRel: d.tRel }, d.x)}
                      onPointerMove={moveKfDrag}
                      onPointerUp={endKfDrag}
                      onPointerCancel={() => setKfDrag(null)}
                      onContextMenu={(e) => {
                        if (!editable) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const ref = { key: r.key, step: d.step, tRel: d.tRel };
                        setKfSel(ref);
                        setSelectedPart(r.key);
                        setKfMenu({ x: e.clientX, y: e.clientY, ref });
                      }}
                    >
                      ◆
                    </span>
                  );
                })}
              </div>
            ))}

            {/* The playhead — spans ruler to rows; drag it (the cap is the grab handle),
                or click anywhere on the ribbon to move it. */}
            <div className="tlv2-playhead" style={{ left: headX }} data-testid="tlv2-playhead" />
            <div
              className="tlv2-playhead-cap"
              style={{ left: headX }}
              title="The playhead — drag to scrub (the preview follows)"
              data-testid="tlv2-playhead-cap"
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (e.buttons !== 1) return;
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLElement).closest('.tlv2-canvas')!.getBoundingClientRect();
                const place = xToPlace(e.clientX - rect.left);
                if (place) scrubTo(place);
              }}
            />
          </div>
        </div>

        {/* Zoom + step tools. */}
        <div className="tlv2-side">
          {/* Deep zoom on purpose: 1000 px/s puts 50 px between 0.05 s grid ticks — enough
              to place keyframes precisely in a 0.3 s move. */}
          <button className="timeline-zoom-btn" onClick={() => setPxPerSec((z) => Math.max(40, z / 1.3))} title="Zoom out" data-testid="tlv2-zoom-out">−</button>
          <button className="timeline-zoom-btn" onClick={() => setPxPerSec((z) => Math.min(1000, z * 1.3))} title="Zoom in" data-testid="tlv2-zoom-in">+</button>
          {editable && (
            <button
              className="timeline-zoom-btn tlv2-add-step"
              onClick={() => applyData(addStep(data))}
              title="Add a step — a new » Next press before Out, ready for reveals and keyframes"
              data-testid="tlv2-add-step"
            >
              »+
            </button>
          )}
          {editable && (
            <select
              className="tlv2-speed"
              value={[0.75, 1, 1.5].includes(data.speed) ? String(data.speed) : 'custom'}
              onChange={(e) => {
                if (e.target.value === 'custom') return;
                applyData({ ...data, speed: Number(e.target.value) });
              }}
              title={`Motion speed — scales every duration and keyframe (currently ×${data.speed})`}
              data-testid="tlv2-speed"
            >
              <option value="0.75">×0.75</option>
              <option value="1">×1</option>
              <option value="1.5">×1.5</option>
              {![0.75, 1, 1.5].includes(data.speed) && <option value="custom" disabled>{`×${data.speed}`}</option>}
            </select>
          )}
          <span className="tlv2-time mono" data-testid="tlv2-time">{head.t.toFixed(2)}s</span>
        </div>
      </div>

      {/* The clip context menu — Duplicate / Rename / Delete (steps are the clips). */}
      {menu && (
        <div className="tlv2-menu" style={{ left: menu.x, top: menu.y }} data-testid="tlv2-menu">
          {menu.rename ? (
            <input
              className="tlv2-menu-input"
              autoFocus
              defaultValue={data.steps[menu.step]?.name ?? ''}
              data-testid="tlv2-rename-input"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setMenu(null);
                if (e.key !== 'Enter') return;
                const next = renameStep(data, menu.step, (e.currentTarget as HTMLInputElement).value);
                setMenu(null);
                if (next) applyData(next);
              }}
            />
          ) : (
            <>
              <button
                className="tlv2-menu-item"
                data-testid="tlv2-menu-duplicate"
                onClick={() => {
                  const next = duplicateStep(data, menu.step);
                  setMenu(null);
                  if (next) applyData(next);
                }}
              >
                Duplicate step
              </button>
              <button
                className="tlv2-menu-item"
                data-testid="tlv2-menu-rename"
                onClick={() => setMenu({ ...menu, rename: true })}
              >
                Rename…
              </button>
              {menu.step > 0 && menu.step < data.steps.length - 1 && (
                <button
                  className="tlv2-menu-item danger"
                  data-testid="tlv2-menu-delete"
                  onClick={() => {
                    const next = deleteStep(data, menu.step, channelOf);
                    setMenu(null);
                    if (next) applyData(next);
                  }}
                >
                  Delete step
                </button>
              )}
              {/* The step's default ease — what keyframes without their own curve inherit. */}
              <select
                className="tlv2-out-mode"
                value={data.steps[menu.step]?.ease ?? ''}
                onChange={(e) => {
                  const next = setStepEase(data, menu.step, e.target.value);
                  setMenu(null);
                  if (next) applyData(next);
                }}
                title="The step's default ease — keyframes without their own curve follow it"
                data-testid="tlv2-menu-ease"
              >
                {!easeOptionsForStep(menu.step).some((o) => o.value === data.steps[menu.step]?.ease) && (
                  <option value={data.steps[menu.step]?.ease ?? ''} disabled>
                    {data.steps[menu.step]?.ease}
                  </option>
                )}
                {easeOptionsForStep(menu.step).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {/* The keyframe's ease menu (right-click a diamond): how motion arrives INTO this
          moment — Auto inherits the step's curve. Applies to every property keyed here. */}
      {kfMenu && (
        <div className="tlv2-menu" style={{ left: kfMenu.x, top: kfMenu.y }} data-testid="tlv2-kf-menu">
          <select
            className="tlv2-out-mode"
            value={(() => {
              const tracks = data.steps[kfMenu.ref.step]?.layers[kfMenu.ref.key] ?? {};
              for (const kfs of Object.values(tracks)) {
                const kf = kfs.find((k) => Math.abs(k.time - kfMenu.ref.tRel) < 0.005);
                if (kf) return kf.ease ?? 'auto';
              }
              return 'auto';
            })()}
            onChange={(e) => {
              const next = setKeyframeEase(
                data, kfMenu.ref.step, kfMenu.ref.key, kfMenu.ref.tRel,
                e.target.value === 'auto' ? null : e.target.value,
              );
              setKfMenu(null);
              if (next) applyData(next);
            }}
            title="The ease INTO this keyframe — Auto follows the step's default curve"
            data-testid="tlv2-kf-ease"
          >
            <option value="auto">Auto — the step's curve</option>
            {easeOptionsForStep(kfMenu.ref.step).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* The hold's popover — how the graphic leaves air (the SPX out setting). */}
      {holdMenu && (
        <div className="tlv2-menu" style={{ left: holdMenu.x, top: holdMenu.y }} data-testid="tlv2-hold-menu">
          <select
            className="tlv2-out-mode"
            value={template.settings.out === 'none' ? 'none' : outMs !== null ? 'auto' : 'manual'}
            onChange={(e) =>
              setOutMode(e.target.value === 'auto' ? (outMs !== null ? String(outMs) : '5000') : e.target.value)
            }
            title="How the graphic leaves air — the SPX out setting in the template definition"
            data-testid="tlv2-out-mode"
          >
            <option value="manual">until ■ Stop plays the exit</option>
            <option value="auto">leaving by itself, after…</option>
            <option value="none">forever — it stays (no out)</option>
          </select>
          {outMs !== null && (
            <span className="tlv2-out-ms-row">
              <input
                className="tlv2-out-ms"
                type="number"
                min={100}
                step={100}
                key={outMs}
                defaultValue={outMs}
                data-testid="tlv2-out-ms"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                }}
                onBlur={(e) => {
                  const v = Math.round(Number(e.currentTarget.value));
                  if (Number.isFinite(v) && v >= 100) setOutMode(String(v));
                }}
              />{' '}
              ms
            </span>
          )}
        </div>
      )}
    </div>
  );
}
