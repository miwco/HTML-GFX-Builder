import { test, expect, type Page } from '@playwright/test';

// Canvas position keyframing (Timeline v2): dragging the SELECTED layer on the canvas
// writes/updates its x and y keyframes at the parked playhead — ONE undoable apply on
// release — but only when BOTH position properties are armed in the Inspector. Everything
// else keeps the classic gestures exactly: a drag starting anywhere on the graphic
// re-anchors the ROOT via the zone patch, and Escape cancels without touching the code.

async function createHairline(page: Page) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);
  await expect(page.getByTestId('timeline-v2')).toBeVisible();
}

/** Parse the live template's animation data in the page. */
async function animData(page: Page) {
  return page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    return parseAnimData(useTemplateStore.getState().template.js);
  });
}

async function historyLen(page: Page) {
  return page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().history.length;
  });
}

/** An element's center in PAGE coordinates (the canvas layer overlays the stage 1:1),
 *  plus the screen-px→canvas-px scale for delta math. */
async function centerOf(page: Page, selector: string) {
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator(selector)).toBeVisible();
  const stage = (await page.locator('.preview-stage').boundingBox())!;
  const rect = await frame.locator(selector).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: window.innerWidth };
  });
  const scale = stage.width / rect.w; // screen px per canvas px
  return { x: stage.x + rect.x * scale, y: stage.y + rect.y * scale, scale };
}

/** Select the Name line, park the playhead mid-Enter, and arm Position X + Y. */
async function armPosition(page: Page) {
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  // A new selection auto-opens the Inspector — wait for the pane, not the toggle.
  await expect(page.getByTestId('inspector-pane')).toBeVisible();
  const clip = (await page.getByTestId('tlv2-clip-0').boundingBox())!;
  await page.mouse.click(clip.x + clip.width * 0.5, clip.y + 40);
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const { useTemplateStore } = await import('/src/store/templateStore.ts');
        return useTemplateStore.getState().playhead?.t ?? -1;
      }),
    )
    .toBeGreaterThan(0.2);
  await page.getByTestId('inspector-kf-x').click();
  await page.waitForTimeout(800); // apply + debounced rebuild + re-park
  await page.getByTestId('inspector-kf-y').click();
  await page.waitForTimeout(800);
}

test('dragging an armed layer keys x/y at the playhead — one undoable apply', async ({ page }) => {
  await createHairline(page);
  await armPosition(page);
  const playheadBefore = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().playhead;
  });
  const before = await historyLen(page);

  // Drag the Name line 80 px right and 30 px down on screen.
  const c = await centerOf(page, '#f0');
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 80, c.y + 30, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(800);

  // The x/y keyframes at the playhead moved to the dragged position (canvas px).
  const data = await animData(page);
  const tracks = data!.steps[0].layers['#f0'];
  expect(tracks.x).toHaveLength(1);
  expect(tracks.y).toHaveLength(1);
  expect(Number(tracks.x[0].value)).toBeCloseTo(80 / c.scale, 0);
  expect(Number(tracks.y[0].value)).toBeCloseTo(30 / c.scale, 0);
  // The keyframes sit at the parked playhead's moment.
  expect(Math.abs(tracks.x[0].time - playheadBefore!.t)).toBeLessThan(0.02);

  // ONE undoable apply for the whole gesture; the playhead stayed parked.
  expect(await historyLen(page)).toBe(before + 1);
  const playheadAfter = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().playhead;
  });
  expect(playheadAfter).toEqual(playheadBefore);

  // Undo removes both keyframes again (the pair went in as one edit).
  await page.keyboard.press('Control+z');
  await expect
    .poll(async () => {
      const d = await animData(page);
      const t = d!.steps[0].layers['#f0'];
      return Number(t.x?.[0]?.value ?? 0) + Number(t.y?.[0]?.value ?? 0);
    })
    .toBe(0);
});

test('without armed X/Y the drag keeps the classic root zone patch — no keyframes', async ({ page }) => {
  await createHairline(page);
  // Select the Name line but do NOT arm position — the classic gesture must win.
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  const jsBefore = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });

  const c = await centerOf(page, '#f0');
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 150, c.y - 120, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(650);

  // The animation data is untouched; the gesture landed as a CSS zone patch instead.
  const after = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const s = useTemplateStore.getState();
    return { js: s.template.js, cssChanged: !!s.lastChange?.ranges.css };
  });
  expect(after.js).toBe(jsBefore);
  expect(after.cssChanged).toBe(true);
  const data = await animData(page);
  expect(data!.steps[0].layers['#f0'].x).toBeUndefined();
});

test('Escape cancels a layer drag — nothing written, the layer springs back', async ({ page }) => {
  await createHairline(page);
  await armPosition(page);
  const before = await historyLen(page);
  const jsBefore = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });

  const c = await centerOf(page, '#f0');
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 90, c.y + 40, { steps: 6 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await page.waitForTimeout(400);

  const after = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });
  expect(after).toBe(jsBefore);
  expect(await historyLen(page)).toBe(before);
  // The live GSAP preview was reset — the layer's x is back where the drag found it.
  const x = await page
    .frameLocator('iframe.preview-frame')
    .locator('#f0')
    .evaluate((el) => Number((window as unknown as { gsap: { getProperty: (t: Element, p: string) => number } }).gsap.getProperty(el, 'x')));
  expect(Math.abs(x)).toBeLessThan(1);
});
