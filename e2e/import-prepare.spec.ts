import { test, expect, type Page } from '@playwright/test';
import { awaitPreviewRebuild } from './_preview';
import { framedCardPng, CARD_TEXT_RECT } from './_png';

// The Import Graphic PREPARE step (docs/IMPORT_MVP.md): erasing baked-in text from the
// artwork, deterministically and offline. The user drags a box over the text; the engine
// samples the background just outside it, flat-fills when the samples agree
// (FLAT_BG_TOLERANCE), refuses honestly when they don't, and the erase always re-runs from
// the ORIGINAL pixels so adjusting can never compound fills.

async function dropCard(page: Page, buffer: Buffer, name = 'card.png') {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="import-graphic"]').click();
  await page.locator('.wz-drop input[type="file"]').setInputFiles({
    name,
    mimeType: 'image/png',
    buffer,
  });
}

/** Design step -> Prepare step, and open the erase surface. */
async function toEraseSurface(page: Page) {
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByTestId('baked-yes').click();
  await expect(page.getByTestId('erase-surface')).toBeVisible();
}

/** Drag a rectangle on the erase surface, in fractions of the displayed artwork. The box
 *  is polled until the <img> inside has laid out — its data-URL decode is async, and a box
 *  read too early points at a collapsed strip (the drag would land on the header). */
async function drawRect(page: Page, fx0: number, fy0: number, fx1: number, fy1: number) {
  const surface = page.getByTestId('erase-surface');
  await expect.poll(async () => (await surface.boundingBox())?.height ?? 0).toBeGreaterThan(100);
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width * fx0, box.y + box.height * fy0);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * fx1, box.y + box.height * fy1, { steps: 4 });
  await page.mouse.up();
}

async function createProject(page: Page) {
  await awaitPreviewRebuild(page, async () => {
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page.locator('.wz-modal')).toBeHidden();
  });
}

/** One pixel of the created template's artwork asset, at fractions of its SOURCE size. */
async function assetPixel(page: Page, fx: number, fy: number) {
  return page.evaluate(
    async ({ fx, fy }) => {
      const { useTemplateStore } = await import('/src/store/templateStore.ts');
      const asset = useTemplateStore.getState().template.assets[0];
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = asset.data as string;
      });
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const x = Math.round(img.naturalWidth * fx);
      const y = Math.round(img.naturalHeight * fy);
      const d = ctx.getImageData(x, y, 1, 1).data;
      return { r: d[0], g: d[1], b: d[2], a: d[3], width: img.naturalWidth, height: img.naturalHeight };
    },
    { fx, fy },
  );
}

// The centre of the fixture's baked-text bar, and a rect that covers the bar with margin.
const TEXT_CENTER = {
  x: CARD_TEXT_RECT.x + CARD_TEXT_RECT.width / 2,
  y: CARD_TEXT_RECT.y + CARD_TEXT_RECT.height / 2,
};
const MARK = {
  x0: CARD_TEXT_RECT.x - 0.02,
  y0: CARD_TEXT_RECT.y - 0.02,
  x1: CARD_TEXT_RECT.x + CARD_TEXT_RECT.width + 0.02,
  y1: CARD_TEXT_RECT.y + CARD_TEXT_RECT.height + 0.02,
};

test('erase: a flat background flat-fills cleanly, and the created asset carries the fill', async ({ page }) => {
  await dropCard(page, framedCardPng(1000, 600));
  await toEraseSurface(page);
  await drawRect(page, MARK.x0, MARK.y0, MARK.x1, MARK.y1);

  // The verdict: flat background, erased cleanly (no warning path).
  await expect(page.getByTestId('erase-done')).toContainText('erased cleanly');
  await expect(page.getByTestId('erase-warning')).toHaveCount(0);

  await createProject(page);

  // The created template's artwork has the text bar REPLACED by the background colour.
  const px = await assetPixel(page, TEXT_CENTER.x, TEXT_CENTER.y);
  expect(px.r).toBeGreaterThan(200); // was the near-black bar (24,26,30)
  expect(px.a).toBe(255);
});

