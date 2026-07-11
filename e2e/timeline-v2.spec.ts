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
  // Lower thirds create AS data blocks — the step timeline is their native surface.
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
  let data = await animData(page);
  expect(data).not.toBeNull();
  expect(data!.steps[0].name).toBe('Enter');
  // The chips are gone — a data template's editing surface IS the step timeline.
  await expect(page.getByTestId('timeline-v2-convert')).toHaveCount(0);

  // Open the Inspector, select the Name line, park the playhead early in Enter.
  await page.getByTestId('toggle-inspector').click();
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  // Zoom out so the WHOLE Enter clip fits the narrowed scroll viewport (Inspector open,
  // editing-scale labels) — later clicks at 70% must land on the ribbon, not past its edge.
  await page.getByTestId('tlv2-zoom-out').click();
  await page.getByTestId('tlv2-zoom-out').click();
  await page.getByTestId('tlv2-zoom-out').click();
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

test('v2 clips: right-edge resize preserves keyframe timing; Alt-drag stretches it', async ({ page }) => {
  await createHairline(page);
  const enter = async () => {
    const data = await animData(page);
    return {
      duration: data!.steps[0].duration,
      times: data!.steps[0].layers['#f0'].yPercent.map((k: { time: number }) => k.time),
    };
  };
  const before = await enter();

  // Default drag: the step gets LONGER, keyframes stay put (settled air at the end).
  const handle = page.getByTestId('tlv2-clip-handle-0');
  let bb = (await handle.boundingBox())!;
  await page.mouse.move(bb.x + 3, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.mouse.move(bb.x + 3 + 60, bb.y + bb.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const extended = await enter();
  expect(extended.duration).toBeGreaterThan(before.duration);
  expect(extended.times).toEqual(before.times);

  // Shrinking clamps at the step's LAST keyframe across every layer — motion never
  // silently truncates (Hairline's second line settles later than the first).
  const lastKf = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const d = parseAnimData(useTemplateStore.getState().template.js)!;
    let last = 0;
    for (const tracks of Object.values(d.steps[0].layers))
      for (const kfs of Object.values(tracks as Record<string, { time: number }[]>))
        for (const kf of kfs) last = Math.max(last, kf.time);
    return last;
  });
  bb = (await page.getByTestId('tlv2-clip-handle-0').boundingBox())!;
  await page.mouse.move(bb.x + 3, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.mouse.move(bb.x + 3 - 500, bb.y + bb.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const clamped = await enter();
  expect(clamped.duration).toBeCloseTo(lastKf, 2);

  // Alt-drag stretches: duration AND keyframe times scale together.
  bb = (await page.getByTestId('tlv2-clip-handle-0').boundingBox())!;
  await page.keyboard.down('Alt');
  await page.mouse.move(bb.x + 3, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.mouse.move(bb.x + 3 + 80, bb.y + bb.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Alt');
  await page.waitForTimeout(400);
  const stretched = await enter();
  expect(stretched.duration).toBeGreaterThan(clamped.duration);
  expect(Math.max(...stretched.times)).toBeGreaterThan(Math.max(...clamped.times));
});

test('v2 clips: context menu duplicates, renames, deletes; the definition follows', async ({ page }) => {
  test.setTimeout(60_000);
  await createHairline(page, true); // Enter · Step 2 (reveals #f1) · Out
  const stepsSetting = () =>
    page.evaluate(async () => {
      const { useTemplateStore } = await import('/src/store/templateStore.ts');
      return useTemplateStore.getState().template.settings.steps;
    });
  expect(await stepsSetting()).toBe('2');

  // Duplicate the reveal step: its keyframes copy, its reveals do NOT (a layer activates
  // once), and the SPX steps count follows the longer chain.
  await page.getByTestId('tlv2-clip-1').click({ button: 'right' });
  await page.getByTestId('tlv2-menu-duplicate').click();
  await page.waitForTimeout(400);
  let data = await animData(page);
  expect(data!.steps).toHaveLength(4);
  expect(Object.keys(data!.steps[2].layers)).toContain('#f1'); // copied keyframes
  expect(data!.steps[2].reveals ?? []).toHaveLength(0); // reveals cleared
  expect(await stepsSetting()).toBe('3');

  // Rename the duplicate.
  await page.getByTestId('tlv2-clip-2').click({ button: 'right' });
  await page.getByTestId('tlv2-menu-rename').click();
  await page.getByTestId('tlv2-rename-input').fill('Answer B');
  await page.getByTestId('tlv2-rename-input').press('Enter');
  await page.waitForTimeout(400);
  await expect(page.getByTestId('tlv2-clip-2')).toContainText('Answer B');

  // Delete the ORIGINAL reveal press: #f1 returns to ▶ Play with an entrance of its own.
  await page.getByTestId('tlv2-clip-1').click({ button: 'right' });
  await page.getByTestId('tlv2-menu-delete').click();
  await page.waitForTimeout(400);
  data = await animData(page);
  expect(data!.steps).toHaveLength(3);
  expect(Object.keys(data!.steps[0].layers)).toContain('#f1');
  expect(await stepsSetting()).toBe('2');

  // Undo restores the deleted press (structural edits are one apply each).
  await page.keyboard.press('Control+z');
  data = await animData(page);
  expect(data!.steps).toHaveLength(4);
});

test('v2 clips: »+ adds an authoring step; the hold popover edits how the graphic leaves', async ({ page }) => {
  await createHairline(page);

  // »+ adds an empty content step before Out (an authoring target), definition synced.
  await page.getByTestId('tlv2-add-step').click();
  await page.waitForTimeout(400);
  const data = await animData(page);
  expect(data!.steps).toHaveLength(3);
  expect(data!.steps[1].name).toBe('Step 2');
  await expect(page.getByTestId('tlv2-clip-1')).toContainText('Step 2');

  // The hold popover writes the SPX out setting; auto-out widens the hold to real time.
  const holdBefore = (await page.getByTestId('tlv2-hold').boundingBox())!;
  await page.getByTestId('tlv2-hold').click();
  await page.getByTestId('tlv2-out-mode').selectOption('auto');
  await page.waitForTimeout(500);
  const out = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.settings.out;
  });
  expect(out).toBe('5000');
  const holdAfter = (await page.getByTestId('tlv2-hold').boundingBox())!;
  expect(holdAfter.width).toBeGreaterThan(holdBefore.width + 40);
});

test('v2: Space plays; arrows nudge the selected keyframe on the grid', async ({ page }) => {
  await createHairline(page);
  // Space = ▶ Play (never while typing): the simulator owns a fresh running timeline.
  await page.keyboard.press(' ');
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const w = (document.querySelector('iframe.preview-frame') as HTMLIFrameElement)
          .contentWindow as { __activeTl?: unknown } | null;
        return !!w?.__activeTl;
      }),
    )
    .toBe(true);
  // Select a diamond and nudge it right one grid step (0.05 s).
  const times = async () => {
    const data = await animData(page);
    return data!.steps[0].layers['#f0'].yPercent.map((k: { time: number }) => k.time);
  };
  const before = await times();
  await page.getByTestId('tlv2-kf-f0').first().click();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  const after = await times();
  expect(Math.min(...after)).toBeCloseTo(Math.min(...before) + 0.05, 2);
});

