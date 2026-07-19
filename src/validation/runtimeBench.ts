// The runtime bench: load a template in a hidden same-origin iframe and EXERCISE it the way
// playout will - update() with real data, play(), Continue presses, stop(), replay - then
// measure the settled layout (overlap, overflow, canvas escape, double-length stress text).
//
// This is the deterministic half of the AI harness's quality guarantee: validateTemplate
// checks the code's structure, this bench checks its observable behaviour. Every finding is
// a teaching message (the exact text is fed back to the model in a repair round), and the
// whole catalog must pass its own bench - e2e/bench.spec.ts runs it over every variant, so
// the thresholds are calibrated against the house's own artifacts.
//
// Browser-only (needs a live DOM); the AI provider never imports it - the UI injects it as
// an SpxValidator (src/ai/provider.ts), the same seam the video harness uses.

import { composeDocument } from '../preview/composeDocument';
import { parseAnimData } from '../blocks/animData';
import { detectPrefix } from '../model/structure';
import type { SpxTemplate } from '../model/types';
import type { ValidationIssue, ValidationResult } from './validateTemplate';

export interface RuntimeBenchOptions {
  /** Hard cap on the whole bench run (iframe load + every phase). */
  timeoutMs?: number;
  /**
   * Enforce the house editability contract (root class prefix, readable NOACG_ANIM data
   * block, :root style vars) as ERRORS. On by default - the harness promises AI output is
   * timeline/Style-panel editable like wizard output. Pass false when benching a foreign
   * template (an import being modified) where that promise doesn't apply yet.
   */
  houseContract?: boolean;
}

/** Merge validation results: errors and warnings concatenate, ok = no errors anywhere. */
export function mergeResults(...results: ValidationResult[]): ValidationResult {
  const errors = results.flatMap((r) => r.errors);
  const warnings = results.flatMap((r) => r.warnings);
  return { ok: errors.length === 0, errors, warnings };
}

// The bench renames the preview error channel inside its composed document so a bench
// iframe's errors can never reach PreviewFrame's unfiltered 'spx-preview-error' listener
// and show up as a phantom preview error in the editor.
const BENCH_ERROR_TYPE = 'noacg-bench-error';

const DEFAULT_TIMEOUT_MS = 10_000;
/** GSAP acceleration while benching: a 0.8 s entrance settles in ~40 ms of real time. */
const TIME_SCALE = 20;
/** Real-time wait that equals TIME_SCALE× that much animation time. */
const SETTLE_MS = 300;
/** How long the on-air check keeps looking before calling a graphic invisible. Generous on
 *  purpose: it costs nothing when the graphic is already up (the poll returns immediately),
 *  and it is what keeps a starved rAF from being reported as a broken entrance. */
const ON_AIR_BUDGET_MS = 2_000;
/** Title-safe margin (fraction of the canvas each side) - escaping it is a warning. */
const TITLE_SAFE = 0.035;
/** Overlap thresholds: intersection as a fraction of the SMALLER element's rect. */
const OVERLAP_ERROR = 0.25;
const OVERLAP_WARN = 0.05;

// A long real-world name: the classic lower-third breaker (~60 chars).
const STRESS_NAME = 'Alexandra Konstantopoulos-Vandermeulen, Senior Correspondent';

interface TemplateGlobals {
  play?: () => void;
  stop?: () => void;
  update?: (data: string) => void;
  next?: () => void;
  gsap?: { globalTimeline?: { timeScale: (v: number) => void } };
}

const issue = (rule: string, message: string): ValidationIssue => ({ rule, message });

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Poll a condition until it holds or the budget runs out. Returns whether it held. */
async function waitFor(condition: () => boolean, budgetMs: number, stepMs = 50): Promise<boolean> {
  for (let waited = 0; waited < budgetMs; waited += stepMs) {
    if (condition()) return true;
    await wait(stepMs);
  }
  return condition();
}

