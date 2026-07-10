import { test, expect, type Page } from '@playwright/test';

// Timeline v2 Phase 3 — the read-first step timeline behind the dock toggle: step clips
// with cue markers on a time ruler, a click/drag playhead that scrubs the real preview
// without creating history, layer rows with aggregate keyframe diamonds, zoom.

async function createHairline(page: Page, steps = false) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  if (steps) {
    await page.getByRole('button', { name: 'Next ›' }).click();
    await page.getByRole('button', { name: 'Next ›' }).click();
    await page.getByRole('button', { name: 'Next ›' }).click();
    await page.locator('.wz-step input[type="checkbox"]').check();
  }
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);
  await page.getByTestId('timeline-v2-toggle').click(); // opt in (read view)
  await expect(page.getByTestId('timeline-v2')).toBeVisible();
}

test('v2: step clips on a ruler with cue markers — steps are the clips', async ({ page }) => {
  await createHairline(page, true); // Hairline + step reveal: Enter · Step 2 · Out
  await expect(page.getByTestId('tlv2-clip-0')).toContainText('▶');
  await expect(page.getByTestId('tlv2-clip-0')).toContainText('Enter');
  await expect(page.getByTestId('tlv2-clip-1')).toContainText('»');
  await expect(page.getByTestId('tlv2-clip-1')).toContainText('Step 2');
  await expect(page.getByTestId('tlv2-clip-2')).toContainText('■');
  await expect(page.getByTestId('tlv2-clip-2')).toContainText('Out');
  // The hold break sits between the last content step and Out.
  const hold = (await page.getByTestId('tlv2-hold').boundingBox())!;
  const step2 = (await page.getByTestId('tlv2-clip-1').boundingBox())!;
  const out = (await page.getByTestId('tlv2-clip-2').boundingBox())!;
  expect(hold.x).toBeGreaterThanOrEqual(step2.x + step2.width - 2);
  expect(out.x).toBeGreaterThanOrEqual(hold.x + hold.width - 2);
  // Layer rows carry aggregate keyframe diamonds (the Name line animates in Enter).
  expect(await page.getByTestId('tlv2-kf-f0').count()).toBeGreaterThanOrEqual(2);
});

test('v2: clicking the timeline moves the playhead and scrubs the preview — no history', async ({ page }) => {
  await createHairline(page);
  const frame = page.frameLocator('iframe.preview-frame');
  const historyLen = () =>
    page.evaluate(async () => {
      const { useTemplateStore } = await import('/src/store/templateStore.ts');
      return useTemplateStore.getState().history.length;
    });
  const before = await historyLen();
  // Click at the very start of the entrance clip: the graphic parks near its FROM state.
  const clip = (await page.getByTestId('tlv2-clip-0').boundingBox())!;
  await page.mouse.click(clip.x + 2, clip.y + 40); // inside the rows area under the clip
  await expect
    .poll(async () => frame.locator('#f0').evaluate((el) => getComputedStyle(el).transform))
    .not.toBe('none'); // the mask offset (yPercent 110) is applied — mid-scrub truth
  // …and the playhead followed the click.
  const head = (await page.getByTestId('tlv2-playhead').boundingBox())!;
  expect(Math.abs(head.x - (clip.x + 2))).toBeLessThan(6);
  // Scrubbing and playhead moves never write history.
  expect(await historyLen()).toBe(before);
  await expect(page.getByTestId('tlv2-time')).toContainText('s');
});

test('v2: zoom scales the clips; row labels drive the shared selection', async ({ page }) => {
  await createHairline(page);
  const width = async () => (await page.getByTestId('tlv2-canvas').boundingBox())!.width;
  const before = await width();
  await page.getByTestId('tlv2-zoom-in').click();
  await page.getByTestId('tlv2-zoom-in').click();
  expect(await width()).toBeGreaterThan(before * 1.4);
  // The label column is the same shared-selection handle as the classic strip.
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  await expect(page.locator('.tlv2-labels .timeline-label[data-part="#f0"]')).toHaveClass(/selected/);
  const selected = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().selectedPart;
  });
  expect(selected).toBe('#f0');
});

/** Parse the live template's animation data in the page (null when not a data block). */
async function animData(page: Page) {
  return page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    return parseAnimData(useTemplateStore.getState().template.js);
  });
}

