import { useEffect, useRef, useState, useMemo, type RefObject } from 'react';
import { useTemplateStore } from '../store/templateStore';
import {
  parseTimeline,
  patchStepEase,
  patchStepRegroup,
  patchStepTiming,
  patchTweenEase,
  patchTweenTiming,
  type TimelineTween,
} from '../blocks/timelineModel';
import { readAnimationInfo, setStepsMode, withStepsSetting } from '../blocks/animPatch';
import { countLines, detectPrefix } from '../model/structure';
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

/** T3.3 — a line being dragged toward another » segment (regroup). */
interface RegroupDrag {
  target: string;
  fromStep: number;
  x: number;
  y: number;
  /** The » tab currently under the pointer (its step index; steps.length = the »+ target). */
  overStep: number | null;
}

/** What a bar DOES, in plain words — derived from the tween's animated props. Ordered by
 *  visual dominance; the two strongest verbs are shown inside the bar (e.g. "slide + fade"). */
const PROP_VERBS: [RegExp, string][] = [
  [/^clipPath$/, 'wipe'],
  [/^filter$/, 'blur'],
  [/^scaleX$/, 'draw'],
  [/^scale[YZ]?$/, 'pop'],
  [/^skew/, 'skew'],
  [/^(x|y|xPercent|yPercent)$/, 'slide'],
  [/^opacity$/, 'fade'],
];

function actionLabel(tween: Pick<TimelineTween, 'kind' | 'props'>): string {
  if (tween.kind === 'set') return '';
  const verbs: string[] = [];
  for (const [re, verb] of PROP_VERBS) {
    if (tween.props.some((p) => re.test(p)) && !verbs.includes(verb)) verbs.push(verb);
  }
  return verbs.slice(0, 2).join(' + ');
}

/** A GSAP ease string in plain words: the vocabulary name when the curve is one of ours
 *  ('expo.out' → 'Expo'), else the title-cased family ('power3.in' → 'Power3'). The raw
 *  string stays available in tooltips. */
