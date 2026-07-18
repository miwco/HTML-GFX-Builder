import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { parseAnimData, spliceAnimData, type AnimData } from '../blocks/animData';
import { importAnimData } from '../blocks/animImport';
import {
  addStep,
  deleteKeyframe,
  deleteLayerKeyframes,
  deleteStep,
  duplicateStep,
  layerPress,
  moveKeyframe,
  moveLayerKeyframes,
  renameStep,
  resizeStep,
  setKeyframe,
  setKeyframeEase,
  setLayerHide,
  setStepEase,
} from '../blocks/animEdit';
import { EASINGS } from '../model/easings';
import { replaceRegionWithAnimData } from '../templates/shared/animRuntime';
import { activationStep, animatedProps, hideStep, stepSeconds } from '../blocks/animEval';
import { changePartPress } from '../blocks/stepAssign';
import { getTemplateParts } from '../model/structure';
import { replaceDefinitionInHtml } from '../model/spxDefinition';
import LegacyTimeline from './LegacyTimeline';
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
const PROP_ROW_H = 22; // property sub-rows: real targets, slightly denser than layers
const MEASURED_ROW_H = 26; // measured-motion rows: read-only, below the keyframed layers
const HOLD_PX = 30; // the un-clocked hold break (manual/none) — a fixed visual pause

/** Readable sub-row names for the animated properties (raw prop name for anything else) —
 *  the same vocabulary the Inspector's property rows speak. */
const PROP_LABELS: Record<string, string> = {
  x: 'Position X',
  y: 'Position Y',
  yPercent: 'Y (mask %)',
  scale: 'Scale',
  scaleX: 'Scale X',
  scaleY: 'Scale Y',
  opacity: 'Opacity',
  rotation: 'Rotation',
  filter: 'Blur',
  rotationX: 'Rotate X',
  rotationY: 'Rotate Y',
  z: 'Depth (Z)',
  transformPerspective: 'Perspective',
};

interface Props {
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

/**
 * The dock: it picks the editing surface from the CODE, never from the category — which is
 * what lets a template saved years ago still open correctly (Phase 8).
 *
 * - the region IS a NOACG_ANIM data block  → the step timeline, editable. Every category
 *   creates this way, so it is the normal case.
 * - a LEGACY region the importer can read   → the same step timeline, READ-ONLY, with
 *   "use keyframes" one click away (one undoable apply, the importer's writer). It shows the
 *   real choreography — converted — rather than a second, lesser editing surface.
 * - a legacy region it CANNOT read          → LegacyTimeline: charted, read-only, honest about
 *   why (hand-written measured motion can never be auto-converted, and regenerating it would
 *   throw away the owner's tuning — DYNAMIC_MOTION_SCOPE §8.1).
 */
export default function TimelineDock({ iframeRef }: Props) {
  const template = useTemplateStore((s) => s.template);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const native = useMemo(() => parseAnimData(template.js), [template.js]);
  const imported = useMemo(() => (native ? null : importAnimData(template)), [native, template]);
  const data = native ?? imported;
  const convert = () => {
    if (!imported) return;
    const js = replaceRegionWithAnimData(template.js, imported);
    if (!js) return;
    applyTemplate({ ...template, js });
    setActiveTab('js'); // the rewritten region is real, highlighted code
  };
  return (
    <div className="timeline-dock">
      {data ? (
        <StepTimeline iframeRef={iframeRef} data={data} editable={native !== null} />
      ) : (
        <LegacyTimeline iframeRef={iframeRef} />
      )}
      {native === null && data && (
        <span className="timeline-dock-chips">
          <button
            className="timeline-dock-toggle convert"
            onClick={convert}
            title="Rewrite the animation code as an editable keyframe data block — the timeline and Inspector then edit it directly (undo with Ctrl+Z)"
            data-testid="timeline-v2-convert"
          >
            ◆ use keyframes
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
  const selectedParts = useTemplateStore((s) => s.selectedParts);
  const setSelectedPart = useTemplateStore((s) => s.setSelectedPart);
  const toggleSelectedPart = useTemplateStore((s) => s.toggleSelectedPart);
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

  // Fit the whole playout once per template — and keep re-fitting when the VIEWPORT
  // resizes (the Inspector opening, the code pane collapsing, a window resize), for as
  // long as the zoom is still the automatic one. A manual zoom is a deliberate framing
  // choice; a layout change must never override it (the zoom buttons take over for good).
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fittedRef = useRef<string | null>(null);
  const manualZoomRef = useRef(false);
  const fitZoom = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth < 120) return;
    const totalSec = data.steps.reduce((a, _s, i) => a + stepSeconds(data, i), 0);
    setPxPerSec(Math.min(400, Math.max(40, (el.clientWidth - HOLD_PX - 12) / Math.max(0.5, totalSec))));
  }, [data]);
  useEffect(() => {
    if (fittedRef.current === template.name) return;
    if (!scrollRef.current || scrollRef.current.clientWidth < 120) return;
    fittedRef.current = template.name;
    manualZoomRef.current = false;
    fitZoom();
  }, [data, template.name, fitZoom]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let lastW = el.clientWidth;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (Math.abs(w - lastW) < 8) return; // ignore sub-pixel churn
      lastW = w;
      if (!manualZoomRef.current) fitZoom();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitZoom]);

