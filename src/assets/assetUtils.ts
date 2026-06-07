// Asset helpers. Uploaded images/fonts are stored as base64 data URLs in template.assets[]
// (path + data). The preview inlines them; the exporter decodes them back into real files
// under assets/ with relative paths. This keeps the app fully offline with no backend.

import type { AssetFile } from '../model/types';

/** Read a File (from an <input type="file">) into a base64 data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** True if a string looks like a base64 data URL ("data:...;base64,...."). */
export function isDataUrl(value: unknown): value is string {
  return typeof value === 'string' && /^data:[^;]*;base64,/.test(value);
}

/** Split a base64 data URL into its mime type and raw base64 payload. */
export function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const m = /^data:([^;]*);base64,(.*)$/s.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'];
const FONT_EXT = ['woff', 'woff2', 'ttf', 'otf'];

export function extOf(path: string): string {
  const i = path.lastIndexOf('.');
  return i >= 0 ? path.slice(i + 1).toLowerCase() : '';
}

export function isImageAsset(path: string): boolean {
  return IMAGE_EXT.includes(extOf(path));
}

export function isFontAsset(path: string): boolean {
  return FONT_EXT.includes(extOf(path));
}

/** A safe, unique relative asset path (assets/<sanitized-name>), avoiding collisions. */
export function uniqueAssetPath(name: string, existing: AssetFile[]): string {
  const dot = name.lastIndexOf('.');
  const base = (dot >= 0 ? name.slice(0, dot) : name).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'asset';
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
  const make = (n: number) => `assets/${base}${n ? '-' + n : ''}${ext ? '.' + ext : ''}`;
  let n = 0;
  while (existing.some((a) => a.path === make(n))) n++;
  return make(n);
}

/**
 * Replace references to `assets/<file>` (and `./assets/<file>`) in a code string with the
 * asset's data URL, so the live preview can render uploaded media without a server.
 * Used for both HTML (src/href) and CSS (url(...)).
 */
export function inlineAssetRefs(code: string, assets: AssetFile[]): string {
  let out = code;
  for (const asset of assets) {
    if (!isDataUrl(asset.data)) continue;
    // Match the relative path, optionally prefixed with ./ , inside quotes or url().
    const rel = asset.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(\\.\\/)?${rel}`, 'g');
    out = out.replace(re, asset.data);
  }
  return out;
}
