import { test, expect, type Page, type FrameLocator } from '@playwright/test';

// The wizard's live preview must FEEL live: every choice lands in the composed iframe,
// rapid changes settle on the LAST choice, and the lifecycle demo on the Animation step
// never strands the preview hidden after a mid-demo change (a stop() timer scheduled
// against the previous document must not blank the fresh one).

async function openWizardTo(page: Page, step: 'fields' | 'style' | 'animation') {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  const hops = { fields: 1, style: 2, animation: 3 }[step];
  for (let i = 0; i < hops; i++) await page.getByRole('button', { name: 'Next ›' }).click();
}

function preview(page: Page): FrameLocator {
  return page.frameLocator('.wz-side iframe');
}

/** The graphic root inside the preview — visible only after the entrance played. */
function root(page: Page) {
  return preview(page).locator('.lower-third');
}

// These readers run inside the wizard's live iframe, which the debounced rebuild replaces
// wholesale (srcdoc). A read caught mid-swap throws "execution context destroyed" — return
// null instead so an expect.poll retries against the fresh document rather than aborting.

async function rootOpacity(page: Page): Promise<string | null> {
  try {
    return await root(page).evaluate((el) => getComputedStyle(el).opacity);
  } catch {
    return null;
  }
}

async function previewVar(page: Page, prop: string): Promise<string | null> {
  try {
    return await preview(page)
      .locator(':root')
      .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p).trim(), prop);
  } catch {
    return null;
  }
}

test('style step: rapid palette clicks settle on the LAST palette, entrance replayed', async ({ page }) => {
  await openWizardTo(page, 'style');
  // Click through several palettes quickly; the debounced rebuild must coalesce
  // to the final choice and the entrance must still play (no blank preview).
  for (const name of ['Mint', 'Royal', 'Frost', 'Inferno']) {
    await page.locator('.wz-palette', { hasText: name }).click();
    await page.waitForTimeout(80);
  }
  const inferno = await page.evaluate(async () => {
    const { paletteById } = await import('/src/model/wizard.ts');
    return paletteById('inferno').accent;
  });
  await expect.poll(() => previewVar(page, '--accent')).toBe(inferno);
  await expect.poll(() => rootOpacity(page)).toBe('1');
});

test('style step: font and size choices land in the rebuilt preview', async ({ page }) => {
  await openWizardTo(page, 'style');
  await page.locator('.wz-font', { hasText: 'Space Grotesk' }).click();
  await expect.poll(() => previewVar(page, '--font-heading')).toContain('Space Grotesk');
  // Graphic size L scales the WHOLE graphic (the --scale contract), not just the text.
  await page.locator('.panel-section', { hasText: 'Graphic size' }).getByRole('button', { name: 'L', exact: true }).click();
  await expect.poll(() => previewVar(page, '--scale')).toBe('1.2');
  // Text size L scales ONLY the type (the --type-scale contract): the name line's
  // font grows while the graphic's --scale stays where the size knob put it.
  const fontPx = () =>
    preview(page).locator('#f0').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const before = await fontPx();
  await page.locator('.panel-section', { hasText: 'Text size' }).getByRole('button', { name: 'L', exact: true }).click();
  await expect.poll(() => previewVar(page, '--type-scale')).toBe('1.15');
  expect(await fontPx()).toBeCloseTo(before * 1.15, 0);
  await expect.poll(() => previewVar(page, '--scale')).toBe('1.2');
  await expect.poll(() => rootOpacity(page)).toBe('1');
});

test('fields step: quick typing settles into the preview text', async ({ page }) => {
  await openWizardTo(page, 'fields');
  const sample = page.locator('.wz-line-row input').nth(1); // line 1's sample text
  await sample.fill('Dana Meridian');
  await expect(preview(page).locator('#f0')).toHaveText('Dana Meridian', { timeout: 5000 });
  await expect.poll(() => rootOpacity(page)).toBe('1');
});

