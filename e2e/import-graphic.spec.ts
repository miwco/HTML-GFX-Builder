import { test, expect, type Page } from '@playwright/test';
import { lowerThirdPng } from './_png';

// The Import Graphic MVP workflow, end to end (docs/IMPORT_MVP.md): a flat PNG design becomes
// a working SPX template with editable text fields and selectable in/out animations.
//
// This is the workflow the feature exists for, so the spec walks the USER'S path — entry card,
// drop, place text, pick motion, create — and then checks the things that make it real: the
// artwork renders, the fields are SPX-editable, the whole graphic animates as one unit, and
// the export validates.

async function dropDesign(page: Page, width = 1920, height = 1080) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="import-graphic"]').click();
  await page.locator('.wz-drop input[type="file"]').setInputFiles({
    name: 'lower-third.png',
    mimeType: 'image/png',
    buffer: lowerThirdPng(width, height),
  });
}

test('import graphic: a flat PNG becomes a working template with editable fields', async ({ page }) => {
  await dropDesign(page);

  // The artwork is MEASURED, not assumed — the flow states what it found.
  await expect(page.locator('.asset-card')).toContainText('1920 × 1080');
  await expect(page.locator('.wz-step')).toContainText('Frame-sized');

  await page.getByRole('button', { name: 'Add text fields ›' }).click();

  // The Template step is skipped: the artwork IS the design.
  await expect(page.locator('.wz-dot.active')).toContainText('Text');

  const rows = page.locator('.wz-line-row');
  await rows.first().locator('input').first().fill('Guest name');
  await rows.nth(1).locator('input').first().fill('Guest title');

  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();

  // The artwork renders as the graphic itself, with the text on top of it.
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('.imported-design-art')).toBeVisible();
  await expect(frame.locator('#f0')).toHaveText('Alexandra Riva');

  // The fields are real SPX DataFields, so the operator can edit them.
  await page.getByTestId('dock-tab-data').click();
  await expect(page.locator('.panel-body')).toContainText('Guest name');
  await expect(page.locator('.panel-body')).toContainText('Guest title');
});

test('import graphic: the imported design animates — the gap this feature closes', async ({ page }) => {
  await dropDesign(page);
  await page.getByRole('button', { name: 'Add text fields ›' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();

  // The timeline dock reads the template's OWN code, so a real editable strip means the
  // imported design carries a NOACG_ANIM data block (an import used to get no strip at all).
  await expect(page.locator('.tlv2-ruler')).toBeVisible();

  const frame = page.frameLocator('iframe.preview-frame');
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame.locator('.imported-design').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');

  // The whole graphic leaves together on Stop.
  await page.getByRole('button', { name: '■ Stop' }).click();
  await expect
    .poll(async () => frame.locator('.imported-design').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('0');
});

test('import graphic: in and out animations are chosen separately', async ({ page }) => {
  await dropDesign(page);
  await page.getByRole('button', { name: 'Add text fields ›' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click(); // Style
  await page.getByRole('button', { name: 'Next ›' }).click(); // Animation
  await expect(page.locator('.wz-dot.active')).toContainText('Animation');

  // Only whole-unit presets are offered: the line presets would tear a flat design apart.
  await expect(page.locator('.wz-step')).toContainText('Pop');
  await expect(page.locator('.wz-step')).not.toContainText('Line reveal');

  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();

  // ONE UNIT, checked by behaviour rather than by reading the code: GSAP writes inline styles
  // onto the targets it animates. The box is animated, so it gets them; a text line must not be
  // touched on its own — that is exactly what would tear a flat design away from its artwork.
  const frame = page.frameLocator('iframe.preview-frame');
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame.locator('.imported-design-box').evaluate((el) => el.getAttribute('style') ?? ''))
    .not.toBe('');
  expect(await frame.locator('#f0').evaluate((el) => el.getAttribute('style') ?? '')).toBe('');
});

test('import graphic: a cropped design is placed as an object, not stretched', async ({ page }) => {
  await dropDesign(page, 900, 260);
  await expect(page.locator('.asset-card')).toContainText('900 × 260');
  await expect(page.locator('.wz-step')).toContainText('Smaller than');
});

test('import graphic: the exported SPX package validates', async ({ page }) => {
  await dropDesign(page);
  await page.getByRole('button', { name: 'Add text fields ›' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();

  await page.getByTestId('dock-tab-export').click();
  // Export is gated on zero validation errors; the panel says so inline.
  await expect(page.locator('.panel-body')).not.toContainText('✗');
});