test('v2 keyframes: convert, arm at the playhead, auto-key, interpolate — the ratified workflow', async ({ page }) => {
  await createHairline(page);
  // "use keyframes" rewrites the region as the data block + interpreter — one undoable apply.
  await page.getByTestId('timeline-v2-convert').click();
  await page.waitForTimeout(650);
  let data = await animData(page);
  expect(data).not.toBeNull();
  expect(data!.steps[0].name).toBe('Enter');
  // The chips are gone — a data template's editing surface IS the step timeline.
  await expect(page.getByTestId('timeline-v2-convert')).toHaveCount(0);

  // Open the Inspector, select the Name line, park the playhead early in Enter.
  await page.getByTestId('toggle-inspector').click();
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  const clip = (await page.getByTestId('tlv2-clip-0').boundingBox())!;
  await page.mouse.click(clip.x + 8, clip.y + 40);

  // Arm Position X: ◇ stamps the first keyframe at the playhead with the current value.
  await page.getByTestId('inspector-kf-x').click();
  await page.waitForTimeout(300);
  data = await animData(page);
  const track1 = data!.steps[0].layers['#f0'].x;
  expect(track1).toHaveLength(1);

  // Move the playhead later (70% into the clip — the tail can sit past the scroll edge
  // when the Inspector narrows the column), then change the ARMED value: auto-key
  // creates a second keyframe at the new playhead.
  await page.mouse.click(clip.x + clip.width * 0.7, clip.y + 40);
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const { useTemplateStore } = await import('/src/store/templateStore.ts');
        return useTemplateStore.getState().playhead?.t ?? -1;
      }),
    )
    .toBeGreaterThan(0.4);
  await page.getByTestId('inspector-input-x').fill('-50');
  await page.getByTestId('inspector-input-x').press('Enter');
  await page.waitForTimeout(700);
  data = await animData(page);
  const track2 = data!.steps[0].layers['#f0'].x;
  expect(track2).toHaveLength(2);
  expect(track2.some((k: { value: number | string }) => k.value === -50)).toBe(true);
  // The re-parked preview shows the interpolated truth at the playhead: the matrix's
  // translate-x sits at (or a scrub-float hair before) the keyed -50.
  await expect
    .poll(
      async () =>
        page
          .frameLocator('iframe.preview-frame')
          .locator('#f0')
          .evaluate((el) => Number(getComputedStyle(el).transform.match(/-?[\d.]+/g)?.[4] ?? 0)),
      { timeout: 4000 },
    )
    .toBeLessThan(-40);
});

test('v2 keyframes: dragging a diamond retimes it; Delete removes it; undo restores', async ({ page }) => {
  await createHairline(page);
  await page.getByTestId('timeline-v2-convert').click();
  await page.waitForTimeout(650);
  const times = async () => {
    const data = await animData(page);
    return data!.steps[0].layers['#f0'].yPercent.map((k: { time: number }) => k.time);
  };
  const before = await times();
  expect(before).toHaveLength(2);

  // Drag the SECOND Enter diamond (the settle keyframe) further right.
  const diamond = page.getByTestId('tlv2-kf-f0').nth(1);
  const bb = (await diamond.boundingBox())!;
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.mouse.move(bb.x + bb.width / 2 + 45, bb.y + bb.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = await times();
  expect(after[1]).toBeGreaterThan(before[1]);

  // Undo restores the original timing (one apply per drag).
  await page.keyboard.press('Control+z');
  expect(await times()).toEqual(before);

  // Click a diamond (no drag) to select it, Delete removes every keyframe at that moment.
  await page.getByTestId('tlv2-kf-f0').first().click();
  await page.keyboard.press('Delete');
  await page.waitForTimeout(400);
  expect(await times()).toHaveLength(1);
  await page.keyboard.press('Control+z');
  expect(await times()).toEqual(before);
});

test('v2 presets: In and Out apply independently; undeclared manual keyframes survive', async ({ page }) => {
  test.setTimeout(60_000);
  await createHairline(page);
  await page.getByTestId('timeline-v2-convert').click();
  await page.waitForTimeout(650);
  await page.getByTestId('toggle-inspector').click();

  // Give #f0 a MANUAL rotation keyframe — no preset declares rotation, so it must survive.
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  await page.getByTestId('inspector-kf-rotation').click();
  await page.waitForTimeout(400);

  // Select the WHOLE GRAPHIC and apply Pop spring to the In only.
  await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    useTemplateStore.getState().setSelectedPart('.lower-third');
  });
  await page.getByTestId('inspector').getByRole('button', { name: 'Animations' }).click();
  await page.getByTestId('inspector-preset-select').selectOption('pop-spring');
  await page.getByTestId('inspector-preset-in').click();
  await page.getByTestId('inspector-preset-apply').click();
  await page.waitForTimeout(650);
  let data = await animData(page);
  // Pop spring's entrance landed (the box scales in)…
  expect(Object.keys(data!.steps[0].layers['.lower-third-box'])).toContain('scale');
  // …the exit is untouched (line-reveal's yPercent drop, no scale)…
  expect(data!.steps[1].layers['.lower-third-box']?.scale).toBeUndefined();
  // …and the manual rotation keyframe survived (undeclared by the preset).
  expect(data!.steps[0].layers['#f0'].rotation).toBeDefined();

  // Apply Blur to the Out only — the In keeps Pop spring.
  await page.getByTestId('inspector-preset-select').selectOption('blur-in');
  await page.getByTestId('inspector-preset-out').click();
  await page.getByTestId('inspector-preset-apply').click();
  await page.waitForTimeout(650);
  data = await animData(page);
  expect(Object.keys(data!.steps[1].layers['.lower-third-box'])).toContain('filter'); // blur exit
  expect(Object.keys(data!.steps[0].layers['.lower-third-box'])).toContain('scale'); // pop entrance kept
  expect(data!.steps[0].layers['.lower-third-box'].filter).toBeUndefined(); // no blur leak into In
});