/** '#id', '.first-class', or the tag name - how findings name an element. */
function labelFor(el: Element): string {
  if (el.id) return `#${el.id}`;
  const cls = el.getAttribute('class')?.trim().split(/\s+/)[0];
  return cls ? `.${cls}` : el.tagName.toLowerCase();
}

/** Computed opacity multiplied up the ancestor chain (autoAlpha hides via both). */
function effectiveOpacity(el: Element, win: Window): number {
  let o = 1;
  for (let node: Element | null = el; node && node !== win.document.body; node = node.parentElement) {
    const cs = win.getComputedStyle(node);
    if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
    o *= parseFloat(cs.opacity) || 0;
    if (o <= 0) return 0;
  }
  return o;
}

function isVisible(el: Element, win: Window): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  return effectiveOpacity(el, win) > 0.1;
}

/**
 * The elements the layout checks measure: visible elements that OWN text (a non-empty direct
 * text node) plus content images. Panels/boxes without their own text are containers -
 * text deliberately sits on them, so they are not collected.
 */
function collectLeaves(win: Window): Element[] {
  const all = win.document.body.querySelectorAll<Element>('*');
  const leaves: Element[] = [];
  for (const el of all) {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
    const ownsText = [...el.childNodes].some(
      (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 0,
    );
    const isImage = el.tagName === 'IMG';
    if ((ownsText || isImage) && isVisible(el, win)) leaves.push(el);
  }
  return leaves;
}

/** Roots of measured motion (NOACG_ANIM dynamics targets): they and their subtrees travel
 *  by data-derived magnitudes (marquees, rolls), so off-canvas positions are by design. */
function dynamicsRoots(template: SpxTemplate, win: Window): Element[] {
  const data = parseAnimData(template.js);
  if (!data) return [];
  const roots: Element[] = [];
  for (const step of data.steps) {
    for (const d of step.dynamics ?? []) {
      if (!d.target) continue;
      try {
        win.document.querySelectorAll(d.target).forEach((el) => roots.push(el));
      } catch {
        /* an exotic selector - leave it to the author */
      }
    }
  }
  return roots;
}

const isExempt = (el: Element, roots: Element[]) => roots.some((r) => r === el || r.contains(el));

function intersection(a: DOMRect, b: DOMRect): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Two copies of the SAME text stacked near-coincidentally are deliberate layering — a
 *  karaoke wipe's accent fill over its base line, a glow copy. An OFFSET duplicate is a
 *  misaligned wipe, which is a real bug (the same rule the compare rig's sampler uses). */
function isDeliberateLayer(a: Element, b: Element, ra: DOMRect, rb: DOMRect, inter: number): boolean {
  if ((a.textContent ?? '').trim() !== (b.textContent ?? '').trim()) return false;
  const union = ra.width * ra.height + rb.width * rb.height - inter;
  const iou = union > 0 ? inter / union : 0;
  const dx = Math.abs((ra.left + ra.right) / 2 - (rb.left + rb.right) / 2);
  const dy = Math.abs((ra.top + ra.bottom) / 2 - (rb.top + rb.bottom) / 2);
  return iou > 0.8 && dx < 6 && dy < 6;
}

/** Pairwise overlap among leaves (ancestor/descendant pairs excluded - text on its own
 *  panel is design, two unrelated texts on top of each other is the #1 broadcast defect). */
function overlapIssues(
  leaves: Element[],
  exempt: Element[],
  phase: string,
): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  for (let i = 0; i < leaves.length; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i];
      const b = leaves[j];
      if (a.contains(b) || b.contains(a)) continue;
      if (isExempt(a, exempt) || isExempt(b, exempt)) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const inter = intersection(ra, rb);
      if (inter < 4) continue;
      if (isDeliberateLayer(a, b, ra, rb, inter)) continue;
      const smaller = Math.min(ra.width * ra.height, rb.width * rb.height);
      const ratio = smaller > 0 ? inter / smaller : 0;
      if (ratio >= OVERLAP_ERROR) {
        errors.push(
          issue(
            'bench-overlap',
            `${labelFor(a)} and ${labelFor(b)} overlap by ${Math.round(ratio * 100)}% ${phase} - ` +
              `two text/image elements must never collide. Stack them in a flex column with a gap ` +
              `(or size the panel to its content); never absolutely position two siblings where long text can reach each other.`,
          ),
        );
      } else if (ratio >= OVERLAP_WARN) {
        warnings.push(
          issue(
            'bench-overlap',
            `${labelFor(a)} and ${labelFor(b)} touch (${Math.round(ratio * 100)}% overlap) ${phase} - ` +
              `add breathing room between them (DESIGN_LANGUAGE: cramped spacing is the #1 tell of a bad graphic).`,
          ),
        );
      }
    }
  }
  return { errors, warnings };
}

