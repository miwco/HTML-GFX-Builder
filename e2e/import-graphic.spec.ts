import { test, expect, type Page } from '@playwright/test';
import { awaitPreviewRebuild } from './_preview';
import { lowerThirdPng } from './_png';
import { elementPoint } from './_canvas';

// The Import Graphic workflow, end to end (docs/IMPORT_MVP.md): a flat PNG design becomes
// a working SPX template with editable text fields and per-layer animation.
//
// The wizard is a SETUP flow, not a second editor: bring the artwork in, create, and land
// in the real canvas editor with the Data tab open. Fields are added there (real placed
// layers, fully wired), styled through the Inspector's Style tab, and animated through its
// Animations tab — so the spec walks the USER'S path: entry card, drop, create, add fields,
// drag, style, animate, export.

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

/** Create the imported design (bare — no fields yet) and land in the editor. */
async function createBare(page: Page) {
  await awaitPreviewRebuild(page, async () => {
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page.locator('.wz-modal')).toBeHidden();
  });
}

/** Add a field through the Data panel's add row (the real UI path). */
async function addFieldViaDataTab(page: Page, title: string, ftype?: string) {
  await page.getByTestId('dock-tab-data').click();
  await page.locator('.field-add-row input').fill(title);
  if (ftype) await page.locator('.field-add-row select').selectOption(ftype);
  await awaitPreviewRebuild(page, () =>
    page.getByRole('button', { name: '+ Add' }).click(),
  );
}

/** The standard fixture most tests use: created design + Name (f0) and Title (f1) fields. */
async function createImported(page: Page) {
  await dropDesign(page);
  await createBare(page);
  await addFieldViaDataTab(page, 'Name');
  await addFieldViaDataTab(page, 'Title');
}

test('import graphic: the wizard is a setup flow — create lands in the editor, Data tab open', async ({ page }) => {
  await dropDesign(page);

  // The artwork is MEASURED, not assumed — the flow states what it found — and the live
  // preview shows the real graphic already on the Design step.
  await expect(page.locator('.asset-card')).toContainText('1920 × 1080');
  await expect(page.locator('.wz-step')).toContainText('Frame-sized');
  await expect(page.locator('.wz-side')).toBeVisible();

  // Five rail stops — Start, Design, then the optional Prepare (erase baked-in text,
  // scaling mode), Text (place the fields) and Animation — with Create available already
  // on the Design step: the FAST PATH for a design that needs no preparation, which is
  // what the rest of this test walks.
  await expect(page.locator('.wz-dots .wz-dot')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Next ›' })).toHaveCount(1);

  // Creating HERE (never visiting Prepare) must yield exactly the bare fixed-mode
  // template it always did — the assertions below pin that fast path.
  await createBare(page);

  // The handoff: the artwork renders as the graphic itself, the template is BARE (fields
  // come next, from the Data tab), and the Data tab is the active panel of its dock.
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('.imported-design-art')).toBeVisible();
  await expect(frame.locator('#f0')).toHaveCount(0);
  await expect(
    page.locator('.dock-tab.active [data-testid="dock-tab-data"]'),
  ).toBeVisible();
  await expect(page.locator('.panel-body')).toContainText('No fields on your design yet');

  // No dead controls: an imported design sizes each line from its own rule and reads no
  // --type-scale, so the var is not declared — which keeps the Style panel's global "Text
  // size" knob (keyed on the var's presence) from appearing as a control that does nothing.
  const css = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.css;
  });
  expect(css).not.toContain('--type-scale');
  await page.getByTestId('dock-tab-style').click();
  await expect(page.locator('.panel-body')).toContainText('Size');
  await expect(page.locator('.panel-body')).not.toContainText('Text size');
});

test('import graphic: fields added from the Data tab are real placed layers — the wizard step, replaced', async ({ page }) => {
  await dropDesign(page);
  await createBare(page);
  await addFieldViaDataTab(page, 'Guest name');
  await addFieldViaDataTab(page, 'Guest title');

  // Visible elements in the preview, showing their sample text…
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('#f0')).toHaveText('Guest name');
  await expect(frame.locator('#f1')).toHaveText('Guest title');

  // …placed lines + real SPX DataFields + synced sample values, the newest selected.
  const state = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { placedLines } = await import('/src/blocks/designLayout.ts');
    const s = useTemplateStore.getState();
    return {
      placed: placedLines(s.template.html, s.template.css),
      titles: s.template.fields.map((f) => f.title),
      samples: [s.sampleData['f0'], s.sampleData['f1']],
      selected: s.selectedPart,
    };
  });
  expect(state.placed['#f0']).toBeTruthy();
  expect(state.placed['#f1']).toBeTruthy();
  expect(state.placed['#f0']!.scaled).toBe(true); // the assembler's calc(--scale) idiom
  expect(state.titles).toEqual(['Guest name', 'Guest title']);
  expect(state.samples).toEqual(['Guest name', 'Guest title']);
  expect(state.selected).toBe('#f1');

  // …and timeline rows like any layer (the registry named them from the field titles).
  await expect(page.locator('.tlv2-labels .timeline-label[data-part="#f0"]')).toContainText('Guest name');
  await expect(page.locator('.tlv2-labels .timeline-label[data-part="#f1"]')).toContainText('Guest title');
});

