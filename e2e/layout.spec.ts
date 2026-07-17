import { test, expect, type Page } from '@playwright/test';
import { createProject } from './_create';

// The flexible dockable-panel workspace (model/layout.ts): the canvas over the timeline in the
// centre, flanked by left/right docks (plus an optional bottom dock), each hosting any panels as
// tabs that can be shown, hidden, resized, and moved between docks. Runs at Playwright's default
// 1280×720 viewport (> 768px → the desktop dock layout, not the mobile stack).

async function createHairline(page: Page) {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
}

test('the default framing: code on the left, Inspector + tools on the right, timeline in the centre', async ({ page }) => {
  await createHairline(page);
  // Left dock holds the code editor; the right dock holds the Inspector (active) + tool panels.
  await expect(page.getByTestId('dock-slot-left')).toBeVisible();
  await expect(page.getByTestId('dock-tab-code')).toBeVisible();
  await expect(page.locator('[data-testid="dock-right"] .dock-tab.active .dock-tab-label')).toHaveText('Inspector');
  for (const id of ['data', 'control', 'style', 'assets', 'ai', 'export']) {
    await expect(page.getByTestId(`dock-tab-${id}`)).toBeVisible();
  }
  // The timeline lives in the centre below the canvas — it spans the whole centre width.
  const stage = (await page.getByTestId('center-stage').boundingBox())!;
  const timeline = (await page.getByTestId('center-timeline').boundingBox())!;
  expect(Math.abs(timeline.width - stage.width)).toBeLessThan(4);
  expect(timeline.y).toBeGreaterThanOrEqual(stage.y + stage.height - 8);
});

test('closing a panel removes its dock and widens the centre; the closed state persists', async ({ page }) => {
  await createHairline(page);
  const centerBefore = (await page.getByTestId('center-stage').boundingBox())!.width;

  // Close the code editor — the left dock disappears and the centre widens.
  await page.getByTestId('toggle-code').click();
  await expect(page.getByTestId('dock-slot-left')).toHaveCount(0);
  const centerAfter = (await page.getByTestId('center-stage').boundingBox())!.width;
  expect(centerAfter).toBeGreaterThan(centerBefore);

  // It stays closed across a reload, and is offered again from a dock's "+" menu.
  await page.reload();
  await page.locator('.gallery-close').click();
  await expect(page.getByTestId('dock-slot-left')).toHaveCount(0);
  await page.getByTestId('dock-add-right').click();
  await expect(page.locator('[data-testid="dock-right"] .dock-menu')).toContainText('Code');
});

test('dragging a dock divider resizes it, and the size persists', async ({ page }) => {
  await createHairline(page);
  const leftBefore = (await page.getByTestId('dock-slot-left').boundingBox())!.width;

  // Drag the left divider RIGHT by 120px (raw move/down/move/up — pointer capture needs real moves).
  const div = (await page.getByTestId('left-divider').boundingBox())!;
  const cx = div.x + div.width / 2;
  const cy = div.y + div.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 120, cy, { steps: 8 });
  await page.mouse.up();

  const leftAfter = (await page.getByTestId('dock-slot-left').boundingBox())!.width;
  expect(leftAfter).toBeGreaterThan(leftBefore + 40);

  // The wider size survives a reload.
  await page.reload();
  await page.locator('.gallery-close').click();
  const leftReload = (await page.getByTestId('dock-slot-left').boundingBox())!.width;
  expect(Math.abs(leftReload - leftAfter)).toBeLessThan(30);
});

test('a panel moves between docks via its tab menu', async ({ page }) => {
  await createHairline(page);
  // The Style tool starts in the right dock; move it to the left dock.
  await expect(page.locator('[data-testid="dock-left"] [data-testid="dock-tab-style"]')).toHaveCount(0);
  await page.getByTestId('dock-tab-menu-style').click();
  await page.locator('[data-testid="dock-right"] .dock-menu', { hasText: 'Move to left' }).getByText('Move to left').click();
  await expect(page.locator('[data-testid="dock-left"] [data-testid="dock-tab-style"]')).toBeVisible();
  // It became the active tab in its new dock (its body shows).
  await expect(page.locator('[data-testid="dock-left"] .dock-tab.active .dock-tab-label')).toHaveText('Style');
});

test('the timeline sits in the centre at an editing scale with real room', async ({ page }) => {
  await createHairline(page);
  await expect(page.getByTestId('timeline-v2')).toBeVisible();
  // Layer rows are real editing targets, and read at UI size.
  const row = (await page.locator('.tlv2-row').first().boundingBox())!;
  expect(row.height).toBeGreaterThanOrEqual(26);
  const labelSize = await page
    .locator('.tlv2-labels .timeline-label')
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(labelSize).toBeGreaterThanOrEqual(12);
  // The timeline area is a substantial slice of the centre height (not a thin strip).
  const center = (await page.getByTestId('center-stage').boundingBox())!;
  const timeline = (await page.getByTestId('center-timeline').boundingBox())!;
  expect(timeline.height).toBeGreaterThan(center.height * 0.3);
});

test('the timeline height is resizable via the centre divider, and persists', async ({ page }) => {
  await createHairline(page);
  const tlBefore = (await page.getByTestId('center-timeline').boundingBox())!.height;

  // Drag the timeline divider UP by 100px to give the timeline more room.
  const div = (await page.getByTestId('timeline-divider').boundingBox())!;
  const cx = div.x + div.width / 2;
  const cy = div.y + div.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 100, { steps: 8 });
  await page.mouse.up();

  const tlAfter = (await page.getByTestId('center-timeline').boundingBox())!.height;
  expect(tlAfter).toBeGreaterThan(tlBefore + 40);

  await page.reload();
  await page.locator('.gallery-close').click();
  const tlReload = (await page.getByTestId('center-timeline').boundingBox())!.height;
  expect(Math.abs(tlReload - tlAfter)).toBeLessThan(30);
});
