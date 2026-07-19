import { test, expect, type Page } from '@playwright/test';
import { awaitPreviewRebuild } from './_preview';
import { lowerThirdPng } from './_png';

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
