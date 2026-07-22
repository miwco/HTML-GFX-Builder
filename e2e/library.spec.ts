import { test, expect, type Page } from '@playwright/test';
import { createProject } from './_create';

// docs/SAVED_CONTENT_MODEL.md — the graphics LIBRARY, the Save flow, routed Home, packages,
// and the per-graphic control panel with its ENTRIES. These are the core-product promises:
// a signed-out user saves, reopens, organizes, and operates a graphic without ever touching
// code, and browser Back/Forward walk the surfaces like pages.

async function saveAs(page: Page, name: string, dest: 'standalone' | 'new-package' = 'standalone', packageName = '') {
  await page.getByTestId('save-graphic').click();
  await expect(page.getByTestId('save-dialog')).toBeVisible();
  await page.getByTestId('save-name').fill(name);
  if (dest === 'new-package') {
    await page.getByTestId('save-dest').selectOption('new');
    await page.getByTestId('save-new-package').fill(packageName);
  }
  await page.getByTestId('save-confirm').click();
  await expect(page.getByTestId('save-dialog')).toBeHidden();
}

test('save names the graphic into a new package; the status stays honest through edits and reopen', async ({ page }) => {
  await createProject(page, 'Hairline');
  await expect(page.getByTestId('save-status')).toHaveText('Not saved');

  await saveAs(page, 'Presenter lower third', 'new-package', 'Election Night');
  await expect(page.getByTestId('save-status')).toHaveText('Saved');

  // An edit flips the badge; Ctrl+S saves it back without a dialog.
  await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const s = useTemplateStore.getState();
    s.applyTemplate({ ...s.template, css: s.template.css + '\n/* tweak */\n' });
  });
  await expect(page.getByTestId('save-status')).toHaveText('Unsaved changes');
  await page.keyboard.press('Control+s');
  await expect(page.getByTestId('save-status')).toHaveText('Saved');

  // A reload keeps the link (the slot carries graphicId + dirty).
  await page.reload();
  await page.locator('.gallery-close').click();
  await expect(page.getByTestId('save-status')).toHaveText('Saved');
  await expect(page.locator('.tpl-name')).toHaveText('Presenter lower third');
});

test('Home lists the library; a package opens with its graphics; Back walks the history', async ({ page }) => {
  await createProject(page, 'Hairline');
  await saveAs(page, 'Presenter lower third', 'new-package', 'Election Night');

  await page.getByTestId('open-home').click();
  await expect(page.getByTestId('home-page')).toBeVisible();
  await expect(page.locator('.pk-graphic', { hasText: 'Presenter lower third' })).toBeVisible();

  // Packages section → open the package → its contents; Back returns to the section.
  await page.getByTestId('home-nav-packages').click();
  await expect(page.locator('[data-testid^="package-row-"]', { hasText: 'Election Night' })).toBeVisible();
  await page.getByTestId('open-package').click();
  await expect(page.locator('h2', { hasText: 'Election Night' })).toBeVisible();
  await expect(page.locator('.pk-graphic', { hasText: 'Presenter lower third' })).toBeVisible();
  await page.goBack();
  await expect(page.locator('[data-testid^="package-row-"]', { hasText: 'Election Night' })).toBeVisible();

  // Continue editing returns to the editor with the same document.
  await page.getByTestId('home-continue-editing').click();
  await expect(page.locator('.tpl-name')).toHaveText('Presenter lower third');
});

test('the wizard leads with Continue working: recent graphics reopen from the entry step', async ({ page }) => {
  await createProject(page, 'Hairline');
  await saveAs(page, 'Presenter lower third');
  await page.locator('.brand-home').click(); // → Home
  await expect(page.getByTestId('home-page')).toBeVisible();
  await page.getByTestId('home-new-project').click(); // → the wizard route
  await expect(page.getByTestId('wz-continue')).toBeVisible();
  await page.locator('.wz-recent-chip', { hasText: 'Presenter lower third' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await expect(page.locator('.tpl-name')).toHaveText('Presenter lower third');
  await expect(page.getByTestId('save-status')).toHaveText('Saved');
});

test('opening another graphic with unsaved changes asks first; Discard proceeds', async ({ page }) => {
  await createProject(page, 'Hairline');
  await saveAs(page, 'First graphic');
  // Second graphic, saved, then dirtied.
  await createProject(page, { category: 'lower-third', index: 1 });
  await saveAs(page, 'Second graphic');
  await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const s = useTemplateStore.getState();
    s.applyTemplate({ ...s.template, css: s.template.css + '\n/* dirty */\n' });
  });
  await expect(page.getByTestId('save-status')).toHaveText('Unsaved changes');

  await page.getByTestId('open-home').click();
  await page.locator('.pk-graphic', { hasText: 'First graphic' }).getByTestId('open-graphic').click();
  await expect(page.getByTestId('confirm-switch')).toBeVisible();
  await page.getByTestId('switch-discard').click();
  await expect(page.locator('.tpl-name')).toHaveText('First graphic');
});

