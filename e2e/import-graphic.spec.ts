import { test, expect, type Page } from '@playwright/test';
import { awaitPreviewRebuild } from './_preview';
import { lowerThirdPng } from './_png';
import { elementPoint } from './_canvas';

// The Import Graphic MVP workflow, end to end (docs/IMPORT_MVP.md): a flat PNG design becomes
// a working SPX template with editable text fields and selectable in/out animations.
//
// This is the workflow the feature exists for, so the spec walks the USER'S path — entry card,
// drop, place text, pick motion, create — and then checks the things that make it real: the
// artwork renders, the fields are SPX-editable, the whole graphic animates as one unit, and
// the export validates.

async function dropDesign(page: Page, width = 1920, height = 1080) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="import-graphic"]').click();
  await page.locator('.wz-drop input[type="file"]').setInputFiles({
    name: 'lower-third.png',
    mimeType: 'image/png',
    buffer: lowerThirdPng(width, height),
  });
}

test('import graphic: a flat PNG becomes a working template with editable fields', async ({ page }) => {
  await dropDesign(page);

  // The artwork is MEASURED, not assumed — the flow states what it found.
  await expect(page.locator('.asset-card')).toContainText('1920 × 1080');
  await expect(page.locator('.wz-step')).toContainText('Frame-sized');

  await page.getByRole('button', { name: 'Add text fields ›' }).click();

  // The Template step is skipped: the artwork IS the design.
  await expect(page.locator('.wz-dot.active')).toContainText('Text');

  const rows = page.locator('.wz-line-row');
  await rows.first().locator('input').first().fill('Guest name');
  await rows.nth(1).locator('input').first().fill('Guest title');

  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();

  // The artwork renders as the graphic itself, with the text on top of it.
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('.imported-design-art')).toBeVisible();
  await expect(frame.locator('#f0')).toHaveText('Alexandra Riva');

  // The fields are real SPX DataFields, so the operator can edit them.
  await page.getByTestId('dock-tab-data').click();
  await expect(page.locator('.panel-body')).toContainText('Guest name');
  await expect(page.locator('.panel-body')).toContainText('Guest title');
});

