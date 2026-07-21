import { test, expect, type Page, type Route } from '@playwright/test';
import { createProject } from './_create';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';

// Era 4: control panels. The modular engine turns a graphic's SPX fields into an operator
// panel — text → input, number → stepper, textarea → line list, image → picker — with no
// per-template code. (Scoreboard scores are textfields by design, so operators can type
// "0 - 0"; a genuine number field, added below, gets the stepper.)

async function createScoreboard(page: Page) {
  await createProject(page, { category: 'Scoreboards', name: 'Match Strip' });
}

test('control tab live-drives the preview from a field control', async ({ page }) => {
  await createScoreboard(page);
  await page.getByTestId('dock-tab-control').click();

  // Score A (f1) is a bound text field; editing it drives the preview live (Live is on).
  await page.locator('.field-row', { hasText: 'Score A' }).locator('input').first().fill('7');
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('#f1')).toHaveText('7');

  // The control panel's own Play button plays the graphic out.
  await page.locator('.panel-body').getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame.locator('.scoreboard').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
});

test('a number field becomes a +/- stepper (no per-template code)', async ({ page }) => {
  await createScoreboard(page);
  // Add a genuine number field through the Data panel.
  await page.getByTestId('dock-tab-data').click();
  await page.getByPlaceholder(/Label the operator sees/).fill('Points');
  await page.locator('.panel-body select').selectOption('number');
  await page.getByRole('button', { name: '+ Add' }).click();

  await page.getByTestId('dock-tab-control').click();
  const row = page.locator('.field-row', { hasText: 'Points' });
  await expect(row.locator('.ctl-step')).toHaveCount(2); // − and +
  await row.getByRole('button', { name: '+', exact: true }).click();
  await expect(row.locator('.ctl-num').first()).toHaveValue('1');
});

test('export bundles controlpanel.html + injects the receiver into index.html', async ({ page }) => {
  await createScoreboard(page);
  await page.getByTestId('dock-tab-export').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Validate & download/ }).click(),
  ]);
  const zip = await JSZip.loadAsync(readFileSync(await download.path()));
  const names = Object.keys(zip.files);
  expect(names).toContain('match_strip/controlpanel.html');
  expect(names).toContain('match_strip/index.html');

  const index = await zip.file('match_strip/index.html')!.async('string');
  expect(index).toContain('spx-control-receiver');
  expect(index).toContain('new BroadcastChannel');

  const panel = await zip.file('match_strip/controlpanel.html')!.async('string');
  expect(panel).toContain('spx-control-match_strip'); // channel name matches the receiver's
  expect(panel).toContain('"key":"f0"'); // controls are field-derived
});

async function createHairline(page: Page) {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
}

test('live data: adding a Google Sheet appends an editable polling block, remove strips it', async ({ page }) => {
  await createHairline(page);
  await page.getByTestId('dock-tab-control').click();
  await page.getByPlaceholder(/pub\?output=csv/).fill('https://docs.google.com/x/pub?output=csv');
  await page.getByRole('button', { name: 'Add live data' }).click();

  const js1 = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });
  expect(js1).toContain('== LIVE DATA');
  expect(js1).toContain('https://docs.google.com/x/pub?output=csv');
  expect(js1).toContain('"f0": "Name"');   // field → header map, seeded from field titles
  await expect(page.locator('.panel-body .status-ok')).toContainText('Live-data block is in the JS');

  await page.getByRole('button', { name: 'Remove' }).click();
  const js2 = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });
  expect(js2).not.toContain('== LIVE DATA');
});

test('live data: a published CSV drives the graphic (mocked sheet)', async ({ page }) => {
  await page.route('http://sheet-test.local/data.csv', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/csv',
      headers: { 'access-control-allow-origin': '*' },
      body: 'Name,Title\nLive Ada,From The Sheet\n',
    }),
  );
  await createHairline(page);
  await page.getByTestId('dock-tab-control').click();
  await page.getByPlaceholder(/pub\?output=csv/).fill('http://sheet-test.local/data.csv');
  await page.locator('.panel-section', { hasText: 'Live data' }).locator('input[type="number"]').fill('1');
  await page.getByRole('button', { name: 'Add live data' }).click();

  // The polling block runs inside the preview and pulls the sheet into the fields.
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('#f0')).toHaveText('Live Ada', { timeout: 6000 });
  await expect(frame.locator('#f1')).toHaveText('From The Sheet');
});

// ── Phase 5: the state machine's side of the panel ──────────────────────────
// A template with an explicit machine grows event buttons GENERATED from it — labels and
// sections from the machine's own `controls` metadata, legality from the graph.