/** Mid-line clipping, canvas escape, and title-safe escape for every leaf. */
function overflowIssues(
  leaves: Element[],
  exempt: Element[],
  win: Window,
  canvas: { width: number; height: number },
  phase: string,
): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const safe = {
    left: canvas.width * TITLE_SAFE,
    top: canvas.height * TITLE_SAFE,
    right: canvas.width * (1 - TITLE_SAFE),
    bottom: canvas.height * (1 - TITLE_SAFE),
  };
  for (const el of leaves) {
    if (isExempt(el, exempt)) continue;
    const rect = el.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area <= 0) continue;

    // (a) Clipped mid-line by an overflow-hidden ancestor that is NOT a reveal mask.
    // Reveal masks (`*-mask`) clip on purpose during the entrance; at the settled state the
    // text must still fit - but the mask is sized by the text, so a real clip shows up
    // against a FIXED-size ancestor (a panel with overflow hidden).
    for (let anc = el.parentElement; anc && anc !== win.document.body; anc = anc.parentElement) {
      const cls = anc.getAttribute('class') ?? '';
      if (/-mask\b/.test(cls)) continue;
      const cs = win.getComputedStyle(anc);
      const clipsX = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
      const clipsY = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
      if (!clipsX && !clipsY) continue;
      const ar = anc.getBoundingClientRect();
      const cutX = clipsX && (rect.left < ar.left - 2 || rect.right > ar.right + 2);
      const cutY = clipsY && (rect.top < ar.top - 2 || rect.bottom > ar.bottom + 2);
      if (cutX || cutY) {
        errors.push(
          issue(
            'bench-overflow',
            `${labelFor(el)} is clipped by ${labelFor(anc)} ${phase} - the text is cut mid-line. ` +
              `Use the auto-fit pattern: width: fit-content with a max-width cap and overflow-wrap so long values wrap instead of clipping.`,
          ),
        );
        break;
      }
    }

    // (b) Canvas escape: a meaningful fraction of the element renders off the canvas.
    const canvasRect = new DOMRect(0, 0, canvas.width, canvas.height);
    const onCanvas = intersection(rect, canvasRect);
    if (1 - onCanvas / area > 0.05) {
      errors.push(
        issue(
          'bench-overflow',
          `${labelFor(el)} extends off the ${canvas.width}×${canvas.height} canvas ${phase} - ` +
            `it will be cut off on air. Keep the graphic inside the frame (anchor with bottom/left offsets, cap widths).`,
        ),
      );
      continue;
    }

    // (c) Title-safe: fully on canvas but outside the 3.5% broadcast-safe margin.
    if (rect.left < safe.left - 1 || rect.top < safe.top - 1 || rect.right > safe.right + 1 || rect.bottom > safe.bottom + 1) {
      warnings.push(
        issue(
          'bench-overflow',
          `${labelFor(el)} sits outside the ${Math.round(TITLE_SAFE * 100 * 10) / 10}% title-safe margin ${phase} - ` +
            `some broadcast chains crop close to the edge; consider pulling it inside the safe area.`,
        ),
      );
    }
  }
  return { errors, warnings };
}

