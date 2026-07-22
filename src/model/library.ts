// The GRAPHICS LIBRARY (docs/SAVED_CONTENT_MODEL.md): every durably saved graphic is ONE
// GraphicDoc record with a STABLE id — renaming never breaks references. A package
// (model/packets.ts Packet) is a FOLDER over the library: a graphic points at it via
// `packageId`, so "move to package" is one record write and package contents are a filter.
// Control-panel ENTRIES (named data rows an operator switches between) live ON the graphic,
// so they save, reopen, and sync with it.
//
// Storage follows the packet conventions exactly: localStorage list, `updatedAt` LWW,
// soft-delete tombstones, sync kind 'graphic' (supabase migration 0009).

import type { SpxTemplate, TemplateType } from './types';
import { loadAllPackets, upsertPacket, type Packet, type SavedGraphic } from './packets';
import { uuid } from './id';

/** One named, saved data row for a graphic's control panel ("Anna Andersson — Presenter"). */
export interface ControlEntry {
  id: string;
  /** The operator-facing label. Defaults to the entry's first field value when created. */
  label: string;
  /** Field values by SPX field id (f0, f1, …) — the exact shape update() consumes. */
  values: Record<string, string>;
  updatedAt: string; // ISO
}

export interface GraphicDoc {
  /** Format version — bump only on a breaking shape change, migrating in loadAllGraphics. */
  version: 1;
  id: string;
  name: string;
  type: TemplateType;
  /** The package (Packet id) this graphic belongs to; null = standalone. */
  packageId: string | null;
  template: SpxTemplate;
  /** The pristine create-time template — the editor's Reset target travels with the save. */
  baseline?: SpxTemplate;
  /** The control panel's saved data entries, in list order. */
  entries: ControlEntry[];
  /** Which entry is selected in the control panel (null = the template's own defaults). */
  activeEntryId: string | null;
  createdAt: string; // ISO
  /** Last change (ISO). Bumped on every mutation; drives cloud sync (LWW). */
  updatedAt: string;
  /** Soft-delete tombstone (hidden from the UI, kept so the delete syncs). See Packet.deleted. */
  deleted?: boolean;
}

const GRAPHICS_KEY = 'spx-gfx-graphics';

const nowIso = () => new Date().toISOString();

function notifyDataChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('spx-data-changed'));
  }
}

function saveAll(list: GraphicDoc[]): string | null {
  try {
    localStorage.setItem(GRAPHICS_KEY, JSON.stringify(list));
    notifyDataChanged();
    return null;
  } catch {
    return 'Browser storage is full — delete an old graphic (large fonts/images count) or export and remove one.';
  }
}

/** Normalize a stored record to the current shape (additive fields defaulted, never a crash). */
function normalize(doc: GraphicDoc): GraphicDoc {
  return {
    ...doc,
    version: 1,
    packageId: doc.packageId ?? null,
    entries: Array.isArray(doc.entries) ? doc.entries : [],
    activeEntryId: doc.activeEntryId ?? null,
    createdAt: doc.createdAt ?? doc.updatedAt ?? '1970-01-01T00:00:00.000Z',
    updatedAt: doc.updatedAt ?? '1970-01-01T00:00:00.000Z',
  };
}

/** All graphics INCLUDING tombstones — for the sync engine. Runs the packet migration first. */
export function loadAllGraphics(): GraphicDoc[] {
  migrateEmbeddedGraphics();
  try {
    const list = JSON.parse(localStorage.getItem(GRAPHICS_KEY) ?? '[]') as GraphicDoc[];
    return list.map(normalize);
  } catch {
    return [];
  }
}

/** Live graphics for the UI (tombstones hidden). */
export function loadGraphics(): GraphicDoc[] {
  return loadAllGraphics().filter((g) => !g.deleted);
}

export function graphicById(id: string): GraphicDoc | null {
  return loadGraphics().find((g) => g.id === id) ?? null;
}