test('import graphic: the imported design animates — whole unit in, whole unit out', async ({ page }) => {
  await createImported(page);

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

  // ONE UNIT by default: GSAP writes inline styles onto the targets it animates. The box is
  // animated, so it gets them; a field must not be touched on its own — that is exactly what
  // would tear a flat design away from artwork drawn around it.
  await expect
    .poll(async () => frame.locator('.imported-design-box').evaluate((el) => el.getAttribute('style') ?? ''))
    .not.toBe('');
  expect(await frame.locator('#f0').evaluate((el) => el.getAttribute('style') ?? '')).toBe('');

  // The whole graphic leaves together on Stop.
  await page.getByRole('button', { name: '■ Stop' }).click();
  await expect
    .poll(async () => frame.locator('.imported-design').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('0');
});

test('import graphic: a cropped design is placed as an object, not stretched', async ({ page }) => {
  await dropDesign(page, 900, 260);
  await expect(page.locator('.asset-card')).toContainText('900 × 260');
  await expect(page.locator('.wz-step')).toContainText('Smaller than');
  await createBare(page);

  // A floating design keeps its own size and sits in the default zone as an object.
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('.imported-design-art')).toBeVisible();
  const width = await frame
    .locator('.imported-design-box')
    .evaluate((el) => el.getBoundingClientRect().width);
  expect(Math.round(width)).toBe(900);
});

test('import graphic: a 2× export is shown frame-sized, not pushed off the frame', async ({ page }) => {
  // A retina/2x export of a 1080p design is one of the likeliest files to be dropped here.
  // At natural size only its top-left quadrant would fit the frame — a lower third drawn in
  // its bottom half would be entirely off-screen, an invisible graphic.
  await dropDesign(page, 3840, 2160);
  await expect(page.locator('.asset-card')).toContainText('3840 × 2160');
  await expect(page.locator('.wz-step')).toContainText('2× export');
  await createBare(page);

  // The design unit is exactly the frame's width: edge to edge, as drawn (--scale is 1 here).
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('.imported-design-art')).toBeVisible();
  const width = await frame
    .locator('.imported-design-box')
    .evaluate((el) => el.getBoundingClientRect().width);
  expect(Math.round(width)).toBe(1920);
});

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
  await addFieldViaDataTab(page, 'Logo', 'filelist');

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

test('import graphic: the Inspector Style tab restyles a selected placed field', async ({ page }) => {
  await createImported(page);

  // Select the Name field; the Style tab is offered for placed fields only.
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  await expect(page.getByTestId('inspector')).toBeVisible({ timeout: 3000 });
  await page.getByTestId('inspector-tab-style').click();
  await expect(page.getByTestId('inspector-style')).toBeVisible();

  // Size commits on Enter; weight/font/anchor commit on choice; color patches live.
  await page.getByTestId('inspector-style-size').fill('48');
  await page.getByTestId('inspector-style-size').press('Enter');
  await page.getByTestId('inspector-style-weight').selectOption('700');
  await page.getByTestId('inspector-style-align-center').click();
  await page.getByTestId('inspector-style-font').selectOption('bebas-neue');
  await page.getByTestId('inspector-style-color-text').fill('#f5a623');
  await page.getByTestId('inspector-style-spacing').fill('2');
  await awaitPreviewRebuild(page, () =>
    page.getByTestId('inspector-style-spacing').press('Enter'),
  );

  // Every edit landed as a declaration in the field's OWN rules, in the scale idiom, and
  // the picked bundled font ships as a real @font-face (offline-first, export-ready).
  const state = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const css = useTemplateStore.getState().template.css;
    return {
      rule: css.match(/#f0 \{[^}]*\}/)?.[0] ?? '',
      wrapperTransform: css.match(/#fw0 \{[^}]*\}/)?.[0]?.match(/transform:[^;]*/)?.[0] ?? '',
      fontFaces: (css.match(/Bundled open-source font/g) || []).length,
    };
  });
  expect(state.rule).toContain('font-size: calc(48px * var(--scale))');
  expect(state.rule).toContain('font-weight: 700');
  expect(state.rule).toContain('"Bebas Neue"');
  expect(state.rule).toContain('color: #f5a623');
  expect(state.rule).toContain('letter-spacing: calc(2px * var(--scale))');
  expect(state.wrapperTransform).toContain('translateX(-50%)');
  expect(state.fontFaces).toBe(2); // the heading face + the line's own

  // The canvas/preview shows it (--scale is 1 at 1080p, so 48 design px are 48 px).
  const frame = page.frameLocator('iframe.preview-frame');
  await expect
    .poll(async () =>
      frame.locator('#f0').evaluate((el) => {
        const cs = getComputedStyle(el);
        return { size: cs.fontSize, color: cs.color, family: cs.fontFamily };
      }),
    )
    .toEqual({ size: '48px', color: 'rgb(245, 166, 35)', family: '"Bebas Neue", "Arial Narrow", Arial, sans-serif' });

  // Discrete style edits are ordinary undoable applies.
  await page.keyboard.press('Control+z');
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const { useTemplateStore } = await import('/src/store/templateStore.ts');
        return useTemplateStore.getState().template.css.includes('letter-spacing: calc(2px');
      }),
    )
    .toBe(false);

  // The Style tab is a placed-field surface: the artwork layer doesn't offer it.
  await page.locator('.tlv2-labels .timeline-label[data-part=".imported-design-art"]').click();
  await expect(page.getByTestId('inspector-part-label')).toHaveText('Artwork');
  await expect(page.getByTestId('inspector-tab-style')).toHaveCount(0);
});

