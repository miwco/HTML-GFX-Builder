import { test, expect, type Page } from '@playwright/test';
import { canvasBox, elementPoint } from './_canvas';

// The off-canvas pasteboard (plans/happy-marinating-pebble.md): the editor shows a working
// margin around the canvas so content positioned OUTSIDE the canvas is visible and editable.
// These are the acceptance tests — the real animation workflow, code↔canvas sync, and
// preset-authored off-canvas positions — plus the hard invariant that the pad is a pure
// editor-view concept and never enters persisted, canvas-local coordinates.

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

/** Select the Name line (#f0) and park the playhead mid-entrance so a canvas drag keys x/y. */
async function selectAndPark(page: Page, t = 0.35) {
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  await expect(page.getByTestId('inspector')).toBeVisible({ timeout: 3000 });
  await page.evaluate((time) => {
    void (async () => {
      const { useTemplateStore } = await import('/src/store/templateStore.ts');
      const s = useTemplateStore.getState();
      s.setPlayhead({ step: 0, t: time });
      s.sendScrub('in', time);
    })();
  }, t);
  await page.waitForTimeout(200);
}

test('drag an element fully into the pasteboard: negative keyframe, still visible + selectable', async ({ page }) => {
  await createHairline(page);
  await selectAndPark(page);

  const canvasBefore = await canvasBox(page);
  const start = await elementPoint(page, '#f0');
  // Drag left far enough to cross the canvas edge into the pasteboard: ~520 canvas px, which
  // (at the current scale) lands #f0 well past x = 0.
  const dxCanvas = 520;
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - dxCanvas * start.scale, start.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  // The keyframe written is CANVAS-LOCAL and negative — the pad never leaks in.
  const data = await animData(page);
  const xs = (data!.steps[0].layers['#f0']?.x ?? []).map((k) => k.value as number);
  expect(Math.min(...xs)).toBeLessThan(-100);

  // The element now renders OUTSIDE the canvas (left of the canvas-bounds left edge)…
  const after = await elementPoint(page, '#f0');
  expect(after.x).toBeLessThan(canvasBefore.x);

  // …and it is still selectable out there in the pasteboard.
  await page.mouse.click(after.x, after.y);
  const sel = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().selectedPart;
  });
  expect(sel).toBe('#f0');
});

test('the pasteboard pad never enters persisted state; export stays clipped to the canvas', async ({ page }) => {
  await createHairline(page);
  await selectAndPark(page);
  const start = await elementPoint(page, '#f0');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 300 * start.scale, start.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  const probe = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { composeDocument } = await import('/src/preview/composeDocument.ts');
    const { computePad } = await import('/src/components/pasteboard.ts');
    const tpl = useTemplateStore.getState().template;
    const { padX } = computePad(tpl.resolution);
    return {
      padX,
      // The preview/export composition WITHOUT authoring keeps the canvas clip and no pasteboard.
      exportDoc: composeDocument(tpl),
      authoringDoc: composeDocument(tpl, { authoring: { padX, padY: 0 } }),
      // Everything persisted lives in the template — serialize it whole and search for the pad.
      serialized: JSON.stringify(tpl),
    };
  });

  // Sanity: the pad is real (non-zero) so the negative-below tests are meaningful.
  expect(probe.padX).toBeGreaterThan(0);
  // Semantic, not numeric: the persisted template carries no authoring/pad concept at all.
  expect(probe.serialized).not.toContain('pasteboard');
  expect(probe.serialized).not.toContain('padX');
  expect(probe.serialized).not.toContain('spx-authoring-style');
  // The exported/on-air document clips to the true canvas; only the authoring preview opts in.
  expect(probe.exportDoc).toContain('overflow: hidden');
  expect(probe.exportDoc).not.toContain('spx-authoring-style');
  expect(probe.authoringDoc).toContain('spx-authoring-style');
});

