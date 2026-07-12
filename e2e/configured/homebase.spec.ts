import { test, expect } from '@playwright/test';
import { haveCreds, signIn } from './_helpers';

// The signed-in account surface (Era 5.6 follow-up): the topbar avatar opens the account
// menu — Your homebase (saved graphics across packets), Settings (AI key + workflow
// defaults), Sign out. Runs against the configured backend with the throwaway account.

test.describe('account menu + homebase (configured / signed-in)', () => {
  test.skip(!haveCreds, 'set E2E_EMAIL + E2E_PASSWORD to run the authed suite');

  test('avatar menu opens homebase and settings; sign out returns the Sign in button', async ({ page }) => {
    await signIn(page);
    await page.keyboard.press('Escape'); // close the wizard signIn() leaves open

    // The avatar chip replaces the old email+signout pair.
    await page.getByTestId('account-button').click();
    const menu = page.getByTestId('account-menu');
    await expect(menu).toBeVisible();
    await expect(menu).toContainText(process.env.E2E_EMAIL ?? '');

    // Homebase: opens, shows the saved-graphics summary (empty state or list), closes on Esc.
    await menu.getByRole('menuitem', { name: /homebase/i }).click();
    await expect(page.getByTestId('homebase')).toBeVisible();
    await expect(page.getByTestId('homebase')).toContainText(/saved graphic/);
    await page.locator('[data-testid="homebase"] .gallery-close').click();
    await expect(page.getByTestId('homebase')).toHaveCount(0);

    // Settings: AI + workflow defaults sections render.
    await page.getByTestId('account-button').click();
    await page.getByTestId('account-menu').getByRole('menuitem', { name: /settings/i }).click();
    const settings = page.getByTestId('settings');
    await expect(settings).toBeVisible();
    await expect(settings).toContainText('AI');
    await expect(settings.locator('#set-export-target')).toBeVisible();
    await page.locator('[data-testid="settings"] .gallery-close').click();

    // Sign out flows back to the anonymous topbar.
    await page.getByTestId('account-button').click();
    await page.getByTestId('account-menu').getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible({ timeout: 10_000 });
  });
});
