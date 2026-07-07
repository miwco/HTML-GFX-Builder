// Community shared-templates data layer (Era 5.5). Thin wrappers over the app's Supabase client for
// publishing a graphic/look, browsing the approved gallery, importing a copy, and the report/takedown
// path. All access is gated by the RLS + SECURITY DEFINER RPCs in
// supabase/migrations/0004_community_templates.sql; this file just calls them.
//
// Offline-invariant: every function opens with `const sb = await getSupabase(); if (!sb) return …;`,
// so with no backend configured the whole module is inert and the Supabase library stays code-split
// out of the bundle (getSupabase resolves null). Reads are signed-in-only this cut (the RPCs are
// granted to `authenticated`), matching the closed-beta posture.

import { getSupabase } from '../backend/supabase';
import {
  externalizeAssets,
  rehydrateAssets,
  dataUrlToBlob,
  blobToDataUrl,
} from '../backend/assets';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SpxTemplate } from '../model/types';
import type { ProjectBrand } from '../model/brand';

const BUCKET = 'community-assets';

export type CommunityKind = 'graphic' | 'look';
export type CommunityStatus = 'pending' | 'approved' | 'rejected' | 'removed';

/** A browse card (from community_list) — never carries author_id or the body. */
export interface CommunityCard {
  id: string;
  slug: string;
  kind: CommunityKind;
  name: string;
  summary: string;
  category: string | null;
  author_name: string;
  created_at: string;
}

/** A full item (from community_get) — the browse card plus the importable body. */
export interface CommunityItem extends CommunityCard {
  body: unknown; // SpxTemplate for a graphic; { name, brand } for a look
}

/** The author's own row, with its moderation status (from the owner RLS path). */
export interface MySubmission {
  id: string;
  slug: string;
  kind: CommunityKind;
  name: string;
  summary: string;
  category: string | null;
  status: CommunityStatus;
  moderation_note: string | null;
  created_at: string;
}

/** Per-session upload dedupe (same content hash → same key → upload at most once). */
const uploaded = new Set<string>();

// ── asset transport (public community bucket) ──────────────────────────────────────────────────────
async function upload(sb: SupabaseClient, key: string, dataUrl: string): Promise<void> {
  if (uploaded.has(key)) return;
  const blob = dataUrlToBlob(dataUrl);
  // upsert:false so a later writer can NEVER overwrite an existing content-hash object with different
  // bytes. An "already exists" error means the identical bytes are already there — treat it as success.
  const { error } = await sb.storage.from(BUCKET).upload(key, blob, { contentType: blob.type, upsert: false });
  if (error && !/exist|duplicate/i.test(error.message)) {
    throw new Error(`asset upload failed: ${error.message}`);
  }
  uploaded.add(key);
}

async function download(sb: SupabaseClient, key: string): Promise<string | null> {
  const { data, error } = await sb.storage.from(BUCKET).download(key);
  if (error || !data) return null;
  return blobToDataUrl(data);
}

/** The signed-in user's id — used as the asset key namespace `<uid>/<hash>`, matching the storage
 *  policy that lets an author write only under their own {uid}/ folder. */
async function currentUid(sb: SupabaseClient): Promise<string | null> {
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

/** Display name to attribute a submission to. Prefers the OAuth full name, falls back to the email
 *  local-part — never the full email (that would leak an address to the gallery). */
async function authorName(sb: SupabaseClient): Promise<string> {
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) return '';
  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const full = (meta.full_name || meta.name || '').trim();
  if (full) return full;
  const email = user.email ?? '';
  return email.includes('@') ? email.split('@')[0] : email;
}

