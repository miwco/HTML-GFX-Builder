import { useEffect, useMemo, useRef, useState } from 'react';
import { useTemplateStore } from '../../store/templateStore';
import { variantById, variantsFor } from '../../templates/catalog';
import { createBlankTemplate } from '../../templates/blank';
import { brandPatch, buildDraftTemplate, draftResolution, initialDraft, mergeDraft, type DraftPatch, type WizardDraft } from './draft';
import { loadBrand, saveBrand, type ProjectBrand } from '../../model/brand';
import { commitStagedSelection } from '../../ai/preferences';
import { formatTemplate } from '../../format/formatCode';
import { paletteById } from '../../model/wizard';
import WizardPreview from './WizardPreview';
import BrandLogo from '../BrandLogo';
import EntryStep from './steps/EntryStep';
import ImportStep from './steps/ImportStep';
import ImportDesignStep from './steps/ImportDesignStep';
import PrepareDesignStep from './steps/PrepareDesignStep';
import CategoryStep from './steps/CategoryStep';
import TemplateStep from './steps/TemplateStep';
import FieldsStep from './steps/FieldsStep';
import StyleStep from './steps/StyleStep';
import AnimationStep from './steps/AnimationStep';
import AiStep from './steps/AiStep';
import VideoStep from './steps/VideoStep';
import type { SpxTemplate } from '../../model/types';
import type { VideoProject } from '../../model/videoTypes';
import { useVideoProjectStore } from '../../store/videoProjectStore';
import { useDocKindStore } from '../../store/docKindStore';

