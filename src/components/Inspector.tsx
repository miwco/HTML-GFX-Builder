import { useMemo, useRef, useState } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { getTemplateParts } from '../model/structure';
import { parseAnimData, spliceAnimData, type AnimData } from '../blocks/animData';
import { importAnimData } from '../blocks/animImport';
import { deleteKeyframe, setKeyframe } from '../blocks/animEdit';
import { applyPresetData, presetDonor } from '../blocks/presetApply';
import { presetsForType, anyPresetById } from '../blocks/animPatch';
import { activationStep, animatedProps, resolveValue, stepSeconds } from '../blocks/animEval';
import type { AnimPresetId } from '../model/wizard';
import { EASINGS, resolveEasing, type EasingId } from '../model/easings';
import { phaseIdOf } from './StepTimeline';

// Timeline v2 Phase 2/4 (docs/TIMELINE_V2_PLAN.md) — the Inspector: the persistent,
// context-sensitive panel to the right of the preview, and the third consumer of the
// shared selection (canvas ↔ timeline ↔ Inspector). On a data-block template the
// Properties tab EDITS: each property carries the familiar diamond — arm it to stamp a
// keyframe at the playhead, edit an armed value to auto-key there, click a diamond that
// sits ON a keyframe to remove it. Legacy templates show read-only resolved values (the
// timeline's "use keyframes" chip converts them).

/** The editable property vocabulary. `track` is the data-model property the keyframes
 *  live on (blur is presentation for filter: 'blur(Npx)'); `base` is the design-state
 *  value used when arming a property that has never animated. */
const PROP_ROWS: { prop: string; track: string; label: string; base: number; step: number; min?: number; max?: number }[] = [
  { prop: 'x', track: 'x', label: 'Position X', base: 0, step: 1 },
  { prop: 'y', track: 'y', label: 'Position Y', base: 0, step: 1 },
  { prop: 'yPercent', track: 'yPercent', label: 'Y (mask %)', base: 0, step: 1 },
  { prop: 'scale', track: 'scale', label: 'Scale', base: 1, step: 0.05, min: 0 },
  { prop: 'opacity', track: 'opacity', label: 'Opacity', base: 1, step: 0.1, min: 0, max: 1 },
  { prop: 'rotation', track: 'rotation', label: 'Rotation', base: 0, step: 1 },
  { prop: 'blur', track: 'filter', label: 'Blur (px)', base: 0, step: 1, min: 0 },
];

const KIND_LABEL: Record<string, string> = {
  root: 'Graphic root',
  panel: 'Panel',
  accent: 'Accent',
  line: 'Text line',
  image: 'Image slot',
  block: 'Block element',
};

const blurPx = (v: number | string | null): number | null => {
  if (v === null) return null;
  if (typeof v === 'number') return v;
  const m = v.match(/blur\((-?[\d.]+)px\)/);
  return m ? Number(m[1]) : null;
};

