// The current working project, autosaved locally (Era 5.2b) so a reload restores your last graphic
// instead of a blank default. The wizard-first startup is unchanged — closing the wizard drops you
// back onto your last work. One "current project" slot: creating a new graphic overwrites it (save
// important shows into Packets, which are kept and synced separately). Cloud sync of this single
// 'project' record lands next, alongside brand, via the singleton mechanism.

import type { SpxTemplate } from './types';
import { uuid } from './id';

export interface SavedProject {
  id: string;
  name: string;
  updatedAt: string; // ISO
  template: SpxTemplate;
  /** Soft-delete tombstone (for cloud sync parity — see Packet.deleted). */
  deleted?: boolean;
}

const STORAGE_KEY = 'spx-gfx-project';

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
 */
export function saveProject(template: SpxTemplate): void {
  try {
    const existing = loadProject();
    const rec: SavedProject = {
      id: existing?.id ?? uuid(),
      name: template.name,
      updatedAt: new Date().toISOString(),
      template,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
  } catch {
    // Storage full or unavailable — non-fatal.
  }
}

export function clearProject(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-fatal.
  }
}
