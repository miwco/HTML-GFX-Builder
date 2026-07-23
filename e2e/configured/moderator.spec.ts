import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  createGraphic,
  haveCreds,
  settleSync,
  shot,
  signIn,
  wipeMyGraphics,
  wipeMySubmissions,
  SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from './_helpers';

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
    // The library syncs, so the account arrives holding whatever earlier runs saved; the graphic
    // below is addressed by NAME.
    await settleSync(page);
    await wipeMyGraphics(page);
  });

  test.afterEach(async ({ page }) => {
    await wipeMySubmissions(page);
    await wipeMyGraphics(page);
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

    // The queue states an item's moderation status in the SHARED vocabulary
    // (community/communityData.ts STATUS_LABEL), never the table's own word — the author reads
    // the same sentence in Home.
    const queue = page.locator('.pk-modal');
    await expect(queue).toContainText('live');
    await expect(queue).not.toContainText('approved');

    // The detail card fetches the item's body, so it arrives a beat after the click. Identify it
    // by the control only IT has — addressing it by position caught the list instead, and the
    // screenshot then showed a queue with nothing selected.
    const detail = queue.locator('.panel-section').filter({
      has: page.getByRole('button', { name: 'Remove from gallery' }),
    });
    await expect(detail).toBeVisible();
    // The preview runs origin-less (untrusted content), so the settle recipe has to ride INSIDE
    // the document — without it a moderator judges a black rectangle. Nothing outside can read
    // the frame, so the check is that the bootstrap shipped; the screenshot is the eyeball.
    await expect(detail.locator('iframe')).toHaveAttribute('srcdoc', /id="spx-settle"/);
    await shot(page, 'moderation-queue');

    await detail.getByRole('button', { name: 'Remove from gallery' }).click();
    await expect(page.locator('.pk-modal .status-ok')).toContainText('Removed');
    // …and once removed it says so in words, not as 'removed' straight off the row.
    await expect(queue).toContainText('taken down');

    // The removed item no longer appears in the public gallery listing.
    const count = await page.evaluate(async () => {
      const { listCommunity } = await import('/src/community/communityData.ts');
      return (await listCommunity()).length;
    });
    expect(count).toBe(0);
  });
});
