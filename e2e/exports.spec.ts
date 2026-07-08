import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';

// The CasparCG and OGraf export targets — not just zip-structure checks: the CasparCG
// file is loaded and driven with an XML payload, and the OGraf Graphic is imported and
// taken through its load/updateAction/playAction contract.

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

async function downloadTarget(page: Page, label: string): Promise<JSZip> {
  await page.locator('.panel-tabs .tab', { hasText: 'Export' }).click();
  await page.locator('.issue', { hasText: label }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Validate & download/ }).click(),
  ]);
  return JSZip.loadAsync(readFileSync(await download.path()));
}

test('export panel offers all six targets', async ({ page }) => {
  await createHairline(page);
  await page.locator('.panel-tabs .tab', { hasText: 'Export' }).click();
  for (const label of ['Starter SPX export', 'Advanced / Pack export', 'HTML overlay (OBS / vMix)', 'H2R Graphics export', 'CasparCG export', 'OGraf (EBU) export']) {
    await expect(page.locator('.issue', { hasText: label })).toBeVisible();
  }
});

test('h2r: GDD fields embedded, and the play() toggle drives entrance then exit', async ({ page }) => {
  await createHairline(page);
  const zip = await downloadTarget(page, 'H2R Graphics export');
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  expect(names.sort()).toEqual(['hairline/README.md', 'hairline/hairline.html']);

  const html = await zip.file('hairline/hairline.html')!.async('string');
  // The GDD block H2R parses into editable inputs — property keys match the element ids.
  // The script tag MUST carry name="graphics-data-definition": without it H2R never finds
  // the block and shows no editable fields (the bug the real-app test surfaced).
  const gddMatch = html.match(/<script name="graphics-data-definition" type="application\/json\+gdd">\s*([\s\S]*?)\s*<\/script>/);
  expect(gddMatch).toBeTruthy();
  const gdd = JSON.parse(gddMatch![1]);
  expect(gdd.properties.f0.label).toBe('Name');
  expect(gdd.properties.f1.label).toBe('Title');
  expect(gdd.properties.f0.gddType).toBe('single-line');
  expect(html).not.toMatch(/src=["'](?:\.\/)?js\//); // nothing external left

  // Drive it exactly like H2R: update(json string), then play() on air, play() again off air.
  const view = await page.context().newPage();
  await view.setContent(html, { waitUntil: 'load' });
  await view.evaluate(() => {
    (window as unknown as { update(raw: string): void }).update('{"f0":"H2R Works"}');
    (window as unknown as { play(): void }).play(); // toggle ON — entrance
  });
  await expect(view.locator('#f0')).toHaveText('H2R Works');
  await expect
    .poll(async () => view.locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
  await view.evaluate(() => (window as unknown as { play(): void }).play()); // toggle OFF — exit
  await expect
    .poll(async () => view.locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('0');
  await view.close();
});

test('export target choice is remembered as the default across reloads', async ({ page }) => {
  await createHairline(page);
  await page.locator('.panel-tabs .tab', { hasText: 'Export' }).click();
  await page.locator('.issue', { hasText: 'CasparCG export' }).click();
  // Fresh load: the wizard opens; behind it the Export tab must preselect the remembered target.
  await page.reload();
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.panel-tabs .tab', { hasText: 'Export' }).click();
  await expect(page.locator('.issue', { hasText: 'CasparCG export' }).locator('input[type="radio"]')).toBeChecked();
});

test('html overlay: self-contained, autoplays with the Data panel values, control panel bundled', async ({ page }) => {
  await createHairline(page);
  // Type a custom value in the Data panel — the export must bake it in.
  await page.locator('.panel-tabs .tab', { hasText: 'Data' }).click();
  const nameInput = page.locator('.panel-body input').first();
  await nameInput.fill('Overlay Works');
  const zip = await downloadTarget(page, 'HTML overlay (OBS / vMix)');
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  expect(names.sort()).toEqual(['hairline/README.md', 'hairline/controlpanel.html', 'hairline/hairline.html']);

  const html = await zip.file('hairline/hairline.html')!.async('string');
  expect(html).toContain('Autoplay for browser sources');
  expect(html).toContain('spx-control-receiver'); // the BroadcastChannel receiver is inlined
  expect(html).not.toMatch(/src=["'](?:\.\/)?js\//); // nothing external left

  // Load the exported file like OBS would: no calls from outside — it must play itself.
  const view = await page.context().newPage();
  await view.setContent(html, { waitUntil: 'load' });
  await expect(view.locator('#f0')).toHaveText('Overlay Works'); // baked value, not the default
  await expect
    .poll(async () => view.locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1'); // play() ran on load
  await view.close();
});

test('casparcg: one self-contained html that speaks JSON and CasparCG XML', async ({ page }) => {
  await createHairline(page);
  const zip = await downloadTarget(page, 'CasparCG export');
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  expect(names.sort()).toEqual(['hairline/README.md', 'hairline/hairline.html']);

  const html = await zip.file('hairline/hairline.html')!.async('string');
  expect(html).toContain('CasparCG data shim');
  expect(html).not.toMatch(/src=["'](?:\.\/)?js\//); // nothing external left

  // Load the exported file for real and drive it like a CasparCG server would.
  const view = await page.context().newPage();
  await view.setContent(html, { waitUntil: 'load' });
  await view.evaluate(() => {
    (window as unknown as { update(raw: string): void }).update(
      '<templateData><componentData id="f0"><data id="text" value="Caspar Works"/></componentData></templateData>',
    );
    (window as unknown as { play(): void }).play();
  });
  await expect(view.locator('#f0')).toHaveText('Caspar Works');
  await expect
    .poll(async () => view.locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
  await view.close();
});

test('ograf: a valid v1 Graphic whose Web Component passes the action contract', async ({ page }) => {
  await createHairline(page);
  const zip = await downloadTarget(page, 'OGraf (EBU) export');

  // The manifest carries the spec's required fields + the field-driven data schema.
  const manifest = JSON.parse(await zip.file('hairline/hairline.ograf.json')!.async('string'));
  expect(manifest.$schema).toBe('https://ograf.ebu.io/v1/specification/json-schemas/graphics/schema.json');
  expect(manifest.id).toBe('hairline');
  expect(manifest.main).toBe('graphic.mjs');
  expect(manifest.supportsRealTime).toBe(true);
  expect(manifest.supportsNonRealTime).toBe(false);
  expect(manifest.schema.properties.f0.title).toBe('Name');
  expect(manifest.schema.properties.f1.title).toBe('Title');

  // Serve the package from a fake origin and take the Graphic through its lifecycle
  // exactly like an OGraf renderer: define → load → updateAction → playAction → stopAction.
  const files = new Map<string, string>();
  for (const name of Object.keys(zip.files)) {
    if (!zip.files[name].dir) files.set(name.replace(/^hairline\//, ''), await zip.file(name)!.async('string'));
  }
  await page.route('http://ograf-test.local/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\//, '');
    const body = files.get(path);
    if (body == null) return route.fulfill({ status: 404, body: 'not found' });
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      headers: { 'access-control-allow-origin': '*' },
      body,
    });
  });

  const result = await page.evaluate(async () => {
    const mod = await import('http://ograf-test.local/graphic.mjs');
    customElements.define('ograf-under-test', mod.default);
    const el = document.createElement('ograf-under-test') as HTMLElement & {
      load(p: unknown): Promise<{ statusCode: number }>;
      updateAction(p: unknown): Promise<unknown>;
      playAction(p: unknown): Promise<{ currentStep?: number }>;
      stopAction(p: unknown): Promise<unknown>;
      dispose(): Promise<unknown>;
    };
    document.body.appendChild(el);
    const loaded = await el.load({ data: { f0: 'OGraf Works', f1: 'Contract Test' } });
    const gsapType = typeof (window as { gsap?: unknown }).gsap;
    const afterLoad = el.querySelector('#f0')?.textContent;
    await el.updateAction({ data: { f0: 'Updated Name' } });
    const afterUpdate = el.querySelector('#f0')?.textContent;
    const played = await el.playAction({});
    await new Promise((r) => setTimeout(r, 700));
    const opacity = getComputedStyle(el.querySelector('.lower-third')!).opacity;
    await el.stopAction({});
    await el.dispose();
    const cleared = el.innerHTML === '';
    return { statusCode: loaded.statusCode, gsapType, afterLoad, afterUpdate, currentStep: played.currentStep, opacity, cleared };
  });

  expect(result.gsapType).toBe('object');
  expect(result.statusCode).toBe(200);
  expect(result.afterLoad).toBe('OGraf Works');
  expect(result.afterUpdate).toBe('Updated Name');
  expect(result.currentStep).toBe(0);
  expect(result.opacity).toBe('1');
  expect(result.cleared).toBe(true);
});
