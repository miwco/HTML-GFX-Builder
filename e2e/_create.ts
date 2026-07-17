import { expect, type Page } from '@playwright/test';
import { awaitPreviewRebuild } from './_preview';

// Fast project bootstrap for specs whose subject is NOT the creation flow itself.
//
// Walking the wizard UI costs ~1.5-2 s per test and re-exercises the same clicks hundreds of
// times per run. This helper produces the EXACT template the wizard's Create button would -
// it runs the same code path in the page (buildDraftTemplate on a default draft with the
// variant picked, formatTemplate, applyTemplate with resetSampleData, setActiveTab, the
// doc-kind flip, and the project-brand capture) - without the click walk. The wizard's own
// specs (wizard-*.spec.ts, flows.spec.ts, ux.spec.ts's direction test, ...) keep clicking
// through the real steps; that is what covers the wizard.

export interface CreateSpec {
  /** Exact catalog variant name, e.g. 'Hairline', 'Match Strip', 'Glass Mark'. */
  name?: string;
  /** Category id ('lower-third') or wizard label ('Lower thirds') - used with `index`. */
  category?: string;
  /** Variant index within the category (the wizard's default order). Defaults to 0. */
  index?: number;
  /** The Animation step's "Reveal in steps" checkbox. */
  steps?: boolean;
}

/**
 * Open /app and create a catalog project directly - the deterministic, fast counterpart of
 * clicking Entry -> Category -> Template -> Create project. Waits out the preview rebuild,
 * so the test starts against the created document.
 */
export async function createProject(page: Page, spec: string | CreateSpec = 'Hairline'): Promise<void> {
  const wanted: CreateSpec = typeof spec === 'string' ? { name: spec } : spec;
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await awaitPreviewRebuild(page, () =>
    page.evaluate(async (s: CreateSpec) => {
      const { CATALOG, variantsFor } = await import('/src/templates/catalog.ts');
      const { CATEGORIES } = await import('/src/model/wizard.ts');
      const { initialDraft, mergeDraft, buildDraftTemplate } = await import('/src/components/wizard/draft.ts');
      const { formatTemplate } = await import('/src/format/formatCode.ts');
      const { saveBrand } = await import('/src/model/brand.ts');
      const { useTemplateStore } = await import('/src/store/templateStore.ts');
      const { useDocKindStore } = await import('/src/store/docKindStore.ts');

      const cat = s.category
        ? CATEGORIES.find((c) => c.id === s.category || c.name === s.category)
        : undefined;
      const pool = cat ? variantsFor(cat.id) : Object.values(CATALOG).flat();
      // Exact name first; substring second (the specs historically matched card text with
      // hasText); no name = the category's first card, the wizard's default order.
      const variant = s.name
        ? pool.find((v) => v.name === s.name) ?? pool.find((v) => v.name.includes(s.name!))
        : pool[s.index ?? 0];
      if (!variant) throw new Error(`createProject: no catalog variant for ${JSON.stringify(s)}`);

      // The same draft the wizard holds after picking this variant card (CreationWizard's
      // onPickVariant patch on a fresh draft), then the same create path as its Create button.
      const draft = mergeDraft(initialDraft(), {
        variantId: variant.id,
        lines: variant.suggestedLines.map((l) => ({ ...l })),
        zone: null,
        logoEnabled: null,
        animation: s.steps ? { presetId: null, outPresetId: null, steps: true } : { presetId: null, outPresetId: null },
        paletteId: null,
        customPalette: null,
        fontId: null,
      });
      const template = await formatTemplate(buildDraftTemplate(variant, draft));
      const store = useTemplateStore.getState();
      store.applyTemplate(template, { resetSampleData: true });
      store.setActiveTab('html');
      useDocKindStore.getState().setKind('spx');
      saveBrand({
        styleTag: variant.styleTag,
        palette: variant.defaultPalette,
        fontId: variant.defaultFontId,
        customFont: null,
      });
    }, wanted),
  );
  await expect(page.locator('.wz-modal')).toBeHidden();
}
