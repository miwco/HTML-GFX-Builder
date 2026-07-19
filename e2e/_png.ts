// A real PNG, built here rather than checked in as a fixture: the Import Graphic flow MEASURES
// the artwork it is given (the size decides the design's size and whether it covers the frame),
// so a spec needs a file of an exact, stated size. Node's zlib is enough — no dependency.

import { deflateSync } from 'node:zlib';

function crc32(buf: Buffer): number {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/**
 * An RGBA PNG of exactly `width` × `height`. Transparent, with an opaque block in the
 * lower-left — the shape of a real flat lower-third design (artwork where the strap is,
 * nothing anywhere else).
 */
export function lowerThirdPng(width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // 10..12 = compression / filter / interlace, all 0.

  const blockTop = Math.round(height * 0.70);
  const blockBottom = Math.round(height * 0.86);
  const blockLeft = Math.round(width * 0.06);
  const blockRight = Math.round(width * 0.53);

  const raw = Buffer.alloc(height * (width * 4 + 1)); // filter byte per scanline (0 = none)
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1) + 1;
    if (y < blockTop || y >= blockBottom) continue;
    for (let x = blockLeft; x < blockRight; x++) {
      const p = row + x * 4;
      raw[p] = 10; raw[p + 1] = 12; raw[p + 2] = 16; raw[p + 3] = 235;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Where framedCardPng draws its "baked text" bar, as fractions of the image — specs that
 *  erase it need the same numbers the generator used. */
export const CARD_TEXT_RECT = { x: 0.18, y: 0.42, width: 0.37, height: 0.13 };

/**
 * An opaque "framed card" design — the shape of a real title card exported from a design
 * tool: flat off-white background, a dark inset frame, a dark "baked text" bar at
 * CARD_TEXT_RECT (the stand-in for a name typed into the design), and a dark blob on the
 * right (the stand-in for cap-side artwork). `background: 'gradient'` makes the background
 * a horizontal ramp instead — the case a flat-fill erase must REFUSE.
 */
export function framedCardPng(
  width: number,
  height: number,
  opts: { background?: 'flat' | 'gradient' } = {},
): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const frameInset = Math.round(Math.min(width, height) * 0.06);
  const frameWidth = Math.max(2, Math.round(Math.min(width, height) * 0.008));
  const text = {
    x0: Math.round(width * CARD_TEXT_RECT.x),
    y0: Math.round(height * CARD_TEXT_RECT.y),
    x1: Math.round(width * (CARD_TEXT_RECT.x + CARD_TEXT_RECT.width)),
    y1: Math.round(height * (CARD_TEXT_RECT.y + CARD_TEXT_RECT.height)),
  };
  const blob = {
    x0: Math.round(width * 0.72),
    y0: Math.round(height * 0.3),
    x1: Math.round(width * 0.86),
    y1: Math.round(height * 0.68),
  };

  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1) + 1;
    for (let x = 0; x < width; x++) {
      const p = row + x * 4;
      // Background: flat off-white, or a left-to-right ramp for the non-flat case.
      const shade = opts.background === 'gradient' ? Math.round(190 + (x / width) * 60) : 242;
      let r = shade, g = shade, b = Math.max(0, shade - 6);
      const inFrameBand =
        x >= frameInset && x < width - frameInset && y >= frameInset && y < height - frameInset;
      const inFrameInner =
        x >= frameInset + frameWidth && x < width - frameInset - frameWidth &&
        y >= frameInset + frameWidth && y < height - frameInset - frameWidth;
      if (
        (inFrameBand && !inFrameInner) ||
        (x >= text.x0 && x < text.x1 && y >= text.y0 && y < text.y1) ||
        (x >= blob.x0 && x < blob.x1 && y >= blob.y0 && y < blob.y1)
      ) {
        r = 24; g = 26; b = 30;
      }
      raw[p] = r; raw[p + 1] = g; raw[p + 2] = b; raw[p + 3] = 255;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
