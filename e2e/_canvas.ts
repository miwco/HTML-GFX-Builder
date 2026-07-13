import { type Page } from '@playwright/test';

// Shared canvas-coordinate helpers for the direct-manipulation specs.
//
// The preview overlay and the iframe both span a padded DOCUMENT (canvas + the off-canvas
// pasteboard), so the overlay's top-left is the pasteboard origin, NOT the canvas origin, and
// the overlay is wider than the canvas. These helpers derive every mapping from the rendered
// DOM — the overlay box, the iframe element's own width, and the guides' `canvas-bounds`
// outline — so they never reference the pad amount and hold whether the pasteboard is on or
// off (with no pasteboard the overlay equals the canvas and these reduce to the old maths).

/** screen px per DOC px (= fit × zoom, which also equals screen px per canvas px since doc and
 *  canvas share one pixel grid) plus the overlay's screen box (its top-left is the doc origin).
 *  Derived from the overlay and the iframe element — no pad needed. */
async function docSpace(page: Page) {
  const layer = (await page.getByTestId('canvas-layer').boundingBox())!;
  const iframeW = await page
    .locator('iframe.preview-frame')
    .evaluate((el) => (el as HTMLIFrameElement).offsetWidth);
  return { layer, scale: layer.width / iframeW };
}

/** Screen point over a preview element. `el.getBoundingClientRect()` inside the iframe is in
 *  doc px, so mapping it through the overlay origin lands it on screen. dx/dy pick the spot
 *  inside the element's rect — fractions when <= 1, canvas px offsets when > 1. Returns the
 *  doc scale too (screen px per canvas px) for callers that convert a drag distance back. */
export async function elementPoint(page: Page, selector: string, dx = 0.5, dy = 0.5) {
  const { layer, scale } = await docSpace(page);
  const r = await page
    .frameLocator('iframe.preview-frame')
    .locator(selector)
    .evaluate((el) => {
      const b = el.getBoundingClientRect();
      return { left: b.left, top: b.top, width: b.width, height: b.height };
    });
  return {
    x: layer.x + (r.left + (dx <= 1 ? r.width * dx : dx)) * scale,
    y: layer.y + (r.top + (dy <= 1 ? r.height * dy : dy)) * scale,
    scale,
  };
}

/** The TRUE canvas box on screen — the guides' `canvas-bounds` outline. Its top-left is the
 *  canvas origin (inset by the pasteboard) and its size is the canvas scaled, so a fraction of
 *  it hits a known CANVAS position regardless of the pasteboard margin. */
export async function canvasBox(page: Page) {
  return (await page.getByTestId('canvas-bounds').boundingBox())!;
}
