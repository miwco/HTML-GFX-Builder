import { test, expect, type Page } from '@playwright/test';
import { awaitPreviewRebuild } from './_preview';
import { lowerThirdPng, framedCardPng, CARD_TEXT_RECT } from './_png';
import { elementPoint } from './_canvas';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';

// Canvas usability on an imported design (docs/IMPORT_MVP.md): the artwork and the fields
// placed on it are ONE composition — scaling keeps them together as design-layout CSS — and
// the canvas behaves like the editors people already know: space-drag pans, a press on the
// visible topmost element moves THAT element, and the locked artwork never steals the gesture.

async function dropDesign(page: Page, file = { name: 'lower-third.png', mimeType: 'image/png' }) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="import-graphic"]').click();
  await page.locator('.wz-drop input[type="file"]').setInputFiles({
    ...file,
    buffer: lowerThirdPng(1920, 1080),
  });
}

async function createBare(page: Page) {
  await awaitPreviewRebuild(page, async () => {
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page.locator('.wz-modal')).toBeHidden();
  });
}

async function addFieldViaDataTab(page: Page, title: string) {
  await page.getByTestId('dock-tab-data').click();
  await page.locator('.field-add-row input').fill(title);
  await awaitPreviewRebuild(page, () => page.getByRole('button', { name: '+ Add' }).click());
}

async function createImported(page: Page) {
  await dropDesign(page);
  await createBare(page);
  await addFieldViaDataTab(page, 'Name');
}

/** The composition's geometry, measured in the live preview: the artwork's box, the field's
 *  position and size RELATIVE to it, plus the code facts a grouped scale must respect. */
async function composition(page: Page) {
  const inFrame = await page.frameLocator('iframe.preview-frame').locator('.imported-design-art').evaluate((art) => {
    const doc = art.ownerDocument;
    const a = art.getBoundingClientRect();
    const f = doc.getElementById('f0')!.getBoundingClientRect();
    return {
      artW: a.width,
      artH: a.height,
      // Where the text sits inside the artwork, as a FRACTION of it — the thing a grouped
      // scale must hold constant.
      relX: (f.left - a.left) / a.width,
      relY: (f.top - a.top) / a.height,
      relFont: parseFloat(getComputedStyle(doc.getElementById('f0')!).fontSize) / a.width,
      scaleVar: parseFloat(getComputedStyle(doc.documentElement).getPropertyValue('--scale')) || 1,
    };
  });
  const inCode = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const { getCssVariable } = await import('/src/blocks/cssVars.ts');
    const s = useTemplateStore.getState();
    const data = parseAnimData(s.template.js);
    const tracksOf = (sel: string) =>
      (data?.steps ?? []).flatMap((step) => Object.keys(step.layers[sel] ?? {}));
    return {
      cssScale: parseFloat(getCssVariable(s.template.css, 'scale') ?? '1'),
      artTracks: tracksOf('.imported-design-art'),
      boxTracks: tracksOf('.imported-design-box'),
      history: s.history.length,
    };
  });
  return { ...inFrame, ...inCode };
}

/** Drag a handle by (dx, dy) screen px. */
async function dragHandle(page: Page, testId: string, dx: number, dy: number) {
  const box = (await page.getByTestId(testId).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 8 });
  await page.mouse.up();
}

