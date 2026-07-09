import { ANIM_PRESETS } from '../../../templates/lowerThirds/animPresets';
import { CREDITS_PRESETS } from '../../../templates/endCredits/creditsPresets';
import { TICKER_PRESETS } from '../../../templates/tickers/tickerPresets';
import { SS_PRESETS } from '../../../templates/startingSoon/ssPresets';
import { GT_PRESETS } from '../../../templates/gameTimers/gtPresets';
import { IG_PRESETS } from '../../../templates/infographics/igPresets';
import { QUIZ_PRESETS } from '../../../templates/quiz/quizPresets';
import { EASINGS, type EasingId } from '../../../model/easings';
import type { AnimPhase } from '../../../blocks/animPatch';
import type { AnimPresetId, AnimSpeed, TemplateVariant } from '../../../model/wizard';
import type { DraftPatch, WizardDraft } from '../draft';

/** Every preset across categories (a variant lists which ones suit it). */
const ALL_PRESETS = [
  ...ANIM_PRESETS, ...CREDITS_PRESETS, ...TICKER_PRESETS,
  ...SS_PRESETS, ...GT_PRESETS, ...IG_PRESETS, ...QUIZ_PRESETS,
];

interface Props {
  variant: TemplateVariant;
  draft: WizardDraft;
  onDraft: (patch: DraftPatch) => void;
  /** Replays the animation in the live preview (for re-clicking the active preset). */
  onReplay: () => void;
}

const SPEEDS: { label: string; value: AnimSpeed }[] = [
  { label: 'Slower', value: 0.75 },
  { label: 'Normal', value: 1 },
  { label: 'Faster', value: 1.5 },
];

const DIRECTIONS: { id: AnimPhase; label: string; hint: string }[] = [
  { id: 'both', label: 'In and out', hint: 'One matched style animates the graphic on and off air.' },
  { id: 'in', label: 'In only', hint: 'Pick the entrance — the exit keeps its current style.' },
  { id: 'out', label: 'Out only', hint: 'Pick the exit — the entrance keeps its current style.' },
];

/** The categories whose presets share the standard in/out structure (mixable phases). */
const PHASE_CATEGORIES = ['lower-third', 'info-card', 'scoreboard', 'corner-bug'];

/** Step 5 — motion: direction, preset, speed, easing, and multi-step mode. */
export default function AnimationStep({ variant, draft, onDraft, onReplay }: Props) {
  const presets = ALL_PRESETS.filter((p) => variant.animationPresets.includes(p.id));
  const presetName = (id: AnimPresetId) => ALL_PRESETS.find((p) => p.id === id)?.name ?? id;

  // The entrance preset; the exit matches it unless the user mixed a different one in.
  const inActive = draft.animation.presetId ?? variant.animationPresets[0];
  const outActive = draft.animation.outPresetId ?? inActive;
  const mixed = inActive !== outActive;

  // Direction only applies where presets share the standard in/out structure —
  // continuous formats (credits, tickers) and clocks are one motion, not two phases.
  const phaseApply = PHASE_CATEGORIES.includes(variant.category);
  const direction = phaseApply ? draft.animation.direction : 'both';
  const activeDirection = DIRECTIONS.find((d) => d.id === direction)!;

  const pickPreset = (id: AnimPresetId) => {
    if (direction === 'both') {
      if (inActive === id && outActive === id) return onReplay();
      // One style for both phases (the default): the exit follows the entrance.
      onDraft({ animation: { presetId: id, outPresetId: null } });
    } else if (direction === 'in') {
      if (inActive === id) return onReplay();
      // Pin the exit to its current style so only the entrance changes.
      onDraft({ animation: { presetId: id, outPresetId: outActive } });
    } else {
      if (outActive === id) return onReplay();
      onDraft({ animation: { outPresetId: id } });
    }
  };

  // Credits have no line-reveal steps (their content is the credit list itself).
  // Steps only fit line-based graphics — continuous formats (credits, tickers) and
  // clock formats (starting-soon, game timers) have no line-by-line reveal.
  const stepsApply =
    draft.lines.length > 1 &&
    !['end-credits', 'ticker', 'starting-soon', 'game-timer', 'infographic', 'quiz'].includes(variant.category);

  const standard = EASINGS.filter((e) => e.tag === 'standard');
  const playful = EASINGS.filter((e) => e.tag === 'playful');
  const continuous = EASINGS.filter((e) => e.tag === 'continuous');
  const activeEasing = EASINGS.find((e) => e.id === draft.animation.easing);

  return (
    <div>
      {phaseApply && (
        <div className="panel-section">
          <h3>Direction <span className="muted">(what your style choice applies to)</span></h3>
          <div className="row" style={{ gap: 6 }}>
            {DIRECTIONS.map((d) => (
              <button
                key={d.id}
                className={direction === d.id ? 'active' : ''}
                onClick={() => onDraft({ animation: { direction: d.id } })}
                title={d.hint}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 6 }}>
            {activeDirection.hint}
            {mixed && (
              <>
                {' '}Now: <strong>In</strong> {presetName(inActive)} · <strong>Out</strong>{' '}
                {presetName(outActive)}.
              </>
            )}
          </p>
        </div>
      )}

      <div className="panel-section">
        <h3>
          Animation style{' '}
          <span className="muted">
            {phaseApply && direction !== 'in'
              ? '(click a preset — the preview plays the entrance, then the exit)'
              : '(click a preset to watch it in the preview)'}
          </span>
        </h3>
        <div className="wz-anim-grid">
          {presets.map((p) => {
            const isIn = inActive === p.id;
            const isOut = outActive === p.id;
            const selected = direction === 'in' ? isIn : direction === 'out' ? isOut : isIn && isOut;
            return (
              <button key={p.id} className={`wz-anim ${selected ? 'selected' : ''}`} onClick={() => pickPreset(p.id)}>
                <strong>
                  {p.name}
                  {mixed && (isIn || isOut) && (
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

      <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
        <div className="panel-section">
          <h3>Speed <span className="muted">(entrance and exit)</span></h3>
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
            <option value="auto">Auto — the preset's tuned curves (recommended)</option>
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
                ▶ Play shows only the first line; each press of » Next (SPX <em>Continue</em>)
                reveals one more. Test it with the » Next button after creating.
              </span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
