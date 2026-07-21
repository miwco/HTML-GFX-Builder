import { test, expect, type Page, type Route } from '@playwright/test';
import { createProject } from './_create';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';

// Phase 5: SHOWS — the rundown level. A show collects graphics that run together; its
// export packages every graphic plus ONE aggregated control page (a card per graphic,
// each driving its own BroadcastChannel independently).

async function addCurrentToShow(page: Page, showName: string, create = false): Promise<void> {
  await page.getByTestId('dock-tab-control').click();
  const section = page.locator('.panel-section', { hasText: 'Shows' });
  if (create) {
    await section.getByPlaceholder('New show name').fill(showName);
    await section.getByRole('button', { name: 'Create', exact: true }).click();
  } else {
    // A fresh document remounts the panel, so the show needs re-picking by name.
    const value = await section.locator('select option', { hasText: showName }).getAttribute('value');
    await section.locator('select').selectOption(value!);
  }
  await section.getByRole('button', { name: '+ Add current' }).click();
  await expect(section.locator('.status-ok')).toContainText('is in the show');
}

test('a show collects graphics in rundown order and exports one aggregated panel', async ({ page, context }) => {
  // Two graphics into one show, from two separate documents.
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await addCurrentToShow(page, 'Evening Show', true);

  await createProject(page, { name: 'Arena Quiz' });
  await addCurrentToShow(page, 'Evening Show');

  // The rundown lists both, in order.
  const section = page.locator('.panel-section', { hasText: 'Shows' });
  await expect(section.locator('.show-graphic-row')).toHaveCount(2);
  await expect(section.locator('.show-graphic-row').nth(0)).toContainText('1. Hairline');
  await expect(section.locator('.show-graphic-row').nth(1)).toContainText('2. Arena Quiz');

  // Export: one folder per graphic + the aggregated show panel.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    section.getByRole('button', { name: /Export show package/ }).click(),
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
  const section = page.locator('.panel-section', { hasText: 'Shows' });
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
  expect(result.kinds).toEqual(['packet', 'look', 'brand', 'project', 'show', 'video']);
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

test('the rundown reorders and removes; deleting the show keeps nothing behind', async ({ page }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await addCurrentToShow(page, 'Reorder Show', true);
  await createProject(page, { name: 'Arena Quiz' });
  await addCurrentToShow(page, 'Reorder Show');

  const section = page.locator('.panel-section', { hasText: 'Shows' });
  await section.locator('.show-graphic-row').nth(1).getByRole('button', { name: '↑' }).click();
  await expect(section.locator('.show-graphic-row').nth(0)).toContainText('1. Arena Quiz');

  await section.locator('.show-graphic-row').nth(0).getByRole('button', { name: '✕' }).click();
  await expect(section.locator('.show-graphic-row')).toHaveCount(1);

  await section.getByRole('button', { name: 'Delete show' }).click();
  await expect(section.locator('.show-graphic-row')).toHaveCount(0);
  const stored = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('spx-gfx-shows') ?? '[]') as { deleted?: boolean; graphics: unknown[] }[];
    return { live: list.filter((s) => !s.deleted).length, payloads: list.map((s) => s.graphics.length) };
  });
  expect(stored.live).toBe(0); // tombstoned, payload stripped
  expect(stored.payloads).toEqual([0]);
});
