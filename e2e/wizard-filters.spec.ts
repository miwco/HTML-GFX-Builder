import { test, expect, type Page } from '@playwright/test';

// The Template step's discovery filters: chips derived purely from variant metadata
// (style family, logo capability, line capacity) narrow the card grid; clearing them
// restores the full catalog. Facets that cannot narrow a category are not offered.

async function toTemplateStep(page: Page, category: string) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: category }).click();
}

test('style, logo, and line filters narrow the lower-thirds grid; clear restores all', async ({ page }) => {
  await toTemplateStep(page, 'Lower thirds');
  const cards = page.locator('.wz-variant');
  await expect(cards).toHaveCount(14);

  // Style: Glass keeps exactly the glass designs.
  await page.locator('.wz-filter', { hasText: 'Glass' }).click();
  await expect(cards).toHaveCount(3);
  for (const tag of await page.locator('.wz-variant .wz-style-tag').allTextContents()) {
    expect(tag).toBe('Glass');
  }

  // Adding the logo facet narrows to glass designs with a logo slot (lt08).
  await page.locator('.wz-filter', { hasText: 'Logo slot' }).click();
  await expect(cards).toHaveCount(1);
  await expect(page.locator('.wz-variant', { hasText: 'Frosted Card' })).toBeVisible();

  // Clear brings the whole catalog back.
  await page.locator('.wz-filter', { hasText: 'Clear' }).click();
  await expect(cards).toHaveCount(14);

  // Line capacity: 3+ lines keeps only the roomier designs.
  await page.locator('.wz-filter', { hasText: '3+ lines' }).click();
  const counts = await page.evaluate(async () => {
    const { variantsFor } = await import('/src/templates/catalog.ts');
    return variantsFor('lower-third').filter((v: { maxLines: number }) => v.maxLines >= 3).length;
  });
  await expect(cards).toHaveCount(counts);
});

test('an impossible combination shows the empty state with its own clear', async ({ page }) => {
  await toTemplateStep(page, 'Lower thirds');
  // NoaCG designs carry no logo slot, so this combination matches nothing.
  await page.locator('.wz-filter', { hasText: 'NoaCG' }).click();
  await page.locator('.wz-filter', { hasText: 'Logo slot' }).click();
  await expect(page.locator('.wz-variant')).toHaveCount(0);
  await page.locator('.wz-filter-empty button', { hasText: 'Clear filters' }).click();
  await expect(page.locator('.wz-variant')).toHaveCount(14);
});

test('facets that cannot narrow a category are not offered', async ({ page }) => {
  // Starting soon: no logo-capable design, so the logo chip must not appear.
  await toTemplateStep(page, 'Starting soon');
  await expect(page.locator('.wz-variant').first()).toBeVisible();
  await expect(page.locator('.wz-filter', { hasText: 'Logo slot' })).toBeHidden();
});
