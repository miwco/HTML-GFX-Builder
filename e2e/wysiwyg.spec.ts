import { test, expect, type Page } from '@playwright/test';

// Era 6 — direct manipulation (docs/WYSIWYG_PLAN.md, revised: NO move mode). The canvas
// layer is always on: a drag that STARTS on the graphic re-anchors it via the same
// zone+nudge patch the Style panel writes; drags on empty canvas do nothing; Esc cancels.
// The preview shows the settled graphic at rest, so there is always something to grab.

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

/** The root rule's anchoring sides from the PREVIEW's stylesheet (behavior-true: what renders).
 *  Read as style properties, not cssText — Chrome serializes the sides into the `inset` shorthand. */
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

/** Wait until the preview shows the settled graphic (the design view after every rebuild). */
async function waitSettled(page: Page) {
  await expect
    .poll(async () =>
      page.frameLocator('iframe.preview-frame').locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity),
    )
    .toBe('1');
}

test('dragging the graphic re-anchors it via a zone+nudge code patch (no mode)', async ({ page }) => {
  await createHairline(page); // default zone: bottom-left
  expect((await rootAnchor(page)).bottom).not.toBe('auto');
  await waitSettled(page); // the canvas layer is always on; the graphic is visible at rest

  // Drag from the graphic's home (bottom-left) up to the top-right third.
  const box = (await page.getByTestId('canvas-layer').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.82);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.15, { steps: 8 });
  await page.mouse.up();

  // The patch lands in the code, the preview rebuilds, and the root rule now anchors top-right.
  await page.waitForTimeout(650);
  const anchor = await rootAnchor(page);
  expect(anchor.right).not.toBe('auto');
  expect(anchor.top).not.toBe('auto');
  expect(anchor.left).toBe('auto');
  expect(anchor.bottom).toBe('auto');

  // Undo restores the previous anchoring (the patch went through the normal history).
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(650);
  expect((await rootAnchor(page)).bottom).not.toBe('auto');
});

test('W2: dragging the corner handle writes the --scale variable', async ({ page }) => {
  await createHairline(page);
  await waitSettled(page);

  // Hovering the graphic reveals the corner scale handle.
  const box = (await page.getByTestId('canvas-layer').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.82);
  const handle = page.getByTestId('scale-handle');
  await expect(handle).toBeVisible();

  // Drag it to the right — the graphic grows.
  const hb = (await handle.boundingBox())!;
  await page.mouse.move(hb.x + 5, hb.y + 5);
  await page.mouse.down();
  await page.mouse.move(hb.x + 5 + box.width * 0.15, hb.y + 5, { steps: 6 });
  await page.mouse.up();

  // One --scale patch (the Style panel's size mechanism), visible in the rebuilt preview.
  await page.waitForTimeout(650);
  const scaleVar = await page
    .frameLocator('iframe.preview-frame')
    .locator('body')
    .evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--scale').trim());
  expect(Number(scaleVar)).toBeGreaterThan(1);
  expect(Number(scaleVar)).toBeLessThanOrEqual(2); // clamped to the Style panel's range
});

test('a drag starting on empty canvas does nothing', async ({ page }) => {
  await createHairline(page);
  await waitSettled(page);
  const before = await rootAnchor(page);

  // Start in the top-middle — far from the bottom-left graphic.
  const box = (await page.getByTestId('canvas-layer').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.6, { steps: 4 });
  await page.mouse.up();

  await page.waitForTimeout(650);
  expect(await rootAnchor(page)).toEqual(before);
});

test('Escape cancels a drag without touching the code', async ({ page }) => {
  await createHairline(page);
  await waitSettled(page);
  const before = await rootAnchor(page);

  const box = (await page.getByTestId('canvas-layer').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.82);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4, { steps: 4 });
  await page.keyboard.press('Escape');
  await page.mouse.up();

  await page.waitForTimeout(650);
  expect(await rootAnchor(page)).toEqual(before);
});