export default function Inspector() {
  const template = useTemplateStore((s) => s.template);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const requestReplay = useTemplateStore((s) => s.requestReplay);
  const sendScrub = useTemplateStore((s) => s.sendScrub);
  const setPlayhead = useTemplateStore((s) => s.setPlayhead);
  const selectedPart = useTemplateStore((s) => s.selectedPart);
  const selectedParts = useTemplateStore((s) => s.selectedParts);
  const playhead = useTemplateStore((s) => s.playhead);
  // A label drag-scrub in progress (the familiar drag-the-label-to-change-the-value).
  const scrubDrag = useRef<{ prop: string; startX: number; startValue: number; value: number } | null>(null);
  const [tab, setTab] = useState<'properties' | 'animations'>('properties');
  const [presetId, setPresetId] = useState<AnimPresetId | ''>('');
  const [presetPhase, setPresetPhase] = useState<'in' | 'out' | 'both'>('in');
  const [presetEasing, setPresetEasing] = useState<EasingId>('auto');
  // Duration overrides in effective seconds; '' = keep the current step length. In and Out
  // are independent, with an optional link so "both" can be set from one field.
  const [durIn, setDurIn] = useState<string>('');
  const [durOut, setDurOut] = useState<string>('');
  const [linkDur, setLinkDur] = useState(true);
  const [presetMsg, setPresetMsg] = useState<string>('');

  const parts = useMemo(
    () => getTemplateParts(template.html, template.fields),
    [template.html, template.fields],
  );
  // A native data block is editable; legacy regions convert through the importer for a
  // read view only. Null = blank/imported/hand-crafted — identity still shows.
  const native = useMemo(() => parseAnimData(template.js), [template.js]);
  const data = useMemo(() => native ?? importAnimData(template), [native, template]);
  const part = parts.find((p) => p.selector === selectedPart) ?? null;

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

  /** One undoable apply, then re-park the preview at the playhead after the rebuild. */
  const applyData = (next: AnimData) => {
    const js = spliceAnimData(template.js, next);
    if (!js || js === template.js) return;
    applyTemplate({ ...template, js });
    if (playhead && data) setTimeout(() => sendScrub(phaseIdOf(data, playhead.step), playhead.t), 650);
  };

  const stamp = (row: (typeof PROP_ROWS)[number]) => {
    if (!native || !at) return;
    if (kfAt(row.track)) {
      applyData(deleteKeyframe(native, at.step, part.selector, row.track, at.tRel));
      return;
    }
    const current = row.prop === 'blur' ? blurPx(valueOf(row.track)) : valueOf(row.track);
    const value = current === null ? row.base : (current as number);
    applyData(
      setKeyframe(
        native, at.step, part.selector, row.track, at.tRel,
        row.prop === 'blur' ? `blur(${value}px)` : value,
      ),
    );
  };

  const commitValue = (row: (typeof PROP_ROWS)[number], raw: number) => {
    if (!native || !at || !Number.isFinite(raw)) return;
    applyData(
      setKeyframe(
        native, at.step, part.selector, row.track, at.tRel,
        row.prop === 'blur' ? `blur(${raw}px)` : raw,
      ),
    );
  };

  const display = (row: (typeof PROP_ROWS)[number]): string => {
    const v = row.prop === 'blur' ? blurPx(valueOf(row.track)) : valueOf(row.track);
    if (v === null) return '—';
    return typeof v === 'number' ? String(Math.round(v * 100) / 100) : v;
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
    sendScrub(phaseIdOf(data, target.step), t);
  };

  return (
    <div className="inspector" data-testid="inspector">
      <div className="inspector-head">Inspector</div>
      <div className="inspector-identity">
        <span className="inspector-label" data-testid="inspector-part-label">{part.label}</span>
        <span className="inspector-kind">{KIND_LABEL[part.kind] ?? part.kind}</span>
        <code className="inspector-selector">{part.selector}</code>
        {selectedParts.length > 1 && (
          <span className="inspector-multi" data-testid="inspector-multi">
            +{selectedParts.length - 1} more selected — properties show the primary
          </span>
        )}
      </div>

      <div className="inspector-tabs">
        <button className={`tab ${tab === 'properties' ? 'active' : ''}`} onClick={() => setTab('properties')}>
          Properties
        </button>
        <button className={`tab ${tab === 'animations' ? 'active' : ''}`} onClick={() => setTab('animations')}>
          Animations
        </button>
      </div>

      {tab === 'properties' && (
        <div className="inspector-body" data-testid="inspector-properties">
          {data ? (
            <>
              {PROP_ROWS.map((row) => {
                const isArmed = armed.has(row.track);
                const atKf = kfAt(row.track);
                const value = display(row);
                const scrubbable = native && isArmed && value !== '—';
                return (
                  <div className="inspector-row" key={row.prop}>
                    <span
                      className={`inspector-row-label${scrubbable ? ' scrubbable' : ''}`}
                      title={scrubbable ? 'Drag left/right to change the value (keys at the playhead)' : undefined}
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
                          data-testid={`inspector-value-${row.prop === 'blur' ? 'blur' : row.track}`}
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
                );
              })}
              <p className="hint inspector-hint">
                {native
                  ? 'Values at the playhead. ◇ arms a property; editing an armed value keys it at the playhead.'
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

      {tab === 'animations' && (
        <div className="inspector-body" data-testid="inspector-animations">
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
                {presetsForType(template.type).map((p) => (
                  <option key={p.id} value={p.id} title={p.description}>
                    {p.name}
                  </option>
                ))}
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
                  };
                  const next = donor && applyPresetData(native, donor, presetPhase, presetScope, durations);
                  if (!next) {
                    setPresetMsg('This style has no motion for this element.');
                    return;
                  }
                  const js = spliceAnimData(template.js, next);
                  if (!js || js === template.js) {
                    setPresetMsg('No change — already at this style.');
                    return;
                  }
                  setPresetMsg('');
                  applyTemplate({ ...template, js });
                  requestReplay(); // presets are motion — play them
                  // Re-park the preview at the playhead after the debounced rebuild.
                  if (playhead) setTimeout(() => sendScrub(phaseIdOf(native, playhead.step), playhead.t), 650);
                }}
                title="Replace this element's motion in the chosen direction with this style (undo with Ctrl+Z)"
                data-testid="inspector-preset-apply"
              >
                Apply
              </button>
              {presetMsg && (
                <p className="inspector-preset-msg" data-testid="inspector-preset-msg">{presetMsg}</p>
              )}
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
