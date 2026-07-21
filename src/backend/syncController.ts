// The sync controller (Era 5.2): the stateful glue between the app and the pure sync engine. Holds
// the provider instances, guards that sync only runs when a backend is configured AND the user is
// signed in, debounces pushes after local edits, serializes overlapping runs, and publishes a
// status other UI can subscribe to. Everything no-ops in offline mode, so the offline app is
// untouched.

import { isBackendConfigured } from './config';
import { getAccessToken } from './auth';
import { LocalStorageProvider } from './storage';
import { SupabaseProvider } from './supabaseProvider';
import { runSync, type SyncResult } from './sync';
import { purgeOldTombstones } from '../model/packets';
import { purgeOldShowTombstones } from '../model/shows';
import { purgeOldVideoTombstones } from '../model/videoProject';

export type SyncPhase = 'offline' | 'syncing' | 'synced' | 'error';
export interface SyncState {
  phase: SyncPhase;
  detail?: string;
  last?: SyncResult;
}

const local = new LocalStorageProvider();
const remote = new SupabaseProvider();

let state: SyncState = { phase: 'offline' };
const listeners = new Set<(s: SyncState) => void>();

function setState(next: SyncState): void {
  state = next;
  listeners.forEach((fn) => fn(next));
}

export function getSyncState(): SyncState {
  return state;
}

export function onSyncState(cb: (s: SyncState) => void): () => void {
  listeners.add(cb);
  cb(state);
  return () => {
    listeners.delete(cb);
  };
}

/** Sync can run only with a configured backend AND a live session. */
async function canSync(): Promise<boolean> {
  if (!isBackendConfigured()) return false;
  return (await getAccessToken()) !== null;
}

let running = false;
let queued = false;

/** Run a sync now (guarded, serialized). Safe to call anytime; no-ops when it can't sync. */
export async function syncNow(): Promise<void> {
  if (!(await canSync())) {
    setState({ phase: 'offline' });
    return;
  }
  if (running) {
    queued = true; // coalesce: one more pass after the current finishes
    return;
  }
  running = true;
  setState({ phase: 'syncing' });
  try {
    // Sync's own pull-writes dispatch 'spx-data-changed' too; that's fine — runSync is idempotent,
    // so the extra pass they schedule finds nothing to do. Not suppressing them means a genuine
    // user edit that lands DURING a sync is never swallowed and gets its own follow-up pass.
    const result = await runSync(local, remote);
    // Coordinated tombstone purge: drop deletes older than the grace period from BOTH sides (same
    // cutoff), so a purged tombstone can't be re-pulled. 90 days is generous; a device offline
    // longer than that could resurrect a delete — an acceptable edge for a beta. Best-effort.
    try {
      const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
      await remote.purgeTombstones(cutoff);
      purgeOldTombstones(cutoff);
      purgeOldShowTombstones(cutoff);
      purgeOldVideoTombstones(cutoff);
    } catch {
      // Never fail a sync on cleanup.
    }
    if (result.failures.length > 0) {
      // The pass completed and the bookmark advanced, but some records could not be applied —
      // surface them (SyncStatus shows the detail as its tooltip). They retry next pass.
      const shown = result.failures.slice(0, 3).map((f) => `${f.kind} "${f.name}": ${f.message}`);
      const extra = result.failures.length > shown.length ? '; …' : '';
      setState({
        phase: 'error',
        detail: `${result.failures.length} record${result.failures.length === 1 ? '' : 's'} failed to sync — ${shown.join('; ')}${extra}`,
        last: result,
      });
    } else {
      setState({ phase: 'synced', last: result });
    }
  } catch (e) {
    setState({ phase: 'error', detail: e instanceof Error ? e.message : String(e) });
  } finally {
    running = false;
    if (queued) {
      queued = false;
      void syncNow();
    }
  }
}

let debounce: ReturnType<typeof setTimeout> | null = null;
function scheduleSync(): void {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => void syncNow(), 2500);
}

let started = false;

/** Begin auto-sync: an initial pass, then a debounced push after every local data change. No-op in
 *  offline mode (never even attaches the listener). Idempotent. */
export function startAutoSync(): void {
  if (started || typeof window === 'undefined' || !isBackendConfigured()) return;
  started = true;
  window.addEventListener('spx-data-changed', scheduleSync);
  void syncNow();
}
