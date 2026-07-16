import { test, expect, type Page, type FrameLocator } from '@playwright/test';

// The wizard's live preview must FEEL live: every choice lands in the composed iframe,
// rapid changes settle on the LAST choice, and the lifecycle demo on the Animation step
// never strands the preview hidden after a mid-demo change (a stop() timer scheduled
// against the previous document must not blank the fresh one).

async function openWizardTo(page: Page, step: 'fields' | 'style' | 'animation') {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  const hops = { fields: 1, style: 2, animation: 3 }[step];
  for (let i = 0; i < hops; i++) await page.getByRole('button', { name: 'Next ›' }).click();
}

function preview(page: Page): FrameLocator {
  return page.frameLocator('.wz-side iframe');
}

/** The graphic root inside the preview — visible only after the entrance played. */
function root(page: Page) {
  return preview(page).locator('.lower-third');
}

async function rootOpacity(page: Page): Promise<string> {
  return root(page).evaluate((el) => getComputedStyle(el).opacity);
}

test('style step: rapid palette clicks settle on the LAST palette, entrance replayed', async ({ page }) => {
  await openWizardTo(page, 'style');
  // Click through several palettes quickly; the debounced rebuild must coalesce
  // to the final choice and the entrance must still play (no blank preview).
  for (const name of ['Mint', 'Royal', 'Frost', 'Inferno']) {
    await page.locator('.wz-palette', { hasText: name }).click();
    await page.waitForTimeout(80);
  }
  const inferno = await page.evaluate(async () => {
    const { paletteById } = await import('/src/model/wizard.ts');
    return paletteById('inferno').accent;
  });
  await expect
    .poll(async () =>
      preview(page)
        .locator(':root')
        .evaluate((el) => getComputedStyle(el).getPropertyValue('--accent').trim()),
    )
    .toBe(inferno);
  await expect.poll(() => rootOpacity(page)).toBe('1');
});

test('style step: font and size choices land in the rebuilt preview', async ({ page }) => {
  await openWizardTo(page, 'style');
  await page.locator('.wz-font', { hasText: 'Space Grotesk' }).click();
  await expect
    .poll(async () =>
      preview(page)
        .locator(':root')
        .evaluate((el) => getComputedStyle(el).getPropertyValue('--font-heading')),
    )
    .toContain('Space Grotesk');
  // Size L scales the WHOLE graphic (the --scale contract), not just the text.
  await page.locator('.panel-section', { hasText: 'Size' }).getByRole('button', { name: 'L', exact: true }).click();
  await expect
    .poll(async () =>
      preview(page)
        .locator(':root')
        .evaluate((el) => getComputedStyle(el).getPropertyValue('--scale').trim()),
    )
    .toBe('1.2');
  await expect.poll(() => rootOpacity(page)).toBe('1');
});

test('fields step: quick typing settles into the preview text', async ({ page }) => {
  await openWizardTo(page, 'fields');
  const sample = page.locator('.wz-line-row input').nth(1); // line 1's sample text
  await sample.fill('Dana Meridian');
  await expect(preview(page).locator('#f0')).toHaveText('Dana Meridian', { timeout: 5000 });
  await expect.poll(() => rootOpacity(page)).toBe('1');
});

test('animation step: a mid-demo preset change never leaves the preview hidden', async ({ page }) => {
  await openWizardTo(page, 'animation');
  // The lifecycle demo is running (in → out at 1.7s → in again at 2.8s). Change the
  // preset right around the exit so a stale stop()/play() timer would target the
  // rebuilt document if it survived the rebuild.
  await page.waitForTimeout(1500);
  await page.locator('.wz-anim', { hasText: 'Mask wipe' }).click();
  // Wait past the full demo cycle of the NEW document, then the graphic must be on air.
  await page.waitForTimeout(4500);
  await expect.poll(() => rootOpacity(page), { timeout: 5000 }).toBe('1');
});
