// Shared types for the video compile/validate/preview pipeline. Pure types only - the
// implementations live in compile.ts / validate.ts / playerBridge.ts (slice: player host).

import type { ValidationIssue } from '../validation/validateTemplate';
import type { AssetFile } from '../model/types';

/** The composition settings the player and renderer need (a VideoProject subset). */
export interface VideoCompSettings {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  transparent: boolean;
}

/** Structured info about one project asset, as the AI and the player host see it. */
export interface VideoAssetInfo {
  /** Logical name generated code uses: `assets.<name>` / `assets['<name>']`. */
  name: string;
  /** The AssetFile path this maps to (e.g. "images/logo.png"). */
  path: string;
  mime: string;
  width?: number;
  height?: number;
}

/** Result of the full compile -> static checks -> live probe pipeline. */
export interface VideoValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** The sucrase CJS output when compilation succeeded (the preview/render module). */
  compiledJs: string | null;
}

/**
 * Derive an asset's logical name from its path: the file stem, kebab-safe. Generated code
 * reads `assets['<name>']` (or `assets.<name>` when it's an identifier). One place so the
 * AI prompt, the props builder, and the validator always agree.
 */
export function assetLogicalName(path: string): string {
  const file = path.split('/').pop() ?? path;
  const stem = file.replace(/\.[^.]+$/, '');
  return stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset';
}

/** MIME type from a data-URL asset ('' when the data isn't a data URL). */
export function assetMime(asset: AssetFile): string {
  if (typeof asset.data !== 'string') return asset.data.type;
  const m = /^data:([^;,]+)/.exec(asset.data);
  return m ? m[1] : '';
}

/** Build the AI/player view of a project's assets (unique logical names, in order). */
export function describeAssets(assets: AssetFile[]): VideoAssetInfo[] {
  const seen = new Set<string>();
  return assets.map((a) => {
    let name = assetLogicalName(a.path);
    let i = 2;
    while (seen.has(name)) name = `${assetLogicalName(a.path)}-${i++}`;
    seen.add(name);
    return { name, path: a.path, mime: assetMime(a) };
  });
}
