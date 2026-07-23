import { test, expect, type Page } from '@playwright/test';

// The Browse step's faceted discovery (docs/TEMPLATE_TAXONOMY_PROPOSAL.md §12-13): category
// tiles + field buckets + style chips narrow the grid (facets AND together), programme
// selection RANKS into "Best for" / "Also works" without hiding anything, search reaches
// templates through aliases, and the zero-result state offers its own escape hatches.
// Counts derive from the live metadata so the assertions track catalog growth; the
// RELATIONSHIPS are what this spec guards, never absolute totals.

async function toBrowseStep(page: Page) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await expect(page.locator('.wz-browse-search')).toBeVisible();
}

async function catalogCounts(page: Page) {
  return page.evaluate(async () => {
    const { allTemplateMeta } = await import('/src/templates/templateMeta.ts');
    const all = allTemplateMeta().map(({ meta }) => meta);
    const lt = all.filter((m) => m.category === 'lower-third');
    return {
      total: all.length,
      lowerThirds: lt.length,
      ltGlass: lt.filter((m) => m.styleFamily === 'glass').length,
      ltGlassLogo: lt.filter((m) => m.styleFamily === 'glass' && m.capabilities.includes('logo-upload')).length,
      repeating: all.filter((m) => m.fieldCounts.repeating > 0).length,
    };
  });
}

test('category, style, and capability facets AND together; clear-all restores the catalog', async ({ page }) => {
  await toBrowseStep(page);
  const n = await catalogCounts(page);
  const cards = page.locator('.wz-variant');
  await expect(cards).toHaveCount(n.total);

  // Category tile narrows to that category's templates.
  await page.locator('.wz-browse-tiles .wz-cat', { hasText: 'Lower thirds' }).click();
  await expect(cards).toHaveCount(n.lowerThirds);

  // Style: the glass family keeps exactly the glass designs.
  await page.locator('.wz-filter', { hasText: 'Elegant & cinematic' }).click();
  await expect(cards).toHaveCount(n.ltGlass);

  // Capabilities live under More filters and are STRICT (has logo upload = has it).
  await page.locator('.wz-browse-more summary').click();
  await page.locator('.wz-browse-more .wz-filter', { hasText: 'Logo upload' }).click();
  await expect(cards).toHaveCount(n.ltGlassLogo);
  await expect(page.locator('.wz-variant', { hasText: 'Frosted Card' })).toBeVisible();

  // Clear all brings the whole catalog back.
  await page.locator('.wz-filter-clear').click();
  await expect(cards).toHaveCount(n.total);

  // The repeating bucket keeps only templates with a repeating list field.
  await page.getByRole('button', { name: '↻ Repeating' }).click();
  await expect(cards).toHaveCount(n.repeating);
});

test('programme selection ranks into Best for / Also works without hiding anything', async ({ page }) => {
  await toBrowseStep(page);
  const n = await catalogCounts(page);
  await page.locator('.wz-browse-programme select').last().selectOption('church-service');
  // Ranking, never exclusion: every template still shows, split across the two sections.
  await expect(page.locator('.wz-browse-section', { hasText: 'Best for church service' })).toBeVisible();
  await expect(page.locator('.wz-browse-section', { hasText: 'Also works' })).toBeVisible();
  await expect(page.locator('.wz-variant')).toHaveCount(n.total);
});

test('search reaches templates through aliases and field semantics', async ({ page }) => {
  await toBrowseStep(page);
  const n = await catalogCounts(page);
  // "name graphic" is an alias for lower thirds — no template carries those words.
  await page.locator('.wz-browse-search').fill('name graphic');
  await expect(page.locator('.wz-variant')).toHaveCount(n.lowerThirds);
  await page.locator('.wz-browse-search').fill('countdown');
  // Countdown fans out across timers AND holding screens (the alias set).
  await expect(page.locator('.wz-variant', { hasText: 'Quiet Hold' })).toBeVisible();
  await expect(page.locator('.wz-variant', { hasText: 'Clean Clock' })).toBeVisible();
});

test('an impossible combination shows the honest empty state with its escape hatches', async ({ page }) => {
  await toBrowseStep(page);
  // Bold & on-air lower thirds carry no logo slot, so this combination matches nothing.
  await page.locator('.wz-browse-tiles .wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-filter', { hasText: 'Bold & on-air' }).click();
  await page.locator('.wz-browse-more summary').click();
  await page.locator('.wz-browse-more .wz-filter', { hasText: 'Logo upload' }).click();
  await expect(page.locator('.wz-variant')).toHaveCount(0);
  await expect(page.locator('.wz-browse-empty')).toBeVisible();
  // The escape hatches: drop the most limiting filter, or hand the brief to Create with AI.
  await expect(page.locator('.wz-browse-empty button', { hasText: 'Create it with AI' })).toBeVisible();
  await page.locator('.wz-browse-empty button', { hasText: 'Remove the most limiting filter' }).click();
  await expect(page.locator('.wz-variant').first()).toBeVisible();
});

test('facet values without catalog mass render no chip', async ({ page }) => {
  await toBrowseStep(page);
  await page.locator('.wz-browse-more summary').click();
  // No preset ships intensity "none", so that chip must not exist (proposal §10).
  await expect(page.locator('.wz-filter', { hasText: 'Motion: none' })).toHaveCount(0);
  // And only categories with content render tiles — the product category is a known gap.
  await expect(page.locator('.wz-browse-tiles .wz-cat', { hasText: 'Products' })).toHaveCount(0);
});