test('import graphic: the imported design animates — the gap this feature closes', async ({ page }) => {
  await dropDesign(page);
  await page.getByRole('button', { name: 'Add text fields ›' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();

  // The timeline dock reads the template's OWN code, so a real editable strip means the
  // imported design carries a NOACG_ANIM data block (an import used to get no strip at all).
  await expect(page.locator('.tlv2-ruler')).toBeVisible();

  // The design unit's row speaks the user's word: this box is their artwork, not a "Panel".
  await expect(
    page.locator('.tlv2-labels .timeline-label[data-part=".imported-design-box"]'),
  ).toContainText('Design');

  const frame = page.frameLocator('iframe.preview-frame');
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame.locator('.imported-design').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');

  // The whole graphic leaves together on Stop.
  await page.getByRole('button', { name: '■ Stop' }).click();
  await expect
    .poll(async () => frame.locator('.imported-design').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('0');
});

test('import graphic: in and out animations are chosen separately', async ({ page }) => {
  await dropDesign(page);
  await page.getByRole('button', { name: 'Add text fields ›' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click(); // Style

  // The Style step slims to what still applies: a frame-sized design covers the canvas as
  // drawn, so sizing and re-anchoring it are off the table, and text size is per-line on the
  // Text step. Palette and font still style the lines.
  await expect(page.locator('.wz-step')).toContainText('Palette');
  await expect(page.locator('.wz-step')).toContainText('Font');
  await expect(page.locator('.wz-step')).not.toContainText('Graphic size');
  await expect(page.locator('.wz-step')).not.toContainText('Text size');
  await expect(page.locator('.wz-step')).not.toContainText('Position');

  await page.getByRole('button', { name: 'Next ›' }).click(); // Animation
  await expect(page.locator('.wz-dot.active')).toContainText('Animation');

  // Only whole-unit presets are offered: the line presets would tear a flat design apart.
  await expect(page.locator('.wz-step')).toContainText('Pop');
  await expect(page.locator('.wz-step')).not.toContainText('Line reveal');

  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();

  // ONE UNIT, checked by behaviour rather than by reading the code: GSAP writes inline styles
  // onto the targets it animates. The box is animated, so it gets them; a text line must not be
  // touched on its own — that is exactly what would tear a flat design away from its artwork.
  const frame = page.frameLocator('iframe.preview-frame');
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame.locator('.imported-design-box').evaluate((el) => el.getAttribute('style') ?? ''))
    .not.toBe('');
  expect(await frame.locator('#f0').evaluate((el) => el.getAttribute('style') ?? '')).toBe('');
});

test('import graphic: a cropped design is placed as an object, not stretched', async ({ page }) => {
  await dropDesign(page, 900, 260);
  await expect(page.locator('.asset-card')).toContainText('900 × 260');
  await expect(page.locator('.wz-step')).toContainText('Smaller than');

  // A floating design CAN be sized and anchored, so those knobs stay; the global text-size
  // knob never applies to an imported design (each line is sized on the Text step).
  await page.getByRole('button', { name: 'Add text fields ›' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click(); // Style
  await expect(page.locator('.wz-step')).toContainText('Graphic size');
  await expect(page.locator('.wz-step')).toContainText('Position');
  await expect(page.locator('.wz-step')).not.toContainText('Text size');
});

test('import graphic: a 2× export is shown frame-sized, not pushed off the frame', async ({ page }) => {
  // A retina/2x export of a 1080p design is one of the likeliest files to be dropped here.
  // At natural size only its top-left quadrant would fit the frame — a lower third drawn in
  // its bottom half would be entirely off-screen, an invisible graphic.
  await dropDesign(page, 3840, 2160);
  await expect(page.locator('.asset-card')).toContainText('3840 × 2160');
  await expect(page.locator('.wz-step')).toContainText('2× export');

  await page.getByRole('button', { name: 'Add text fields ›' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();

  // The design unit is exactly the frame's width: edge to edge, as drawn (--scale is 1 here).
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('.imported-design-art')).toBeVisible();
  const width = await frame
    .locator('.imported-design-box')
    .evaluate((el) => el.getBoundingClientRect().width);
  expect(Math.round(width)).toBe(1920);
});

/** Create the imported design and land in the editor with the preview rebuilt. */
async function createImported(page: Page) {
  await dropDesign(page);
  await page.getByRole('button', { name: 'Add text fields ›' }).click();
  await awaitPreviewRebuild(page, async () => {
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page.locator('.wz-modal')).toBeHidden();
  });
}

/** The current template's #fw0 rule position + #f0 font/tracks + history length. */
async function placementState(page: Page) {
  return page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { placedLines, lineFontSize } = await import('/src/blocks/designLayout.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const s = useTemplateStore.getState();
    const data = parseAnimData(s.template.js);
    return {
      place: placedLines(s.template.html, s.template.css)['#f0'] ?? null,
      font: lineFontSize(s.template.css, 'f0'),
      f0Tracks: Object.keys(data?.steps[0].layers['#f0'] ?? {}),
      history: s.history.length,
    };
  });
}

/** Add a field through the Data panel's add row (the real UI path). */
async function addFieldViaDataTab(page: Page, title: string) {
  await page.getByTestId('dock-tab-data').click();
  await page.locator('.field-add-row input').fill(title);
  await awaitPreviewRebuild(page, () =>
    page.getByRole('button', { name: '+ Add' }).click(),
  );
}

test('import graphic: dragging a field places it in the CSS — never a keyframe', async ({ page }) => {
  await createImported(page);

  // Select the Name field via its timeline row (the shared selection), like any layer.
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  await expect(page.getByTestId('inspector')).toBeVisible({ timeout: 3000 });
  const before = await placementState(page);
  expect(before.place).not.toBeNull();

  // Drag the field 120 px right and 60 px up on screen.
  const c = await elementPoint(page, '#f0');
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 120, c.y - 60, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(800);

  // The wrapper's CSS rule moved by the drag (screen px → design px through the doc scale;
  // --scale is 1 at 1080p size M, so canvas px are design px here)...
  const after = await placementState(page);
  expect(after.place!.x).toBeCloseTo(before.place!.x + 120 / c.scale, -1);
  expect(after.place!.y).toBeCloseTo(before.place!.y - 60 / c.scale, -1);
  expect(after.place!.scaled).toBe(true); // the rule keeps its calc(--scale) idiom

  // ...and the drag wrote NO motion: the field's keyframe tracks are exactly what they were.
  expect(after.f0Tracks).toEqual(before.f0Tracks);

  // ONE undoable apply; undo restores the original placement.
  expect(after.history).toBe(before.history + 1);
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await placementState(page)).place!.x).toBe(before.place!.x);
});

test('import graphic: Escape cancels a placement drag without touching the code', async ({ page }) => {
  await createImported(page);
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  await expect(page.getByTestId('inspector')).toBeVisible({ timeout: 3000 });
  const before = await placementState(page);

  const c = await elementPoint(page, '#f0');
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 100, c.y + 40, { steps: 6 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await page.waitForTimeout(300);

  const after = await placementState(page);
  expect(after.place).toEqual(before.place);
  expect(after.history).toBe(before.history);
  // The live preview sprang back too (the inline override was cleared).
  const inline = await page
    .frameLocator('iframe.preview-frame')
    .locator('#fw0')
    .evaluate((el) => (el as HTMLElement).style.left);
  expect(inline).toBe('');
});

// ── The canvas + data-field phase: the Data tab's add-field is REAL on an imported design —
//    it creates the element, the placement rule, the DataField, and the selectable layer in
//    one undoable apply, and the new line behaves like any placed line from then on. ──

test('import graphic: adding a field from the Data tab creates a real placed layer', async ({ page }) => {
  await createImported(page);
  await addFieldViaDataTab(page, 'Sponsor');

  // A visible element in the preview, showing its sample text…
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('#f2')).toHaveText('Sponsor');

  // …a placed line + a real SPX DataField + a synced sample value, selected on arrival.
  const state = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { placedLines } = await import('/src/blocks/designLayout.ts');
    const s = useTemplateStore.getState();
    return {
      place: placedLines(s.template.html, s.template.css)['#f2'] ?? null,
      field: s.template.fields.find((f) => f.field === 'f2') ?? null,
      sample: s.sampleData['f2'],
      selected: s.selectedPart,
    };
  });
  expect(state.place).not.toBeNull();
  expect(state.place!.scaled).toBe(true); // the assembler's calc(--scale) idiom
  expect(state.field?.title).toBe('Sponsor');
  expect(state.sample).toBe('Sponsor');
  expect(state.selected).toBe('#f2');

  // …and a timeline row like any layer (the registry named it from the field title).
  await expect(page.locator('.tlv2-labels .timeline-label[data-part="#f2"]')).toContainText('Sponsor');
});

test('import graphic: an added field is live — sample data drives it with no manual wiring', async ({ page }) => {
  await createImported(page);
  await addFieldViaDataTab(page, 'Sponsor');
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('#f2')).toHaveText('Sponsor');

  // Type a new sample value in the Data panel and push it through update() — the shared
  // runtime binds fields by id, so the added field needs zero manual JS wiring. (The add
  // selected the new layer, which auto-revealed the Inspector in this dock — reopen Data.)
  await page.getByTestId('dock-tab-data').click();
  await page.locator('.panel-body .field-row', { hasText: 'Sponsor' }).locator('input').fill('ACME Broadcast');
  await page.getByTestId('dock-body-right').getByRole('button', { name: '⟳ Update' }).click();
  await expect(frame.locator('#f2')).toHaveText('ACME Broadcast');

  // The definition carries the field, so SPX gets the same control: the export validates.
  await page.getByTestId('dock-tab-export').click();
  await expect(page.locator('.panel-body')).not.toContainText('✗');
});

