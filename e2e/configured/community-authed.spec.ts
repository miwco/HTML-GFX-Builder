import { test, expect } from '@playwright/test';
import { createGraphic, haveCreds, signIn, wipeMySubmissions } from './_helpers';

// Authenticated community flows against the configured Supabase backend. Skips unless E2E_EMAIL /
// E2E_PASSWORD are set (see playwright.live.config.ts). Each test cleans up the account's rows.

test.describe('community (configured / signed-in)', () => {
  test.skip(!haveCreds, 'set E2E_EMAIL + E2E_PASSWORD to run the authed community suite');

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test.afterEach(async ({ page }) => {
    await wipeMySubmissions(page);
  });

  test('publish a graphic, then import it back from the gallery', async ({ page }) => {
    // Publish a lower third: save it into the library, then 🌐 from its Home row
    // (publishing moved to Home with the packet manager's retirement).
    await createGraphic(page, 'Lower thirds', 'Hairline');
    await page.getByTestId('save-graphic').click();
    await page.getByTestId('save-name').fill('Hairline');
    await page.getByTestId('save-confirm').click();
    await page.getByTestId('open-home').click();
    await page.getByTestId('home-nav-graphics').click();
    await page.locator('.pk-graphic', { hasText: 'Hairline' }).getByTestId('publish-graphic').click();
    await page.getByPlaceholder(/One-line description/).fill('E2E round-trip');
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByTestId('publish-sheet')).toHaveCount(0);
    // "My community templates" shows it live.
    await expect(page.locator('.pk-graphic', { hasText: 'Hairline' }).last()).toContainText('live');
    await page.getByTestId('home-continue-editing').click();

    // Switch the editor to a DIFFERENT graphic so the import is observable.
    await page.getByRole('button', { name: '+ New project' }).click();
    await createGraphic(page, 'Tickers', 'News Strip');
    await expect(page.locator('.topbar .tpl-name')).toHaveText('News Strip');

    // Import the published Hairline from the gallery — it replaces the editor content.
    await page.getByRole('button', { name: /Community/ }).click();
    const card = page.locator('.pk-modal .pk-graphic', { hasText: 'Hairline' }).first();
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Use' }).click();
    await expect(page.locator('.pk-modal')).toBeHidden(); // gallery closes on a graphic import
    await expect(page.locator('.topbar .tpl-name')).toHaveText('Hairline');
  });

  test('the publish gate blocks a template that is not self-contained', async ({ page }) => {
    await createGraphic(page, 'Lower thirds', 'Hairline');
    // Inject an external CDN dependency — the gate must promote this to a blocking error.
    await page.evaluate(async () => {
      const { useTemplateStore } = await import('/src/store/templateStore.ts');
      const st = useTemplateStore.getState();
      st.setHtml(st.template.html + '\n<script src="https://cdn.jsdelivr.net/npm/x/y.js"></script>');
    });
    await page.getByTestId('save-graphic').click();
    await page.getByTestId('save-name').fill('Hairline');
    await page.getByTestId('save-confirm').click();
    await page.getByTestId('open-home').click();
    await page.getByTestId('home-nav-graphics').click();
    await page.locator('.pk-graphic', { hasText: 'Hairline' }).getByTestId('publish-graphic').click();

    // The sheet shows the blocking error and disables Publish.
    await expect(page.locator('[data-testid="publish-sheet"] .status-bad')).toContainText(/External dependency/i);
    await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeDisabled();
  });
});
