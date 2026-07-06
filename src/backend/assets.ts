// Asset externalization for cloud sync (Era 5.2b).
//
// A template's embedded fonts/images live in its assets as base64 data-URL strings. Storing those
// inline in the documents.body jsonb bloats rows (a multi-graphic packet is multi-MB) and wrecks
// sync/egress. So before a record is written to the cloud we UPLOAD each data-URL asset to the
// private `user-assets` Storage bucket (keyed by a content hash, so the same font is stored once per
// user) and replace the inline data with a small reference; on read we DOWNLOAD and restore it.
//
// The LOCAL store always keeps the real data-URLs — sentinels only ever exist in a cloud row — so
// the offline preview/export path is completely unchanged.

/** asset.data === `${SENTINEL}${storageKey}` means "the bytes live in Storage under storageKey". */
export const STORAGE_SENTINEL = 'spx-storage:';

/** Fast, dependency-free content hash (FNV-1a, 32-bit). Not cryptographic — just a stable dedupe
 *  key for a user's own assets, and it works in non-secure contexts (crypto.subtle doesn't). */
export function contentHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** An AssetFile-shaped node found while walking a record body. */
type AssetNode = { data: string };

/** Deep-walk a body, collecting every AssetFile-shaped node ({ path: string, data: string }) so the
 *  same logic handles packets (graphics[].template.assets[]), looks (brand.customFont.asset), and
 *  the future project kind without hardcoding any shape. */
function collectAssetNodes(value: unknown, out: AssetNode[]): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) collectAssetNodes(item, out);
    return;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.path === 'string' && typeof obj.data === 'string') out.push(obj as AssetNode);
  for (const key of Object.keys(obj)) collectAssetNodes(obj[key], out);
}

export type Uploader = (key: string, dataUrl: string) => Promise<void>;
export type Downloader = (key: string) => Promise<string | null>;

/** Return a deep copy of `body` with every base64 data-URL asset uploaded and replaced by a
 *  Storage reference. Non-base64 data-URLs (e.g. inline SVG) are left inline. */
export async function externalizeAssets(body: unknown, uid: string, upload: Uploader): Promise<unknown> {
  const clone = JSON.parse(JSON.stringify(body ?? null));
  const nodes: AssetNode[] = [];
  collectAssetNodes(clone, nodes);
  for (const node of nodes) {
    const data = node.data;
    if (typeof data !== 'string' || !data.startsWith('data:') || !data.includes(';base64,')) continue;
    const key = `${uid}/${contentHash(data)}`;
    await upload(key, data);
    node.data = STORAGE_SENTINEL + key;
  }
  return clone;
}

/** Return a deep copy of `body` with every Storage-referenced asset downloaded and restored to its
 *  data-URL. A missing object resolves to '' so the runtime simply hides that image. */
export async function rehydrateAssets(body: unknown, download: Downloader): Promise<unknown> {
  const clone = JSON.parse(JSON.stringify(body ?? null));
  const nodes: AssetNode[] = [];
  collectAssetNodes(clone, nodes);
  for (const node of nodes) {
    const data = node.data;
    if (typeof data !== 'string' || !data.startsWith(STORAGE_SENTINEL)) continue;
    const key = data.slice(STORAGE_SENTINEL.length);
    node.data = (await download(key)) ?? '';
  }
  return clone;
}

// ── data-URL ⇄ Blob (for the Supabase Storage transport) ─────────────────────────────────────────

export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const head = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mime = (head.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