/** Build an update() payload from the template's fields. `mode` picks the values. */
function fieldValues(template: SpxTemplate, mode: 'marker' | 'default' | 'stress'): Record<string, string> {
  const values: Record<string, string> = {};
  let firstText = true;
  for (const f of template.fields) {
    let v = f.value ?? '';
    if (mode === 'marker' && (f.ftype === 'textfield' || f.ftype === 'textarea')) {
      v = `Bench ${f.field} marker`;
    } else if (mode === 'stress') {
      if (f.ftype === 'textfield') {
        // The first text field carries the classic 60-char name; the rest double.
        v = firstText ? STRESS_NAME : v ? `${v} ${v}` : STRESS_NAME;
        firstText = false;
      } else if (f.ftype === 'textarea') {
        // Line-based data (credits, tickers, quiz options): double every line's length.
        v = v
          .split('\n')
          .map((line) => (line.trim() ? `${line} ${line}` : line))
          .join('\n');
      }
    }
    values[f.field] = v;
  }
  return values;
}

/** The house editability contract, checked statically (no iframe needed). */
function editabilityIssues(template: SpxTemplate): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!detectPrefix(template.html)) {
    issues.push(
      issue(
        'bench-editability',
        'No recognizable root element - the canvas, timeline and Style panel find the graphic through ' +
          'its structure contract, and this template has no "-box" element. Pick one prefix for the ' +
          'design (e.g. "lower-third") and wrap it in <div class="PREFIX"> holding ' +
          '<div class="PREFIX-box">: that exact -box class, ALONE on the element, is what the editor ' +
          'looks for. Prefix every other class with the same PREFIX.',
      ),
    );
  }
  if (!template.js.includes('var NOACG_ANIM')) {
    issues.push(
      issue(
        'bench-editability',
        'The marked ANIMATION region must declare its choreography as the NOACG_ANIM data block ' +
          '(strict JSON, version 1) plus the standard interpreter - hand-rolled GSAP there is not editable by the timeline.',
      ),
    );
  } else if (!parseAnimData(template.js)) {
    issues.push(
      issue(
        'bench-editability',
        'The NOACG_ANIM block is not readable as animation data (strict JSON, version 1, root/speed/steps) - ' +
          'the timeline and Inspector would treat this template as hand-crafted code.',
      ),
    );
  }
  const missingVars = ['--accent', '--scale'].filter((v) => !template.css.includes(`${v}:`));
  if (missingVars.length) {
    issues.push(
      issue(
        'bench-editability',
        `The :root style contract is incomplete - missing ${missingVars.join(', ')}. ` +
          'Declare --accent, --text-color, --text-dim, --panel-bg, --font-heading and --scale on :root so the Style panel can edit the look.',
      ),
    );
  }
  return issues;
}

/**
 * Load the template in a hidden iframe and exercise its full lifecycle, measuring the
 * settled layout with default AND stress data. Never throws; a harness-level failure
 * (no DOM, iframe never loaded) degrades to a warning so callers fall back to static
 * validation rather than blocking on the bench itself.
 */
