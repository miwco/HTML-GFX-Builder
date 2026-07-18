// The structure-contract detectors + the TemplatePart registry — THE shared element-identity
// contract. Every surface that names or targets a template element (the timeline strip, the
// canvas selection layer, step assignment) goes through getTemplateParts; nothing else may
// invent element naming. The registry is DERIVED from the HTML on every call — recomputed,
// never stored — so hand edits can shrink it but never make it stale, and the code stays the
// single source of truth.

import type { SpxField } from './types';

/**
 * The structure contract's spine: the token before `-box` on the first element carrying a
 * `<prefix>-box` class. Resolved against the PARSED DOM (never a raw-text match), so other
 * classes on the same element are fine (`class="lower-third-box glass"` still yields
 * `lower-third`) — the classList lookup is what makes it robust. This is the ONE definition
 * of the prefix; detectPrefix and getTemplateParts both read it here so they can never
 * disagree about whether a template is house-shaped.
 */
function boxPrefix(doc: Document): string | null {
  const box = doc.querySelector('[class*="-box"]');
  const boxClass = box ? Array.from(box.classList).find((c) => c.endsWith('-box')) : undefined;
  return boxClass ? boxClass.slice(0, -'-box'.length) : null;
}

/** The template's class prefix, or null when the HTML has no standard-contract box. Parses
 *  the HTML because the prefix is a DOM fact (a `-box` class among others on an element), not
 *  a text pattern — matching getTemplateParts exactly. */
export function detectPrefix(html: string): string | null {
  return boxPrefix(new DOMParser().parseFromString(html, 'text/html'));
}

/**
 * One addressable element of the graphic.
 *
 * `selector` is a SINGLE TOKEN by contract — `#id` or `.one-class`, never descendant,
 * compound, or attribute selectors: the animation-region parsers (blocks/timelineModel.ts)
 * strip whitespace and split target lists on commas, so anything richer cannot round-trip
 * through the emitted code.
 */
export interface TemplatePart {
  selector: string;
  kind: 'root' | 'panel' | 'accent' | 'line' | 'image' | 'block';
  /** The human name every surface shows ('Whole graphic', 'Panel', field titles, …). */
  label: string;
  /** How the element can be revealed: 'mask' = slide within its overflow-hidden line mask
   *  (only true text lines qualify); 'rise' = generic fade+rise for everything else. */
  channel: 'mask' | 'rise';
}

/**
 * Derive the template's addressable parts from its HTML. DOMParser-based on purpose: a
 * part's KIND needs real element/parent inspection — to a regex, an `<img id="f2">` logo
 * slot and a masked line span look identical, and that miscount shipped as a real bug
 * (corner bugs offered a step reveal that shoved the unmasked logo around).
 *
 * Rules:
 * - a selector only counts as an identity if it matches exactly ONE element (duplicate
 *   classes in hand-edited/AI HTML exclude that part rather than guessing);
 * - `line` means "mask-slide capable": an `fN` element whose PARENT carries the
 *   `<prefix>-mask` class;
 * - hidden data holders (`display: none` divs) are not parts; empty logo `<img>` slots ARE
 *   (the slot exists — a value shows it).
 */
export function getTemplateParts(html: string, fields: SpxField[] = []): TemplatePart[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const parts: TemplatePart[] = [];

  const unique = (selector: string): Element | null => {
    const found = doc.querySelectorAll(selector);
    return found.length === 1 ? found[0] : null;
  };
  const fieldTitle = (id: string) => fields.find((f) => f.field === id)?.title;

  // The structure contract's spine: .<prefix>-box inside .<prefix> (shared/standard.ts).
  const prefix = boxPrefix(doc);

  if (prefix) {
    if (unique(`.${prefix}`)) {
      parts.push({ selector: `.${prefix}`, kind: 'root', label: 'Whole graphic', channel: 'rise' });
    }
    if (unique(`.${prefix}-box`)) {
      // An imported design's box is the user's own artwork with its text — "Panel" (the house
      // word for a generated background box) would misname it on every surface that shows it.
      const label = prefix === 'imported-design' ? 'Design' : 'Panel';
      parts.push({ selector: `.${prefix}-box`, kind: 'panel', label, channel: 'rise' });
    }
    if (unique(`.${prefix}-accent`)) {
      parts.push({ selector: `.${prefix}-accent`, kind: 'accent', label: 'Accent line', channel: 'rise' });
    }
    // An imported design's artwork (`.imported-design-art` — the PNG the user brought). Its
    // own identity on purpose: the design presets move the whole box, but the artwork and the
    // text placed on it are separate layers, so each can be styled and animated independently
    // (docs/IMPORT_MVP.md). Catalog templates emit no `-art` element, so nothing else changes.
    if (unique(`.${prefix}-art`)) {
      parts.push({ selector: `.${prefix}-art`, kind: 'image', label: 'Artwork', channel: 'rise' });
    }
  }

  // Field elements, in document order: masked text lines and image slots.
  for (const el of Array.from(doc.querySelectorAll('[id]'))) {
    const id = el.id;
    if (!/^f\d+$/.test(id) || !unique(`#${id}`)) continue;
    if (el.tagName === 'IMG') {
      parts.push({ selector: `#${id}`, kind: 'image', label: fieldTitle(id) ?? 'Image', channel: 'rise' });
    } else if (prefix && el.parentElement?.classList.contains(`${prefix}-mask`)) {
      parts.push({ selector: `#${id}`, kind: 'line', label: fieldTitle(id) ?? `#${id}`, channel: 'mask' });
    }
    // Unmasked fN elements (hidden data sources, free-standing value fields) are not
    // registry parts — they are either not visual or not reveal-capable yet.
  }

  // Answer ROWS (the quiz structure contract): sibling `.<prefix>-option` rows, each a letter
  // chip plus its answer field, NUMBERED so every row is its own identity. They must be: the
  // entrance walks them in one after another, and a stagger only survives the keyframe model as
  // per-target keyframe OFFSETS (docs/PRESET_MODEL_REVIEW.md gap 4 — the model has no stagger
  // field, and one class matching four elements has nowhere to put four different start times).
  // Numbering them buys the honest version of that: four rows, four editable tracks. Labelled by
  // the field each row holds, so every surface says "Answer B", never ".quiz-option-2".
  if (prefix) {
    for (let n = 1; unique(`.${prefix}-option-${n}`); n++) {
      const row = unique(`.${prefix}-option-${n}`)!;
      const field = Array.from(row.querySelectorAll('[id]')).find((el) => /^f\d+$/.test(el.id));
      parts.push({
        selector: `.${prefix}-option-${n}`,
        kind: 'block',
        label: (field && fieldTitle(field.id)) ?? `Answer ${n}`,
        channel: 'rise',
      });
    }
  }

  // Building-block inserted elements (blocks tag them data-gfx and give them an id).
  for (const el of Array.from(doc.querySelectorAll('[data-gfx][id]'))) {
    if (/^f\d+$/.test(el.id) || !unique(`#${el.id}`)) continue; // field imgs handled above
    parts.push({ selector: `#${el.id}`, kind: 'block', label: el.id, channel: 'rise' });
  }

  return parts;
}

/** Visible text lines: the mask-slide-capable `line` parts (steps and line presets rely on
 *  the mask structure, so ONLY these count — logo slots and data holders never do). */
export function countLines(html: string): number {
  return getTemplateParts(html).filter((p) => p.kind === 'line').length;
}
