import { test, expect, type Page } from '@playwright/test';
import { awaitPreviewRebuild } from './_preview';

// The wizard's logo option: a variant that declares `logo: 'optional'` offers a toggle +
// custom upload on the Fields step; enabling it makes the created template carry a REAL
// SPX image field (filelist) bound to an <img id="fN">, with the uploaded file embedded
// as a data-URL asset. Toggled off, nothing is injected.

// A 1×1 orange PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
);

async function toFieldsStep(page: Page, category: string, variantName: string) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: category }).click();
  await page.locator('.wz-variant', { hasText: variantName }).click();
  await page.getByRole('button', { name: 'Next ›' }).click(); // Fields
}

async function createdTemplate(page: Page) {
  return page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const t = useTemplateStore.getState().template;
    return {
      fields: t.fields,
      assets: t.assets.map((a) => a.path),
      html: t.html,
    };
  });
}

test('logo toggle + custom upload: the created template carries the field, asset, and <img>', async ({ page }) => {
  await toFieldsStep(page, 'Topic', 'Hairline Card');

  // The optional-logo section is offered; turn it on and upload a custom logo.
  const logoSection = page.locator('.panel-section', { hasText: 'Include a logo slot' });
  await logoSection.getByRole('checkbox').check();
  await logoSection.locator('input[type="file"]').setInputFiles({
    name: 'club-crest.png',
    mimeType: 'image/png',
    buffer: PNG,
  });
  await expect(logoSection.locator('img[alt="Logo preview"]')).toBeVisible();

  await awaitPreviewRebuild(page, async () => {
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page.locator('.wz-modal')).toBeHidden();
  });

  const t = await createdTemplate(page);
  // The logo is a real SPX image field after the three text lines…
  const logoField = t.fields.find((f: { ftype: string }) => f.ftype === 'filelist')!;
  expect(logoField).toMatchObject({ field: 'f3', title: 'Logo', value: 'images/club-crest.png' });
  // …the uploaded file rides along as a data-URL asset…
  expect(t.assets).toContain('images/club-crest.png');
  // …and the design carries the bound <img> with the shared slot's class.
  expect(t.html).toContain('<img id="f3" class="info-card-logo"');

  // The preview (already rebuilt above) resolves images/ through the asset shim.
  const src = await page
    .frameLocator('iframe.preview-frame')
    .locator('#f3')
    .evaluate((el) => (el as HTMLImageElement).src);
  expect(src.startsWith('data:image/png')).toBeTruthy();
});

test('logo toggle off: nothing is injected', async ({ page }) => {
  await toFieldsStep(page, 'Topic', 'Hairline Card');
  // Offered but left off (the default when no image was imported).
  await expect(page.locator('.panel-section', { hasText: 'Include a logo slot' })).toBeVisible();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();

  const t = await createdTemplate(page);
  expect(t.fields.some((f: { ftype: string }) => f.ftype === 'filelist')).toBeFalsy();
  expect(t.html).not.toContain('info-card-logo');
});

test('a no-logo design offers no logo section', async ({ page }) => {
  await toFieldsStep(page, 'Lower thirds', 'Hairline');
  await expect(page.locator('.wz-line-row').first()).toBeVisible();
  await expect(page.locator('.panel-section', { hasText: 'Include a logo slot' })).toBeHidden();
});
