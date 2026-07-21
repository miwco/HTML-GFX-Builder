import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createGraphic, haveCreds, signIn, wipeMySubmissions, SERVICE_ROLE_KEY, SUPABASE_URL } from './_helpers';

// The moderator takedown queue, end to end. Needs the service_role key (a server secret, never a VITE_
// var) to grant/revoke the test account's moderator role — so it skips unless that key is present.

const canRun = haveCreds && Boolean(SERVICE_ROLE_KEY && SUPABASE_URL);

test.describe('community moderation (configured / moderator)', () => {
  test.skip(!canRun, 'set E2E_EMAIL/E2E_PASSWORD + SUPABASE_SERVICE_ROLE_KEY to run the moderator suite');

  let admin: SupabaseClient | null = null;
  let uid = '';

  test.beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data } = await admin.auth.admin.listUsers();
    uid = data.users.find((u) => u.email === process.env.E2E_EMAIL)?.id ?? '';
    // Grant BEFORE sign-in so useIsModerator() reports true on first load (no reload needed).
    if (uid) await admin.from('moderators').upsert({ user_id: uid, note: 'e2e' });
  });

  test.afterAll(async () => {
    if (admin && uid) await admin.from('moderators').delete().eq('user_id', uid);
  });

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test.afterEach(async ({ page }) => {
    await wipeMySubmissions(page);
  });

  test('a moderator removes a published item from the gallery', async ({ page }) => {
    expect(uid, 'resolved the test account uid').toBeTruthy();

    // Publish something to moderate — save into the library, 🌐 from its Home row.
    await createGraphic(page, 'Lower thirds', 'Hairline');
    await page.getByTestId('save-graphic').click();
    await page.getByTestId('save-name').fill('Hairline');
    await page.getByTestId('save-confirm').click();
    await page.getByTestId('open-home').click();
    await page.getByTestId('home-nav-graphics').click();
    await page.locator('.pk-graphic', { hasText: 'Hairline' }).getByTestId('publish-graphic').click();
    await page.getByPlaceholder(/One-line description/).fill('E2E moderation');
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByTestId('publish-sheet')).toHaveCount(0);
    await page.getByTestId('home-continue-editing').click();

    // The 🛡 Moderate button is present (granted in beforeAll). Open the queue, review, remove.
    await page.getByRole('button', { name: /Moderate/ }).click();
    await page.getByRole('button', { name: /^All/ }).click(); // default filter is "Reported"
    await page
      .locator('.pk-modal .pk-graphic', { hasText: 'Hairline' })
      .first()
      .getByRole('button', { name: 'Review' })
      .click();
    await page.getByRole('button', { name: 'Remove from gallery' }).click();
    await expect(page.locator('.pk-modal .status-ok')).toContainText('Removed');

    // The removed item no longer appears in the public gallery listing.
    const count = await page.evaluate(async () => {
      const { listCommunity } = await import('/src/community/communityData.ts');
      return (await listCommunity()).length;
    });
    expect(count).toBe(0);
  });
});
