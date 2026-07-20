// The full validate pipeline for a composition module: compile -> static contract checks
// -> live probe in the player host (mount + render frames [0, mid, last], catching real
// runtime errors with their frame numbers) -> the READABILITY pass at the hold frames,
// where the host measures the mounted DOM (src/video/textChecks.js, inlined into the host at
// build time) and reports text
// the frame or an overflow-clipping ancestor cuts off. The AI repair loop feeds these exact
// issues back to the model; the UI shows the same list. Duration/fps/resolution are never
// validated against the AI - they come from project settings and are injected at load.

import type { ValidationIssue } from '../validation/validateTemplate';
import { compileTsx, staticValidate, WARNING_RULES } from './compile';
import type { PlayerBridge } from './playerBridge';
import { getActivePlayerBridge } from './bridgeRegistry';
import type { AssetFile } from '../model/types';
import { holdFrames, persistentTextIssues } from './readability';
import { describeAssets, type VideoCompSettings, type VideoValidationResult } from './types';

export async function validateVideoModule(
  tsx: string,
  settings: VideoCompSettings,
  assets: AssetFile[],
  bridge: PlayerBridge | null,
  /** What the emit declared as editable, when the caller knows. Remotion declares its inputs
   *  in the tool call rather than in the code, so the validator can only check that every
   *  declared control is actually wired if it is handed them. */
  declaredInputs: { key: string }[] = [],
): Promise<VideoValidationResult> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const compiled = compileTsx(tsx);
  if (!compiled.ok) {
    errors.push({ rule: 'compile', message: compiled.error });
    return { ok: false, errors, warnings, compiledJs: null, probed: false };
  }

  for (const issue of staticValidate(tsx, describeAssets(assets), declaredInputs)) {
    (WARNING_RULES.has(issue.rule) ? warnings : errors).push(issue);
  }
  if (errors.length > 0) {
    return { ok: false, errors, warnings, compiledJs: compiled.js, probed: false };
  }

  // Live probe (skipped when no player is mounted - e.g. the offline stub in tests).
  // A disposed bridge (the player remounted mid-validation - dev StrictMode, layout
  // changes) retries once on the CURRENT bridge instead of failing the module. `probed`
  // reports whether the checks ran at all - an empty error list from a probe that never
  // happened must not read as a verified-clean module (see VideoValidationResult).
  let probed = false;
  let probeBridge = bridge;
  const d = settings.durationInFrames;
  for (let attempt = 0; probeBridge && attempt < 2; attempt++) {
    // loadAndProbe, never load-then-probe: the preview panel shares this host and rebuilds it
    // on a debounce, and a rebuild enqueued in the gap between the two would run FIRST -
    // leaving the checks to measure the project's own module and call it clean.
    const { loaded, probe } = await probeBridge.loadAndProbe(
      compiled.js,
      settings,
      {},
      assets,
      [0, Math.floor(d / 2), Math.max(0, d - 1)],
      holdFrames(d),
    );
    if (!loaded.ok && loaded.disposed) {
      const fresh = getActivePlayerBridge();
      probeBridge = fresh && fresh !== probeBridge ? fresh : null;
      continue;
    }
    if (!loaded.ok || !probe) {
      errors.push({
        rule: 'runtime',
        message: loaded.ok ? 'the module could not be probed' : loaded.message,
      });
      return { ok: false, errors, warnings, compiledJs: compiled.js, probed: false };
    }
    for (const e of probe.errors) {
      errors.push({ rule: 'runtime', message: `frame ${e.frame}: ${e.message}` });
    }
    errors.push(...persistentTextIssues(probe.textIssues ?? [], holdFrames(d)));
    probed = true;
    break;
  }

  return { ok: errors.length === 0, errors, warnings, compiledJs: compiled.js, probed };
}
