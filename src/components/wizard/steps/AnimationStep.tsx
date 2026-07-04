import { ANIM_PRESETS } from '../../../templates/lowerThirds/animPresets';
import { CREDITS_PRESETS } from '../../../templates/endCredits/creditsPresets';
import { EASINGS, type EasingId } from '../../../model/easings';
import type { AnimSpeed, TemplateVariant } from '../../../model/wizard';
import type { DraftPatch, WizardDraft } from '../draft';

/** Every preset across categories (a variant lists which ones suit it). */
const ALL_PRESETS = [...ANIM_PRESETS, ...CREDITS_PRESETS];

interface Props {
  variant: TemplateVariant;
  draft: WizardDraft;
  onDraft: (patch: DraftPatch) => void;
  /** Replays the entrance in the live preview (for re-clicking the active preset). */
  onReplay: () => void;
}

const SPEEDS: { label: string; value: AnimSpeed }[] = [
  { label: 'Slower', value: 0.75 },
  { label: 'Normal', value: 1 },
  { label: 'Faster', value: 1.5 },
];

/** Step 5 — motion: preset, speed, easing, and multi-step mode. */
export default function AnimationStep({ variant, draft, onDraft, onReplay }: Props) {
  const presets = ALL_PRESETS.filter((p) => variant.animationPresets.includes(p.id));
  const active = draft.animation.presetId ?? variant.animationPresets[0];
  // Credits have no line-reveal steps (their content is the credit list itself).
  const stepsApply = draft.lines.length > 1 && variant.category !== 'end-credits';

  const standard = EASINGS.filter((e) => e.tag === 'standard');
  const playful = EASINGS.filter((e) => e.tag === 'playful');
  const continuous = EASINGS.filter((e) => e.tag === 'continuous');
  const activeEasing = EASINGS.find((e) => e.id === draft.animation.easing);

  return (
    <div>
      <div className="panel-section">
        <h3>Animation <span className="muted">(click a preset to watch it in the preview)</span></h3>
        <div className="wz-anim-grid">
          {presets.map((p) => (
            <button
              key={p.id}
              className={`wz-anim ${active === p.id ? 'selected' : ''}`}
              onClick={() => {
                if (active === p.id) onReplay();
                else onDraft({ animation: { presetId: p.id } });
              }}
            >
              <strong>{p.name}</strong>
              <span className="hint">{p.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
        <div className="panel-section">
          <h3>Speed</h3>
          <div className="row" style={{ gap: 6 }}>
            {SPEEDS.map((s) => (
              <button
                key={s.value}
                className={draft.animation.speed === s.value ? 'active' : ''}
                onClick={() => onDraft({ animation: { speed: s.value } })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section" style={{ minWidth: 260 }}>
          <h3>Easing <span className="muted">(the feel of the motion)</span></h3>
          <select
            value={draft.animation.easing}
            onChange={(e) => onDraft({ animation: { easing: e.target.value as EasingId } })}
          >
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
            {activeEasing
              ? activeEasing.description
              : 'Entrances settle smoothly (Ease Out family); exits leave quickly (Ease In family).'}
          </p>
        </div>
      </div>

      {stepsApply && (
        <div className="panel-section">
          <label className="row" style={{ gap: 8, alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={draft.animation.steps}
              onChange={(e) => onDraft({ animation: { steps: e.target.checked } })}
            />
            <span>
              <strong>Reveal in steps</strong>
              <span className="hint" style={{ display: 'block' }}>
                Play shows the first line; each SPX <em>Continue</em> reveals the next one
                (test it with the » Next button after creating).
              </span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