test('erase: a 2x retina export is erased in SOURCE pixels', async ({ page }) => {
  // 3840x2160 is scaled down to fit the 1920x1080 frame for DISPLAY — the file keeps every
  // pixel, and the erase must land in the file's own coordinates.
  await dropCard(page, framedCardPng(3840, 2160));
  await toEraseSurface(page);
  await drawRect(page, MARK.x0, MARK.y0, MARK.x1, MARK.y1);
  await expect(page.getByTestId('erase-done')).toContainText('erased cleanly');

  await createProject(page);

  const px = await assetPixel(page, TEXT_CENTER.x, TEXT_CENTER.y);
  expect(px.width).toBe(3840); // full resolution kept
  expect(px.r).toBeGreaterThan(200); // …and cleaned at that resolution
});

test('erase: a non-flat background is refused honestly, with continue-anyway available', async ({ page }) => {
  await dropCard(page, framedCardPng(1000, 600, { background: 'gradient' }));
  await toEraseSurface(page);
  await drawRect(page, MARK.x0, MARK.y0, MARK.x1, MARK.y1);

  // The warning names the deviation and recommends re-exporting; nothing applied yet.
  await expect(page.getByTestId('erase-warning')).toContainText("isn't flat");
  await expect(page.getByTestId('erase-done')).toHaveCount(0);

  // "Use it anyway" applies the average fill the preview showed.
  await page.getByTestId('erase-continue-anyway').click();
  await expect(page.getByTestId('erase-done')).toBeVisible();

  await createProject(page);
  const px = await assetPixel(page, TEXT_CENTER.x, TEXT_CENTER.y);
  expect(px.r).toBeGreaterThan(150); // the dark bar was filled (with the sampled mean)
});

test('erase: dropping one mark replays the rest from the original — fills never compound', async ({ page }) => {
  await dropCard(page, framedCardPng(1000, 600));
  await toEraseSurface(page);

  // Two marks: the text bar, and the blob standing in for cap-side artwork. Marks ACCUMULATE
  // — a design usually has more than one piece of baked-in text.
  await drawRect(page, MARK.x0, MARK.y0, MARK.x1, MARK.y1);
  await expect(page.getByTestId('erase-marks').locator('li')).toHaveCount(1);
  await drawRect(page, 0.7, 0.28, 0.88, 0.7);
  await expect(page.getByTestId('erase-marks').locator('li')).toHaveCount(2);

  // Dropping the FIRST one cannot un-fill pixels in place — the artwork is rebuilt from the
  // untouched upload with only the survivor applied. So the bar comes back dark while the
  // blob stays erased, which is exactly what "fills never compound" means.
  await page.getByTestId('erase-remove-0').click();
  await expect(page.getByTestId('erase-marks').locator('li')).toHaveCount(1);
  await createProject(page);

  const bar = await assetPixel(page, TEXT_CENTER.x, TEXT_CENTER.y);
  expect(bar.r).toBeLessThan(60); // back
  const blob = await assetPixel(page, 0.79, 0.49);
  expect(blob.r).toBeGreaterThan(150); // still erased
});

