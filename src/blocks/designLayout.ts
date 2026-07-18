// Design-position placement — the text lines that sit ON an imported design's artwork.
//
// The imported-design assembler (templates/importedDesign/shared.ts) writes each line's
// position as a CSS rule on the line's WRAPPER: `#fwN { left/top: calc(Npx * var(--scale)) }`.
// That position is a DESIGN decision, not motion — which is why the canvas drag for these
// lines patches this rule instead of writing x/y keyframes the way the layer drag does on
// every other data-block element.
//
// The gate is code-derived, never category-derived (the house rule — the timeline dock picks
// its surface the same way): a line is "placed" when its parent carries an id whose CSS rule
// holds readable left+top px values. That is exactly the shape the assembler emits, and
// equally a shape a pro can hand-write to opt any template's line into placement dragging.
//
// This module also owns the OTHER placed-line design decisions: adding a brand-new placed
// line (the Data panel's add-field on an imported design — element + rule + SPX DataField in
// one transform) and the line's text size (the canvas resize handle's read/write pair).

import type { SpxTemplate } from '../model/types';
import { addFieldToDefinition, addLayer, appendCss, nextFieldId, setCssDeclaration } from './edit';

export interface LinePlacement {
  /** The positioned wrapper's element id (e.g. "fw0"). */
  wrapperId: string;
  /** Design px from the artwork's top-left (before --scale is applied). */
  x: number;
  y: number;
  /** True for the assembler's `calc(Npx * var(--scale))` form; false for plain `Npx`.
   *  Writes mirror what the rule already uses, so a drag never rewrites the author's idiom. */
  scaled: boolean;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// The value of `prop` in `selector`'s rule, as design px. Reads both position idioms. The prop
// boundary is "not an identifier char" rather than `;`/`{`: generated declarations carry
// trailing comments, so the previous line often ends in a comment close, not `;`.
function readPx(css: string, selector: string, prop: string): { value: number; scaled: boolean } | null {
  const rule = css.match(new RegExp(`${escapeRe(selector)}\\s*\\{([^}]*)\\}`));
  if (!rule) return null;
  const calc = rule[1].match(
    new RegExp(`(?:^|[^-\\w])${prop}\\s*:\\s*calc\\(\\s*(-?[\\d.]+)px\\s*\\*\\s*var\\(--scale\\)\\s*\\)`),
  );
  if (calc) return { value: parseFloat(calc[1]), scaled: true };
  const plain = rule[1].match(new RegExp(`(?:^|[^-\\w])${prop}\\s*:\\s*(-?[\\d.]+)px`));
  return plain ? { value: parseFloat(plain[1]), scaled: false } : null;
}

/** The CSS value a placement writes (and the live drag previews) for a design-px coordinate. */
export function placementCss(value: number, scaled: boolean): string {
  return scaled ? `calc(${value}px * var(--scale))` : `${value}px`;
}

/**
 * Every placed line in the template, `#fN` → its wrapper + current position. Derived from
 * the code on every call (like getTemplateParts): hand edits can change or remove a
 * placement, but they can never make this map stale.
 */
export function placedLines(html: string, css: string): Record<string, LinePlacement> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out: Record<string, LinePlacement> = {};
  for (const el of Array.from(doc.querySelectorAll('[id]'))) {
    if (!/^f\d+$/.test(el.id)) continue;
    const wrapperId = el.parentElement?.id;
    if (!wrapperId) continue;
    const x = readPx(css, `#${wrapperId}`, 'left');
    const y = readPx(css, `#${wrapperId}`, 'top');
    if (!x || !y) continue;
    out[`#${el.id}`] = { wrapperId, x: x.value, y: y.value, scaled: x.scaled && y.scaled };
  }
  return out;
}

