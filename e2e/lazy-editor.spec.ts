import { test, expect, type Page } from '@playwright/test';

// Monaco loads lazily (AppShell wraps CodeEditor in React.lazy): the shell, preview, and
// wizard never wait on the editor bundle, and surfaces that don't show code don't fetch it
// at all. These specs pin the boundary itself; the rest of the suite covers the editor's
// behavior once it is up. The resource checks work in dev-server terms (module URLs), which
// is what this suite runs against — the production chunk split falls out of the same import().

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

/** URLs of every module/script the page has fetched so far. */
async function fetchedResources(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    performance.getEntriesByType('resource').map((r) => (r as PerformanceResourceTiming).name),
  );
}

const isEditorModule = (url: string) => /CodeEditor|monaco/i.test(url);

test('desktop: the code pane streams Monaco in after the shell', async ({ page }) => {
  await createHairline(page);
  // The lazy boundary must resolve into a real, working Monaco in the code pane.
  await expect(page.getByTestId('code-pane')).toBeVisible();
  await expect(page.locator('.monaco-editor').first()).toBeVisible();
  expect((await fetchedResources(page)).some(isEditorModule)).toBe(true);
});

test('mobile: Monaco is not fetched until "Show code"', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await createHairline(page);

  // The view-and-test mobile layout shows no code — the editor bundle must not be paid for.
  await expect(page.locator('.mobile-code-toggle')).toBeVisible();
  expect((await fetchedResources(page)).some(isEditorModule)).toBe(false);

  // Opening the code view fetches the bundle on demand and mounts the editor.
  await page.locator('.mobile-code-toggle').click();
  await expect(page.locator('.monaco-editor').first()).toBeVisible();
  expect((await fetchedResources(page)).some(isEditorModule)).toBe(true);
  await context.close();
});
