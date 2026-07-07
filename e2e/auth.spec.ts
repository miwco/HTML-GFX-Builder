import { test, expect } from '@playwright/test';

// Era 5.6: the editor is open to everyone — there is no login wall anywhere. And with no Supabase
// backend configured (the default, and always the case in this test's env) the app must grow NO
// auth UI at all: no sign-in button, no dialog, no account status. The hosted feature gates
// (AI / community / show chat prompting sign-in) are covered by e2e/configured/anonymous.spec.ts.

test('offline / no-backend: the app loads with no auth UI at all', async ({ page }) => {
  await page.goto('/');
  // The creation wizard opens straight away — nothing intercepted the app.
  await expect(page.locator('.wz-modal')).toBeVisible();
  // No sign-in dialog, no account status, no Sign in button in offline mode.
  await expect(page.locator('.auth-gate')).toHaveCount(0);
  await expect(page.locator('.auth-status')).toHaveCount(0);
  await expect(page.locator('.auth-signin')).toHaveCount(0);
});
