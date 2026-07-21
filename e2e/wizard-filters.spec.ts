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

/** Counts derived from the live catalog, so the assertions track catalog growth (the whole
 *  point of the template factory) instead of pinning a size that changes every time a cell
 *  is filled. The RELATIONSHIPS are what this spec guards — a style filter shows only that
 *  style, adding logo narrows further — not the absolute totals. */
async function lowerThirdCounts(page: Page) {
  return page.evaluate(async () => {
    const { variantsFor } = await import('/src/templates/catalog.ts');
    const vs = variantsFor('lower-third') as { styleTag: string; logo: string; maxLines: number }[];
    return {
      total: vs.length,
      glass: vs.filter((v) => v.styleTag === 'glass').length,
      glassLogo: vs.filter((v) => v.styleTag === 'glass' && v.logo !== 'none').length,
      threePlus: vs.filter((v) => v.maxLines >= 3).length,
    };
  });
}

test('style, logo, and line filters narrow the lower-thirds grid; clear restores all', async ({ page }) => {
  await toTemplateStep(page, 'Lower thirds');
  const n = await lowerThirdCounts(page);
  const cards = page.locator('.wz-variant');
  await expect(cards).toHaveCount(n.total);

  // Style: Glass keeps exactly the glass designs.
  await page.locator('.wz-filter', { hasText: 'Glass' }).click();
  await expect(cards).toHaveCount(n.glass);
  for (const tag of await page.locator('.wz-variant .wz-style-tag').allTextContents()) {
    expect(tag).toBe('Glass');
  }

  // Adding the logo facet narrows to glass designs with a logo slot (lt08 Frosted Card).
  await page.locator('.wz-filter', { hasText: 'Logo slot' }).click();
  await expect(cards).toHaveCount(n.glassLogo);
  await expect(page.locator('.wz-variant', { hasText: 'Frosted Card' })).toBeVisible();

  // Clear brings the whole catalog back.
  await page.locator('.wz-filter', { hasText: 'Clear' }).click();
  await expect(cards).toHaveCount(n.total);

  // Line capacity: 3+ lines keeps only the roomier designs.
  await page.locator('.wz-filter', { hasText: '3+ lines' }).click();
  await expect(cards).toHaveCount(n.threePlus);
});

test('an impossible combination shows the empty state with its own clear', async ({ page }) => {
  await toTemplateStep(page, 'Lower thirds');
  const n = await lowerThirdCounts(page);
  // NoaCG designs carry no logo slot, so this combination matches nothing.
  await page.locator('.wz-filter', { hasText: 'NoaCG' }).click();
  await page.locator('.wz-filter', { hasText: 'Logo slot' }).click();
  await expect(page.locator('.wz-variant')).toHaveCount(0);
  await page.locator('.wz-filter-empty button', { hasText: 'Clear filters' }).click();
  await expect(page.locator('.wz-variant')).toHaveCount(n.total);
});

test('facets that cannot narrow a category are not offered', async ({ page }) => {
  // Starting soon: no logo-capable design, so the logo chip must not appear.
  await toTemplateStep(page, 'Starting soon');
  await expect(page.locator('.wz-variant').first()).toBeVisible();
  await expect(page.locator('.wz-filter', { hasText: 'Logo slot' })).toBeHidden();
});