test('import graphic: the Style tab\'s Content rows rename and retext a field', async ({ page }) => {
  await createImported(page);
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  await expect(page.getByTestId('inspector')).toBeVisible({ timeout: 3000 });
  await page.getByTestId('inspector-tab-style').click();

  // Label: the DataField's operator-facing title — the timeline row (registry-named from
  // the field) and the SPX definition both follow; the element id never changes.
  await page.getByTestId('inspector-style-label').fill('Guest name');
  await page.getByTestId('inspector-style-label').press('Enter');
  await expect(page.locator('.tlv2-labels .timeline-label[data-part="#f0"]')).toContainText('Guest name');

  // Text: the canvas inline editor's pattern — sample value + definition default together,
  // so the preview shows it immediately and SPX starts from it.
  await page.getByTestId('inspector-style-text-value').fill('Alexandra Riva');
  await awaitPreviewRebuild(page, () =>
    page.getByTestId('inspector-style-text-value').press('Enter'),
  );
  await expect(page.frameLocator('iframe.preview-frame').locator('#f0')).toHaveText('Alexandra Riva');

  const state = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const s = useTemplateStore.getState();
    const f0 = s.template.fields.find((f) => f.field === 'f0');
    return { title: f0?.title, value: f0?.value, sample: s.sampleData['f0'] };
  });
  expect(state.title).toBe('Guest name');
  expect(state.value).toBe('Alexandra Riva');
  expect(state.sample).toBe('Alexandra Riva');
});

// ── Fit: a long operator value has to stay inside the room the design gives the line.
//    Placed lines used to be uncapped and nowrap, so a long name ran clean off the
//    artwork (templates/shared/textFit.ts). ──

/** Select f0, open the Style tab, and set its fit through the real controls. Selecting is
 *  conditional: clicking the row of the ALREADY-selected layer toggles it back off. */
async function setSlot(page: Page, mode: 'shrink' | 'wrap' | 'overflow', width?: number) {
  const selected = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().selectedPart;
  });
  if (selected !== '#f0') {
    await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  }
  // Reveal the Inspector explicitly: it shares the right dock with Data, so a previous
  // measurement left Data active, and an unchanged selection re-reveals nothing.
  await page.getByTestId('dock-tab-inspector').click();
  await expect(page.getByTestId('inspector')).toBeVisible({ timeout: 3000 });
  await page.getByTestId('inspector-tab-style').click();
  await awaitPreviewRebuild(page, () => page.getByTestId(`inspector-style-fit-${mode}`).click());
  if (width !== undefined) {
    await page.getByTestId('inspector-style-fit-width').fill(String(width));
    await awaitPreviewRebuild(page, () =>
      page.getByTestId('inspector-style-fit-width').press('Enter'),
    );
  }
}

/** Push a value through update() and measure the line against its slot in the preview. */
async function measureLine(page: Page, value: string) {
  await page.getByTestId('dock-tab-data').click();
  await page.locator('.panel-body .field-row').first().locator('input').fill(value);
  await page.getByTestId('dock-body-right').getByRole('button', { name: '⟳ Update' }).click();
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('#f0')).toHaveText(value);
  return page.evaluate(() => {
    const doc = (document.querySelector('iframe.preview-frame') as HTMLIFrameElement).contentDocument!;
    const line = doc.getElementById('f0')!;
    const slot = doc.getElementById('fw0')!;
    const fontSize = parseFloat(doc.defaultView!.getComputedStyle(line).fontSize);
    return {
      lineWidth: line.getBoundingClientRect().width,
      slotWidth: slot.getBoundingClientRect().width,
      fontSize,
      // Rows as a RATIO of the line's own type size, not its computed line-height —
      // `line-height: normal` computes to the string "normal", which parses to NaN. One
      // row of text is ~1.2x its font-size; two rows are ~2.4x.
      rowRatio: line.getBoundingClientRect().height / fontSize,
    };
  });
}