// ── publish ─────────────────────────────────────────────────────────────────────────────────────
export async function publishGraphic(
  template: SpxTemplate,
  summary: string,
): Promise<{ slug: string | null; error: string | null }> {
  const sb = await getSupabase();
  if (!sb) return { slug: null, error: 'Sign in to publish.' };
  try {
    const uid = await currentUid(sb);
    if (!uid) return { slug: null, error: 'Sign in to publish.' };
    // Externalize embedded fonts/images into the public bucket under this author's own {uid}/ folder;
    // the row body keeps only sentinels.
    const body = await externalizeAssets(template, uid, (key, dataUrl) => upload(sb, key, dataUrl));
    const { data, error } = await sb
      .from('community_templates')
      .insert({
        kind: 'graphic',
        name: template.name || 'Untitled',
        summary: summary.trim(),
        category: template.type,
        body,
        author_name: await authorName(sb),
      })
      .select('slug')
      .single();
    if (error) return { slug: null, error: error.message };
    return { slug: (data as { slug: string }).slug, error: null };
  } catch (e) {
    return { slug: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function publishLook(
  name: string,
  brand: ProjectBrand,
  summary: string,
): Promise<{ slug: string | null; error: string | null }> {
  const sb = await getSupabase();
  if (!sb) return { slug: null, error: 'Sign in to publish.' };
  try {
    const uid = await currentUid(sb);
    if (!uid) return { slug: null, error: 'Sign in to publish.' };
    const body = await externalizeAssets({ name, brand }, uid, (key, dataUrl) => upload(sb, key, dataUrl));
    const { data, error } = await sb
      .from('community_templates')
      .insert({
        kind: 'look',
        name: name || 'Untitled look',
        summary: summary.trim(),
        category: brand.styleTag,
        body,
        author_name: await authorName(sb),
      })
      .select('slug')
      .single();
    if (error) return { slug: null, error: error.message };
    return { slug: (data as { slug: string }).slug, error: null };
  } catch (e) {
    return { slug: null, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── browse ──────────────────────────────────────────────────────────────────────────────────────
export async function listCommunity(
  kind?: CommunityKind,
  category?: string,
  limit = 60,
  offset = 0,
): Promise<CommunityCard[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data } = await sb.rpc('community_list', {
    p_kind: kind ?? null,
    p_category: category ?? null,
    p_limit: limit,
    p_offset: offset,
  });
  return (data as CommunityCard[] | null) ?? [];
}

/** Fetch one approved item by slug and REHYDRATE its assets (data URLs) so it's ready to import. */
export async function getCommunity(slug: string): Promise<CommunityItem | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb.rpc('community_get', { p_slug: slug });
  const row = (data as CommunityItem[] | null)?.[0];
  if (!row) return null;
  const body = await rehydrateAssets(row.body, (key) => download(sb, key));
  return { ...row, body };
}

// ── my submissions ──────────────────────────────────────────────────────────────────────────────
export async function listMySubmissions(): Promise<MySubmission[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const uid = await currentUid(sb);
  if (!uid) return [];
  // Filter to the caller's OWN rows explicitly. A moderator's RLS SELECT policy (migration 0005)
  // exposes every row, so relying on RLS alone would show all submissions to a moderator here.
  const { data } = await sb
    .from('community_templates')
    .select('id, slug, kind, name, summary, category, status, moderation_note, created_at')
    .eq('author_id', uid)
    .order('created_at', { ascending: false });
  return (data as MySubmission[] | null) ?? [];
}

export async function unpublish(id: string): Promise<{ error: string | null }> {
  const sb = await getSupabase();
  if (!sb) return { error: 'Not signed in.' };
  const { error } = await sb.from('community_templates').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ── report / moderate ─────────────────────────────────────────────────────────────────────────────
export async function reportTemplate(id: string, reason: string): Promise<{ error: string | null }> {
  const sb = await getSupabase();
  if (!sb) return { error: 'Not signed in.' };
  const { error } = await sb.from('community_reports').insert({ template_id: id, reason });
  return { error: error?.message ?? null };
}

export async function isModerator(): Promise<boolean> {
  const sb = await getSupabase();
  if (!sb) return false;
  const { data } = await sb.rpc('is_moderator');
  return data === true;
}

/** Moderator action (takedown/review). The DB guard trigger stamps reviewed_by/reviewed_at and blocks
 *  a moderator from touching any non-moderation column. */
export async function moderate(
  id: string,
  status: CommunityStatus,
  note?: string,
): Promise<{ error: string | null }> {
  const sb = await getSupabase();
  if (!sb) return { error: 'Not signed in.' };
  const { error } = await sb
    .from('community_templates')
    .update({ status, moderation_note: note ?? null })
    .eq('id', id);
  return { error: error?.message ?? null };
}
