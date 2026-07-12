// The structure-contract detectors + the TemplatePart registry — THE shared element-identity
// contract. Every surface that names or targets a template element (the timeline strip, the
// canvas selection layer, step assignment) goes through getTemplateParts; nothing else may
// invent element naming. The registry is DERIVED from the HTML on every call — recomputed,
// never stored — so hand edits can shrink it but never make it stale, and the code stays the
// single source of truth.

import type { SpxField } from './types';

const ROOT_PREFIX_RE = /class="([\w-]+)-box"/;

/** The template's class prefix, or null when the HTML has no standard-contract box. */
export function detectPrefix(html: string): string | null {
  return html.match(ROOT_PREFIX_RE)?.[1] ?? null;
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
  // Resolved against the parsed DOM, not the first raw-text match.
  const box = doc.querySelector('[class*="-box"]');
  const boxClass = box ? Array.from(box.classList).find((c) => c.endsWith('-box')) : undefined;
  const prefix = boxClass ? boxClass.slice(0, -'-box'.length) : null;

  if (prefix) {
    if (unique(`.${prefix}`)) {
      parts.push({ selector: `.${prefix}`, kind: 'root', label: 'Whole graphic', channel: 'rise' });
    }
    if (unique(`.${prefix}-box`)) {
      parts.push({ selector: `.${prefix}-box`, kind: 'panel', label: 'Panel', channel: 'rise' });
    }
    if (unique(`.${prefix}-accent`)) {
      parts.push({ selector: `.${prefix}-accent`, kind: 'accent', label: 'Accent line', channel: 'rise' });
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
