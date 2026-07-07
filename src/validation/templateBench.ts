// Publish-safety "bench" checks for the community gallery (Era 5.5). These run IN ADDITION to
// validateTemplate (which owns SPX-contract correctness) and catch the extra hazards specific to
// SHARING a template with strangers: assets that can't be serialized, a bloated payload, and JS that
// is suspicious to run inside an importer's preview/renderer. Pure and offline — the same transform
// runs at publish time (block a bad submission) and at import time (defence-in-depth on a fetched row).
//
// Split of responsibility with gate.ts: this module reports raw errors/warnings; gate.ts merges them
// with validateTemplate and decides which warnings become publish-blocking errors.

import type { SpxTemplate } from '../model/types';
import type { ValidationIssue, ValidationResult } from './validateTemplate';

/** Combined html+css+js size cap (data-URL assets are measured separately, below). */
const MAX_CODE_BYTES = 512 * 1024;
/** A published template shouldn't drag along an unreasonable number of assets. */
const MAX_ASSET_COUNT = 24;
/** Total data-URL payload across all assets (chars ≈ 1.33× real bytes, so ~9 MB of real media). */
const MAX_ASSET_BYTES = 12 * 1024 * 1024;

/** JS constructs that are almost never in a legitimate broadcast graphic and are hostile when run in
 *  someone else's preview/renderer. Surfaced as WARNINGS for a reviewer — not auto-blocking in the
 *  self-service beta — so a rare legitimate use is never silently refused. */
const SUSPICIOUS_JS: { re: RegExp; note: string }[] = [
  { re: /document\s*\.\s*cookie/, note: 'reads or writes document.cookie' },
  { re: /\beval\s*\(/, note: 'calls eval()' },
  { re: /new\s+Function\s*\(/, note: 'builds code at runtime with new Function()' },
  { re: /\bWebSocket\s*\(/, note: 'opens a WebSocket' },
  { re: /\b(?:local|session)Storage\b/, note: 'touches browser storage' },
];

function bytesOf(s: string): number {
  return typeof s === 'string' ? s.length : 0;
}

/** Structural + safety checks beyond the SPX contract. Returns errors (block sharing) and warnings
 *  (informational; a human reviewer decides). */
export function runBench(template: SpxTemplate): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 1. Every asset must be a data-URL string. A Blob (or any non-string) silently serializes to "{}"
  //    through JSON, losing the font/image — so it can never be published.
  let assetBytes = 0;
  for (const asset of template.assets) {
    if (typeof asset.data !== 'string') {
      errors.push({
        rule: 'asset-not-serializable',
        message: `Asset "${asset.path}" holds binary data that can't be shared. Re-upload it so it inlines as a data URL.`,
      });
      continue;
    }
    const data: string = asset.data;
    assetBytes += data.length;
    if (!data.startsWith('data:')) {
      warnings.push({
        rule: 'asset-unusual',
        message: `Asset "${asset.path}" is not an inline data URL; confirm it travels with the template.`,
      });
    }
  }

  // 2. Size caps — keep a shared row and its uploaded media reasonable.
  const codeBytes = bytesOf(template.html) + bytesOf(template.css) + bytesOf(template.js);
  if (codeBytes > MAX_CODE_BYTES) {
    errors.push({
      rule: 'too-large',
      message: `The template code is ${Math.round(codeBytes / 1024)} KB, over the ${Math.round(MAX_CODE_BYTES / 1024)} KB share limit.`,
    });
  }
  if (template.assets.length > MAX_ASSET_COUNT) {
    errors.push({
      rule: 'too-many-assets',
      message: `The template has ${template.assets.length} assets, over the limit of ${MAX_ASSET_COUNT}.`,
    });
  }
  if (assetBytes > MAX_ASSET_BYTES) {
    errors.push({
      rule: 'assets-too-large',
      message: `The bundled media is ~${Math.round(assetBytes / (1024 * 1024))} MB, over the ${Math.round(MAX_ASSET_BYTES / (1024 * 1024))} MB share limit.`,
    });
  }

  // 3. Suspicious JS — warn a reviewer (does not block self-service publishing).
  for (const { re, note } of SUSPICIOUS_JS) {
    if (re.test(template.js)) {
      warnings.push({ rule: 'suspicious-js', message: `The template JavaScript ${note}.` });
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
