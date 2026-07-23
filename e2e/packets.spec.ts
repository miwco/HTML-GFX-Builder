import { test, expect, type Page } from '@playwright/test';
import { createProject } from './_create';
import { showCode } from './_code';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';

// Packages over the graphics LIBRARY (docs/SAVED_CONTENT_MODEL.md — the successor of the
// packet manager modal): graphics save into packages through the Save dialog, reopen from
// Home, and a package exports as one zip with a Starter folder per graphic. Brand looks
// live in Home's Brand looks section. library.spec.ts covers the save-status/guard flows;
// this file pins the PACKAGE AGGREGATION and the LOOKS round trip.

async function create(page: Page, categoryName: string, variantName: string) {
  await createProject(page, { category: categoryName, name: variantName });
}

async function saveInto(page: Page, name: string, opts: { newPackage?: string } = {}) {
  await page.getByTestId('save-graphic').click();
  await page.getByTestId('save-name').fill(name);
  if (opts.newPackage) {
    await page.getByTestId('save-dest').selectOption('new');
    await page.getByTestId('save-new-package').fill(opts.newPackage);
  } else {
    // The one existing package is preselected by picking the first non-standalone option.
    const value = await page
      .getByTestId('save-dest')
      .locator('option')
      .nth(1)
      .getAttribute('value');
    await page.getByTestId('save-dest').selectOption(value!);
  }
  await page.getByTestId('save-confirm').click();
  await expect(page.getByTestId('save-status')).toHaveText('Saved');
}

test('packages: save two graphics into one, reopen one, export the package as one zip', async ({ page }) => {
  await page.goto('/app');
  await create(page, 'Lower thirds', 'Hairline');
  await saveInto(page, 'Hairline', { newPackage: 'Friday Show' });

  // A second graphic into the SAME package (picked from the Save dialog's list).
  await create(page, 'Tickers', 'News Strip');
  await saveInto(page, 'News Strip');

  // Home shows the package with both graphics; reopening one loads it.
  await page.getByTestId('open-home').click();
  await page.getByTestId('home-nav-packages').click();
  await expect(page.locator('[data-testid^="package-row-"]', { hasText: 'Friday Show' })).toContainText('2 graphics');
  await page.getByTestId('open-package').click();
  await page.locator('.pk-graphic', { hasText: 'Hairline' }).getByRole('button', { name: 'Open' }).click();
  await expect(page.locator('.topbar .tpl-name')).toHaveText('Hairline');

  // Give one record a saved entry — a package export must carry each graphic's own entries.
  await page.evaluate(async () => {
    const { loadGraphics, newEntry, updateGraphic } = await import('/src/model/library.ts');
    const doc = loadGraphics().find((g) => g.name === 'Hairline')!;
    const field = doc.template.fields[0]?.field ?? 'f0';
    updateGraphic(doc.id, { entries: [newEntry('Anna · Presenter', { [field]: 'Anna Andersson' })] });
  });

  // Export the whole package: one zip, one Starter folder per graphic.
  await page.getByTestId('open-home').click();
  await page.getByTestId('home-nav-packages').click();
  await page.getByTestId('open-package').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-package').click(),
  ]);
  const zip = await JSZip.loadAsync(readFileSync(await download.path()));
  const names = Object.keys(zip.files);
  expect(names).toContain('friday_show/hairline/index.html');
  expect(names).toContain('friday_show/hairline/js/template.js');
  expect(names).toContain('friday_show/news_strip/index.html');
  expect(names).toContain('friday_show/README.md');
  const panel = await zip.file('friday_show/hairline/controlpanel.html')!.async('string');
  expect(panel).toContain('Anna · Presenter');
  expect(panel).toContain('Anna Andersson');
});

test('looks: capture the current look in Home, apply it to another graphic, survive reload', async ({ page }) => {
  await page.goto('/app');
  await create(page, 'Lower thirds', 'Hairline');

  // Tweak the accent through the Style panel, then capture the look in Home.
  await page.getByTestId('dock-tab-style').click();
  await page
    .locator('.field-row', { hasText: '--accent' })
    .first()
    .locator('input.grow')
    .fill('#12e29a');
  await page.getByTestId('open-home').click();
  await page.getByTestId('home-nav-looks').click();
  await page.getByPlaceholder(/Look name/).fill('Mint look');
  await page.getByRole('button', { name: 'Save current look' }).click();
  await expect(page.locator('.pk-graphic', { hasText: 'Mint look' })).toBeVisible();

  // The look survives a full reload (localStorage) and applies to a FRESH graphic. A fresh
  // graphic matters for determinism too: whether the autosave (800 ms debounce) caught the
  // accent tweak before the reload decides if the restored project already carries it — and
  // applying a look that is already active changes nothing, so nothing would highlight.
  await page.reload();
  await create(page, 'Lower thirds', 'Hairline'); // the wizard opens on load — make the fresh graphic
  await page.getByTestId('open-home').click();
  await page.getByTestId('home-nav-looks').click();
  await page.locator('.pk-graphic', { hasText: 'Mint look' }).getByRole('button', { name: 'Apply', exact: true }).click();
  // Apply returns to the editor (the look retints the OPEN graphic).
  const css = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.css;
  });
  expect(css).toContain('--accent: #12e29a');
  // The applied change is highlighted in the CSS tab — for a user who has the code pane open
  // (it ships closed; applying a look works either way, this asserts what they'd then see).
  await showCode(page);
  await expect(page.locator('.tabs .tab.active')).toHaveText('CSS');
  await expect(page.locator('.editor-host .changed-line').first()).toBeVisible();
});
