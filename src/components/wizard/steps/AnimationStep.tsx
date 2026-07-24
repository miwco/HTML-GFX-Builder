import { SLIDE_FAMILY, isSlidePreset } from '../../../templates/lowerThirds/animPresets';
import { EASINGS, type EasingId } from '../../../model/easings';
import { ALL_PRESETS, type AnimPhase } from '../../../blocks/presetRegistry';
import type { AnimPresetId, AnimSpeed, TemplateVariant } from '../../../model/wizard';
import type { DraftPatch, WizardDraft } from '../draft';

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
const PHASE_CATEGORIES = ['lower-third', 'info-card', 'scoreboard', 'corner-bug', 'imported-design'];

/** The Slide family's direction picker: arrows point the way the graphic travels in. */
const SLIDE_DIRS: { id: AnimPresetId; arrow: string; hint: string }[] = [
  { id: 'slide-up', arrow: '↑', hint: 'Up — enters from below' },
  { id: 'slide-down', arrow: '↓', hint: 'Down — enters from above' },
  { id: 'slide-left', arrow: '←', hint: 'Left — enters from the right edge' },
  { id: 'slide-right', arrow: '→', hint: 'Right — enters from the left edge' },
];

/** Step 5 — motion: direction, preset, speed, easing, and multi-step mode. */
export default function AnimationStep({ variant, draft, onDraft, onReplay }: Props) {
  // The slide family renders as ONE card with a direction picker: a variant that lists
  // any member offers all four (the standard structure takes any direction).
  const presets = ALL_PRESETS.filter(
    (p) => variant.animationPresets.includes(p.id) && !isSlidePreset(p.id),
  );
  const hasSlide = variant.animationPresets.some(isSlidePreset);
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
  // clock formats (starting-soon, game timers) have no line-by-line reveal. An imported
  // design is ONE picture: its text is placed inside artwork drawn around it, so revealing
  // a line on its own has nothing to do with how the graphic goes on air.
  const stepsApply =
    draft.lines.length > 1 &&
    !['end-credits', 'ticker', 'starting-soon', 'game-timer', 'infographic', 'quiz', 'imported-design'].includes(
      variant.category,
    );

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
          {hasSlide && (() => {
            const isInSlide = isSlidePreset(inActive);
            const isOutSlide = isSlidePreset(outActive);
            const activeForPhase = direction === 'out' ? outActive : inActive;
            const slideActive = isSlidePreset(activeForPhase) ? activeForPhase : null;
            const selected =
              direction === 'in' ? isInSlide
              : direction === 'out' ? isOutSlide
              : isInSlide && isOutSlide && inActive === outActive;
            return (
              <div className="wz-anim-cell">
                <button
                  className={`wz-anim ${selected ? 'selected' : ''}`}
                  onClick={() => pickPreset(slideActive ?? SLIDE_FAMILY[0])}
                >
                  <strong>
                    Slide
                    {mixed && (isInSlide || isOutSlide) && (
                      <span className="muted" style={{ fontWeight: 400 }}>
                        {' '}· {isInSlide && isOutSlide ? 'in + out' : isInSlide ? 'in' : 'out'}
                      </span>
                    )}
                  </strong>
                  <span className="hint">
                    Glides in from one side and slips back out the same way — pick the direction of travel below.
                  </span>
                </button>
                <div className="wz-anim-dirs" role="group" aria-label="Slide direction">
                  {SLIDE_DIRS.map((d) => (
                    <button
                      key={d.id}
                      className={slideActive === d.id ? 'active' : ''}
                      onClick={() => pickPreset(d.id)}
                      title={d.hint}
                    >
                      {d.arrow}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
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
              checked={draft.animation.steps ?? variant.defaultSteps ?? false}
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
