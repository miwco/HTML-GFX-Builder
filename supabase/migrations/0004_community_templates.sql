-- Era 5.5 Community shared templates: a signed-in user PUBLISHES a graphic or a brand look; other
-- signed-in users BROWSE an approved gallery and import a COPY into their own local packets.
-- OPEN feature (self-host friendly): schema + RLS + SECURITY DEFINER read RPCs + a moderator role +
-- an abuse-report path — the whole feature is this one migration. No Edge Function, no secrets, no
-- social APIs. See docs/ERA5_PLAN.md.
--
-- Posture (2026-07-07): SELF-SERVICE publishing — a clean client-side automated gate (validateTemplate
-- + templateBench) publishes straight to status='approved' (the column default). The full moderation
-- lifecycle (pending/approved/rejected/removed), a global `moderators` role, and a report/takedown
-- path all ship here so switching to HUMAN PRE-REVIEW later is only: change the status column default
-- to 'pending' and surface the moderator queue UI — no schema change.
--
-- Roles (RLS is the boundary): an authenticated AUTHOR fully manages their OWN submissions; a
-- `moderators`-listed user may change moderation columns on ANY row (takedown); browse reads happen
-- ONLY through SECURITY DEFINER RPCs that expose approved, browse-safe columns (never author_id, never
-- email). There is deliberately NO anon access this cut (signed-in-only beta) — opening the gallery to
-- anonymous visitors later is granting the two RPCs + the storage bucket read to `anon`.

-- Slug defaults use gen_random_bytes (pgcrypto). Ensure it exists so this migration also applies on a
-- plain self-hosted Postgres (Supabase ships it preinstalled, so this is a no-op there).
create extension if not exists pgcrypto;

-- ── moderators: a global reviewer role. RLS ON + NO policy = admin-only (the 0002 allowlist pattern). ─
create table if not exists public.moderators (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  note        text,
  created_at  timestamptz not null default now()
);
alter table public.moderators enable row level security;   -- no policy ⇒ invisible to anon/authenticated

-- Is the current user a moderator? SECURITY DEFINER so a policy/trigger can read the RLS-locked table
-- (a policy subquery runs as the CALLER's role, and that role has no SELECT on moderators).
create or replace function public.is_moderator()
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.moderators m where m.user_id = (select auth.uid()));
$$;
-- Supabase's default privileges grant EXECUTE on new functions directly to anon + authenticated, so
-- revoking only from `public` would leave anon able to call this. Revoke anon explicitly (authenticated
-- keeps the default grant).
revoke execute on function public.is_moderator() from public, anon;
grant execute on function public.is_moderator() to authenticated;

-- ── community_templates: one published graphic or look. ─────────────────────────────────────────────
-- `body` carries the SpxTemplate (graphic) or the {name,brand} look payload with binaries ALREADY
-- externalized to the community-assets bucket (only sentinels remain), so the row stays small.
create table if not exists public.community_templates (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name      text not null default '',   -- denormalized display snapshot (auth.users isn't client-joinable)
  -- URL-SAFE slug: a base64url alphabet (no '/','+','=') so a share link never breaks a URL path/query.
  slug             text not null unique default translate(encode(gen_random_bytes(9), 'base64'), '+/=', '-_'),
  kind             text not null check (kind in ('graphic', 'look')),
  name             text not null default '',
  summary          text not null default '',    -- one-line gallery description
  category         text,                         -- graphic: TemplateType; look: style tag; a browse facet
  body             jsonb not null default '{}'::jsonb,
  status           text not null default 'approved'   -- SELF-SERVICE default; set 'pending' to switch on pre-review
                   check (status in ('pending', 'approved', 'rejected', 'removed')),
  moderation_note  text,
  reviewed_by      uuid references auth.users (id),
  reviewed_at      timestamptz,
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now()
);
-- RLS/RPCs filter on these; index them (docs cite >100x on filtered columns).
create index if not exists community_status_created_idx on public.community_templates (status, created_at desc);
create index if not exists community_kind_status_idx on public.community_templates (kind, status);
create index if not exists community_author_idx on public.community_templates (author_id);
alter table public.community_templates enable row level security;

create trigger community_templates_set_updated_at before update on public.community_templates
  for each row execute function public.set_updated_at();   -- reuse 0001's trigger fn

-- (1) AUTHOR manages their OWN submissions: read own regardless of status (My submissions), edit while
--     pending, unpublish = delete. The row is already gated client-side, so no status constraint here.
create policy "community_owner_all" on public.community_templates for all to authenticated
  using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);

-- (2) MODERATOR may UPDATE any row (takedown / review). The scope trigger below limits a moderator to
--     the moderation columns only. UPDATE needs both USING and WITH CHECK.
create policy "community_moderate" on public.community_templates for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- There is deliberately NO anon/authenticated SELECT policy on this table: ALL browse reads go through
-- the SECURITY DEFINER RPCs below, so author_id is never exposed and only 'approved' rows are visible.