test('v2 polish: the playhead cap drags; the view follows playback when zoomed in', async ({ page }) => {
  await createHairline(page);
  // Zoom far in so the ribbon outgrows its viewport, then Play: the scroll follows.
  for (let i = 0; i < 6; i++) await page.getByTestId('tlv2-zoom-in').click();
  const scrollLeft = () => page.locator('.tlv2-scroll').evaluate((el) => el.scrollLeft);
  expect(await scrollLeft()).toBe(0);
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect.poll(scrollLeft, { timeout: 4000 }).toBeGreaterThan(50);

  // The cap is a real grab handle: dragging it scrubs (and never writes history).
  const historyLen = () =>
    page.evaluate(async () => {
      const { useTemplateStore } = await import('/src/store/templateStore.ts');
      return useTemplateStore.getState().history.length;
    });
  const before = await historyLen();
  const cap = (await page.getByTestId('tlv2-playhead-cap').boundingBox())!;
  await page.mouse.move(cap.x + cap.width / 2, cap.y + 4);
  await page.mouse.down();
  await page.mouse.move(cap.x + cap.width / 2 - 80, cap.y + 4, { steps: 6 });
  await page.mouse.up();
  const parked = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().playhead;
  });
  expect(parked).not.toBeNull();
  expect(await historyLen()).toBe(before);
});