/** Insert or replace a whole graphic by id (the storage seam's put('graphic'), incl. tombstones). */
export function upsertGraphic(doc: GraphicDoc): void {
  const all = rawGraphics();
  const i = all.findIndex((g) => g.id === doc.id);
  if (i >= 0) all[i] = doc;
  else all.push(doc);
  saveAll(all);
}

/** Create a new library record from the working template. Returns the doc (or an error). */
export function createGraphic(
  template: SpxTemplate,
  opts: { name: string; packageId?: string | null; baseline?: SpxTemplate; entries?: ControlEntry[]; activeEntryId?: string | null },
): { doc: GraphicDoc; error: string | null } {
  const doc: GraphicDoc = {
    version: 1,
    id: uuid(),
    name: opts.name.trim() || template.name || 'Untitled graphic',
    type: template.type,
    packageId: opts.packageId ?? null,
    template: { ...template, name: opts.name.trim() || template.name },
    baseline: opts.baseline,
    entries: opts.entries ?? [],
    activeEntryId: opts.activeEntryId ?? null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const all = rawGraphics();
  all.push(doc);
  return { doc, error: saveAll(all) };
}

/** Update fields of an existing graphic (the Save path, rename, move, entries…). */
export function updateGraphic(
  id: string,
  patch: Partial<Pick<GraphicDoc, 'name' | 'packageId' | 'template' | 'baseline' | 'entries' | 'activeEntryId'>>,
): { doc: GraphicDoc | null; error: string | null } {
  const all = rawGraphics();
  const doc = all.find((g) => g.id === id && !g.deleted);
  if (!doc) return { doc: null, error: 'That graphic no longer exists.' };
  Object.assign(doc, patch);
  if (patch.name) doc.template = { ...doc.template, name: patch.name };
  doc.type = doc.template.type;
  doc.updatedAt = nowIso();
  return { doc, error: saveAll(all) };
}

/** Duplicate a graphic (same package), returning the fresh copy. */
export function duplicateGraphic(id: string): { doc: GraphicDoc | null; error: string | null } {
  const src = graphicById(id);
  if (!src) return { doc: null, error: 'That graphic no longer exists.' };
  const name = `${src.name} copy`;
  return createGraphic({ ...src.template, name }, {
    name,
    packageId: src.packageId,
    baseline: src.baseline,
    entries: src.entries.map((e) => ({ ...e, id: uuid() })),
    activeEntryId: null,
  });
}

/** Delete = tombstone (strip payload, keep the id + fresh timestamp) so the delete syncs. */
export function deleteGraphic(id: string): void {
  const all = rawGraphics();
  const doc = all.find((g) => g.id === id);
  if (doc) {
    doc.deleted = true;
    doc.template = { ...doc.template, html: '', css: '', js: '', assets: [], fields: [], layers: [] };
    doc.baseline = undefined;
    doc.entries = [];
    doc.updatedAt = nowIso();
  }
  saveAll(all);
}

/** Drop local tombstones older than the cutoff (the sync controller's coordinated purge). */
export function purgeOldGraphicTombstones(beforeIso: string): void {
  const all = rawGraphics();
  const kept = all.filter((g) => !g.deleted || g.updatedAt >= beforeIso);
  if (kept.length !== all.length) saveAll(kept);
}

/** The raw stored list without triggering the migration (internal, and for the migration itself). */
function rawGraphics(): GraphicDoc[] {
  try {
    const list = JSON.parse(localStorage.getItem(GRAPHICS_KEY) ?? '[]') as GraphicDoc[];
    return list.map(normalize);
  } catch {
    return [];
  }
}

// ── The packet migration (v1 embedded graphics → library records) ────────────────────────────
//
// Pre-library packets EMBED their graphics (Packet.graphics: SavedGraphic[]). On read, any
// embedded graphic found — in a v1 packet, or written into a v2 one by an older build — is
// extracted into the library under the EMBEDDED RECORD'S OWN id (already a real uuid), so two
// devices migrating the same packet converge on the same library rows instead of minting
// duplicates. The packet is then rewritten with graphics: [] + version: 2. Convergent:
// re-running finds nothing embedded and does nothing. An older build reading a v2 packet sees
// an empty-but-valid packet (its own writes re-embed, which the next migration extracts), and
// never touches the library key, so no data is ever eaten.

export function migrateEmbeddedGraphics(): void {
  let packets: Packet[];
  try {
    packets = loadAllPackets();
  } catch {
    return;
  }
  const pending = packets.filter((p) => !p.deleted && Array.isArray(p.graphics) && p.graphics.length > 0);
  if (pending.length === 0) return;

  const all = rawGraphics();
  for (const packet of pending) {
    for (const g of packet.graphics) {
      if (!g?.template || !g.id) continue;
      const existing = all.find((doc) => doc.id === g.id);
      if (existing) {
        // Already migrated on another device — keep whichever copy is newer (LWW).
        if (!existing.deleted && g.savedAt > existing.updatedAt) {
          existing.template = g.template;
          existing.name = g.name;
          existing.type = g.type;
          existing.packageId = packet.id;
          existing.updatedAt = g.savedAt;
        }
        continue;
      }
      all.push({
        version: 1,
        id: g.id,
        name: g.name,
        type: g.type,
        packageId: packet.id,
        template: g.template,
        entries: [],
        activeEntryId: null,
        createdAt: g.savedAt,
        updatedAt: g.savedAt,
      });
    }
    upsertPacket({ ...packet, graphics: [], version: 2, updatedAt: nowIso() });
  }
  saveAll(all);
}

// ── Package helpers over the library ─────────────────────────────────────────────────────────

/** Live graphics grouped by package id ('' = standalone), newest first inside each group. */
export function graphicsInPackage(packageId: string | null): GraphicDoc[] {
  return loadGraphics()
    .filter((g) => (g.packageId ?? null) === packageId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// ── Entry helpers (pure, over one doc's entries list) ────────────────────────────────────────

export function newEntry(label: string, values: Record<string, string>): ControlEntry {
  return { id: uuid(), label, values: { ...values }, updatedAt: nowIso() };
}

/**
 * A show/packet graphic's saved ENTRIES, resolved out of the library — the seam that lets a
 * SavedGraphic copy (shows.ts / packets.ts) carry its live entries without embedding them
 * (they stay authored in ONE place, the GraphicDoc, re-read wherever the graphic is used).
 * A graphic added since the library landed records `graphicId`, the exact record. An older
 * embedded copy carries none: fall back to a UNIQUE name match (a saved graphic's name IS its
 * identity — adding the same name updates it in place), and resolve NO entries when the name is
 * ambiguous rather than guessing which graphic the operator meant. The hosted control page
 * (control/hostedControl.ts) and the show export (export/showExport.ts) share this one lookup.
 */
export function resolveSavedGraphicDoc(graphic: SavedGraphic, library: GraphicDoc[]): GraphicDoc | undefined {
  if (graphic.graphicId) return library.find((d) => d.id === graphic.graphicId);
  const byName = library.filter((d) => d.name === graphic.name);
  return byName.length === 1 ? byName[0] : undefined;
}

export function entriesForSavedGraphic(graphic: SavedGraphic, library: GraphicDoc[]): ControlEntry[] {
  const doc = resolveSavedGraphicDoc(graphic, library);
  return (doc?.entries ?? []).map((e) => ({ ...e, values: { ...e.values } }));
}

/**
 * A show/packet graphic's live TEMPLATE. A SavedGraphic embeds a snapshot of the template from
 * when it was added, but the graphic keeps being EDITED in the library afterwards - so a
 * published or exported show that shipped the snapshot would air a stale design. Resolve the
 * current template out of the library (the same record entriesForSavedGraphic uses); the
 * embedded copy is the fallback ONLY when the record is gone (deleted, another profile) or was
 * never a library graphic (added from an unsaved working document). One authored source, re-read
 * wherever the graphic runs - the entries seam, now for the template too.
 */
export function templateForSavedGraphic(graphic: SavedGraphic, library: GraphicDoc[]): SpxTemplate {
  return resolveSavedGraphicDoc(graphic, library)?.template ?? graphic.template;
}
