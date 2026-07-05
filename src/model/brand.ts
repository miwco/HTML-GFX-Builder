// The project brand: the light "broadcast package" mechanism. Every wizard Create captures
// the chosen style family + palette + font (custom colors and imported fonts included) and
// persists it in localStorage. The wizard's "Match current project" toggle (on by default)
// preselects it for the next graphic, so everything made in a project looks like one show.
// (A full named-package manager is deferred — see docs/GOALS.md.)

import type { Palette } from './wizard';
import type { CustomFont, StyleTag } from './fonts';
import { registerAppFont } from './fonts';

export interface ProjectBrand {
  /** The style family of the last created graphic (used to sort its siblings first). */
  styleTag: StyleTag;
  /** The chosen palette — may be a custom one (id 'custom'). */
  palette: Palette;
  /** Bundled font id, or null when an imported font is in use. */
  fontId: string | null;
  /** The imported font (with its embedded data-URL asset), if one is in use. */
  customFont: CustomFont | null;
  /**
   * When this brand was last written (ISO). Stamped by saveBrand; used by Era-5 cloud sync for
   * last-write-wins. Optional so brands built elsewhere (wizard, captured looks) need no change —
   * saveBrand fills it in, loadBrand back-fills legacy records.
   */
  updatedAt?: string;
}

const STORAGE_KEY = 'spx-gfx-brand';

export function saveBrand(brand: ProjectBrand): void {
  try {
    // Stamp the write time so cloud sync (Era 5) can resolve which side is newer.
    const stamped: ProjectBrand = { ...brand, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
  } catch {
    // Storage full or unavailable — the brand just won't persist. Non-fatal.
  }
}

export function loadBrand(): ProjectBrand | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const brand = JSON.parse(raw) as ProjectBrand;
    if (!brand.palette || !brand.styleTag) return null;
    // Back-fill the sync timestamp for brands saved before Era 5 (in-memory; the next save
    // persists it durably). Harmless offline; needed so the record has a timestamp to sync on.
    if (!brand.updatedAt) brand.updatedAt = new Date().toISOString();
    // Make the imported font renderable in the builder UI again after a reload.
    if (brand.customFont && typeof brand.customFont.asset?.data === 'string') {
      registerAppFont(brand.customFont.family, brand.customFont.asset.data);
    }
    return brand;
  } catch {
    return null;
  }
}

/** Forget the project brand (used by the storage seam's remove('brand')). */
export function clearBrand(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-fatal — nothing to remove or storage unavailable.
  }
}
