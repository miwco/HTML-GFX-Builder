// The community publish/import gate (Era 5.5). ONE pure function composes the two automated checks —
// validateTemplate (SPX-contract correctness) and templateBench (share-safety) — into a single
// pass/fail with a merged issue list. It runs at BOTH ends of the pipeline:
//   • publish time  — block a submission that isn't valid + self-contained + safe;
//   • import time   — re-run on the fetched body before it enters the importer's local packets
//                     (defence-in-depth: a row that slipped through, or was tampered, can't inject a
//                     broken or hostile template).
//
// Human review is the THIRD gate (status pending → approved) and lives server-side; it is deliberately
// off in the self-service beta, so this automated gate is what stands between a submission and the
// public gallery. Keep it strict and deterministic — the platform, not the author, owns share safety.

import { validateTemplate, type ValidationIssue, type ValidationResult } from '../validation/validateTemplate';
import { runBench } from '../validation/templateBench';
import type { SpxTemplate } from '../model/types';

// A shared template must be fully self-contained: no external dependency (the offline-first pillar)
// and no reference to an asset the package doesn't carry. validateTemplate treats these as warnings
// for the general export path; for PUBLIC sharing they block. `.supabase.co` refs are already
// exempted inside validateTemplate, so an opt-in realtime block still passes.
const PROMOTE_TO_ERROR = new Set(['external-dependency', 'missing-asset']);

/** Run the full automated gate over a template. `ok` is true only when nothing blocks sharing. */
export function publishGate(template: SpxTemplate): ValidationResult {
  const base = validateTemplate(template);
  const bench = runBench(template);

  const errors: ValidationIssue[] = [...base.errors, ...bench.errors];
  const warnings: ValidationIssue[] = [];
  for (const issue of [...base.warnings, ...bench.warnings]) {
    if (PROMOTE_TO_ERROR.has(issue.rule)) errors.push(issue);
    else warnings.push(issue);
  }

  return { ok: errors.length === 0, errors, warnings };
}
