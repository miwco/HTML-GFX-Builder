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

  // A reload keeps the link (the slot carries graphicId + dirty) and lands straight back
  // in the saved graphic — no startup wizard over a returning user's work.
  await page.reload();
  await expect(page.locator('.wz-modal')).toBeHidden();
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

test('a first-ever visit is offered creation, not a door to an empty Home', async ({ page }) => {
  // Nothing saved anywhere (a fresh context): "Continue working" would be the loudest card on
  // the screen and would lead to an empty Home, so it stays away until there IS work.
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await expect(page.getByTestId('wz-continue')).toHaveCount(0);
  await expect(page.locator('[data-entry="template"]')).toBeVisible();
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

test('the control panel reports the state and greys an event the machine would drop', async ({ page }) => {
  // Parity with the editor's Rehearse panel, the event strip and the hosted page: all three
  // poll the runtime's pointers and grey an illegal event. This surface shipped with neither,
  // so a live operator had no on-air indication and every button looked pressable.
  await createProject(page, { category: 'quiz' });
  await saveAs(page, 'Quiz board');
  await page.getByTestId('open-home').click();
  await page.getByTestId('home-nav-controls').click();
  await page.locator('.pk-graphic', { hasText: 'Quiz board' }).locator('button', { hasText: 'Open control panel' }).click();
  await expect(page.getByTestId('graphic-control-page')).toBeVisible();

  // The chip names where the preview is, and it is what the greying is judged against.
  await expect(page.getByTestId('control-state')).toContainText('enter');
  await expect(page.getByTestId('control-event-lock')).toBeDisabled(); // no arrow out of Enter
  await expect(page.getByTestId('control-event-select')).toBeEnabled();

  await page.getByTestId('control-event-select').click();
  await expect(page.getByTestId('control-state')).toContainText('selected');
  await expect(page.getByTestId('control-event-lock')).toBeEnabled(); // legal from Selected
  await expect(page.getByTestId('control-event-judge')).toBeDisabled();

  // An entry's ✕ is ARMED, like Home's graphic delete — one stray click cost the whole row.
  await page.getByTestId('add-entry').click();
  await expect(page.locator('.control-entry')).toHaveCount(1);
  await page.getByTestId('delete-entry').click();
  await expect(page.getByTestId('delete-entry')).toHaveText('Delete?');
  await expect(page.locator('.control-entry')).toHaveCount(1); // still there
  await page.getByTestId('delete-entry').click();
  await expect(page.locator('.control-entry')).toHaveCount(0);
});

test('the control panel shows the graphic at rest before any take, and says how to get Home', async ({ page }) => {
  await createProject(page, 'Hairline');
  await saveAs(page, 'Settled at rest');
  await page.getByTestId('open-home').click();
  await page.getByTestId('home-nav-controls').click();
  await page.locator('.pk-graphic', { hasText: 'Settled at rest' }).locator('button', { hasText: 'Open control panel' }).click();
  await expect(page.getByTestId('graphic-control-page')).toBeVisible();

  // A graphic is hidden until play(), so an unsettled preview is an empty black rectangle.
  // The panel settles it on load: the operator sees what they are about to air, no take needed.
  const frame = page.locator('.control-page-preview iframe');
  await expect(frame.contentFrame().locator('#f0')).toBeVisible();
  await expect
    .poll(async () => frame.contentFrame().locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');

  // The graphic is FITTED to the stage, not stretched: a 1920×1080 template rendered into a
  // ~1060px panel would show a lower third at nearly twice its real share of frame, and an
  // operator preview that lies about composition is worse than none.
  const fit = await page.evaluate(() => {
    const f = document.querySelector('.control-page-preview iframe') as HTMLIFrameElement;
    const stage = document.querySelector('.control-page-stage')!.getBoundingClientRect();
    const box = f.getBoundingClientRect();
    // offsetWidth is the UNTRANSFORMED layout width; getBoundingClientRect is after scale.
    return { fw: f.offsetWidth, boxW: box.width, stageW: stage.width, stageH: stage.height, boxH: box.height };
  });
  expect(fit.fw).toBe(1920); // the iframe carries the template's OWN resolution…
  expect(fit.boxW).toBeLessThanOrEqual(fit.stageW + 1); // …and is scaled to fit the stage
  expect(fit.boxH).toBeLessThanOrEqual(fit.stageH + 1);

  // The frame edge is drawn on the scaled frame: over black, an operator judging headroom
  // against a void cannot tell safe area from off-screen.
  const edge = await page.evaluate(() => {
    const r = document.querySelector('.control-page-frame')!.getBoundingClientRect();
    const f = document.querySelector('.control-page-preview iframe')!.getBoundingClientRect();
    return { dw: Math.abs(r.width - f.width), dh: Math.abs(r.height - f.height) };
  });
  expect(edge.dw).toBeLessThanOrEqual(2);
  expect(edge.dh).toBeLessThanOrEqual(2);

  // The cue row is an operator target, not a rehearsal control: comfortable hit areas, and
  // "Next" reads as a word rather than a bare chevron. Size alone is not enough - a scaled
  // preview once pushed this row clean off the bottom of the window while every button still
  // measured 44px, so assert the operator can actually SEE it.
  const view = page.viewportSize()!;
  for (const id of ['control-play', 'control-update', 'control-next', 'control-stop']) {
    const box = (await page.getByTestId(id).boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.y + box.height).toBeLessThanOrEqual(view.height);
  }
  await expect(page.getByTestId('control-next')).toContainText('Next');

  // A leaf surface needs a labelled way back — the wordmark alone was the only route.
  await page.getByTestId('control-home').click();
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

test('phone width: every row action is reachable, the text stays two lines, the nav scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createProject(page, 'Hairline');
  await saveAs(page, 'Presenter lower third with a very long broadcast name');
  await page.getByTestId('open-home').click();
  await page.getByTestId('home-nav-graphics').click();

  const row = page.locator('.pk-graphic').first();
  await expect(row).toBeVisible();

  // Every action button sits inside the viewport with a touch-sized box — the review found
  // Move and Delete rendered past the 390px edge with no way to scroll to them.
  const buttons = row.locator('.pk-actions button');
  const count = await buttons.count();
  expect(count).toBeGreaterThanOrEqual(6);
  for (let i = 0; i < count; i++) {
    const box = await buttons.nth(i).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    expect(box!.height).toBeGreaterThanOrEqual(36);
  }

  // Name and metadata are single ellipsized lines with the action strip below them,
  // not a seven-line stack sharing one row.
  const nameBox = (await row.locator('.pk-info strong').boundingBox())!;
  const metaBox = (await row.locator('.pk-info .muted').boundingBox())!;
  const openBox = (await row.getByTestId('open-graphic').boundingBox())!;
  expect(nameBox.height).toBeLessThanOrEqual(24);
  expect(metaBox.height).toBeLessThanOrEqual(24);
  expect(openBox.y).toBeGreaterThanOrEqual(nameBox.y + nameBox.height - 1);

  // No page-level horizontal overflow.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  // The section nav is one horizontally scrollable chip row, not a ragged half-screen grid.
  const nav = page.locator('.home-nav');
  expect((await nav.boundingBox())!.height).toBeLessThanOrEqual(80);
  expect(await nav.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
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

test('the save dialog is sized by its content, not by the wizard it borrows styling from', async ({ page }) => {
  // It wears `.wz-modal`, which is sized for the wizard's full-height multi-step surface —
  // so a name field and two buttons used to sit in a 900px-tall box of empty panel.
  await createProject(page, 'Hairline');
  await page.getByTestId('save-graphic').click();
  await expect(page.getByTestId('save-dialog')).toBeVisible();
  const box = (await page.getByTestId('save-dialog').boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.height).toBeLessThan(420);
  expect(box.height).toBeLessThan(viewport.height * 0.6);
});
