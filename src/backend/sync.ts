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
//
// Fault isolation: every record in the plan is applied independently — one failing put can never
// sink the pass, and the lastSyncedAt bookmark advances whenever the pass RAN TO COMPLETION. A
// frozen bookmark is worse than a failed record: it makes every later local edit look like a
// concurrent-edit conflict, and remote-wins then overwrites fresh work. What the bookmark can no
// longer vouch for is carried per record instead:
//   - pendingPush: keys whose push failed — their local edit never reached the cloud, so they
//     count as locally-changed regardless of the bookmark (a later remote edit is then a true
//     conflict, not a silent remote-wins overwrite).
//   - pendingConflict: keys whose "(conflicted copy)" could not be written — the overwriting pull
//     is skipped and the conflict branch is forced again next pass, until the copy materializes.
// Conflict copies are applied BEFORE the pulls that overwrite their originals, so a crash or
// failure mid-pass can never lose the only copy of a user's work.
//
// Cross-account ids: a local-first record created under a previously signed-in account collides
// with that account's cloud row — the upsert hits the foreign row and RLS denies it, forever.
// Retrying can never succeed, so a denied put (isPutDenied) resolves permanently: the record is
// RE-MINTED under a fresh id locally (the work belongs to whoever is signed in here), the foreign
// id is tombstoned locally, and the new id pushes cleanly. A denied TOMBSTONE deletes nothing of
// ours in the cloud, so it is dropped silently (the 90-day purge removes it locally).

import { isPutDenied, isSingleton, type StorageProvider, type StoredRecord, type SyncKind } from './storage';
import { uuid } from '../model/id';

export const SYNC_KINDS: SyncKind[] = ['packet', 'look', 'brand', 'project', 'show', 'video'];

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

/** Per-record carry-over between passes — what the bookmark alone can no longer vouch for. */
export interface SyncPending {
  /** Record keys whose last push FAILED: treat as locally-changed regardless of the bookmark. */
  push?: Set<string>;
  /** Record keys whose "(conflicted copy)" is still owed: force the conflict branch again. */
  conflict?: Set<string>;
}

/** One record the pass could not apply. Surfaced in SyncStatus; retried next pass. */
export interface SyncFailure {
  kind: SyncKind;
  id: string;
  /** Human name from the record body (falls back to the id). */
  name: string;
  op: 'push' | 'pull' | 'conflict-copy';
  message: string;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  /** Records re-minted under a fresh id after the cloud denied the old one (owned by another account). */
  reminted: number;
  /** Per-record failures the pass survived. Empty on a clean pass. */
  failures: SyncFailure[];
}

// Packets/looks reconcile by id; singletons (brand, project) reconcile by KIND — there is at most
// one per user, and its id differs between local (a local uuid) and cloud (a per-user deterministic
// uuid), so matching by kind is what pairs them.
const recordKey = (r: StoredRecord) => (isSingleton(r.kind) ? r.kind : `${r.kind}:${r.id}`);

const recordName = (r: StoredRecord): string => {
  const n = (r.body as { name?: unknown } | null)?.name;
  return typeof n === 'string' && n ? n : r.id;
};

/**
 * Pure reconciliation. `since` is when this device last synced; a record whose BOTH sides changed
 * after it is a genuine concurrent-edit conflict. `pending` carries the per-record debts from
 * earlier passes (see SyncPending).
 */