test('import graphic: scaling the design scales the artwork and its fields together', async ({ page }) => {
  await createImported(page);

  // Select the artwork from the timeline (the layer list), like any layer.
  await page.locator('.tlv2-labels .timeline-label[data-part=".imported-design-art"]').click();
  await expect(page.getByTestId('inspector')).toBeVisible({ timeout: 3000 });

  // The artwork is not a layer you can scale on its own: the design unit's corner handle is
  // the DESIGN scale handle, so the keyframe scale/rotate handles step aside for it.
  await expect(page.getByTestId('layer-scale-handle')).toHaveCount(0);
  await expect(page.getByTestId('layer-rotate-handle')).toHaveCount(0);
  await expect(page.getByTestId('scale-handle')).toBeVisible();

  const before = await composition(page);
  await dragHandle(page, 'scale-handle', 120, 68);
  await awaitPreviewRebuild(page);

  const after = await composition(page);
  expect(after.artW).toBeGreaterThan(before.artW * 1.05);
  // The composition survived: the field kept its place ON the artwork and its relative size.
  expect(after.relX).toBeCloseTo(before.relX, 2);
  expect(after.relY).toBeCloseTo(before.relY, 2);
  expect(after.relFont).toBeCloseTo(before.relFont, 3);
  // …and it is DESIGN layout, not motion: one --scale patch, zero keyframes.
  expect(after.cssScale).toBeGreaterThan(before.cssScale);
  expect(after.artTracks).toEqual(before.artTracks);
  expect(after.boxTracks).toEqual(before.boxTracks);
  expect(after.history).toBe(before.history + 1);

  // Fields stay independently editable after a grouped scale: the field's own corner handle
  // is back the moment it is selected.
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  await expect(page.getByTestId('line-size-handle')).toBeVisible();
});

/** What a gesture wrote: the field's placement, the artwork's motion, the root's anchor. */
async function writes(page: Page) {
  return page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { placedLines } = await import('/src/blocks/designLayout.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const s = useTemplateStore.getState();
    const data = parseAnimData(s.template.js);
    const tracksOf = (sel: string) =>
      (data?.steps ?? []).flatMap((step) => Object.keys(step.layers[sel] ?? {})).sort();
    const root = s.template.css.match(/\.imported-design\s*\{([^}]*)\}/)?.[1] ?? '';
    return {
      place: placedLines(s.template.html, s.template.css)['#f0'] ?? null,
      artTracks: tracksOf('.imported-design-art'),
      rootRule: root.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim(),
      selected: s.selectedParts,
    };
  });
}

/** A press-and-drag straight from a point in the preview — no selection click first. */
async function dragFrom(page: Page, selector: string, at: [number, number], by: [number, number]) {
  const c = await elementPoint(page, selector, at[0], at[1]);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + by[0], c.y + by[1], { steps: 8 });
  await page.mouse.up();
  return c.scale;
}

test('import graphic: dragging visible text moves the TEXT, not the artwork under it', async ({ page }) => {
  await createImported(page);
  // Start from nothing selected (a field arrives selected, so Escape clears it): the press
  // itself has to do both jobs.
  await page.keyboard.press('Escape');
  const before = await writes(page);
  expect(before.selected).toEqual([]);

  const scale = await dragFrom(page, '#f0', [0.5, 0.5], [110, -70]);
  await awaitPreviewRebuild(page);

  const after = await writes(page);
  // One gesture selected the text AND placed it — no select-then-drag round trip.
  expect(after.selected).toEqual(['#f0']);
  expect(after.place!.x).toBeCloseTo(before.place!.x + 110 / scale, -1);
  expect(after.place!.y).toBeCloseTo(before.place!.y - 70 / scale, -1);
  // The artwork under the text was NOT dragged, and the graphic did not re-anchor.
  expect(after.artTracks).toEqual(before.artTracks);
  expect(after.rootRule).toBe(before.rootRule);
});

test('import graphic: the locked artwork never captures a drag — bare artwork moves the graphic', async ({ page }) => {
  await createImported(page);

  // The artwork is locked by default: selecting it says so, and it offers no move handles.
  await page.locator('.tlv2-labels .timeline-label[data-part=".imported-design-art"]').click();
  await expect(page.getByTestId('canvas-lock')).toContainText('Locked');
  await expect(page.getByTestId('layer-scale-handle')).toHaveCount(0);

  const before = await writes(page);
  // Drag from BARE artwork, well clear of the text.
  await dragFrom(page, '.imported-design-art', [0.82, 0.2], [-60, 90]);
  await awaitPreviewRebuild(page);

  const after = await writes(page);
  expect(after.artTracks).toEqual(before.artTracks); // no motion keyed on the locked artwork
  expect(after.place).toEqual(before.place); // and the text stayed put
  expect(after.rootRule).not.toBe(before.rootRule); // the WHOLE graphic re-anchored instead
});

