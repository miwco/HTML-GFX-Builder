# `supabase/` — the open backend for self-hosters

This folder is everything a self-hoster needs to stand up their own instance of the **open**
features (auth, cloud persistence, remote realtime control). It is deliberately part of the
AGPL-3.0 repo: schema and RLS are not secrets, and withholding them would break self-hostability.

**What is NOT here (by design):** billing, the metered AI gateway, and social-ingestion edge
functions, plus all secrets (`service_role` key, Stripe, social API keys). Those live in a separate
private repo and are wired into the hosted instance at deploy time only. The app talks to them over
a stable HTTP contract, never by importing their code. See `../docs/ERA5_PLAN.md`.

> **Status: code-first (Era 5.0).** These migrations and config are written and reviewed but not yet
> applied against a live project in this repo's CI (the app runs fully offline without them). The
> per-phase "live-verify" checklists in `docs/ERA5_PLAN.md` are the maintainer's runbook for
> validating auth/RLS/realtime against a real Supabase.

## Stand up an instance

```bash
# Local stack (needs Docker):
supabase start          # applies migrations/ + seed.sql
# or push to a hosted project:
supabase link --project-ref <your-ref>
supabase db push        # applies migrations/ (schema + RLS + auth hook)
```

Then point the app at it via `.env` (see `../.env.example`):

```
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>   # public; RLS is the real boundary
```

With those unset, the app runs in pure offline localStorage mode — no login, no sync, exports
unchanged.

**There is no login wall (Era 5.6 — the open editor).** With a backend configured, the editor is
still open to everyone: anyone can create, preview, and export with no account. Signing in (topbar
"Sign in" → dialog) only unlocks the account features — cloud sync, community, show chat, AI.
Signup is **open** (migration `0006`); to re-close it to the invite allowlist, ship a migration
restoring the `0002` body of `enforce_allowlist`.

## Contents

- `config.toml` — project settings for the open features. Auth is **invite-only**: the
  Before-User-Created hook (`enforce_allowlist`) is the gate. Google OAuth needs
  `SUPABASE_AUTH_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_GOOGLE_SECRET` in the deploy env.
- `migrations/0001_documents.sql` — `documents` + `assets` tables, per-user RLS, the `updated_at`
  trigger, and the private `user-assets` Storage bucket + its RLS. Binaries live in Storage, not in
  `body` jsonb.
- `migrations/0002_auth_allowlist.sql` — the `allowlist` table and the `enforce_allowlist` auth
  hook. Add invitees with `insert into allowlist (email) values ('…');` (service_role / SQL editor).
- `migrations/0003_show_chat.sql` — the show-chat send-in queue, moderation, and abuse trigger.
- `migrations/0004_community_templates.sql` — Era 5.5 community sharing: the `community_templates`
  table (author-owned rows, a status lifecycle, a URL-safe slug), the browse RPCs `community_list` /
  `community_get` (SECURITY DEFINER, granted to `authenticated` only — the sole public read path), a
  global `moderators` role + `is_moderator()`, a `community_reports` takedown path, and the public
  `community-assets` Storage bucket (author-scoped writes). **Posture: self-service** — a clean
  client gate publishes straight to `approved`. To switch on **human pre-review**, change the one
  line in `community_moderation_guard` (INSERT branch) from `'approved'` to `'pending'` and ship the
  moderator queue UI. Make someone a moderator with
  `insert into moderators (user_id) values ('<their-auth-uid>');` (service_role / SQL editor).
- `migrations/0005_community_moderator_read.sql` — a moderator SELECT policy on `community_templates`.
  Required so a takedown works at all: Postgres applies SELECT policies to the rows an
  `UPDATE ... WHERE` must locate, so without it a moderator's status change silently matches 0 rows
  (found in live-verify). Also what a review/takedown queue reads.
- `migrations/0006_open_signup.sql` — **open signup** (Era 5.6): `enforce_allowlist` now allows
  every sign-up; the hook wiring and the allowlist table stay, so re-closing is a one-function
  migration. Abuse posture for public instances: require email confirmation (Auth → Sign In/Up)
  and enable captcha (Auth → Attack Protection) in the dashboard.
- `seed.sql` — local-dev-only allowlist seed.

Migrations are ordered by filename and are **immutable once shipped** — change the schema by adding
a new migration, never by editing an applied one.

## Verifying live (maintainer checklist)

The app is built code-first: `npm run build` + offline E2E prove the offline path and the pure sync
logic, but the server paths below need a real project. Do these once after connecting:

**Auth (5.1, reworked in 5.6 — the open editor + open signup)**
1. With your `.env` pointing at the project, `npm run dev` → open `/app`: the EDITOR loads with no
   login wall; the topbar shows a "Sign in" button, and the AI tab / 🌐 Community prompt for
   sign-in. (The root `/` is the public landing page.) Google OAuth returns to `/app` — the
   dashboard's Auth → URL Configuration must allowlist that redirect URL.
2. Sign up with ANY email via the dialog → account created (0006 open signup; live-verified
   2026-07-08 with a throwaway address, then deleted). Sign in → the dialog closes; the topbar
   shows your email + "Sign out".
3. Public-instance hardening (dashboard): require email confirmation (Auth → Sign In/Up) and
   enable captcha (Auth → Attack Protection). Config.toml sets `enable_confirmations = true` for
   CLI-managed instances, but the HOSTED dashboard setting is separate — check it there.

**Cloud sync (5.2a)**
4. Signed in, open 📦 Packets, save a graphic into a packet → the topbar sync pill goes
   "Syncing…" → "Synced". In the dashboard, Table Editor → `documents` shows a `packet` row owned by
   your user.
5. Sign in as the SAME user in another browser/profile → the packet appears (pull works).
6. Delete the packet on one device → after sync it disappears on the other (tombstone propagates),
   and the `documents` row has `deleted = true`.
7. **RLS isolation (the security check):** sign in as a SECOND user → they must NOT see the first
   user's packets, and the `documents`/`assets` selects return only their own rows. (RLS, not the
   UI, is the boundary.)

**Community sharing (5.5)** — apply `0004`, then with two signed-in users A and B:
8. As A, open 📦 Packets → **Share to community** → **Publish this graphic**, add a summary, Publish →
   "✓ Published". `community_templates` shows one `approved` row owned by A; `community-assets` holds
   its font/image objects under `A-uid/…`.
9. As B, open **🌐 Community** → A's graphic appears → **Use** → it loads into B's editor and its
   fonts/images render (assets downloaded from the public bucket). Importing a **look** lands under
   📦 Packets ▸ Brand looks.
10. **RLS / moderation boundary (the security checks):** (a) as B, `PATCH` A's row's `status` (via the
    REST API with B's token) → **rejected** by RLS. (b) Make B a moderator, have B set A's row to
    `removed` → it vanishes from the gallery; then as A, `PATCH` your own row back to `approved` → it
    must be **rejected** ("only a moderator may change moderation columns"). (c) As anon (no token),
    call `community_list`/`community_get` → **rejected** (signed-in-only this cut). (d) Try to upload
    a `community-assets` object under another uid's folder → **rejected**.

If any of 3, 7, or 10 fail, stop and fix the policy/hook/trigger before inviting testers — those are
the security guarantees.