/** Re-place one line: the wrapper rule's left/top, as one deterministic CSS patch. */
export function placeLine(
  template: SpxTemplate,
  wrapperId: string,
  x: number,
  y: number,
  scaled: boolean,
): SpxTemplate {
  let css = template.css;
  css = setCssDeclaration(css, `#${wrapperId}`, 'left', placementCss(x, scaled));
  css = setCssDeclaration(css, `#${wrapperId}`, 'top', placementCss(y, scaled));
  return { ...template, css };
}

// ── The line's TEXT SIZE — the canvas resize handle's read/write pair ────────────────────

/** A placed line's font-size in design px (from its `#fN` rule), in either idiom. */
export function lineFontSize(css: string, fieldId: string): { value: number; scaled: boolean } | null {
  return readPx(css, `#${fieldId}`, 'font-size');
}

/** Resize one line's text: its `#fN` rule's font-size, as one deterministic CSS patch. */
export function setLineFontSize(
  template: SpxTemplate,
  fieldId: string,
  px: number,
  scaled: boolean,
): SpxTemplate {
  return { ...template, css: setCssDeclaration(template.css, `#${fieldId}`, 'font-size', placementCss(px, scaled)) };
}

// ── Adding a placed line — the Data panel's add-field on an imported design ──────────────

/**
 * The placed-design shape, code-derived like everything here: a standard-contract box whose
 * design unit carries a `<prefix>-art` element (the imported-design contract — the artwork IS
 * the design, docs/IMPORT_MVP.md). Returns the prefix and the box's design-px width (the
 * space line positions are measured in), or null when the template has no such shape.
 */
export function designBoxInfo(html: string, css: string): { prefix: string; boxWidth: number } | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const box = doc.querySelector('[class*="-box"]');
  const boxClass = box ? Array.from(box.classList).find((c) => c.endsWith('-box')) : undefined;
  if (!box || !boxClass) return null;
  const prefix = boxClass.slice(0, -'-box'.length);
  if (!doc.querySelector(`.${prefix}-art`)) return null;
  const width = readPx(css, `.${boxClass}`, 'width');
  return { prefix, boxWidth: width?.value ?? 1920 };
}

/** The reference line a new one inherits its look from: the LOWEST placed line (the design
 *  reads top-down, so the newest line stacks under it and matches its supporting-text look). */
function referenceLine(
  placed: Record<string, LinePlacement>,
): { place: LinePlacement; fieldId: string } | null {
  let best: { place: LinePlacement; fieldId: string } | null = null;
  for (const [selector, place] of Object.entries(placed)) {
    if (!best || place.y > best.place.y) best = { place, fieldId: selector.slice(1) };
  }
  return best;
}

/** A declaration's raw value inside a rule (for inheriting a sibling's color/weight). */
function readDecl(css: string, selector: string, prop: string): string | null {
  const rule = css.match(new RegExp(`${escapeRe(selector)}\\s*\\{([^}]*)\\}`));
  if (!rule) return null;
  const m = rule[1].match(new RegExp(`(?:^|[^-\\w])${prop}\\s*:\\s*([^;}]+)`));
  return m ? m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim() : null;
}

export interface NewPlacedLineSpec {
  /** The operator-facing field title, e.g. "Sponsor". */
  title: string;
  /** The single-line field kinds a placed text element can carry. */
  ftype: 'textfield' | 'number';
}

/**
 * Add a NEW placed text line to an imported design — the Data panel's add-field made real.
 * One pure transform emits everything a field needs to exist end to end: the mask wrapper +
 * `#fN` span in the design unit (which makes it a registry `line` part — selectable,
 * animatable, a timeline row), the wrapper's placement rule + the span's type rule in the
 * assembler's own idiom (so the canvas drag and resize handle read it back), and the SPX
 * DataField (which the shared runtime's update() already binds by id — no JS changes).
 *
 * The new line lands stacked under the lowest existing line, inheriting its look; the first
 * line of a bare design starts in the artwork's lower-left, the lower-third convention.
 * Returns null when the template is not a placed-design shape (the caller falls back to the
 * definition-only add).
 */