test('import graphic: unlocking the artwork gives it back its own layer gestures', async ({ page }) => {
  await createImported(page);
  await page.locator('.tlv2-labels .timeline-label[data-part=".imported-design-art"]').click();
  await page.getByTestId('canvas-lock').click();
  await expect(page.getByTestId('canvas-lock')).toContainText('Unlocked');

  const before = await writes(page);
  await dragFrom(page, '.imported-design-art', [0.82, 0.2], [-60, 90]);
  await awaitPreviewRebuild(page);

  const after = await writes(page);
  // Now it moves as its own layer — position keyframes, the channel every layer uses.
  expect(after.artTracks).toContain('x');
  expect(after.artTracks).toContain('y');
  expect(after.rootRule).toBe(before.rootRule); // the graphic itself did not re-anchor
});

/** The canvas world's pan translation, in screen px. */
async function panOf(page: Page) {
  const t = await page.locator('.canvas-world').evaluate((el) => (el as HTMLElement).style.transform);
  const m = t.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
  return { x: parseFloat(m?.[1] ?? '0'), y: parseFloat(m?.[2] ?? '0') };
}

test('canvas: holding Space pans the view and moves nothing in the document', async ({ page }) => {
  await createImported(page);
  await page.keyboard.press('Escape');
  const before = await writes(page);
  expect(await panOf(page)).toEqual({ x: 0, y: 0 });

  // Press straight on the TEXT — with Space held the canvas pans instead of placing it.
  const c = await elementPoint(page, '#f0', 0.5, 0.5);
  await page.mouse.move(c.x, c.y);
  await page.keyboard.down('Space');
  await expect(page.getByTestId('preview-stage')).toHaveClass(/ panning/);
  await page.mouse.down();
  await page.mouse.move(c.x - 90, c.y + 55, { steps: 8 });
  await expect(page.getByTestId('preview-stage')).toHaveClass(/panning-active/);
  await page.mouse.up();

  expect(await panOf(page)).toEqual({ x: -90, y: 55 });
  const after = await writes(page);
  expect(after.place).toEqual(before.place); // the view moved, the document did not
  expect(after.rootRule).toBe(before.rootRule);
  expect(after.selected).toEqual([]);

  // Releasing Space restores the previous tool and its cursor.
  await page.keyboard.up('Space');
  await expect(page.getByTestId('preview-stage')).not.toHaveClass(/panning/);
});

test('canvas: Space only pans over the stage, and never while typing', async ({ page }) => {
  await createImported(page);

  // Typing a field value: Space is a space, not a pan (and not Play).
  await page.getByTestId('dock-tab-data').click();
  const input = page.locator('.field-add-row input');
  await input.fill('Sponsor name');
  await expect(page.getByTestId('preview-stage')).not.toHaveClass(/panning/);
  await expect(input).toHaveValue('Sponsor name');

  // Pointer off the stage: Space stays the timeline's Play key.
  await page.mouse.move(4, 4);
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  await page.keyboard.down('Space');
  await expect(page.getByTestId('preview-stage')).not.toHaveClass(/panning/);
  await page.keyboard.up('Space');
  expect(await panOf(page)).toEqual({ x: 0, y: 0 });
});

