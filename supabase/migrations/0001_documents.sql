-- Era 5.2 cloud persistence: user-owned documents (packets, looks, the working project, and the
-- per-user brand singleton) with per-user Row Level Security. This is an OPEN-feature migration and
-- lives in the public repo so any self-hoster can recreate the database. See docs/ERA5_PLAN.md.
--
-- Design notes:
--   * Local (localStorage) stays the live read/write path; these tables are the cloud MIRROR.
--   * Binaries (data-URL fonts/images) do NOT go in `body` jsonb — a multi-graphic packet would be
--     multi-MB and wreck sync/egress. They live in the private `user-assets` Storage bucket and are
--     referenced by the `assets` table, deduped by content_hash.
--   * The server clock is authoritative for last-write-wins: a trigger sets updated_at on every
--     update. Never trust client clocks for the tiebreak.

-- ── updated_at trigger (server clock is authoritative) ───────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── documents ────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('packet', 'look', 'project', 'brand')),
  name        text not null default '',
  body        jsonb not null default '{}'::jsonb,
  deleted     boolean not null default false,  -- soft-delete tombstone so deletes propagate
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- RLS adds a WHERE clause to every query; index the columns it filters on (docs cite >100x).
create index if not exists documents_user_idx on public.documents (user_id);
create index if not exists documents_user_updated_idx on public.documents (user_id, updated_at);
-- The brand is a per-user singleton — at most one non-deleted brand row per user.
create unique index if not exists documents_one_brand_per_user
  on public.documents (user_id) where kind = 'brand' and deleted = false;

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

alter table public.documents enable row level security;

-- Policies are scoped TO authenticated (auth.uid() is null for anon) and wrap uid in a subselect
-- so the planner caches it (docs cite 179ms -> 9ms). UPDATE needs both USING and WITH CHECK.
create policy "documents_select_own" on public.documents
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "documents_insert_own" on public.documents
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "documents_update_own" on public.documents
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "documents_delete_own" on public.documents
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ── assets (one row per embedded font/image, pointing at a Storage object) ────────────────────────
create table if not exists public.assets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  document_id   uuid not null references public.documents (id) on delete cascade,
  path          text not null,          -- relative path inside the template package, e.g. images/logo.png
  storage_key   text not null,          -- object key in user-assets: {uid}/{document_id}/{content_hash}
  content_hash  text not null,          -- dedupe key (the 6 bundled fonts upload once, not per-graphic)
  bytes         integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists assets_user_idx on public.assets (user_id);
create index if not exists assets_document_idx on public.assets (document_id);

alter table public.assets enable row level security;

create policy "assets_select_own" on public.assets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "assets_insert_own" on public.assets
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "assets_update_own" on public.assets
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "assets_delete_own" on public.assets
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ── private Storage bucket for user-uploaded fonts/images ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('user-assets', 'user-assets', false)
on conflict (id) do nothing;

-- A user can only touch objects under their own {uid}/ folder (folder[1] = the JWT subject).
create policy "user_assets_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'user-assets' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));
create policy "user_assets_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'user-assets' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));
create policy "user_assets_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'user-assets' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));
create policy "user_assets_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'user-assets' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));
