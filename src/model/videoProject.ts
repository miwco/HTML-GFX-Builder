// Persistence for video projects, mirroring project.ts (one autosaved "current" slot) and
// packets.ts (a durable saved list with soft-delete tombstones for future cloud sync).
// Completely separate keys from the SPX world - the two editors never touch each other's
// storage. Cloud sync of these records is a follow-up (the `kind: 'video'` discriminant and
// the AssetFile shape are already sync-ready); the code notes where it plugs in.

import type { VideoProject } from './videoTypes';

/** The current working video project - autosaved so a reload restores it. One slot. */
const CURRENT_KEY = 'spx-gfx-video-project';
/** Explicitly saved video projects ("My videos"). */
const SAVED_KEY = 'spx-gfx-video-saved';

/** A saved-list record. Soft-delete tombstone for cloud-sync parity (see Packet.deleted). */
export interface SavedVideoRecord {
  id: string;
  name: string;
  updatedAt: string; // ISO
  project: VideoProject;
  deleted?: boolean;
}

function notifyDataChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('spx-data-changed'));
}

function isVideoProject(p: unknown): p is VideoProject {
  return (
    !!p &&
    typeof p === 'object' &&
    (p as VideoProject).kind === 'video' &&
    typeof (p as VideoProject).id === 'string' &&
    typeof (p as VideoProject).tsx === 'string'
  );
}

/** Fill in fields added after a record was stored (forward-compatible load). */
function normalizeVideoProject(p: VideoProject): VideoProject {
  const inputs = Array.isArray(p.inputs) ? p.inputs : [];
  // A project stored before authoredFor existed: we don't know what its code was written for,
  // and guessing would raise a drift warning about settings nobody has touched. null = silent.
  const authoredFor = p.authoredFor ?? null;
  // Records stored before the engine existed are Remotion projects by definition.
  const engine = p.engine === 'hyperframes' ? 'hyperframes' : 'remotion';
  const html = typeof p.html === 'string' ? p.html : '';
  if (
    inputs === p.inputs &&
    authoredFor === p.authoredFor &&
    engine === p.engine &&
    html === p.html
  ) {
    return p;
  }
  return { ...p, inputs, authoredFor, engine, html };
}

// ── Current slot ─────────────────────────────────────────────────────────────

/**
 * Whether an autosaved video project exists - an existence probe only. The slot can hold
 * megabytes of data-URL assets, so boot-time code (the wizard's should-I-open decision)
 * must not parse it just to learn there is work to return to.
 */
export function hasCurrentVideoProject(): boolean {
  try {
    return localStorage.getItem(CURRENT_KEY) !== null;
  } catch {
    return false;
  }
}

export function loadCurrentVideoProject(): VideoProject | null {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    return isVideoProject(p) ? normalizeVideoProject(p) : null;
  } catch {
    return null;
  }
}

/**
 * Persist the working video project. Returns false when storage is full (base64 video
 * assets can blow the localStorage quota) so the shell can warn instead of losing work
 * silently - unlike SPX's saveProject, which fails silently on much smaller documents.
 */
export function saveCurrentVideoProject(project: VideoProject): boolean {
  try {
    localStorage.setItem(
      CURRENT_KEY,
      JSON.stringify({ ...project, updatedAt: new Date().toISOString() }),
    );
    notifyDataChanged();
    return true;
  } catch {
    return false;
  }
}

export function clearCurrentVideoProject(): void {
  try {
    localStorage.removeItem(CURRENT_KEY);
    notifyDataChanged();
  } catch {
    // Non-fatal.
  }
}

// ── Saved list ("My videos") ─────────────────────────────────────────────────

function readSaved(): SavedVideoRecord[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list
      .filter((r): r is SavedVideoRecord => !!r && isVideoProject((r as SavedVideoRecord).project))
      .map((r) => ({ ...r, project: normalizeVideoProject(r.project) }));
  } catch {
    return [];
  }
}

function writeSaved(list: SavedVideoRecord[]): boolean {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    notifyDataChanged();
    return true;
  } catch {
    return false;
  }
}

/** Live (non-tombstoned) saved projects, newest first. */
export function listSavedVideoProjects(): SavedVideoRecord[] {
  return readSaved()
    .filter((r) => !r.deleted)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/** Save or update a project in the list (keyed by project.id). Returns false on quota. */
export function upsertSavedVideoProject(project: VideoProject): boolean {
  const rec: SavedVideoRecord = {
    id: project.id,
    name: project.name,
    updatedAt: new Date().toISOString(),
    project,
  };
  const rest = readSaved().filter((r) => r.id !== project.id);
  return writeSaved([rec, ...rest]);
}

/** Tombstone a saved project (kept in storage for cloud-sync deletes). The payload is
 *  stripped to a minimal stub — video assets are big, and a tombstone only needs to carry
 *  the id + timestamp (the stub still passes isVideoProject, so the record stays readable). */
export function deleteSavedVideoProject(id: string): void {
  const list = readSaved().map((r) =>
    r.id === id
      ? {
          ...r,
          deleted: true,
          updatedAt: new Date().toISOString(),
          project: { ...r.project, tsx: '', html: '', assets: [], chat: [], inputs: [] },
        }
      : r,
  );
  writeSaved(list);
}

// ── The cloud-sync seam (backend/storage.ts 'video' kind) ────────────────────

/** All saved records INCLUDING tombstones — for the sync engine. */
export function loadAllSavedVideoRecords(): SavedVideoRecord[] {
  return readSaved();
}

/** Insert or replace a whole record by id (the storage seam's put('video'), incl. a pulled
 *  tombstone). Preserves the given updatedAt and deleted flag — never restamps. */
export function upsertSavedVideoRecord(record: SavedVideoRecord): void {
  const rest = readSaved().filter((r) => r.id !== record.id);
  writeSaved([record, ...rest]);
}

/** Drop local tombstones older than the cutoff (the sync controller's coordinated purge). */
export function purgeOldVideoTombstones(beforeIso: string): void {
  const all = readSaved();
  const kept = all.filter((r) => !r.deleted || r.updatedAt >= beforeIso);
  if (kept.length !== all.length) writeSaved(kept);
}