test('canvas: the cursor names the gesture in progress, not one that is merely possible', async ({ page }) => {
  await createImported(page);
  const layer = page.getByTestId('canvas-layer');
  const cursorNow = () => layer.evaluate((el) => getComputedStyle(el).cursor);

  // Hovering movable text is a plain arrow — selection, not a promise of a drag.
  const c = await elementPoint(page, '#f0', 0.5, 0.5);
  await page.mouse.move(c.x, c.y);
  expect(['auto', 'default']).toContain(await cursorNow());

  // Mid-drag it reads as a move…
  await page.mouse.down();
  await page.mouse.move(c.x + 40, c.y + 10, { steps: 4 });
  expect(await cursorNow()).toBe('move');
  await page.mouse.up();
  await awaitPreviewRebuild(page);
  expect(['auto', 'default']).toContain(await cursorNow());

  // …a resize handle as a resize…
  await expect(page.getByTestId('line-size-handle')).toHaveCSS('cursor', 'nwse-resize');

  // …an armed type tool as text, and panning as the hand — the only hand on the canvas.
  await page.getByTestId('tool-text').click();
  expect(await cursorNow()).toBe('text');
  await page.getByTestId('tool-select').click();
  await page.mouse.move(c.x, c.y);
  await page.keyboard.down('Space');
  expect(await cursorNow()).toBe('grab');
  await page.keyboard.up('Space');
});

// ── The Prepare step's replacement field: it should land ON the text it replaced ──────────
//
// The rectangle the user draws is a loose lasso — you box text in with air around it — so
// every one of these cases draws it deliberately off-centre and larger than the text. What
// the seeded field matches is the INK the erase measured, not that rectangle.

const CENTRED_TEXT = { x: 0.35, y: 0.4, width: 0.3, height: 0.1 };

async function dropCard(page: Page, buffer: Buffer) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="import-graphic"]').click();
  await page.locator('.wz-drop input[type="file"]').setInputFiles({
    name: 'card.png',
    mimeType: 'image/png',
    buffer,
  });
}

/** Design step -> Prepare, open the erase surface, and drag a rect over it (image fractions). */
async function eraseRect(page: Page, fx0: number, fy0: number, fx1: number, fy1: number) {
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByTestId('baked-yes').click();
  const surface = page.getByTestId('erase-surface');
  await expect(surface).toBeVisible();
  await expect.poll(async () => (await surface.boundingBox())?.height ?? 0).toBeGreaterThan(100);
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width * fx0, box.y + box.height * fy0);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * fx1, box.y + box.height * fy1, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByTestId('erase-download')).toBeVisible();
}

/** The seeded field as the design sees it: its own rules, and where it actually renders
 *  inside the artwork (as fractions of the artwork, the space the source rect was given in). */
async function seededField(page: Page) {
  const css = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { lineTextStyle } = await import('/src/blocks/designLayout.ts');
    const s = useTemplateStore.getState();
    return {
      style: lineTextStyle(s.template.html, s.template.css, 'f0'),
      lineHeightPinned: /#f0\s*\{[^}]*line-height:\s*1\b/.test(s.template.css),
    };
  });
  const rendered = await page
    .frameLocator('iframe.preview-frame')
    .locator('.imported-design-art')
    .evaluate((art) => {
      const a = art.getBoundingClientRect();
      const f = art.ownerDocument.getElementById('f0')!.getBoundingClientRect();
      return {
        left: (f.left - a.left) / a.width,
        right: (f.right - a.left) / a.width,
        centre: (f.left + f.width / 2 - a.left) / a.width,
        top: (f.top - a.top) / a.height,
        height: f.height / a.height,
      };
    });
  return { ...css, rendered };
}

test('import graphic: centred baked text seeds a CENTRED field on the same centre line', async ({ page }) => {
  await dropCard(page, framedCardPng(1600, 900, { textRect: CENTRED_TEXT }));
  // A lasso with far more air on the left than the right: its own centre is nowhere near
  // the text's, so matching the text can only come from measuring the ink.
  await eraseRect(page, 0.18, 0.34, 0.69, 0.56);
  await createBare(page);

  const f = await seededField(page);
  expect(f.style!.align).toBe('center');
  expect(f.lineHeightPinned).toBe(true);

  const textCentre = CENTRED_TEXT.x + CENTRED_TEXT.width / 2;
  // The replacement sits on the erased text's own centre line…
  expect(f.rendered.centre).toBeCloseTo(textCentre, 2);
  // …at its height, and starting at its top (line-height 1 puts the glyphs just under it).
  expect(f.rendered.height).toBeGreaterThan(CENTRED_TEXT.height * 0.9);
  expect(f.rendered.height).toBeLessThan(CENTRED_TEXT.height * 1.6);
  expect(Math.abs(f.rendered.top - CENTRED_TEXT.y)).toBeLessThan(CENTRED_TEXT.height * 0.35);
  // The slot is the room the original text had, not the room the lasso had.
  expect(f.style!.fontSize!.value).toBeGreaterThan(0);
});

