// Deterministic baked-text erase for imported artwork (the Import Graphic wizard's Prepare
// step, docs/IMPORT_MVP.md). The user draws a rectangle over text that was exported INTO
// their design; if the background just outside that rectangle is flat, filling the rectangle
// with that colour removes the text cleanly — no AI, no network, same input always gives the
// same output. When the background is NOT flat (gradient / texture / photo), reconstruction
// would be guesswork, so this module refuses to pretend: it reports non-uniform and the UI
// recommends re-exporting the design without the text.
//
// Everything here works in the artwork's SOURCE pixels (the file's own resolution), never the
// fitted design size — a 2× retina export is erased at 2×, so the cleaned file keeps every
// pixel of sharpness. Mapping to design px is the caller's job.

/** A rectangle in the artwork's SOURCE pixels (never the fitted design space). */
export interface EraseRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * How far apart the background samples may sit and still count as "flat", per 8-bit channel,
 * alpha included. Flat design-tool exports (Canva, Figma, Illustrator) sample identical or
 * ±1–2 counts even across PNG round-trips, while gradients, textures, and photo backdrops
 * blow past 10 within a few pixels. Alpha participates so a soft drop shadow crossing the
 * sample ring fails honestly instead of leaving a visible seam after the fill.
 */
export const FLAT_BG_TOLERANCE = 10;

/** How far outside the rectangle the background is sampled — clear of the text's own
 *  antialiasing, which bleeds a pixel or two past where the user naturally draws. */
const SAMPLE_OFFSET = 3;

export interface EraseSampling {
  /** The fill that was applied: the per-channel mean of the surviving edge samples. */
  fill: { r: number; g: number; b: number; a: number };
  /** Worst per-channel spread across the samples, alpha included (0–255). */
  maxDeviation: number;
  /** True when the background counts as flat: samples within FLAT_BG_TOLERANCE. */
  uniform: boolean;
  /** Ring points that actually landed on the image (a rect at the edge loses some). */
  sampleCount: number;
}

export interface EraseResult {
  /** The cleaned artwork as a PNG data URL, at the SOURCE dimensions. */
  dataUrl: string;
  sampling: EraseSampling;
}

/** Decode a data URL into a ready <img> (the only thing that knows the real pixel size). */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file could not be read as an image.'));
    img.src = dataUrl;
  });
}

/**
 * The sample ring: 16 single-pixel probes just OUTSIDE the rectangle — 5 across the top,
 * 5 across the bottom, 3 down each side. Outside, because the text's antialiasing lives
 * inside the rectangle and would pollute the flatness verdict; a ring, because a background
 * that is flat above the text but a gradient below it must fail, and only points on every
 * side can see that.
 */
function ringPoints(rect: EraseRect): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const top = rect.y - SAMPLE_OFFSET;
  const bottom = rect.y + rect.height + SAMPLE_OFFSET;
  const left = rect.x - SAMPLE_OFFSET;
  const right = rect.x + rect.width + SAMPLE_OFFSET;
  for (let i = 0; i < 5; i++) {
    const x = Math.round(rect.x + (rect.width * i) / 4);
    pts.push({ x, y: top }, { x, y: bottom });
  }
  for (let i = 0; i < 3; i++) {
    const y = Math.round(rect.y + (rect.height * (i + 1)) / 4);
    pts.push({ x: left, y }, { x: right, y });
  }
  return pts;
}

/**
 * Flat-fill the rectangle with the background sampled around it. Always returns the filled
 * result, even when the samples disagree — "continue anyway" applies exactly what the
 * warning preview showed. Deterministic: same input + rect ⇒ the same output bytes.
 */
export async function eraseRegionFlat(dataUrl: string, rect: EraseRect): Promise<EraseResult> {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  // Clamp the rect to the image — the UI clamps too, but a stale rect after a re-upload
  // must degrade to a smaller fill, never to a getImageData exception.
  const x0 = Math.max(0, Math.min(w - 1, Math.round(rect.x)));
  const y0 = Math.max(0, Math.min(h - 1, Math.round(rect.y)));
  const x1 = Math.max(x0 + 1, Math.min(w, Math.round(rect.x + rect.width)));
  const y1 = Math.max(y0 + 1, Math.min(h, Math.round(rect.y + rect.height)));
  const clamped: EraseRect = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;

  // Sample the ring. Points off the image are skipped — a design cropped at the frame edge
  // is legitimate, and the verdict comes from the points that exist.
  const lo = [255, 255, 255, 255];
  const hi = [0, 0, 0, 0];
  const sum = [0, 0, 0, 0];
  let sampleCount = 0;
  for (const p of ringPoints(clamped)) {
    if (p.x < 0 || p.y < 0 || p.x >= w || p.y >= h) continue;
    const at = (p.y * w + p.x) * 4;
    for (let c = 0; c < 4; c++) {
      const v = px[at + c];
      if (v < lo[c]) lo[c] = v;
      if (v > hi[c]) hi[c] = v;
      sum[c] += v;
    }
    sampleCount++;
  }

  const maxDeviation = sampleCount ? Math.max(...hi.map((v, c) => v - lo[c])) : 255;
  const uniform = sampleCount > 0 && maxDeviation <= FLAT_BG_TOLERANCE;
  const mean = sum.map((v) => (sampleCount ? Math.round(v / sampleCount) : 0));
  // A near-invisible fill is really a transparent background (a PNG with the design floating
  // on air) — write true transparency instead of a faintly tinted veil over it.
  const fill =
    mean[3] <= 8
      ? { r: 0, g: 0, b: 0, a: 0 }
      : { r: mean[0], g: mean[1], b: mean[2], a: mean[3] };

  // Fill by mutating the pixel data directly: fillRect would COMPOSITE a semi-transparent
  // fill over the text underneath, leaving it ghosted through — writing the bytes replaces it.
  for (let y = clamped.y; y < clamped.y + clamped.height; y++) {
    let at = (y * w + clamped.x) * 4;
    for (let x = 0; x < clamped.width; x++, at += 4) {
      px[at] = fill.r;
      px[at + 1] = fill.g;
      px[at + 2] = fill.b;
      px[at + 3] = fill.a;
    }
  }
  ctx.putImageData(image, 0, 0);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    sampling: { fill, maxDeviation, uniform, sampleCount },
  };
}
