import { test, expect, type Page } from '@playwright/test';

// Era 6 · T1 — the read-only timeline view (docs/TIMELINE_PLAN.md): the Motion tab renders
// the marked ANIMATION region as tracks, and the scrubber pauses the live preview at a
// chosen moment. Parsing is by construction (we emitted the region), so the tracks must
// match the preset's known structure.

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

test('timeline: tracks render for the generated preset with correct structure', async ({ page }) => {
  await createHairline(page); // lt01 default preset: line-reveal (set + accent + lines)
  await page.locator('.panel-tabs .tab', { hasText: 'Motion' }).click();

  const timeline = page.getByTestId('timeline');
  await expect(timeline).toBeVisible();
  // Knobs read back from the region.
  await expect(timeline).toContainText('speed ×1');
  await expect(timeline).toContainText('expo.out'); // line-reveal's auto ease pair
  // In phase: the reveal set(), the accent draw, and the staggered lines — three rows.
  const rows = timeline.locator('.timeline-row');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('.l3');
  await expect(rows.nth(1)).toContainText('.l3-accent');
  await expect(rows.nth(2)).toContainText('#f0, #f1');
  // Both phases offered, with real durations.
  await expect(timeline.locator('button.tab', { hasText: /^In/ })).toContainText('s');
  await expect(timeline.locator('button.tab', { hasText: /^Out/ })).toContainText('s');
});

test('timeline: scrubbing pauses the live preview mid-animation', async ({ page }) => {
  await createHairline(page);
  await page.locator('.panel-tabs .tab', { hasText: 'Motion' }).click();

  const frame = page.frameLocator('iframe.preview-frame');
  // Before any scrub the graphic is CSS-hidden.
  await expect
    .poll(async () => frame.locator('.l3').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('0');

  // Scrub to the middle of the entrance: the reveal set() has run (root visible) and the
  // timeline is PAUSED there (it stays visible, no exit runs).
  const scrub = page.getByTestId('timeline-scrub');
  await scrub.focus();
  for (let i = 0; i < 25; i++) await page.keyboard.press('ArrowRight'); // 25 × 0.01s steps
  await expect
    .poll(async () => frame.locator('.l3').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
  await page.waitForTimeout(400); // paused means paused — still visible after a beat
  await expect(frame.locator('.l3').first()).toHaveCSS('opacity', '1');
});
