// Show Chat data layer (Era 5.4). Thin wrappers over the app's Supabase client for the two
// authenticated surfaces (owner: shows + moderation queue) and the public submit path (anon insert
// + slug lookup). The unattended graphic does NOT use this — it polls the REST endpoint directly
// from its exported block (see chatGraphicBlock.ts). All access is gated by the RLS in
// supabase/migrations/0003_show_chat.sql; this file just calls it.

import { getSupabase } from '../backend/supabase';

export interface ShowRow {
  id: string;
  slug: string;
  title: string;
  is_open: boolean;
}

export interface ChatRow {
  id: string;
  show_id: string;
  author: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected' | 'on_air';
  created_at: string;
}

// ── Owner: shows ─────────────────────────────────────────────────────────────────────────────────
export async function listMyShows(): Promise<ShowRow[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data } = await sb.from('shows').select('id, slug, title, is_open').order('created_at', { ascending: false });
  return (data as ShowRow[] | null) ?? [];
}

export async function createShow(title: string): Promise<{ show: ShowRow | null; error: string | null }> {
  const sb = await getSupabase();
  if (!sb) return { show: null, error: 'Not signed in.' };
  const { data, error } = await sb.from('shows').insert({ title: title.trim() || 'Show chat' }).select('id, slug, title, is_open').single();
  return { show: (data as ShowRow) ?? null, error: error?.message ?? null };
}

export async function setShowOpen(id: string, isOpen: boolean): Promise<void> {
  const sb = await getSupabase();
  await sb?.from('shows').update({ is_open: isOpen }).eq('id', id);
}

export async function deleteShow(id: string): Promise<void> {
  const sb = await getSupabase();
  await sb?.from('shows').delete().eq('id', id);
}

// ── Public submit page (anon) ────────────────────────────────────────────────────────────────────
export async function resolveShow(slug: string): Promise<{ id: string; title: string; is_open: boolean } | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb.rpc('show_by_slug', { p_slug: slug });
  const row = (data as { id: string; title: string; is_open: boolean }[] | null)?.[0];
  return row ?? null;
}

export async function submit(showId: string, author: string, message: string): Promise<{ error: string | null }> {
  const sb = await getSupabase();
  if (!sb) return { error: 'Chat is unavailable.' };
  const { error } = await sb.from('chat_submissions').insert({ show_id: showId, author, message });
  return { error: error?.message ?? null };
}

// ── Owner: moderation queue ──────────────────────────────────────────────────────────────────────
export async function listQueue(showId: string): Promise<ChatRow[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from('chat_submissions')
    .select('id, show_id, author, message, status, created_at')
    .eq('show_id', showId)
    .order('created_at', { ascending: false });
  return (data as ChatRow[] | null) ?? [];
}

export async function moderate(id: string, status: ChatRow['status']): Promise<void> {
  const sb = await getSupabase();
  await sb?.from('chat_submissions').update({ status, moderated_at: new Date().toISOString() }).eq('id', id);
}

/** Live-subscribe to a show's queue via Realtime Postgres Changes (RLS gives the owner all their
 *  rows). Calls back on any insert/update/delete; returns an unsubscribe function. */
export function subscribeQueue(showId: string, onChange: () => void): () => void {
  let cleanup = () => {};
  void (async () => {
    const sb = await getSupabase();
    if (!sb) return;
    const channel = sb
      .channel(`chat-mod-${showId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_submissions', filter: `show_id=eq.${showId}` }, onChange)
      .subscribe();
    cleanup = () => {
      void sb.removeChannel(channel);
    };
  })();
  return () => cleanup();
}
