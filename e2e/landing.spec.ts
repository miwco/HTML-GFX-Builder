import { test, expect } from '@playwright/test';

// The public landing page lives at "/" (static, no React); the editor lives at "/app"
// (dev/preview: the app-clean-url Vite plugin; production: Vercel cleanUrls). Old share
// links that pointed at the root with a query keep working via the landing's redirect shim.

test('root shows the landing page, not the editor', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Broadcast graphics');
  // The main call to action points at the editor.
  await expect(page.locator('.hero a.btn-amber')).toHaveAttribute('href', '/app');
  // The editor itself did not mount here.
  await expect(page.locator('.wz-modal')).toHaveCount(0);
  await expect(page.locator('#root')).toHaveCount(0);
});

test('the editor lives at /app (clean URL, dev parity with production)', async ({ page }) => {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
});

test('old root share links redirect into the app with their query intact', async ({ page }) => {
  await page.goto('/?chat=my-show');
  await page.waitForURL('**/app?chat=my-show');
  await page.goto('/?template=some-slug');
  await page.waitForURL('**/app?template=some-slug');
});