test('v2 polish: keyframe and step eases from the menus; ◀ ▶ jumps; label scrubbing', async ({ page }) => {
  test.setTimeout(60_000);
  await createHairline(page);
  await page.getByTestId('toggle-inspector').click();
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();

  // Right-clicking a diamond opens its ease menu — the curve INTO that keyframe.
  await page.getByTestId('tlv2-kf-f0').first().click({ button: 'right' });
  await page.getByTestId('tlv2-kf-ease').selectOption('back.out(1.6)');
  await page.waitForTimeout(400);
  let data = await animData(page);
  const eased = data!.steps[0].layers['#f0'].yPercent.find((k: { ease?: string }) => k.ease === 'back.out(1.6)');
  expect(eased).toBeTruthy();

  // The clip menu carries the step's DEFAULT ease.
  await page.getByTestId('tlv2-clip-0').click({ button: 'right' });
  await page.getByTestId('tlv2-menu-ease').selectOption('power2.out');
  await page.waitForTimeout(400);
  data = await animData(page);
  expect(data!.steps[0].ease).toBe('power2.out');

  // ◀ jumps the playhead to the property's previous keyframe.
  const clip = (await page.getByTestId('tlv2-clip-0').boundingBox())!;
  await page.mouse.click(clip.x + clip.width * 0.65, clip.y + 40); // park mid-step
  await page.getByTestId('inspector-prev-yPercent').click();
  const speed = data!.speed || 1;
  const kfTimes = data!.steps[0].layers['#f0'].yPercent.map((k: { time: number }) => k.time / speed);
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const { useTemplateStore } = await import('/src/store/templateStore.ts');
        return useTemplateStore.getState().playhead?.t ?? -1;
      }),
    )
    .toBeCloseTo(Math.max(...kfTimes.filter((t: number) => t < 0.6)), 1);

  // Dragging the LABEL scrubs the armed value and keys it at the playhead on release.
  const label = page.locator('.inspector-row-label.scrubbable', { hasText: 'Y (mask %)' });
  const lb = (await label.boundingBox())!;
  await page.mouse.move(lb.x + 10, lb.y + lb.height / 2);
  await page.mouse.down();
  await page.mouse.move(lb.x + 10 + 40, lb.y + lb.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  data = await animData(page);
  const values = data!.steps[0].layers['#f0'].yPercent.map((k: { value: number | string }) => k.value);
  expect(values.some((v: number | string) => v === 40 || v === 150)).toBe(true); // 0+40 or 110+40
});

test('v2: legacy categories keep the classic strip, can peek at v2, and convert on demand', async ({ page }) => {
  // Info cards have not migrated: classic is their default editing surface.
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Info cards' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline Card' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);
  await expect(page.getByTestId('timeline')).toBeVisible();
  await expect(page.getByTestId('timeline-v2')).toHaveCount(0);
  // The chip opens the v2 read view…
  await page.getByTestId('timeline-v2-toggle').click();
  await expect(page.getByTestId('timeline-v2')).toBeVisible();
  // …and "use keyframes" converts the region — one undoable apply; the chips retire.
  await page.getByTestId('timeline-v2-convert').click();
  await page.waitForTimeout(650);
  const js = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });
  expect(js).toContain('var NOACG_ANIM');
  await expect(page.getByTestId('timeline-v2-convert')).toHaveCount(0);
  // Undo restores the legacy code — the chips return (the v2 preference persists), and
  // one more toggle goes back to the classic strip.
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('timeline-v2-convert')).toBeVisible();
  await page.getByTestId('timeline-v2-toggle').click();
  await expect(page.getByTestId('timeline')).toBeVisible();
});
