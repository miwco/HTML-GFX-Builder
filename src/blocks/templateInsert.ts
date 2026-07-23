// INSERT A TEMPLATE GRAPHIC into the current project — the "Add template graphic" action.
// Pure (template, variant) => template, like every block: the caller applies the result via
// ONE applyTemplate, so the whole insertion is one undo step.
//
// The donor template (variant.create()) is a complete standalone document, so a naive splice
// would collide on every shared name. The merge therefore NAMESPACES everything it takes:
//
// - class prefix:   .lower-third…  ->  .lower-third-2…  (a unique suffix off the donor prefix)
// - field ids:      donor f0..fk   ->  the current template's next free fN..
// - style contract: the donor's :root variables are RE-SCOPED onto the inserted root
//   (#gfx-…), so its palette/typeface/scale keep working through CSS custom-property
//   inheritance without retinting the host graphic
// - the reset/canvas CSS and the donor's runtime scaffold are dropped — one document, one
//   runtime (the host's interpreter tweens the merged keyframes)
// - the donor's own state machine is dropped: the inserted graphic participates like any
//   element — visible from the start, or revealed as a step of the host's default path —
//   which is exactly what keeps ONE timeline/state system in the project.
//
// What survives: the donor's visual subtree (tagged data-gfx with a unique id, so it is a
// selectable, animatable registry part), its data fields (renumbered, still driven by the
// shared update()), its fonts, and its In/Out choreography (remapped and merged into the
// host's entrance/exit — or into a brand-new step when the graphic arrives as one).
//
// NOT insertable, honestly refused: templates whose motion or content depends on
// design-owned runtime code outside the marked region (clocks, measured tickers/credits,
// quiz reveals). The gate is code-derived — step `calls`/`dynamics` in the donor data, or
// functions beyond the standard scaffold in the donor JS — never a category list.

import type { SpxField, SpxTemplate } from '../model/types';
import type { TemplateVariant } from '../model/wizard';
import { detectPrefix } from '../model/structure';
import { replaceDefinitionInHtml } from '../model/spxDefinition';
import { ANIMATION_MARK_CLOSE, ANIMATION_MARK_OPEN } from '../templates/lowerThirds/animPresets';
import { writeAnimData } from '../templates/shared/animRuntime';
import { parseAnimData, type AnimData, type AnimLayerTracks, type AnimStep } from './animData';
import { addStep, renameStep } from './animEdit';
import { spxSteps } from './animMachine';
import { addLayer, appendCss, insertGraphicHtml, nextFieldId } from './edit';

export type InsertPlacement = 'start' | 'new-step';

export type InsertResult = { template: SpxTemplate; selector: string } | { error: string };

/** The JS functions every generated scaffold defines — anything beyond these is
 *  design-owned runtime the merge cannot carry. */
const SCAFFOLD_FUNCTIONS = new Set(['setFieldValue', 'update', 'play', 'stop', 'next', 'motionSpeed']);

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Function names defined OUTSIDE the marked ANIMATION region of a template's JS. */
function outsideRegionFunctions(js: string): string[] {
  const start = js.indexOf(ANIMATION_MARK_OPEN);
  const end = js.indexOf(ANIMATION_MARK_CLOSE);
  const outside =
    start !== -1 && end !== -1 ? js.slice(0, start) + js.slice(end + ANIMATION_MARK_CLOSE.length) : js;
  const names: string[] = [];
  for (const m of outside.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) names.push(m[1]);
  return names;
}

/**
 * Why this variant cannot be inserted into an existing project, or null when it can.
 * Code-derived from the donor it would actually produce.
 */
export function insertBlocker(donor: SpxTemplate, donorData: AnimData | null): string | null {
  if (!donorData) return 'this template has no editable animation data block';
  const measured = donorData.steps.some((s) => (s.calls?.length ?? 0) > 0 || (s.dynamics?.length ?? 0) > 0);
  if (measured) {
    return 'its motion runs design-owned runtime code (a clock or measured motion), which cannot merge into another graphic';
  }
  const extra = outsideRegionFunctions(donor.js).filter((n) => !SCAFFOLD_FUNCTIONS.has(n));
  if (extra.length > 0) {
    return `it carries its own runtime code (${extra.slice(0, 3).join(', ')}${extra.length > 3 ? ', …' : ''}), which cannot merge into another graphic`;
  }
  return null;
}

