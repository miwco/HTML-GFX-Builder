import { test, expect, type Page, type Route } from '@playwright/test';
import { createProject } from './_create';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';

// Phase 5: SHOWS — the rundown level. A show collects graphics that run together; its
// export packages every graphic plus ONE aggregated control page (a card per graphic,
// each driving its own BroadcastChannel independently).

async function addCurrentToShow(page: Page, showName: string, create = false): Promise<void> {
  await page.getByTestId('dock-tab-control').click();
  const section = page.locator('.panel-section', { hasText: 'Rundowns' });
  if (create) {
    await section.getByPlaceholder('New rundown name').fill(showName);
    await section.getByRole('button', { name: 'Create', exact: true }).click();
  } else {
    // A fresh document remounts the panel, so the show needs re-picking by name.
    const value = await section.locator('select option', { hasText: showName }).getAttribute('value');
    await section.locator('select').selectOption(value!);
  }
  await section.getByRole('button', { name: '+ Add current' }).click();
  await expect(section.locator('.status-ok')).toContainText('is in the rundown');
}

test('a show collects graphics in rundown order and exports one aggregated panel', async ({ page, context }) => {
  // Two graphics into one show, from two separate documents.
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await addCurrentToShow(page, 'Evening Show', true);

  await createProject(page, { name: 'Arena Quiz' });
  await addCurrentToShow(page, 'Evening Show');

  // The rundown lists both, in order.
  const section = page.locator('.panel-section', { hasText: 'Rundowns' });
  await expect(section.locator('.show-graphic-row')).toHaveCount(2);
  await expect(section.locator('.show-graphic-row').nth(0)).toContainText('1. Hairline');
  await expect(section.locator('.show-graphic-row').nth(1)).toContainText('2. Arena Quiz');

  // Export: one folder per graphic + the aggregated show panel.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    section.getByRole('button', { name: /Export rundown package/ }).click(),
  ]);
  const zip = await JSZip.loadAsync(readFileSync(await download.path()));
  const names = Object.keys(zip.files);
  expect(names).toContain('evening_show/hairline/index.html');
  expect(names).toContain('evening_show/arena_quiz/index.html');
  expect(names).toContain('evening_show/show_controlpanel.html');

  const panelHtml = await zip.file('evening_show/show_controlpanel.html')!.async('string');
  expect(panelHtml).toContain('spx-control-hairline'); // each card on its own channel
  expect(panelHtml).toContain('spx-control-arena_quiz');
  expect(panelHtml).toContain('Select answer'); // the quiz's machine buttons ride along

  // ── Round-trip: the ONE panel drives both graphics independently. ──
  const files = new Map<string, string>();
  for (const n of names) {
    if (!zip.files[n].dir) files.set(n.replace(/^evening_show\//, ''), await zip.file(n)!.async('string'));
  }
  const serve = (route: Route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\//, '');
    const body = files.get(path);
    if (body == null) return route.fulfill({ status: 404, body: 'nf' });
    const ct = path.endsWith('.css') ? 'text/css' : path.endsWith('.js') ? 'application/javascript' : 'text/html';
    return route.fulfill({ status: 200, contentType: ct, body });
  };

  const third = await context.newPage();
  await third.route('http://show-rt.local/**', serve);
  await third.goto('http://show-rt.local/hairline/index.html', { waitUntil: 'load' });

  const quiz = await context.newPage();
  await quiz.route('http://show-rt.local/**', serve);
  await quiz.goto('http://show-rt.local/arena_quiz/index.html', { waitUntil: 'load' });

  const panel = await context.newPage();
  await panel.route('http://show-rt.local/**', serve);
  await panel.goto('http://show-rt.local/show_controlpanel.html', { waitUntil: 'load' });

  await expect(panel.locator('.card')).toHaveCount(2);
  const thirdCard = panel.locator('.card', { hasText: 'Hairline' });
  const quizCard = panel.locator('.card', { hasText: 'Arena Quiz' });

  // Play the lower third from ITS card: it enters; the quiz stays at rest.
  await thirdCard.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => third.locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
  await expect
    .poll(async () =>
      quiz.evaluate(() => {
        const w = window as unknown as { noacgMachineState?: () => { groups: Record<string, string> } };
        return w.noacgMachineState?.().groups.main ?? null;
      }),
    )
    .toBe('off');

  // Drive the quiz from ITS card — the machine advances, the lower third is untouched.
  await quizCard.getByRole('button', { name: '▶ Play' }).click();
  await quizCard.getByRole('button', { name: '⚡ Select answer' }).click();
  await expect
    .poll(async () =>
      quiz.evaluate(() => {
        const w = window as unknown as { noacgMachineState?: () => { groups: Record<string, string> } };
        return w.noacgMachineState?.().groups.main ?? null;
      }),
    )
    .toBe('selected');
  await expect(quizCard.locator('.state-chip')).toContainText('selected');

  await panel.close();
  await quiz.close();
  await third.close();
});

