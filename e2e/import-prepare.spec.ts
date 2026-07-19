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

/** Drag a rectangle on the erase surface, in fractions of the displayed artwork. */
async function drawRect(page: Page, fx0: number, fy0: number, fx1: number, fy1: number) {
  const box = (await page.getByTestId('erase-surface').boundingBox())!;
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

test('erase: re-running starts from the original — fills never compound', async ({ page }) => {
  await dropCard(page, framedCardPng(1000, 600));
  await toEraseSurface(page);

  // First erase the text bar, then redraw the box over an empty area instead.
  await drawRect(page, MARK.x0, MARK.y0, MARK.x1, MARK.y1);
  await expect(page.getByTestId('erase-done')).toBeVisible();
  await drawRect(page, 0.58, 0.6, 0.68, 0.7);
  await expect(page.getByTestId('erase-done')).toBeVisible();

  await createProject(page);

  // The second run replaced the first: the text bar is BACK (dark), not still erased.
  const px = await assetPixel(page, TEXT_CENTER.x, TEXT_CENTER.y);
  expect(px.r).toBeLessThan(60);
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
