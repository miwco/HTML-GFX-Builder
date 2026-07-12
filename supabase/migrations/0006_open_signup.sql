-- Era 5.6 (the open editor): OPEN SIGNUP. The invite-only beta ends — anyone may create an
-- account. The Before-User-Created hook stays wired (dashboard + config.toml unchanged) but the
-- function now allows every sign-up, so no auth reconfiguration is needed on any instance.
--
-- The allowlist table stays. To RE-CLOSE signups later, ship a migration that restores the
-- 0002 body of enforce_allowlist (the allowlist check) — one function, nothing else to touch.
-- Abuse posture: email confirmation is already required ([auth.email] enable_confirmations);
-- enable Auth captcha in the dashboard (Attack Protection) when the instance is public.

create or replace function public.enforce_allowlist(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Open signup: allow everyone. (The event payload is unused; the signature must stay the
  -- same because GoTrue invokes this exact function name.)
  return '{}'::jsonb;
end;
$$;

-- Same grants as 0002 (create or replace keeps them, restated for clarity when reading this
-- migration alone).
grant execute on function public.enforce_allowlist(jsonb) to supabase_auth_admin;
revoke execute on function public.enforce_allowlist(jsonb) from anon, authenticated, public;
