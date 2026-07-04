import { useEffect, useMemo, useState } from 'react';
import { useTemplateStore } from '../../store/templateStore';
import { LOWER_THIRDS, lowerThirdById } from '../../templates/lowerThirds';
import { createBlankTemplate } from '../../templates/blank';
import { draftResolution, draftToOptions, initialDraft, mergeDraft, type DraftPatch, type WizardDraft } from './draft';
import WizardPreview from './WizardPreview';
import EntryStep from './steps/EntryStep';
import CategoryStep from './steps/CategoryStep';
import TemplateStep from './steps/TemplateStep';
import FieldsStep from './steps/FieldsStep';
import StyleStep from './steps/StyleStep';
import AnimationStep from './steps/AnimationStep';

const STEP_TITLES = ['Start', 'Category', 'Template', 'Fields', 'Style', 'Animation'];

/**
 * The choose-first creation wizard (replaces the old template gallery). Six steps —
 * Entry → Category → Template → Fields → Style → Animation — with a persistent live
 * preview from step 2 on. Creating writes the complete, teachable template code; the
 * editor (and the live panels) take over from there.
 */
export default function CreationWizard() {
  const open = useTemplateStore((s) => s.galleryOpen);
  const closeGallery = useTemplateStore((s) => s.closeGallery);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<WizardDraft>(initialDraft);
  const [replayKey, setReplayKey] = useState(0);

  // Fresh wizard every time it opens.
  useEffect(() => {
    if (open) {
      setStep(0);
      setDraft(initialDraft());
    }
  }, [open]);

  // Escape closes (keeps the current project).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGallery();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeGallery]);

  const variant = draft.variantId ? lowerThirdById(draft.variantId) : undefined;

  // The live preview always renders the draft as real template code.
  const previewTemplate = useMemo(
    () => (variant ? variant.create(draftToOptions(variant, draft)) : null),
    [variant, draft],
  );

  if (!open) return null;

  const patch = (p: DraftPatch) => setDraft((d) => mergeDraft(d, p));

  const startBlank = () => {
    applyTemplate(createBlankTemplate(draftResolution(draft), draft.fps));
    setActiveTab('html');
  };

  const create = () => {
    if (!previewTemplate) return;
    applyTemplate(previewTemplate);
    setActiveTab('html');
  };

  const nextDisabled =
    (step === 1 && !draft.category) ||
    (step === 2 && !draft.variantId);

  const showPreview = step >= 2 && !!previewTemplate;

  return (
    <div className="gallery-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeGallery(); }}>
      <div className="wz-modal">
        {/* Header: title + step dots */}
        <div className="wz-header">
          <div>
            <h2>New project</h2>
            <p className="hint">Build it by choosing — then read, learn, and edit the code it writes.</p>
          </div>
          <div className="wz-dots">
            {STEP_TITLES.map((t, i) => (
              <button
                key={t}
                className={`wz-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
                disabled={i > step || (i > 2 && !draft.variantId)}
                onClick={() => setStep(i)}
                title={t}
              >
                <span>{i + 1}</span> {t}
              </button>
            ))}
          </div>
          <button className="gallery-close" onClick={closeGallery} title="Cancel (keep current project)">✕</button>
        </div>

        {/* Body: step content (+ live preview from step 2) */}
        <div className={`wz-body ${showPreview ? 'with-preview' : ''}`}>
          <div className="wz-step">
            {step === 0 && (
              <EntryStep onTemplates={() => setStep(1)} onBlank={startBlank} />
            )}
            {step === 1 && (
              <CategoryStep
                selected={draft.category}
                onSelect={(category) => {
                  patch({ category });
                  setStep(2);
                }}
              />
            )}
            {step === 2 && (
              <TemplateStep
                variants={LOWER_THIRDS}
                draft={draft}
                onDraft={patch}
                onPickVariant={(v) =>
                  patch({
                    variantId: v.id,
                    lines: v.suggestedLines.map((l) => ({ ...l })),
                    paletteId: null,
                    fontId: null,
                    zone: null,
                    animation: { presetId: null },
                  })
                }
              />
            )}
            {step === 3 && variant && <FieldsStep variant={variant} draft={draft} onDraft={patch} />}
            {step === 4 && variant && <StyleStep variant={variant} draft={draft} onDraft={patch} />}
            {step === 5 && variant && (
              <AnimationStep
                variant={variant}
                draft={draft}
                onDraft={patch}
                onReplay={() => setReplayKey((k) => k + 1)}
              />
            )}
          </div>

          {showPreview && previewTemplate && (
            <aside className="wz-side">
              <WizardPreview template={previewTemplate} replayKey={replayKey} />
            </aside>
          )}
        </div>

        {/* Footer */}
        <div className="wz-footer">
          <div>
            {step > 0 && <button onClick={() => setStep(step - 1)}>‹ Back</button>}
          </div>
          <div className="row" style={{ gap: 8 }}>
            {step > 0 && step < 5 && (
              <button disabled={nextDisabled} onClick={() => setStep(step + 1)}>
                Next ›
              </button>
            )}
            {step >= 2 && (
              <button className="primary" disabled={!previewTemplate} onClick={create}>
                Create project
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
