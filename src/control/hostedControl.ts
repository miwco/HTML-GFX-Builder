// Hosted control (Phase 5): the client side of migration 0008. A local SHOW publishes as a
// control_shows row (id = the local Show.id); operating it is capability-addressed — the
// unguessable slug opens the hosted page at ?control=<slug>, no account needed. Commands
// are INSERTS into the control_events log (DB-ordered, recoverable); staging and the
// graphics' applied-state reports ride the same log as meta rows.
//
// The published `panel` spec also carries each graphic's saved ENTRIES, read out of the
// library at publish time (docs/SAVED_CONTENT_MODEL.md §4) — the hosted page renders them as
// a read-only switcher, so picking one stages its data and airing it stays a deliberate take.

import { getSupabase } from '../backend/supabase';
import type { Show } from '../model/shows';
import { loadGraphics, entriesForSavedGraphic } from '../model/library';
import type { SpxField } from '../model/types';
import { isImageAsset } from '../assets/assetUtils';
import type { ControlMessage } from './controlModel';

/** A saved data row published with the panel (model/library.ts ControlEntry, values only). */
export interface PanelEntry {
  id: string;
  label: string;
  values: Record<string, string>;
}

/** What the hosted page needs to render one graphic's card — never the full template. */
export interface PanelGraphicSpec {
  name: string;
  fields: SpxField[];
  js: string;
  images: { value: string; label: string }[];
  /**
   * The graphic's saved entries, published READ-ONLY (docs/SAVED_CONTENT_MODEL.md §4): the
   * operator picks one, its values STAGE like any typed edit, and nothing airs until a take.
   * Authoring entries stays in the app (`#/control/<id>`) — the hosted page never writes back.
   * Additive: `panel` is jsonb with no version of its own, so a row published by an older
   * build simply carries no entries and is normalized to `[]` on read.
   */
  entries: PanelEntry[];
}

export interface ControlShowRow {
  id: string;
  slug: string;
  title: string;
}

export interface ResolvedControlShow {
  id: string;
  title: string;
  panel: PanelGraphicSpec[];
  staged: Record<string, Record<string, string>>;
  live: Record<string, { data?: Record<string, string>; state?: { groups: Record<string, string> } | null; at?: string }>;
}

/** A log row as delivered by Realtime / the tail RPC. */
export interface ControlEventRow {
  id: number;
  graphic: string;
  msg:
    | ControlMessage
    | { t: 'staged'; data: Record<string, string> }
    | { t: 'live'; data?: Record<string, string>; state?: { groups: Record<string, string> } | null };
}

/** The stored operator spec for a show — one entry per graphic, no template payload. The
 *  entries come from the library via the shared resolver (model/library.ts), by `graphicId`
 *  with a unique-name fallback, so hosted publish and show export agree on the lookup. */
export function buildPanelSpec(show: Show): PanelGraphicSpec[] {
  const library = loadGraphics();
  return show.graphics.map((g) => ({
    name: g.name,
    fields: g.template.fields,
    js: g.template.js,
    images: g.template.assets
      .filter((a) => isImageAsset(a.path))
      .map((a) => ({ value: a.path, label: a.path })),
    entries: entriesForSavedGraphic(g, library).map((e) => ({ id: e.id, label: e.label, values: e.values })),
  }));
}

/** Normalize a stored panel row to the current shape (additive fields defaulted, never a crash). */
function readPanel(panel: unknown): PanelGraphicSpec[] {
  if (!Array.isArray(panel)) return [];
  return (panel as PanelGraphicSpec[]).map((g) => ({
    ...g,
    images: Array.isArray(g.images) ? g.images : [],
    entries: Array.isArray(g.entries) ? g.entries : [],
  }));
}

/** Publish (or update) a show's hosted control page — entries included, re-read from the
 *  library on every publish (so editing them in the app is one re-publish away from air).
 *  Returns its slug, or null offline. */
export async function publishControlShow(show: Show): Promise<string | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { error } = await sb.from('control_shows').upsert(
    { id: show.id, title: show.name, panel: buildPanelSpec(show) },
    { onConflict: 'id' },
  );
  if (error) throw new Error(error.message);
  const { data, error: readError } = await sb.from('control_shows').select('slug').eq('id', show.id).single();
  if (readError) throw new Error(readError.message);
  return (data as { slug: string }).slug;
}

/** The signed-in owner's hosted control pages. */
export async function myControlShows(): Promise<ControlShowRow[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('control_shows').select('id, slug, title').order('created_at');
  if (error) return [];
  return (data ?? []) as ControlShowRow[];
}

export async function unpublishControlShow(id: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from('control_shows').delete().eq('id', id);
}

// ── The operator side (capability-addressed; works signed-out) ───────────────

export async function controlShowBySlug(slug: string): Promise<ResolvedControlShow | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('control_show_by_slug', { p_slug: slug });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    id: row.id as string,
    title: row.title as string,
    panel: readPanel(row.panel),
    staged: (row.staged ?? {}) as ResolvedControlShow['staged'],
    live: (row.live ?? {}) as ResolvedControlShow['live'],
  };
}

/** Send one command — the INSERT is the send. */
export async function sendHostedControl(slug: string, graphic: string, msg: ControlMessage): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc('control_send', { p_slug: slug, p_graphic: graphic, p_msg: msg });
  if (error) throw new Error(error.message);
}

/** Stage PREPARED data — shared with every operator page on this slug. */
export async function stageHostedData(slug: string, graphic: string, data: Record<string, string>): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.rpc('control_stage', { p_slug: slug, p_graphic: graphic, p_data: data });
}

/** The command tail after a known id — a reconnecting side fills its gap from here. */
export async function hostedControlTail(slug: string, afterId: number, graphic?: string): Promise<ControlEventRow[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc('control_tail', { p_slug: slug, p_graphic: graphic ?? null, p_after: afterId });
  if (error) return [];
  return (data ?? []) as ControlEventRow[];
}

/**
 * Live log rows for one show (the show-chat pattern: Realtime nudges, the durable table is
 * the truth). Returns an unsubscribe. Rows arrive in id order per the DB; the caller keeps
 * its own last-seen id and uses hostedControlTail after a gap.
 */
export async function subscribeControlEvents(
  showId: string,
  onRow: (row: ControlEventRow) => void,
): Promise<() => void> {
  const sb = await getSupabase();
  if (!sb) return () => {};
  const channel = sb
    .channel(`control-${showId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'control_events', filter: `show_id=eq.${showId}` },
      (payload) => onRow(payload.new as ControlEventRow),
    )
    .subscribe();
  return () => {
    void sb.removeChannel(channel);
  };
}
