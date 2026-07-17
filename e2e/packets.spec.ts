import { test, expect, type Page } from '@playwright/test';
import { createProject } from './_create';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';

// The packet manager: graphics collections (save / open / export as one zip) and named
// brand looks (capture / apply / share).

async function create(page: Page, categoryName: string, variantName: string) {
  await createProject(page, { category: categoryName, name: variantName });
}

test('packets: save two graphics, reopen one, export the whole packet as one zip', async ({ page }) => {
  await page.goto('/app');
  await create(page, 'Lower thirds', 'Hairline');

  // Save the lower third into a new packet.
  await page.getByRole('button', { name: '📦 Packets' }).click();
  await page.locator('.pk-modal select').selectOption('new');
  await page.getByPlaceholder(/Show name/).fill('Friday Show');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.pk-modal .status-ok')).toContainText('Saved "Hairline"');
  await page.locator('.gallery-close').click();

  // Make a second graphic and save it into the same packet.
  await page.getByRole('button', { name: '+ New project' }).click();
  await create(page, 'Tickers', 'News Strip');
  await page.getByRole('button', { name: '📦 Packets' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.pk-packet h3')).toContainText('Friday Show (2)');

  // Reopen the lower third from the packet.
  await page.locator('.pk-graphic', { hasText: 'Hairline' }).getByRole('button', { name: 'Open' }).click();
  await expect(page.locator('.topbar .tpl-name')).toHaveText('Hairline');

  // Export the whole packet: one zip, one Starter folder per graphic.
  await page.getByRole('button', { name: '📦 Packets' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '⬇ Export packet' }).click(),
  ]);
  const zip = await JSZip.loadAsync(readFileSync(await download.path()));
  const names = Object.keys(zip.files);
  expect(names).toContain('friday_show/hairline/index.html');
  expect(names).toContain('friday_show/hairline/js/template.js');
  expect(names).toContain('friday_show/news_strip/index.html');
  expect(names).toContain('friday_show/README.md');
});

test('looks: capture the current look, apply it to another graphic, survive reload', async ({ page }) => {
  await page.goto('/app');
  await create(page, 'Lower thirds', 'Hairline');

  // Tweak the accent through the Style panel, then capture the look.
  await page.getByTestId('dock-tab-style').click();
  await page
    .locator('.field-row', { hasText: '--accent' })
    .first()
    .locator('input.grow')
    .fill('#12e29a');
  await page.getByRole('button', { name: '📦 Packets' }).click();
  await page.getByPlaceholder(/Look name/).fill('Mint look');
  await page.getByRole('button', { name: 'Save current look' }).click();
  await expect(page.locator('.pk-graphic', { hasText: 'Mint look' })).toBeVisible();
  await page.locator('.gallery-close').click();

  // The look survives a full reload (localStorage) and applies to a FRESH graphic. A fresh
  // graphic matters for determinism too: whether the autosave (800 ms debounce) caught the
  // accent tweak before the reload decides if the restored project already carries it — and
  // applying a look that is already active changes nothing, so nothing would highlight.
  await page.reload();
  await create(page, 'Lower thirds', 'Hairline'); // the wizard opens on load — make the fresh graphic
  await page.getByRole('button', { name: '📦 Packets' }).click();
  await page.locator('.pk-graphic', { hasText: 'Mint look' }).getByRole('button', { name: 'Apply', exact: true }).click();
  const css = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.css;
  });
  expect(css).toContain('--accent: #12e29a');
  // The applied change is highlighted in the CSS tab.
  await expect(page.locator('.tabs .tab.active')).toHaveText('CSS');
  await expect(page.locator('.editor-host .changed-line').first()).toBeVisible();
});
