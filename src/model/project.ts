// The current working project, autosaved locally (Era 5.2b) so a reload restores your last graphic
// instead of a blank default. The wizard-first startup is unchanged — closing the wizard drops you
// back onto your last work. One "current project" slot: creating a new graphic overwrites it (save
// important shows into Packets, which are kept and synced separately). Cloud sync of this single
// 'project' record lands next, alongside brand, via the singleton mechanism.

import type { SpxTemplate } from './types';
import type { GenerationSpec } from './generationSpec';
import { uuid } from './id';

export interface SavedProject {
  id: string;
  name: string;
  updatedAt: string; // ISO
  template: SpxTemplate;
  /** The pristine template as this project was created/imported — the Reset target.
   *  Optional so projects saved before this existed still load (Reset falls back to the
   *  loaded template in that case). */
  baseline?: SpxTemplate;
  /** Which library graphic (model/library.ts GraphicDoc) this working document IS — the Save
   *  button writes there. null/absent = never saved (a fresh creation). Additive optional. */
  graphicId?: string | null;
  /** True when the working document has changed since its last explicit Save. Persisted so a
   *  reload keeps the honest "Unsaved changes" badge. Additive optional. */
  dirty?: boolean;
  /** The AI generation spec this project was created from (the "More control" setup), kept
   *  so a later refine can start from the same structured decisions. Additive optional. */
  aiSpec?: GenerationSpec | null;
  /** Soft-delete tombstone (for cloud sync parity — see Packet.deleted). */
  deleted?: boolean;
}

const STORAGE_KEY = 'spx-gfx-project';

function notifyDataChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('spx-data-changed'));
}

export function loadProject(): SavedProject | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as SavedProject;
    if (!p.template || !p.id) return null;
    return p;
  } catch {
    return null;
  }
}

/**
 * Persist the working template as the current project, keeping the existing project id (so it stays
 * ONE slot / one cloud row). Non-fatal if storage is full — the working doc just won't persist.
 * `link` records which library graphic this document is and whether it has unsaved changes;
 * omitted, both carry over from the existing slot (a plain autosave).
 */
export function saveProject(
  template: SpxTemplate,
  baseline?: SpxTemplate,
  link?: { graphicId: string | null; dirty: boolean },
  aiSpec?: GenerationSpec | null,
): void {
  try {
    const existing = loadProject();
    const rec: SavedProject = {
      id: existing?.id ?? uuid(),
      name: template.name,
      updatedAt: new Date().toISOString(),
      template,
      // Keep the baseline stable across autosaves; fall back to the existing one.
      baseline: baseline ?? existing?.baseline,
      graphicId: link ? link.graphicId : existing?.graphicId ?? null,
      dirty: link ? link.dirty : existing?.dirty ?? false,
      // undefined = a plain autosave carries the spec over; null explicitly clears it.
      aiSpec: aiSpec === undefined ? existing?.aiSpec ?? null : aiSpec,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
    notifyDataChanged();
  } catch {
    // Storage full or unavailable — non-fatal.
  }
}

/** Write a whole SavedProject to the slot (used by the sync engine's put('project') on a pull). */
export function upsertProject(project: SavedProject): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    notifyDataChanged();
  } catch {
    // Non-fatal.
  }
}

export function clearProject(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifyDataChanged();
  } catch {
    // Non-fatal.
  }
}
