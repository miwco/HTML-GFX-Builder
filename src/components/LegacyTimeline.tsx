import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { parseTimeline, buildOverview, type TimelineTween } from '../blocks/timelineModel';
import { detectPrefix, getTemplateParts } from '../model/structure';
import { emitPresetRegion, swappablePresetsForType } from '../blocks/presetRegistry';
import { importAnimData } from '../blocks/animImport';
import { replaceRegionWithAnimData } from '../templates/shared/animRuntime';
import type { AnimPresetId } from '../model/wizard';
import type { SpxWindow } from './PlayoutSimulator';

// Phase 8 (docs/TIMELINE_V2_PLAN.md · DYNAMIC_MOTION_SCOPE §8.1) — the LEGACY timeline,
// read-only by design.
//
// Every category now creates as a NOACG_ANIM data block, and any legacy region the importer
// can read is shown on the step timeline (read-only) with "use keyframes" one click away. What
// is left for THIS component is the case the importer honestly refuses: a marked region whose
// motion is measured inline (`x: -track.scrollWidth`), or looping on a nested timeline, or
// otherwise hand-written past what the keyframe model can hold. It cannot be auto-converted —
// the importer will not guess — and silently regenerating it would throw away the owner's
// tuning, which "code is the single source of truth" forbids.
//
// So it must still RENDER truthfully: the timeline never silently hides motion. It charts the
// region and follows the playhead, and offers no affordance it does not have — the editing
// patchers this strip used to carry are gone. The code is the editor here, and the note says so.

const HOLD_PX = 64;
const SEC_MIN_PX = 72;
const ROW_H = 20;
const OV_HEAD_H = 22;

const PROP_VERBS: [RegExp, string][] = [
  [/^(x|y|xPercent|yPercent)$/, 'move'],
  [/^scale/, 'scale'],
  [/^rotation/, 'rotate'],
  [/^opacity$/, 'fade'],
  [/^filter$/, 'blur'],
  [/^clipPath$/, 'wipe'],
  [/^width$/, 'grow'],
  [/^strokeDashoffset$/, 'draw'],
];

function actionLabel(tween: Pick<TimelineTween, 'kind' | 'props'>): string {
  if (tween.kind === 'set') return '';
  for (const p of tween.props) {
    const hit = PROP_VERBS.find(([re]) => re.test(p));
    if (hit) return hit[1];
  }
  return 'animate';
}

