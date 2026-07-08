import { test, expect, type Page, type FrameLocator } from '@playwright/test';

// The UX overhaul: preview-over-tabs layout, validation inside Export, Motion phase
// control + auto-replay, add-field in Data, and the editor's change highlighting.

async function createHairline(page: Page) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650); // debounced preview rebuild
}

function frame(page: Page): FrameLocator {
  return page.frameLocator('iframe.preview-frame');
}

test('layout: code pane left, preview above the tool tabs on the right', async ({ page }) => {
  await createHairline(page);
  const editor = await page.locator('.editor-host').boundingBox();
  const stage = await page.locator('.preview-stage').boundingBox();
  const tabs = await page.locator('.panel-tabs').boundingBox();
  expect(editor && stage && tabs).toBeTruthy();
  // Code on the left of the preview column…
  expect(editor!.x + editor!.width).toBeLessThanOrEqual(stage!.x + 2);
  // …and the preview sits ABOVE the panel tabs in the same column.
  expect(stage!.y + stage!.height).toBeLessThanOrEqual(tabs!.y + 2);
  expect(Math.abs(stage!.x - tabs!.x)).toBeLessThan(40);
  // The focused tabs — Blocks/Learn/Validate are gone; Control is the operator view.
  await expect(page.locator('.panel-tabs .tab')).toHaveText(['Data', 'Control', 'Style', 'Motion', 'AI', 'Export']);
});

test('export: validation shows inline and gates the download on a broken template', async ({ page }) => {
  await createHairline(page);
  await page.locator('.panel-tabs .tab', { hasText: 'Export' }).click();
  await expect(page.locator('.panel-body .status-ok')).toContainText('valid and ready');
  // Break the runtime: blank the JS in the editor.
  await page.locator('.tabs .tab', { hasText: 'JS' }).click();
  await page.locator('.editor-host .monaco-editor').click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('// gone');
  await expect(page.locator('.panel-body .status-bad')).toContainText('must be fixed before export');
  await expect(page.getByRole('button', { name: /Validate & download/ })).toBeDisabled();
});

test('motion: In-only preset swap keeps the exit and auto-replays', async ({ page }) => {
  await createHairline(page);
  await page.locator('.panel-tabs .tab', { hasText: 'Motion' }).click();
  await page.getByRole('button', { name: 'In only' }).click();
  await page.locator('.wz-anim', { hasText: 'Pop spring' }).click();
  // The phase mix is recorded in the marker comments…
  const js = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });
  expect(js).toContain('// In preset: Pop spring');
  expect(js).toContain('// Out preset: Line reveal'); // Hairline's default preset, untouched
  expect(js).toContain('function buildOutTimeline');
  // …the header reflects it…
  await expect(page.locator('.panel-body .hint').first()).toContainText('In Pop spring');
  // …and the auto-replay makes the graphic visible without pressing Play.
  await expect
    .poll(async () => frame(page).locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity), { timeout: 6000 })
    .toBe('1');
});

test('data: add-field appends to the SPX definition and highlights the HTML', async ({ page }) => {
  await createHairline(page);
  await page.locator('.panel-tabs .tab', { hasText: 'Data' }).click();
  await page.getByPlaceholder(/Label the operator sees/).fill('Sponsor');
  await page.getByRole('button', { name: '+ Add' }).click();
  // The field landed in the definition (f2 after the two lines)…
  await expect(page.locator('.field-row', { hasText: 'Sponsor' })).toBeVisible();
  const html = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.html;
  });
  expect(html).toContain('"title": "Sponsor"');
  // …the editor switched to HTML and highlighted the change.
  await expect(page.locator('.tabs .tab.active')).toHaveText('HTML');
  await expect(page.locator('.editor-host .changed-line').first()).toBeVisible();
});

test('wizard: direction control mixes a different exit preset at create', async ({ page }) => {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click(); // Fields
  await page.getByRole('button', { name: 'Next ›' }).click(); // Style
  await page.getByRole('button', { name: 'Next ›' }).click(); // Animation
  // Default direction: one matched style for the entrance AND the exit.
  await expect(page.locator('.wz-step button.active', { hasText: 'In and out' })).toBeVisible();
  // Switch only the exit; the direction hint reflects the mix.
  await page.getByRole('button', { name: 'Out only' }).click();
  await page.locator('.wz-anim', { hasText: 'Drop in' }).click();
  await expect(page.locator('.wz-step .hint').first()).toContainText('Out Drop in');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  // The created code carries the phase mix in the marker comments…
  const js = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });
  expect(js).toContain('// In preset: Line reveal'); // Hairline's default entrance, kept
  expect(js).toContain('// Out preset: Drop in'); // the mixed-in exit
  // …and the spliced runtime still plays.
  await page.waitForTimeout(650); // debounced preview rebuild
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame(page).locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
});

test('style: a color change highlights the changed CSS lines', async ({ page }) => {
  await createHairline(page);
  await page.locator('.panel-tabs .tab', { hasText: 'Style' }).click();
  const accentRow = page.locator('.field-row', { hasText: '--accent' }).first();
  await accentRow.locator('input[type="color"]').evaluate((el) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, '#ff0066');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('.editor-host .changed-line').first()).toBeVisible({ timeout: 5000 });
});
