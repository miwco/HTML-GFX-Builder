import { test, expect } from '@playwright/test';
import { createGraphic, SUPABASE_URL } from './_helpers';

// Era 5.6 — the open editor. With a backend CONFIGURED, an anonymous visitor can still do the whole
// core workflow (create → preview → export) with no account; only the account features (cloud sync,
// community, AI, show chat) prompt for sign-in. Needs the configured dev server but NO credentials,
// so it runs even when E2E_EMAIL/PASSWORD are unset.

test.describe('anonymous visitor (open editor)', () => {
  test.skip(!SUPABASE_URL, 'set VITE_SUPABASE_URL to run the configured-mode suite');

  test('creates a graphic and reaches export with no account', async ({ page }) => {
    await page.goto('/');
    // No wall: the creation wizard opens straight away and no sign-in dialog is up.
    await expect(page.locator('.wz-modal')).toBeVisible();
    await expect(page.locator('.auth-card')).toHaveCount(0);

    await createGraphic(page, 'Lower thirds', 'Hairline');
    await expect(page.locator('.topbar .tpl-name')).toHaveText('Hairline');

    // The Export tab works signed out (validation + download are core, not account features).
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await expect(page.locator('.panel-body')).toContainText(/SPX/);
    await expect(page.getByTestId('signin-prompt')).toHaveCount(0);
  });

  test('account features prompt for sign-in instead of walling the app', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.wz-modal')).toBeVisible();
    await page.keyboard.press('Escape'); // close the wizard to reach the topbar + panels

    // Topbar offers Sign in (and no signed-in account status).
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.locator('.auth-status')).toHaveCount(0);

    // AI is an account feature in hosted mode: the panel shows the sign-in prompt, not controls.
    await page.getByRole('button', { name: 'AI', exact: true }).click();
    await expect(page.getByTestId('signin-prompt')).toBeVisible();

    // Community opens the sign-in dialog, not an empty gallery.
    await page.getByRole('button', { name: /Community/ }).click();
    await expect(page.locator('.auth-card')).toBeVisible();
    await expect(page.locator('.auth-card')).toContainText('community');

    // Esc closes the dialog — signing in is always optional.
    await page.keyboard.press('Escape');
    await expect(page.locator('.auth-card')).toHaveCount(0);
  });
});
