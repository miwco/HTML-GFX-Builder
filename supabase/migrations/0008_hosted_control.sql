-- Phase 5 hosted control: control pages on the site, driven by a DURABLE EVENT LOG.
-- OPEN feature (self-host friendly): schema + RLS + SECURITY DEFINER RPCs, no Edge Function.
--
-- The model (one write path, decided over Broadcast alternatives): an operator command IS an
-- INSERT into control_events — DB-ordered, recoverable, observable. Realtime Postgres Changes
-- deliver rows live; a (re)joining side reads the tail. The graphic reports its applied
-- data/state back into the show row, so a rebooted graphic rebuilds itself from its own last
-- report and a control page shows the true on-air state.
--
-- Roles (RLS is the boundary): the authenticated OWNER manages their control_shows rows; every
-- OPERATOR path is capability-addressed — the unguessable slug goes through SECURITY DEFINER
-- RPCs, so operating needs no account (the open-editor posture; revoke = rotate the slug).
-- control_events rows are readable to anon: the isolation is the show_id, an unguessable uuid
-- learned only via the slug RPC (the 5.3 public-channel + secret-topic posture, durable now).

-- ── control_shows: one hosted control page. id doubles as the LOCAL show's uuid. ──────────────
create table if not exists public.control_shows (
  id          uuid primary key,                    -- the local Show.id (client-supplied, like documents)
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug        text not null unique default encode(gen_random_bytes(9), 'base64'),
  title       text not null default 'Show',
  -- The operator page's spec: [{ name, fields, js, images: [{value,label}] }] per graphic —
  -- what the panel needs (descriptors + machine), never the full template payload.
  panel       jsonb not null default '[]'::jsonb,
  -- PREPARED (shared staging): { [graphic]: { [field]: value } } — visible to every operator,
  -- on air only when a take sends it as an update command.
  staged      jsonb not null default '{}'::jsonb,
  -- PUBLISHED truth, reported by each graphic after applying commands:
  -- { [graphic]: { data: {...}, state: { groups: {...} }, at: iso } }.
  live        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists control_shows_owner_idx on public.control_shows (owner_id);
alter table public.control_shows enable row level security;

create trigger control_shows_set_updated_at before update on public.control_shows
  for each row execute function public.set_updated_at();   -- reuse 0001's trigger fn

-- Owner manages their own rows. NO anon SELECT — operators resolve the slug via the RPC below,
-- so ids, slugs and owner_ids are never enumerable.
create policy "control_shows_owner_all" on public.control_shows for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- ── control_events: THE COMMAND LOG. Append-only; identity id = the global order. ─────────────
create table if not exists public.control_events (
  id          bigint generated always as identity primary key,
  show_id     uuid not null references public.control_shows (id) on delete cascade,
  graphic     text not null,
  -- A ControlMessage ({t:'update'|'play'|'stop'|'next'|'event'|'snap', ...}) or a meta row
  -- ({t:'staged'|'live', ...}) that lets other operators follow staging and reported state.
  msg         jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists control_events_show_idx on public.control_events (show_id, id);
alter table public.control_events enable row level security;

-- Readable to anon: Realtime re-checks RLS per event, and subscribers/tail-readers hold only
-- the show_id capability. No INSERT/UPDATE/DELETE policies — writes go through the RPCs.
create policy "control_events_read" on public.control_events for select to anon, authenticated
  using (true);

-- ── The capability RPCs (SECURITY DEFINER; the slug is the authorization). ────────────────────

-- Resolve a control page: everything an operator page or a booting graphic needs to render
-- and resume. last_event_id is the log baseline — follow live rows after it, tail-fill gaps.
create or replace function public.control_show_by_slug(p_slug text)
returns table (id uuid, title text, panel jsonb, staged jsonb, live jsonb, last_event_id bigint)
language sql security definer set search_path = '' stable as $$
  select s.id, s.title, s.panel, s.staged, s.live,
         coalesce((select max(e.id) from public.control_events e where e.show_id = s.id), 0)
  from public.control_shows s where s.slug = p_slug;
$$;
grant execute on function public.control_show_by_slug(text) to anon, authenticated;

-- Send one command. The INSERT is the send — Realtime delivers it, the log keeps it.
create or replace function public.control_send(p_slug text, p_graphic text, p_msg jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_show uuid;
  v_recent int;
  v_id bigint;
begin
  select id into v_show from public.control_shows where slug = p_slug;
  if v_show is null then raise exception 'unknown control page'; end if;
  if coalesce(p_msg->>'t', '') not in ('update', 'play', 'stop', 'next', 'event', 'snap') then
    raise exception 'not a control command';
  end if;
  -- A light burst cap per show (an operator surface, not an ingest API).
  select count(*) into v_recent from public.control_events
    where show_id = v_show and created_at > now() - interval '5 seconds';
  if v_recent >= 50 then
    raise exception 'too many commands — slow down' using errcode = 'check_violation';
  end if;
  insert into public.control_events (show_id, graphic, msg) values (v_show, p_graphic, p_msg)
    returning id into v_id;
  return v_id;
end $$;
grant execute on function public.control_send(text, text, jsonb) to anon, authenticated;

-- Stage PREPARED data (shared between operators). Merges per graphic; announces via the log
-- (msg t:'staged' carries the merged map) so other pages follow without polling.
create or replace function public.control_stage(p_slug text, p_graphic text, p_data jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_show uuid;
  v_next jsonb;
begin
  select id into v_show from public.control_shows where slug = p_slug;
  if v_show is null then raise exception 'unknown control page'; end if;
  update public.control_shows
    set staged = jsonb_set(staged, array[p_graphic], coalesce(staged->p_graphic, '{}'::jsonb) || coalesce(p_data, '{}'::jsonb))
    where id = v_show
    returning staged->p_graphic into v_next;
  insert into public.control_events (show_id, graphic, msg)
    values (v_show, p_graphic, jsonb_build_object('t', 'staged', 'data', v_next));
end $$;
grant execute on function public.control_stage(text, text, jsonb) to anon, authenticated;

-- The graphic's applied-state report: the PUBLISHED truth a reboot rebuilds from and the
-- control page's chip reads. Announced via the log (msg t:'live') for the same reason.
create or replace function public.control_report(p_slug text, p_graphic text, p_data jsonb, p_state jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_show uuid;
begin
  select id into v_show from public.control_shows where slug = p_slug;
  if v_show is null then raise exception 'unknown control page'; end if;
  update public.control_shows
    set live = jsonb_set(live, array[p_graphic],
      jsonb_build_object('data', coalesce(p_data, '{}'::jsonb), 'state', p_state, 'at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
    where id = v_show;
  insert into public.control_events (show_id, graphic, msg)
    values (v_show, p_graphic, jsonb_build_object('t', 'live', 'data', p_data, 'state', p_state));
end $$;
grant execute on function public.control_report(text, text, jsonb, jsonb) to anon, authenticated;

-- The tail: commands after a known id — a reconnecting side fills its gap from here.
create or replace function public.control_tail(p_slug text, p_graphic text, p_after bigint)
returns table (id bigint, graphic text, msg jsonb, created_at timestamptz)
language sql security definer set search_path = '' stable as $$
  select e.id, e.graphic, e.msg, e.created_at
  from public.control_events e
  join public.control_shows s on s.id = e.show_id
  where s.slug = p_slug and e.id > p_after and (p_graphic is null or e.graphic = p_graphic)
  order by e.id
  limit 500;
$$;
grant execute on function public.control_tail(text, text, bigint) to anon, authenticated;

-- ── Realtime: the log is the one live table (staging + live reports ride it as meta rows). ────
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'control_events'
  ) then
    alter publication supabase_realtime add table public.control_events;
  end if;
end $$;

-- ── documents.kind grows 'show' + 'video' (Phase 5 sync kinds; clients ship in this release). ─
alter table public.documents drop constraint if exists documents_kind_check;
alter table public.documents add constraint documents_kind_check
  check (kind in ('packet', 'look', 'project', 'brand', 'show', 'video'));
