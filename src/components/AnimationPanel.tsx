import { useState } from 'react';
import { useTemplateStore } from '../store/templateStore';
import {
  presetConfigFromTemplate,
  presetsForType,
  readAnimationInfo,
  setAnimKnob,
  swapAnimationPhase,
  type AnimPhase,
} from '../blocks/animPatch';
import { EASINGS, resolveEasing, type EasingId } from '../model/easings';
import type { AnimPresetId } from '../model/wizard';
import { replaceDefinitionInHtml } from '../model/spxDefinition';

const SPEEDS = [
  { label: 'Slower', value: 0.75 },
  { label: 'Normal', value: 1 },
  { label: 'Faster', value: 1.5 },
];

const PHASES: { id: AnimPhase; label: string; blurb: string }[] = [
  { id: 'both', label: 'Both', blurb: 'replaces the entrance AND the exit' },
  { id: 'in', label: 'In only', blurb: 'replaces just the entrance — the exit stays' },
  { id: 'out', label: 'Out only', blurb: 'replaces just the exit — the entrance stays' },
];

/**
 * The live Motion panel. It only ever rewrites the marked ANIMATION region (preset swaps,
 * steps toggle) or the three knob variables (speed, easeIn, easeOut) — code outside the
 * markers is never touched. The phase control scopes preset/easing changes to the
 * entrance, the exit, or both; every change replays the graphic so you SEE it, and the
 * changed lines light up in the JS tab. Everything is undoable (Ctrl+Z).
 */
