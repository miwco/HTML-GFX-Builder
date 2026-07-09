import { test, expect, type Page } from '@playwright/test';

// Era 6 — the canvas SELECTION model. Clicking a structural element selects it: an amber
// outline plus a chip speaking the TemplatePart registry's label (the same words the
// timeline strip uses). Hover previews what a click would select. Clicking the selected
// element again climbs to its container (panel → whole graphic); empty canvas or Escape
// deselects. Selection is editor UI state ONLY — it never writes into the template.

async function createHairline(page: Page) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);
}

/** Wait until the preview shows the settled graphic (the design view after every rebuild). */
async function waitSettled(page: Page) {
  await expect
    .poll(async () =>
      page.frameLocator('iframe.preview-frame').locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity),
    )
    .toBe('1');
}

/** Screen point over a preview element: canvas rect (iframe px) mapped through the stage scale.
 *  dx/dy pick the spot inside the rect — fractions when <= 1, canvas px offsets when > 1. */
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

/** The root rule's anchoring sides from the preview's stylesheet (proof the code is untouched). */
async function rootAnchor(page: Page): Promise<{ top: string; right: string; bottom: string; left: string }> {
  return page.frameLocator('iframe.preview-frame').locator('body').evaluate(() => {
    for (const sheet of Array.from(document.styleSheets)) {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSStyleRule && rule.selectorText === '.lower-third') {
          const s = rule.style;
          return { top: s.top, right: s.right, bottom: s.bottom, left: s.left };
        }
      }
    }
    return { top: '', right: '', bottom: '', left: '' };
  });
}

test('clicking a text line selects it: outline + a chip naming the field — no code written', async ({ page }) => {
  await createHairline(page);
  await waitSettled(page);

  const p = await partPoint(page, '#f0');
  await page.mouse.click(p.x, p.y);

  await expect(page.getByTestId('canvas-selection')).toBeVisible();
  const chip = page.getByTestId('selection-chip');
  await expect(chip).toContainText('Name'); // part.label = the field's SPX title
  await expect(chip).toContainText('Double-click to edit'); // the one action that already exists here

  // Selection is editor UI state only: no tab jump, no change highlight, no history entry.
  await page.waitForTimeout(650);
  await expect(page.locator('.tabs .tab.active')).toHaveText('HTML');
  await expect(page.locator('.change-dot')).toHaveCount(0);
  await expect(page.locator('.editor-host .changed-line')).toHaveCount(0);
});

test('hovering a selectable element previews its name; leaving clears it', async ({ page }) => {
  await createHairline(page);
  await waitSettled(page);

  const p = await partPoint(page, '#f0');
  await page.mouse.move(p.x, p.y);
  await expect(page.getByTestId('canvas-hover')).toBeVisible();
  await expect(page.getByTestId('hover-tag')).toHaveText('Name');

  // Top-center is empty canvas for a bottom-left lower third.
  const layer = (await page.getByTestId('canvas-layer').boundingBox())!;
  await page.mouse.move(layer.x + layer.width / 2, layer.y + layer.height * 0.1);
  await expect(page.getByTestId('canvas-hover')).toBeHidden();
});

test('clicking empty canvas or pressing Escape deselects', async ({ page }) => {
  await createHairline(page);
  await waitSettled(page);
  const layer = (await page.getByTestId('canvas-layer').boundingBox())!;

  const p = await partPoint(page, '#f0');
  await page.mouse.click(p.x, p.y);
  await expect(page.getByTestId('canvas-selection')).toBeVisible();

  await page.mouse.click(layer.x + layer.width / 2, layer.y + layer.height * 0.1);
  await expect(page.getByTestId('canvas-selection')).toBeHidden();

  await page.mouse.click(p.x, p.y);
  await expect(page.getByTestId('canvas-selection')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('canvas-selection')).toBeHidden();
});

test('clicking the selected part again climbs to its container; the whole graphic keeps the scale handle', async ({ page }) => {
  await createHairline(page);
  await waitSettled(page);

  // The box's left padding strip (12 canvas px in): inside the panel, left of the text masks.
  const p = await partPoint(page, '.lower-third-box', 12, 0.3);
  await page.mouse.click(p.x, p.y);
  await expect(page.getByTestId('selection-chip')).toContainText('Panel');

  await page.waitForTimeout(600); // spaced clicks — this is selection climbing, not a dblclick
  await page.mouse.click(p.x, p.y);
  const chip = page.getByTestId('selection-chip');
  await expect(chip).toContainText('Whole graphic');
  await expect(chip).toContainText('Corner handle resizes');

  // The root's one existing action stays reachable: the handle holds even off-hover.
  const layer = (await page.getByTestId('canvas-layer').boundingBox())!;
  await page.mouse.move(layer.x + layer.width / 2, layer.y + layer.height * 0.1);
  await expect(page.getByTestId('scale-handle')).toBeVisible();
  await expect(page.getByTestId('canvas-hover')).toBeHidden(); // hover cleared, selection held

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('canvas-selection')).toBeHidden();
  await expect(page.getByTestId('scale-handle')).toBeHidden(); // it was anchored to the selection
});

test('selection layers cleanly under inline editing and never blocks drag-to-move', async ({ page }) => {
  await createHairline(page);
  await waitSettled(page);
  const before = await rootAnchor(page);

  // Double-click opens the inline editor; the chip yields the spot while it is open.
  const p = await partPoint(page, '#f0');
  await page.mouse.dblclick(p.x, p.y);
  await expect(page.getByTestId('inline-editor')).toBeVisible();
  await expect(page.getByTestId('selection-chip')).toBeHidden();

  // First Escape cancels only the edit; selection followed the edited field.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inline-editor')).toBeHidden();
  await expect(page.getByTestId('selection-chip')).toContainText('Name');
  expect(await rootAnchor(page)).toEqual(before); // still nothing written

  // A drag that starts on the graphic still re-anchors it (selection is not a mode).
  const layer = (await page.getByTestId('canvas-layer').boundingBox())!;
  await page.mouse.move(layer.x + layer.width * 0.15, layer.y + layer.height * 0.82);
  await page.mouse.down();
  await page.mouse.move(layer.x + layer.width * 0.85, layer.y + layer.height * 0.15, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(650);
  const anchor = await rootAnchor(page);
  expect(anchor.right).not.toBe('auto');
  expect(anchor.top).not.toBe('auto');

  // The drag was a move, not a click: the selection survived it unchanged.
  await expect(page.getByTestId('selection-chip')).toContainText('Name');
});

test('selection is shared: a canvas click highlights the timeline row, a row label selects on canvas', async ({ page }) => {
  await createHairline(page);
  await waitSettled(page);

  // Canvas → timeline: clicking the Name line highlights its overview row.
  const p = await partPoint(page, '#f0');
  await page.mouse.click(p.x, p.y);
  await expect(page.locator('[data-part="#f0"]')).toHaveClass(/selected/);

  // Timeline → canvas: clicking the Title row's label selects the element on the canvas.
  await page.locator('[data-part="#f1"]').click();
  await expect(page.getByTestId('selection-chip')).toContainText('Title');
  await expect(page.getByTestId('canvas-selection')).toBeVisible();
  await expect(page.locator('[data-part="#f1"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-part="#f0"]')).not.toHaveClass(/selected/);

  // Clicking the selected label again deselects on BOTH surfaces; nothing was written.
  await page.locator('[data-part="#f1"]').click();
  await expect(page.getByTestId('canvas-selection')).toBeHidden();
  await expect(page.locator('[data-part="#f1"]')).not.toHaveClass(/selected/);
  await expect(page.locator('.change-dot')).toHaveCount(0);
});
