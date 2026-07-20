import { test, expect, type Page } from '@playwright/test';
import { createProject } from './_create';
import JSZip from 'jszip';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import nodePath from 'node:path';

// The CasparCG and OGraf export targets — not just zip-structure checks: the CasparCG
// file is loaded and driven with an XML payload, and the OGraf Graphic is imported and
// taken through its load/updateAction/playAction contract.

async function createHairline(page: Page) {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
}

async function downloadTarget(page: Page, label: string): Promise<JSZip> {
  await page.getByTestId('dock-tab-export').click();
  await page.locator('.issue', { hasText: label }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Validate & download/ }).click(),
  ]);
  return JSZip.loadAsync(readFileSync(await download.path()));
}

test('export panel offers all six targets', async ({ page }) => {
  await createHairline(page);
  await page.getByTestId('dock-tab-export').click();
  for (const label of ['SPX export', 'HTML overlay (OBS / vMix)', 'H2R Graphics export', 'CasparCG export', 'OGraf (EBU) export', 'LiveOS (NetOn.Live) export']) {
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
  await page.getByTestId('dock-tab-export').click();
  await page.locator('.issue', { hasText: 'CasparCG export' }).click();
  // Fresh load: the wizard opens; behind it the Export tab must preselect the remembered target.
  await page.reload();
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByTestId('dock-tab-export').click();
  await expect(page.locator('.issue', { hasText: 'CasparCG export' }).locator('input[type="radio"]')).toBeChecked();
});

test('html overlay: self-contained, autoplays with the Data panel values, control panel bundled', async ({ page }) => {
  await createHairline(page);
  // Type a custom value in the Data panel — the export must bake it in.
  await page.getByTestId('dock-tab-data').click();
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

test('liveos: the OGraf package with LiveOS instructions — same graphic, LiveOS README', async ({ page }) => {
  await createHairline(page);
  const liveosZip = await downloadTarget(page, 'LiveOS (NetOn.Live) export');

  // The package IS an OGraf v1 Graphic (LiveOS's HTML5 graphics engine is OGraf-compliant):
  // manifest + graphic.mjs + bundled GSAP, plus a LiveOS-specific README.
  const names = Object.keys(liveosZip.files).filter((n) => !liveosZip.files[n].dir);
  expect(names).toEqual(
    expect.arrayContaining([
      'hairline/README.md',
      'hairline/graphic.mjs',
      'hairline/hairline.ograf.json',
      'hairline/lib/gsap.min.js',
    ]),
  );
  const manifest = JSON.parse(await liveosZip.file('hairline/hairline.ograf.json')!.async('string'));
  expect(manifest.$schema).toBe('https://ograf.ebu.io/v1/specification/json-schemas/graphics/schema.json');
  expect(manifest.main).toBe('graphic.mjs');
  expect(manifest.schema.properties.f0.title).toBe('Name');
  const readme = await liveosZip.file('hairline/README.md')!.async('string');
  expect(readme).toContain('LiveOS');
  expect(readme).toContain('OGraf');

  // The Graphic itself must be byte-identical to the OGraf export — the driven OGraf
  // contract test below covers this exact module, so the two targets can never drift.
  const ografZip = await downloadTarget(page, 'OGraf (EBU) export');
  expect(await liveosZip.file('hairline/graphic.mjs')!.async('string')).toBe(
    await ografZip.file('hairline/graphic.mjs')!.async('string'),
  );
  expect(await liveosZip.file('hairline/hairline.ograf.json')!.async('string')).toBe(
    await ografZip.file('hairline/hairline.ograf.json')!.async('string'),
  );
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

// ── Fonts actually arrive ────────────────────────────────────────────────────────────────
//
// Generated CSS references a bundled face as url("fonts/<file>.woff2"), which a FOLDER package
// satisfies by shipping the file beside the HTML and a SINGLE-FILE package can only satisfy by
// embedding the bytes. The single-file half was missing: casparcg, h2r and html-overlay emitted
// the reference and wrote no font, so those graphics played out in the fallback stack.
//
// It hid twice over — `font-display: swap` renders fallback text instead of erroring, and every
// other check in this file loads an export through setContent() or a srcdoc, both of which
// inherit the DEV SERVER's base URL, where /fonts/ happens to exist. So this test insists on the
// real destination: the file alone in a directory, opened over file://, with no sibling anything.

/** Text entries of a package, keyed by path (binaries skipped). */
async function textEntries(zip: JSZip): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [entryPath, entry] of Object.entries(zip.files)) {
    if (entry.dir || /\.(woff2?|ttf|otf|png|jpe?g|gif|webp|avif)$/i.test(entryPath)) continue;
    out[entryPath] = await entry.async('string');
  }
  return out;
}

const FONT_REF = /url\(["']?(?:\.\/)?fonts\/([\w./-]+\.(?:woff2|woff|ttf|otf))["']?\)/gi;

test('every export target carries the fonts its own code references', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await createHairline(page);

  const targets = [
    { label: 'SPX export', singleFile: false },
    { label: 'HTML overlay (OBS / vMix)', singleFile: true },
    { label: 'H2R Graphics export', singleFile: true },
    { label: 'CasparCG export', singleFile: true },
    { label: 'OGraf (EBU) export', singleFile: false },
    { label: 'LiveOS (NetOn.Live) export', singleFile: false },
  ];

  for (const { label, singleFile } of targets) {
    const zip = await downloadTarget(page, label);
    const texts = await textEntries(zip);
    const packaged = new Set(Object.keys(zip.files).filter((p) => !zip.files[p].dir));

    // Any relative font reference that survives packaging must have a file to resolve to.
    // (An embedded font is a data: URL and no longer matches, which is the point.)
    const dangling: string[] = [];
    for (const [entryPath, text] of Object.entries(texts)) {
      const dir = entryPath.includes('/') ? entryPath.slice(0, entryPath.lastIndexOf('/') + 1) : '';
      for (const [, file] of text.matchAll(FONT_REF)) {
        if (!packaged.has(`${dir}fonts/${file}`)) dangling.push(`${entryPath} -> fonts/${file}`);
      }
    }
    expect(dangling, `${label}: references a font the package does not contain`).toEqual([]);

    // Wherever the bytes go, the licence goes: OFL §2 wants each redistributed copy to CONTAIN
    // the copyright notice and the licence, as a stand-alone file (the folder packages'
    // FONT_LICENSES.md) or a human-readable header (the single-file targets' HTML comment).
    // It is triggered by redistribution, so shipping the product free does not retire it.
    const carriesFonts =
      Object.keys(zip.files).some((p) => /\.(woff2?|ttf|otf)$/i.test(p)) ||
      Object.values(texts).some((t) => t.includes('data:font/'));
    expect(carriesFonts, `${label}: shipped no font bytes at all — the graphic has no typography`).toBe(true);
    const everything = Object.values(texts).join('\n');
    expect(
      everything.includes('SIL OPEN FONT LICENSE Version 1.1'),
      `${label}: carries font bytes but not the OFL licence text`,
    ).toBe(true);
    expect(
      everything.includes('Copyright 2020 The Inter Project Authors'),
      `${label}: carries font bytes but not the per-font copyright notices`,
    ).toBe(true);

    if (!singleFile) continue;

    // The single-file targets get the real test: alone on disk, over file://, nothing beside it.
    // Every @font-face the graphic declares must still reach status "loaded".
    const htmlEntry = Object.keys(texts).find((p) => /\.html$/i.test(p) && !/controlpanel/i.test(p))!;
    const dir = testInfo.outputPath(`lone-${label.replace(/\W+/g, '-')}`);
    mkdirSync(dir, { recursive: true });
    const onDisk = nodePath.join(dir, 'index.html');
    writeFileSync(onDisk, texts[htmlEntry], 'utf8');

    const lone = await page.context().newPage();
    await lone.goto(`file://${onDisk.replace(/\\/g, '/')}`);
    const faces = await lone.evaluate(async () => {
      await document.fonts.ready;
      return Array.from(document.fonts).map((f) => `${f.family.replace(/["']/g, '')}:${f.status}`);
    });
    await lone.close();

    expect(faces.length, `${label}: the graphic declares no @font-face at all`).toBeGreaterThan(0);
    expect(faces.filter((f) => !f.endsWith(':loaded')), `${label}: a font did not load from file://`).toEqual([]);
  }
});
