import { useTemplateStore } from '../store/templateStore';
import { presetConfigFromTemplate, presetsForType, readAnimationInfo, setAnimKnob, swapAnimationPreset } from '../blocks/animPatch';
import { EASINGS, resolveEasing, type EasingId } from '../model/easings';
import type { AnimPresetId } from '../model/wizard';
import { replaceDefinitionInHtml } from '../model/spxDefinition';

const SPEEDS = [
  { label: 'Slower', value: 0.75 },
  { label: 'Normal', value: 1 },
  { label: 'Faster', value: 1.5 },
];

/**
 * The live Animation panel. It only ever rewrites the marked ANIMATION region (preset
 * swaps, steps toggle) or the three knob variables (speed, easeIn, easeOut) — code
 * outside the markers is never touched. Preset/steps swaps are undoable (Ctrl+Z).
 */
export default function AnimationPanel() {
  const template = useTemplateStore((s) => s.template);
  const setJs = useTemplateStore((s) => s.setJs);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);

  const info = readAnimationInfo(template.js);

  if (!info.hasRegion) {
    return (
      <div className="panel-section">
        <h3>Animation</h3>
        <p className="hint">
          This template has no managed animation region (wizard-made templates do). Animate it
          by hand in the JS tab — the Learn tab and the GSAP building blocks can help.
        </p>
      </div>
    );
  }

  const categoryPresets = presetsForType(template.type);

  const swapPreset = (presetId: AnimPresetId) => {
    const preset = categoryPresets.find((p) => p.id === presetId) ?? categoryPresets[0];
    // A new preset brings its own designed feel: reset the eases to its auto pair.
    const cfg = {
      ...presetConfigFromTemplate(template, info.steps),
      easeIn: preset.autoEase.easeIn,
      easeOut: preset.autoEase.easeOut,
    };
    applyTemplate({ ...template, js: swapAnimationPreset(template.js, presetId, cfg) });
    setActiveTab('js');
  };

  const setSpeed = (value: number) => setJs(setAnimKnob(template.js, 'animSpeed', String(value)));

  const setEasing = (easing: EasingId) => {
    const auto =
      (info.presetId && categoryPresets.find((p) => p.id === info.presetId)?.autoEase) ||
      { easeIn: 'power2.out', easeOut: 'power2.in' };
    const pair = resolveEasing(easing, auto);
    let js = setAnimKnob(template.js, 'easeIn', pair.easeIn);
    js = setAnimKnob(js, 'easeOut', pair.easeOut);
    setJs(js);
  };

  const toggleSteps = (on: boolean) => {
    const cfg = presetConfigFromTemplate(template, on);
    const presetId = info.presetId ?? 'slide-fade';
    const js = swapAnimationPreset(template.js, presetId, cfg);
    const steps = on && cfg.lineCount > 1 ? String(cfg.lineCount) : '1';
    const settings = { ...template.settings, steps };
    const html = replaceDefinitionInHtml(template.html, settings, template.fields);
    applyTemplate({ ...template, js, html, settings });
    setActiveTab('js');
  };

  const standard = EASINGS.filter((e) => e.tag === 'standard');
  const playful = EASINGS.filter((e) => e.tag === 'playful');
  const continuous = EASINGS.filter((e) => e.tag === 'continuous');

  return (
    <div>
      <div className="panel-section">
        <h3>Preset <span className="muted">(rewrites only the marked region — undo with Ctrl+Z)</span></h3>
        <div className="wz-anim-grid" style={{ gridTemplateColumns: '1fr' }}>
          {categoryPresets.map((p) => (
            <button
              key={p.id}
              className={`wz-anim ${info.presetId === p.id ? 'selected' : ''}`}
              onClick={() => swapPreset(p.id)}
            >
              <strong>{p.name}</strong>
              <span className="hint">{p.description}</span>
            </button>
          ))}
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
        <h3>Easing</h3>
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

      {!['end-credits', 'ticker'].includes(template.type) && (
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
