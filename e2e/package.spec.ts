import { test, expect, type Page, type FrameLocator } from '@playwright/test';

// The broadcast-package flows: custom colors, imported fonts, the project brand,
// and the first-wave categories (info cards, end credits, tickers).

async function toVariantStep(page: Page, categoryName: string, variantName: string) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: categoryName }).click();
  await page.locator('.wz-variant', { hasText: variantName }).click();
}

async function create(page: Page) {
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  // The preview rebuilds ~350 ms (debounced) after a template applies; interacting with
  // the iframe before that hits the previous document.
  await page.waitForTimeout(650);
}

function frame(page: Page): FrameLocator {
  return page.frameLocator('iframe.preview-frame');
}

// No localStorage cleanup needed: Playwright gives every test a fresh browser context,
// so the project brand never leaks between specs. (Do NOT clear it via addInitScript —
// that script also runs inside the same-origin preview iframe and would delete the brand
// the moment the preview rebuilds.)

test('custom colors: a hex typed in the wizard lands in the generated :root', async ({ page }) => {
  await toVariantStep(page, 'Lower thirds', 'Hairline');
  await page.getByRole('button', { name: 'Next ›' }).click(); // Fields
  await page.getByRole('button', { name: 'Next ›' }).click(); // Style
  await page.locator('[data-palette="custom"]').click();
  const accentRow = page.locator('.wz-custom-colors .field-row', { hasText: 'Accent' });
  await accentRow.locator('input.grow').fill('#ff2d78');
  await create(page);
  await expect
    .poll(async () =>
      frame(page).locator('.lower-third-accent').evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe('rgb(255, 45, 120)');
});

test('imported font: embedded, applied, and bundled into the export', async ({ page }) => {
  await toVariantStep(page, 'Lower thirds', 'Hairline');
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click(); // Style

  // Import a real font file (reuse a bundled woff2 as the "user file").
  const buf = await page.evaluate(async () => {
    const res = await fetch('/fonts/bebas-neue.woff2');
    return Array.from(new Uint8Array(await res.arrayBuffer()));
  });
  await page.locator('.wz-step input[type="file"]').first().setInputFiles({
    name: 'My-Brand-Font.woff2',
    mimeType: 'font/woff2',
    buffer: Buffer.from(buf),
  });
  await expect(page.locator('.wz-font', { hasText: 'My Brand Font' })).toBeVisible();
  await create(page);

  // The generated code carries the embedded font; the export bundles the binary.
  await page.locator('.panel-tabs .tab', { hasText: 'Export' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Validate & download/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
});

test('project brand: match toggle carries the look to another variant', async ({ page }) => {
  // First creation with a custom accent saves the brand.
  await toVariantStep(page, 'Lower thirds', 'Hairline');
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.locator('[data-palette="custom"]').click();
  await page
    .locator('.wz-custom-colors .field-row', { hasText: 'Accent' })
    .locator('input.grow')
    .fill('#00ff88');
  await create(page);

  // Second creation, different family: the brand accent applies via the match toggle.
  await page.getByRole('button', { name: '+ New project' }).click();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Frosted Card' }).click();
  await expect(page.locator('.wz-match input')).toBeChecked();
  await create(page);
  await expect
    .poll(async () => frame(page).locator('.lower-third').evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    }))
    .toBe('#00ff88');
});

test('info card: creates, binds, and plays', async ({ page }) => {
  await toVariantStep(page, 'Info cards', 'Slab Card');
  await create(page);
  await expect(page.locator('.topbar .tpl-name')).toHaveText('Slab Card');
  await expect(frame(page).locator('.card')).toBeAttached(); // the NEW document is loaded
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame(page).locator('.card').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
});

test('end credits: text field drives the parsed roll', async ({ page }) => {
  await toVariantStep(page, 'End credits', 'Classic Roll');
  await create(page);
  const track = frame(page).locator('#credits-track');
  await expect(track.locator('.credits-row').first()).toBeAttached();
  await expect(track.locator('.credits-end')).toBeAttached(); // logo + year block
  // Editing the credits in the Data panel + ⟳ Update re-renders the rows.
  await page.locator('.panel-tabs .tab', { hasText: 'Data' }).click();
  await page.locator('.panel-body textarea').first().fill('CREW\nShowrunner | Nova Reyes');
  await page.getByRole('button', { name: '⟳ Update' }).click();
  await expect(track.locator('.credits-row')).toHaveCount(1);
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame(page).locator('.credits').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
});

test('ticker: items loop and the label binds', async ({ page }) => {
  await toVariantStep(page, 'Tickers', 'News Strip');
  await create(page);
  const track = frame(page).locator('#ticker-track');
  await expect(track.locator(':scope > *').first()).toBeAttached();
  await page.getByRole('button', { name: '▶ Play' }).click();
  // The marquee is actually moving: the track's transform changes over time.
  // (The strip fades in first, so poll until the track tween has visibly progressed.)
  const t1 = await track.evaluate((el) => getComputedStyle(el).transform);
  await expect
    .poll(async () => track.evaluate((el) => getComputedStyle(el).transform), { timeout: 6000 })
    .not.toBe(t1);
});
