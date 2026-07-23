import { useEffect, useMemo, useRef, useState } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { getTemplateParts } from '../model/structure';
import {
  designBoxInfo,
  lineFit,
  lineTextStyle,
  placeLine,
  placedLines,
  setLineFit,
  setLineTextStyle,
  setSlotSize,
  slotSize,
  type LineFit,
  type LineFitMode,
  type LinePlacement,
  type LineTextPatch,
  type LineTextStyle,
} from '../blocks/designLayout';
import { setFieldDefault, setFieldTitle } from '../blocks/edit';
import { changePartPress } from '../blocks/stepAssign';
import { setLayerHide } from '../blocks/animEdit';
import { FONTS } from '../model/fonts';
import type { SpxTemplate } from '../model/types';
import { parseAnimData, type AnimData } from '../blocks/animData';
import { writeAnimData } from '../templates/shared/animRuntime';
import { importAnimData } from '../blocks/animImport';
import { lensRead, lensWrite, scrubPhase } from '../blocks/timelineLens';
import { deleteKeyframe, setFilterComponent, setKeyframe } from '../blocks/animEdit';
import { filterComponent } from '../blocks/filterTrack';
import { applyPresetData, presetDonor } from '../blocks/presetApply';
import { swappablePresetsForType, anyPresetById } from '../blocks/presetRegistry';
import { isSlidePreset } from '../templates/lowerThirds/animPresets';
import { activationStep, animatedProps, hideStep, resolveValue, stepSeconds } from '../blocks/animEval';
import { createStepFromLayer } from '../blocks/layerTimeline';
import type { AnimPresetId } from '../model/wizard';
import { EASINGS, resolveEasing, type EasingId } from '../model/easings';
import { phaseIdOf } from './StepTimeline';
import { partLocked } from './partLocks';

// Timeline v2 Phase 2/4 (docs/TIMELINE_V2_PLAN.md) — the Inspector: the persistent,
// context-sensitive panel to the right of the preview, and the third consumer of the
// shared selection (canvas ↔ timeline ↔ Inspector). On a data-block template the
// Properties tab EDITS: each property carries the familiar diamond — arm it to stamp a
// keyframe at the playhead, edit an armed value to auto-key there, click a diamond that
// sits ON a keyframe to remove it. Legacy templates show read-only resolved values (the
// timeline's "use keyframes" chip converts them).

/** The editable property vocabulary. `track` is the data-model property the keyframes live on;
 *  `filter`, when set, means the row edits ONE function inside the composed `filter` track (see
 *  blocks/filterTrack.ts) rather than owning a track of its own. `base` is the design-state value
 *  used when arming a property that has never animated. `group` marks the first row of a labelled
 *  section; `hint` is an optional row tooltip. Every row here is an ordinary GSAP property — the
 *  runtime interpreter tweens it with no special-casing, filters included (GSAP interpolates a
 *  composed filter string natively). */
const PROP_ROWS: {
  prop: string;
  track: string;
  /** The filterTrack key this row edits, for rows that share the composed `filter` track. */
  filter?: string;
  label: string;
  base: number;
  step: number;
  min?: number;
  max?: number;
  group?: string;
  hint?: string;
}[] = [
  { prop: 'x', track: 'x', label: 'Position X', base: 0, step: 1 },
  { prop: 'y', track: 'y', label: 'Position Y', base: 0, step: 1 },
  { prop: 'yPercent', track: 'yPercent', label: 'Y (mask %)', base: 0, step: 1 },
  { prop: 'scale', track: 'scale', label: 'Scale', base: 1, step: 0.05, min: 0 },
  { prop: 'opacity', track: 'opacity', label: 'Opacity', base: 1, step: 0.1, min: 0, max: 1 },
  { prop: 'rotation', track: 'rotation', label: 'Rotation', base: 0, step: 1 },
  // Filters (docs/PRESET_MODEL_REVIEW.md gap 8). These are NOT independent tracks: `filter` is
  // one CSS property holding a list of functions, so all five share a single composed `filter`
  // track — exactly as CSS itself models it. Editing one row re-composes the string, preserving
  // the others; a keyframe here therefore carries the whole filter.
  {
    prop: 'blur',
    track: 'filter',
    filter: 'blur',
    label: 'Blur (px)',
    base: 0,
    step: 1,
    min: 0,
    group: 'Filter',
    hint: 'These compose into one CSS filter, so they share a keyframe — the diamond stamps all of them at once.',
  },
  { prop: 'brightness', track: 'filter', filter: 'brightness', label: 'Brightness', base: 1, step: 0.05, min: 0, hint: '1 = unchanged. Below 1 darkens, above 1 blows out.' },
  { prop: 'saturate', track: 'filter', filter: 'saturate', label: 'Saturation', base: 1, step: 0.05, min: 0, hint: '1 = unchanged, 0 = greyscale.' },
  { prop: 'hueRotate', track: 'filter', filter: 'hueRotate', label: 'Hue (deg)', base: 0, step: 5 },
  { prop: 'glow', track: 'filter', filter: 'glow', label: 'Glow (px)', base: 0, step: 1, min: 0, hint: "A centred drop-shadow. It takes the element's own colour, so it glows in the design's palette." },
  // 3D transforms (docs/PRESET_MODEL_REVIEW.md gap 7). Ordinary numeric GSAP tracks —
  // rotationX/Y spin the layer in depth, z pushes it toward/away from the viewer, and
  // perspective is the depth that makes the rotations read as 3D (set it first, usually
  // once at the entrance). They pivot around the layer's transform-origin (the Pivot below).
  {
    prop: 'perspective',
    track: 'transformPerspective',
    label: 'Perspective',
    base: 600,
    step: 20,
    min: 0,
    group: '3D transform',
    hint: 'The depth of the 3D scene, in px. Without it, Rotate X/Y look flat — set it once (usually at the entrance).',
  },
  { prop: 'rotationX', track: 'rotationX', label: 'Rotate X', base: 0, step: 1, hint: 'Tilt around the horizontal axis (degrees).' },
  { prop: 'rotationY', track: 'rotationY', label: 'Rotate Y', base: 0, step: 1, hint: 'Spin around the vertical axis (degrees) — the card-flip axis.' },
  { prop: 'z', track: 'z', label: 'Depth (Z)', base: 0, step: 1, hint: 'Move toward or away from the viewer, in px (needs perspective to show).' },
];