export default function AnimationPanel() {
  const template = useTemplateStore((s) => s.template);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const requestReplay = useTemplateStore((s) => s.requestReplay);

  const [phase, setPhase] = useState<AnimPhase>('both');

  const info = readAnimationInfo(template.js);

  if (!info.hasRegion) {
    return (
      <div className="panel-section">
        <h3>Motion</h3>
        <p className="hint">
          This template has no managed animation region (wizard- and AI-made templates do).
          Animate it by hand in the JS tab, or ask the AI panel to add the marked region.
        </p>
      </div>
    );
  }

  const categoryPresets = presetsForType(template.type);
  const presetName = (id: AnimPresetId | null) =>
    (id && categoryPresets.find((p) => p.id === id)?.name) ?? 'Custom';

  // Apply a change, then show it: highlight lands via applyTemplate, the JS tab comes to
  // the front, and the playout replays so the new motion is immediately visible.
  const applyAndShow = (js: string, extra?: { html: string; settings: typeof template.settings }) => {
    applyTemplate({ ...template, js, ...(extra ?? {}) });
    setActiveTab('js');
    requestReplay();
  };

  const swapPreset = (presetId: AnimPresetId) => {
    const preset = categoryPresets.find((p) => p.id === presetId) ?? categoryPresets[0];
    // The swapped phase gets the preset's designed ease; the untouched phase keeps its
    // current value (swapAnimationPhase re-stamps the knobs from this cfg).
    const cfg = {
      ...presetConfigFromTemplate(template, info.steps),
      easeIn: phase === 'out' ? info.easeIn ?? preset.autoEase.easeIn : preset.autoEase.easeIn,
      easeOut: phase === 'in' ? info.easeOut ?? preset.autoEase.easeOut : preset.autoEase.easeOut,
    };
    applyAndShow(swapAnimationPhase(template.js, presetId, cfg, phase));
  };

  const setSpeed = (value: number) =>
    applyAndShow(setAnimKnob(template.js, 'animSpeed', String(value)));

  const setEasing = (easing: EasingId) => {
    const autoOf = (id: AnimPresetId | null) =>
      (id && categoryPresets.find((p) => p.id === id)?.autoEase) ||
      { easeIn: 'power2.out', easeOut: 'power2.in' };
    // Each phase resolves against ITS preset's tuned pair (matters for easing "auto").
    const inPair = resolveEasing(easing, autoOf(info.inPresetId));
    const outPair = resolveEasing(easing, autoOf(info.outPresetId));
    let js = template.js;
    if (phase !== 'out') js = setAnimKnob(js, 'easeIn', inPair.easeIn);
    if (phase !== 'in') js = setAnimKnob(js, 'easeOut', outPair.easeOut);
    applyAndShow(js);
  };

  const toggleSteps = (on: boolean) => {
    const cfg = presetConfigFromTemplate(template, on);
    const presetId = info.inPresetId ?? 'slide-fade';
    // Steps are part of the entrance: re-emit the IN phase, keep the exit as-is.
    const js = swapAnimationPhase(template.js, presetId, cfg, 'in');
    const steps = on && cfg.lineCount > 1 ? String(cfg.lineCount) : '1';
    const settings = { ...template.settings, steps };
    const html = replaceDefinitionInHtml(template.html, settings, template.fields);
    applyAndShow(js, { html, settings });
  };

  const standard = EASINGS.filter((e) => e.tag === 'standard');
  const playful = EASINGS.filter((e) => e.tag === 'playful');
  const continuous = EASINGS.filter((e) => e.tag === 'continuous');

  const activePhase = PHASES.find((p) => p.id === phase)!;

  return (
    <div>
      <div className="panel-section">
        <h3>What to change</h3>
        <div className="row" style={{ gap: 6 }}>
          {PHASES.map((p) => (
            <button
              key={p.id}
              className={phase === p.id ? 'active' : ''}
              onClick={() => setPhase(p.id)}
              title={`Clicking a preset below ${p.blurb}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 6 }}>
          Now: <strong>In</strong> {presetName(info.inPresetId)} · <strong>Out</strong>{' '}
          {presetName(info.outPresetId)}. Clicking a preset {activePhase.blurb}, replays the
          graphic, and highlights the new code in the JS tab.
        </p>
      </div>

      <div className="panel-section">
        <h3>Preset <span className="muted">(rewrites only the marked region — undo with Ctrl+Z)</span></h3>
        <div className="wz-anim-grid" style={{ gridTemplateColumns: '1fr' }}>
          {categoryPresets.map((p) => {
            const isIn = info.inPresetId === p.id;
            const isOut = info.outPresetId === p.id;
            const selected = phase === 'in' ? isIn : phase === 'out' ? isOut : isIn && isOut;
            return (
              <button key={p.id} className={`wz-anim ${selected ? 'selected' : ''}`} onClick={() => swapPreset(p.id)}>
                <strong>
                  {p.name}
                  {(isIn || isOut) && (
                    <span className="muted" style={{ fontWeight: 400 }}>
                      {' '}· {isIn && isOut ? 'in + out' : isIn ? 'in' : 'out'}
                    </span>
                  )}
                </strong>
                <span className="hint">{p.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel-section">
        <h3>Speed</h3>
        <div className="row" style={{ gap: 6 }}>
          {SPEEDS.map((s) => (
            <button key={s.value} className={info.speed === s.value ? 'active' : ''} onClick={() => setSpeed(s.value)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3>Easing <span className="muted">(applies to: {activePhase.label.toLowerCase()})</span></h3>
        <select defaultValue="" onChange={(e) => e.target.value && setEasing(e.target.value as EasingId)}>
          <option value="" disabled>
            {info.easeIn ? `Current: ${info.easeIn} / ${info.easeOut}` : 'Choose…'}
          </option>
          <option value="auto">Auto — the preset's tuned curves</option>
          <optgroup label="Standard">
            {standard.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </optgroup>
          <optgroup label="Playful (use sparingly)">
            {playful.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </optgroup>
          <optgroup label="Continuous motion only">
            {continuous.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </optgroup>
        </select>
        <p className="hint" style={{ marginTop: 6 }}>
          Writes the <code className="inline">easeIn</code> / <code className="inline">easeOut</code>{' '}
          variables in the JS — entrances settle smoothly, exits leave quickly.
        </p>
      </div>

      {!['end-credits', 'ticker', 'starting-soon', 'countdown', 'infographic', 'quiz'].includes(template.type) && (
      <div className="panel-section">
        <label className="row" style={{ gap: 8, alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={info.steps}
            onChange={(e) => toggleSteps(e.target.checked)}
          />
          <span>
            <strong>Reveal in steps</strong>
            <span className="hint" style={{ display: 'block' }}>
              Play shows the first line; each SPX Continue (» Next) reveals the next one.
            </span>
          </span>
        </label>
      </div>
      )}
    </div>
  );
}
