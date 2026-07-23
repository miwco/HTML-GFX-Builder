// Spec-aware quality gates: wraps the injected validation pipeline so the user's OWN
// decisions are checked, not just the platform contracts. A requested field that never
// became a DataField is an ERROR (it feeds the coder's repair loop exactly like a bench
// finding); an uploaded font whose family the CSS never uses is a WARNING with the honest
// fallback report. ensureSpecFonts is the deterministic half: uploaded fonts always land
// as template assets with a visible @font-face, whether or not the model remembered them.

import type { SpxTemplate } from '../../model/types';
import { customFontFaceCss } from '../../model/fonts';
import { validateTemplate, type ValidationIssue, type ValidationResult } from '../../validation/validateTemplate';
import type { SpxValidator } from '../provider';
import { specCustomFonts, specIsEmpty, type GenerationSpec } from '../../model/generationSpec';

const norm = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Requested fields that never became operator DataFields. */
export function specFieldFindings(template: SpxTemplate, spec: GenerationSpec): ValidationIssue[] {
  const titles = template.fields.map((f) => norm(f.title ?? ''));
  const findings: ValidationIssue[] = [];
  for (const fd of spec.fields) {
    const want = norm(fd.label);
    if (!want) continue;
    const present = titles.some((t) => t === want || t.includes(want) || want.includes(t));
    if (!present) {
      findings.push({
        rule: 'spec-fields',
        message: `The user asked for a "${fd.label}" field (${fd.kind}) — the template's DataFields do not carry it. Add it as a real fN field with a matching element.`,
      });
    }
  }
  return findings;
}

/** Uploaded fonts whose family the CSS never references — the honest fallback report. */
export function specFontFindings(template: SpxTemplate, spec: GenerationSpec): ValidationIssue[] {
  const findings: ValidationIssue[] = [];
  for (const font of specCustomFonts(spec)) {
    const used = new RegExp(`font-family:[^;]*${font.family.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(template.css);
    if (!used) {
      findings.push({
        rule: 'spec-font',
        message: `The uploaded font "${font.family}" is embedded but no CSS rule uses it — the design renders with its fallback stack instead.`,
      });
    }
  }
  return findings;
}

/**
 * Deterministic font grounding: every uploaded font in the spec ships as a template asset
 * with a visible @font-face, whether or not the generated CSS declared one. Idempotent —
 * an already-present family or asset is left alone.
 */
export function ensureSpecFonts(template: SpxTemplate, spec: GenerationSpec | null | undefined): SpxTemplate {
  const fonts = specCustomFonts(spec);
  if (!fonts.length) return template;
  let css = template.css;
  const assets = [...template.assets];
  for (const font of fonts) {
    if (!assets.some((a) => a.path === font.asset.path)) assets.push(font.asset);
    if (!css.includes(`font-family: "${font.family}"`)) css = `${customFontFaceCss(font)}\n\n${css}`;
  }
  if (css === template.css && assets.length === template.assets.length) return template;
  return { ...template, css, assets };
}

/**
 * Demote spec-field errors to warnings. Used on GROUNDED assemblies (src/ai/claudeProvider
 * groundedResult): a fixed-contract category (scoreboard cells, quiz rows) legitimately
 * cannot carry an arbitrary extra field, there is no repair loop to fight it, and blocking
 * Create over it would strand the user — the warning stays the honest report. The coder
 * path keeps the error: its repair rounds CAN add the field.
 */
export function demoteSpecFields(v: ValidationResult): ValidationResult {
  const demoted = v.errors.filter((e) => e.rule === 'spec-fields');
  if (!demoted.length) return v;
  const errors = v.errors.filter((e) => e.rule !== 'spec-fields');
  return { ok: errors.length === 0, errors, warnings: [...v.warnings, ...demoted] };
}

/**
 * Wrap the injected validator (static + bench) with the spec's own checks. With no spec —
 * or an empty one — the inner validator passes through untouched, so the prompt-only flow
 * is byte-identical to before.
 */
export function withSpecChecks(
  inner: SpxValidator | undefined,
  spec: GenerationSpec | null | undefined,
): SpxValidator | undefined {
  if (!spec || specIsEmpty(spec)) return inner;
  return async (template: SpxTemplate): Promise<ValidationResult> => {
    const base = inner ? await inner(template) : validateTemplate(template);
    const errors = [...base.errors, ...specFieldFindings(template, spec)];
    const warnings = [...base.warnings, ...specFontFindings(template, spec)];
    return { ok: errors.length === 0, errors, warnings };
  };
}