test('import graphic: adding an image field creates a placed slot on the design', async ({ page }) => {
  await createImported(page);
  await page.getByTestId('dock-tab-data').click();
  await page.locator('.field-add-row input').fill('Logo');
  await page.locator('.field-add-row select').selectOption('filelist');
  await awaitPreviewRebuild(page, () => page.getByRole('button', { name: '+ Add' }).click());

  // The slot is real everywhere at once: a filelist DataField + a placed, sized wrapper.
  const state = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { placedLines, slotSize } = await import('/src/blocks/designLayout.ts');
    const s = useTemplateStore.getState();
    const place = placedLines(s.template.html, s.template.css)['#f2'] ?? null;
    return {
      place,
      slot: place ? slotSize(s.template.css, place.wrapperId) : null,
      field: s.template.fields.find((f) => f.field === 'f2') ?? null,
      selected: s.selectedPart,
    };
  });
  expect(state.place).not.toBeNull();
  expect(state.slot).toEqual({ width: 120, height: 120, scaled: true });
  expect(state.field?.ftype).toBe('filelist');
  expect(state.field?.assetfolder).toBe('./images/');
  expect(state.selected).toBe('#f2');

  // Empty slot: the img hides, the dashed wrapper shows — and the slot stays selectable
  // (the wrapper stands in for the hidden element). The add already selected the new layer
  // (clicking its row again would toggle-deselect), so its row and resize handle are live.
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('#f2')).toBeHidden();
  await expect(frame.locator('#fw2')).toBeVisible();
  await expect(page.locator('.tlv2-labels .timeline-label[data-part="#f2"]')).toContainText('Logo');
  const handle = page.getByTestId('line-size-handle');
  await expect(handle).toBeVisible();

  // The corner handle resizes the slot's BOX in the CSS (aspect preserved, one apply).
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 60, { steps: 6 });
  await page.mouse.up();
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const { useTemplateStore } = await import('/src/store/templateStore.ts');
        const { slotSize } = await import('/src/blocks/designLayout.ts');
        const s = slotSize(useTemplateStore.getState().template.css, 'fw2');
        return s && s.width === s.height ? s.width : -1; // square slot keeps its aspect
      }),
    )
    .toBeGreaterThan(120);

  // Choosing an image fills the slot through update() — no manual wiring. (addAsset
  // triggers a preview rebuild; the settle then pushes the sample value into the slot.)
  await awaitPreviewRebuild(page, () =>
    page.evaluate(async () => {
      const { useTemplateStore } = await import('/src/store/templateStore.ts');
      const c = document.createElement('canvas');
      c.width = 8;
      c.height = 8;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#f5a623';
      ctx.fillRect(0, 0, 8, 8);
      const s = useTemplateStore.getState();
      s.addAsset({ path: 'images/logo.png', data: c.toDataURL('image/png') });
      s.setSampleValue('f2', 'images/logo.png');
    }),
  );
  await expect(frame.locator('#f2')).toBeVisible();
});