const STEP_TITLES = ['Start', 'Category', 'Template', 'Fields', 'Style', 'Animation'];
const STEP_TITLES_IMPORT = ['Start', 'Images', 'Template', 'Fields', 'Style', 'Animation'];
const STEP_TITLES_AI = ['Start', 'Create'];
const STEP_TITLES_VIDEO = ['Start', 'Video'];
// Import-graphic mode is a SETUP flow, not a second editor: bring the artwork in, prepare it
// (erase baked-in text, pick how it meets long text), create, and land in the real canvas
// editor with the Data tab focused — fields, styling, and animation all happen there
// (docs/IMPORT_MVP.md, "the wizard hands off").
const STEP_TITLES_DESIGN = ['Start', 'Design', 'Prepare'];

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
  const [mode, setMode] = useState<'template' | 'import' | 'design' | 'ai' | 'video'>('template');
  const [draft, setDraft] = useState<WizardDraft>(initialDraft);
  const [replayKey, setReplayKey] = useState(0);
  // Describe-it mode: the AI's current (validated) result, previewed live like any draft.
  const [aiResult, setAiResult] = useState<{ template: SpxTemplate; valid: boolean } | null>(null);
  // The saved project brand (the "Use current project's colors & font" toggle keeps new
  // graphics in the same package).
  const [brand, setBrand] = useState<ProjectBrand | null>(null);
  const [matchBrand, setMatchBrand] = useState(false);
  // Prepare step's content-width slider (Import graphic, stretch mode): preview-only demo
  // text pushed into the live preview — never part of the draft or the created template.
  const [stretchDemo, setStretchDemo] = useState<string | null>(null);
  // Backdrop click-to-close must only fire on a genuine outside click - not when a text
  // selection drag STARTED inside an input (e.g. the video duration field) and released
  // over the backdrop. The browser routes that release's `click` to the backdrop (the
  // nearest common ancestor), so we additionally require the press to have begun there.
  const pressedOnBackdrop = useRef(false);

  // Fresh wizard every time it opens; reload the brand (it may have just been saved).
  useEffect(() => {
    if (open) {
      setStep(0);
      setMode('template');
      setDraft(initialDraft());
      setAiResult(null);
      setStretchDemo(null);
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

  // The live preview always renders the draft as real template code. Design mode's preview
  // may additionally carry the stretch-demo line (preview-only; create() builds without it).
  const previewTemplate = useMemo(
    () => (variant ? buildDraftTemplate(variant, draft, { stretchDemo: mode === 'design' }) : null),
    [variant, draft, mode],
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

  // Creating an SPX graphic (any path) lands in the SPX shell; creating/opening a video
  // lands in the video shell. Only the wizard flips the persisted doc-kind switch.
  const toSpxShell = () => useDocKindStore.getState().setKind('spx');

  const createVideo = (project: VideoProject) => {
    useVideoProjectStore.getState().loadProject(project);
    useDocKindStore.getState().setKind('video');
    closeGallery();
  };

  // Apply a freshly GENERATED template as a new project. Its HTML is tidied through Prettier
  // first (HTML only - the CSS keeps its hand-aligned property comments and the JS animation
  // region stays strict-JSON; see formatTemplate's defaults / docs/FORMATTING.md), so every
  // project starts from one consistent, formatted baseline. Formatting once at birth also keeps
  // later canvas/timeline edits to tight, minimal diffs - the editor's change-highlight stays
  // accurate. Imported templates are NOT routed here: they stay byte-faithful to the user's file.
  const applyGenerated = async (template: SpxTemplate) => {
    const formatted = await formatTemplate(template); // HTML-only by default
    applyTemplate(formatted, { resetSampleData: true });
    setActiveTab('html');
    toSpxShell();
  };

  const startBlank = () => {
    void applyGenerated(createBlankTemplate(draftResolution(draft), draft.fps));
  };

  const createFromAi = () => {
    if (!aiResult?.valid) return;
    // The picked harness alternative becomes the project — commit the staged preference
    // (aggregated, subtle; see src/ai/preferences.ts). A no-alternatives run staged nothing.
    commitStagedSelection();
    void applyGenerated(aiResult.template);
  };

  const create = () => {
    if (!previewTemplate || !variant) return;
    // Design mode rebuilds WITHOUT the preview-only stretch-demo line; every other mode's
    // preview is exactly the created code already.
    void applyGenerated(mode === 'design' ? buildDraftTemplate(variant, draft) : previewTemplate);
    // An imported design creates BARE and hands off to the editor's Data tab — that is
    // where its fields are added, as real placed layers (docs/IMPORT_MVP.md).
    if (variant.category === 'imported-design') useTemplateStore.getState().setActivePanel('data');
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
    (step === 1 &&
      (mode === 'import'
        ? draft.importedImages.length === 0 || !draft.category
        : !draft.category)) ||
    (step === 2 && !draft.variantId);

  // Design mode previews from the moment the artwork lands, through the Prepare step —
  // the user sees the real graphic (and its default entrance) before creating.
  const showPreview =
    mode === 'ai' ? step === 1 && !!aiResult
    : mode === 'video' ? false
    : mode === 'design' ? step >= 1 && !!previewTemplate
    : step >= 2 && !!previewTemplate;
  const stepTitles =
    mode === 'ai' ? STEP_TITLES_AI
    : mode === 'video' ? STEP_TITLES_VIDEO
    : mode === 'design' ? STEP_TITLES_DESIGN
    : mode === 'import' ? STEP_TITLES_IMPORT
    : STEP_TITLES;
  // Rail position → step index (1:1 in every mode).
  const stepIndexes = stepTitles.map((_, i) => i);
  const railPos = stepIndexes.indexOf(step);
  const goToStep = (delta: number) => setStep(stepIndexes[railPos + delta] ?? step);

  // Ordering: imported images put logo-slot designs first; a matched brand puts its
  // style family first (so the package's siblings lead).
  const orderedVariants = [...variantsFor(draft.category)].sort((a, b) => {
    if (draft.importedImages.length > 0) {
      const logo = Number(b.logo !== 'none') - Number(a.logo !== 'none');
      if (logo !== 0) return logo;
    }
    if (matchBrand && brand) {
      return Number(b.styleTag === brand.styleTag) - Number(a.styleTag === brand.styleTag);
    }
    return 0;
  });

  return (
    <div
      className="gallery-backdrop"
      onMouseDown={(e) => { pressedOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedOnBackdrop.current) closeGallery();
        pressedOnBackdrop.current = false;
      }}
    >
      <div className="wz-modal">
        {/* Header: title + step dots */}
        <div className="wz-header">
          <div className="wz-title">
            <BrandLogo size={20} />
            <span className="wz-title-sep">·</span>
            <span className="wz-title-step">
              {mode === 'ai' ? 'Create with AI'
                : mode === 'video' ? 'Video with AI'
                : mode === 'design' ? 'Import graphic'
                : 'New project'}
            </span>
          </div>
          <div className="wz-dots">
            {stepTitles.map((t, i) => {
              const s = stepIndexes[i];
              return (
                <button
                  key={t}
                  className={`wz-dot ${s === step ? 'active' : ''} ${s < step ? 'done' : ''}`}
                  disabled={s > step || (s > 2 && !draft.variantId)}
                  onClick={() => setStep(s)}
                  title={t}
                >
                  <span>{i + 1}</span> {t}
                </button>
              );
            })}
          </div>
          <button className="gallery-close" onClick={closeGallery} title="Cancel (keep current project)">✕</button>
        </div>

        {/* Body: step content (+ live preview from step 2) */}
        <div className={`wz-body ${showPreview ? 'with-preview' : ''}`}>
          <div className="wz-step">
            {step === 0 && (
              <EntryStep
                onTemplates={() => { setMode('template'); setStep(1); }}
                onImportGraphic={() => { setMode('design'); setStep(1); }}
                onAi={() => { setMode('ai'); setStep(1); }}
                onVideo={() => { setMode('video'); setStep(1); }}
                onBlank={startBlank}
              />
            )}
            {step === 1 && mode === 'video' && (
              <VideoStep onCreate={createVideo} onOpen={createVideo} />
            )}
            {step === 1 && mode === 'ai' && (
              <AiStep
                resolution={draftResolution(draft)}
                fps={draft.fps}
                brandPalette={matchBrand && brand ? brand.palette : null}
                result={aiResult?.template ?? null}
                onResult={(template, valid) => setAiResult(template ? { template, valid } : null)}
                onOpenImported={(imported) => {
                  // The byte-faithful path (deliberately NOT applyGenerated/Prettier): the
                  // user's file opens exactly as written, and the Export panel's inline
                  // validation shows what (if anything) needs fixing before it is
                  // SPX/CasparCG/OGraf-ready. applyTemplate closes the wizard.
                  applyTemplate(imported, { resetSampleData: true });
                  setActiveTab('html');
                  useTemplateStore.getState().setActivePanel('export');
                  toSpxShell();
                }}
                onUseTemplates={(images) => {
                  // Skip the AI: design AROUND the images with the catalog — the existing
                  // images -> category -> template-picker continuation (logo-slot first).
                  patch({ importedImages: images, logoAssetPath: images[0]?.path ?? null });
                  setMode('import');
                }}
              />
            )}
            {step === 1 && mode === 'design' && (
              <ImportDesignStep
                art={draft.designArt}
                images={draft.importedImages}
                resolution={draftResolution(draft)}
                onArt={(designArt, importedImages) => {
                  patch({
                    designArt,
                    importedImages,
                    // A fresh drop resets the Prepare step: the pristine pixels become the
                    // erase's source, and any erase from a previous artwork is meaningless.
                    designOriginal: importedImages[0] ?? null,
                    designErase: null,
                    category: 'imported-design',
                    // There is no design to choose — the artwork IS it — so the variant is
                    // settled here, and the graphic creates BARE: its text/number/image
                    // fields are added in the editor's Data tab as real placed layers.
                    variantId: 'imp01',
                    lines: [],
                    zone: null,
                    animation: { presetId: null, outPresetId: null },
                    ...(matchBrand && brand
                      ? brandPatch(brand)
                      : { paletteId: null, customPalette: null, fontId: null }),
                  });
                }}
                onClear={() =>
                  patch({
                    designArt: null,
                    importedImages: [],
                    variantId: null,
                    designOriginal: null,
                    designErase: null,
                  })
                }
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
            {step === 2 && mode === 'design' && draft.designArt && (
              <PrepareDesignStep
                art={draft.designArt}
                resolution={draftResolution(draft)}
                images={draft.importedImages}
                original={draft.designOriginal}
                erase={draft.designErase}
                onApplyErase={(designErase, importedImages) =>
                  patch({ designErase, importedImages })
                }
                onClearErase={() =>
                  patch({
                    designErase: null,
                    importedImages: draft.designOriginal ? [draft.designOriginal] : draft.importedImages,
                  })
                }
                onStretch={(stretch) =>
                  patch({ designArt: { ...draft.designArt!, stretch: stretch ?? undefined } })
                }
                onDemoText={setStretchDemo}
              />
            )}
            {step === 2 && mode !== 'design' && (
              <TemplateStep
                variants={orderedVariants}
                draft={draft}
                onDraft={patch}
                onPickVariant={(v) =>
                  patch({
                    variantId: v.id,
                    lines: v.suggestedLines.map((l) => ({ ...l })),
                    zone: null,
                    logoEnabled: null, // the logo decision belongs to the picked design
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
                demoText={mode === 'design' ? stretchDemo : null}
              />
            </aside>
          )}
        </div>

        {/* Footer */}
        <div className="wz-footer">
          <div className="row" style={{ gap: 14, alignItems: 'center' }}>
            {step > 0 && <button onClick={() => goToStep(-1)}>‹ Back</button>}
            {brand && (mode === 'ai' || mode === 'design' ? step >= 1 : step >= 2) && (
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
                where it's the sole forward action); "Next ›" is the highlighted path.
                Design mode: Create from the Design step is the fast path (a design with no
                baked-in text and no scaling choice needs nothing from Prepare); the Prepare
                step is its last step, where Create is the one CTA. */}
            {mode !== 'ai' && mode !== 'video' && (mode === 'design' ? step >= 1 : step >= 2) && (
              <button
                className={step === 5 || (mode === 'design' && step === 2) ? 'primary' : undefined}
                disabled={!previewTemplate}
                onClick={create}
                title={
                  mode === 'design'
                    ? 'Create the project — you add the fields in the editor next'
                    : 'Create the project now — remaining steps keep their defaults'
                }
              >
                Create project
              </button>
            )}
            {mode !== 'ai' && mode !== 'video' && (mode === 'design' ? step === 1 : step > 0 && step < 5) && (
              <button className="primary wz-next" disabled={nextDisabled} onClick={() => goToStep(1)}>
                Next ›
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
