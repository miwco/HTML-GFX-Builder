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
  loadPackets,
  upsertPacket,
  deletePacket,
  loadLooks,
  upsertLook,
  deleteLook,
  type Packet,
  type SavedLook,
} from '../model/packets';
import { loadBrand, saveBrand, clearBrand, type ProjectBrand } from '../model/brand';

/** The kinds of records that sync. The working document ('project') arrives in Era 5.2. */
export type SyncKind = 'packet' | 'look' | 'brand';

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

/** The project brand is a per-user singleton, so it syncs under one stable id. */
export const BRAND_ID = 'default';

function packetRecord(p: Packet): StoredRecord<Packet> {
  return { kind: 'packet', id: p.id, updatedAt: p.updatedAt, body: p };
}
function lookRecord(l: SavedLook): StoredRecord<SavedLook> {
  return { kind: 'look', id: l.id, updatedAt: l.updatedAt, body: l };
}
function brandRecord(b: ProjectBrand): StoredRecord<ProjectBrand> {
  return { kind: 'brand', id: BRAND_ID, updatedAt: b.updatedAt ?? new Date().toISOString(), body: b };
}

/**
 * localStorage-backed provider — a thin async adapter over the existing model helpers, so there is
 * exactly one serialization path (no divergence between the live editor and the sync engine).
 */
export class LocalStorageProvider implements StorageProvider {
  async list(kind: SyncKind): Promise<StoredRecord[]> {
    if (kind === 'packet') return loadPackets().map(packetRecord);
    if (kind === 'look') return loadLooks().map(lookRecord);
    const brand = loadBrand();
    return brand ? [brandRecord(brand)] : [];
  }

  async get(kind: SyncKind, id: string): Promise<StoredRecord | null> {
    const all = await this.list(kind);
    return all.find((r) => r.id === id) ?? null;
  }

  async put(record: StoredRecord): Promise<void> {
    if (record.kind === 'packet') upsertPacket(record.body as Packet);
    else if (record.kind === 'look') upsertLook(record.body as SavedLook);
    else saveBrand(record.body as ProjectBrand);
  }

  async remove(kind: SyncKind, id: string): Promise<void> {
    if (kind === 'packet') deletePacket(id);
    else if (kind === 'look') deleteLook(id);
    else clearBrand();
  }
}
