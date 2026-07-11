import { test, expect, type Page } from '@playwright/test';

// Timeline v2 Phase 2 — the Inspector column (the shared selection's third consumer) and
// the redo stack. The Inspector is the persistent panel right of the preview: identity +
// resolved property values for the selected layer (read shell; editing arrives with the
// keyframe timeline). Selection must stay synchronized: canvas ↔ timeline ↔ Inspector.

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

/** The Inspector defaults open only on wide screens (three real columns); at the e2e
 *  viewport it starts collapsed — open it the way a user would, via the topbar toggle. */
async function openInspector(page: Page) {
  if ((await page.getByTestId('inspector-pane').count()) === 0) {
    await page.getByTestId('toggle-inspector').click();
  }
  await expect(page.getByTestId('inspector-pane')).toBeVisible();
}

test('inspector: sits right of the preview, empty until something is selected', async ({ page }) => {
  await createHairline(page);
  await openInspector(page);
  const pane = page.getByTestId('inspector-pane');
  await expect(page.getByTestId('inspector-empty')).toContainText('Select an element');
  // Geometry: the Inspector is a true right column — never covering the preview.
  const stage = (await page.locator('.preview-stage').boundingBox())!;
  const insp = (await pane.boundingBox())!;
  expect(insp.x).toBeGreaterThanOrEqual(stage.x + stage.width - 2);
  // The toolbar toggle collapses and restores it.
  await page.getByTestId('toggle-inspector').click();
  await expect(pane).toHaveCount(0);
  await page.getByTestId('toggle-inspector').click();
  await expect(page.getByTestId('inspector-pane')).toBeVisible();
});

test('inspector: selecting a timeline row shows that layer — selection synced all around', async ({ page }) => {
  await createHairline(page);
  await openInspector(page);
  // Select the Name line via its timeline row label (the shared-selection handle).
  await page.locator('.timeline-label[data-part="#f0"]').click();
  await expect(page.getByTestId('inspector-part-label')).toHaveText('Name');
  await expect(page.getByTestId('inspector')).toContainText('#f0');
  // Lower thirds create as data blocks: the animated mask property is ARMED, so it
  // renders as an editable input resolved at the settled state (yPercent ends at 0).
  await expect(page.getByTestId('inspector-input-yPercent')).toHaveValue('0');
  // The same selection washes the timeline row (the existing shared-selection pin).
  await expect(page.locator('.timeline-label[data-part="#f0"]')).toHaveClass(/selected/);
  // The Animations tab reports which steps move this layer.
  await page.getByTestId('inspector').getByRole('button', { name: 'Animations' }).click();
  await expect(page.getByTestId('inspector-animations')).toContainText('Enter');
  await expect(page.getByTestId('inspector-animations')).toContainText('yPercent');
  // Deselecting empties the Inspector again.
  await page.locator('.timeline-label[data-part="#f0"]').click();
  await expect(page.getByTestId('inspector-empty')).toBeVisible();
});

test('inspector: canvas clicks drive it too (select it to affect it)', async ({ page }) => {
  await createHairline(page);
  await openInspector(page);
  // Click the Name line on the CANVAS (the same coordinates trick canvas-selection uses).
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('#f0')).toBeVisible();
  const stage = (await page.locator('.preview-stage').boundingBox())!;
  const rect = await frame.locator('#f0').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: window.innerWidth };
  });
  const scale = stage.width / rect.w;
  await page.mouse.click(stage.x + rect.x * scale, stage.y + rect.y * scale);
  await expect(page.getByTestId('inspector-part-label')).toHaveText('Name');
});

test('inspector: a new selection opens it; an explicit collapse holds until the selection changes', async ({ page }) => {
  await createHairline(page);
  // At this viewport (< 1500 px) the Inspector starts collapsed.
  await expect(page.getByTestId('inspector-pane')).toHaveCount(0);
  // Selecting a layer (timeline row label here — canvas clicks and diamond clicks run
  // through the same store selection) un-collapses it.
  await page.locator('.timeline-label[data-part="#f0"]').click();
  await expect(page.getByTestId('inspector-pane')).toBeVisible();
  await expect(page.getByTestId('inspector-part-label')).toHaveText('Name');
  // An explicit ◨ collapse is respected while the selection stays the same.
  await page.getByTestId('toggle-inspector').click();
  await expect(page.getByTestId('inspector-pane')).toHaveCount(0);
  await page.waitForTimeout(250);
  await expect(page.getByTestId('inspector-pane')).toHaveCount(0);
  // A DIFFERENT selection is a new request to inspect — it opens again.
  await page.locator('.timeline-label[data-part="#f1"]').click();
  await expect(page.getByTestId('inspector-pane')).toBeVisible();
});

test('redo: Ctrl+Shift+Z restores an undone edit; a new edit clears the redo branch', async ({ page }) => {
  await createHairline(page);
  // The speed knob writes the data block's speed field (one undoable apply per pick).
  const speed = async () =>
    page.evaluate(async () => {
      const { useTemplateStore } = await import('/src/store/templateStore.ts');
      const { parseAnimData } = await import('/src/blocks/animData.ts');
      return parseAnimData(useTemplateStore.getState().template.js)?.speed;
    });
  await page.getByTestId('tlv2-speed').selectOption('1.5');
  expect(await speed()).toBe(1.5);
  await page.keyboard.press('Control+z');
  expect(await speed()).toBe(1);
  await page.keyboard.press('Control+Shift+z');
  expect(await speed()).toBe(1.5);
  // Undo again, make a DIFFERENT edit — the redo branch is gone (the classic cut).
  await page.keyboard.press('Control+z');
  await page.getByTestId('tlv2-speed').selectOption('0.75');
  expect(await speed()).toBe(0.75);
  await page.keyboard.press('Control+Shift+z');
  expect(await speed()).toBe(0.75); // no stale redo applied
});
