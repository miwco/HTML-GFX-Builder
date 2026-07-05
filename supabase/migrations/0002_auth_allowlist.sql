-- Era 5.1 invite-only closed beta: an allowlist table + a Before-User-Created auth hook that
-- rejects any sign-up (Google OAuth OR email/password) whose email isn't allowlisted. The
-- Postgres-function form keeps the check inside the instance — no extra service, self-host friendly.
-- Wired up in config.toml under [auth.hook.before_user_created]. This is an OPEN-feature migration.
-- Ref: https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook

-- ── allowlist (admin-managed; the single source of truth for who may create an account) ───────────
create table if not exists public.allowlist (
  email       text primary key,
  note        text,
  created_at  timestamptz not null default now()
);

-- RLS ON with NO policies = no client (anon/authenticated) can read or write it. Only the
-- service_role (admin scripts / the private invite edge function) and the SECURITY DEFINER hook
-- function below can see it.
alter table public.allowlist enable row level security;

-- ── the hook: allow the sign-up only if the email is allowlisted ──────────────────────────────────
-- Runs BEFORE the auth.users row exists, so it can only inspect the event payload (not look the
-- user up). SECURITY DEFINER so it reads public.allowlist despite that table's RLS. Fails CLOSED:
-- a null/unknown email is rejected.
create or replace function public.enforce_allowlist(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text := lower(event -> 'user' ->> 'email');
begin
  if candidate is not null
     and exists (select 1 from public.allowlist a where lower(a.email) = candidate) then
    return '{}'::jsonb;  -- empty object = allow the sign-up
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'This is a private beta. Ask the maintainer for an invite.'
    )
  );
end;
$$;

-- GoTrue invokes the hook as the supabase_auth_admin role — grant it (and only it) execute.
grant execute on function public.enforce_allowlist(jsonb) to supabase_auth_admin;
revoke execute on function public.enforce_allowlist(jsonb) from anon, authenticated, public;
