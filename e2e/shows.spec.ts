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
