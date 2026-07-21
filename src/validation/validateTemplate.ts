// Template validation. Runs before export and on AI output so the platform — not the model —
// owns SPX compatibility. Returns errors (block export) and warnings (allow but flag).

import { parseDefinition } from '../model/spxDefinition';
import { animDataFault, parseAnimData } from '../blocks/animData';
import { allTimelines, validateMachine } from '../blocks/animMachine';
import { dataUsesTransitionStyles, hasMachineRuntime, hasTransitionStyleRuntime } from '../templates/shared/animRuntime';
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

/** Host suffixes allowed as external dependencies without warning. Supabase is the one blessed
 *  backend (Era 5, opt-in realtime/chat blocks); everything else still warns (offline-first). */
const ALLOWED_EXTERNAL: string[] = ['.supabase.co'];

/** True when a URL's HOST ends with an allowed suffix — a real host check, not a substring match
 *  (so `evil.supabase.co.attacker.com` is NOT allowed). */
function isAllowedExternal(url: string): boolean {
  try {
    const host = new URL(url.startsWith('//') ? `https:${url}` : url).host.toLowerCase();
    return ALLOWED_EXTERNAL.some((suffix) => host === suffix.replace(/^\./, '') || host.endsWith(suffix));
  } catch {
    return false;
  }
}

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