test('erase: the erased region seeds the first text field, placed and sized from the mark', async ({ page }) => {
  await dropCard(page, framedCardPng(1000, 600));
  await toEraseSurface(page);
  await drawRect(page, MARK.x0, MARK.y0, MARK.x1, MARK.y1);
  await expect(page.getByTestId('erase-done')).toContainText('A text field will sit');
  await createProject(page);

  // The field exists on the design, showing its sample where the baked text was.
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('#f0')).toHaveText('Name');

  // …as a real placed line built from the INK the erase measured — the bar at
  // CARD_TEXT_RECT — not from the looser rectangle the pointer drew around it. Design px =
  // source px here (the artwork is smaller than the frame). Everything through the same
  // reader modules the app uses.
  const state = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { placedLines, lineFit, lineFontSize, lineTextStyle } = await import('/src/blocks/designLayout.ts');
    const s = useTemplateStore.getState();
    return {
      placed: placedLines(s.template.html, s.template.css)['#f0'],
      fit: lineFit(s.template.html, s.template.css, 'f0'),
      font: lineFontSize(s.template.css, 'f0'),
      color: lineTextStyle(s.template.html, s.template.css, 'f0')?.color,
      style: lineTextStyle(s.template.html, s.template.css, 'f0'),
      titles: s.template.fields.map((f) => f.title),
    };
  });
  expect(state.titles).toEqual(['Name']);
  // The field contrasts against its own sampled fill: dark ink on this light card (the
  // palette's white default would be invisible on it).
  expect(state.color).toBe('#16181c');
  // The bar the fixture drew, in the 1000×600 image's own pixels: x 180..550, y 252..330.
  const bar = {
    x: Math.round(1000 * CARD_TEXT_RECT.x),
    y: Math.round(600 * CARD_TEXT_RECT.y),
    width: Math.round(1000 * CARD_TEXT_RECT.width),
    height: Math.round(600 * CARD_TEXT_RECT.height),
  };
  // Left-set text (its middle is well left of the artwork's), anchored on its own left edge.
  expect(state.style!.align).toBe('left');
  expect(Math.abs(state.placed!.x - bar.x)).toBeLessThan(6);
  expect(state.fit!.mode).toBe('shrink');
  // Its size: cap-top to baseline is about 72% of an em, so the em is that over 0.72. (A
  // solid bar has no descenders to find, so its whole height reads as the cap.)
  const font = Math.round(bar.height / 0.72);
  // The slot is the room the ORIGINAL text had — its ink plus the side bearings type
  // occupies beyond what it paints — so a long value shrinks where it did.
  expect(Math.abs((state.fit!.maxWidth ?? 0) - (bar.width + font * 0.12))).toBeLessThan(10);
  expect(Math.abs((state.font!.value ?? 0) - font)).toBeLessThan(8);
  // …and the box starts a tenth of an em above the ink, so the glyphs land back on it.
  expect(Math.abs(state.placed!.y - (bar.y - font * 0.1))).toBeLessThan(8);
});

test('erase: on a 2x export the seeded field maps to design pixels', async ({ page }) => {
  await dropCard(page, framedCardPng(3840, 2160));
  await toEraseSurface(page);
  await drawRect(page, MARK.x0, MARK.y0, MARK.x1, MARK.y1);
  await expect(page.getByTestId('erase-done')).toBeVisible();
  await createProject(page);

  // The measured ink starts at 0.18 × 3840 ≈ 691 SOURCE px; the design shows the art
  // frame-sized at 1920, so every placed number is HALVED — the erase and its measurement
  // stay in source px, the field lands in design px.
  const state = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { placedLines, lineFontSize } = await import('/src/blocks/designLayout.ts');
    const s = useTemplateStore.getState();
    return {
      placed: placedLines(s.template.html, s.template.css)['#f0'],
      font: lineFontSize(s.template.css, 'f0'),
    };
  });
  const k = 1920 / 3840;
  const bar = {
    x: Math.round(3840 * CARD_TEXT_RECT.x) * k,
    y: Math.round(2160 * CARD_TEXT_RECT.y) * k,
    height: Math.round(2160 * CARD_TEXT_RECT.height) * k,
  };
  const font = Math.round(bar.height / 0.72);
  expect(Math.abs(state.placed!.x - bar.x)).toBeLessThan(8);
  expect(Math.abs(state.placed!.y - (bar.y - font * 0.1))).toBeLessThan(10);
  expect(Math.abs((state.font!.value ?? 0) - font)).toBeLessThan(10);
});

test('erase: the cleaned PNG is downloadable', async ({ page }) => {
  await dropCard(page, framedCardPng(1000, 600), 'my-card.png');
  await toEraseSurface(page);
  await drawRect(page, MARK.x0, MARK.y0, MARK.x1, MARK.y1);
  await expect(page.getByTestId('erase-done')).toBeVisible();

  const downloadP = page.waitForEvent('download');
  await page.getByTestId('erase-download').click();
  const download = await downloadP;
  expect(download.suggestedFilename()).toBe('my-card-clean.png');
});