-- The moderation boundary lives in this trigger (RLS decides WHO may write; this decides WHAT each
-- writer may change), keyed on is_moderator() — NOT on authorship — so it holds on BOTH the owner and
-- the moderator UPDATE policy, AND on INSERT where RLS alone cannot pin server-owned columns. Without
-- this, an author could PATCH their own row's status back to 'approved' after a takedown, or INSERT a
-- pre-'approved' row / forge the review audit.
create or replace function public.community_moderation_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    -- The SERVER owns status + the review audit at creation. A non-moderator publishes straight to
    -- 'approved' (self-service); change this single line to 'pending' to switch on human pre-review —
    -- the client can never pre-approve or forge the audit either way.
    if not public.is_moderator() then
      new.status         := 'approved';
      new.reviewed_by    := null;
      new.reviewed_at    := null;
      new.moderation_note := null;
    end if;
    return new;
  end if;

  -- UPDATE: an explicit column allowlist for each writer.
  if public.is_moderator() then
    -- a moderator may change ONLY {status, moderation_note, reviewed_by, reviewed_at}; everything else
    -- (incl. id / created_at) is locked, and the audit is stamped from the trusted identity.
    if new.id          is distinct from old.id
       or new.author_id   is distinct from old.author_id
       or new.author_name is distinct from old.author_name
       or new.slug     is distinct from old.slug
       or new.kind     is distinct from old.kind
       or new.name     is distinct from old.name
       or new.summary  is distinct from old.summary
       or new.category is distinct from old.category
       or new.body     is distinct from old.body
       or new.created_at is distinct from old.created_at then
      raise exception 'moderators may change only the moderation columns';
    end if;
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
  else
    -- the author (or any non-moderator) may NEVER touch the moderation/audit columns
    if new.status is distinct from old.status
       or new.moderation_note is distinct from old.moderation_note
       or new.reviewed_by is distinct from old.reviewed_by
       or new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'only a moderator may change moderation columns';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.community_moderation_guard() from anon, authenticated, public;
create trigger community_templates_moderation_guard before insert or update on public.community_templates
  for each row execute function public.community_moderation_guard();

-- ── browse read path: SECURITY DEFINER RPCs (the ONLY public read boundary). ─────────────────────────
-- Granted to `authenticated` only (signed-in-only beta). They hard-filter status='approved' and
-- project browse-safe columns (never author_id). Supabase default-grants EXECUTE to anon on new
-- functions, so anon is revoked EXPLICITLY below — opening the gallery to anon later = `grant ... to anon`.
create or replace function public.community_list(
  p_kind text default null, p_category text default null, p_limit int default 60, p_offset int default 0)
returns table (id uuid, slug text, kind text, name text, summary text, category text,
               author_name text, created_at timestamptz)
language sql security definer set search_path = '' stable as $$
  select t.id, t.slug, t.kind, t.name, t.summary, t.category, t.author_name, t.created_at
  from public.community_templates t
  where t.status = 'approved'
    and (p_kind is null or t.kind = p_kind)
    and (p_category is null or t.category = p_category)
  order by t.created_at desc
  limit greatest(1, least(coalesce(p_limit, 60), 200))
  offset greatest(0, coalesce(p_offset, 0));
$$;
revoke execute on function public.community_list(text, text, int, int) from public, anon;
grant execute on function public.community_list(text, text, int, int) to authenticated;

create or replace function public.community_get(p_slug text)
returns table (id uuid, slug text, kind text, name text, summary text, category text,
               author_name text, body jsonb, created_at timestamptz)
language sql security definer set search_path = '' stable as $$
  select t.id, t.slug, t.kind, t.name, t.summary, t.category, t.author_name, t.body, t.created_at
  from public.community_templates t
  where t.slug = p_slug and t.status = 'approved';
$$;
revoke execute on function public.community_get(text) from public, anon;
grant execute on function public.community_get(text) to authenticated;

-- ── community_reports: the self-service takedown path (any signed-in user flags an approved row). ────
create table if not exists public.community_reports (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references public.community_templates (id) on delete cascade,
  reporter_id  uuid default auth.uid() references auth.users (id) on delete set null,
  reason       text not null,
  created_at   timestamptz not null default now()
);
create index if not exists community_reports_template_idx on public.community_reports (template_id);
alter table public.community_reports enable row level security;

-- Any signed-in user may file a bounded report. reporter_id is pinned to the caller by the guard
-- below (so it can't be forged to frame another user or slip the rate limit); the policy re-asserts it.
-- Only moderators may read the queue. No anon access.
create policy "community_reports_insert" on public.community_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and char_length(reason) between 1 and 500);
create policy "community_reports_read" on public.community_reports for select to authenticated
  using (public.is_moderator());

-- Rate-limit reports per reporter (racy window, defence-in-depth like 0003's chat_guard).
create or replace function public.community_report_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare recent int;
begin
  new.reporter_id := (select auth.uid());   -- pin to the trusted identity (defeats spoofing + rate-limit bypass)
  new.reason := btrim(left(coalesce(new.reason, ''), 500));
  if new.reason = '' then
    raise exception 'a reason is required';
  end if;
  select count(*) into recent from public.community_reports
    where reporter_id = (select auth.uid()) and created_at > now() - interval '60 seconds';
  if recent >= 10 then
    raise exception 'too many reports — slow down' using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke execute on function public.community_report_guard() from anon, authenticated, public;
create trigger community_reports_guard before insert on public.community_reports
  for each row execute function public.community_report_guard();

-- ── public Storage bucket for published template assets (fonts/images). ─────────────────────────────
-- PUBLIC bucket ⇒ objects are world-readable BY KEY (no anon SELECT policy needed). Keys are
-- `<author-uid>/<content-hash>`: an author may write ONLY under their own {uid}/ folder (the 0001
-- user-assets pattern), so no one can pre-seed a poisoned object under the content-hash another
-- author's template will reference — cross-author asset poisoning is impossible, dedupe stays
-- per-author. There is no client DELETE/UPDATE policy: unpublish leaves immutable orphans a
-- service_role GC can reclaim later (cheap), and existing objects can never be overwritten.
insert into storage.buckets (id, name, public)
values ('community-assets', 'community-assets', true)
on conflict (id) do nothing;

create policy "community_assets_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'community-assets'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );
