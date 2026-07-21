// Hosted control (Phase 5): the client side of migration 0008. A local SHOW publishes as a
// control_shows row (id = the local Show.id); operating it is capability-addressed — the
// unguessable slug opens the hosted page at ?control=<slug>, no account needed. Commands
// are INSERTS into the control_events log (DB-ordered, recoverable); staging and the
// graphics' applied-state reports ride the same log as meta rows.

import { getSupabase } from '../backend/supabase';
import type { Show } from '../model/shows';
import type { SpxField } from '../model/types';
import { isImageAsset } from '../assets/assetUtils';
import type { ControlMessage } from './controlModel';

/** What the hosted page needs to render one graphic's card — never the full template. */
export interface PanelGraphicSpec {
  name: string;
  fields: SpxField[];
  js: string;
  images: { value: string; label: string }[];
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

function panelSpec(show: Show): PanelGraphicSpec[] {
  return show.graphics.map((g) => ({
    name: g.name,
    fields: g.template.fields,
    js: g.template.js,
    images: g.template.assets
      .filter((a) => isImageAsset(a.path))
      .map((a) => ({ value: a.path, label: a.path })),
  }));
}

/** Publish (or update) a show's hosted control page. Returns its slug, or null offline. */
export async function publishControlShow(show: Show): Promise<string | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { error } = await sb.from('control_shows').upsert(
    { id: show.id, title: show.name, panel: panelSpec(show) },
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
    panel: (row.panel ?? []) as PanelGraphicSpec[],
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
