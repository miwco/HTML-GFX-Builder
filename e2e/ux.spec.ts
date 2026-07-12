import { test, expect, type Page, type FrameLocator } from '@playwright/test';

// The UX overhaul: preview-over-tabs layout, validation inside Export, motion phase
// control + auto-replay (on the timeline strip — the Motion tab is retired), add-field
// in Data, and the editor's change highlighting.

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
  // The focused tabs — Blocks/Learn/Validate are gone; Control is the operator view;
  // Motion lives on the timeline strip's moment cards, not in a tab.
  await expect(page.locator('.panel-tabs .tab')).toHaveText(['Data', 'Control', 'Style', 'AI', 'Export']);
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

test('motion: an In-only preset swap from the ▶ In card keeps the exit and auto-replays', async ({ page }) => {
  // The classic strip's phase controls — pinned on a not-yet-migrated category (info
  // cards); lower thirds create as data blocks and use the step timeline instead.
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Info cards' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline Card' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);
  // The ▶ In card is the selected moment by default; its inspector row (under the tracks)
  // carries THAT phase's preset picker — the strip is the one motion surface.
  await expect(page.getByTestId('timeline-seg-in')).toHaveClass(/active/);
  await expect(page.getByTestId('timeline-phase-preset')).toHaveValue('line-reveal'); // the card's default
  await page.getByTestId('timeline-phase-preset').selectOption('pop-spring');
  // The phase mix is recorded in the marker comments…
  const js = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });
  expect(js).toContain('// In preset: Pop spring');
  expect(js).toContain('// Out preset: Line reveal'); // the default preset, untouched
  expect(js).toContain('function buildOutTimeline');
  // …the editor jumps to the JS tab (the swap is real, readable code)…
  await expect(page.locator('.tabs .tab.active')).toHaveText('JS');
  // …and the auto-replay makes the graphic visible without pressing Play.
  await expect
    .poll(async () => frame(page).locator('.info-card').evaluate((el) => getComputedStyle(el).opacity), { timeout: 6000 })
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
  // Lower thirds create as data blocks: the mix is real keyframe data — the entrance
  // keeps Line reveal's choreography (the accent draws in) while the Out step carries
  // Drop in's exit (the box lifts away: y + opacity keyframes).
  const data = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    return parseAnimData(useTemplateStore.getState().template.js);
  });
  expect(data).not.toBeNull();
  expect(Object.keys(data!.steps[0].layers['.lower-third-accent'] ?? {})).toContain('scaleX');
  const outBox = data!.steps[data!.steps.length - 1].layers['.lower-third-box'] ?? {};
  expect(Object.keys(outBox)).toEqual(expect.arrayContaining(['y', 'opacity']));
  // …and the mixed runtime still plays.
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
