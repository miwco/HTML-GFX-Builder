import { test, expect, type Page, type FrameLocator } from '@playwright/test';
import { awaitPreviewRebuild } from './_preview';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';

// Image support: the "Image" field type (SPX filelist), logo fields on credits / corner bug,
// and the export folder structure ([TemplatesFolder]/your_project/index.html + images/...).

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function createFrom(page: Page, categoryName: string, variantName: string) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: categoryName }).click();
  await page.locator('.wz-variant', { hasText: variantName }).click();
}

async function create(page: Page) {
  await awaitPreviewRebuild(page, async () => {
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page.locator('.wz-modal')).toBeHidden();
  });
}

function frame(page: Page): FrameLocator {
  return page.frameLocator('iframe.preview-frame');
}

/** Upload a png through the Data panel's image field control (by field label). */
async function uploadImage(page: Page, fieldLabel: string, fileName: string) {
  await page.getByTestId('dock-tab-data').click();
  const row = page.locator('.panel-body .field-row', { hasText: fieldLabel });
  await row.locator('input[type="file"]').setInputFiles({
    name: fileName,
    mimeType: 'image/png',
    buffer: PNG_1PX,
  });
  // Adding the asset recomposes the preview (debounced) — let the frame settle before
  // sending an update, or the update lands in the document that is about to be replaced.
  await awaitPreviewRebuild(page);
}

test('data panel: the add-field types are the broadcast set, and Image becomes a filelist field', async ({ page }) => {
  await createFrom(page, 'Lower thirds', 'Hairline');
  await create(page);
  await page.getByTestId('dock-tab-data').click();
  const addSection = page.locator('.panel-section', { hasText: 'Add a field' });
  const select = addSection.locator('select');
  await expect(select.locator('option')).toHaveText(['Text', 'Long text', 'Number', 'Image']);
  await select.selectOption('filelist');
  await addSection.getByRole('button', { name: '+ Add' }).click();
  // The generated definition carries the SPX filelist contract.
  const html = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.html;
  });
  expect(html).toContain('"ftype": "filelist"');
  expect(html).toContain('"assetfolder": "./images/"');
});

test('end credits: uploading a logo through the Logo field puts it in the end block', async ({ page }) => {
  await createFrom(page, 'End credits', 'Classic Roll');
  await create(page);
  // Placeholder first — no logo picked yet.
  await expect(frame(page).locator('.credits-end .credits-logo-slot')).toBeAttached();
  await uploadImage(page, 'Logo', 'my_logo.png');
  await page.locator('.panel-body').getByRole('button', { name: '⟳ Update' }).click();
  const logo = frame(page).locator('.credits-end img.credits-logo');
  await expect(logo).toBeAttached();
  // The preview shim resolves the relative path to the in-memory data URL.
  await expect
    .poll(async () => logo.evaluate((el) => (el as HTMLImageElement).src.slice(0, 5)))
    .toBe('data:');
});

test('corner bug: the logo field replaces the placeholder mark', async ({ page }) => {
  await createFrom(page, 'Corner bug', 'Glass Mark');
  await create(page);
  await expect(frame(page).locator('.corner-bug-mark')).toBeVisible();
  await uploadImage(page, 'Logo', 'channel_mark.png');
  await page.locator('.panel-body').getByRole('button', { name: '⟳ Update' }).click();
  await expect(frame(page).locator('.corner-bug-media.has-image')).toBeAttached();
  await expect(frame(page).locator('.corner-bug-mark')).toBeHidden();
  await expect
    .poll(async () => frame(page).locator('img.corner-bug-logo').evaluate((el) => (el as HTMLImageElement).src.slice(0, 5)))
    .toBe('data:');
});

test('export: the zip is [project]/index.html with images under [project]/images/', async ({ page }) => {
  await createFrom(page, 'End credits', 'Classic Roll');
  await create(page);
  await uploadImage(page, 'Logo', 'station_logo.png');
  await page.getByTestId('dock-tab-export').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Validate & download/ }).click(),
  ]);
  const zip = await JSZip.loadAsync(readFileSync(await download.path()));
  const names = Object.keys(zip.files);
  expect(names).toContain('classic_roll/index.html');
  expect(names).toContain('classic_roll/images/station_logo.png');
  expect(names).toContain('classic_roll/js/template.js');
  expect(names).toContain('classic_roll/js/gsap.min.js');
  // The image is a real binary, not a data URL dump.
  const png = await zip.file('classic_roll/images/station_logo.png')!.async('nodebuffer');
  expect(png.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
});