/** A unique namespace off the donor prefix: lower-third-2, -3, … not present in the host. */
function uniqueNamespace(current: SpxTemplate, donorPrefix: string): string {
  let n = 2;
  let ns = `${donorPrefix}-${n}`;
  while (current.html.includes(ns) || current.css.includes(ns) || current.js.includes(ns)) {
    ns = `${donorPrefix}-${++n}`;
  }
  return ns;
}

/** A unique data-gfx id for the inserted root, from the variant's name. */
function uniqueGfxId(html: string, variantName: string): string {
  const stem = variantName.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'graphic';
  const base = `gfx-${stem}`;
  let id = base;
  let n = 2;
  while (new RegExp(`\\bid=["']${id}["']`).test(html)) id = `${base}-${n++}`;
  return id;
}

/** Rewrite every donor field id in `text` to its remapped id. Applied in DESCENDING donor
 *  index order (the mapping is strictly increasing, so replaced ids never re-match). */
function remapFieldIds(text: string, mapping: Array<{ from: number; to: string }>): string {
  let out = text;
  for (const { from, to } of [...mapping].sort((a, b) => b.from - a.from)) {
    out = out.replace(new RegExp(`(?<![\\w-])f${from}(?![0-9])`, 'g'), to);
  }
  return out;
}

/** Strip the donor's reset/canvas CSS (one document already has one) — the emitted
 *  `* { … }` + `html, body { … }` pair with its comment header. */
function stripResetCss(css: string): string {
  return css.replace(
    /\/\* Reset and a transparent canvas[\s\S]*?\*\/\s*\*\s*\{[^}]*\}\s*html,\s*body\s*\{[^}]*\}\s*/,
    '',
  );
}

/** Merge one layers map into a step (selectors are namespaced, so keys cannot collide). */
function mergeLayers(step: AnimStep, layers: Record<string, AnimLayerTracks>) {
  for (const [selector, tracks] of Object.entries(layers)) step.layers[selector] = tracks;
}

/** Scale a step's keyframe times from the donor's speed base to the host's, so a motion
 *  authored at donor speed keeps its real-seconds feel. */
function scaleTimes(layers: Record<string, AnimLayerTracks>, factor: number) {
  if (factor === 1) return;
  for (const tracks of Object.values(layers)) {
    for (const kfs of Object.values(tracks)) {
      for (const kf of kfs) kf.time = +(kf.time * factor).toFixed(3);
    }
  }
}

/**
 * Insert `variant`'s graphic into `current`. `placement` decides participation:
 * 'start' merges the donor's In/Out into the host's entrance and exit; 'new-step' adds a
 * named step to the default path that reveals the graphic (its Out still joins the exit).
 */