test('zoom to graphic: the preview reframes onto a small graphic and back', async ({ page }) => {
  // A corner bug is ~150px of a 1920px canvas — the case the zoom exists for.
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Bugs & idents' }).click();
  await page.locator('.wz-variant', { hasText: 'Glass Mark' }).click();

  const iframe = page.locator('.wz-side iframe');
  const scaleOf = async () =>
    Number(((await iframe.getAttribute('style'))!.match(/scale\(([\d.]+)\)/) ?? [])[1]);

  // Wait for the debounced srcdoc + the stage fit, then record the full-canvas scale.
  await expect.poll(scaleOf).toBeGreaterThan(0.2);
  const fullCanvas = await scaleOf();

  const zoomBtn = page.getByRole('button', { name: 'Zoom to graphic' });
  await expect(zoomBtn).toBeEnabled();
  await zoomBtn.click();
  // The reframed view is dramatically closer than the full canvas, and off-centered
  // toward the graphic (the content translate appears in the transform).
  await expect.poll(scaleOf).toBeGreaterThan(fullCanvas * 2);
  expect(await iframe.getAttribute('style')).toMatch(/scale\([\d.]+\) translate\(-?\d/);

  // Toggling back restores the whole-canvas fit.
  await page.getByRole('button', { name: 'Whole canvas' }).click();
  await expect.poll(scaleOf).toBeCloseTo(fullCanvas, 2);
});

test('animation step: a mid-demo preset change never leaves the preview hidden', async ({ page }) => {
  await openWizardTo(page, 'animation');
  // The lifecycle demo is running (in → out at 1.7s → in again at 2.8s). Change the
  // preset right around the exit so a stale stop()/play() timer would target the
  // rebuilt document if it survived the rebuild.
  await page.waitForTimeout(1500);
  await page.locator('.wz-anim', { hasText: 'Mask wipe' }).click();
  // Wait past the full demo cycle of the NEW document, then the graphic must be on air.
  await page.waitForTimeout(4500);
  await expect.poll(() => rootOpacity(page), { timeout: 5000 }).toBe('1');
});

test('template cards frame onto the graphic, not the empty canvas around it', async ({ page }) => {
  // A lower third occupies a band of a 1920x1080 frame, so a card that scaled the whole canvas
  // was mostly empty and the designs were hard to tell apart at picking size. Each card now
  // measures its graphic and frames onto it (MiniPreview) — the same reframe "Zoom to graphic"
  // performs. Assert the framing is real (zoomed past the whole-canvas fit) and that the
  // graphic sits INSIDE its card rather than being cropped by the zoom.
  await page.goto('/app');
  await expect(page.getByTestId('creation-wizard')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await expect(page.locator('.wz-variant').first()).toBeVisible();

  const framing = await page.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 2500)); // let the minis settle + measure
    const out: { zoom: number; insideL: boolean; insideR: boolean }[] = [];
    document.querySelectorAll('.wz-variant');
    [...document.querySelectorAll('.wz-variant')].slice(0, 5).forEach((card) => {
      const mini = card.querySelector('.wz-mini')!.getBoundingClientRect();
      const f = card.querySelector('iframe') as HTMLIFrameElement;
      const inner = f.contentDocument?.body?.querySelector('div')?.getBoundingClientRect();
      if (!inner) return;
      const fr = f.getBoundingClientRect();
      const scale = fr.width / f.offsetWidth;         // rendered scale of the canvas
      const fit = mini.width / f.offsetWidth;          // the whole-canvas fit it replaces
      const gx = fr.left + inner.left * scale;
      out.push({
        zoom: scale / fit,
        insideL: gx >= mini.left - 1,
        insideR: gx + inner.width * scale <= mini.right + 1,
      });
    });
    return out;
  });

  expect(framing.length).toBeGreaterThanOrEqual(4);
  for (const f of framing) {
    expect(f.zoom).toBeGreaterThan(1.5); // genuinely reframed, not the old whole-canvas scale
    expect(f.insideL && f.insideR).toBe(true); // and the zoom never crops the design away
  }
});