test('the Control tab renders labeled event buttons from the machine and fires them', async ({ page }) => {
  await createProject(page, { name: 'Arena Quiz' });
  await page.getByTestId('dock-tab-control').click();

  // The quiz type's declared controls, by section, wearing their labels.
  const section = page.locator('.ctl-event-section', { hasText: 'Answer' });
  await expect(section.getByRole('button', { name: '⚡ Select answer' })).toBeVisible();
  await expect(section.getByRole('button', { name: '⚡ Lock it in' })).toBeVisible();
  await expect(section.getByRole('button', { name: '⚡ Reveal correct' })).toBeVisible();

  // Play, then Select — the event rides the store into the preview's machine.
  await page.locator('.ctl-actions').getByRole('button', { name: '▶ Play' }).click();
  await section.getByRole('button', { name: '⚡ Select answer' }).click();
  await expect
    .poll(async () =>
      page.frameLocator('iframe.preview-frame').locator('body').evaluate(() => {
        const w = window as unknown as { noacgMachineState?: () => { groups: Record<string, string> } };
        return w.noacgMachineState?.().groups.main ?? null;
      }),
    )
    .toBe('selected');
});

test('round-trip: the exported panel fires machine events, greys illegal ones, and shows the state', async ({ page, context }) => {
  await createProject(page, { name: 'Arena Quiz' });
  await page.getByTestId('dock-tab-export').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Validate & download/ }).click(),
  ]);
  const zip = await JSZip.loadAsync(readFileSync(await download.path()));
  const files = new Map<string, string>();
  for (const n of Object.keys(zip.files)) {
    if (!zip.files[n].dir) files.set(n.replace(/^arena_quiz\//, ''), await zip.file(n)!.async('string'));
  }
  const serve = (route: Route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\//, '') || 'index.html';
    const body = files.get(path);
    if (body == null) return route.fulfill({ status: 404, body: 'nf' });
    const ct = path.endsWith('.css') ? 'text/css' : path.endsWith('.js') ? 'application/javascript' : 'text/html';
    return route.fulfill({ status: 200, contentType: ct, body });
  };

  const graphic = await context.newPage();
  await graphic.route('http://cp-machine.local/**', serve);
  await graphic.goto('http://cp-machine.local/index.html', { waitUntil: 'load' });

  const panel = await context.newPage();
  await panel.route('http://cp-machine.local/**', serve);
  await panel.goto('http://cp-machine.local/controlpanel.html', { waitUntil: 'load' });

  const select = panel.getByRole('button', { name: '⚡ Select answer' });
  const lock = panel.getByRole('button', { name: '⚡ Lock it in' });

  // The hello answer arrives with the resting state: everything machine-side is illegal.
  await expect(panel.locator('#state-chip')).toBeVisible();
  await expect(select).toBeDisabled();
  await expect(lock).toBeDisabled();

  // Play → the walk enters the question waypoint; select becomes legal, lock stays out
  // (its only arrow leaves `selected`) — the structural guard, mirrored as greying.
  await panel.getByRole('button', { name: '▶ Play' }).click();
  await expect(select).toBeEnabled();
  await expect(lock).toBeDisabled();

  // Stage an answer with Live OFF, then Select: the value must land ONLY as the event's
  // payload (the atomic multi-part change), never as a live update.
  await panel.locator('#live').uncheck();
  await panel.locator('.field', { hasText: 'Selected answer' }).locator('select').selectOption('C');
  await expect(graphic.locator('#f6')).not.toHaveText('C');
  await select.click();
  await expect(graphic.locator('#f6')).toHaveText('C');
  await expect(lock).toBeEnabled();
  await expect(panel.locator('#state-chip')).toContainText('selected');

  await panel.close();
  await graphic.close();
});

test('round-trip: the exported control panel drives the exported graphic over the channel', async ({ page, context }) => {
  await createScoreboard(page);
  await page.getByTestId('dock-tab-export').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Validate & download/ }).click(),
  ]);
  const zip = await JSZip.loadAsync(readFileSync(await download.path()));
  const files = new Map<string, string>();
  for (const n of Object.keys(zip.files)) {
    if (!zip.files[n].dir) files.set(n.replace(/^match_strip\//, ''), await zip.file(n)!.async('string'));
  }

  // Serve both files from ONE origin so they share the BroadcastChannel (same-origin).
  const serve = (route: Route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\//, '') || 'index.html';
    const body = files.get(path);
    if (body == null) return route.fulfill({ status: 404, body: 'nf' });
    const ct = path.endsWith('.css') ? 'text/css' : path.endsWith('.js') ? 'application/javascript' : 'text/html';
    return route.fulfill({ status: 200, contentType: ct, body });
  };

  const graphic = await context.newPage();
  await graphic.route('http://cp-rt.local/**', serve);
  await graphic.goto('http://cp-rt.local/index.html', { waitUntil: 'load' });

  const panel = await context.newPage();
  await panel.route('http://cp-rt.local/**', serve);
  await panel.goto('http://cp-rt.local/controlpanel.html', { waitUntil: 'load' });

  // Drive from the control panel: type a score (Live is on → posts immediately), then Play.
  await panel.locator('.field', { hasText: 'Score A' }).locator('input[type="text"]').fill('7');
  await panel.getByRole('button', { name: '▶ Play' }).click();

  // The graphic reacted over the channel.
  await expect(graphic.locator('#f1')).toHaveText('7');
  await expect
    .poll(async () => graphic.locator('.scoreboard').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');

  await panel.close();
  await graphic.close();
});