test('code ↔ canvas: a negative x written in code renders on the pasteboard and stays selectable', async ({ page }) => {
  await createHairline(page);

  // Author an off-canvas entrance x = -400 for #f0 directly in the template code — the same
  // canvas-local coordinate a preset generator or a hand edit would write.
  await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { parseAnimData, spliceAnimData } = await import('/src/blocks/animData.ts');
    const { setKeyframe } = await import('/src/blocks/animEdit.ts');
    const s = useTemplateStore.getState();
    const data = parseAnimData(s.template.js)!;
    const next = setKeyframe(data, 0, '#f0', 'x', 0, -400);
    s.applyTemplate({ ...s.template, js: spliceAnimData(s.template.js, next)! });
    s.setPlayhead({ step: 0, t: 0 });
    s.sendScrub('in', 0);
  });
  await page.waitForTimeout(500);

  // The value round-trips as the canvas-local -400 (not pad-shifted).
  const data = await animData(page);
  const kf = (data!.steps[0].layers['#f0']?.x ?? []).find((k) => Math.abs((k.value as number) + 400) < 1);
  expect(kf, 'the x = -400 keyframe is in the code').toBeTruthy();

  // At t = 0 the element renders in the pasteboard (left of the canvas) and is selectable.
  const canvas = await canvasBox(page);
  const p = await elementPoint(page, '#f0');
  expect(p.x).toBeLessThan(canvas.x);
  await page.mouse.click(p.x, p.y);
  const sel = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().selectedPart;
  });
  expect(sel).toBe('#f0');
});

test('preset-authored off-canvas: a slide preset entrance renders + selects on the pasteboard', async ({ page }) => {
  await createHairline(page);

  // Apply the slide preset's entrance to the panel (the layer the slide preset actually
  // animates) through the SAME deterministic generator the Inspector uses (presetApply), then
  // deepen its start so the preset-authored entrance clears the canvas edge — a preset
  // producing a big travel is the same code path, larger value. This proves preset positions
  // outside the canvas render and hit-test, not just manual drags.
  const authored = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { parseAnimData, spliceAnimData } = await import('/src/blocks/animData.ts');
    const { presetDonor, applyPresetData } = await import('/src/blocks/presetApply.ts');
    const { computePad } = await import('/src/components/pasteboard.ts');
    const s = useTemplateStore.getState();
    const data = parseAnimData(s.template.js)!;
    const donor = presetDonor(s.template, data, 'slide-up');
    if (!donor) return { ok: false };
    const next = applyPresetData(data, donor, 'in', '.lower-third-box');
    if (!next) return { ok: false };
    // slide-up is a vertical slide: the panel enters on `y`. Compute the push from the box's
    // SETTLED canvas position so its entrance start lands ~120 px below the canvas edge — well
    // off-canvas, inside the bottom pasteboard — regardless of the template layout.
    const ys = next.steps[0].layers['.lower-third-box']?.y;
    if (!ys || !ys.length) return { ok: false };
    const { padY } = computePad(s.template.resolution);
    const iframe = document.querySelector('iframe.preview-frame') as HTMLIFrameElement;
    const box = iframe.contentDocument!.querySelector('.lower-third-box')!.getBoundingClientRect();
    const settledCanvasCenterY = box.top + box.height / 2 - padY; // doc px → canvas px
    ys[0].value = Math.round(s.template.resolution.height + 120 - settledCanvasCenterY);
    s.applyTemplate({ ...s.template, js: spliceAnimData(s.template.js, next)! });
    return { ok: true, entryY: ys[0].value };
  });
  expect(authored.ok).toBeTruthy();
  expect(authored.entryY as number).toBeGreaterThan(0);
  await page.waitForTimeout(500); // let the debounced rebuild settle first

  // Scrub to the entrance start AFTER the rebuild, so the preview seeks to the off-canvas
  // frame (issuing it before the rebuild would be overridden by the settle). A hair past zero:
  // GSAP renders nothing at exactly pause(0) (lazy first render), so 0 would show the settled
  // state instead of the entrance frame.
  await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const s = useTemplateStore.getState();
    s.setPlayhead({ step: 0, t: 0.01 });
    s.sendScrub('in', 0.01);
  });
  await page.waitForTimeout(300);

  const canvas = await canvasBox(page);
  const p = await elementPoint(page, '.lower-third-box');
  // Rendered below the canvas, in the bottom pasteboard, at the preset entrance.
  expect(p.y).toBeGreaterThan(canvas.y + canvas.height);
  await page.mouse.click(p.x, p.y);
  const sel = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().selectedPart;
  });
  expect(sel).toBe('.lower-third-box');
});
