// The sync engine (Era 5.2). Local (localStorage) stays the live read/write path for the editor;
// the cloud is a background MIRROR. runSync() reconciles the two by comparing each record's
// client-controlled updatedAt (both providers derive it the same way, so a pushed record matches
// on both sides and never loops). reconcile() is a pure function — the whole merge policy in one
// testable place; runSync() is the thin impure orchestrator that applies the plan.
//
// Conflict policy: a record changed on BOTH sides since this device last synced is a true conflict
// (concurrent edits). Remote wins as canonical and the local edit is preserved as a
// "(conflicted copy)" — never a silent overwrite, because a user's graphics are irreplaceable.
// Otherwise it's plain last-write-wins by updatedAt. Deletes travel as tombstones (records with
// deleted=true) and win/lose by the same timestamp rule, so a delete propagates instead of the row
// resurrecting.

import type { StorageProvider, StoredRecord, SyncKind } from './storage';
import { uuid } from '../model/id';

/** Only packets and looks sync in 5.2a. Brand (a singleton with cross-device identity subtleties)
 *  and the working project arrive in 5.2b. */
export const SYNC_KINDS: SyncKind[] = ['packet', 'look'];

const SYNC_META_KEY = 'spx-gfx-sync';
const EPOCH = '1970-01-01T00:00:00.000Z';

export interface SyncPlan {
  /** Local records to write to the cloud. */
  toRemote: StoredRecord[];
  /** Cloud records to write into the local store. */
  toLocal: StoredRecord[];
  /** Local records that lost a true conflict — duplicated as a "(conflicted copy)" by the orchestrator. */
  conflicts: StoredRecord[];
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
}

const recordKey = (r: StoredRecord) => `${r.kind}:${r.id}`;

/**
 * Pure reconciliation. `since` is when this device last synced; a record whose BOTH sides changed
 * after it is a genuine concurrent-edit conflict.
 */
export function reconcile(local: StoredRecord[], remote: StoredRecord[], since: string): SyncPlan {
  const plan: SyncPlan = { toRemote: [], toLocal: [], conflicts: [] };
  const L = new Map(local.map((r) => [recordKey(r), r]));
  const R = new Map(remote.map((r) => [recordKey(r), r]));

  // On the very first sync there is no baseline, so "changed since last sync" is meaningless —
  // EVERY real timestamp is after the epoch. Detecting conflicts then would flag every ordinary
  // divergence (e.g. an offline draft vs a newer cloud copy) as a concurrent edit and spawn a
  // spurious "(conflicted copy)". So on a first sync we use pure last-write-wins, no conflicts.
  const firstSync = since === EPOCH;

  for (const key of new Set([...L.keys(), ...R.keys()])) {
    const l = L.get(key);
    const r = R.get(key);
    if (l && !r) {
      plan.toRemote.push(l);
      continue;
    }
    if (r && !l) {
      plan.toLocal.push(r);
      continue;
    }
    if (!l || !r) continue;
    if (l.updatedAt === r.updatedAt) continue; // same version — already in sync

    const bothChanged = !firstSync && l.updatedAt > since && r.updatedAt > since;
    if (bothChanged) {
      // True conflict: remote wins as canonical; keep the local edit as a copy (but never copy a
      // tombstone — a "conflicted copy" of a delete is meaningless, so the remote edit just wins).
      plan.toLocal.push(r);
      if (!l.deleted) plan.conflicts.push(l);
    } else if (l.updatedAt > r.updatedAt) {
      plan.toRemote.push(l);
    } else {
      plan.toLocal.push(r);
    }
  }
  return plan;
}

/**
 * Run one full sync pass between a local and a remote provider. Idempotent: a second run right
 * after finds every record equal and does nothing.
 */
export async function runSync(local: StorageProvider, remote: StorageProvider): Promise<SyncResult> {
  const since = loadLastSyncedAt();
  const localRecs = (await Promise.all(SYNC_KINDS.map((k) => local.list(k)))).flat();
  const remoteRecs = (await Promise.all(SYNC_KINDS.map((k) => remote.list(k)))).flat();

  const plan = reconcile(localRecs, remoteRecs, since);

  // Pull: re-fetch each record via get() so the provider can rehydrate externalized assets
  // (list() returns cheap sentinel bodies; get() returns the full body). Falls back to the
  // list record if get() returns nothing.
  for (const r of plan.toLocal) {
    const full = (await remote.get(r.kind, r.id)) ?? r;
    await local.put(full);
  }
  for (const r of plan.toRemote) await remote.put(r);
  for (const loser of plan.conflicts) {
    const copy = makeConflictCopy(loser);
    await local.put(copy);
    await remote.put(copy);
  }

  saveLastSyncedAt(new Date().toISOString());
  return { pushed: plan.toRemote.length, pulled: plan.toLocal.length, conflicts: plan.conflicts.length };
}

/** Duplicate a conflict loser under a fresh id + name so both edits survive. */
function makeConflictCopy(r: StoredRecord): StoredRecord {
  const id = uuid();
  const now = new Date().toISOString();
  const src = r.body as Record<string, unknown>;
  const name = typeof src.name === 'string' ? src.name : 'Untitled';
  const body = { ...src, id, updatedAt: now, deleted: false, name: `${name} (conflicted copy)` };
  return { kind: r.kind, id, updatedAt: now, deleted: false, body };
}

// ── last-synced bookmark (per browser) ───────────────────────────────────────────────────────────
export function loadLastSyncedAt(): string {
  try {
    const meta = JSON.parse(localStorage.getItem(SYNC_META_KEY) ?? '{}') as { lastSyncedAt?: string };
    return meta.lastSyncedAt || EPOCH;
  } catch {
    return EPOCH;
  }
}

function saveLastSyncedAt(ts: string): void {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify({ lastSyncedAt: ts }));
  } catch {
    // Non-fatal — worst case the next sync re-checks records it already synced.
  }
}

/** Reset the sync bookmark (used on sign-out so a different user re-reconciles from scratch). */
export function resetSyncBookmark(): void {
  try {
    localStorage.removeItem(SYNC_META_KEY);
  } catch {
    // Non-fatal.
  }
}
