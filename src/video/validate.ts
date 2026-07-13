// The full validate pipeline for a composition module: compile -> static contract checks
// -> live probe in the player host (mount + render frames [0, mid, last], catching real
// runtime errors with their frame numbers). The AI repair loop feeds these exact issues
// back to the model; the UI shows the same list. Duration/fps/resolution are never
// validated against the AI - they come from project settings and are injected at load.

import type { ValidationIssue } from '../validation/validateTemplate';
import { compileTsx, staticValidate, WARNING_RULES } from './compile';
import type { PlayerBridge } from './playerBridge';
import { getActiveBridge } from './bridgeRegistry';
import type { AssetFile } from '../model/types';
import { describeAssets, type VideoCompSettings, type VideoValidationResult } from './types';

export async function validateVideoModule(
  tsx: string,
  settings: VideoCompSettings,
  assets: AssetFile[],
  bridge: PlayerBridge | null,
): Promise<VideoValidationResult> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const compiled = compileTsx(tsx);
  if (!compiled.ok) {
    errors.push({ rule: 'compile', message: compiled.error });
    return { ok: false, errors, warnings, compiledJs: null };
  }

  for (const issue of staticValidate(tsx, describeAssets(assets))) {
    (WARNING_RULES.has(issue.rule) ? warnings : errors).push(issue);
  }
  if (errors.length > 0) {
    return { ok: false, errors, warnings, compiledJs: compiled.js };
  }

  // Live probe (skipped when no player is mounted - e.g. the offline stub in tests).
  // A disposed bridge (the player remounted mid-validation - dev StrictMode, layout
  // changes) retries once on the CURRENT bridge instead of failing the module.
  let probeBridge = bridge;
  for (let attempt = 0; probeBridge && attempt < 2; attempt++) {
    const loaded = await probeBridge.load(compiled.js, settings, {}, assets, { autoplay: false });
    if (!loaded.ok && loaded.disposed) {
      const fresh = getActiveBridge();
      probeBridge = fresh && fresh !== probeBridge ? fresh : null;
      continue;
    }
    if (!loaded.ok) {
      errors.push({ rule: 'runtime', message: loaded.message });
      return { ok: false, errors, warnings, compiledJs: compiled.js };
    }
    const d = settings.durationInFrames;
    const probe = await probeBridge.probe([0, Math.floor(d / 2), Math.max(0, d - 1)]);
    for (const e of probe.errors) {
      errors.push({ rule: 'runtime', message: `frame ${e.frame}: ${e.message}` });
    }
    break;
  }

  return { ok: errors.length === 0, errors, warnings, compiledJs: compiled.js };
}