/** Collect every URL reference in the HTML (src/href/data-lottie) and CSS (url(...)). */
function collectRefs(html: string, css: string): string[] {
  const refs: string[] = [];
  const htmlRe = /\b(?:src|href|data-lottie)=["']([^"']+)["']/gi;
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
      if (!isAllowedExternal(url)) external.push(url);
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
  // Relative assets/ and lottie/ references must correspond to an uploaded asset (the
  // exporter only writes template.assets[]). js/ and css/ are provided by the exporter itself.
  const assetPaths = new Set(template.assets.map((a) => a.path));
  for (const url of relative) {
    const normalized = url.replace(/^\.\//, '');
    if (/^(assets|lottie)\//i.test(normalized) && !assetPaths.has(normalized)) {
      warnings.push({
        rule: 'missing-asset',
        message: `"${url}" is referenced but not in the package. Upload it in the Assets panel or fix the path.`,
      });
    }
  }

  // 5. JS syntax.
  const syntax = jsCompiles(template.js);
  if (syntax) {
    errors.push({ rule: 'syntax', message: `JavaScript syntax error: ${syntax}` });
  }

  // 5b. Step reveal targets: every selector in stepGroups should exist in the HTML. A
  //     dangling one is a WARNING, not an error — GSAP tweens an empty target list, so the
  //     press is a harmless no-op, but the operator would wonder why a Continue does nothing.
  const groupsLiteral = template.js.match(/var stepGroups = \[([\s\S]*?)\];/)?.[1];
  if (groupsLiteral) {
    const selectors = [...groupsLiteral.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    for (const sel of selectors) {
      const exists = sel.startsWith('#')
        ? new RegExp(`id="${sel.slice(1)}"`).test(template.html)
        : sel.startsWith('.')
          ? new RegExp(`class="[^"]*\\b${sel.slice(1)}\\b[^"]*"`).test(template.html)
          : true; // an exotic selector — leave it to the author
      if (!exists) {
        warnings.push({
          rule: 'step-target',
          message: `Step reveal targets "${sel}", which no longer exists in the HTML — that » Next press will do nothing for it.`,
        });
      }
    }
  }

  // 5c. Timeline v2 data blocks: the same dangling-selector guard for NOACG_ANIM layers
  //     and reveals, plus an honest warning when the block exists but the timeline cannot
  //     read it (the graphic still plays — the interpreter reads whatever is there — but
  //     every visual editing surface will treat it as hand-crafted code).
  if (template.js.includes('var NOACG_ANIM')) {
    const data = parseAnimData(template.js);
    if (!data) {
      // An unreadable block is normally an honest hand-crafted or legacy region, which the
      // platform deliberately tolerates. A block that DECLARES a machine and gets its shape
      // wrong is different in kind: the interpreter reads `NOACG_ANIM.machine` verbatim, so it
      // would ship and run unchecked on air. That one blocks export.
      if (animDataFault(template.js) === 'off-shape-machine') {
        errors.push({
          rule: 'machine',
          message:
            'The NOACG_ANIM block declares a state machine whose shape is invalid — it would run unchecked on air. Fix the machine (or remove it) before exporting.',
        });
      } else {
        warnings.push({
          rule: 'anim-data',
          message:
            'The NOACG_ANIM block is not readable as animation data (strict JSON, version 1 or 2) — the timeline and Inspector will treat this template as hand-crafted code.',
        });
      }
    } else {
      // A machine state's INLINE timeline plays exactly like a step, so it gets the same
      // dangling-selector / call / builder guards.
      const allSteps = allTimelines(data);
      const selectors = new Set<string>();
      for (const step of allSteps) {
        Object.keys(step.layers).forEach((s) => selectors.add(s));
        (step.reveals ?? []).forEach((s) => selectors.add(s));
        // A dynamic segment's target is handed to its builder, which will query for it —
        // a dangling one silently produces no motion, so it earns the same guard.
        (step.dynamics ?? []).forEach((d) => d.target && selectors.add(d.target));
      }
      // Data-driven categories BUILD their elements at play time — a bar chart's fills, a
      // ticker's items, a credits roll's lines all come from a rebuild, so their markup lives
      // in the template's JS and never in the static HTML. Look there too, but only OUTSIDE the
      // marked region: inside it sits the animation data itself, which names every selector it
      // targets and would happily vouch for one whose element was deleted.
      const runtime = template.js.replace(/\/\* == ANIMATION[\s\S]*?== END ANIMATION == \*\//, '');
      const declares = (re: RegExp) => re.test(template.html) || re.test(runtime);
      for (const sel of selectors) {
        const exists = sel.startsWith('#')
          ? declares(new RegExp(`id="${sel.slice(1)}"`))
          : sel.startsWith('.')
            ? declares(new RegExp(`class="[^"]*\\b${sel.slice(1)}\\b[^"]*"`))
            : true; // an exotic selector — leave it to the author
        if (!exists) {
          warnings.push({
            rule: 'anim-data-target',
            message: `The animation data targets "${sel}", which no longer exists in the HTML — its keyframes will do nothing.`,
          });
        }
      }
      // Step calls and dynamic-motion builders both name template functions the interpreter
      // resolves by window[name] — a missing one is a silent no-op at runtime, so flag it
      // here (a warning, in the same spirit as the dangling-selector check: the graphic
      // still plays).
      const definedInJs = (name: string): boolean =>
        new RegExp(`function\\s+${name}\\s*\\(`).test(template.js) ||
        new RegExp(`\\b${name}\\s*=\\s*function`).test(template.js) ||
        new RegExp(`\\bwindow\\.${name}\\s*=`).test(template.js);

      const calledNames = new Set<string>();
      for (const step of allSteps) for (const c of step.calls ?? []) calledNames.add(c.call);
      for (const name of calledNames) {
        if (!definedInJs(name)) {
          warnings.push({
            rule: 'anim-data-call',
            message: `The animation data calls "${name}()", but no such function is defined in template.js — it will do nothing when the step plays.`,
          });
        }
      }

      // A dynamic segment's builder measures the DOM and returns the tween. Without it the
      // step loses its measured motion entirely — a ticker would fade in and never travel.
      const builderNames = new Set<string>();
      for (const step of allSteps) for (const d of step.dynamics ?? []) builderNames.add(d.build);
      for (const name of builderNames) {
        if (!definedInJs(name)) {
          warnings.push({
            rule: 'anim-data-dynamic',
            message: `The animation data builds measured motion with "${name}()", but no such function is defined in template.js — that motion will not play.`,
          });
        }
      }

      // 5d. The state machine's SEMANTIC judgement (shape already gated by the parser):
      //     a disconnected default path etc. blocks export; advice lands as warnings.
      const machineVerdict = validateMachine(data);
      for (const message of machineVerdict.errors) errors.push({ rule: 'machine', message });
      for (const message of machineVerdict.warnings) warnings.push({ rule: 'machine', message });

      // Machine data under an interpreter that predates the machine engine would parse but
      // never run — the frozen-interpreter pairing rule (templates/shared/animRuntime.ts).
      if (data.machine && !hasMachineRuntime(template.js)) {
        errors.push({
          rule: 'machine',
          message:
            'The animation data declares a state machine, but the interpreter in this template predates the machine engine — re-emit the ANIMATION region (replaceRegionWithAnimData) so the machine can run.',
        });
      }

      // The same pairing rule for transition STYLES: a styled arrow under an interpreter
      // without noacgStyleTimeline would parse and silently play the classic change.
      if (dataUsesTransitionStyles(data) && !hasTransitionStyleRuntime(template.js)) {
        errors.push({
          rule: 'machine',
          message:
            'A transition carries a style (fade/push/wipe), but the interpreter in this template predates transition styles — re-emit the ANIMATION region (replaceRegionWithAnimData) so the styled change can play.',
        });
      }

      // A control button's payload names field ids whose values ride the event — a key no
      // field carries would send nothing and silently break the atomic-change promise.
      if (data.machine?.controls) {
        const fieldIds = new Set(template.fields.map((f) => f.field));
        for (const control of data.machine.controls) {
          for (const key of control.payload ?? []) {
            if (!fieldIds.has(key)) {
              warnings.push({
                rule: 'machine',
                message: `Machine controls: "${control.event}" sends the value of "${key}", but no field has that id.`,
              });
            }
          }
        }
      }
    }
  }

  // 6. Runtime error captured from the live preview.
  if (options.runtimeError) {
    errors.push({ rule: 'preview', message: `Preview reported a runtime error: ${options.runtimeError}` });
  }

  return { ok: errors.length === 0, errors, warnings };
}
