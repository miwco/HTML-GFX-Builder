import { test, expect } from '@playwright/test';

// Era 1: self-hosted Monaco — the editor must work with every CDN unreachable.

test('the editor loads and works with all CDNs blocked', async ({ page }) => {
  const cdnHits: string[] = [];
  // Kill anything that isn't the dev server — a CDN dependency would surface as a hang.
  await page.route(/^https?:\/\/(?!localhost)/, (route) => {
    cdnHits.push(route.request().url());
    return route.abort();
  });

  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.waitForTimeout(650);

  // Monaco rendered from the bundle and is interactive.
  await expect(page.locator('.editor-host .monaco-editor')).toBeVisible();
  await expect(page.locator('.editor-host .view-line').first()).toContainText('DOCTYPE');
  await page.locator('.editor-host .monaco-editor').click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('<!-- offline edit -->');
  const html = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.html;
  });
  expect(html).toContain('<!-- offline edit -->');

  // Nothing even TRIED to reach a CDN for the editor.
  expect(cdnHits.filter((u) => /jsdelivr|unpkg|cdnjs/.test(u))).toEqual([]);
});