test('offline: the hosted control route answers honestly and the Shows section grows no cloud UI', async ({ page }) => {
  // The e2e server pins offline mode (no Supabase env): the capability route must say so
  // rather than spin, and the Shows section must stay purely local (auth-posture rule).
  await page.goto('/app?control=some-slug');
  await expect(page.locator('.sendin-card')).toContainText('Hosted control needs the cloud backend');

  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await page.getByTestId('dock-tab-control').click();
  const section = page.locator('.panel-section', { hasText: 'Rundowns' });
  await expect(section).toBeVisible();
  await expect(section.getByText(/host.*online/i)).toHaveCount(0);
});

test('shows and videos ride the storage seam (the sync engine sees and writes both kinds)', async ({ page }) => {
  await page.goto('/app');
  await page.keyboard.press('Escape');
  const result = await page.evaluate(async () => {
    const { LocalStorageProvider } = await import('/src/backend/storage.ts');
    const { SYNC_KINDS } = await import('/src/backend/sync.ts');
    const { createShow, loadShows } = await import('/src/model/shows.ts');
    const provider = new LocalStorageProvider();

    createShow('Sync Me');
    const shows = await provider.list('show');

    // A pulled video record (another device's save) lands through put(), tombstone and all.
    const videoBody = {
      id: '7f9b2f6a-1111-4222-8333-444455556666',
      name: 'Pulled clip',
      updatedAt: '2026-07-21T00:00:00.000Z',
      project: { kind: 'video', id: '7f9b2f6a-1111-4222-8333-444455556666', name: 'Pulled clip', tsx: 'export default 1' },
    };
    await provider.put({ kind: 'video', id: videoBody.id, updatedAt: videoBody.updatedAt, body: videoBody });
    const videos = await provider.list('video');

    return {
      kinds: SYNC_KINDS,
      showListed: shows.some((r) => (r.body as { name: string }).name === 'Sync Me'),
      showLive: loadShows().some((s) => s.name === 'Sync Me'),
      videoListed: videos.some((r) => r.id === videoBody.id),
    };
  });
  // 'graphic' joined the list with the graphics library (docs/SAVED_CONTENT_MODEL.md).
  expect(result.kinds).toEqual(['packet', 'look', 'brand', 'project', 'show', 'video', 'graphic']);
  expect(result.showListed).toBe(true);
  expect(result.showLive).toBe(true);
  expect(result.videoListed).toBe(true);
});

test('a published show bakes the hosted receiver into its export; unpublished or offline stays clean', async ({ page }) => {
  await page.goto('/app');
  await page.keyboard.press('Escape');
  const result = await page.evaluate(async () => {
    const { variantsFor } = await import('/src/templates/catalog.ts');
    const { buildShowZip } = await import('/src/export/showExport.ts');
    const template = variantsFor('lower-third')[0].create({});
    const graphic = { id: 'g-1', name: template.name, type: template.type, savedAt: '2026-01-01T00:00:00.000Z', template };
    const base = { id: 'a0a0a0a0-b1b1-4c2c-8d3d-e4e4e4e4e4e4', name: 'Baked Show', graphics: [graphic], updatedAt: '2026-01-01T00:00:00.000Z' };
    const backend = { ref: 'testref', key: 'sb_publishable_testkey' };

    const jsOf = async (zip: Awaited<ReturnType<typeof buildShowZip>>) => {
      const path = Object.keys(zip.files).find((n) => n.endsWith('js/template.js'))!;
      return zip.file(path)!.async('string');
    };

    // Published + backend coordinates: the receiver block is baked, config and all.
    const published = await jsOf(await buildShowZip({ ...base, hostedSlug: 'slug-under-test' }, { hostedBackend: backend }));
    // Unpublished: no block, even with a backend.
    const unpublished = await jsOf(await buildShowZip(base, { hostedBackend: backend }));
    // Published but OFFLINE (the default resolver, and this suite builds with no backend env):
    // the export stays 100% offline rather than baking a half-configured receiver.
    const offline = await jsOf(await buildShowZip({ ...base, hostedSlug: 'slug-under-test' }));

    return {
      publishedHasBlock: published.includes('== HOSTED CONTROL'),
      publishedConfig: ['"slug-under-test"', JSON.stringify(template.name), '"testref"', '"sb_publishable_testkey"']
        .every((s) => published.includes(s)),
      // The export baked the block; the show's SAVED snapshot must stay clean.
      snapshotClean: !graphic.template.js.includes('== HOSTED CONTROL'),
      unpublishedClean: !unpublished.includes('== HOSTED CONTROL'),
      offlineClean: !offline.includes('== HOSTED CONTROL'),
    };
  });
  expect(result.publishedHasBlock).toBe(true);
  expect(result.publishedConfig).toBe(true);
  expect(result.snapshotClean).toBe(true);
  expect(result.unpublishedClean).toBe(true);
  expect(result.offlineClean).toBe(true);
});

