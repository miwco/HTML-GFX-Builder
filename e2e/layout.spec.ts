import { test, expect, type Page } from '@playwright/test';

// Desktop collapse + resize layout. Runs at Playwright's default 1280×720 viewport, which is desktop
// (> 768px → !isMobile), so the two-pane split view with the divider is active.

async function createHairline(page: Page) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650); // debounced preview rebuild
}

test('hide code widens the preview, and the collapsed state persists across reload', async ({ page }) => {
  await createHairline(page);

  // Default: code pane + divider present.
  await expect(page.locator('[data-testid="code-pane"]')).toBeVisible();
  await expect(page.locator('[data-testid="workspace-divider"]')).toBeVisible();
  const previewBefore = (await page.locator('.preview-stage').boundingBox())!.width;

  // Collapse → code pane + divider gone, preview widens.
  await page.getByTestId('toggle-code').click();
  await expect(page.locator('[data-testid="code-pane"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="workspace-divider"]')).toHaveCount(0);
  const previewAfter = (await page.locator('.preview-stage').boundingBox())!.width;
  expect(previewAfter).toBeGreaterThan(previewBefore);

  // Persists across a reload (the wizard reopens on load — close it to keep the current graphic).
  await page.reload();
  await page.locator('.gallery-close').click();
  await expect(page.locator('[data-testid="code-pane"]')).toHaveCount(0);
  await expect(page.getByTestId('toggle-code')).toHaveText(/Show code/);
});

test('dragging the divider resizes the columns, and the ratio persists', async ({ page }) => {
  await createHairline(page);
  const codeBefore = (await page.locator('[data-testid="code-pane"]').boundingBox())!.width;

  // Drag the divider LEFT by 150px. Use raw mouse move/down/move/up (not dragTo) — pointer capture
  // needs real intermediate move events.
  const div = (await page.locator('[data-testid="workspace-divider"]').boundingBox())!;
  const cx = div.x + div.width / 2;
  const cy = div.y + div.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - 150, cy, { steps: 8 });
  await page.mouse.up();

  const codeAfter = (await page.locator('[data-testid="code-pane"]').boundingBox())!.width;
  expect(codeAfter).toBeLessThan(codeBefore - 40);

  // The narrower ratio survives a reload.
  await page.reload();
  await page.locator('.gallery-close').click();
  const codeReload = (await page.locator('[data-testid="code-pane"]').boundingBox())!.width;
  expect(Math.abs(codeReload - codeAfter)).toBeLessThan(30);
});

test('code-left: the tool panels span the full width under preview and Inspector — no dead corner', async ({ page }) => {
  await createHairline(page);
  await page.getByTestId('toggle-inspector').click();
  await expect(page.getByTestId('inspector-pane')).toBeVisible();

  const panel = (await page.getByTestId('panel-pane').boundingBox())!;
  const insp = (await page.getByTestId('inspector-pane').boundingBox())!;
  const stage = (await page.locator('.preview-stage').boundingBox())!;
  const code = (await page.getByTestId('code-pane').boundingBox())!;
  // The Inspector column ends exactly where the panel row begins — nothing dead under it.
  expect(insp.y + insp.height).toBeLessThanOrEqual(panel.y + 2);
  // The panel row spans the whole right region: from the code column's edge to the
  // Inspector's right edge.
  expect(panel.x).toBeGreaterThanOrEqual(code.x + code.width - 2);
  expect(panel.x + panel.width).toBeGreaterThanOrEqual(insp.x + insp.width - 4);
  // The Inspector still sits right of the preview, never over it.
  expect(insp.x).toBeGreaterThanOrEqual(stage.x + stage.width - 2);
});

test('the step timeline reads at an editing scale — comfortable rows and labels', async ({ page }) => {
  await createHairline(page);
  await expect(page.getByTestId('timeline-v2')).toBeVisible();
  // Layer rows are real editing targets, not a status readout.
  const row = (await page.locator('.tlv2-row').first().boundingBox())!;
  expect(row.height).toBeGreaterThanOrEqual(26);
  // Row labels read at UI size (the classic strip keeps its compact 10.5px scale).
  const labelSize = await page
    .locator('.tlv2-labels .timeline-label')
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(labelSize).toBeGreaterThanOrEqual(12);
});

test('"preview on top" mode makes the preview full-width, above code, and persists', async ({ page }) => {
  await createHairline(page);
  const workspaceW = (await page.locator('.workspace').boundingBox())!.width;
  const stageBefore = (await page.locator('.preview-stage').boundingBox())!.width;

  await page.getByTestId('toggle-layout').click();

  // The preview now spans (nearly) the full workspace width and sits ABOVE the code/panels row.
  const previewPane = (await page.locator('.preview-pane').boundingBox())!;
  const codePane = (await page.locator('[data-testid="code-pane"]').boundingBox())!;
  expect(previewPane.width).toBeGreaterThan(workspaceW - 20);
  expect(previewPane.y + previewPane.height).toBeLessThanOrEqual(codePane.y + 5);
  // The stage is wider than in code-left mode (where it had ~half the width).
  const stageAfter = (await page.locator('.preview-stage').boundingBox())!.width;
  expect(stageAfter).toBeGreaterThan(stageBefore);

  // The mode persists across a reload.
  await page.reload();
  await page.locator('.gallery-close').click();
  await expect(page.locator('.preview-pane')).toBeVisible();
  await expect(page.getByTestId('toggle-layout')).toHaveText(/Code left/);
});