export function reconcile(
  local: StoredRecord[],
  remote: StoredRecord[],
  since: string,
  pending?: SyncPending,
): SyncPlan {
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

    // A record whose last push FAILED is locally-changed no matter what the bookmark says — its
    // edit never reached the cloud, so the bookmark can't vouch for it.
    const localChanged = l.updatedAt > since || pending?.push?.has(key) === true;
    const remoteChanged = r.updatedAt > since;
    // An owed "(conflicted copy)" forces the conflict branch again until the copy materializes.
    const owedCopy = pending?.conflict?.has(key) === true;

    // Singletons can't have a "(conflicted copy)" (there's only ever one), so they're always plain
    // last-write-wins — a concurrent edit just means the newer device wins.
    const bothChanged =
      !isSingleton(l.kind) && ((!firstSync && localChanged && remoteChanged) || owedCopy);
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
 * after finds every record equal and does nothing. Per-record failures never sink the pass — they
 * are collected into the result and carried in the pending sets (see the header).
 */
export async function runSync(local: StorageProvider, remote: StorageProvider): Promise<SyncResult> {
  const meta = loadSyncMeta();
  // list() failures DO fail the whole pass: without both sides there is nothing to reconcile, and
  // the bookmark stays put (correct — nothing was applied).
  const localRecs = (await Promise.all(SYNC_KINDS.map((k) => local.list(k)))).flat();
  const remoteRecs = (await Promise.all(SYNC_KINDS.map((k) => remote.list(k)))).flat();

  const plan = reconcile(localRecs, remoteRecs, meta.lastSyncedAt, {
    push: new Set(meta.pendingPush),
    conflict: new Set(meta.pendingConflict),
  });

  const failures: SyncFailure[] = [];
  const pendingPush = new Set<string>();
  const pendingConflict = new Set<string>();
  let pushed = 0;
  let pulled = 0;
  let conflicts = 0;
  let reminted = 0;

  const fail = (op: SyncFailure['op'], r: StoredRecord, e: unknown): void => {
    failures.push({
      kind: r.kind,
      id: r.id,
      name: recordName(r),
      op,
      message: e instanceof Error ? e.message : String(e),
    });
  };

  // 1. Conflict copies FIRST: duplicate the losing local edit before the pull overwrites it, so a
  //    failure (or a crash) mid-pass can never lose the only copy of a user's work.
  const skipPull = new Set<string>();
  for (const loser of plan.conflicts) {
    const copy = makeConflictCopy(loser);
    try {
      await local.put(copy);
      conflicts += 1;
    } catch (e) {
      // The copy never materialized — keep the original safe: skip the overwriting pull and
      // remember the debt so the next pass forces the conflict branch again.
      skipPull.add(recordKey(loser));
      pendingConflict.add(recordKey(loser));
      fail('conflict-copy', loser, e);
      continue;
    }
    // Push the copy best-effort; if it fails, next pass sees a local-only record and pushes it.
    try {
      await remote.put(copy);
    } catch (e) {
      fail('push', copy, e);
    }
  }

  // 2. Pull: re-fetch each record via get() so the provider can rehydrate externalized assets
  //    (list() returns cheap sentinel bodies; get() returns the full body). Falls back to the
  //    list record if get() returns nothing. A failed pull just retries next pass — LWW
  //    re-derives it from the unchanged timestamps.
  for (const r of plan.toLocal) {
    if (skipPull.has(recordKey(r))) continue;
    try {
      const full = (await remote.get(r.kind, r.id)) ?? r;
      await local.put(full);
      pulled += 1;
    } catch (e) {
      fail('pull', r, e);
    }
  }

  // 3. Push. A denied put (RLS — the cloud row's id belongs to another account) can never succeed
  //    by retrying, so it resolves permanently: re-mint live records under a fresh id, drop
  //    tombstones (they delete nothing of ours). Singletons can't collide (their cloud id is
  //    per-user deterministic), so a denial there is surfaced as an ordinary failure.
  for (const l of plan.toRemote) {
    try {
      await remote.put(l);
      pushed += 1;
    } catch (e) {
      if (isPutDenied(e) && !isSingleton(l.kind)) {
        if (l.deleted) continue; // a tombstone for a foreign row — nothing of ours to delete
        try {
          const fresh = remintRecord(l);
          await local.put(fresh); // the work is safe under its new id before anything else
          await local.remove(l.kind, l.id); // tombstone the foreign id locally
          await remote.put(fresh);
          reminted += 1;
          pushed += 1;
        } catch (e2) {
          pendingPush.add(recordKey(l));
          fail('push', l, e2);
        }
      } else {
        pendingPush.add(recordKey(l));
        fail('push', l, e);
      }
    }
  }

  // The pass ran to completion, so the bookmark advances — per-record failures are carried in the
  // pending sets (rebuilt each pass from what actually failed), never by freezing the bookmark.
  saveSyncMeta({
    lastSyncedAt: new Date().toISOString(),
    pendingPush: [...pendingPush],
    pendingConflict: [...pendingConflict],
  });
  return { pushed, pulled, conflicts, reminted, failures };
}

/** Duplicate a conflict loser under a fresh id + name so both edits survive. */
function makeConflictCopy(r: StoredRecord): StoredRecord {
  const id = uuid();
  const now = new Date().toISOString();
  const src = r.body as Record<string, unknown>;
  const name = typeof src.name === 'string' ? src.name : 'Untitled';
  const body: Record<string, unknown> = { ...src, id, updatedAt: now, deleted: false, name: `${name} (conflicted copy)` };
  // A show's hosted control page belongs to the ORIGINAL — a copy carrying the same slug could
  // publish over it. The copy starts unpublished.
  delete body.hostedSlug;
  return { kind: r.kind, id, updatedAt: now, deleted: false, body };
}

/** The same record under a fresh id (content untouched) — the cross-account collision resolution. */
function remintRecord(r: StoredRecord): StoredRecord {
  const id = uuid();
  const src = r.body as Record<string, unknown>;
  return { kind: r.kind, id, updatedAt: r.updatedAt, deleted: false, body: { ...src, id } };
}

// ── sync metadata (per browser): the bookmark + the per-record pending sets ──────────────────────
// Additive optional fields on one localStorage JSON object — readers default what's missing, so
// no version/migration is needed (the schema-versioning pattern's additive rule).
interface SyncMeta {
  lastSyncedAt: string;
  pendingPush: string[];
  pendingConflict: string[];
}

function loadSyncMeta(): SyncMeta {
  try {
    const m = JSON.parse(localStorage.getItem(SYNC_META_KEY) ?? '{}') as Partial<SyncMeta>;
    const strings = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : [];
    return {
      lastSyncedAt: typeof m.lastSyncedAt === 'string' && m.lastSyncedAt ? m.lastSyncedAt : EPOCH,
      pendingPush: strings(m.pendingPush),
      pendingConflict: strings(m.pendingConflict),
    };
  } catch {
    return { lastSyncedAt: EPOCH, pendingPush: [], pendingConflict: [] };
  }
}

function saveSyncMeta(meta: SyncMeta): void {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  } catch {
    // Non-fatal — worst case the next sync re-checks records it already synced.
  }
}

export function loadLastSyncedAt(): string {
  return loadSyncMeta().lastSyncedAt;
}

/** Reset the sync bookmark + pending sets (called on sign-out so a different user re-reconciles
 *  from scratch — another account's bookmark or debts must never shape this one's merges). */
export function resetSyncBookmark(): void {
  try {
    localStorage.removeItem(SYNC_META_KEY);
  } catch {
    // Non-fatal.
  }
}
