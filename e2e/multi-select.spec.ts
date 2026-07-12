import { test, expect, type Page } from '@playwright/test';

// The interaction model's selection foundations (docs/TIMELINE_INTERACTION_MODEL.md):
// one ordered multi-selection in the store — plain click replaces, shift-click toggles,
// a drag on EMPTY canvas lassos — synchronized across canvas, timeline, and Inspector.
// Selection stays editor UI state only: none of this ever writes code or history.

async function createHairline(page: Page) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);
  await expect
    .poll(async () =>
      page.frameLocator('iframe.preview-frame').locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity),
    )
    .toBe('1');
}

/** Screen point over a preview element (canvas rect mapped through the stage scale). */
async function partPoint(page: Page, selector: string, dx = 0.5, dy = 0.5) {
  const layer = (await page.getByTestId('canvas-layer').boundingBox())!;
  const t = await page
    .frameLocator('iframe.preview-frame')
    .locator(selector)
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height, canvasW: document.body.getBoundingClientRect().width };
    });
  const scale = layer.width / t.canvasW;
  return {
    x: layer.x + (t.left + (dx <= 1 ? t.width * dx : dx)) * scale,
    y: layer.y + (t.top + (dy <= 1 ? t.height * dy : dy)) * scale,
  };
}

async function storeSelection(page: Page) {
  return page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const s = useTemplateStore.getState();
    return { parts: s.selectedParts, primary: s.selectedPart, history: s.history.length };
  });
}

test('shift-click builds a multi-selection synced across canvas, timeline, and Inspector', async ({ page }) => {
  await createHairline(page);
  const baseline = (await storeSelection(page)).history;

  // Click the Name line, then shift-click the Title line (mouse.click has no modifiers
  // option — hold Shift on the keyboard around the click).
  const p0 = await partPoint(page, '#f0');
  await page.mouse.click(p0.x, p0.y);
  await expect(page.getByTestId('canvas-selection')).toBeVisible();
  const p1 = await partPoint(page, '#f1');
  await page.keyboard.down('Shift');
  await page.mouse.click(p1.x, p1.y);
  await page.keyboard.up('Shift');

  // The store holds both, primary first; the canvas shows a chip + a secondary outline.
  let sel = await storeSelection(page);
  expect(sel.parts).toEqual(['#f0', '#f1']);
  expect(sel.primary).toBe('#f0');
  await expect(page.getByTestId('canvas-selection-extra')).toHaveCount(1);
  // Both timeline rows wash; the Inspector shows the primary plus the multi note.
  await expect(page.locator('.tlv2-labels .timeline-label[data-part="#f0"]')).toHaveClass(/selected/);
  await expect(page.locator('.tlv2-labels .timeline-label[data-part="#f1"]')).toHaveClass(/selected/);
  await expect(page.getByTestId('inspector-part-label')).toHaveText('Name');
  await expect(page.getByTestId('inspector-multi')).toContainText('+1 more');

  // Shift-click the Name again: it leaves the selection; Title becomes primary.
  const p0b = await partPoint(page, '#f0');
  await page.keyboard.down('Shift');
  await page.mouse.click(p0b.x, p0b.y);
  await page.keyboard.up('Shift');
  sel = await storeSelection(page);
  expect(sel.parts).toEqual(['#f1']);
  expect(sel.primary).toBe('#f1');

  // Escape clears everything; selection never wrote history.
  await page.keyboard.press('Escape');
  sel = await storeSelection(page);
  expect(sel.parts).toEqual([]);
  expect(sel.history).toBe(baseline);
});

test('timeline labels shift-click into the same multi-selection', async ({ page }) => {
  await createHairline(page);
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  await page.locator('.tlv2-labels .timeline-label[data-part="#f1"]').click({ modifiers: ['Shift'] });
  const sel = await storeSelection(page);
  expect(sel.parts).toEqual(['#f0', '#f1']);
  // Plain click on a third label REPLACES the selection.
  await page.locator('.tlv2-labels .timeline-label[data-part=".lower-third-accent"]').click();
  expect((await storeSelection(page)).parts).toEqual(['.lower-third-accent']);
});

test('a drag on empty canvas lassos the parts it touches — no code, no history', async ({ page }) => {
  await createHairline(page);
  const baseline = (await storeSelection(page)).history;
  const layer = (await page.getByTestId('canvas-layer').boundingBox())!;
  const target = await partPoint(page, '.lower-third-box', 0.5, 0.5);

  // Start well above the graphic (empty canvas at 25% width — the stage toolbar floats
  // top-right) and sweep down across the whole lower third.
  await page.mouse.move(layer.x + layer.width * 0.02, layer.y + layer.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(target.x + 60, target.y + 60, { steps: 8 });
  // The marquee is visible mid-drag.
  await expect(page.getByTestId('canvas-lasso')).toBeVisible();
  await page.mouse.up();

  const sel = await storeSelection(page);
  // The sweep crossed the panel and its lines (never the root — a marquee that grabbed
  // the root would make every lasso a whole-graphic selection).
  expect(sel.parts.length).toBeGreaterThanOrEqual(2);
  expect(sel.parts).not.toContain('.lower-third');
  expect(sel.parts).toContain('#f0');
  expect(sel.history).toBe(baseline);

  // The root drag still works untouched: a drag STARTING on the graphic is a move.
  await page.keyboard.press('Escape');
  const start = await partPoint(page, '.lower-third-box', 0.5, 0.5);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 120, start.y - 80, { steps: 6 });
  await expect(page.locator('.move-ghost')).toBeVisible(); // the zone-move ghost, not a lasso
  await page.keyboard.press('Escape');
  await page.mouse.up();
});