export function addPlacedLine(
  template: SpxTemplate,
  spec: NewPlacedLineSpec,
): { template: SpxTemplate; fieldId: string } | null {
  const info = designBoxInfo(template.html, template.css);
  if (!info) return null;
  const { prefix, boxWidth } = info;

  const fieldId = nextFieldId(template.fields);
  const wrapperId = `fw${fieldId.slice(1)}`;
  // A hand-edited template could already use this wrapper id for something else — a duplicate
  // id would break the placement contract, so bail to the definition-only path instead.
  if (new RegExp(`\\bid=["']${wrapperId}["']`).test(template.html)) return null;

  // Where the line starts life, and what it looks like: stacked under the LOWEST existing
  // line, matching its size/weight/color (siblings read as one design); on a bare design,
  // the artwork's lower-left — every value is a starting point the user drags and restyles.
  const placed = placedLines(template.html, template.css);
  const ref = referenceLine(placed);
  const refFont = ref ? lineFontSize(template.css, ref.fieldId) : null;
  const fontSize = refFont?.value ?? Math.max(14, Math.round(boxWidth * 0.016));
  const scaled = ref ? ref.place.scaled : true;
  const x = ref ? Math.min(...Object.values(placed).map((p) => p.x)) : Math.round(boxWidth * 0.06);
  const y = ref ? Math.round(ref.place.y + fontSize * 1.6) : Math.round(boxWidth * (9 / 16) * 0.74);
  const weight = (ref && readDecl(template.css, `#${ref.fieldId}`, 'font-weight')) ?? '400';
  const color = (ref && readDecl(template.css, `#${ref.fieldId}`, 'color')) ?? 'var(--text-color)';

  const sample = spec.ftype === 'number' ? '0' : spec.title;

  // The markup, in the assembler's exact shape: the wrapper carries the POSITION (and the
  // mask an entrance can slide the text inside); the span carries the TYPE. Inserted after
  // the last mask (or the artwork), so the design unit keeps its top-down reading order.
  const lines = template.html.split('\n');
  const inBoxRe = new RegExp(`class="${escapeRe(prefix)}-(?:mask|art)"`);
  let insertAt = -1;
  lines.forEach((l, i) => {
    if (inBoxRe.test(l)) insertAt = i;
  });
  if (insertAt === -1) return null;
  lines.splice(
    insertAt + 1,
    0,
    `    <!-- ${spec.title} (${fieldId}) — SPX writes this field's value straight into the element. -->`,
    `    <div class="${prefix}-mask" id="${wrapperId}"><span id="${fieldId}">${escapeHtml(sample)}</span></div>`,
  );
  const html = lines.join('\n');

  // The rules, in the assembler's idiom — which is exactly what placedLines/lineFontSize
  // read back, so the canvas drag, nudge, and resize handle work on the new line unchanged.
  const css = appendCss(
    template.css,
    `${spec.title} (${fieldId}) — drag it on the canvas to move it.`,
    `#${wrapperId} {
  position: absolute;
  left: ${placementCss(x, scaled)};   /* measured from the artwork's left edge */
  top: ${placementCss(y, scaled)};    /* …and from its top edge */
  overflow: hidden;                 /* the line's mask — an entrance can slide the text within it */
}
#${fieldId} {
  display: inline-block;            /* so the line can move inside its mask */
  white-space: nowrap;              /* a placed line keeps its shape — it never reflows */
  font-family: var(--font-heading);
  font-size: ${placementCss(fontSize, scaled)};
  font-weight: ${weight};
  color: ${color};
}`,
  );

  // The SPX DataField (update() binds it by id — the shared runtime needs no change) and the
  // layer metadata, matching what the assembler records at create.
  let next = addFieldToDefinition({ ...template, html, css }, {
    field: fieldId,
    ftype: spec.ftype,
    title: spec.title,
    value: sample,
  });
  next = addLayer(next, {
    id: fieldId,
    type: 'text',
    label: spec.title,
    fieldId,
    text: sample,
    styles: {},
  });
  return { template: next, fieldId };
}
