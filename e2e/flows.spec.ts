import { test, expect, type Page, type FrameLocator } from '@playwright/test';

// Core UI flows for the choose-first creation wizard + live panels.

/** Walk the wizard entry → category → variant selection. */
async function toVariantStep(page: Page, variantName: string) {
  await page.goto('/');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat:not([disabled])').first().click();
  await page.locator('.wz-variant', { hasText: variantName }).click();
}

/** Click through the remaining steps and create the project. */
async function createFromCurrentStep(page: Page) {
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
}

function previewFrame(page: Page): FrameLocator {
  return page.frameLocator('iframe.preview-frame');
}

test('wizard: create a lower third with defaults', async ({ page }) => {
  await toVariantStep(page, 'Hairline');
  // Live preview appears once a variant is chosen.
  await expect(page.locator('.wz-preview iframe')).toBeVisible();
  await createFromCurrentStep(page);

  await expect(page.locator('.topbar .tpl-name')).toHaveText('Hairline');
  // The generated template renders and binds its first field.
  const frame = previewFrame(page);
  await expect(frame.locator('#f0')).toHaveText('Alexandra Riva');
  // Play runs the entrance (root becomes visible).
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame.locator('.l3').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
});

test('wizard: blank project escape hatch', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-entry="blank"]').click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await expect(page.locator('.topbar .tpl-name')).toHaveText('Blank');
});

test('wizard: field titles flow into the Data panel', async ({ page }) => {
  await toVariantStep(page, 'Underline');
  await page.getByRole('button', { name: 'Next ›' }).click(); // Fields
  const rows = page.locator('.wz-line-row');
  await rows.first().locator('input').first().fill('Guest name');
  await createFromCurrentStep(page);

  await page.locator('.panel-tabs .tab', { hasText: 'Data' }).click();
  await expect(page.locator('.panel-body')).toContainText('Guest name');
});

test('wizard: steps mode reveals lines on Next', async ({ page }) => {
  await toVariantStep(page, 'Soft Stack'); // three suggested lines
  await page.getByRole('button', { name: 'Next ›' }).click(); // Fields
  await page.getByRole('button', { name: 'Next ›' }).click(); // Style
  await page.getByRole('button', { name: 'Next ›' }).click(); // Animation
  await page.locator('.wz-step input[type="checkbox"]').check();
  await createFromCurrentStep(page);

  const frame = previewFrame(page);
  await page.getByRole('button', { name: '▶ Play' }).click();
  // Line 2 waits behind its mask (translated down) until Next reveals it.
  const before = await frame.locator('#f1').evaluate((el) => getComputedStyle(el).transform);
  await page.getByRole('button', { name: '» Next' }).click();
  await expect
    .poll(async () => frame.locator('#f1').evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(before);
});

test('import graphics: image lands in the logo slot', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-entry="import"]').click();
  // A tiny 1×1 PNG.
  await page.locator('.wz-drop input[type="file"]').setInputFiles({
    name: 'team-logo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    ),
  });
  await expect(page.locator('.asset-card')).toHaveCount(1);
  await page.getByRole('button', { name: /Continue with 1 image/ }).click();

  // Logo-slot designs come first.
  await expect(page.locator('.wz-variant').first()).toContainText('Number Badge');
  await page.locator('.wz-variant', { hasText: 'Number Badge' }).click();
  await createFromCurrentStep(page);

  const logo = previewFrame(page).locator('.l3-logo');
  await expect(logo).toBeVisible();
  await expect
    .poll(async () => logo.evaluate((el: HTMLImageElement) => el.src.startsWith('data:image/png')))
    .toBe(true);
});

test('style panel: accent retints the live preview', async ({ page }) => {
  await toVariantStep(page, 'Hairline');
  await createFromCurrentStep(page);

  await page.locator('.panel-tabs .tab', { hasText: 'Style' }).click();
  const accentRow = page.locator('.field-row', { hasText: '--accent' });
  await accentRow.locator('input.grow').fill('#ff2d78');
  // The preview rebuilds (debounced) with the new accent on the hairline.
  await expect
    .poll(async () =>
      previewFrame(page).locator('.l3-accent').evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe('rgb(255, 45, 120)');
});

test('motion panel: preset swap jumps to the JS tab and still plays', async ({ page }) => {
  await toVariantStep(page, 'Frosted Card');
  await createFromCurrentStep(page);

  await page.locator('.panel-tabs .tab', { hasText: 'Motion' }).click();
  await page.locator('.wz-anim', { hasText: 'Mask wipe' }).click();
  await expect(page.locator('.tabs .tab.active')).toHaveText('JS');

  const frame = previewFrame(page);
  await expect(frame.locator('#f0')).toBeAttached();
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame.locator('.l3').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
});

test('export: downloads a plug-and-play SPX zip', async ({ page }) => {
  await toVariantStep(page, 'Hairline');
  await createFromCurrentStep(page);
  await page.locator('.panel-tabs .tab', { hasText: 'Export' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Validate & download/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
});

// (The Blocks tab was retired in the UX overhaul — element inserts go through AI, and
// adding data fields lives in the Data panel; see e2e/ux.spec.ts.)