  // Density: when the strip itself is squeezed (Inspector open on a laptop width), the
  // label column condenses so the ribbon keeps room to edit in. Row height stays put —
  // the editing targets are the point of the scale.
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [tight, setTight] = useState(false);
  useEffect(() => {
    const el = stripRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const check = () => setTight(el.clientWidth < 560);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  // Canvas pointer handling (scrub vs. keyframe lasso) is defined below, once the row
  // geometry and diamond helpers are in scope — see onCanvasDown / onCanvasMove / onCanvasUp.

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

  // ── Per-property sub-rows (the interaction model, amendment 1): a layer expands into
  //    one row per animated property; the collapsed layer row keeps the aggregate view.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  /** The rendered row list: layer rows plus the expanded layers' property sub-rows,
   *  each with its computed offset (rows no longer share one fixed height). */
  interface DisplayRow {
    key: string;
    layerKey: string;
    label: string;
    prop?: string;
    top: number;
    height: number;
  }
  const displayRows = useMemo(() => {
    const list: DisplayRow[] = [];
    let top = 0;
    for (const r of rows) {
      list.push({ key: r.key, layerKey: r.key, label: r.label, top, height: ROW_H });
      top += ROW_H;
      if (expanded.has(r.key)) {
        for (const prop of animatedProps(data, r.key)) {
          list.push({
            key: `${r.key}::${prop}`,
            layerKey: r.key,
            prop,
            label: PROP_LABELS[prop] ?? prop,
            top,
            height: PROP_ROW_H,
          });
          top += PROP_ROW_H;
        }
      }
    }
    return { list, height: top };
  }, [rows, expanded, data]);

  // ── Measured-motion rows (docs/DYNAMIC_MOTION_SCOPE.md): a step's `dynamics` name a
  //    builder function that reads the DOM and returns the tween — a marquee's travel is one
  //    track-width, a credits roll is one content-height, and those magnitudes only exist at
  //    play time. There is nothing here to keyframe, so the timeline shows the segment
  //    READ-ONLY and says where it is edited: in the code, where it honestly lives.
  //    One row per target; its bar runs from the segment's start to the end of the timeline,
  //    because the real length is not knowable until the graphic plays.
  const measuredRows = useMemo(() => {
    const byTarget = new Map<string, { target: string; segments: { step: number; time: number; build: string }[] }>();
    data.steps.forEach((step, si) => {
      for (const d of step.dynamics ?? []) {
        const target = d.target ?? data.root;
        const row = byTarget.get(target) ?? { target, segments: [] };
        row.segments.push({ step: si, time: d.time ?? 0, build: d.build });
        byTarget.set(target, row);
      }
    });
    return [...byTarget.values()];
  }, [data]);

  // ── Lifecycle calls (docs/TIMELINE_V2_PLAN.md §3b): `calls` fire a named template function
  //    at a moment on the step's clock — a clock engine's startClock/stopClock. They are step
  //    -level SIDE EFFECTS, not layer motion, so they get their own read-only row rather than
  //    pretending to belong to some element. Like measured motion, they are code-owned: the
  //    data names the function, the function lives in template.js.
  const callMarks = useMemo(
    () =>
      data.steps.flatMap((step, si) =>
        (step.calls ?? []).map((c) => ({ step: si, time: c.time, call: c.call })),
      ),
    [data],
  );
  const codeRowCount = measuredRows.length + (callMarks.length > 0 ? 1 : 0);
  const measuredH = codeRowCount * MEASURED_ROW_H;
  const callsRowTop = measuredRows.length * MEASURED_ROW_H;

  // ── Looping tracks (docs/PRESET_MODEL_REVIEW.md gap 6): `loops[selector][prop]` makes one
  //    of a layer's tracks repeat — an ambient breath, a shimmer. The keyframes are ordinary
  //    and editable; the REPEAT itself is a property of the track, not a moment on it, so it
  //    reads as a tail after the track's last keyframe rather than a diamond you could grab.
  //    Read-only here (it is edited in the data), but drawn TRUTHFULLY: a finite repeat ends
  //    where it really ends, and only an endless one runs off the end of the timeline.
  interface LoopBar {
    /** Where the first pass finishes — the tail starts here. */
    from: number;
    /** Where the repeats finish, or null when it never does. */
    to: number | null;
    label: string;
    title: string;
  }
  const loopBarsFor = (stepIndex: number, key: string, prop?: string): LoopBar[] => {
    const seg = segs[stepIndex];
    const step = seg?.step;
    const perProp = step?.loops?.[key];
    if (!seg || !step || !perProp) return [];
    const speed = data.speed || 1;
    const props = prop !== undefined ? (perProp[prop] ? [prop] : []) : Object.keys(perProp);

    const spans = props
      .map((p) => {
        const loop = perProp[p];
        const kfs = step.layers[key]?.[p];
        if (!loop || !kfs || kfs.length === 0) return null;
        const first = kfs[0].time;
        const last = kfs[kfs.length - 1].time;
        const pass = Math.max(0, last - first); // one pass of the loop, on the stored clock
        const delay = loop.repeatDelay ?? 0;
        // GSAP: repeat N adds N passes AFTER the first; -1 never stops.
        const end = loop.repeat < 0 ? null : last + loop.repeat * (pass + delay);
        const times = loop.repeat < 0 ? '∞' : `×${loop.repeat + 1}`;
        return {
          prop: p,
          last,
          end,
          label: `↻${times}${loop.yoyo ? ' ⇄' : ''}`,
          note:
            `${PROP_LABELS[p] ?? p} repeats ${loop.repeat < 0 ? 'forever' : `${loop.repeat + 1} times`}` +
            (loop.yoyo ? ', reversing every other pass (yoyo)' : '') +
            (delay ? `, pausing ${delay}s between passes` : ''),
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
    if (spans.length === 0) return [];

    const toX = (t: number) => seg.x + (t / speed) * pxPerSec;
    // One tail per row: the aggregate layer row merges its props (their individual specs live
    // on the property sub-rows behind the caret), a property row shows exactly its own.
    const from = Math.min(...spans.map((s) => s.last));
    const endless = spans.some((s) => s.end === null);
    const to = endless ? null : Math.max(...spans.map((s) => s.end!));
    const label = spans.length === 1 ? spans[0].label : '↻';
    return [
      {
        from: toX(from),
        to: to === null ? null : toX(to),
        label,
        title:
          spans.map((s) => s.note).join(' · ') +
          ' — a looping track. Its keyframes are the pass; the repeat is set in the animation data.',
      },
    ];
  };

  /** Aggregate keyframe diamonds for one layer: the union of keyframe times across props,
   *  per step (one diamond may stand for several properties — the sub-rows split them).
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

  /** One property's keyframe diamonds (a sub-row): each diamond is a single keyframe. */
  const propDiamonds = (key: string, prop: string): { x: number; tRel: number; step: number; n: number }[] => {
    const out: { x: number; tRel: number; step: number; n: number }[] = [];
    for (const seg of segs) {
      for (const kf of seg.step.layers[key]?.[prop] ?? []) {
        out.push({ x: seg.x + (kf.time / (data.speed || 1)) * pxPerSec, tRel: kf.time, step: seg.i, n: 1 });
      }
    }
    return out;
  };

  // ── Keyframe interactions (data-block templates only): drag a diamond to retime —
  //    every property at that moment on a layer row, just ITS property on a sub-row.
  //    Click selects, shift-click builds a SET, a drag moves the whole set together,
  //    Delete removes it, Ctrl+C/V copies and pastes at the playhead.
  interface KfRef { key: string; step: number; tRel: number; prop?: string }
  const sameRef = (a: KfRef, b: KfRef) =>
    a.key === b.key && a.step === b.step && a.prop === b.prop && Math.abs(a.tRel - b.tRel) < 0.005;
  const [kfSels, setKfSels] = useState<KfRef[]>([]);
  const kfSelsRef = useRef(kfSels);
  kfSelsRef.current = kfSels;
  const isKfSelected = (ref: KfRef) => kfSels.some((s) => sameRef(s, ref));
  /** One drag moves every selected diamond by the same delta; only the grabbed one
   *  tracks the pointer live (the rest shift by dxPx and land together on release). */
  const [kfDrag, setKfDrag] = useState<{ refs: KfRef[]; grabbed: KfRef; startX: number; x: number; shift: boolean; alt: boolean; moved: boolean } | null>(null);
  const kfDragRef = useRef<typeof kfDrag>(null);
  kfDragRef.current = kfDrag;
  /** Copied keyframes: selector + property + time offset from the earliest + value/ease.
   *  Session-local; paste lands the group at the playhead's moment. */
  const kfClipboard = useRef<{ selector: string; prop: string; dt: number; value: number | string; ease?: string }[]>([]);

  // ── Keyframe LASSO — the same amber marquee the canvas draws, extended to the timeline.
  //    A drag on the empty rows area boxes keyframes; shift adds to the current set. The
  //    ruler/clips band keeps its scrub, and diamonds/blocks/handles stop propagation so a
  //    lasso only ever starts on empty space.
  const [tlLasso, setTlLasso] = useState<{ x0: number; y0: number; x1: number; y1: number; active: boolean; additive: boolean } | null>(null);
  const tlLassoRef = useRef<typeof tlLasso>(null);
  tlLassoRef.current = tlLasso;
  const ROWS_TOP = RULER_H + CLIPS_H;

  const canvasXY = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onCanvasDown = (e: React.PointerEvent) => {
    const { x, y } = canvasXY(e);
    // A drag that begins over the rows lassos keyframes; the ruler/clips band scrubs.
    if (editable && y >= ROWS_TOP) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setTlLasso({ x0: x, y0: y, x1: x, y1: y, active: false, additive: e.shiftKey });
      return;
    }
    const place = xToPlace(x);
    if (place) scrubTo(place);
  };

  const onCanvasMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    const ls = tlLassoRef.current;
    if (ls) {
      const { x, y } = canvasXY(e);
      const active = ls.active || Math.hypot(x - ls.x0, y - ls.y0) > 4;
      setTlLasso({ ...ls, x1: x, y1: y, active });
      return;
    }
    const place = xToPlace(canvasXY(e).x);
    if (place) scrubTo(place);
  };

  /** Select every diamond the marquee touches: x maps to time, y to the row bands. */
  const commitTlLasso = (ls: NonNullable<typeof tlLasso>) => {
    const left = Math.min(ls.x0, ls.x1), right = Math.max(ls.x0, ls.x1);
    const top = Math.min(ls.y0, ls.y1), bottom = Math.max(ls.y0, ls.y1);
    const hits: KfRef[] = [];
    for (const r of displayRows.list) {
      // An expanded layer is worked per property — skip its aggregate row so a keyframe
      // isn't picked up twice (aggregate diamond + its sub-row diamond).
      if (r.prop === undefined && expanded.has(r.layerKey)) continue;
      const rowTop = ROWS_TOP + r.top;
      if (rowTop + r.height < top || rowTop > bottom) continue;
      const diamonds = r.prop !== undefined ? propDiamonds(r.layerKey, r.prop) : diamondsFor(r.layerKey);
      for (const d of diamonds) {
        if (d.x >= left && d.x <= right) hits.push({ key: r.layerKey, step: d.step, tRel: d.tRel, prop: r.prop });
      }
    }
    setKfSels((prev) => {
      if (!ls.additive) return hits;
      const merged = [...prev];
      for (const h of hits) if (!merged.some((s) => sameRef(s, h))) merged.push(h);
      return merged;
    });
    if (hits.length > 0) setSelectedPart(hits[0].key); // mirror the primary layer, shared
  };

  const onCanvasUp = (e: React.PointerEvent) => {
    const ls = tlLassoRef.current;
    if (!ls) return;
    setTlLasso(null);
    if (ls.active) {
      commitTlLasso(ls);
    } else {
      // A plain click on the empty rows: scrub there and clear the keyframe selection.
      const place = xToPlace(canvasXY(e).x);
      if (place) scrubTo(place);
      setKfSels([]);
    }
  };

  /** Magnetic snap for a dragged diamond: the playhead, step edges, and every OTHER
   *  keyframe within ~7px win over the raw pointer (Alt bypasses — free placement). */
  const snapKfX = (px: number, alt: boolean, exclude: KfRef[]): number => {
    if (alt) return px;
    const candidates: number[] = [headX];
    for (const seg of segs) candidates.push(seg.x, seg.x + seg.w);
    for (const r of rows) {
      for (const d of diamondsFor(r.key)) {
        if (!exclude.some((x) => x.key === r.key && x.step === d.step && Math.abs(x.tRel - d.tRel) < 0.005)) {
          candidates.push(d.x);
        }
      }
    }
    let best = px;
    let bestDist = 7;
    for (const c of candidates) {
      const dist = Math.abs(px - c);
      if (dist < bestDist) {
        best = c;
        bestDist = dist;
      }
    }
    return best;
  };

  const startKfDrag = (e: React.PointerEvent, ref: KfRef, x: number) => {
    if (!editable) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    // Grabbing an unselected diamond re-anchors the selection (shift keeps the set) —
    // grabbing a selected one drags the whole existing set.
    const refs = isKfSelected(ref) ? kfSels : e.shiftKey ? [...kfSels, ref] : [ref];
    setKfDrag({ refs, grabbed: ref, startX: x, x, shift: e.shiftKey, alt: e.altKey, moved: false });
  };
  const moveKfDrag = (e: React.PointerEvent) => {
    const d = kfDragRef.current;
    if (!d || e.buttons !== 1) return;
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).closest('.tlv2-canvas')!.getBoundingClientRect();
    const raw = e.clientX - rect.left;
    setKfDrag({ ...d, x: snapKfX(raw, e.altKey, d.refs), alt: e.altKey, moved: true });
  };
  const endKfDrag = (e: React.PointerEvent) => {
    const d = kfDragRef.current;
    setKfDrag(null);
    if (!d) return;
    e.stopPropagation();
    if (!d.moved) {
      // A plain click selects (shift toggles membership) — and its layer, shared.
      if (d.shift) {
        setKfSels((prev) =>
          prev.some((s) => sameRef(s, d.grabbed)) ? prev.filter((s) => !sameRef(s, d.grabbed)) : [...prev, d.grabbed],
        );
      } else {
        setKfSels([d.grabbed]);
      }
      setSelectedPart(d.grabbed.key);
      return;
    }
    const seg = segs[d.grabbed.step];
    const speed = data.speed || 1;
    // The grabbed diamond lands on a magnet exactly when one engaged; otherwise on the
    // 0.05 s grid — and the whole set shifts by the same stored-clock delta.
    const rawT = Math.max(0, (d.x - seg.x) / pxPerSec);
    const snapped = Math.abs(d.x - snapKfX(d.x, false, d.refs)) < 0.5 && !d.alt;
    const tEff = snapped ? rawT : Math.round(rawT / 0.05) * 0.05;
    const toRel = Math.round(tEff * speed * 1000) / 1000;
    const delta = Math.round((toRel - d.grabbed.tRel) * 1000) / 1000;
    if (Math.abs(delta) < 0.005) return;
    let next = data;
    for (const ref of d.refs) {
      const to = Math.round(Math.max(0, ref.tRel + delta) * 1000) / 1000;
      next =
        ref.prop !== undefined
          ? moveKeyframe(next, ref.step, ref.key, ref.prop, ref.tRel, to)
          : moveLayerKeyframes(next, ref.step, ref.key, ref.tRel, to);
    }
    if (next === data) return;
    applyData(next);
    setKfSels(
      d.refs.map((ref) => ({
        ...ref,
        tRel: Math.round(Math.min(Math.max(0, ref.tRel + delta), data.steps[ref.step].duration) * 1000) / 1000,
      })),
    );
  };

  // ── Layer state blocks (the interaction model §2 "State"): each layer row renders
  //    its existence span — activation step start → the end of Out — with its keyframed
  //    ENTERING and EXITING phases emphasized. The block's LEFT edge is "which press
  //    reveals this layer": dragging it snaps to step boundaries and lands as the same
  //    activation move the gutter menu and canvas chip make. There is no right-edge
  //    trim — an explicit early-exit needs the `hides` model extension first (the
  //    timeline never fakes what the data cannot say). ──
  /** The keyframed span [minT, maxT] of a layer within one step (stored clock). */
  const kfSpan = (stepIndex: number, key: string): [number, number] | null => {
    const tracks = data.steps[stepIndex]?.layers[key];
    if (!tracks) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const kfs of Object.values(tracks)) {
      for (const kf of kfs) {
        min = Math.min(min, kf.time);
        max = Math.max(max, kf.time);
      }
    }
    return min <= max ? [min, max] : null;
  };

  /** The block edge drags only where the activation move exists: the same eligibility
   *  as the gutter menu and the canvas chip (line/image/accent/block, never the first
   *  line), and only while the graphic has presses to move between. */
  const blockEligible = (key: string): boolean => {
    if (!editable || data.steps.length <= 2) return false;
    const part = parts.find((p) => p.selector === key);
    if (!part || !['line', 'image', 'accent', 'block'].includes(part.kind)) return false;
    return key !== parts.find((p) => p.kind === 'line')?.selector;
  };

  const [blockDrag, setBlockDrag] = useState<{ key: string; x: number; moved: boolean } | null>(null);
  const blockDragRef = useRef<typeof blockDrag>(null);
  blockDragRef.current = blockDrag;

  const startBlockDrag = (e: React.PointerEvent, key: string, x: number) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setBlockDrag({ key, x, moved: false });
  };
  const moveBlockDrag = (e: React.PointerEvent) => {
    const d = blockDragRef.current;
    if (!d || e.buttons !== 1) return;
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).closest('.tlv2-canvas')!.getBoundingClientRect();
    const raw = e.clientX - rect.left;
    // The edge lives ON step boundaries — snap to the nearest content-step start.
    let best = segs[0].x;
    for (const seg of segs.slice(0, -1)) {
      if (Math.abs(seg.x - raw) < Math.abs(best - raw)) best = seg.x;
    }
    setBlockDrag({ ...d, x: best, moved: true });
  };
  const endBlockDrag = (e: React.PointerEvent) => {
    const d = blockDragRef.current;
    setBlockDrag(null);
    if (!d || !d.moved) return;
    e.stopPropagation();
    const seg = segs.slice(0, -1).find((s) => Math.abs(s.x - d.x) < 1);
    if (!seg) return;
    const toPress = seg.i - 1; // step 0 = "appears with ▶ Play" (press -1)
    const fromPress = layerPress(data, d.key);
    if (toPress === fromPress) return;
    const change = changePartPress(template, parts, d.key, fromPress, toPress);
    if (!change) return;
    applyTemplate({ ...template, ...change.patch }); // one undoable apply — same as the chip
  };

  // The block's RIGHT edge — the `hides` early-exit. Drag it to a step boundary to make the
  // layer LEAVE in that step; drag it to Out (the far right) to clear the exit and let the
  // layer live to the end. Snaps to the right edge of any step after the layer's activation.
  const hideEligible = (key: string): boolean => editable && data.steps.length > 2 && key !== data.root;
  const [hideDrag, setHideDrag] = useState<{ key: string; x: number; moved: boolean } | null>(null);
  const hideDragRef = useRef<typeof hideDrag>(null);
  hideDragRef.current = hideDrag;
  const startHideDrag = (e: React.PointerEvent, key: string, x: number) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setHideDrag({ key, x, moved: false });
  };
  const moveHideDrag = (e: React.PointerEvent) => {
    const d = hideDragRef.current;
    if (!d || e.buttons !== 1) return;
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).closest('.tlv2-canvas')!.getBoundingClientRect();
    const raw = e.clientX - rect.left;
    const act = activationStep(data, d.key);
    let best = segs[segs.length - 1].x + segs[segs.length - 1].w; // Out = no early exit
    for (const seg of segs) {
      if (seg.i <= act) continue;
      const edge = seg.x + seg.w;
      if (Math.abs(edge - raw) < Math.abs(best - raw)) best = edge;
    }
    setHideDrag({ ...d, x: best, moved: true });
  };
  const endHideDrag = (e: React.PointerEvent) => {
    const d = hideDragRef.current;
    setHideDrag(null);
    if (!d || !d.moved) return;
    e.stopPropagation();
    const seg = segs.find((s) => Math.abs(s.x + s.w - d.x) < 1);
    if (!seg || seg.i === hideStep(data, d.key)) return;
    const next = setLayerHide(data, d.key, seg.i);
    // Templates created before the `hides` feature carry an interpreter that ignores it —
    // splicing only the data would leave the exit a silent no-op on air. Re-emit the whole
    // region (a fresh, hides-aware interpreter + the data) once, so the early exit works.
    if (!/step\.hides/.test(template.js)) {
      const js = replaceRegionWithAnimData(template.js, next);
      if (js && js !== template.js) {
        applyTemplate({ ...template, js });
        const place = headRef.current;
        setTimeout(() => sendScrub(phaseIdOf(data, place.step), place.t), 650);
      }
      return;
    }
    applyData(next);
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

  // Keyboard: Delete removes the selected keyframe SET; ←/→ nudge the whole set on the
  // 0.05 s grid; Ctrl/Cmd+C copies it, Ctrl/Cmd+V pastes at the playhead, Ctrl/Cmd+D
  // duplicates it in place; Space plays the graphic. (The set is built by clicking,
  // shift-clicking, or lassoing diamonds.) Never while typing in a field or the code editor.
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
      if (!editable) return;
      const speed = data.speed || 1;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && kfSels.length > 0) {
        // Copy: the set's keyframes as (selector, property, offset-from-earliest, value).
        e.preventDefault();
        const entries: typeof kfClipboard.current = [];
        let minT = Infinity;
        for (const ref of kfSels) {
          const tracks = data.steps[ref.step]?.layers[ref.key] ?? {};
          for (const [prop, kfs] of Object.entries(tracks)) {
            if (ref.prop !== undefined && prop !== ref.prop) continue;
            const kf = kfs.find((k) => Math.abs(k.time - ref.tRel) < 0.005);
            if (kf) {
              entries.push({ selector: ref.key, prop, dt: kf.time, value: kf.value, ease: kf.ease });
              minT = Math.min(minT, kf.time);
            }
          }
        }
        kfClipboard.current = entries.map((en) => ({ ...en, dt: Math.round((en.dt - minT) * 1000) / 1000 }));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && kfClipboard.current.length > 0) {
        // Paste: the group lands with its earliest keyframe at the playhead's moment,
        // same layers, same properties — one undoable apply.
        e.preventDefault();
        const baseT = Math.round(head.t * speed * 1000) / 1000;
        let next = data;
        for (const en of kfClipboard.current) {
          next = setKeyframe(next, head.step, en.selector, en.prop, baseT + en.dt, en.value, en.ease);
        }
        applyData(next);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && kfSels.length > 0) {
        // Duplicate: drop a copy of the set just after itself (same layers, properties,
        // values, easing), then select the copies so they can be dragged straight away.
        e.preventDefault();
        const items: { key: string; step: number; prop: string; tRel: number; value: number | string; ease?: string }[] = [];
        let minT = Infinity;
        let maxT = -Infinity;
        for (const ref of kfSels) {
          const tracks = data.steps[ref.step]?.layers[ref.key] ?? {};
          for (const [prop, kfs] of Object.entries(tracks)) {
            if (ref.prop !== undefined && prop !== ref.prop) continue;
            const kf = kfs.find((k) => Math.abs(k.time - ref.tRel) < 0.005);
            if (kf) {
              items.push({ key: ref.key, step: ref.step, prop, tRel: kf.time, value: kf.value, ease: kf.ease });
              minT = Math.min(minT, kf.time);
              maxT = Math.max(maxT, kf.time);
            }
          }
        }
        if (items.length === 0) return;
        const offset = Math.round((Math.max(maxT - minT, 0) + 0.1 * speed) * 1000) / 1000;
        let next = data;
        for (const it of items) {
          const to = Math.round((it.tRel + offset) * 1000) / 1000;
          next = setKeyframe(next, it.step, it.key, it.prop, to, it.value, it.ease);
        }
        if (next === data) return;
        applyData(next);
        setKfSels(
          kfSels.map((ref) => ({
            ...ref,
            tRel: Math.round(Math.min(ref.tRel + offset, data.steps[ref.step].duration) * 1000) / 1000,
          })),
        );
        return;
      }
      if (kfSels.length === 0) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        let next = data;
        for (const ref of kfSels) {
          next =
            ref.prop !== undefined
              ? deleteKeyframe(next, ref.step, ref.key, ref.prop, ref.tRel)
              : deleteLayerKeyframes(next, ref.step, ref.key, ref.tRel);
        }
        setKfSels([]);
        if (next !== data) applyData(next);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const delta = (e.key === 'ArrowLeft' ? -0.05 : 0.05) * speed;
        let next = data;
        const moved: KfRef[] = [];
        for (const ref of kfSels) {
          const to = Math.round(Math.max(0, ref.tRel + delta) * 1000) / 1000;
          const n2 =
            ref.prop !== undefined
              ? moveKeyframe(next, ref.step, ref.key, ref.prop, ref.tRel, to)
              : moveLayerKeyframes(next, ref.step, ref.key, ref.tRel, to);
          moved.push(n2 !== next ? { ...ref, tRel: to } : ref);
          next = n2;
        }
        if (next !== data) {
          setKfSels(moved);
          applyData(next);
        }
      }
    };
    // CAPTURE phase, deliberately: the canvas layer-nudge (CanvasInteraction) also listens
    // for arrows on window, and selecting a keyframe diamond usually leaves its layer in the
    // shared selection too — so both handlers are armed at once. An explicit keyframe-set
    // selection is the more specific intent and must win deterministically: this handler runs
    // first (capture precedes bubble), claims the key with preventDefault when a set is
    // selected, and the canvas handler stands down on e.defaultPrevented. With no set
    // selected the arrow branch returns without claiming, and the layer nudge proceeds.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, kfSels, data, template, head]);

  const cueOf = (seg: (typeof segs)[number]) => (seg.i === 0 ? '▶' : seg.isOut ? '■' : '»');

  return (
    <div className={`timeline-strip tlv2${tight ? ' tight' : ''}`} ref={stripRef} data-testid="timeline-v2">
      <div className="tlv2-body">
        {/* Left: layer names — the shared-selection handles, same as the classic strip.
            A ▸ caret expands a layer into its property sub-rows. */}
        <div className="tlv2-labels">
          <div style={{ height: RULER_H + CLIPS_H }} aria-hidden="true" />
          {displayRows.list.map((r) =>
            r.prop !== undefined ? (
              <span
                key={r.key}
                className="timeline-label tlv2-prop-label"
                data-proprow={`${r.layerKey}::${r.prop}`}
                title={`${r.layerKey} · ${r.prop}`}
                style={{ height: r.height, lineHeight: `${r.height}px` }}
              >
                {r.label}
              </span>
            ) : (
              <span
                key={r.key}
                className={`timeline-label clickable${selectedParts.includes(r.key) ? ' selected' : ''}`}
                data-part={r.key}
                title={`${r.key} — click to select this element (on the canvas too); shift-click adds to the selection`}
                style={{ height: r.height, lineHeight: `${r.height}px` }}
                onClick={(e) => {
                  if (e.shiftKey) toggleSelectedPart(r.key);
                  else setSelectedPart(selectedPart === r.key && selectedParts.length === 1 ? null : r.key);
                }}
              >
                {animatedProps(data, r.key).length > 0 ? (
                  <button
                    className={`tlv2-expand${expanded.has(r.key) ? ' open' : ''}`}
                    title={expanded.has(r.key) ? 'Collapse the property rows' : 'Expand into one row per animated property'}
                    data-testid={`tlv2-expand-${r.key.replace(/[^\w-]/g, '')}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(r.key);
                    }}
                  >
                    {expanded.has(r.key) ? '▾' : '▸'}
                  </button>
                ) : (
                  <span className="tlv2-expand-spacer" aria-hidden="true" />
                )}
                {r.label}
              </span>
            ),
          )}
          {/* Measured motion: not a selectable layer — a code-owned segment. */}
          {measuredRows.map((m) => (
            <span
              key={`measured-${m.target}`}
              className="timeline-label tlv2-measured-label"
              title={`${m.target} — measured motion, built in code by ${m.segments.map((s) => `${s.build}()`).join(', ')}`}
              style={{ height: MEASURED_ROW_H, lineHeight: `${MEASURED_ROW_H}px` }}
            >
              <span className="tlv2-expand-spacer" aria-hidden="true" />
              {m.target}
            </span>
          ))}
          {/* Lifecycle calls: step-level side effects, not a layer. */}
          {callMarks.length > 0 && (
            <span
              className="timeline-label tlv2-measured-label"
              title={`Lifecycle calls — named functions in template.js the steps fire: ${[...new Set(callMarks.map((c) => `${c.call}()`))].join(', ')}`}
              style={{ height: MEASURED_ROW_H, lineHeight: `${MEASURED_ROW_H}px` }}
            >
              <span className="tlv2-expand-spacer" aria-hidden="true" />
              lifecycle
            </span>
          )}
        </div>

        <div className="tlv2-scroll" ref={scrollRef}>
          <div
            className="tlv2-canvas"
            style={{ width: canvasW, height: RULER_H + CLIPS_H + displayRows.height + measuredH }}
            onPointerDown={onCanvasDown}
            onPointerMove={onCanvasMove}
            onPointerUp={onCanvasUp}
            onPointerCancel={() => setTlLasso(null)}
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

            {/* Layer rows (aggregate diamonds) and their expanded property sub-rows
                (single-property diamonds — the same interactions, scoped to one track). */}
            {displayRows.list.map((r) => {
              const isProp = r.prop !== undefined;
              const diamonds = isProp ? propDiamonds(r.layerKey, r.prop!) : diamondsFor(r.layerKey);
              return (
                <div
                  key={r.key}
                  className={`tlv2-row${isProp ? ' prop' : ''}${!isProp && selectedParts.includes(r.key) ? ' selected' : ''}`}
                  style={{ top: RULER_H + CLIPS_H + r.top, height: r.height }}
                >
                  {!isProp &&
                    (() => {
                      // The layer's existence block: activation step → the step it LEAVES (its
                      // `hides` step, else the end of Out), with its keyframed entering/exiting
                      // phases emphasized. The left edge moves the activation; the right edge
                      // sets the early exit.
                      const act = activationStep(data, r.key);
                      const actSeg = segs[act];
                      const hIdx = hideStep(data, r.key);
                      const hSeg = segs[hIdx] ?? segs[segs.length - 1];
                      if (!actSeg || !hSeg) return null;
                      const speed = data.speed || 1;
                      const dragging = blockDrag?.moved && blockDrag.key === r.key;
                      const hideDragging = hideDrag?.moved && hideDrag.key === r.key;
                      const x0 = dragging ? blockDrag!.x : actSeg.x;
                      const x1 = hideDragging ? hideDrag!.x : hSeg.x + hSeg.w;
                      const spanIn = kfSpan(act, r.key);
                      // The exit phase is emphasized on the step the layer leaves (Out, or its
                      // early-exit step) — not necessarily the final step.
                      const spanOut = act === hIdx ? null : kfSpan(hIdx, r.key);
                      return (
                        <>
                          <span
                            className="tlv2-block"
                            style={{ left: x0, width: Math.max(0, x1 - x0) }}
                            data-testid={`tlv2-block-${r.key.replace(/[^\w-]/g, '')}`}
                          />
                          {spanIn && !dragging && (
                            <span
                              className="tlv2-block-phase"
                              style={{
                                left: actSeg.x + (spanIn[0] / speed) * pxPerSec,
                                width: Math.max(3, ((spanIn[1] - spanIn[0]) / speed) * pxPerSec),
                              }}
                              title="Entering — this layer's keyframed motion in its first step"
                            />
                          )}
                          {spanOut && !hideDragging && (
                            <span
                              className="tlv2-block-phase"
                              style={{
                                left: hSeg.x + (spanOut[0] / speed) * pxPerSec,
                                width: Math.max(3, ((spanOut[1] - spanOut[0]) / speed) * pxPerSec),
                              }}
                              title={hIdx === segs.length - 1 ? "Exiting — this layer's keyframed motion in Out" : 'Exiting early — this layer leaves in this step'}
                            />
                          )}
                          {blockEligible(r.key) && (
                            <span
                              className="tlv2-block-edge"
                              style={{ left: x0 }}
                              title="When this layer appears — drag to a step boundary (▶ Play or a » press), same move as the canvas chip"
                              data-testid={`tlv2-block-edge-${r.key.replace(/[^\w-]/g, '')}`}
                              onPointerDown={(e) => startBlockDrag(e, r.key, actSeg.x)}
                              onPointerMove={moveBlockDrag}
                              onPointerUp={endBlockDrag}
                              onPointerCancel={() => setBlockDrag(null)}
                            />
                          )}
                          {hideEligible(r.key) && (
                            <span
                              className="tlv2-block-edge tlv2-block-edge-right"
                              style={{ left: x1 }}
                              title="When this layer leaves — drag to a step boundary for an early exit, or to the far right (Out) to keep it to the end"
                              data-testid={`tlv2-block-hide-${r.key.replace(/[^\w-]/g, '')}`}
                              onPointerDown={(e) => startHideDrag(e, r.key, x1)}
                              onPointerMove={moveHideDrag}
                              onPointerUp={endHideDrag}
                              onPointerCancel={() => setHideDrag(null)}
                            />
                          )}
                        </>
                      );
                    })()}
                  {!isProp &&
                    segs.map((seg) =>
                      seg.step.reveals?.includes(r.key) ? (
                        <span key={`rv-${seg.i}`} className="tlv2-reveal" style={{ left: seg.x + 2 }} title="This layer first appears in this step">
                          ▸
                        </span>
                      ) : null,
                    )}
                  {/* Looping tracks: a repeat tail after the pass's last keyframe. Read-only —
                      the repeat is a property of the track, not a moment you could drag. */}
                  {segs.flatMap((seg) =>
                    loopBarsFor(seg.i, r.layerKey, r.prop).map((bar, bi) => {
                      // A loop can outlive the authored timeline (an endless one always does;
                      // a finite one can too, since a step's duration is a floor, not a cap).
                      // Clamp the tail to the drawn extent and drop its closing cap, so it
                      // reads as "still going past here" instead of spilling off the canvas.
                      const limit = canvasW - 4;
                      const runsOff = bar.to === null || bar.to > limit;
                      const end = bar.to === null ? limit : Math.min(bar.to, limit);
                      return (
                        <span
                          key={`loop-${seg.i}-${bi}`}
                          className={`tlv2-loop${runsOff ? ' endless' : ''}`}
                          style={{ left: bar.from, width: Math.max(18, end - bar.from) }}
                          title={bar.title}
                          data-testid={`tlv2-loop-${r.layerKey.replace(/[^\w-]/g, '')}${r.prop ? `-${r.prop}` : ''}`}
                        >
                          <span className="tlv2-loop-label">{bar.label}</span>
                        </span>
                      );
                    }),
                  )}
                  {diamonds.map((d, di) => {
                    const ref: KfRef = { key: r.layerKey, step: d.step, tRel: d.tRel, prop: r.prop };
                    const grabbed = kfDrag?.moved && sameRef(kfDrag.grabbed, ref);
                    const inDragSet = kfDrag?.moved && kfDrag.refs.some((s) => sameRef(s, ref));
                    const selected = isKfSelected(ref);
                    return (
                      <span
                        key={di}
                        className={`tlv2-diamond${editable ? ' editable' : ''}${selected ? ' selected' : ''}${inDragSet ? ' dragging' : ''}`}
                        style={{
                          left: grabbed ? kfDrag!.x : inDragSet ? d.x + (kfDrag!.x - kfDrag!.startX) : d.x,
                        }}
                        title={
                          (isProp ? `${r.label} keyframe` : d.n > 1 ? `${d.n} property keyframes` : 'keyframe') +
                          (editable
                            ? ' — drag to retime (the whole selection moves), shift-click to add to the set, Delete removes, Ctrl+C/V copies and pastes at the playhead'
                            : '')
                        }
                        data-testid={`tlv2-kf-${r.layerKey.replace(/[^\w-]/g, '')}${isProp ? `-${r.prop}` : ''}`}
                        onPointerDown={(e) => startKfDrag(e, ref, d.x)}
                        onPointerMove={moveKfDrag}
                        onPointerUp={endKfDrag}
                        onPointerCancel={() => setKfDrag(null)}
                        onContextMenu={(e) => {
                          if (!editable) return;
                          e.preventDefault();
                          e.stopPropagation();
                          setKfSels([ref]);
                          setSelectedPart(r.layerKey);
                          setKfMenu({ x: e.clientX, y: e.clientY, ref });
                        }}
                      >
                        ◆
                      </span>
                    );
                  })}
                </div>
              );
            })}

            {/* Measured-motion rows: read-only bars for the step `dynamics`. The bar starts
                where the segment joins the step clock and runs to the end of the timeline —
                its true length is measured from the operator's content at play time, so any
                fixed width we drew would be a lie. There are no diamonds and no drag: this
                motion is code-owned by design, and the bar says where to edit it. */}
            {measuredRows.map((m, mi) => (
              <div
                key={`measured-${m.target}`}
                className="tlv2-row tlv2-measured-row"
                style={{ top: RULER_H + CLIPS_H + displayRows.height + mi * MEASURED_ROW_H, height: MEASURED_ROW_H }}
              >
                {m.segments.map((s, si) => {
                  const seg = segs[s.step];
                  if (!seg) return null;
                  const x = seg.x + (s.time / (data.speed || 1)) * pxPerSec;
                  return (
                    <span
                      key={si}
                      className="tlv2-measured"
                      style={{ left: x, width: Math.max(24, canvasW - x - 4) }}
                      title={`Measured motion — built by ${s.build}() in template.js, which reads the DOM and returns the tween. Its length depends on the content, so it isn't keyframed here; edit it in the code.`}
                      data-testid={`tlv2-measured-${s.build}`}
                    >
                      <span className="tlv2-measured-name">{s.build}()</span>
                      <span className="tlv2-measured-tail" aria-hidden="true">
                        measured at play
                      </span>
                    </span>
                  );
                })}
              </div>
            ))}

            {/* Lifecycle calls (§3b): one read-only mark per call, at its moment on the step's
                clock, naming the function the step fires. A side effect has no duration and
                nothing to interpolate, so it is a mark — not a keyframe you could drag. */}
            {callMarks.length > 0 && (
              <div
                className="tlv2-row tlv2-measured-row"
                style={{ top: RULER_H + CLIPS_H + displayRows.height + callsRowTop, height: MEASURED_ROW_H }}
              >
                {callMarks.map((c, ci) => {
                  const seg = segs[c.step];
                  if (!seg) return null;
                  return (
                    <span
                      key={ci}
                      className="tlv2-call"
                      style={{ left: seg.x + (c.time / (data.speed || 1)) * pxPerSec }}
                      title={`${c.call}() — a lifecycle call: this step runs that function from template.js at this moment. It is a side effect, not motion, so there is nothing to keyframe; edit it in the code.`}
                      data-testid={`tlv2-call-${c.call}`}
                    >
                      <span className="tlv2-call-pin" aria-hidden="true">
                        ⬧
                      </span>
                      <span className="tlv2-call-name">{c.call}()</span>
                    </span>
                  );
                })}
              </div>
            )}

            {/* The keyframe lasso marquee — same amber box as the canvas selection. */}
            {tlLasso?.active && (
              <div
                className="tlv2-lasso"
                data-testid="tlv2-lasso"
                style={{
                  left: Math.min(tlLasso.x0, tlLasso.x1),
                  top: Math.min(tlLasso.y0, tlLasso.y1),
                  width: Math.abs(tlLasso.x1 - tlLasso.x0),
                  height: Math.abs(tlLasso.y1 - tlLasso.y0),
                }}
              />
            )}

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
          <button
            className="timeline-zoom-btn"
            onClick={() => {
              manualZoomRef.current = true; // the user owns the zoom from here on
              setPxPerSec((z) => Math.max(40, z / 1.3));
            }}
            title="Zoom out"
            data-testid="tlv2-zoom-out"
          >
            −
          </button>
          <button
            className="timeline-zoom-btn"
            onClick={() => {
              manualZoomRef.current = true;
              setPxPerSec((z) => Math.min(1000, z * 1.3));
            }}
            title="Zoom in"
            data-testid="tlv2-zoom-in"
          >
            +
          </button>
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
          moment — Auto inherits the step's curve. A layer-row diamond curves every
          property keyed here; a sub-row diamond curves only its own track. */}
      {kfMenu && (
        <div className="tlv2-menu" style={{ left: kfMenu.x, top: kfMenu.y }} data-testid="tlv2-kf-menu">
          <select
            className="tlv2-out-mode"
            value={(() => {
              const tracks = data.steps[kfMenu.ref.step]?.layers[kfMenu.ref.key] ?? {};
              for (const [trackProp, kfs] of Object.entries(tracks)) {
                if (kfMenu.ref.prop !== undefined && trackProp !== kfMenu.ref.prop) continue;
                const kf = kfs.find((k) => Math.abs(k.time - kfMenu.ref.tRel) < 0.005);
                if (kf) return kf.ease ?? 'auto';
              }
              return 'auto';
            })()}
            onChange={(e) => {
              const next = setKeyframeEase(
                data, kfMenu.ref.step, kfMenu.ref.key, kfMenu.ref.tRel,
                e.target.value === 'auto' ? null : e.target.value,
                kfMenu.ref.prop, // a sub-row curves only its own track
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
