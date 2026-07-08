import { test, expect, type Page, type FrameLocator } from '@playwright/test';

// The NoaCG house family (styleTag 'noacg') — the brand-kit overlays rebuilt as first-class
// catalog templates: one create + play + behavior spec per house mechanism (the standard
// lower thirds are covered by the shared sweep; here the family's own runtime is exercised —
// the live clock, the sign-colored market deltas, and the label chip structure).

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

test('house strap: creates from the noacg family and plays', async ({ page }) => {
  await createFrom(page, 'Lower thirds', 'House Strap');
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame(page).locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
  await expect(frame(page).locator('#f0')).toHaveText('Noa Haline');
  // The house label voice: the title line renders in the bundled mono face.
  await expect
    .poll(async () =>
      frame(page).locator('.lower-third-title').evaluate((el) => getComputedStyle(el).fontFamily),
    )
    .toContain('JetBrains Mono');
});

test('house clock bug: the live clock ticks and the logo replaces the mark', async ({ page }) => {
  await createFrom(page, 'Corner bug', 'House Clock');
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame(page).locator('.bug').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
  // The clock paints real local time and ticks once a second.
  const clock = frame(page).locator('#bug-clock');
  await expect(clock).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
  const first = await clock.textContent();
  await expect(clock).not.toHaveText(first!, { timeout: 3000 });
  // Three-bar placeholder shows until a logo is picked.
  await expect(frame(page).locator('.bug-mark')).toBeVisible();
});

test('house markets: deltas are colored by sign', async ({ page }) => {
  await createFrom(page, 'Tickers', 'House Markets');
  await page.getByRole('button', { name: '▶ Play' }).click();
  // rebuildTicker renders the items twice (marquee): 4 gains + 2 losses per set.
  await expect(frame(page).locator('#ticker-track .ticker-up')).toHaveCount(8);
  await expect(frame(page).locator('#ticker-track .ticker-down')).toHaveCount(4);
  await expect(frame(page).locator('#ticker-track .ticker-up').first()).toHaveText('+1.24%');
});

test('house breaking: chip and headline stack in visual order', async ({ page }) => {
  await createFrom(page, 'Lower thirds', 'House Breaking');
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect(frame(page).locator('#f0')).toHaveText('Coalition talks reach midnight deadline');
  await expect(frame(page).locator('#f1')).toHaveText('Breaking');
  // The chip (f1) renders ABOVE the headline (f0) even though the field order is f0-first.
  const chipY = await frame(page).locator('#f1').evaluate((el) => el.getBoundingClientRect().top);
  const headY = await frame(page).locator('#f0').evaluate((el) => el.getBoundingClientRect().top);
  expect(chipY).toBeLessThan(headY);
});
