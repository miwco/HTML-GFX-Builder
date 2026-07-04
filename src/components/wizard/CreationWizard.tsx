import { useEffect, useMemo, useState } from 'react';
import { useTemplateStore } from '../../store/templateStore';
import { variantById, variantsFor } from '../../templates/catalog';
import { createBlankTemplate } from '../../templates/blank';
import { brandPatch, draftResolution, draftToOptions, initialDraft, mergeDraft, type DraftPatch, type WizardDraft } from './draft';
import { loadBrand, saveBrand, type ProjectBrand } from '../../model/brand';
import { paletteById } from '../../model/wizard';
import WizardPreview from './WizardPreview';
import EntryStep from './steps/EntryStep';
import ImportStep from './steps/ImportStep';
import CategoryStep from './steps/CategoryStep';
import TemplateStep from './steps/TemplateStep';
import FieldsStep from './steps/FieldsStep';
import StyleStep from './steps/StyleStep';
import AnimationStep from './steps/AnimationStep';

const STEP_TITLES = ['Start', 'Category', 'Template', 'Fields', 'Style', 'Animation'];
const STEP_TITLES_IMPORT = ['Start', 'Import', 'Template', 'Fields', 'Style', 'Animation'];

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
  const [mode, setMode] = useState<'template' | 'import'>('template');
  const [draft, setDraft] = useState<WizardDraft>(initialDraft);
  const [replayKey, setReplayKey] = useState(0);
  // The saved project brand ("Match current project" keeps new graphics in the same package).
  const [brand, setBrand] = useState<ProjectBrand | null>(null);
  const [matchBrand, setMatchBrand] = useState(false);

  // Fresh wizard every time it opens; reload the brand (it may have just been saved).
  useEffect(() => {
    if (open) {
      setStep(0);
      setMode('template');
      setDraft(initialDraft());
      const b = loadBrand();
      setBrand(b);
      setMatchBrand(!!b);
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
    if (!previewTemplate || !variant) return;
    applyTemplate(previewTemplate);
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

  const showPreview = step >= 2 && !!previewTemplate;
  const stepTitles = mode === 'import' ? STEP_TITLES_IMPORT : STEP_TITLES;

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
          <div>
            <h2>New project</h2>
            <p className="hint">Build it by choosing — then read, learn, and edit the code it writes.</p>
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
                onBlank={startBlank}
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
                    animation: { presetId: null },
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

          {showPreview && previewTemplate && (
            <aside className="wz-side">
              <WizardPreview template={previewTemplate} replayKey={replayKey} />
            </aside>
          )}
        </div>

        {/* Footer */}
        <div className="wz-footer">
          <div className="row" style={{ gap: 14, alignItems: 'center' }}>
            {step > 0 && <button onClick={() => setStep(step - 1)}>‹ Back</button>}
            {brand && step >= 2 && (
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
                Match current project
              </label>
            )}
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
