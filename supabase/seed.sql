-- Local-dev seed, applied by `supabase db reset` (NOT used in production).
-- Add your own email here to test the invite-only sign-up flow against a local stack.
insert into public.allowlist (email, note) values
  ('dev@example.com', 'local dev test account')
on conflict (email) do nothing;
