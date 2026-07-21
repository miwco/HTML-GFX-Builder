// The storage seam for Era-5 cloud sync.
//
// Today all persistence is browser localStorage via the synchronous model helpers
// (model/packets.ts, model/brand.ts) — and that stays the LIVE read/write path for the editor,
// so the offline app is completely unchanged. This module adds the async contract a cloud backend
// will implement (Era 5.2 SupabaseProvider) plus a LocalStorageProvider adapter over the same
// model helpers, so the future background sync engine can treat local and cloud uniformly.
//
// IMPORTANT: nothing here is wired into the UI yet. The provider is the seam the sync engine will
// target in 5.2 — defining it now keeps the sync metadata (updatedAt / tombstones) coherent and
// gives the codec one home. See docs/ERA5_PLAN.md.
//
// Note: `spx-gfx-ai` (AI settings) is deliberately NOT a SyncKind — it holds the raw Anthropic
// key and must never leave the machine to a shared store.

import {
  loadAllPackets,
  upsertPacket,
  deletePacket,
  loadAllLooks,
  upsertLook,
  deleteLook,
  type Packet,
  type SavedLook,
} from '../model/packets';
import { loadBrand, saveBrand, clearBrand, type ProjectBrand } from '../model/brand';
import { loadProject, upsertProject, clearProject, type SavedProject } from '../model/project';
import { loadAllShows, upsertShow, deleteShow, type Show } from '../model/shows';
import {
  loadAllSavedVideoRecords,
  upsertSavedVideoRecord,
  deleteSavedVideoProject,
  type SavedVideoRecord,
} from '../model/videoProject';

/** The kinds of records that sync. */
export type SyncKind = 'packet' | 'look' | 'brand' | 'project' | 'show' | 'video';

// ── denied puts ──────────────────────────────────────────────────────────────
// A put() the backend rejected for OWNERSHIP (Supabase RLS: the row id belongs to another
// account) is the one put failure retrying can never fix. The provider marks it; the sync
// engine resolves it permanently (re-mint the id / drop the tombstone) instead of retrying
// forever. A plain property marker (not a subclass) so the check survives duplicate module
// instances (e.g. cache-busted dynamic imports in specs).

export function markPutDenied<E extends Error>(e: E): E {
  (e as E & { putDenied?: boolean }).putDenied = true;
  return e;
}

export function isPutDenied(e: unknown): boolean {
  return e instanceof Error && (e as Error & { putDenied?: boolean }).putDenied === true;
}

/** Per-user singleton kinds: at most one per user, so the sync engine reconciles them by KIND
 *  (not id) and never makes a "(conflicted copy)". The cloud row uses a per-user deterministic id. */
export const SINGLETON_KINDS: SyncKind[] = ['brand', 'project'];
export function isSingleton(kind: SyncKind): boolean {
  return SINGLETON_KINDS.includes(kind);
}

/**
 * One syncable record plus the metadata the sync engine needs. `body` is the domain object
 * (a Packet, SavedLook, or ProjectBrand). `deleted` is a soft-delete tombstone (populated by the
 * Era-5.2 sync engine) so a delete on one device propagates instead of the row resurrecting from
 * another device's stale copy.
 */
export interface StoredRecord<T = unknown> {
  kind: SyncKind;
  id: string;
  updatedAt: string; // ISO
  deleted?: boolean;
  body: T;
}

/**
 * The backend-agnostic storage contract. LocalStorageProvider implements it over localStorage;
 * Era 5.2 adds SupabaseProvider (Postgres + Storage). All methods are async so a network backend
 * is a drop-in.
 */
export interface StorageProvider {
  list(kind: SyncKind): Promise<StoredRecord[]>;
  get(kind: SyncKind, id: string): Promise<StoredRecord | null>;
  put(record: StoredRecord): Promise<void>;
  remove(kind: SyncKind, id: string): Promise<void>;
}

// The project brand is a per-user singleton. NOTE: 'default' is NOT a valid uuid, so brand is
// deliberately excluded from SYNC_KINDS in 5.2a (it would be rejected by the documents.id uuid PK).
// 5.2b gives the per-user brand a real uuid row before adding it to sync.
export const BRAND_ID = 'default';

/** The client-controlled version timestamp of a record — read from the body it lives on. This is
 *  what the sync engine compares (both providers derive it the same way), so a pushed record has
 *  the SAME updatedAt on both sides and reconcile never loops on it. The fallback is a FIXED old
 *  value (never now()), so a body without a timestamp resolves identically every read. */
export function bodyUpdatedAt(body: unknown): string {
  const u = (body as { updatedAt?: unknown } | null)?.updatedAt;
  return typeof u === 'string' ? u : '1970-01-01T00:00:00.000Z';
}

/** Wrap a domain object as a StoredRecord, deriving updatedAt + the tombstone flag from the body. */
export function toStoredRecord(kind: SyncKind, id: string, body: unknown): StoredRecord {
  return {
    kind,
    id,
    updatedAt: bodyUpdatedAt(body),
    deleted: Boolean((body as { deleted?: unknown } | null)?.deleted),
    body,
  };
}

/**
 * localStorage-backed provider — a thin async adapter over the existing model helpers, so there is
 * exactly one serialization path (no divergence between the live editor and the sync engine). list()
 * surfaces tombstones (loadAll*) so the sync engine can propagate deletes.
 */
export class LocalStorageProvider implements StorageProvider {
  async list(kind: SyncKind): Promise<StoredRecord[]> {
    if (kind === 'packet') return loadAllPackets().map((p) => toStoredRecord('packet', p.id, p));
    if (kind === 'look') return loadAllLooks().map((l) => toStoredRecord('look', l.id, l));
    if (kind === 'show') return loadAllShows().map((s) => toStoredRecord('show', s.id, s));
    if (kind === 'video') return loadAllSavedVideoRecords().map((v) => toStoredRecord('video', v.id, v));
    if (kind === 'project') {
      const project = loadProject();
      return project ? [toStoredRecord('project', project.id, project)] : [];
    }
    const brand = loadBrand();
    return brand ? [toStoredRecord('brand', BRAND_ID, brand)] : [];
  }

  async get(kind: SyncKind, id: string): Promise<StoredRecord | null> {
    const all = await this.list(kind);
    // Singletons match by kind — there is only ever one, whatever id it carries.
    if (isSingleton(kind)) return all[0] ?? null;
    return all.find((r) => r.id === id) ?? null;
  }

  async put(record: StoredRecord): Promise<void> {
    if (record.kind === 'packet') upsertPacket(record.body as Packet);
    else if (record.kind === 'look') upsertLook(record.body as SavedLook);
    else if (record.kind === 'show') upsertShow(record.body as Show);
    else if (record.kind === 'video') upsertSavedVideoRecord(record.body as SavedVideoRecord);
    else if (record.kind === 'project') upsertProject(record.body as SavedProject);
    else saveBrand(record.body as ProjectBrand);
  }

  async remove(kind: SyncKind, id: string): Promise<void> {
    if (kind === 'packet') deletePacket(id);
    else if (kind === 'look') deleteLook(id);
    else if (kind === 'show') deleteShow(id);
    else if (kind === 'video') deleteSavedVideoProject(id);
    else if (kind === 'project') clearProject();
    else clearBrand();
  }
}