const KIND_LABEL: Record<string, string> = {
  root: 'Graphic root',
  panel: 'Panel',
  accent: 'Accent',
  line: 'Text line',
  image: 'Image slot',
  block: 'Block element',
};

/** The row's current number: a filter row reads its function out of the composed string. */
const rowValue = (row: { filter?: string }, raw: number | string | null): number | null => {
  if (raw === null) return null;
  if (row.filter) return filterComponent(raw, row.filter);
  return typeof raw === 'number' ? raw : null;
};

export default function Inspector() {
  const template = useTemplateStore((s) => s.template);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const patchCss = useTemplateStore((s) => s.patchCss);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const sampleData = useTemplateStore((s) => s.sampleData);
  const setSampleValue = useTemplateStore((s) => s.setSampleValue);
  const requestReplay = useTemplateStore((s) => s.requestReplay);
  const sendScrub = useTemplateStore((s) => s.sendScrub);
  const setPlayhead = useTemplateStore((s) => s.setPlayhead);
  const selectedPart = useTemplateStore((s) => s.selectedPart);
  const selectedParts = useTemplateStore((s) => s.selectedParts);
  const partLocks = useTemplateStore((s) => s.partLocks);
  const setPartLock = useTemplateStore((s) => s.setPartLock);
  const playhead = useTemplateStore((s) => s.playhead);
  // A label drag-scrub in progress (the familiar drag-the-label-to-change-the-value).
  const scrubDrag = useRef<{ prop: string; startX: number; startValue: number; value: number } | null>(null);
  // Animations first on an imported design (see the placedDesign switch below). 'style' is
  // the placed-field Style section — offered only while such a field is selected.
  const [tab, setTab] = useState<'properties' | 'style' | 'animations'>(() =>
    designBoxInfo(template.html, template.css) ? 'animations' : 'properties',
  );
  const [presetId, setPresetId] = useState<AnimPresetId | ''>('');
  const [presetPhase, setPresetPhase] = useState<'in' | 'out' | 'both'>('in');
  const [presetEasing, setPresetEasing] = useState<EasingId>('auto');
  // Duration overrides in effective seconds; '' = keep the current step length. In and Out
  // are independent, with an optional link so "both" can be set from one field.
  const [durIn, setDurIn] = useState<string>('');
  const [durOut, setDurOut] = useState<string>('');
  // Delay before the motion starts, in effective seconds; '' = none. The apply shifts the
  // written keyframes later within the step (the layer holds its starting pose through the
  // wait) — no keyframe knowledge needed to stagger an entrance or exit.
  const [delIn, setDelIn] = useState<string>('');
  const [delOut, setDelOut] = useState<string>('');
  const [linkDur, setLinkDur] = useState(true);
  const [presetMsg, setPresetMsg] = useState<string>('');

  const parts = useMemo(
    () => getTemplateParts(template.html, template.fields),
    [template.html, template.fields],
  );

  // On an imported design (the placed-design shape, code-derived) the Animations tab is the
  // natural first stop: the artwork brought its look with it, so what a user comes here for
  // is per-layer in/out motion. The switch fires once when such a template arrives — a manual
  // tab choice afterwards sticks.
  const placedDesign = useMemo(
    () => designBoxInfo(template.html, template.css) !== null,
    [template.html, template.css],
  );
  const wasPlacedDesign = useRef(placedDesign);
  useEffect(() => {
    if (placedDesign && !wasPlacedDesign.current) setTab('animations');
    wasPlacedDesign.current = placedDesign;
  }, [placedDesign]);
  // A native data block is editable; legacy regions convert through the importer for a
  // read view only. Null = blank/imported/hand-crafted — identity still shows.
  // Both are read through the TIMELINE LENS (blocks/timelineLens.ts): whichever timeline the
  // step surface has open is the one whose values this resolves and whose keyframes it
  // stamps. Sharing the target through the store is the whole point — resolving against the
  // document while the timeline showed a branch would put the Inspector on a different clip
  // from the playhead it reads.
  const nativeDoc = useMemo(() => parseAnimData(template.js), [template.js]);
  const timelineTarget = useTemplateStore((s) => s.timelineTarget);
  const native = useMemo(
    () => (nativeDoc ? lensRead(nativeDoc, timelineTarget) : null),
    [nativeDoc, timelineTarget],
  );
  const data = useMemo(() => native ?? importAnimData(template), [native, template]);
  // Placed fields (an imported design's lines and slots): their look is DESIGN CSS, not
  // motion, so a selected one gets the Style tab below (blocks/designLayout.ts).
  const placed = useMemo(
    () => placedLines(template.html, template.css),
    [template.html, template.css],
  );
  const part = parts.find((p) => p.selector === selectedPart) ?? null;
  // The canvas lock (components/partLocks.ts) — read through the same helper the overlay uses,
  // so an untouched part reads the same default on both surfaces.
  const locked = partLocked(
    part?.selector ?? '',
    partLocks,
    designBoxInfo(template.html, template.css)?.prefix ?? null,
  );

  if (!part) {
    return (
      <div className="inspector" data-testid="inspector">
        <div className="inspector-head">Inspector</div>
        <p className="inspector-empty" data-testid="inspector-empty">
          Select an element — click it on the canvas, or click its row in the timeline.
        </p>
      </div>
    );
  }

  // The selected part as a PLACED FIELD (or nulls when it isn't one): a text line offers
  // typography + position, an image slot its box + position. The Style tab renders from
  // these; when the selection moves to a non-placed part the tab itself disappears, so the
  // rendered tab falls back to Properties without touching the user's stored choice.
  const place = placed[part.selector] ?? null;
  const fieldId = place ? part.selector.slice(1) : null;
  const textStyle = fieldId ? lineTextStyle(template.html, template.css, fieldId) : null;
  const fit = fieldId && textStyle ? lineFit(template.html, template.css, fieldId) : null;
  const slot = place && !textStyle ? slotSize(template.css, place.wrapperId) : null;
  const activeInspectorTab = tab === 'style' && !place ? 'properties' : tab;

  /** One undoable apply for a Style-tab commit; the CSS tab shows the highlighted change. */
  const applyStyle = (next: SpxTemplate | null) => {
    if (!next || next === template) return;
    applyTemplate(next);
    setActiveTab('css');
  };

  // The Content commits (the Style tab's Label/Text rows). Both live in the MARKUP: the
  // label is the DataField's title (the registry names the layer's row and chip from it),
  // and the text follows the canvas inline editor's pattern exactly — definition default +
  // static element text in one undoable apply, with the live sample value following.
  const placedField = fieldId ? template.fields.find((f) => f.field === fieldId) ?? null : null;
  const commitFieldTitle = (title: string) => {
    if (!fieldId || !title.trim()) return;
    applyTemplate(setFieldTitle(template, fieldId, title.trim()));
    setActiveTab('html');
  };
  const commitFieldText = (value: string) => {
    if (!fieldId) return;
    applyTemplate(setFieldDefault(template, fieldId, value)); // definition + static text
    setSampleValue(fieldId, value); // the live operator value follows the edit
    setActiveTab('html');
  };

  // Where values are read and keyframes stamped: the parked playhead, else the layer's
  // settled state (the end of its activation step).
  const speed = data?.speed || 1;
  const at: { step: number; tRel: number } | null = data
    ? playhead
      ? { step: playhead.step, tRel: Math.round(playhead.t * speed * 1000) / 1000 }
      : { step: activationStep(data, part.selector), tRel: data.steps[activationStep(data, part.selector)].duration }
    : null;

  const armed = data ? new Set(animatedProps(data, part.selector)) : new Set<string>();

  const valueOf = (track: string): number | string | null =>
    data && at ? resolveValue(data, part.selector, track, at.step, at.tRel) : null;

  const kfAt = (track: string): boolean => {
    if (!data || !at) return false;
    const kfs = data.steps[at.step]?.layers[part.selector]?.[track] ?? [];
    return kfs.some((k) => Math.abs(k.time - at.tRel) < 0.005);
  };

  /** One undoable apply, then re-park the preview at the playhead after the rebuild. The lens
   *  folds a branch state's projection back into the state it came from, so every animEdit
   *  mutator above keeps addressing `steps[at.step]` unchanged. */
  const applyData = (projected: AnimData) => {
    const next = nativeDoc ? lensWrite(nativeDoc, timelineTarget, projected) : projected;
    if (!next) return;
    const js = writeAnimData(template.js, next);
    if (!js || js === template.js) return;
    applyTemplate({ ...template, js });
    // A branch answers `state:<group>:<state>`; the lens owns which phase this is.
    if (playhead && data) {
      setTimeout(() => sendScrub(scrubPhase(timelineTarget, phaseIdOf(data, playhead.step)), playhead.t), 650);
    }
  };

  const stamp = (row: (typeof PROP_ROWS)[number]) => {
    if (!native || !at) return;
    if (kfAt(row.track)) {
      applyData(deleteKeyframe(native, at.step, part.selector, row.track, at.tRel));
      return;
    }
    const current = rowValue(row, valueOf(row.track));
    const value = current === null ? row.base : current;
    applyData(
      row.filter
        ? setFilterComponent(native, at.step, part.selector, row.filter, value, at.tRel)
        : setKeyframe(native, at.step, part.selector, row.track, at.tRel, value),
    );
  };

  // The layer's transform PIVOT (where scale and rotation pivot from) — a static per-layer
  // value stored as a single `transformOrigin` keyframe at the layer's activation step, so any
  // keyframed scale/rotation pivots correctly (the model's transform-origin gap). Centre by
  // default; the runtime honours it as an ordinary set().
  const PIVOTS = ['0% 0%', '50% 0%', '100% 0%', '0% 50%', '50% 50%', '100% 50%', '0% 100%', '50% 100%', '100% 100%'];
  const currentPivot = (): string => {
    if (!data) return '50% 50%';
    for (const step of data.steps) {
      const kfs = step.layers[part.selector]?.transformOrigin;
      if (kfs && kfs.length) return String(kfs[0].value);
    }
    return '50% 50%';
  };
  const setPivot = (value: string) => {
    if (!native) return;
    applyData(setKeyframe(native, activationStep(native, part.selector), part.selector, 'transformOrigin', 0, value));
  };

  const commitValue = (row: (typeof PROP_ROWS)[number], raw: number) => {
    if (!native || !at || !Number.isFinite(raw)) return;
    applyData(
      row.filter
        ? setFilterComponent(native, at.step, part.selector, row.filter, raw, at.tRel)
        : setKeyframe(native, at.step, part.selector, row.track, at.tRel, raw),
    );
  };

  const display = (row: (typeof PROP_ROWS)[number]): string => {
    const v = rowValue(row, valueOf(row.track));
    if (v === null) return '—';
    return String(Math.round(v * 100) / 100);
  };

  /** Every keyframe moment of one property, across all steps in playout order. */
  const kfPlaces = (track: string): { step: number; tRel: number }[] => {
    if (!data) return [];
    const out: { step: number; tRel: number }[] = [];
    data.steps.forEach((step, si) => {
      for (const kf of step.layers[part.selector]?.[track] ?? []) out.push({ step: si, tRel: kf.time });
    });
    return out;
  };

  /** ◀ ▶ — jump the playhead to a property's previous/next keyframe (the familiar
   *  navigation arrows beside the diamond). */
  const jumpKf = (track: string, dir: -1 | 1) => {
    if (!data || !at) return;
    const places = kfPlaces(track);
    const target =
      dir === -1
        ? [...places].reverse().find((p) => p.step < at.step || (p.step === at.step && p.tRel < at.tRel - 0.005))
        : places.find((p) => p.step > at.step || (p.step === at.step && p.tRel > at.tRel + 0.005));
    if (!target) return;
    const t = target.tRel / speed;
    setPlayhead({ step: target.step, t });
    sendScrub(scrubPhase(timelineTarget, phaseIdOf(data, target.step)), t);
  };

  return (
    <div className="inspector" data-testid="inspector">
      <div className="inspector-head">Inspector</div>
      <div className="inspector-identity">
        <span className="inspector-label" data-testid="inspector-part-label">{part.label}</span>
        <span className="inspector-kind">{KIND_LABEL[part.kind] ?? part.kind}</span>
        <code className="inspector-selector">{part.selector}</code>
        {/* The canvas lock, for ANY part — the general home for it, since the canvas chip only
            carries a padlock where the DEFAULT is surprising (an imported design's artwork).
            Both read and write the same store state (components/partLocks.ts), so they agree. */}
        <button
          className={`inspector-lock${locked ? ' locked' : ''}`}
          onClick={() => setPartLock(part.selector, !locked)}
          title={
            locked
              ? 'Locked on the canvas: it takes no drag, handle, or marquee there. Still selectable and fully editable everywhere. Click to unlock.'
              : 'Unlocked: it takes canvas drags and handles. Click to lock it out of the way while you work on what sits over it.'
          }
          data-testid="inspector-lock"
        >
          {locked ? '🔒 Locked' : '🔓 Unlocked'}
        </button>
        {selectedParts.length > 1 && (
          <span className="inspector-multi" data-testid="inspector-multi">
            +{selectedParts.length - 1} more selected — properties show the primary
          </span>
        )}
      </div>

      <div className="inspector-tabs">
        <button
          className={`tab ${activeInspectorTab === 'properties' ? 'active' : ''}`}
          onClick={() => setTab('properties')}
        >
          Properties
        </button>
        {place && (
          <button
            className={`tab ${activeInspectorTab === 'style' ? 'active' : ''}`}
            onClick={() => setTab('style')}
            data-testid="inspector-tab-style"
            title="This placed field's design: position, typography, slot size — written into its own CSS rules"
          >
            Style
          </button>
        )}
        <button
          className={`tab ${activeInspectorTab === 'animations' ? 'active' : ''}`}
          onClick={() => setTab('animations')}
        >
          Animations
        </button>
      </div>

      {activeInspectorTab === 'properties' && (
        <div className="inspector-body" data-testid="inspector-properties">
          {data ? (
            <>
              {PROP_ROWS.map((row) => {
                const isArmed = armed.has(row.track);
                const atKf = kfAt(row.track);
                const value = display(row);
                const scrubbable = native && isArmed && value !== '—';
                return (
                  <div className="inspector-prop" key={row.prop}>
                    {row.group && (
                      <div className="inspector-group-label" data-testid={`inspector-group-${row.group.replace(/\s+/g, '-').toLowerCase()}`}>
                        {row.group}
                      </div>
                    )}
                    <div className="inspector-row">
                    <span
                      className={`inspector-row-label${scrubbable ? ' scrubbable' : ''}`}
                      title={scrubbable ? 'Drag left/right to change the value (keys at the playhead)' : row.hint}
                      onPointerDown={(e) => {
                        if (!scrubbable) return;
                        e.preventDefault();
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                        scrubDrag.current = { prop: row.prop, startX: e.clientX, startValue: Number(value), value: Number(value) };
                      }}
                      onPointerMove={(e) => {
                        const d = scrubDrag.current;
                        if (!d || d.prop !== row.prop || e.buttons !== 1) return;
                        d.value = Math.round((d.startValue + (e.clientX - d.startX) * row.step) * 100) / 100;
                        if (row.min !== undefined) d.value = Math.max(row.min, d.value);
                        if (row.max !== undefined) d.value = Math.min(row.max, d.value);
                        // Live feedback in the (uncontrolled) input; the commit lands on release.
                        const input = (e.currentTarget as HTMLElement)
                          .closest('.inspector-row')
                          ?.querySelector<HTMLInputElement>('input');
                        if (input) input.value = String(d.value);
                      }}
                      onPointerUp={() => {
                        const d = scrubDrag.current;
                        scrubDrag.current = null;
                        if (d && d.prop === row.prop && d.value !== d.startValue) commitValue(row, d.value);
                      }}
                    >
                      {row.label}
                    </span>
                    <span className="inspector-row-edit">
                      {native && isArmed && (
                        <button
                          className="inspector-kf-nav"
                          onClick={() => jumpKf(row.track, -1)}
                          title="Jump to this property's previous keyframe"
                          data-testid={`inspector-prev-${row.prop}`}
                        >
                          ‹
                        </button>
                      )}
                      {native && isArmed ? (
                        <input
                          className="inspector-input"
                          type="number"
                          key={`${part.selector}-${row.prop}-${at?.step}-${at?.tRel}-${value}`}
                          defaultValue={value === '—' ? row.base : Number(value)}
                          step={row.step}
                          min={row.min}
                          max={row.max}
                          data-testid={`inspector-input-${row.prop}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                          }}
                          onBlur={(e) => {
                            const v = Number(e.currentTarget.value);
                            if (Number.isFinite(v) && String(Math.round(v * 100) / 100) !== value) commitValue(row, v);
                          }}
                        />
                      ) : (
                        <span
                          className="inspector-row-value"
                          title={value === '—' ? 'The design value from the stylesheet' : undefined}
                          data-testid={`inspector-value-${row.filter ? row.prop : row.track}`}
                        >
                          {value}
                        </span>
                      )}
                      {native && (
                        <button
                          className={`inspector-kf${isArmed ? ' armed' : ''}${atKf ? ' at-kf' : ''}`}
                          onClick={() => stamp(row)}
                          title={
                            atKf
                              ? 'Remove the keyframe at the playhead'
                              : isArmed
                                ? 'Add a keyframe at the playhead with the current value'
                                : 'Animate this property — stamps its first keyframe at the playhead'
                          }
                          data-testid={`inspector-kf-${row.prop}`}
                        >
                          {isArmed ? '◆' : '◇'}
                        </button>
                      )}
                      {native && isArmed && (
                        <button
                          className="inspector-kf-nav"
                          onClick={() => jumpKf(row.track, 1)}
                          title="Jump to this property's next keyframe"
                          data-testid={`inspector-next-${row.prop}`}
                        >
                          ›
                        </button>
                      )}
                    </span>
                    </div>
                  </div>
                );
              })}
              {native && part.kind !== 'root' && (
                <div className="inspector-row inspector-pivot-row" data-testid="inspector-pivot">
                  <span className="inspector-row-label" title="Where scale and rotation pivot from">Pivot</span>
                  <span className="inspector-pivot-grid">
                    {PIVOTS.map((p, i) => (
                      <button
                        key={p}
                        className={`inspector-pivot-cell${currentPivot() === p ? ' active' : ''}`}
                        onClick={() => setPivot(p)}
                        title={`Pivot: ${p}`}
                        data-testid={`inspector-pivot-${i}`}
                      />
                    ))}
                  </span>
                </div>
              )}
              <p className="hint inspector-hint">
                {native
                  ? 'Values at the playhead. ◇ arms a property; editing an armed value keys it at the playhead. Pivot sets where scale/rotation turn.'
                  : 'Values at the settled on-air state — press the timeline\'s "use keyframes" chip to edit them here.'}
              </p>
            </>
          ) : (
            <p className="hint inspector-hint">
              This template's animation is hand-crafted code — there is no managed motion
              to inspect. The element itself is still selectable and editable in the code.
            </p>
          )}
        </div>
      )}

      {activeInspectorTab === 'style' && place && (
        <PlacedFieldStyle
          key={part.selector}
          template={template}
          fieldId={fieldId!}
          place={place}
          textStyle={textStyle}
          fit={fit}
          slot={slot}
          fieldTitle={placedField?.title ?? ''}
          fieldText={textStyle ? sampleData[fieldId!] ?? placedField?.value ?? '' : null}
          onCommit={applyStyle}
          onLiveCss={patchCss}
          onTitle={commitFieldTitle}
          onText={commitFieldText}
        />
      )}

      {activeInspectorTab === 'animations' && (
        <div className="inspector-body" data-testid="inspector-animations">
          {/* WHEN THIS LAYER IS ON AIR — "Appears" (which step reveals it, or the entrance)
              and "Disappears" (an early exit, else the final Out) as two plain selects.
              These write the SAME transforms the canvas chip and the timeline block edges
              write (blocks/stepAssign changePartPress / animEdit setLayerHide), so every
              surface stays one truth. Default path only: a branch state's inline timeline
              has no press chain to place a layer on. */}
          {nativeDoc &&
            timelineTarget.kind === 'path' &&
            (part.kind === 'line' || part.kind === 'image' || part.kind === 'accent' || part.kind === 'block') &&
            part.selector !== parts.find((p) => p.kind === 'line')?.selector &&
            (() => {
              const middle = nativeDoc.steps.slice(1, -1);
              const act = activationStep(nativeDoc, part.selector); // 0 = the entrance
              const press = act === 0 ? -1 : act - 1;
              const leave = hideStep(nativeDoc, part.selector);
              const lastIdx = nativeDoc.steps.length - 1;
              const changeAppears = (toPress: number) => {
                if (toPress >= middle.length) {
                  // "In a new step »" — the composed transform names the step after the
                  // layer ("Logo In"), same as the canvas chip and the states graph.
                  const next = createStepFromLayer(template, parts, part.selector);
                  if (next) {
                    applyTemplate(next);
                    requestReplay();
                  }
                  return;
                }
                const change = changePartPress(template, parts, part.selector, press, toPress);
                if (!change) return;
                applyTemplate({ ...template, ...change.patch }); // one undoable apply
                requestReplay();
              };
              const changeDisappears = (toStep: number) => {
                const next = setLayerHide(nativeDoc, part.selector, toStep);
                const js = writeAnimData(template.js, next);
                if (!js || js === template.js) return;
                applyTemplate({ ...template, js });
                requestReplay();
              };
              return (
                <div className="inspector-lifecycle" data-testid="inspector-lifecycle">
                  <label>
                    <span>Appears</span>
                    <select
                      value={press}
                      onChange={(e) => changeAppears(Number(e.target.value))}
                      title="When this layer first shows — with the entrance, in an existing step, or in a brand-new step of its own"
                      data-testid="inspector-appears"
                    >
                      <option value={-1}>with ▶ Play</option>
                      {middle.map((s, k) => (
                        <option key={k} value={k}>{`in “${s.name}”`}</option>
                      ))}
                      {/* The last step's only layer moving to "a new step" would re-create
                          the same step — hidden here exactly as on the chip and gutter. */}
                      {!(press === middle.length - 1 && press >= 0 && (middle[press]?.reveals?.length ?? 0) === 1) && (
                        <option value={middle.length}>in a new step »</option>
                      )}
                    </select>
                  </label>
                  <label>
                    <span>Disappears</span>
                    <select
                      value={leave}
                      onChange={(e) => changeDisappears(Number(e.target.value))}
                      title="When this layer leaves — animated out early in a middle step, or with the final Out"
                      data-testid="inspector-disappears"
                    >
                      {middle.map((s, k) =>
                        k + 1 > act ? (
                          <option key={k} value={k + 1}>{`early, in “${s.name}”`}</option>
                        ) : null,
                      )}
                      <option value={lastIdx}>with ■ Out</option>
                    </select>
                  </label>
                </div>
              );
            })()}
          {/* CREATE TIMELINE FROM LAYER (docs/STATE_MACHINE_SCHEMA.md): give this layer its
              own default-path step — a separately editable LAYER TIMELINE the states graph
              shows as its own ▤ node. The composed transform (blocks/layerTimeline.ts) is
              the same one the graph's "+ from layer" uses. */}
          {native && part.kind !== 'root' && activationStep(native, part.selector) === 0 && (
            <div className="inspector-preset" style={{ marginBottom: 10 }}>
              <button
                className="inspector-preset-apply"
                onClick={() => {
                  const next = createStepFromLayer(template, parts, part.selector);
                  if (next) {
                    applyTemplate(next);
                    setPresetMsg(`✓ "${part.label} In" is now its own timeline — see it on the timeline and in ◇ States.`);
                  }
                }}
                title={`Add a "${part.label} In" step to the default path and move this layer's reveal into it — its own separately editable timeline, one » press of its own`}
                data-testid="inspector-create-layer-timeline"
              >
                ▤ Create timeline from layer
              </button>
            </div>
          )}
          {/* Phase 5 — presets as keyframe generators (data templates): pick a motion
              style, choose the direction, Apply writes ordinary keyframes. The whole
              graphic when the root is selected; just this layer otherwise ("In" targets
              the step where THIS layer becomes active). Declared properties only — a
              manually keyed rotation survives a slide preset. */}
          {native && data && (() => {
            // Where each direction lands, so the duration fields can show the live value.
            const presetScope = part.kind === 'root' ? 'all' : part.selector;
            const inStepIdx = presetScope === 'all' ? 0 : activationStep(data, part.selector);
            const inDefault = stepSeconds(data, inStepIdx);
            const outDefault = stepSeconds(data, data.steps.length - 1);
            const showIn = presetPhase !== 'out';
            const showOut = presetPhase !== 'in';
            return (
            <div className="inspector-preset" data-testid="inspector-preset">
              <select
                className="inspector-preset-select"
                value={presetId}
                onChange={(e) => { setPresetId(e.target.value as AnimPresetId); setPresetMsg(''); }}
                title={
                  part.kind === 'root'
                    ? "The whole graphic's motion style"
                    : `A motion style for ${part.label} — In lands in the step where it first appears`
                }
                data-testid="inspector-preset-select"
              >
                <option value="" disabled>
                  Choose a motion style…
                </option>
                {/* The slide family groups under one label; everything else lists flat. */}
                {(() => {
                  const all = swappablePresetsForType(template.type);
                  const slides = all.filter((p) => isSlidePreset(p.id));
                  const rest = all.filter((p) => !isSlidePreset(p.id));
                  return (
                    <>
                      {slides.length > 0 && (
                        <optgroup label="Slide">
                          {slides.map((p) => (
                            <option key={p.id} value={p.id} title={p.description}>
                              {p.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {rest.map((p) => (
                        <option key={p.id} value={p.id} title={p.description}>
                          {p.name}
                        </option>
                      ))}
                    </>
                  );
                })()}
              </select>
              <span className="inspector-preset-phase" role="group" aria-label="Apply to">
                {(['in', 'out', 'both'] as const).map((ph) => (
                  <button
                    key={ph}
                    className={`tab ${presetPhase === ph ? 'active' : ''}`}
                    onClick={() => { setPresetPhase(ph); setPresetMsg(''); }}
                    data-testid={`inspector-preset-${ph}`}
                  >
                    {ph === 'in' ? 'In' : ph === 'out' ? 'Out' : 'Both'}
                  </button>
                ))}
              </span>
              <label className="inspector-preset-field">
                <span>Easing</span>
                <select
                  className="inspector-preset-easing"
                  value={presetEasing}
                  onChange={(e) => setPresetEasing(e.target.value as EasingId)}
                  title="The motion curve applied to this style"
                  data-testid="inspector-preset-easing"
                >
                  <option value="auto">Auto (style default)</option>
                  {EASINGS.map((e) => (
                    <option key={e.id} value={e.id} title={e.description}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="inspector-preset-durations">
                {showIn && (
                  <label className="inspector-preset-field">
                    <span>In&nbsp;(s)</span>
                    <input
                      className="inspector-preset-dur"
                      type="number"
                      min={0.05}
                      step={0.05}
                      value={durIn}
                      placeholder={inDefault.toFixed(2)}
                      onChange={(e) => {
                        setDurIn(e.target.value);
                        if (linkDur && presetPhase === 'both') setDurOut(e.target.value);
                      }}
                      data-testid="inspector-preset-dur-in"
                    />
                  </label>
                )}
                {showOut && (
                  <label className="inspector-preset-field">
                    <span>Out&nbsp;(s)</span>
                    <input
                      className="inspector-preset-dur"
                      type="number"
                      min={0.05}
                      step={0.05}
                      value={durOut}
                      placeholder={outDefault.toFixed(2)}
                      onChange={(e) => {
                        setDurOut(e.target.value);
                        if (linkDur && presetPhase === 'both') setDurIn(e.target.value);
                      }}
                      data-testid="inspector-preset-dur-out"
                    />
                  </label>
                )}
                {presetPhase === 'both' && (
                  <label className="inspector-preset-link" title="Set In and Out together">
                    <input
                      type="checkbox"
                      checked={linkDur}
                      onChange={(e) => {
                        setLinkDur(e.target.checked);
                        if (e.target.checked) setDurOut(durIn);
                      }}
                      data-testid="inspector-preset-link"
                    />
                    <span>Link</span>
                  </label>
                )}
                {showIn && (
                  <label
                    className="inspector-preset-field"
                    title="Wait this long before the entrance motion starts — the element holds its starting pose through the delay"
                  >
                    <span>Delay&nbsp;in</span>
                    <input
                      className="inspector-preset-dur"
                      type="number"
                      min={0}
                      step={0.05}
                      value={delIn}
                      placeholder="0"
                      onChange={(e) => setDelIn(e.target.value)}
                      data-testid="inspector-preset-delay-in"
                    />
                  </label>
                )}
                {showOut && (
                  <label
                    className="inspector-preset-field"
                    title="Wait this long into the exit before this motion starts"
                  >
                    <span>Delay&nbsp;out</span>
                    <input
                      className="inspector-preset-dur"
                      type="number"
                      min={0}
                      step={0.05}
                      value={delOut}
                      placeholder="0"
                      onChange={(e) => setDelOut(e.target.value)}
                      data-testid="inspector-preset-delay-out"
                    />
                  </label>
                )}
              </div>
              <button
                className="inspector-preset-apply"
                disabled={!presetId}
                onClick={() => {
                  if (!native || !presetId) return;
                  const preset = anyPresetById(presetId);
                  const eases = resolveEasing(presetEasing, preset.autoEase);
                  const donor = presetDonor(template, native, presetId, eases);
                  const durations = {
                    inDuration: showIn && durIn.trim() ? Number(durIn) : undefined,
                    outDuration: showOut && durOut.trim() ? Number(durOut) : undefined,
                    inDelay: showIn && delIn.trim() ? Number(delIn) : undefined,
                    outDelay: showOut && delOut.trim() ? Number(delOut) : undefined,
                  };
                  const next = donor && applyPresetData(native, donor, presetPhase, presetScope, durations);
                  if (!next) {
                    setPresetMsg('This style has no motion for this element.');
                    return;
                  }
                  const js = writeAnimData(template.js, next);
                  if (!js || js === template.js) {
                    setPresetMsg('No change — already at this style.');
                    return;
                  }
                  setPresetMsg('');
                  applyTemplate({ ...template, js });
                  requestReplay(); // presets are motion — play them
                  // Re-park the preview at the playhead after the debounced rebuild.
                  if (playhead) {
                    setTimeout(() => sendScrub(scrubPhase(timelineTarget, phaseIdOf(native, playhead.step)), playhead.t), 650);
                  }
                }}
                title="Replace this element's motion in the chosen direction with this style (undo with Ctrl+Z)"
                data-testid="inspector-preset-apply"
              >
                Apply
              </button>
              {presetMsg && (
                <p className="inspector-preset-msg" data-testid="inspector-preset-msg">{presetMsg}</p>
              )}
              {/* Which step (state entry) the apply will actually edit — no guessing. */}
              <p className="hint inspector-preset-target" data-testid="inspector-preset-target">
                {showIn && `In plays when “${data.steps[inStepIdx]?.name ?? 'In'}” enters`}
                {showIn && showOut && ' · '}
                {showOut && `Out plays when “${data.steps[data.steps.length - 1]?.name ?? 'Out'}” exits`}
              </p>
            </div>
            );
          })()}
          {data ? (
            (() => {
              const rows = data.steps
                .map((step, i) => ({ step, i, props: Object.keys(step.layers[part.selector] ?? {}) }))
                .filter(({ step, props }) => props.length > 0 || step.reveals?.includes(part.selector));
              if (rows.length === 0) {
                return (
                  <p className="hint inspector-hint">
                    This layer holds its design state through every step.
                  </p>
                );
              }
              return rows.map(({ step, i, props }) => (
                <div className="inspector-row" key={i}>
                  <span className="inspector-row-label">
                    {step.name} <span className="muted">· {stepSeconds(data, i).toFixed(2)}s</span>
                  </span>
                  <span className="inspector-row-value">
                    {step.reveals?.includes(part.selector) ? `appears here${props.length ? ' · ' : ''}` : ''}
                    {props.join(', ')}
                  </span>
                </div>
              ));
            })()
          ) : (
            <p className="hint inspector-hint">No managed animation in this template.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── The Style tab: a placed field's DESIGN, edited in place ──────────────────────────────

const WEIGHT_OPTIONS = [
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semibold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extra bold' },
];

/** True when the native swatch can honestly represent the value (it only speaks hex). */
function isHexColor(value: string | null): boolean {
  return !!value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

/** rgb()/#hex → #rrggbb for the native color input; non-hex values get a neutral swatch. */
function styleHex(value: string): string {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) return '#' + value.slice(1).split('').map((c) => c + c).join('');
  const m = value.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return '#ffffff';
  const h = (n: string) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0');
  return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
}

/** A commit-on-blur number row (Enter commits too). Uncontrolled so typing never fights the
 *  store; the key remounts it with the fresh value after each apply. */
function StyleNumRow({
  label,
  value,
  placeholder,
  step,
  min,
  testid,
  hint,
  onCommit,
}: {
  label: string;
  value: number | null;
  placeholder?: string;
  step?: number;
  min?: number;
  testid: string;
  hint?: string;
  onCommit: (value: number) => void;
}) {
  return (
    <div className="inspector-row">
      <span className="inspector-row-label" title={hint}>{label}</span>
      <span className="inspector-row-edit">
        <input
          className="inspector-input"
          type="number"
          key={String(value)}
          defaultValue={value ?? undefined}
          placeholder={placeholder}
          step={step}
          min={min}
          data-testid={testid}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
          }}
          onBlur={(e) => {
            const raw = e.currentTarget.value.trim();
            const v = Number(raw);
            if (raw !== '' && Number.isFinite(v) && v !== value) onCommit(v);
          }}
        />
      </span>
    </div>
  );
}

/** A commit-on-blur TEXT row (Enter commits too) — the string twin of StyleNumRow. */
function StyleTextRow({
  label,
  value,
  testid,
  hint,
  onCommit,
}: {
  label: string;
  value: string;
  testid: string;
  hint?: string;
  onCommit: (value: string) => void;
}) {
  return (
    <div className="inspector-row">
      <span className="inspector-row-label" title={hint}>{label}</span>
      <span className="inspector-row-edit">
        <input
          className="inspector-input inspector-style-text"
          key={value}
          defaultValue={value}
          data-testid={testid}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
          }}
          onBlur={(e) => {
            if (e.currentTarget.value !== value) onCommit(e.currentTarget.value);
          }}
        />
      </span>
    </div>
  );
}

/**
 * The Style tab's body for a selected PLACED field (an imported design's text line or image
 * slot). The Content rows edit the field's markup-side identity (label + shown text — the
 * canvas inline editor's pattern); everything else is a DESIGN decision written into the
 * field's own CSS rules — the exact rules the canvas drag, nudge, and corner handle already
 * read and write (blocks/designLayout.ts) — never a keyframe. Discrete edits commit as ONE
 * undoable apply each; the color inputs patch live like the Style panel's swatches (no
 * history spam).
 */
function PlacedFieldStyle({
  template,
  fieldId,
  place,
  textStyle,
  fit,
  slot,
  fieldTitle,
  fieldText,
  onCommit,
  onLiveCss,
  onTitle,
  onText,
}: {
  template: SpxTemplate;
  fieldId: string;
  place: LinePlacement;
  textStyle: LineTextStyle | null;
  /** How the line answers a value too long for its slot; null for an image slot. */
  fit: LineFit | null;
  slot: { width: number; height: number; scaled: boolean } | null;
  /** The DataField's operator-facing label. */
  fieldTitle: string;
  /** The field's live sample text; null for an image slot (its value is picked in Data). */
  fieldText: string | null;
  onCommit: (next: SpxTemplate | null) => void;
  onLiveCss: (css: string) => void;
  onTitle: (title: string) => void;
  onText: (value: string) => void;
}) {
  const patchText = (patch: LineTextPatch) => onCommit(setLineTextStyle(template, fieldId, patch));
  const liveText = (patch: LineTextPatch) => {
    const next = setLineTextStyle(template, fieldId, patch);
    if (next) onLiveCss(next.css);
  };
  const weights = WEIGHT_OPTIONS.some((w) => w.value === (textStyle?.weight ?? 400))
    ? WEIGHT_OPTIONS
    : [...WEIGHT_OPTIONS, { value: textStyle!.weight!, label: String(textStyle!.weight) }];

  return (
    <div className="inspector-body" data-testid="inspector-style">
      <div className="inspector-group-label">Content</div>
      <StyleTextRow
        label="Label"
        value={fieldTitle}
        testid="inspector-style-label"
        hint="The name the operator sees in SPX and every panel — the element id never changes"
        onCommit={onTitle}
      />
      {fieldText !== null && (
        <StyleTextRow
          label="Text"
          value={fieldText}
          testid="inspector-style-text-value"
          hint="The field's shown text — updates the sample value and the definition default, like the canvas double-click edit"
          onCommit={onText}
        />
      )}

      <div className="inspector-group-label">Position</div>
      <StyleNumRow
        label="X (design px)"
        value={place.x}
        testid="inspector-style-x"
        hint="Measured from the artwork's left edge — the same value the canvas drag writes"
        onCommit={(v) => onCommit(placeLine(template, place.wrapperId, v, place.y, place.scaled))}
      />
      <StyleNumRow
        label="Y (design px)"
        value={place.y}
        testid="inspector-style-y"
        hint="Measured from the artwork's top edge"
        onCommit={(v) => onCommit(placeLine(template, place.wrapperId, place.x, v, place.scaled))}
      />

      {textStyle && (
        <>
          {/* "Typography", not "Text": the Content group above already has a row called Text
              (the value shown on air), and two different things under one word one screen
              apart is exactly the confusion this panel exists to remove. */}
          <div className="inspector-group-label">Typography</div>
          <div className="inspector-row">
            <span className="inspector-row-label" title="The line's typeface — bundled fonts ship inside the export">
              Font
            </span>
            <span className="inspector-row-edit">
              <select
                className="inspector-style-select"
                value={textStyle.fontId ?? ''}
                data-testid="inspector-style-font"
                onChange={(e) => patchText({ fontId: e.target.value || null })}
              >
                <option value="">Design font</option>
                {textStyle.fontId === 'custom' && (
                  <option value="custom" disabled>
                    Custom — as written in the CSS
                  </option>
                )}
                {FONTS.map((f) => (
                  <option key={f.id} value={f.id}>{f.family}</option>
                ))}
              </select>
            </span>
          </div>
          <StyleNumRow
            label="Size (design px)"
            value={textStyle.fontSize?.value ?? null}
            step={1}
            min={4}
            testid="inspector-style-size"
            hint="The same value the canvas corner handle drags"
            onCommit={(v) => patchText({ fontSize: Math.max(4, v) })}
          />
          <div className="inspector-row">
            <span className="inspector-row-label">Weight</span>
            <span className="inspector-row-edit">
              <select
                className="inspector-style-select"
                value={textStyle.weight ?? 400}
                data-testid="inspector-style-weight"
                onChange={(e) => patchText({ weight: Number(e.target.value) })}
              >
                {weights.map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </span>
          </div>
          {/* A line's colour is often the design's own `var(--text-color)`, which the native
              swatch cannot show (it only speaks hex) — so the swatch renders as a neutral
              "inherited" chip there instead of claiming to be white, and the value keeps the
              full width. Picking a colour from the swatch replaces the variable, as it should. */}
          <div className="inspector-row">
            <span className="inspector-row-label">Color</span>
            <span className="inspector-row-edit">
              <input
                type="color"
                className={`inspector-style-swatch${isHexColor(textStyle.color) ? '' : ' inherited'}`}
                value={styleHex(textStyle.color ?? '#ffffff')}
                title={isHexColor(textStyle.color) ? undefined : `From the design: ${textStyle.color ?? 'unset'}`}
                data-testid="inspector-style-color"
                onChange={(e) => liveText({ color: e.target.value })}
              />
              <input
                className="inspector-input inspector-style-color-text"
                value={textStyle.color ?? ''}
                data-testid="inspector-style-color-text"
                onChange={(e) => liveText({ color: e.target.value })}
                title={textStyle.color ?? undefined}
                placeholder="#hex or rgba(…)"
              />
            </span>
          </div>
          <div className="inspector-row">
            <span
              className="inspector-row-label"
              title="Which edge of the text sits at X — a free-placed line has no column to align inside"
            >
              Anchor
            </span>
            <span className="inspector-preset-phase" role="group" aria-label="Anchor">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  className={`tab ${textStyle.align === a ? 'active' : ''}`}
                  data-testid={`inspector-style-align-${a}`}
                  onClick={() => patchText({ align: a })}
                >
                  {a === 'left' ? 'Left' : a === 'center' ? 'Center' : 'Right'}
                </button>
              ))}
            </span>
          </div>
          <StyleNumRow
            label="Line height"
            value={textStyle.lineHeight}
            placeholder="normal"
            step={0.05}
            min={0.5}
            testid="inspector-style-lineheight"
            hint="Unitless multiple of the font size"
            onCommit={(v) => patchText({ lineHeight: v })}
          />
          <StyleNumRow
            label="Tracking (px)"
            value={textStyle.letterSpacing}
            placeholder="0"
            step={0.1}
            testid="inspector-style-spacing"
            hint="Letter-spacing in design px"
            onCommit={(v) => patchText({ letterSpacing: v })}
          />
        </>
      )}

      {fit && (
        <>
          <div className="inspector-group-label">Fit</div>
          <div className="inspector-row">
            <span
              className="inspector-row-label"
              title="What a value too long for its slot does: run past it, flow onto more rows, or condense to stay on one"
            >
              Long text
            </span>
            <span className="inspector-preset-phase" role="group" aria-label="Fit mode">
              {(
                [
                  ['shrink', 'Shrink', 'Keeps one row and condenses to fit the slot — the broadcast default for names'],
                  ['wrap', 'Wrap', 'Flows onto more rows inside the slot width'],
                  ['overflow', 'Free', 'No slot at all — the line runs as long as its value'],
                ] as const
              ).map(([m, label, hint]) => (
                <button
                  key={m}
                  className={`tab ${fit.mode === m ? 'active' : ''}`}
                  title={hint}
                  data-testid={`inspector-style-fit-${m}`}
                  onClick={() => onCommit(setLineFit(template, fieldId, { mode: m as LineFitMode }))}
                >
                  {label}
                </button>
              ))}
            </span>
          </div>
          {fit.mode !== 'overflow' && (
            <StyleNumRow
              label="Slot width (px)"
              value={fit.maxWidth}
              step={1}
              min={16}
              testid="inspector-style-fit-width"
              hint="How much room the design gives this line, in design px"
              onCommit={(v) => onCommit(setLineFit(template, fieldId, { maxWidth: Math.max(16, v) }))}
            />
          )}
        </>
      )}

      {slot && (
        <>
          <div className="inspector-group-label">Slot</div>
          <StyleNumRow
            label="Width (design px)"
            value={slot.width}
            step={1}
            min={8}
            testid="inspector-style-slot-w"
            onCommit={(v) => onCommit(setSlotSize(template, place.wrapperId, Math.max(8, v), slot.height, slot.scaled))}
          />
          <StyleNumRow
            label="Height (design px)"
            value={slot.height}
            step={1}
            min={8}
            testid="inspector-style-slot-h"
            onCommit={(v) => onCommit(setSlotSize(template, place.wrapperId, slot.width, Math.max(8, v), slot.scaled))}
          />
        </>
      )}

      <p className="hint inspector-hint">
        A placed field's look is design, not motion: these edit the field's own CSS rules — the
        same ones the canvas drag and corner handle write. Motion lives on the Animations tab.
      </p>
    </div>
  );
}
