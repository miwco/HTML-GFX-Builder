import { test, expect, type Page } from '@playwright/test';
import { awaitPreviewRebuild } from './_preview';
import { lowerThirdPng } from './_png';
import { elementPoint } from './_canvas';

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

test('import graphic: a 2× export is shown frame-sized, not pushed off the frame', async ({ page }) => {
  // A retina/2x export of a 1080p design is one of the likeliest files to be dropped here.
  // At natural size only its top-left quadrant would fit the frame — a lower third drawn in
  // its bottom half would be entirely off-screen, an invisible graphic.
  await dropDesign(page, 3840, 2160);
  await expect(page.locator('.asset-card')).toContainText('3840 × 2160');
  await expect(page.locator('.wz-step')).toContainText('2× export');

  await page.getByRole('button', { name: 'Add text fields ›' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();

  // The design unit is exactly the frame's width: edge to edge, as drawn (--scale is 1 here).
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('.imported-design-art')).toBeVisible();
  const width = await frame
    .locator('.imported-design-box')
    .evaluate((el) => el.getBoundingClientRect().width);
  expect(Math.round(width)).toBe(1920);
});

/** Create the imported design and land in the editor with the preview rebuilt. */
async function createImported(page: Page) {
  await dropDesign(page);
  await page.getByRole('button', { name: 'Add text fields ›' }).click();
  await awaitPreviewRebuild(page, async () => {
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page.locator('.wz-modal')).toBeHidden();
  });
}

/** The current template's #fw0 rule position + #f0 keyframe tracks + history length. */
async function placementState(page: Page) {
  return page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { placedLines } = await import('/src/blocks/designLayout.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const s = useTemplateStore.getState();
    const data = parseAnimData(s.template.js);
    return {
      place: placedLines(s.template.html, s.template.css)['#f0'] ?? null,
      f0Tracks: Object.keys(data?.steps[0].layers['#f0'] ?? {}),
      history: s.history.length,
    };
  });
}

test('import graphic: dragging a field places it in the CSS — never a keyframe', async ({ page }) => {
  await createImported(page);

  // Select the Name field via its timeline row (the shared selection), like any layer.
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  await expect(page.getByTestId('inspector')).toBeVisible({ timeout: 3000 });
  const before = await placementState(page);
  expect(before.place).not.toBeNull();

  // Drag the field 120 px right and 60 px up on screen.
  const c = await elementPoint(page, '#f0');
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 120, c.y - 60, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(800);

  // The wrapper's CSS rule moved by the drag (screen px → design px through the doc scale;
  // --scale is 1 at 1080p size M, so canvas px are design px here)...
  const after = await placementState(page);
  expect(after.place!.x).toBeCloseTo(before.place!.x + 120 / c.scale, -1);
  expect(after.place!.y).toBeCloseTo(before.place!.y - 60 / c.scale, -1);
  expect(after.place!.scaled).toBe(true); // the rule keeps its calc(--scale) idiom

  // ...and the drag wrote NO motion: the field's keyframe tracks are exactly what they were.
  expect(after.f0Tracks).toEqual(before.f0Tracks);

  // ONE undoable apply; undo restores the original placement.
  expect(after.history).toBe(before.history + 1);
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await placementState(page)).place!.x).toBe(before.place!.x);
});

test('import graphic: Escape cancels a placement drag without touching the code', async ({ page }) => {
  await createImported(page);
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  await expect(page.getByTestId('inspector')).toBeVisible({ timeout: 3000 });
  const before = await placementState(page);

  const c = await elementPoint(page, '#f0');
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 100, c.y + 40, { steps: 6 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await page.waitForTimeout(300);

  const after = await placementState(page);
  expect(after.place).toEqual(before.place);
  expect(after.history).toBe(before.history);
  // The live preview sprang back too (the inline override was cleared).
  const inline = await page
    .frameLocator('iframe.preview-frame')
    .locator('#fw0')
    .evaluate((el) => (el as HTMLElement).style.left);
  expect(inline).toBe('');
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
