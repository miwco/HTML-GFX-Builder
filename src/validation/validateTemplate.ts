// Template validation. Runs before export and on AI output so the platform — not the model —
// owns SPX compatibility. Returns errors (block export) and warnings (allow but flag).

import { parseDefinition } from '../model/spxDefinition';
import { DATA_FTYPES, type SpxTemplate } from '../model/types';

export interface ValidationIssue {
  rule: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean; // true when there are no errors
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/** Domains allowed as external dependencies without warning. Empty by default (offline-first). */
const ALLOWED_EXTERNAL: string[] = [];

/** Detect the runtime entry points: classic globals OR the modern spxRenderer event API. */
function hasRuntimeEntryPoints(js: string): { ok: boolean; missing: string[] } {
  const hasClassic =
    /function\s+play\s*\(|\bplay\s*=\s*function|\bwindow\.play\s*=/.test(js) &&
    /function\s+stop\s*\(|\bstop\s*=\s*function|\bwindow\.stop\s*=/.test(js) &&
    /function\s+update\s*\(|\bupdate\s*=\s*function|\bwindow\.update\s*=/.test(js);
  const hasModern = /spxRenderer\s*\.\s*on\s*\(/.test(js);
  if (hasClassic || hasModern) return { ok: true, missing: [] };

  const missing: string[] = [];
  if (!/function\s+play\s*\(/.test(js)) missing.push('play()');
  if (!/function\s+stop\s*\(/.test(js)) missing.push('stop()');
  if (!/function\s+update\s*\(/.test(js)) missing.push('update(data)');
  return { ok: false, missing };
}

/** Extract all element ids present in the HTML. */
function htmlIds(html: string): Set<string> {
  const ids = new Set<string>();
  const re = /\bid=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) ids.add(m[1]);
  return ids;
}

/** Collect every URL reference in the HTML (src/href) and CSS (url(...)). */
function collectRefs(html: string, css: string): string[] {
  const refs: string[] = [];
  const htmlRe = /\b(?:src|href)=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = htmlRe.exec(html))) refs.push(m[1]);
  const cssRe = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  while ((m = cssRe.exec(css))) refs.push(m[1]);
  return refs;
}

/** Classify URL references from HTML + CSS into external, absolute-root, and relative buckets. */
function classifyRefs(html: string, css: string): { external: string[]; absolute: string[]; relative: string[] } {
  const external: string[] = [];
  const absolute: string[] = [];
  const relative: string[] = [];
  for (const url of collectRefs(html, css)) {
    if (/^data:/i.test(url)) continue; // inline data URLs are self-contained
    if (/^https?:\/\//i.test(url) || url.startsWith('//')) {
      if (!ALLOWED_EXTERNAL.some((d) => url.includes(d))) external.push(url);
    } else if (url.startsWith('/')) {
      absolute.push(url);
    } else {
      relative.push(url);
    }
  }
  return { external, absolute, relative };
}

/** Check the template JS compiles (catches obvious syntax errors). */
function jsCompiles(js: string): string | null {
  try {
    // eslint-disable-next-line no-new-func
    new Function(js);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export interface ValidateOptions {
  /** A runtime error captured from the live preview iframe (window.onerror), if any. */
  runtimeError?: string | null;
}

export function validateTemplate(template: SpxTemplate, options: ValidateOptions = {}): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 0. The three code files must exist.
  if (!template.html.trim()) errors.push({ rule: 'files', message: 'The HTML is empty.' });
  if (!template.js.trim()) errors.push({ rule: 'files', message: 'The JavaScript is empty (needs play()/stop()/update()).' });
  if (!template.css.trim()) warnings.push({ rule: 'files', message: 'The CSS is empty.' });

  // 1. Runtime entry points.
  const runtime = hasRuntimeEntryPoints(template.js);
  if (!runtime.ok) {
    errors.push({
      rule: 'runtime',
      message: `Missing runtime functions: ${runtime.missing.join(', ')}. Provide play()/stop()/update(data) or use spxRenderer.on(...).`,
    });
  }

  // 2. SPXGCTemplateDefinition exists and parses.
  const parsed = parseDefinition(template.html);
  if (!parsed) {
    errors.push({
      rule: 'definition',
      message: 'SPXGCTemplateDefinition is missing or could not be parsed from the HTML.',
    });
  }

  // 3. Each data field maps to a matching DOM id.
  if (parsed) {
    const ids = htmlIds(template.html);
    for (const field of parsed.fields) {
      if (!DATA_FTYPES.includes(field.ftype)) continue;
      if (!ids.has(field.field)) {
        warnings.push({
          rule: 'field-mapping',
          message: `Field "${field.field}" (${field.title}) has no matching element id in the HTML.`,
        });
      }
    }
    if (parsed.fields.length === 0) {
      warnings.push({ rule: 'fields', message: 'The template definition has no DataFields.' });
    }
  }

  // 4. Asset paths (HTML + CSS): absolute-root (error), external deps (warn),
  //    and relative assets/ references that won't be in the exported package (warn).
  const { external, absolute, relative } = classifyRefs(template.html, template.css);
  for (const url of absolute) {
    errors.push({
      rule: 'absolute-path',
      message: `Absolute path "${url}" will break in SPX. Use a relative path (e.g. assets/...).`,
    });
  }
  for (const url of external) {
    warnings.push({
      rule: 'external-dependency',
      message: `External dependency "${url}". Bundle it locally for reliable offline playout.`,
    });
  }
  // Relative assets/ references must correspond to an uploaded asset (the exporter only
  // writes template.assets[] into assets/). js/ and css/ are provided by the exporter itself.
  const assetPaths = new Set(template.assets.map((a) => a.path));
  for (const url of relative) {
    const normalized = url.replace(/^\.\//, '');
    if (/^assets\//i.test(normalized) && !assetPaths.has(normalized)) {
      warnings.push({
        rule: 'missing-asset',
        message: `"${url}" is referenced but not in the package. Upload it in the Brand panel or fix the path.`,
      });
    }
  }

  // 5. JS syntax.
  const syntax = jsCompiles(template.js);
  if (syntax) {
    errors.push({ rule: 'syntax', message: `JavaScript syntax error: ${syntax}` });
  }

  // 6. Runtime error captured from the live preview.
  if (options.runtimeError) {
    errors.push({ rule: 'preview', message: `Preview reported a runtime error: ${options.runtimeError}` });
  }

  return { ok: errors.length === 0, errors, warnings };
}
