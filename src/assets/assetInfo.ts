// Derived asset metadata for the Assets panel's info section. The template model stores
// only { path, data } — everything here (dimensions, alpha, aspect, Lottie timing) is
// probed on demand from the data URL and cached, never written into the template.

import type { AssetFile, SpxTemplate } from '../model/types';
import { extOf, isDataUrl, isFontAsset, isImageAsset, isLottieAsset, parseDataUrl } from './assetUtils';

export interface AssetInfo {
  kind: 'image' | 'lottie' | 'font' | 'other';
  /** Mime type from the data URL (empty when unknown). */
  mime: string;
  /** Payload size in bytes (decoded from the base64 length, or the Blob size). */
  bytes: number;
  /** Natural pixel size (images) or the authored composition size (Lottie). */
  width?: number;
  height?: number;
  /** Reduced ratio like "16:9", or a decimal like "1.85:1" for odd sizes. */
  aspect?: string;
  /** true/false from a pixel scan; 'vector' for SVG and Lottie (alpha by nature). */
  hasAlpha?: boolean | 'vector';
  /** Lottie timing (frames = out point - in point). */
  frames?: number;
  fps?: number;
  durationS?: number;
}

/** Real payload bytes of an asset (a data URL's base64 overhead removed). */
export function assetBytes(asset: AssetFile): number {
  if (typeof asset.data !== 'string') return asset.data.size;
  const parsed = parseDataUrl(asset.data);
  if (parsed) return Math.round(parsed.base64.length * 0.75);
  return asset.data.length;
}

/** "16:9" for clean ratios, "1.85:1" otherwise. */
function aspectOf(w: number, h: number): string | undefined {
  if (!w || !h) return undefined;
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const d = gcd(w, h);
  const rw = w / d;
  const rh = h / d;
  if (rw <= 32 && rh <= 32) return `${rw}:${rh}`;
  return `${(w / h).toFixed(2)}:1`;
}

/** Decode a base64 data URL to text (UTF-8). Used for Lottie JSON probing. */
function dataUrlToText(dataUrl: string): string | null {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  try {
    const bin = atob(parsed.base64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** Scan a downscaled render of the image for any non-opaque pixel. */
function probeAlpha(img: HTMLImageElement): boolean {
  const w = Math.max(1, Math.min(64, img.naturalWidth));
  const h = Math.max(1, Math.min(64, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 255) return true;
  return false;
}

function probeImage(asset: AssetFile, base: AssetInfo): Promise<AssetInfo> {
  if (typeof asset.data !== 'string' || !isDataUrl(asset.data)) return Promise.resolve(base);
  const ext = extOf(asset.path);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const info: AssetInfo = {
        ...base,
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspect: aspectOf(img.naturalWidth, img.naturalHeight),
      };
      if (ext === 'svg') info.hasAlpha = 'vector';
      else if (ext === 'jpg' || ext === 'jpeg') info.hasAlpha = false; // JPEG can't carry alpha
      else {
        try {
          info.hasAlpha = probeAlpha(img);
        } catch {
          info.hasAlpha = undefined; // canvas readback failed — leave it unknown
        }
      }
      resolve(info);
    };
    img.onerror = () => resolve(base);
    img.src = asset.data as string;
  });
}

function probeLottie(asset: AssetFile, base: AssetInfo): AssetInfo {
  if (typeof asset.data !== 'string') return base;
  const text = isDataUrl(asset.data) ? dataUrlToText(asset.data) : asset.data;
  if (!text) return base;
  try {
    const data = JSON.parse(text) as { w?: number; h?: number; fr?: number; ip?: number; op?: number };
    const frames = data.op != null && data.ip != null ? Math.round(data.op - data.ip) : undefined;
    return {
      ...base,
      width: typeof data.w === 'number' ? data.w : undefined,
      height: typeof data.h === 'number' ? data.h : undefined,
      aspect: typeof data.w === 'number' && typeof data.h === 'number' ? aspectOf(data.w, data.h) : undefined,
      hasAlpha: 'vector',
      frames,
      fps: typeof data.fr === 'number' ? data.fr : undefined,
      durationS: frames != null && data.fr ? Math.round((frames / data.fr) * 100) / 100 : undefined,
    };
  } catch {
    return base;
  }
}

// One probe per asset version. Keyed by path + byte length: data never changes in place
// (a re-upload de-dupes to a new path), and the byte length breaks a same-path collision.
const probeCache = new Map<string, Promise<AssetInfo>>();

/** Probe an asset's metadata (async, cached). Cheap to call repeatedly. */
export function probeAsset(asset: AssetFile): Promise<AssetInfo> {
  const bytes = assetBytes(asset);
  const key = `${asset.path}:${bytes}`;
  const cached = probeCache.get(key);
  if (cached) return cached;

  const mime = typeof asset.data === 'string' ? (parseDataUrl(asset.data)?.mime ?? '') : asset.data.type;
  const kind: AssetInfo['kind'] = isImageAsset(asset.path)
    ? 'image'
    : isLottieAsset(asset.path)
      ? 'lottie'
      : isFontAsset(asset.path)
        ? 'font'
        : 'other';
  const base: AssetInfo = { kind, mime, bytes };

  const result =
    kind === 'image' ? probeImage(asset, base) : Promise.resolve(kind === 'lottie' ? probeLottie(asset, base) : base);
  probeCache.set(key, result);
  return result;
}

/** How many times the template's code (html + css + js) references the asset's path. */
export function referenceCount(template: SpxTemplate, path: string): number {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'g');
  let count = 0;
  for (const code of [template.html, template.css, template.js]) {
    count += (code.match(re) ?? []).length;
  }
  return count;
}
