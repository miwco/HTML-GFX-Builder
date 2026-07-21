// The SHOW data layer (Phase 5). A show is the rundown-level unit: an ORDERED set of
// graphics that run together on air (bug + lower third + ticker), each keeping its own
// state machine. Its control page aggregates every graphic's controls — the single-graphic
// case is just a show of one. Shows reuse the packet manager's storage conventions
// (localStorage, updatedAt for LWW sync, soft-delete tombstones) so the cloud sync engine
// can adopt the kind without a second pattern.

import type { SpxTemplate } from './types';
import type { SavedGraphic } from './packets';
import { uuid } from './id';

export interface Show {
  id: string;
  name: string;
  /** In rundown order — the order the control page presents them. */
  graphics: SavedGraphic[];
  /** The hosted control page's capability slug, once published (control/hostedControl.ts).
   *  Kept on the record so the URL survives reloads and the show export can bake the hosted
   *  receiver into its graphics. Rotating/unpublishing clears it. */
  hostedSlug?: string;
  /** When the show last changed (ISO). Bumped on every mutation; drives cloud sync (LWW). */
  updatedAt: string;
  /** Soft-delete tombstone (hidden from the UI, kept so the delete syncs). See Packet.deleted. */
  deleted?: boolean;
}

const SHOWS_KEY = 'spx-gfx-shows';

const nowIso = () => new Date().toISOString();

/** See packets.ts BACKFILL_TS — a stable old timestamp for records saved before updatedAt. */
const BACKFILL_TS = '1970-01-01T00:00:00.000Z';

function notifyDataChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('spx-data-changed'));
  }
}

function saveAll(list: Show[]): string | null {
  try {
    localStorage.setItem(SHOWS_KEY, JSON.stringify(list));
    notifyDataChanged();
    return null;
  } catch {
    return 'Browser storage is full — remove a graphic from the show or delete an old show.';
  }
}

/** All shows INCLUDING tombstones — for the sync engine. Back-fills a stable sync timestamp. */
export function loadAllShows(): Show[] {
  try {
    const list = JSON.parse(localStorage.getItem(SHOWS_KEY) ?? '[]') as Show[];
    return list.map((s) => (s.updatedAt ? s : { ...s, updatedAt: BACKFILL_TS }));
  } catch {
    return [];
  }
}

/** Live shows for the UI (tombstones hidden). */
export function loadShows(): Show[] {
  return loadAllShows().filter((s) => !s.deleted);
}

export function createShow(name: string): Show[] {
  const all = loadAllShows();
  all.push({ id: uuid(), name: name.trim() || 'Untitled show', graphics: [], updatedAt: nowIso() });
  saveAll(all);
  return all.filter((s) => !s.deleted);
}

/** Insert or replace a whole show by id (the storage seam's put('show'), incl. tombstones). */
export function upsertShow(show: Show): void {
  const all = loadAllShows();
  const i = all.findIndex((s) => s.id === show.id);
  if (i >= 0) all[i] = show;
  else all.push(show);
  saveAll(all);
}

/**
 * Add the current graphic to a show. Same rule as packets: a graphic with the same NAME is
 * replaced in place (adding twice = updating it, keeping its rundown position); a new name
 * appends at the end of the rundown.
 */
export function addGraphicToShow(showId: string, template: SpxTemplate): { shows: Show[]; error: string | null } {
  const all = loadAllShows();
  const show = all.find((s) => s.id === showId && !s.deleted);
  if (!show) return { shows: all.filter((s) => !s.deleted), error: 'That show no longer exists.' };
  const graphic: SavedGraphic = {
    id: uuid(),
    name: template.name,
    type: template.type,
    savedAt: nowIso(),
    template,
  };
  const existing = show.graphics.findIndex((g) => g.name === template.name);
  if (existing >= 0) show.graphics[existing] = graphic;
  else show.graphics.push(graphic);
  show.updatedAt = nowIso();
  return { shows: all.filter((s) => !s.deleted), error: saveAll(all) };
}

export function removeShowGraphic(showId: string, graphicId: string): Show[] {
  const all = loadAllShows();
  const show = all.find((s) => s.id === showId);
  if (show) {
    show.graphics = show.graphics.filter((g) => g.id !== graphicId);
    show.updatedAt = nowIso();
  }
  saveAll(all);
  return all.filter((s) => !s.deleted);
}

/** Move a graphic one slot up or down the rundown. */
export function moveShowGraphic(showId: string, graphicId: string, dir: -1 | 1): Show[] {
  const all = loadAllShows();
  const show = all.find((s) => s.id === showId);
  if (show) {
    const i = show.graphics.findIndex((g) => g.id === graphicId);
    const j = i + dir;
    if (i >= 0 && j >= 0 && j < show.graphics.length) {
      const g = show.graphics[i];
      show.graphics[i] = show.graphics[j];
      show.graphics[j] = g;
      show.updatedAt = nowIso();
      saveAll(all);
    }
  }
  return all.filter((s) => !s.deleted);
}

/** Record (or clear, with undefined) a show's hosted control slug after (un)publishing. */
export function setShowHostedSlug(showId: string, slug: string | undefined): Show[] {
  const all = loadAllShows();
  const show = all.find((s) => s.id === showId);
  if (show) {
    if (slug) show.hostedSlug = slug;
    else delete show.hostedSlug;
    show.updatedAt = nowIso();
    saveAll(all);
  }
  return all.filter((s) => !s.deleted);
}

/** Delete = tombstone (strip payload, keep the id + fresh timestamp) so the delete syncs. */
export function deleteShow(showId: string): Show[] {
  const all = loadAllShows();
  const show = all.find((s) => s.id === showId);
  if (show) {
    show.deleted = true;
    show.graphics = [];
    show.updatedAt = nowIso();
  }
  saveAll(all);
  return all.filter((s) => !s.deleted);
}

/** Drop local tombstones older than the cutoff (the sync controller's coordinated purge). */
export function purgeOldShowTombstones(beforeIso: string): void {
  const all = loadAllShows();
  const kept = all.filter((s) => !s.deleted || s.updatedAt >= beforeIso);
  if (kept.length !== all.length) saveAll(kept);
}