export async function benchTemplateRuntime(
  template: SpxTemplate,
  opts: RuntimeBenchOptions = {},
): Promise<ValidationResult> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (opts.houseContract !== false) errors.push(...editabilityIssues(template));

  if (typeof document === 'undefined') {
    warnings.push(issue('bench-skipped', 'The runtime bench needs a browser DOM and was skipped.'));
    return { ok: errors.length === 0, errors, warnings };
  }

  const { width, height } = template.resolution;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px;border:0;visibility:visible;`;

  // Runtime errors surface two ways: synchronous throws from the entry points we call
  // (caught directly below) and async errors from GSAP callbacks/timeouts, which the
  // composed document's capture script posts to the parent. The bench renames that
  // channel (see BENCH_ERROR_TYPE) and filters by source so nothing cross-talks.
  const asyncErrors: string[] = [];
  let phase = 'load';
  const onMessage = (ev: MessageEvent) => {
    if (ev.source === iframe.contentWindow && ev.data && ev.data.type === BENCH_ERROR_TYPE) {
      asyncErrors.push(`${phase}: ${String(ev.data.message)}`);
    }
  };
  window.addEventListener('message', onMessage);

  const run = async (): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('the bench iframe failed to load'));
      iframe.srcdoc = composeDocument(template).split('spx-preview-error').join(BENCH_ERROR_TYPE);
      document.body.appendChild(iframe);
    });

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) throw new Error('the bench iframe has no document');
    const g = win as unknown as TemplateGlobals;

    // Fonts change every measurement - wait for them (capped: a missing font must not hang
    // the bench), then two frames so layout is current.
    await Promise.race([doc.fonts.ready.then(() => undefined), wait(1500)]);
    await new Promise((r) => win.requestAnimationFrame(() => win.requestAnimationFrame(r)));

    // Accelerate GSAP so entrance/exit settle in tens of milliseconds of real time.
    try {
      g.gsap?.globalTimeline?.timeScale(TIME_SCALE);
    } catch {
      /* no gsap - the runtime checks below still apply */
    }

    const call = (name: 'play' | 'stop' | 'update' | 'next', arg?: string) => {
      const fn = g[name];
      if (typeof fn !== 'function') return;
      try {
        (fn as (a?: string) => void).call(win, arg);
      } catch (e) {
        errors.push(
          issue('bench-runtime', `${name}() threw during ${phase}: ${e instanceof Error ? e.message : String(e)}`),
        );
      }
    };

    // ── Binding: every text field must land in its element ──────────────────────────
    // Numeric-looking text fields are exempt: data-driven runtimes legitimately REFORMAT
    // them (a count-up adds thousand separators, a clock renders M:SS), so an exact match
    // would be a false positive. For the rest, a rebuild may transform the value too -
    // "landed" means the element contains the marker OR its content visibly changed.
    phase = 'update';
    const numericLike = (v: string) => /\d/.test(v) && /^[\s\d.,%+:-]*$/.test(v);
    const bindable = template.fields.filter(
      (f) => (f.ftype === 'textfield' || f.ftype === 'textarea') && !numericLike(f.value ?? ''),
    );
    const before = new Map(bindable.map((f) => [f.field, doc.getElementById(f.field)?.textContent ?? null]));
    call('update', JSON.stringify(fieldValues(template, 'marker')));
    await wait(30);
    for (const f of bindable) {
      const el = doc.getElementById(f.field);
      if (!el) continue; // validateTemplate already warns about the missing id
      const text = el.textContent ?? '';
      if (!text.includes(`Bench ${f.field} marker`) && text === before.get(f.field)) {
        errors.push(
          issue(
            'bench-binding',
            `update() did not land field ${f.field} ("${f.title}") in its element - ` +
              `write each field's value into the element with the same id (setFieldValue / getElementById('${f.field}')).`,
          ),
        );
      }
    }
    call('update', JSON.stringify(fieldValues(template, 'default')));
    await wait(30);

    // ── Entrance + settled measurement with the field defaults ──────────────────────
    phase = 'play';
    call('play');
    await wait(SETTLE_MS);

    const exempt = dynamicsRoots(template, win);

    // "On air" is measured by what a viewer can see: at least one visible text/image leaf
    // intersecting the canvas. (A root box can legitimately have zero height when all its
    // children are absolutely positioned, so the root's own rect proves nothing.)
    const canvasRect = new DOMRect(0, 0, width, height);
    const onAir = () =>
      collectLeaves(win).some((el) => intersection(el.getBoundingClientRect(), canvasRect) > 0);

    // Sampling ONCE after a fixed wait makes this a race, not a check: an entrance that fades
    // in reads as invisible until enough of it has played, and a hidden benching iframe can
    // have its rAF starved for a stretch under a loaded parallel run - so the assertion could
    // fail for a graphic that is perfectly fine. Poll instead: the moment the graphic is on
    // air we move on, and only a graphic that NEVER appears within the budget is an error.
    if (!(await waitFor(onAir, ON_AIR_BUDGET_MS))) {
      errors.push(
        issue(
          'bench-entrance',
          'After play() the graphic is not visible on the canvas - the entrance must reveal the root ' +
            '(the root starts CSS-hidden and play() shows it).',
        ),
      );
    }

    const presses = Math.max(0, (parseInt(template.settings.steps, 10) || 1) - 1);
    phase = 'next';
    for (let i = 0; i < presses; i++) {
      call('next');
      await wait(80);
    }

    phase = 'settled (default data)';
    const leaves = collectLeaves(win);
    const lap = overlapIssues(leaves, exempt, 'with the default field values');
    errors.push(...lap.errors);
    warnings.push(...lap.warnings);
    const flow = overflowIssues(leaves, exempt, win, { width, height }, 'with the default field values');
    errors.push(...flow.errors);
    warnings.push(...flow.warnings);

    // ── Exit: the graphic must actually leave ────────────────────────────────────────
    phase = 'stop';
    call('stop');
    await wait(SETTLE_MS);
    if (onAir()) {
      errors.push(
        issue(
          'bench-hidden',
          'After stop() the graphic is still visible - the Out step must hide the root completely ' +
            '(fade/slide it out and end at opacity 0).',
        ),
      );
    }

    // ── Replay: play after stop must reach the same on-air state (the doctrine's own
    //    replay-safety promise, enforced) ───────────────────────────────────────────────
    phase = 'replay';
    call('play');
    await wait(SETTLE_MS);
    if (!onAir()) {
      errors.push(
        issue(
          'bench-replay',
          'play() after stop() does not bring the graphic back - reset transient state at the top of ' +
            'the entrance so the graphic replays cleanly (a leaked exit end-state is the usual cause).',
        ),
      );
    }

    // ── Stress: double-length text must survive (the #1 rejection reason, mechanical) ──
    phase = 'stress';
    call('update', JSON.stringify(fieldValues(template, 'stress')));
    await wait(120);
    for (let i = 0; i < presses; i++) {
      call('next');
      await wait(80);
    }
    await wait(80);
    const stressLeaves = collectLeaves(win);
    const stressLap = overlapIssues(stressLeaves, exempt, 'once every text value is doubled in length');
    errors.push(...stressLap.errors.map((e) => ({ ...e, rule: 'bench-stress' })));
    warnings.push(...stressLap.warnings.map((w) => ({ ...w, rule: 'bench-stress' })));
    const stressFlow = overflowIssues(
      stressLeaves,
      exempt,
      win,
      { width, height },
      'once every text value is doubled in length',
    );
    errors.push(...stressFlow.errors.map((e) => ({ ...e, rule: 'bench-stress' })));
    warnings.push(...stressFlow.warnings.map((w) => ({ ...w, rule: 'bench-stress' })));

    // Let any trailing async errors arrive before we detach.
    await wait(50);
  };

  try {
    await Promise.race([
      run(),
      wait(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS).then(() => {
        throw new Error('timed out');
      }),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'timed out') {
      errors.push(
        issue(
          'bench-timeout',
          `The template did not finish its lifecycle within ${opts.timeoutMs ?? DEFAULT_TIMEOUT_MS} ms - ` +
            'check for blocking work at load time (all setup must be event-driven, never a busy wait).',
        ),
      );
    } else {
      warnings.push(issue('bench-skipped', `The runtime bench could not run (${msg}) - static validation only.`));
    }
  } finally {
    window.removeEventListener('message', onMessage);
    iframe.remove();
  }

  // Async runtime errors (GSAP callbacks, delayed code) collected across all phases.
  for (const msg of [...new Set(asyncErrors)].slice(0, 3)) {
    errors.push(issue('bench-runtime', `Runtime error during ${msg}`));
  }

  return { ok: errors.length === 0, errors, warnings };
}