test('a saved graphic\'s control panel: entries create, play with the active entry, persist', async ({ page }) => {
  await createProject(page, 'Hairline');
  await saveAs(page, 'Presenter lower third');
  await page.getByTestId('open-home').click();
  await page.getByTestId('home-nav-controls').click();
  await page.locator('.pk-graphic', { hasText: 'Presenter lower third' }).locator('button', { hasText: 'Open control panel' }).click();
  await expect(page.getByTestId('graphic-control-page')).toBeVisible();

  // Three entries — the operator's rundown rows.
  await page.getByTestId('add-entry').click();
  await page.getByTestId('add-entry').click();
  await page.getByTestId('add-entry').click();
  await expect(page.locator('.control-entry')).toHaveCount(3);

  // Fill the active entry; its first field becomes the label; ▶ Play carries it to the graphic.
  await page.getByTestId('entry-field-f0').fill('Anna Andersson');
  await page.getByTestId('entry-field-f1').fill('Presenter');
  await expect(page.locator('.control-entry.active')).toContainText('Anna Andersson');
  await page.getByTestId('control-play').click();
  const frame = page.locator('.control-page-preview iframe');
  await expect(frame.contentFrame().locator('#f0')).toHaveText('Anna Andersson');
  await expect(frame.contentFrame().locator('#f1')).toHaveText('Presenter');

  // Switch to another entry and play the same graphic again with ITS data.
  await page.locator('.control-entry').nth(0).getByTestId('select-entry').click();
  await page.getByTestId('entry-field-f0').fill('Michael Smith');
  await page.getByTestId('play-entry').nth(0).click();
  await expect(frame.contentFrame().locator('#f0')).toHaveText('Michael Smith');

  // Entries persist on the saved graphic across a reload.
  await page.reload();
  await expect(page.getByTestId('graphic-control-page')).toBeVisible();
  await expect(page.locator('.control-entry')).toHaveCount(3);
  await expect(page.locator('.control-entry', { hasText: 'Anna Andersson' })).toBeVisible();

  // Back returns to Home's control panels section (history is real).
  await page.goBack();
  await expect(page.getByTestId('home-page')).toBeVisible();
});

test('a Home card shows the real graphic, parked at its settled on-air state', async ({ page }) => {
  await createProject(page, 'Hairline');
  await saveAs(page, 'Presenter lower third');

  await page.getByTestId('open-home').click();
  const row = page.locator('.pk-graphic', { hasText: 'Presenter lower third' });
  await expect(row.getByTestId('graphic-thumb')).toBeVisible();

  // The card is a LIVE render, not a stored picture — the template's own fields are inside it,
  // carrying the graphic's data. A stale or blank thumbnail fails right here.
  const thumb = row.locator('.gfx-thumb iframe').contentFrame();
  await expect(thumb.locator('#f0')).not.toBeEmpty();

  // And the entrance is parked at its END: an unsettled card would still be at opacity 0
  // (every house entrance reveals the CSS-hidden root as its first beat).
  await expect(async () => {
    const opacity = await thumb.locator('#f0').evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0.9);
  }).toPass();

  // It follows the graphic rather than a snapshot: renaming leaves the same live render in place.
  await row.getByTitle('Rename').click();
  await page.getByTestId('rename-input').fill('Anchor lower third');
  await page.getByTestId('rename-input').press('Enter');
  const renamed = page.locator('.pk-graphic', { hasText: 'Anchor lower third' });
  await expect(renamed.getByTestId('graphic-thumb')).toBeVisible();
  await expect(renamed.locator('.gfx-thumb iframe').contentFrame().locator('#f0')).not.toBeEmpty();
});

test('video and graphics stay separate but connected: #/video, back to graphics, never trapped', async ({ page }) => {
  await createProject(page, 'Hairline');
  await page.evaluate(() => {
    window.location.hash = '#/video';
  });
  await expect(page.getByTestId('video-shell')).toBeVisible();
  await expect(page.locator('.video-workspace-badge')).toContainText('Video');
  await page.getByTestId('back-to-graphics').click();
  await expect(page.locator('.tpl-name')).toHaveText('Hairline');
});
