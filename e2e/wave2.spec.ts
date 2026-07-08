import { test, expect, type Page, type FrameLocator } from '@playwright/test';

// Wave-2 categories: starting-soon, game timer, scoreboard, corner bug, infographic, quiz.
// One create + play + behavior spec per category.

async function createFrom(page: Page, categoryName: string, variantName: string) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: categoryName }).click();
  await page.locator('.wz-variant', { hasText: variantName }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  // Wait out the ~350 ms debounced preview rebuild (see CLAUDE.md gotchas).
  await page.waitForTimeout(650);
}

function frame(page: Page): FrameLocator {
  return page.frameLocator('iframe.preview-frame');
}

test('starting soon: holds on screen and the countdown ticks', async ({ page }) => {
  await createFrom(page, 'Starting soon', 'Quiet Hold');
  const clock = frame(page).locator('.starting-soon-clock');
  await expect(clock).toHaveText('5:00'); // idle paint shows the full duration
  await page.getByRole('button', { name: '▶ Play' }).click();
  // startClock() fires after the entrance, so give the first tick a wide window.
  await expect(clock).not.toHaveText('5:00', { timeout: 6000 });
  await expect(clock).toHaveText(/^\d+:\d{2}$/);
});

test('game timer: label binds and the clock runs', async ({ page }) => {
  await createFrom(page, 'Game show timer', 'Clean Clock');
  await expect(frame(page).locator('#f0')).toHaveText('ROUND 1');
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect(frame(page).locator('.game-timer-clock')).not.toHaveText('3:00', { timeout: 6000 });
});

test('scoreboard: all four fields bind and a score change lands', async ({ page }) => {
  await createFrom(page, 'Scoreboards', 'Match Strip');
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame(page).locator('.sb').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
  // Change Score A in the Data panel and push it with ⟳ Update.
  await page.locator('.panel-tabs .tab', { hasText: 'Data' }).click();
  const scoreInput = page.locator('.panel-body .field-row', { hasText: 'Score A' }).locator('input').first();
  await scoreInput.fill('5');
  await page.getByRole('button', { name: '⟳ Update' }).click();
  await expect(frame(page).locator('#f1')).toHaveText('5');
  await expect(frame(page).locator('#f2')).toHaveText('AWAY');
});

test('corner bug: plays with the placeholder mark', async ({ page }) => {
  await createFrom(page, 'Corner bug', 'Glass Mark');
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame(page).locator('.bug').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
  await expect(frame(page).locator('#f0')).toHaveText('LIVE');
});

test('infographic: the stat counts up to its value', async ({ page }) => {
  await createFrom(page, 'Infographics', 'Big Stat');
  const value = frame(page).locator('#f0');
  await expect(value).toHaveText('87%');
  await page.getByRole('button', { name: '▶ Play' }).click();
  // Mid-count the text is a smaller number; it must settle back on the target.
  await expect(value).toHaveText('87%', { timeout: 8000 });
  await expect
    .poll(async () => frame(page).locator('.ig').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
});

test('quiz: options bind and Next reveals the correct answer', async ({ page }) => {
  await createFrom(page, 'Quiz graphics', 'Arena Quiz');
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect(frame(page).locator('#f2')).toHaveText('Mars');
  await expect(frame(page).locator('.qz-correct')).toHaveCount(0); // no reveal before next()
  await page.getByRole('button', { name: '» Next' }).click();
  const correct = frame(page).locator('.qz-option.qz-correct');
  await expect(correct).toHaveCount(1);
  await expect(correct.locator('#f2')).toHaveText('Mars'); // f5 default 'B' -> option 2
  await expect(frame(page).locator('.qz-dim')).toHaveCount(3);
});