interface Props {
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

export default function LegacyTimeline({ iframeRef }: Props) {
  const template = useTemplateStore((s) => s.template);
  const sendScrub = useTemplateStore((s) => s.sendScrub);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const selectedPart = useTemplateStore((s) => s.selectedPart);
  const setSelectedPart = useTemplateStore((s) => s.setSelectedPart);

  const model = useMemo(() => parseTimeline(template.js), [template.js]);
  const prefix = useMemo(() => detectPrefix(template.html), [template.html]);
  const parts = useMemo(
    () => getTemplateParts(template.html, template.fields),
    [template.html, template.fields],
  );

  const [phaseId, setPhaseId] = useState<string>('in');
  const [time, setTime] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const scrubbingRef = useRef(scrubbing);
  scrubbingRef.current = scrubbing;
  const [pxPerSec, setPxPerSec] = useState(140);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fittedRef = useRef<string | null>(null);

  // Fit the whole playout once per template; the zoom buttons take over from there.
  useEffect(() => {
    if (!model || fittedRef.current === template.name) return;
    const el = scrollRef.current;
    if (!el || el.clientWidth < 120) return;
    const durations = [
      model.phases[0]?.duration ?? 0,
      ...model.steps.map((s) => s.duration + s.stagger * Math.max(0, s.targets.length - 1)),
      model.phases[model.phases.length - 1]?.duration ?? 0,
    ];
    const available = el.clientWidth - HOLD_PX - 16;
    const px = available / Math.max(0.5, durations.reduce((a, b) => a + b, 0));
    fittedRef.current = template.name;
    setPxPerSec(Math.min(400, Math.max(40, px)));
  }, [model, template.name]);

  // The live playhead follows the simulator's running timeline through In, every press, and Out.
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
      if (active && active !== lastActiveRef.current) {
        lastActiveRef.current = active; // a new run reclaims the playhead from a paused scrub
        if (scrubbingRef.current) setScrubbing(false);
      }
      if (!active) lastActiveRef.current = null;
      if (scrubbingRef.current) return;
      if (active) {
        if (active.phase !== phaseRef.current && knownIds.has(active.phase)) setPhaseId(active.phase);
        const dur = Math.max(active.tl.duration(), 0.001);
        setTime(active.tl.time() % (dur + 0.0001)); // endless loops wrap visually
      } else if (phaseRef.current === 'in') {
        setTime(inDur); // idle = settled at the end of the entrance
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [model, iframeRef]);

  /**
   * The one WRITE this surface offers, and it is not an edit of the hand-written motion: start
   * over from a preset. It replaces the marked region wholesale with modern DATA (the preset's
   * emit, converted) — so the escape hatch out of unconvertible code leads to the editable
   * timeline, never to more legacy code. Undo brings the hand-written version straight back.
   */
  const startOver = (presetId: AnimPresetId) => {
    const region = emitPresetRegion(template, presetId);
    if (!region) return;
    const OPEN = '/* == ANIMATION';
    const CLOSE = '/* == END ANIMATION == */';
    const start = template.js.indexOf(OPEN);
    const end = template.js.indexOf(CLOSE);
    if (start === -1 || end === -1) return;
    const legacy = template.js.slice(0, start) + region + template.js.slice(end + CLOSE.length);
    const data = importAnimData({ ...template, js: legacy });
    const js = data ? replaceRegionWithAnimData(legacy, data) : null;
    applyTemplate({ ...template, js: js ?? legacy });
    setActiveTab('js'); // the new region is real, highlighted code
  };

  const presetOptions = swappablePresetsForType(template.type);
  const hasRegion = template.js.includes('== ANIMATION');

  if (!model) {
    // No managed region at all (a blank/imported template) gets no strip. A region the parser
    // cannot read gets an honest one-liner — never a silent disappearance.
    if (!hasRegion) return null;
    return (
      <div className="timeline-strip collapsed" data-testid="timeline">
        <p className="timeline-hint" data-testid="timeline-unreadable">
          This animation is hand-crafted beyond what the timeline can chart — the JS code is in
          charge. Starting over from a preset brings the timeline back.
        </p>
        <div className="timeline-head">
          <StartOverSelect presets={presetOptions} onPick={startOver} />
        </div>
      </div>
    );
  }

  const inPhase = model.phases.find((p) => p.id === 'in') ?? model.phases[0];
  const outPhase = model.phases.find((p) => p.id === 'out') ?? model.phases[model.phases.length - 1];
  const overview = buildOverview(model, parts.map((p) => p.selector));

  const secPx = (sec: { kind: string; duration: number }) =>
    sec.kind === 'hold' ? HOLD_PX : Math.max(SEC_MIN_PX, sec.duration * pxPerSec);
  const secOffsets = new Map<string, number>();
  let x = 0;
  for (const sec of overview.sections) {
    secOffsets.set(sec.id, x);
    x += secPx(sec);
  }
  const canvasPx = x;

  const seg = overview.sections.find((s) => s.id === phaseId) ?? overview.sections[0];
  const segDur = seg.kind === 'in' ? inPhase.duration : seg.kind === 'out' ? outPhase.duration : seg.duration;
  const shown = Math.min(time, segDur);
  const playheadLeft = (secOffsets.get(seg.id) ?? 0) + shown * pxPerSec;

  const scrubTo = (t: number) => {
    setScrubbing(true);
    setTime(t);
    sendScrub(seg.id, t);
  };

  const friendlyTarget = (t: string): string => {
    const part = parts.find((p) => p.selector === t);
    if (part) return part.label;
    if (prefix && t.startsWith(`.${prefix}-`)) return t.slice(prefix.length + 2).replace(/-/g, ' ');
    return t;
  };

  return (
    <div className="timeline-strip" data-testid="timeline">
      {/* The honest note gets its OWN line: it is a sentence, not a control, and squeezing it
          into the control row collapses it to nothing. This surface's whole job is to tell the
          truth about code-owned motion — so the sentence has to be readable. */}
      <p className="timeline-hint" data-testid="timeline-readonly-note">
        Read-only: this animation is written by hand in a way the keyframe timeline cannot hold
        (measured motion, or a loop it would have to guess at). The code is in charge — edit it
        in the JS tab. Starting over from a preset gives you the editable timeline back.
      </p>
      <div className="timeline-head">
        <StartOverSelect presets={presetOptions} onPick={startOver} />
        <input
          className="timeline-scrub"
          type="range"
          min={0}
          max={Math.max(0.01, segDur)}
          step={0.01}
          value={shown}
          onChange={(e) => scrubTo(Number(e.target.value))}
          title="Scrub the preview through this moment"
          data-testid="timeline-scrub"
        />
        <span className="mono muted timeline-time" data-testid="timeline-time">
          {shown.toFixed(2)}s
        </span>
        <span className="timeline-zoom">
          <button className="timeline-zoom-btn" onClick={() => setPxPerSec((p) => Math.max(40, p / 1.4))} data-testid="timeline-zoom-out" title="Zoom out">
            −
          </button>
          <button className="timeline-zoom-btn" onClick={() => setPxPerSec((p) => Math.min(400, p * 1.4))} data-testid="timeline-zoom-in" title="Zoom in">
            +
          </button>
        </span>
      </div>

      {/* The cue-segmented overview: the whole playout as one strip, each section on its own
          real local clock (holds and presses wait for an operator, so a single global axis
          would fabricate times that don't exist on air). */}
      <div className="timeline-tracks timeline-ov" data-testid="timeline-overview">
        <div className="timeline-ov-labels">
          <div className="timeline-ov-corner" style={{ height: OV_HEAD_H }} aria-hidden="true" />
          {overview.rowKeys.map((key) => {
            const isPart = parts.some((p) => p.selector === key);
            const isSelected = selectedPart === key;
            return (
              <span
                key={key}
                className={`timeline-label${isPart ? ' clickable' : ''}${isSelected ? ' selected' : ''}`}
                data-part={key}
                title={isPart ? `${key} — click to select this element (on the canvas too)` : key}
                style={{ height: ROW_H, lineHeight: `${ROW_H}px` }}
                onClick={isPart ? () => setSelectedPart(isSelected ? null : key) : undefined}
              >
                {friendlyTarget(key)}
              </span>
            );
          })}
        </div>

        <div className="timeline-ov-scroll" ref={scrollRef}>
          <div
            className="timeline-ov-canvas"
            style={{
              width: canvasPx,
              height: OV_HEAD_H + overview.rowKeys.length * ROW_H,
              paddingTop: OV_HEAD_H,
            }}
          >
            {overview.sections.map((sec) => (
              <div
                key={`bg-${sec.id}`}
                className={`timeline-ov-secbg${sec.kind === 'hold' ? ' hold' : ''}${sec.id === phaseId ? ' active' : ''}`}
                style={{ left: secOffsets.get(sec.id), width: secPx(sec) }}
                aria-hidden="true"
              />
            ))}

            {/* Section headers — the ruler row; clicking parks the preview on that moment. */}
            {overview.sections.map((sec) => {
              const dur = sec.infinite ? '∞' : `${sec.duration.toFixed(2)}s`;
              const head =
                sec.kind === 'in'
                  ? `▶ In · ${dur}`
                  : sec.kind === 'out'
                    ? `■ Out · ${dur}`
                    : sec.kind === 'hold'
                      ? '● hold'
                      : `» ${sec.stepIndex! + 1} · ${dur}`;
              return (
                <button
                  key={`sec-${sec.id}`}
                  className={`timeline-ov-sec${sec.id === phaseId ? ' active' : ''}`}
                  style={{ left: secOffsets.get(sec.id), width: secPx(sec), height: OV_HEAD_H }}
                  onClick={() => {
                    if (sec.kind === 'hold') return;
                    setPhaseId(sec.id);
                    setScrubbing(true);
                    setTime(0);
                    sendScrub(sec.id, 0);
                  }}
                  title={
                    sec.kind === 'in'
                      ? 'The entrance — plays on ▶ Play'
                      : sec.kind === 'out'
                        ? 'The exit — plays on ■ Stop'
                        : sec.kind === 'hold'
                          ? 'The hold — the graphic sits settled on air'
                          : `Plays on press ${sec.stepIndex! + 1} of the » Next button`
                  }
                  data-testid={`timeline-ov-sec-${sec.id}`}
                >
                  {head}
                </button>
              );
            })}

            {/* Part rows — every bar the region actually plays, on its section's local clock. */}
            {overview.rowKeys.map((key) => (
              <div
                key={key}
                className={`timeline-ov-row${selectedPart === key ? ' selected' : ''}`}
                style={{ height: ROW_H }}
              >
                {overview.bars
                  .filter((b) => b.rowKey === key)
                  .map((b) => {
                    const verb = b.kind === 'reveal' ? 'reveal' : actionLabel({ kind: b.kind as TimelineTween['kind'], props: b.props });
                    return (
                      <div
                        key={`${b.sectionId}-${b.tweenIndex}-${b.member}`}
                        className={`timeline-bar ${b.kind === 'reveal' ? 'to' : b.kind}`}
                        style={{
                          left: (secOffsets.get(b.sectionId) ?? 0) + b.start * pxPerSec,
                          width: b.kind === 'set' ? undefined : Math.max(6, b.span * pxPerSec),
                        }}
                        title={
                          b.kind === 'set'
                            ? `instant set · ${b.props.join(', ')}`
                            : `${verb || 'animate'}${b.props.length ? ` (${b.props.join(', ')})` : ''} · ${b.start.toFixed(2)}–${(b.start + b.span).toFixed(2)}s — code-owned, edit it in the JS tab`
                        }
                        data-testid={
                          b.kind === 'reveal'
                            ? `timeline-bar-${b.sectionId}-r${b.member}`
                            : b.firstMember
                              ? `timeline-bar-${b.sectionId}-${b.tweenIndex}`
                              : `timeline-bar-${b.sectionId}-${b.tweenIndex}-m${b.member}`
                        }
                      >
                        {b.kind !== 'set' && (b.firstMember || b.kind === 'reveal') && (
                          <span className="timeline-bar-verb" aria-hidden="true">
                            {verb}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}

            <div
              className="timeline-playhead"
              data-testid="timeline-playhead"
              style={{ left: playheadLeft, top: OV_HEAD_H }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StartOverSelect({
  presets,
  onPick,
}: {
  presets: { id: AnimPresetId; name: string; description: string }[];
  onPick: (id: AnimPresetId) => void;
}) {
  return (
    <select
      className="timeline-ease timeline-preset"
      value=""
      onChange={(e) => e.target.value && onPick(e.target.value as AnimPresetId)}
      title="Replace the marked animation region with a preset — written as editable keyframe data. Undo (Ctrl+Z) brings the hand-written version back."
      data-testid="timeline-preset-reset"
    >
      <option value="" disabled>
        Start over with a preset…
      </option>
      {presets.map((p) => (
        <option key={p.id} value={p.id} title={p.description}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