test('import graphic: arrow keys nudge a selected field — one placement apply per burst', async ({ page }) => {
  await createImported(page);
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  await expect(page.getByTestId('inspector')).toBeVisible({ timeout: 3000 });
  const before = await placementState(page);

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowUp');

  // The burst commits once the keys go quiet — one undoable apply for all four presses.
  await expect.poll(async () => (await placementState(page)).place?.x).toBe(before.place!.x + 3);
  const after = await placementState(page);
  expect(after.place!.y).toBe(before.place!.y - 10); // Shift = 10 design px
  expect(after.place!.scaled).toBe(true);
  expect(after.f0Tracks).toEqual(before.f0Tracks); // placement, never motion
  expect(after.history).toBe(before.history + 1);

  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await placementState(page)).place!.x).toBe(before.place!.x);
});

test('import graphic: the corner handle resizes a field\'s text in the CSS', async ({ page }) => {
  await createImported(page);
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  const handle = page.getByTestId('line-size-handle');
  await expect(handle).toBeVisible();
  // The keyframe transform handles step aside for a placed line: its corner is a DESIGN
  // decision (font-size in its own rule), exactly like its drag.
  await expect(page.getByTestId('layer-scale-handle')).toHaveCount(0);
  await expect(page.getByTestId('layer-rotate-handle')).toHaveCount(0);

  const before = await placementState(page);
  expect(before.font).not.toBeNull();
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 60, { steps: 6 });
  await page.mouse.up();

  await expect.poll(async () => (await placementState(page)).font!.value).toBeGreaterThan(before.font!.value);
  const after = await placementState(page);
  expect(after.font!.scaled).toBe(true); // the rule keeps its calc(--scale) idiom
  expect(after.history).toBe(before.history + 1);
  expect(after.f0Tracks).toEqual(before.f0Tracks); // design, never a scale keyframe
});

test('import graphic: the artwork and a field animate as separate layers from the Inspector', async ({ page }) => {
  await createImported(page);

  // The PNG is its own registry layer, and Animations is the Inspector's DEFAULT view here.
  await page.locator('.tlv2-labels .timeline-label[data-part=".imported-design-art"]').click();
  await expect(page.getByTestId('inspector')).toBeVisible({ timeout: 3000 });
  await expect(page.getByTestId('inspector-part-label')).toHaveText('Artwork');
  await expect(page.getByTestId('inspector-animations')).toBeVisible();

  // Give the artwork its own entrance…
  await page.getByTestId('inspector-preset-select').selectOption('design-slide');
  await awaitPreviewRebuild(page, () => page.getByTestId('inspector-preset-apply').click());

  // …and a field a different one, independently.
  await page.locator('.tlv2-labels .timeline-label[data-part="#f1"]').click();
  await page.getByTestId('inspector-preset-select').selectOption('design-pop');
  await awaitPreviewRebuild(page, () => page.getByTestId('inspector-preset-apply').click());

  const tracks = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const data = parseAnimData(useTemplateStore.getState().template.js);
    const layers = data?.steps[0].layers ?? {};
    return {
      art: Object.keys(layers['.imported-design-art'] ?? {}).sort(),
      f1: Object.keys(layers['#f1'] ?? {}).sort(),
    };
  });
  expect(tracks.art).toEqual(expect.arrayContaining(['opacity', 'y'])); // Slide up
  expect(tracks.f1).toEqual(expect.arrayContaining(['opacity', 'scale'])); // Pop
});

test('import graphic: the exported SPX package validates', async ({ page }) => {
  await dropDesign(page);
  await page.getByRole('button', { name: 'Add text fields ›' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();

  await page.getByTestId('dock-tab-export').click();
  // Export is gated on zero validation errors; the panel says so inline.
  await expect(page.locator('.panel-body')).not.toContainText('✗');
});