export function insertTemplateGraphic(
  current: SpxTemplate,
  variant: TemplateVariant,
  opts: { placement: InsertPlacement },
): InsertResult {
  const curData = parseAnimData(current.js);
  if (!curData) {
    return { error: 'this project has no editable animation data block — open a data-block project (every catalog template is one)' };
  }

  const donor = variant.create();
  const donorData = parseAnimData(donor.js);
  const blocked = insertBlocker(donor, donorData);
  if (blocked) return { error: blocked };

  const donorPrefix = detectPrefix(donor.html);
  if (!donorPrefix) return { error: 'this template has no standard structure contract to lift out' };

  // ── Namespacing ────────────────────────────────────────────────────────────
  const ns = uniqueNamespace(current, donorPrefix);
  const prefixRe = new RegExp(escapeRe(donorPrefix), 'g');
  const base = parseInt(nextFieldId(current.fields).slice(1), 10);
  const donorFields = [...donor.fields].sort(
    (a, b) => parseInt(a.field.slice(1), 10) - parseInt(b.field.slice(1), 10),
  );
  const fieldMap = donorFields.map((f, i) => ({ from: parseInt(f.field.slice(1), 10), to: `f${base + i}` }));
  const rewrite = (text: string) => remapFieldIds(text.replace(prefixRe, ns), fieldMap);

  // ── The visual subtree, tagged as a registry part ──────────────────────────
  const doc = new DOMParser().parseFromString(donor.html, 'text/html');
  const rootEl = doc.querySelector(`.${donorPrefix}`);
  if (!rootEl) return { error: 'this template has no root element to lift out' };
  const gfxId = uniqueGfxId(current.html, variant.name);
  let subtree = rewrite(rootEl.outerHTML);
  subtree = subtree.replace(/^<([a-zA-Z][\w-]*)\s/, `<$1 id="${gfxId}" data-gfx `);
  const newIds = fieldMap.map((m) => m.to);
  const htmlSnippet =
    `  <!-- Inserted template graphic: ${variant.name}` +
    `${newIds.length > 0 ? ` (fields ${newIds.join(', ')})` : ''} — its styles are scoped under #${gfxId}. -->\n` +
    `  ${subtree}`;

  // ── CSS: strip the reset, re-scope :root onto the inserted root ────────────
  let donorCss = stripResetCss(rewrite(donor.css));
  donorCss = donorCss.replace(/:root\s*\{/g, `#${gfxId} {`);
  donorCss = donorCss.trim();

  // ── Fields: renumbered, titles marked so the operator can tell them apart ──
  const newFields: SpxField[] = donorFields.map((f, i) => ({
    ...f,
    field: `f${base + i}`,
    title: `${f.title} (${variant.name})`,
  }));
  const fields = [...current.fields, ...newFields];

  // ── Animation: remap the donor's In/Out choreography into the host's data ──
  const speedFactor = (curData.speed || 1) / (donorData!.speed || 1);
  const donorIn = clone(donorData!.steps[0]);
  const donorOut = clone(donorData!.steps[donorData!.steps.length - 1]);
  const rewriteKeys = <T,>(map: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.entries(map).map(([sel, v]) => [rewrite(sel), v]));
  const inLayers = rewriteKeys(donorIn.layers);
  const outLayers = rewriteKeys(donorOut.layers);
  scaleTimes(inLayers, speedFactor);
  scaleTimes(outLayers, speedFactor);

  let data = clone(curData);
  if (opts.placement === 'new-step') {
    const added = addStep(data);
    if (!added) return { error: 'could not add a step to this timeline' };
    data = added;
    const idx = data.steps.length - 2; // the fresh step sits just before Out
    data = renameStep(data, idx, variant.name) ?? data;
    const step = data.steps[idx];
    step.duration = +(donorIn.duration * speedFactor).toFixed(3);
    if (donorIn.ease) step.ease = donorIn.ease;
    mergeLayers(step, inLayers);
    (step.reveals ??= []).push(`#${gfxId}`);
  } else {
    const entrance = data.steps[0];
    entrance.duration = Math.max(entrance.duration, +(donorIn.duration * speedFactor).toFixed(3));
    mergeLayers(entrance, inLayers);
  }
  const exit = data.steps[data.steps.length - 1];
  exit.duration = Math.max(exit.duration, +(donorOut.duration * speedFactor).toFixed(3));
  mergeLayers(exit, outLayers);
  // Ambient loops (a breathing pulse) are pure data — carry the entrance step's along.
  if (donorIn.loops) {
    const entranceStep = opts.placement === 'new-step' ? data.steps[data.steps.length - 2] : data.steps[0];
    entranceStep.loops = { ...entranceStep.loops, ...rewriteKeys(donorIn.loops) };
  }

  const js = writeAnimData(current.js, data);
  if (!js) return { error: 'could not write the merged animation data' };

  // ── Assemble: html + css + definition + assets + layer metadata ────────────
  const settings = { ...current.settings, steps: String(spxSteps(data)) };
  let html = insertGraphicHtml(current.html, htmlSnippet);
  html = replaceDefinitionInHtml(html, settings, fields);
  const css = appendCss(current.css, `Inserted graphic: ${variant.name}`, donorCss);
  const assets = [
    ...current.assets,
    ...donor.assets.filter((a) => !current.assets.some((c) => c.path === a.path)),
  ];

  let next: SpxTemplate = { ...current, html, css, js, fields, settings, assets };
  next = addLayer(next, { id: gfxId, type: 'container', label: variant.name, styles: {} });
  return { template: next, selector: `#${gfxId}` };
}