test('import graphic: left-set baked text seeds a LEFT-anchored field on its left edge', async ({ page }) => {
  await dropCard(page, framedCardPng(1600, 900));
  // Again a loose lasso — generous on every side of the bar at CARD_TEXT_RECT.
  await eraseRect(page, 0.12, 0.35, 0.62, 0.6);
  await createBare(page);

  const f = await seededField(page);
  expect(f.style!.align).toBe('left');
  // It starts where the erased text started, and is about as wide as the text was.
  expect(f.rendered.left).toBeCloseTo(CARD_TEXT_RECT.x, 2);
  expect(Math.abs(f.rendered.top - CARD_TEXT_RECT.y)).toBeLessThan(CARD_TEXT_RECT.height * 0.35);
  expect(f.style!.fontSize!.value).toBeGreaterThan(0);
});

test('import graphic: a JPEG or WebP design imports exactly like a PNG', async ({ page }) => {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();

  // Encode the fixture in the browser, so these are real JPEG/WebP bytes, not a PNG wearing
  // another MIME type — the point is that the pipeline decodes the format, not that it
  // trusts a label.
  for (const mime of ['image/jpeg', 'image/webp']) {
    const encoded = await page.evaluate((m) => {
      const c = document.createElement('canvas');
      c.width = 1280;
      c.height = 720;
      const g = c.getContext('2d')!;
      g.fillStyle = '#f2f2ec';
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = '#18191e';
      g.fillRect(120, 470, 620, 90);
      const url = c.toDataURL(m, 0.95);
      return { mime: url.slice(5, url.indexOf(';')), base64: url.split(',')[1] };
    }, mime);
    expect(encoded.mime).toBe(mime); // the browser really produced this format

    await page.locator('[data-entry="import-graphic"]').click();
    await page.locator('.wz-drop input[type="file"]').setInputFiles({
      name: `design.${mime === 'image/jpeg' ? 'jpg' : 'webp'}`,
      mimeType: mime,
      buffer: Buffer.from(encoded.base64, 'base64'),
    });

    // Measured and accepted, with no format complaint anywhere on the step.
    await expect(page.locator('.asset-card')).toContainText('1280 × 720');
    await expect(page.locator('.wz-step')).not.toContainText('not an image');
    await page.getByRole('button', { name: '‹ Back' }).click();
  }
});

test('import graphic: a scaled design still previews, validates, and exports', async ({ page }) => {
  await createImported(page);
  await page.locator('.tlv2-labels .timeline-label[data-part=".imported-design-art"]').click();
  await dragHandle(page, 'scale-handle', 130, 74);
  await awaitPreviewRebuild(page);
  const scaled = await composition(page);
  expect(scaled.cssScale).toBeGreaterThan(1);

  // The preview still runs the graphic: play it and the field holds its sample text on the
  // artwork (the composition survived the scale at RUNTIME, not just in the stylesheet).
  await page.getByRole('button', { name: '▶ Play' }).click();
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('#f0')).toHaveText('Name');
  await expect(frame.locator('.imported-design-art')).toBeVisible();

  // And it exports: validation passes and the package carries the artwork plus the scale.
  await page.getByTestId('dock-tab-export').click();
  await page.locator('.issue', { hasText: 'SPX export' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Validate & download/ }).click(),
  ]);
  const zip = await JSZip.loadAsync(readFileSync(await download.path()));
  const css = await zip.file(Object.keys(zip.files).find((n) => n.endsWith('.css'))!)!.async('string');
  expect(css).toContain(`--scale: ${scaled.cssScale}`);
  expect(Object.keys(zip.files).some((n) => /\.png$/.test(n))).toBe(true);
});