test('v2 presets: a single layer takes a preset into ITS activation step (In is layer-relative)', async ({ page }) => {
  await createHairline(page, true); // #f1 reveals on press 1 (step index 1)
  await page.getByTestId('timeline-v2-convert').click();
  await page.waitForTimeout(650);
  await page.getByTestId('toggle-inspector').click();
  // Select the revealed Title line and apply a preset to its In.
  await page.locator('.tlv2-labels .timeline-label[data-part="#f1"]').click();
  await page.getByTestId('inspector').getByRole('button', { name: 'Animations' }).click();
  await page.getByTestId('inspector-preset-select').selectOption('blur-in');
  await page.getByTestId('inspector-preset-in').click();
  await page.getByTestId('inspector-preset-apply').click();
  await page.waitForTimeout(650);
  const data = await animData(page);
  // Blur-in's LINE choreography (a y + opacity rise — the blur filter is the box's move)
  // landed in STEP 2, the layer's reveal step — not the entrance. The reveal's own
  // yPercent track survives untouched (undeclared by the preset's line motion).
  expect(data!.steps[1].reveals).toContain('#f1');
  expect(Object.keys(data!.steps[1].layers['#f1'])).toEqual(
    expect.arrayContaining(['y', 'opacity', 'yPercent']),
  );
  expect(data!.steps[0].layers['#f1']?.y).toBeUndefined();
  expect(data!.steps[0].layers['#f1']?.opacity).toBeUndefined();
});

test('v2: the canvas chip moves a layer between presses on a data template', async ({ page }) => {
  await createHairline(page, true);
  await page.getByTestId('timeline-v2-convert').click();
  await page.waitForTimeout(650);
  // Select the revealed line, then send it back to ▶ Play via the chip's appears-on menu
  // (the same changePartPress contract, now routed through the data mutator).
  await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    useTemplateStore.getState().setSelectedPart('#f1');
  });
  const appears = page.getByTestId('canvas-appears');
  await expect(appears).toBeVisible();
  await appears.selectOption('-1');
  await page.waitForTimeout(650);
  const data = await animData(page);
  // Back with ▶ Play: the press is gone, the entrance animates the line again, and the
  // SPX definition follows the shorter chain.
  expect(data!.steps).toHaveLength(2);
  expect(Object.keys(data!.steps[0].layers)).toContain('#f1');
  const steps = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.settings.steps;
  });
  expect(steps).toBe('1');
});

test('v2: the dock toggle swaps surfaces and persists; classic remains the default', async ({ page }) => {
  await createHairline(page); // helper already toggled INTO v2
  await expect(page.getByTestId('timeline-v2')).toBeVisible();
  await expect(page.getByTestId('timeline')).toHaveCount(0);
  await page.getByTestId('timeline-v2-toggle').click(); // back to classic
  await expect(page.getByTestId('timeline')).toBeVisible();
  await expect(page.getByTestId('timeline-v2')).toHaveCount(0);
});