test("a show export bakes each graphic's saved library entries into both panels", async ({ page }) => {
  // Entries live on the library GraphicDoc, not on the show's embedded copy — the export must
  // resolve them out of the library (by graphicId, unique-name fallback) so the aggregated
  // show panel AND each graphic's own controlpanel.html carry the switcher.
  await page.goto('/app');
  await page.keyboard.press('Escape');
  const panels = await page.evaluate(async () => {
    const { variantsFor } = await import('/src/templates/catalog.ts');
    const { createGraphic, newEntry } = await import('/src/model/library.ts');
    const { buildShowZip } = await import('/src/export/showExport.ts');

    // A saved library graphic with two named entries.
    const template = variantsFor('lower-third')[0].create({});
    const firstField = template.fields[0]?.field ?? 'f0';
    const { doc } = createGraphic(template, {
      name: 'Presenter LT',
      entries: [
        newEntry('Anna · Presenter', { [firstField]: 'Anna Andersson' }),
        newEntry('Björn · Reporter', { [firstField]: 'Björn Berg' }),
      ],
    });

    // A show whose embedded copy links back to that record by graphicId (addGraphicToShow).
    const graphic = {
      id: 'g-entries', name: doc!.template.name, type: doc!.template.type,
      savedAt: '2026-01-01T00:00:00.000Z', template: doc!.template, graphicId: doc!.id,
    };
    const show = {
      id: 'b1b1b1b1-c2c2-4d3d-8e4e-f5f5f5f5f5f5', name: 'Entries Show',
      graphics: [graphic], updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const zip = await buildShowZip(show);
    const at = (suffix: string) => {
      const path = Object.keys(zip.files).find((n) => n.endsWith(suffix))!;
      return zip.file(path)!.async('string');
    };
    return { aggregated: await at('show_controlpanel.html'), perGraphic: await at('presenter_lt/controlpanel.html') };
  });

  for (const html of [panels.aggregated, panels.perGraphic]) {
    expect(html).toContain('Anna · Presenter');
    expect(html).toContain('Björn · Reporter');
    expect(html).toContain('Anna Andersson');
    expect(html).toContain('Björn Berg');
  }
});

test('the rundown reorders and removes; deleting the show keeps nothing behind', async ({ page }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await addCurrentToShow(page, 'Reorder Show', true);
  await createProject(page, { name: 'Arena Quiz' });
  await addCurrentToShow(page, 'Reorder Show');

  const section = page.locator('.panel-section', { hasText: 'Rundowns' });
  await section.locator('.show-graphic-row').nth(1).getByRole('button', { name: '↑' }).click();
  await expect(section.locator('.show-graphic-row').nth(0)).toContainText('1. Arena Quiz');

  await section.locator('.show-graphic-row').nth(0).getByRole('button', { name: '✕' }).click();
  await expect(section.locator('.show-graphic-row')).toHaveCount(1);

  await section.getByRole('button', { name: 'Delete rundown' }).click();
  await expect(section.locator('.show-graphic-row')).toHaveCount(0);
  const stored = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('spx-gfx-shows') ?? '[]') as { deleted?: boolean; graphics: unknown[] }[];
    return { live: list.filter((s) => !s.deleted).length, payloads: list.map((s) => s.graphics.length) };
  });
  expect(stored.live).toBe(0); // tombstoned, payload stripped
  expect(stored.payloads).toEqual([0]);
});

test('a rundown export ships the LIVE graphic, not the snapshot from when it was added', async ({ page }) => {
  // Save the graphic to the library so the rundown copy carries a graphicId, then add it.
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await page.getByTestId('save-graphic').click();
  await page.getByTestId('save-name').fill('Anchor L3');
  await page.getByTestId('save-confirm').click();
  await expect(page.getByTestId('save-dialog')).toBeHidden();
  await addCurrentToShow(page, 'Live Rundown', true);

  // Edit the LIBRARY graphic after it is in the rundown — a distinctive marker in the CSS.
  await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const s = useTemplateStore.getState();
    s.applyTemplate({ ...s.template, css: s.template.css + '\n/* EDITED-AFTER-ADD */\n' });
    // Re-save so the library record (not just the working doc) carries the edit.
    const { saveCurrentGraphic } = await import('/src/store/saveActions.ts');
    saveCurrentGraphic();
  });

  const section = page.locator('.panel-section', { hasText: 'Rundowns' });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    section.getByRole('button', { name: /Export rundown package/ }).click(),
  ]);
  const zip = await JSZip.loadAsync(readFileSync(await download.path()));
  const css = await zip.file('live_rundown/anchor_l3/css/template.css')!.async('string');
  // The export carries the edit made AFTER the graphic was added — the live library template,
  // not the snapshot embedded at add time.
  expect(css).toContain('EDITED-AFTER-ADD');
});

test('Home lists rundowns and exports one; the package tab no longer calls itself a show', async ({ page }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await addCurrentToShow(page, 'Home Rundown', true);

  await page.getByTestId('open-home').click();
  await page.getByTestId('home-nav-rundowns').click();
  const row = page.locator('[data-testid^="rundown-row-"]');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Home Rundown');
  await expect(row).toContainText('1 graphic');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    row.getByTestId('export-rundown').click(),
  ]);
  expect(await download.suggestedFilename()).toMatch(/rundown\.zip$/);

  // The word clash the review found: the Packages tab must not describe a package as a "show".
  await page.getByTestId('home-nav-packages').click();
  await expect(page.locator('.home-body')).not.toContainText(/A package is a show/i);
});
