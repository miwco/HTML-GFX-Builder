import { expect, type Page } from '@playwright/test';
import { startNewProject } from '../_create';

// Shared setup for the configured-mode (authenticated) community specs. Credentials come from env so
// the public repo carries no secrets; `haveCreds` gates the whole suite off when they're unset.

export const E2E_EMAIL = process.env.E2E_EMAIL ?? '';
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? '';
export const haveCreds = Boolean(E2E_EMAIL && E2E_PASSWORD);

export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';

/** Sign in with email + password via the topbar dialog (Era 5.6 — the editor is open, no wall;
 *  fresh Playwright contexts have no persisted session). Leaves the wizard OPEN afterwards, the
 *  same state a fresh load presents, so createGraphic can run directly. */
export async function signIn(page: Page): Promise<void> {
  await page.goto('/app');
  // The startup wizard covers the topbar — close it to reach the Sign in button.
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const email = page.locator('#auth-email');
  await email.waitFor({ state: 'visible', timeout: 15_000 });
  await email.fill(E2E_EMAIL);
  await page.locator('#auth-pass').fill(E2E_PASSWORD);
  await page.locator('.auth-card').getByRole('button', { name: 'Sign in', exact: true }).click();
  // The dialog closes itself on session; the account appears in the topbar.
  await expect(page.locator('.auth-status')).toBeVisible({ timeout: 20_000 });
  // Restore the state downstream helpers expect (wizard open, as on a fresh load).
  await startNewProject(page);
}

/** Create a project through the wizard (which opens on load). */
export async function createGraphic(page: Page, category: string, variant: string): Promise<void> {
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: category }).click();
  await page.locator('.wz-variant', { hasText: variant }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);
}

/** Drop a screenshot of a signed-in surface into test-results/signed-in/. These surfaces render
 *  NOTHING offline, so the shots are the only way to review how they actually look. */
export async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `test-results/signed-in/${name}.png` });
}

/** Wait for the sign-in sync pass to finish, so a spec that reads or wipes the account's cloud
 *  data sees a settled library rather than one still being pulled in. Signing in IS a sync
 *  trigger (backend/syncController.ts), which is why this is reachable at all. */
export async function settleSync(page: Page): Promise<void> {
  await expect(page.locator('.sync-status.sync-synced')).toBeVisible({ timeout: 30_000 });
}

/** Delete every saved graphic in the account's library and push the tombstones. The library
 *  SYNCS, so without this each live run would leave another "Hairline" in the cloud for the next
 *  one to pull back down — and specs that address a saved row by name would go ambiguous. */
export async function wipeMyGraphics(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const { loadGraphics, deleteGraphic } = await import('/src/model/library.ts');
    for (const g of loadGraphics()) deleteGraphic(g.id);
    const { syncNow } = await import('/src/backend/syncController.ts');
    await syncNow();
  });
}

/** Remove every community submission owned by the signed-in test account (bulletproof teardown for a
 *  throwaway account that should only ever hold test rows). */
export async function wipeMySubmissions(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const { listMySubmissions, unpublish } = await import('/src/community/communityData.ts');
    const subs = await listMySubmissions();
    for (const s of subs) await unpublish(s.id);
  });
}
