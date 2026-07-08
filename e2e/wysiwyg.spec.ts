import { test, expect, type Page } from '@playwright/test';

// Era 6 · W1 — drag-to-position (docs/WYSIWYG_PLAN.md). A drag on the Move overlay must end
// as a deterministic zone+nudge patch on the root rule — the SAME declarations the Style
// panel writes — visible in the live preview's stylesheet after the debounced rebuild.

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
        if (rule instanceof CSSStyleRule && rule.selectorText === '.l3') {
          const s = rule.style;
          return { top: s.top, right: s.right, bottom: s.bottom, left: s.left };
        }
      }
    }
    return { top: '', right: '', bottom: '', left: '' };
  });
}

test('move mode: dragging the graphic re-anchors it via a zone+nudge code patch', async ({ page }) => {
  await createHairline(page); // default zone: bottom-left
  expect((await rootAnchor(page)).bottom).not.toBe('auto');

  await page.getByTestId('move-toggle').click();
  const overlay = page.getByTestId('move-overlay');
  await expect(overlay).toBeVisible();

  // Drag from the graphic's home (bottom-left) up to the top-right third.
  const box = (await overlay.boundingBox())!;
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
  await page.getByTestId('move-toggle').click(); // leave move mode so Ctrl+Z hits the app
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(650);
  expect((await rootAnchor(page)).bottom).not.toBe('auto');
});

test('move mode: Escape cancels a drag without touching the code', async ({ page }) => {
  await createHairline(page);
  const before = await rootAnchor(page);

  await page.getByTestId('move-toggle').click();
  const overlay = page.getByTestId('move-overlay');
  const box = (await overlay.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.82);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4, { steps: 4 });
  await page.keyboard.press('Escape');
  await page.mouse.up();

  await page.waitForTimeout(650);
  expect(await rootAnchor(page)).toEqual(before);
});
