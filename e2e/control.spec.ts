import { test, expect, type Page, type Route } from '@playwright/test';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';

// Era 4: control panels. The modular engine turns a graphic's SPX fields into an operator
// panel — text → input, number → stepper, textarea → line editor, image → picker — with no
// per-template code. (Scoreboard scores are textfields by design, so operators can type
// "0 - 0"; a genuine number field, added below, gets the stepper.)

async function createScoreboard(page: Page) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Scoreboards' }).click();
  await page.locator('.wz-variant', { hasText: 'Match Strip' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650); // debounced preview build
}

test('control tab live-drives the preview from a field control', async ({ page }) => {
  await createScoreboard(page);
  await page.locator('.panel-tabs .tab', { hasText: 'Control' }).click();

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
  await page.locator('.panel-tabs .tab', { hasText: 'Data' }).click();
  await page.getByPlaceholder(/Label the operator sees/).fill('Points');
  await page.locator('.panel-body select').selectOption('number');
  await page.getByRole('button', { name: '+ Add' }).click();

  await page.locator('.panel-tabs .tab', { hasText: 'Control' }).click();
  const row = page.locator('.field-row', { hasText: 'Points' });
  await expect(row.locator('.ctl-step')).toHaveCount(2); // − and +
  await row.getByRole('button', { name: '+', exact: true }).click();
  await expect(row.locator('.ctl-num').first()).toHaveValue('1');
});

test('export bundles controlpanel.html + injects the receiver into index.html', async ({ page }) => {
  await createScoreboard(page);
  await page.locator('.panel-tabs .tab', { hasText: 'Export' }).click();
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
  expect(panel).toContain('"field":"f0"'); // controls are field-derived
});

async function createHairline(page: Page) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);
}

test('live data: adding a Google Sheet appends an editable polling block, remove strips it', async ({ page }) => {
  await createHairline(page);
  await page.locator('.panel-tabs .tab', { hasText: 'Control' }).click();
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
  await page.locator('.panel-tabs .tab', { hasText: 'Control' }).click();
  await page.getByPlaceholder(/pub\?output=csv/).fill('http://sheet-test.local/data.csv');
  await page.locator('.panel-section', { hasText: 'Live data' }).locator('input[type="number"]').fill('1');
  await page.getByRole('button', { name: 'Add live data' }).click();

  // The polling block runs inside the preview and pulls the sheet into the fields.
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('#f0')).toHaveText('Live Ada', { timeout: 6000 });
  await expect(frame.locator('#f1')).toHaveText('From The Sheet');
});

test('round-trip: the exported control panel drives the exported graphic over the channel', async ({ page, context }) => {
  await createScoreboard(page);
  await page.locator('.panel-tabs .tab', { hasText: 'Export' }).click();
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
