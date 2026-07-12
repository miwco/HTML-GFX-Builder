-- Render jobs: the durable ledger for cloud video/image rendering (Era 7).
-- Written ONLY by the api/render functions with the service role — the browser talks to
-- the api, never to this table (job authorization is per-job secrets, hashed below).
-- Quota windows (per-hour/day, concurrency, duplicate submits) count these rows.

create table if not exists public.render_jobs (
  id                 uuid primary key,
  user_id            uuid references auth.users (id) on delete set null,  -- null = anonymous
  ip_hash            text not null,                     -- salted; anonymous quota key (also set for users)
  tier               text not null check (tier in ('anonymous', 'free', 'paid')),
  project_name       text not null default 'graphic',
  job_token_hash     text not null,                     -- sha256 of the browser's status/cancel token
  worker_secret_hash text not null,                     -- sha256 of the sandbox's completion secret
  status             text not null default 'pending' check (status in
                       ('pending', 'provisioning', 'rendering', 'encoding', 'uploading',
                        'complete', 'failed', 'cancelled', 'expired')),
  format             text not null,                     -- mp4 | webm | png-still | png-sequence | prores4444
  width              int  not null,
  height             int  not null,
  fps                int  not null,
  scale              real not null default 1,
  total_frames       int  not null,
  manifest_hash      text not null,                     -- sha256 of the canonical manifest JSON
  executor_ref       text,                              -- sandbox name / local job dir
  deadline_at        timestamptz not null,              -- silent past this = lost (sweep target)
  expires_at         timestamptz,                       -- output TTL; cron deletes the blob after
  output             jsonb,                             -- { url, downloadUrl, bytes, contentType, expiresAt }
  error              jsonb,                             -- { code, message }
  progress           jsonb,                             -- last snapshot (terminal/major transitions)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Quota windows + sweep scans.
create index if not exists render_jobs_user_window on public.render_jobs (user_id, created_at);
create index if not exists render_jobs_ip_window   on public.render_jobs (ip_hash, created_at);
create index if not exists render_jobs_active      on public.render_jobs (status)
  where status not in ('complete', 'failed', 'cancelled', 'expired');
create index if not exists render_jobs_dup         on public.render_jobs (manifest_hash)
  where status not in ('complete', 'failed', 'cancelled', 'expired');

-- Reuse the shared updated_at trigger (0001).
create trigger render_jobs_set_updated_at
  before update on public.render_jobs
  for each row execute function public.set_updated_at();

alter table public.render_jobs enable row level security;

-- Signed-in users may READ their own jobs (a future "my renders" list + a Realtime
-- upgrade path). NO insert/update/delete policies for anon or authenticated: every write
-- goes through the api functions with the service role, so nothing inserts via PostgREST
-- (unlike chat, a BEFORE INSERT rate-limit trigger is unnecessary — quota is an
-- application check in api/render/start).
create policy "render_jobs_owner_select" on public.render_jobs
  for select to authenticated
  using ((select auth.uid()) = user_id);
