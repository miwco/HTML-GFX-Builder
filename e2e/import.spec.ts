import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';

// Era 2a: import an existing template (.html or SPX-style .zip) to edit and convert.

// A believable foreign template: inline style + script, an SPX definition, no house contracts.
const FOREIGN_HTML = `<!DOCTYPE html>
<html>
<head>
<title>Old Score Bug</title>
<script>window.SPXGCTemplateDefinition = {
  "description": "Old Score Bug", "playserver": "OVERLAY", "playchannel": "1",
  "playlayer": "9", "webplayout": "9", "out": "manual", "dataformat": "json",
  "DataFields": [ { "field": "f0", "ftype": "textfield", "title": "Score", "value": "0 - 0" } ]
};</script>
<style>
  body { margin: 0; background: transparent; }
  #bug { position: absolute; top: 40px; left: 40px; color: #fff; font: bold 40px sans-serif; opacity: 0; }
</style>
</head>
<body>
  <div id="bug"><span id="f0">0 - 0</span></div>
  <script>
    function update(data) { var f = JSON.parse(data); for (var k in f) { var el = document.getElementById(k); if (el) el.textContent = f[k]; } }
    function play() { document.getElementById('bug').style.opacity = '1'; }
    function stop() { document.getElementById('bug').style.opacity = '0'; }
    function next() {}
  </script>
</body>
</html>`;

async function dropTemplate(page: Page, name: string, buffer: Buffer) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="import"]').click();
  await page.locator('.wz-drop input[type="file"]').setInputFiles({ name, mimeType: 'text/html', buffer });
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);
}

test('import .html: splits into panes, keeps the definition, validates, exports', async ({ page }) => {
  await dropTemplate(page, 'old-score-bug.html', Buffer.from(FOREIGN_HTML));
  await expect(page.locator('.topbar .tpl-name')).toHaveText('Old Score Bug');

  const tpl = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const t = useTemplateStore.getState().template;
    return { html: t.html, css: t.css, js: t.js, fields: t.fields.map((f) => f.field) };
  });
  expect(tpl.css).toContain('#bug');                       // style moved to the CSS pane
  expect(tpl.js).toContain('function play()');             // script moved to the JS pane
  expect(tpl.html).toContain('SPXGCTemplateDefinition');   // definition stays in the HTML
  expect(tpl.html).not.toContain('function play()');
  expect(tpl.fields).toEqual(['f0']);

  // Landed on Export with the inline validation — this one is already valid.
  await expect(page.locator('.panel-tabs .tab.active')).toHaveText('Export');
  await expect(page.locator('.panel-body .status-ok')).toContainText('valid and ready');

  // The graphic actually works: update + play through the simulator.
  await page.locator('.panel-tabs .tab', { hasText: 'Data' }).click();
  await page.locator('.field-row', { hasText: 'Score' }).locator('input').first().fill('2 - 1');
  await page.getByRole('button', { name: '▶ Play' }).click();
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('#f0')).toHaveText('2 - 1');
  await expect
    .poll(async () => frame.locator('#bug').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
});

test('import round-trip: an exported Starter zip re-imports as the same code', async ({ page }) => {
  // Create + export a wizard template.
  await page.goto('/app');
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.waitForTimeout(650);
  const before = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const t = useTemplateStore.getState().template;
    return { css: t.css, js: t.js };
  });
  await page.locator('.panel-tabs .tab', { hasText: 'Export' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Validate & download/ }).click(),
  ]);
  const zipBuffer = readFileSync(await download.path());
  await JSZip.loadAsync(zipBuffer); // sanity: it is a real zip

  // Re-import the zip through the wizard.
  await page.getByRole('button', { name: '+ New project' }).click();
  await page.locator('[data-entry="import"]').click();
  await page.locator('.wz-drop input[type="file"]').setInputFiles({
    name: 'hairline_spx.zip',
    mimeType: 'application/zip',
    buffer: zipBuffer,
  });
  await expect(page.locator('.wz-modal')).toBeHidden();
  const after = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const t = useTemplateStore.getState().template;
    return { name: t.name, css: t.css, js: t.js, fields: t.fields.length };
  });
  expect(after.name).toBe('Hairline');
  expect(after.css.trim()).toBe(before.css.trim());
  expect(after.js.trim()).toBe(before.js.trim());
  expect(after.fields).toBe(2);
});
