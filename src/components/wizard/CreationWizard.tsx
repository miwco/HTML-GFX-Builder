import { useEffect, useMemo, useState } from 'react';
import { useTemplateStore } from '../../store/templateStore';
import { variantById, variantsFor } from '../../templates/catalog';
import { createBlankTemplate } from '../../templates/blank';
import { brandPatch, buildDraftTemplate, draftResolution, initialDraft, mergeDraft, type DraftPatch, type WizardDraft } from './draft';
import { loadBrand, saveBrand, type ProjectBrand } from '../../model/brand';
import { importTemplateFile } from '../../model/importTemplate';
import { paletteById } from '../../model/wizard';
import WizardPreview from './WizardPreview';
import BrandLogo from '../BrandLogo';
import EntryStep from './steps/EntryStep';
import ImportStep from './steps/ImportStep';
import CategoryStep from './steps/CategoryStep';
import TemplateStep from './steps/TemplateStep';
import FieldsStep from './steps/FieldsStep';
import StyleStep from './steps/StyleStep';
import AnimationStep from './steps/AnimationStep';
import AiStep from './steps/AiStep';
import type { SpxTemplate } from '../../model/types';

const STEP_TITLES = ['Start', 'Category', 'Template', 'Fields', 'Style', 'Animation'];
const STEP_TITLES_IMPORT = ['Start', 'Import', 'Template', 'Fields', 'Style', 'Animation'];
const STEP_TITLES_AI = ['Start', 'Describe'];

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
  const [mode, setMode] = useState<'template' | 'import' | 'ai'>('template');
  const [draft, setDraft] = useState<WizardDraft>(initialDraft);
  const [replayKey, setReplayKey] = useState(0);
  // Describe-it mode: the AI's current (validated) result, previewed live like any draft.
  const [aiResult, setAiResult] = useState<{ template: SpxTemplate; valid: boolean } | null>(null);
  // The saved project brand (the "Use current project's colors & font" toggle keeps new
  // graphics in the same package).
  const [brand, setBrand] = useState<ProjectBrand | null>(null);
  const [matchBrand, setMatchBrand] = useState(false);

  // Fresh wizard every time it opens; reload the brand (it may have just been saved).
  useEffect(() => {
    if (open) {
      setStep(0);
      setMode('template');
      setDraft(initialDraft());
      setAiResult(null);
      const b = loadBrand();
      setBrand(b);
      // Off by default: reusing the previous project's look is an explicit choice,
      // not something a new graphic silently inherits.
      setMatchBrand(false);
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

  const variant = draft.variantId ? variantById(draft.variantId) : undefined;

  // The live preview always renders the draft as real template code.
  const previewTemplate = useMemo(
    () => (variant ? buildDraftTemplate(variant, draft) : null),
    [variant, draft],
  );

  // On the Animation step the preview demos the full lifecycle (in → hold → out → in)
  // so the exit is actually seen — unless the user is tuning the entrance only.
  const demoOut =
    step === 5 &&
    !!variant &&
    ['lower-third', 'info-card', 'scoreboard', 'corner-bug'].includes(variant.category) &&
    draft.animation.direction !== 'in';

  if (!open) return null;

  const patch = (p: DraftPatch) => setDraft((d) => mergeDraft(d, p));

  const startBlank = () => {
    applyTemplate(createBlankTemplate(draftResolution(draft), draft.fps), { resetSampleData: true });
    setActiveTab('html');
  };

  const createFromAi = () => {
    if (!aiResult?.valid) return;
    applyTemplate(aiResult.template, { resetSampleData: true });
    setActiveTab('html');
  };

  const create = () => {
    if (!previewTemplate || !variant) return;
    applyTemplate(previewTemplate, { resetSampleData: true });
    setActiveTab('html');
    // Remember this look as the project brand so the next graphic matches it.
    saveBrand({
      styleTag: variant.styleTag,
      palette:
        draft.customPalette ??
        (draft.paletteId ? paletteById(draft.paletteId) : variant.defaultPalette),
      fontId: draft.fontId && draft.fontId !== 'custom' ? draft.fontId : draft.fontId === 'custom' ? null : variant.defaultFontId,
      customFont: draft.fontId === 'custom' ? draft.customFont : null,
    });
  };

  const nextDisabled =
    (step === 1 && (mode === 'import' ? draft.importedImages.length === 0 || !draft.category : !draft.category)) ||
    (step === 2 && !draft.variantId);

  const showPreview = mode === 'ai' ? step === 1 && !!aiResult : step >= 2 && !!previewTemplate;
  const stepTitles = mode === 'ai' ? STEP_TITLES_AI : mode === 'import' ? STEP_TITLES_IMPORT : STEP_TITLES;

  // Ordering: imported images put logo-slot designs first; a matched brand puts its
  // style family first (so the package's siblings lead).
  const orderedVariants = [...variantsFor(draft.category)].sort((a, b) => {
    if (draft.importedImages.length > 0) {
      const logo = Number(b.hasLogoSlot) - Number(a.hasLogoSlot);
      if (logo !== 0) return logo;
    }
    if (matchBrand && brand) {
      return Number(b.styleTag === brand.styleTag) - Number(a.styleTag === brand.styleTag);
    }
    return 0;
  });

  return (
    <div className="gallery-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeGallery(); }}>
      <div className="wz-modal">
        {/* Header: title + step dots */}
        <div className="wz-header">
          <div className="wz-title">
            <BrandLogo size={20} />
            <span className="wz-title-sep">·</span>
            <span className="wz-title-step">
              {mode === 'ai' ? 'Describe it' : mode === 'import' ? 'Import' : 'New project'}
            </span>
          </div>
          <div className="wz-dots">
            {stepTitles.map((t, i) => (
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
              <EntryStep
                onTemplates={() => { setMode('template'); setStep(1); }}
                onImport={() => { setMode('import'); setStep(1); }}
                onAi={() => { setMode('ai'); setStep(1); }}
                onBlank={startBlank}
              />
            )}
            {step === 1 && mode === 'ai' && (
              <AiStep
                resolution={draftResolution(draft)}
                fps={draft.fps}
                brandPalette={matchBrand && brand ? brand.palette : null}
                result={aiResult?.template ?? null}
                onResult={(template, valid) => setAiResult(template ? { template, valid } : null)}
              />
            )}
            {step === 1 && mode === 'import' && (
              <ImportStep
                images={draft.importedImages}
                onImages={(importedImages) =>
                  patch({ importedImages, logoAssetPath: importedImages[0]?.path ?? null })
                }
                onContinue={(category) => {
                  patch({ category });
                  setStep(2);
                }}
                onTemplateFile={async (file) => {
                  try {
                    const imported = await importTemplateFile(file);
                    applyTemplate(imported, { resetSampleData: true });
                    setActiveTab('html');
                    // Land on Export: its inline validation shows what (if anything) needs
                    // fixing before the template is SPX/CasparCG/OGraf-ready.
                    useTemplateStore.getState().setActivePanel('export');
                    return null;
                  } catch (e) {
                    return e instanceof Error ? e.message : String(e);
                  }
                }}
              />
            )}
            {step === 1 && mode === 'template' && (
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
                variants={orderedVariants}
                draft={draft}
                onDraft={patch}
                onPickVariant={(v) =>
                  patch({
                    variantId: v.id,
                    lines: v.suggestedLines.map((l) => ({ ...l })),
                    zone: null,
                    animation: { presetId: null, outPresetId: null },
                    // Matched brand carries the package look into every new graphic.
                    ...(matchBrand && brand
                      ? brandPatch(brand)
                      : { paletteId: null, customPalette: null, fontId: null }),
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

          {showPreview && (mode === 'ai' ? aiResult : previewTemplate) && (
            <aside className="wz-side">
              <WizardPreview
                template={mode === 'ai' ? aiResult!.template : previewTemplate!}
                replayKey={replayKey}
                demoOut={demoOut}
              />
            </aside>
          )}
        </div>

        {/* Footer */}
        <div className="wz-footer">
          <div className="row" style={{ gap: 14, alignItems: 'center' }}>
            {step > 0 && <button onClick={() => setStep(step - 1)}>‹ Back</button>}
            {brand && (mode === 'ai' ? step >= 1 : step >= 2) && (
              <label className="wz-match" title="Reuse this project's palette and font so the new graphic belongs to the same package">
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={matchBrand}
                  onChange={(e) => {
                    setMatchBrand(e.target.checked);
                    patch(
                      e.target.checked
                        ? brandPatch(brand)
                        : { paletteId: null, customPalette: null, fontId: null },
                    );
                  }}
                />
                Use current project's colors &amp; font
              </label>
            )}
          </div>
          <div className="row" style={{ gap: 8 }}>
            {mode === 'ai' && step === 1 && (
              <button
                className="primary"
                disabled={!aiResult?.valid}
                onClick={createFromAi}
                title={aiResult && !aiResult.valid ? 'The result has validation errors — refine or regenerate first' : undefined}
              >
                Create project
              </button>
            )}
            {/* "Create project" is the quiet shortcut (primary only on the last step,
                where it's the sole forward action); "Next ›" is the highlighted path. */}
            {mode !== 'ai' && step >= 2 && (
              <button
                className={step === 5 ? 'primary' : undefined}
                disabled={!previewTemplate}
                onClick={create}
                title="Create the project now — remaining steps keep their defaults"
              >
                Create project
              </button>
            )}
            {mode !== 'ai' && step > 0 && step < 5 && (
              <button className="primary wz-next" disabled={nextDisabled} onClick={() => setStep(step + 1)}>
                Next ›
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