/** A single row of text sits well under 1.8x its own type size; more rows sit above it. */
const ONE_ROW = 1.8;

const LONG_NAME = 'Bartholomew Fitzgerald-Wellington III';

test('import graphic: a new field is born with a slot, so a long value cannot run off the design', async ({ page }) => {
  await dropDesign(page);
  await createBare(page);
  await addFieldViaDataTab(page, 'Name');

  // The add emits the whole fit contract: the wrapper's slot, the shrink marker on the
  // line, and the design-owned runtime (with the shared update()'s hook calling it).
  const state = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { lineFit } = await import('/src/blocks/designLayout.ts');
    const t = useTemplateStore.getState().template;
    return {
      fit: lineFit(t.html, t.css, 'f0'),
      marked: /<span id="f0"[^>]*data-fit="shrink"/.test(t.html),
      runtime: t.js.includes('function fitPlacedText'),
      hook: t.js.includes('typeof fitPlacedText'),
    };
  });
  expect(state.fit?.mode).toBe('shrink');
  expect(state.fit!.maxWidth!).toBeGreaterThan(0);
  expect(state.marked).toBe(true);
  expect(state.runtime).toBe(true);
  expect(state.hook).toBe(true);
});

test('import graphic: a long name shrinks to stay inside its slot, and a short one springs back', async ({ page }) => {
  await createImported(page);
  await setSlot(page, 'shrink', 420);

  const design = await measureLine(page, 'Ada Lovelace');
  expect(design.lineWidth).toBeLessThan(420); // comfortably inside — nothing to do

  // The value that used to run off the artwork now fits the slot exactly, on ONE row:
  // the design's own size comes down instead of the text reflowing into the artwork.
  const long = await measureLine(page, LONG_NAME);
  expect(long.lineWidth).toBeLessThanOrEqual(421);
  expect(long.fontSize).toBeLessThan(design.fontSize);
  expect(long.rowRatio).toBeLessThan(ONE_ROW);

  // …and the fit never compounds: a short value returns to the design's own size.
  const back = await measureLine(page, 'Ada Lovelace');
  expect(back.fontSize).toBeCloseTo(design.fontSize, 1);
});

test('import graphic: wrap flows a long value onto more rows, Free lets it run', async ({ page }) => {
  await createImported(page);
  await setSlot(page, 'shrink', 420);
  const shrunk = await measureLine(page, LONG_NAME);

  // Wrap keeps the design's type size and uses more rows inside the same slot.
  await setSlot(page, 'wrap');
  const wrapped = await measureLine(page, LONG_NAME);
  expect(wrapped.fontSize).toBeGreaterThan(shrunk.fontSize);
  expect(wrapped.lineWidth).toBeLessThanOrEqual(421);
  expect(wrapped.rowRatio).toBeGreaterThan(ONE_ROW);

  // Free removes the slot entirely — the original, uncapped behaviour, still available
  // for a line whose length the designer controls.
  await setSlot(page, 'overflow');
  const free = await measureLine(page, LONG_NAME);
  expect(free.lineWidth).toBeGreaterThan(430);
  expect(free.rowRatio).toBeLessThan(ONE_ROW);
  const fit = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { lineFit } = await import('/src/blocks/designLayout.ts');
    const t = useTemplateStore.getState().template;
    return lineFit(t.html, t.css, 'f0');
  });
  expect(fit).toEqual({ mode: 'overflow', maxWidth: null, scaled: true, stretch: false });
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
  await createImported(page);
  await page.getByTestId('dock-tab-export').click();
  // Export is gated on zero validation errors; the panel says so inline.
  await expect(page.locator('.panel-body')).not.toContainText('✗');
});

test('the Text step gives the placement canvas more room than the passive preview', async ({ page }) => {
  // You PLACE fields on the left canvas; the right pane only shows the result. The working
  // surface used to be the smaller of the two (a fixed 520px against a ~700px preview), so
  // text was positioned on a downscaled picture of the artwork.
  await dropDesign(page);
  await page.waitForTimeout(800);
  await page.locator('.wz-next').click(); // Prepare
  await page.locator('.wz-next').click(); // Text
  await expect(page.getByTestId('place-stage')).toBeVisible();
  const working = (await page.getByTestId('place-stage').boundingBox())!;
  const preview = (await page.locator('.wz-stage').boundingBox())!;
  expect(working.width).toBeGreaterThan(preview.width);
  expect(working.width).toBeGreaterThan(700); // and it actually grew, not just won by shrinking the preview
});
