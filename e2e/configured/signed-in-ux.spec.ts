import { test, expect, type Page } from '@playwright/test';
import { createGraphic, haveCreds, settleSync, shot, signIn, wipeMyGraphics, wipeMySubmissions } from './_helpers';

// The signed-in UX walk. The 2026-07 review could only read these surfaces from source — the
// editor's account features render NOTHING offline, so the whole offline suite is blind to them.
// This spec drives them for real against the configured backend and pins the properties the
// review checked everywhere else: the topbar stays one row at laptop widths (signed in it grows
// three more controls — sync, community, the avatar), and the account-facing wording is the
// product's, not the database's.
//
// It also drops a screenshot of each surface into test-results/signed-in/ for eyeballing.

/** The topbar is ONE row when every control shares one vertical band and the last of them still
 *  ends inside the bar. Rows are counted by CENTRE, not by top: the bar centres its children, so
 *  the 34px avatar and a 26px button legitimately have different tops on the same row. */
async function topbarRows(page: Page): Promise<{ rows: number; overflowPx: number; height: number }> {
  return page.locator('.topbar').evaluate((bar) => {
    const kids = [...bar.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 0);
    const bands = new Set(kids.map((r) => Math.round((r.top + r.bottom) / 12)));
    const barBox = bar.getBoundingClientRect();
    const right = Math.max(...kids.map((r) => r.right));
    return { rows: bands.size, overflowPx: Math.round(right - barBox.right), height: Math.round(barBox.height) };
  });
}

test.describe('signed-in UX walk (configured)', () => {
  test.skip(!haveCreds, 'set E2E_EMAIL + E2E_PASSWORD to run the signed-in walk');
  // The share-link buttons only claim "Copied" once the clipboard accepts the write, so the
  // context has to allow it — a headless context refuses by default.
  test.use({ permissions: ['clipboard-write'] });

  test('the topbar holds one row at laptop widths with the account controls in it', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await signIn(page);
    await page.keyboard.press('Escape'); // close the wizard signIn() leaves open

    // Every signed-in-only control is really there — otherwise the fit below proves nothing.
    // The sync chip in particular: signing in is what starts the pass that makes it appear.
    await settleSync(page);
    await expect(page.getByTestId('account-button')).toBeVisible();
    await expect(page.getByRole('button', { name: /Community/ })).toBeVisible();

    for (const width of [1366, 1280, 1100]) {
      await page.setViewportSize({ width, height: 768 });
      const bar = await topbarRows(page);
      expect(bar, `topbar at ${width}px`).toMatchObject({ rows: 1 });
      expect(bar.overflowPx, `topbar overflow at ${width}px`).toBeLessThanOrEqual(0);
    }

    await page.setViewportSize({ width: 1366, height: 768 });
    await shot(page, 'topbar-signed-in');
    await page.getByTestId('account-button').click();
    await expect(page.getByTestId('account-menu')).toBeVisible();
    await shot(page, 'account-menu');

    // Settings borrows the wizard's modal frame, which is a fixed 94vh workspace. A short
    // preferences form must not open as a full-height sheet of empty space.
    await page.getByTestId('account-menu').getByRole('menuitem', { name: /settings/i }).click();
    await expect(page.getByTestId('settings')).toBeVisible();
    await shot(page, 'settings-dialog');
    const settingsBox = (await page.getByTestId('settings').boundingBox())!;
    expect(settingsBox.height).toBeLessThan(768 * 0.85);
  });

  test('a published graphic reports its state in the product’s words, not the database’s', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await signIn(page);
    // The library syncs: start from an empty one so the saved row below is unambiguous by name.
    await settleSync(page);
    await wipeMyGraphics(page);
    await createGraphic(page, 'Lower thirds', 'Hairline');
    await page.getByTestId('save-graphic').click();
    await page.getByTestId('save-name').fill('Hairline');
    await page.getByTestId('save-confirm').click();
    await page.getByTestId('open-home').click();
    await page.getByTestId('home-nav-graphics').click();
    await page.locator('.pk-graphic', { hasText: 'Hairline' }).getByTestId('publish-graphic').click();
    await shot(page, 'publish-sheet');
    await page.getByPlaceholder(/One-line description/).fill('E2E signed-in walk');
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByTestId('publish-sheet')).toHaveCount(0);

    // "My community templates" is an AUTHOR's surface. `approved` / `pending` / `removed` are
    // the moderation table's words; the moderator queue already translates them, and the author
    // must read the same sentence.
    const mine = page.locator('.pk-graphic', { hasText: 'Hairline' }).last();
    await expect(mine).toContainText('live');
    await expect(mine).not.toContainText('approved');
    await shot(page, 'home-my-community-templates');

    // Copying the share link is a clipboard write — invisible unless the button says so.
    await mine.getByTitle('Copy a share link').click();
    await expect(mine.getByRole('button', { name: /Copied/ })).toBeVisible();

    // The gallery opens from the EDITOR topbar; Home has its own chrome.
    await page.getByTestId('home-continue-editing').click();
    await page.getByRole('button', { name: /Community/ }).click();
    await expect(page.locator('.pk-modal')).toBeVisible();
    await expect(page.locator('.pk-modal .pk-graphic').first()).toBeVisible(); // past "Loading…"
    await shot(page, 'community-gallery');
    // Same frame, same rule as Settings: a gallery holding a handful of rows is not a full-height
    // sheet. This was the shape it loaded in, too — 700px of nothing under one "Loading…" line.
    const galleryBox = (await page.locator('.pk-modal').boundingBox())!;
    expect(galleryBox.height).toBeLessThan(768 * 0.85);
    // The card's one-line metadata stays on one line: the summary claims its OWN line rather than
    // squeezing the row it shares (see .pk-modal .pk-graphic in styles.css).
    const metaHeight = await page
      .locator('.pk-modal .pk-graphic')
      .first()
      .locator('.muted')
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(metaHeight).toBeLessThanOrEqual(24);
    await page.keyboard.press('Escape');

    await wipeMySubmissions(page);
    await wipeMyGraphics(page);
  });

  test('the hosted control page publish surface speaks rundowns', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await settleSync(page);
    await wipeMyGraphics(page);
    await createGraphic(page, 'Lower thirds', 'Hairline');
    await page.getByTestId('save-graphic').click();
    await page.getByTestId('save-name').fill('Hairline');
    await page.getByTestId('save-confirm').click();

    // Build a one-graphic rundown so the hosted-publish controls become reachable.
    await page.getByTestId('dock-tab-control').click();
    const panel = page.locator('.panel-body');
    await panel.getByPlaceholder('New rundown name').fill('Evening bulletin');
    await panel.getByRole('button', { name: 'Create', exact: true }).click();
    await panel.getByRole('button', { name: '+ Add current' }).click();

    const host = panel.getByRole('button', { name: /Host control page online/ });
    await expect(host).toBeEnabled();
    // Wave 3 renamed shows to rundowns in user-facing strings; a tooltip is user-facing, and
    // this branch only ever renders for a signed-in account — which is how it was missed.
    await expect(host).toHaveAttribute('title', /rundown/i);
    await expect(host).not.toHaveAttribute('title', /\bshow\b/i);
    await shot(page, 'control-panel-hosted-publish');
  });
});