function easeName(gsap: string, direction: 'in' | 'out'): string {
  const known = EASINGS.find((e) => (direction === 'in' ? e.gsapIn : e.gsapOut) === gsap);
  if (known) return known.name;
  if (gsap === 'none') return 'Linear';
  const family = gsap.split('.')[0];
  return family.charAt(0).toUpperCase() + family.slice(1);
}

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
  // The category's class prefix + visible line count — for friendly labels and the »+ button.
  const prefix = useMemo(() => detectPrefix(template.html), [template.html]);
  const lineCount = useMemo(() => countLines(template.html), [template.html]);
  const stepsOn = template.js.includes('function revealNextStep');
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
  // T3.3 regroup-drag state (same hook-placement rule).
  const [regroup, setRegroup] = useState<RegroupDrag | null>(null);
  const regroupRef = useRef<RegroupDrag | null>(null);
  regroupRef.current = regroup;

  // Announce the moment steps turn ON (via »+, the Motion checkbox, or undo/redo) — ▶ Play
  // behaves differently from that moment on, and silent behavior changes tested badly.
  const [stepsNotice, setStepsNotice] = useState(false);
  const prevStepsOn = useRef(stepsOn);
  useEffect(() => {
    const was = prevStepsOn.current;
    prevStepsOn.current = stepsOn;
    if (stepsOn && !was) {
      setStepsNotice(true);
      const t = setTimeout(() => setStepsNotice(false), 8000);
      return () => clearTimeout(t);
    }
    if (!stepsOn) setStepsNotice(false);
  }, [stepsOn]);

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
    // Blank/imported templates (no managed region) get no strip at all. A marked region the
    // parser can't read gets an honest one-liner instead of silently vanishing.
    if (!readAnimationInfo(template.js).hasRegion) return null;
    return (
      <div className="timeline-strip collapsed" data-testid="timeline">
        <div className="timeline-head">
          <p className="timeline-hint" data-testid="timeline-unreadable">
            This animation is hand-crafted beyond what the timeline can chart — the JS code is
            in charge. Applying a Motion preset brings the timeline back.
          </p>
        </div>
      </div>
    );
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
      duration: s.duration + s.stagger * Math.max(0, s.targets.length - 1),
      infinite: false,
      kind: 'step' as const,
      stepIndex: k,
    })),
    { id: 'out', marker: '■', label: 'Out', duration: outPhase.duration, infinite: outPhase.infinite, kind: 'out' },
  ];
  const seg = segments.find((s) => s.id === phaseId) ?? segments[0];
  // The ● On air pseudo-card between the steps and Out: the settled hold every graphic has.
  // It isn't a timeline (nothing animates) — selecting it shows the settled on-air look.
  const holdSelected = phaseId === 'hold';
  const total = Math.max(seg.duration, 0.001);
  const shown = Math.min(time, total);
  const frac = shown / total;
  // How the layer leaves air (the SPX `out` setting) — playout truth on the On air card.
  const outMode = template.settings.out ?? 'manual';
  const outBadge = outMode === 'none' ? 'no out' : /^\d+$/.test(outMode) ? `auto ${outMode}ms` : null;
  const holdSub =
    outMode === 'none' ? 'stays — no out' : /^\d+$/.test(outMode) ? `auto-out ${Number(outMode) / 1000}s` : 'until ■ Stop';
  /** The moment's cue, written under each card — the operator button that plays it. */
  const segSub = (s: Segment): string =>
    s.kind === 'in' ? 'on ▶ Play' : s.kind === 'out' ? 'on ■ Stop' : `on press ${s.stepIndex! + 1}`;

  const pickHold = () => {
    setPhaseId('hold');
    setScrubbing(true); // park until the next Play/Next/Stop reclaims the strip
    setTime(inPhase.duration);
    sendScrub('in', inPhase.duration); // the settled end of the entrance IS the on-air look
  };

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

  // ── T3.3: drag a line onto another » segment to regroup what each Continue reveals ──
  const startRegroup = (e: React.PointerEvent, target: string, fromStep: number) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setRegroup({ target, fromStep, x: e.clientX, y: e.clientY, overStep: null });
  };

  const moveRegroup = (e: React.PointerEvent) => {
    const r = regroupRef.current;
    if (!r) return;
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-step-drop]');
    setRegroup({
      ...r,
      x: e.clientX,
      y: e.clientY,
      overStep: under ? Number(under.getAttribute('data-step-drop')) : null,
    });
  };

  const endRegroup = () => {
    const r = regroupRef.current;
    setRegroup(null);
    if (!r || r.overStep === null || r.overStep === r.fromStep) return;
    const emptied = model.steps[r.fromStep].targets.length === 1;
    // Dropping the LAST step's only line on »+ would just re-create the same step.
    if (r.overStep === model.steps.length && emptied && r.fromStep === model.steps.length - 1) return;
    const js = patchStepRegroup(template.js, r.target, r.fromStep, r.overStep);
    if (!js) return;
    // withStepsSetting: a merge/split changes the press count — the SPX definition follows.
    applyTemplate({ ...template, ...withStepsSetting(template, js) });
    requestReplay();
    // Follow the moved line to its destination segment (indices shift when a step empties).
    let dest = Math.min(r.overStep, model.steps.length);
    if (emptied && r.fromStep < dest) dest -= 1;
    setPhaseId(`step-${dest + 2}`);
  };

  /** Turn step reveal off from the strip (the Motion checkbox's counterpart) — everything
   *  goes back to appearing with ▶ Play. */
  const turnOffSteps = () => {
    applyTemplate({ ...template, ...setStepsMode(template, false) });
    setPhaseId('in'); // the selected step segment ceases to exist
    requestReplay();
  };

  /** The "appears on" menu (a step row's when-control): move a line to another » Next
   *  press — or give it its own — with a plain dropdown. Exactly the patch that dropping
   *  the row on a » tab writes, minus the drag. */
  const moveLineTo = (target: string, toStep: number) => {
    const fromStep = seg.stepIndex!;
    if (toStep === fromStep) return;
    const emptied = model.steps[fromStep].targets.length === 1;
    // Moving the LAST step's only line to "a new press" would just re-create the same step.
    if (toStep === model.steps.length && emptied && fromStep === model.steps.length - 1) return;
    const js = patchStepRegroup(template.js, target, fromStep, toStep);
    if (!js) return;
    applyTemplate({ ...template, ...withStepsSetting(template, js) });
    requestReplay();
    // Follow the moved line to its destination segment (indices shift when a step empties).
    let dest = Math.min(toStep, model.steps.length);
    if (emptied && fromStep < dest) dest -= 1;
    setPhaseId(`step-${dest + 2}`);
  };

  // ── The »+ Step button: grow the Continue chain without knowing the internals ─────
  // Steps off → turn step reveal on (the SAME patch as the Motion panel's checkbox).
  // Steps on → split the last multi-line reveal group into a new Continue step.
  const stepsSupported =
    !['end-credits', 'ticker', 'starting-soon', 'countdown', 'infographic', 'quiz'].includes(template.type);
  const splitFrom = (() => {
    for (let i = model.steps.length - 1; i >= 0; i--) {
      const s = model.steps[i];
      if (s.groupable && s.targets.length > 1) return i;
    }
    return -1;
  })();
  // Why »+ Step is unavailable right now (null = clickable) — shown as the disabled button's
  // tooltip, so the affordance explains itself instead of vanishing.
  const addStepBlocked = !stepsOn
    ? lineCount > 1
      ? null
      : 'Steps need at least two text lines — add another field in the Data tab first'
    : splitFrom !== -1
      ? null
      : 'Every line already has its own press — merge lines first (a line\'s "appears on" menu, or drag its row onto another » card)';
  const canAddStep = stepsSupported && !addStepBlocked;

  const addStep = () => {
    if (!stepsOn) {
      applyTemplate({ ...template, ...setStepsMode(template, true) });
    } else {
      const group = model.steps[splitFrom];
      const js = patchStepRegroup(template.js, group.targets[group.targets.length - 1], splitFrom, model.steps.length);
      if (!js) return;
      applyTemplate({ ...template, ...withStepsSetting(template, js) });
    }
    requestReplay(); // play it — the new step is one » Next press away
  };

  const scrubTo = (raw: number) => {
    if (holdSelected) setPhaseId('in'); // dragging out of the hold scrubs the entrance
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

  // ── Friendly row labels: name the ELEMENT in plain words (the raw selector stays in
  //    the tooltip). `#fN` targets use the operator field's title from the definition.
  const friendlyTarget = (t: string): string => {
    if (prefix) {
      if (t === `.${prefix}`) return 'Whole graphic';
      if (t === `.${prefix}-box`) return 'Panel';
      if (t === `.${prefix}-accent`) return 'Accent line';
      if (t.startsWith(`.${prefix}-`)) {
        const part = t.slice(prefix.length + 2);
        return part.charAt(0).toUpperCase() + part.slice(1);
      }
    }
    if (/^#f\d+$/.test(t)) {
      const field = template.fields.find((f) => f.field === t.slice(1));
      return field?.title || t;
    }
    return t;
  };
  const label = (targets: string[]) => targets.map(friendlyTarget).join(' + ');

  /** The rows shown for the selected segment: the phase's tweens, or ONE ROW PER LINE of
   *  the step's reveal group (each offset by the group stagger — drag a row to regroup). */
  const step = seg.kind === 'step' ? model.steps[seg.stepIndex!] : null;
  const rows = step
    ? step.targets.map((t, li) => ({
        targets: [t],
        kind: 'to' as const,
        props: ['yPercent'],
        duration: step.duration,
        stagger: 0,
        start: li * step.stagger,
        end: li * step.stagger + step.duration,
        editable: true,
        ease: step.ease,
      }))
    : (seg.kind === 'in' ? inPhase : outPhase).tweens;

  return (
    <div className={`timeline-strip${collapsed ? ' collapsed' : ''}`} data-testid="timeline">
      <div className="timeline-head">
        <button className="timeline-collapse" onClick={toggleCollapsed} title={collapsed ? 'Expand the timeline' : 'Collapse the timeline'}>
          {collapsed ? '▸' : '▾'}
        </button>
        {segments.map((s) => (
          <span key={s.id} style={{ display: 'contents' }}>
            {/* »+ Step — click to grow the Continue chain (turns steps on, or splits a
                multi-line reveal); doubles as the new-step DROP target while regrouping. */}
            {s.kind === 'out' && (regroup || stepsSupported) && (
              <button
                className={`tab timeline-seg timeline-newstep${regroup?.overStep === model.steps.length ? ' drop-target' : ''}`}
                data-step-drop={model.steps.length}
                data-testid="timeline-seg-new"
                disabled={!regroup && !canAddStep}
                onClick={regroup || !canAddStep ? undefined : addStep}
                title={
                  !regroup && addStepBlocked
                    ? addStepBlocked
                    : !stepsOn
                      ? 'Add a Continue step — ▶ Play then shows only the first line; each » Next press reveals the next one'
                      : 'Add a Continue step — splits the last multi-line reveal so its last line gets its own » Next press'
                }
              >
                <span className="timeline-seg-main"><span className="timeline-marker">»</span> + Step</span>
                <span className="timeline-seg-sub" aria-hidden="true">adds a press</span>
              </button>
            )}
            {/* ● On air — the hold between the last reveal and the exit, made visible. */}
            {s.kind === 'out' && (
              <button
                className={`tab timeline-seg timeline-hold${holdSelected ? ' active' : ''}`}
                onClick={pickHold}
                title={`The hold — the graphic sits settled on air ${outBadge ? `(${outBadge})` : 'until ■ Stop'}; » steps play during it`}
                data-testid="timeline-seg-hold"
              >
                <span className="timeline-seg-main"><span className="timeline-marker">●</span> On air</span>
                <span className="timeline-seg-sub" aria-hidden="true">{holdSub}</span>
              </button>
            )}
            <button
              className={`tab timeline-seg ${s.id === phaseId ? 'active' : ''}${
                regroup && s.kind === 'step' && regroup.overStep === s.stepIndex ? ' drop-target' : ''
              }`}
              onClick={() => pickSegment(s.id)}
              title={
                s.kind === 'step'
                  ? `Continue step ${s.label} — plays on press ${Number(s.label) - 1} of the » Next button`
                  : s.kind === 'in'
                    ? 'The entrance — plays on ▶ Play'
                    : `The exit — plays on ■ Stop${outBadge ? ` (${outBadge})` : ''}`
              }
              data-testid={`timeline-seg-${s.id}`}
              {...(s.kind === 'step' ? { 'data-step-drop': s.stepIndex } : {})}
            >
              <span className="timeline-seg-main">
                <span className="timeline-marker">{s.marker}</span> {s.label} {s.infinite ? '∞' : `${s.duration.toFixed(2)}s`}
              </span>
              <span className="timeline-seg-sub" aria-hidden="true">{segSub(s)}</span>
            </button>
          </span>
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
          <span
            className="hint timeline-knobs"
            title={`animSpeed ×${model.animSpeed} · easeIn ${model.easeIn} · easeOut ${model.easeOut}`}
          >
            ×{model.animSpeed} · {easeName(model.easeIn, 'in')} / {easeName(model.easeOut, 'out')}
          </span>
        )}
      </div>

      {/* The one-time announcement when steps turn on — ▶ Play changed its behavior. */}
      {stepsNotice && !collapsed && (
        <p className="timeline-notice" data-testid="timeline-notice">
          Step reveal is on — ▶ Play now shows only the first line; each press of » Next
          reveals one more.
        </p>
      )}

      {/* The hold has no tracks — nothing animates; say what happens instead. */}
      {!collapsed && holdSelected && (
        <div className="timeline-tracks">
          <p className="timeline-hold-note" data-testid="timeline-hold-note">
            The graphic holds here, settled,{' '}
            {outMode === 'none'
              ? 'and never leaves on its own (no out is set).'
              : /^\d+$/.test(outMode)
                ? `then leaves by itself after ${Number(outMode) / 1000}s.`
                : 'until ■ Stop plays the exit.'}
            {model.steps.length > 0 && ' Each » Next press plays during this hold.'}
          </p>
        </div>
      )}

      {!collapsed && !holdSelected && (
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
                        ? `instant set · ${tw.props.join(', ')}`
                        : `${(step ? 'reveal' : actionLabel(tw)) || 'animate'} (${tw.props.join(', ')}) · ${(d ? start : tw.start).toFixed(2)}–${(d ? start + span : tw.end).toFixed(2)}s${tw.stagger ? ` · stagger ${tw.stagger.toFixed(2)}s` : ''}${
                            step?.groupable
                              ? ' — drag onto another » step to regroup, edge to stretch'
                              : tw.editable
                                ? ' — drag to retime, edge to stretch'
                                : ''
                          }`
                    }
                    data-testid={`timeline-bar-${i}`}
                    onPointerDown={
                      !tw.editable
                        ? undefined
                        : step?.groupable
                          ? (e) => startRegroup(e, tw.targets[0], seg.stepIndex!) // drag onto another » tab
                          : step
                            ? (e) => startBarDrag(e, i, 'resize', { start: tw.start, duration: tw.duration })
                            : (e) => startBarDrag(e, i, 'move', { start: tw.start, duration: tw.duration })
                    }
                    onPointerMove={(e) => { moveBarDrag(e); moveRegroup(e); }}
                    onPointerUp={() => { endBarDrag(); endRegroup(); }}
                    onPointerCancel={() => { setBarDrag(null); setRegroup(null); }}
                  >
                    {/* What this bar does, in plain words — steps are always reveals. */}
                    {tw.kind !== 'set' && (
                      <span className="timeline-bar-verb" aria-hidden="true">
                        {step ? 'reveal' : actionLabel(tw)}
                      </span>
                    )}
                    {tw.editable && tw.kind !== 'set' && (
                      <span
                        className="timeline-bar-handle"
                        data-testid={`timeline-handle-${i}`}
                        onPointerDown={(e) => startBarDrag(e, i, 'resize', { start: tw.start, duration: tw.duration })}
                      />
                    )}
                  </div>
                </div>
                {/* A step row's when-control: which » Next press this line appears on. */}
                {step?.groupable && (
                  <select
                    className="timeline-appears"
                    value={seg.stepIndex}
                    onChange={(e) => moveLineTo(tw.targets[0], Number(e.target.value))}
                    title="Which press of » Next reveals this line — pick another press to move it there"
                    data-testid={`timeline-appears-${i}`}
                  >
                    {model.steps.map((_, k) => (
                      <option key={k} value={k}>{`appears on press ${k + 1}`}</option>
                    ))}
                    {/* "Its own press" — hidden when that would re-create this same step. */}
                    {!(step.targets.length === 1 && seg.stepIndex === model.steps.length - 1) && (
                      <option value={model.steps.length}>appears on a new press</option>
                    )}
                  </select>
                )}
                {/* The tween's own ease; 'auto' inherits the phase knob. In a step segment
                    the ease belongs to the GROUP — one chip on the first row. */}
                {tw.editable && (!step || i === 0) ? (
                  <select
                    className="timeline-ease"
                    value={tw.ease ?? 'auto'}
                    onChange={(e) => pickEase(i, e.target.value)}
                    title="How this move accelerates (its ease) — 'auto' follows the phase's easing knob"
                    data-testid={`timeline-ease-${i}`}
                  >
                    <option value="auto">ease · auto</option>
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

      {/* One line of context so the gestures are discoverable without hovering. */}
      {!collapsed && !holdSelected && (
        <p className="timeline-hint" data-testid="timeline-hint">
          {step ? (
            <>
              {'Plays on one press of the » button — the "appears on" menu moves a line to another press. '}
              <button
                className="timeline-hint-action"
                onClick={turnOffSteps}
                title="Remove all Continue steps — every line appears with ▶ Play again (undo with Ctrl+Z)"
                data-testid="timeline-steps-off"
              >
                Turn off step reveal
              </button>
            </>
          ) : seg.kind === 'out'
            ? 'The exit (■ Stop) — drag a bar to retime it, drag its right edge to stretch, the menu sets its ease.'
            : 'The entrance (▶ Play) — drag a bar to retime it, drag its right edge to stretch, the menu sets its ease.'}
        </p>
      )}

      {/* T3.3 — the line chip following the pointer while regrouping. */}
      {regroup && (
        <div className="regroup-ghost" style={{ left: regroup.x + 10, top: regroup.y - 24 }}>
          {friendlyTarget(regroup.target)} → {regroup.overStep === null ? 'drop on a » card' : regroup.overStep === model.steps.length ? 'a new press' : `press ${regroup.overStep + 1}`}
        </div>
      )}
    </div>
  );
}
