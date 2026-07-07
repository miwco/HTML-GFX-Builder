# Era 5 - Server era (the plan)

The coherent planning round GOALS.md calls for. This is the binding design doc for the whole
server era; `docs/GOALS.md` keeps the checklist, this keeps the *why* and the *shape*. Update it
when a decision changes.

Planning round completed **2026-07-05** (recon: 8-agent codebase map + Supabase pattern research).

---

## Why this era exists

The C-vs-B comparison rig (`scripts/ai-compare.mjs`, 2026-07-05) proved single-graphic generation
quality is **not** the moat: our pipeline roughly ties a competent self-critiquing iterator on one
model. The moat is **operability** - control panels, live data, playout export, packets - plus a
compounding human-rated corpus and verification. Era 5 is where operability goes multi-device and
multi-user: accounts, cloud-saved work, remote control, community sharing. The only generation-side
investment the data justifies (a deterministic motion checker) is tracked separately and is not part
of this era.

## Decisions locked (2026-07-05)

- **Stack: Supabase.** Auth (Google OAuth + email/password + invite-only testers), Postgres for
  cloud-saved projects/packets/looks, Realtime for remote control, Edge Functions for the AI gateway
  and later social ingestion.
- **Repo shape: private gateway split, refined.** This repo stays the complete, self-hostable app
  under **AGPL-3.0**. It **carries the full `supabase/` folder** - `config.toml`, `migrations/`
  (schema + RLS + auth hook for the open features), `seed.sql`, and `.env.example` - so any
  self-hoster can `supabase db push` and stand up a working instance. **Only** billing, the metered
  AI gateway, and social-ingestion Edge Functions (plus all secrets: `service_role`, Stripe, social
  API keys) live in a **separate private repo**, wired in at deploy time on the hosted instance.
  Rationale: schema and RLS are not secrets; withholding them would break the self-hostability pillar
  and the spirit of AGPL. (This refines the earlier "migrations live private" note.)
- **Build/verify posture: code-first, verify later.** Server behaviour (auth, RLS isolation,
  Realtime authorization) can only be *truly* verified against a live Supabase; a green build proves
  nothing about whether a policy isolates users. So each phase ships: complete app code + complete
  SQL migrations + Edge-Function stubs, with **`npm run build` green and the offline path E2E-green**.
  Live server verification (a real Supabase project, RLS probing, realtime round-trip) is done by the
  maintainer when wiring up a backend, using the checklists in each phase. **No phase may claim a
  live server path "verified" from a green build alone.**

## The governing principle (non-negotiable, every phase)

**Supabase is optional and feature-detected in exactly one place.** With `VITE_SUPABASE_URL` unset,
the app is byte-for-byte today's offline localStorage tool: no login, no sync, exports unchanged.
"Logged out" simply means "sync disabled." Consequences that bind every phase:

- One config module (`src/backend/config.ts`) answers "is a backend configured?" Nothing else in the
  app branches on backend presence - features get a working provider or a no-op, never an
  `if (supabaseConfigured)` sprinkled through components.
- **The offline export never gains a network dependency.** No Supabase URL, anon key, or client ever
  leaks into a generated template unless the user *opts in* to a clearly-marked, deletable block
  (the Realtime control block, phase 5.3). The default export stays plug-and-play with relative paths
  and bundled GSAP.
- The `service_role` key and any secret **never** touch the client bundle or a `VITE_`-prefixed var
  (those are shipped to the browser). Secrets live only in the private repo's Edge Functions.
- The AGPL hosted instance publishes the exact deployed SPA source (this repo). The private Edge
  Functions are a separate work reached over a stable HTTP contract (mere aggregation) - the SPA
  never imports private code.

## Current-state seams (recon, 2026-07-05)

What Era 5 plugs into, with the ground truth that makes it additive:

- **Persistence.** Four localStorage keys, called directly, no abstraction:
  `spx-gfx-brand` (single `ProjectBrand`), `spx-gfx-packets` (`Packet[]`, each embedding full
  `SpxTemplate`s **including data-URL font/image assets** - the multi-MB rows), `spx-gfx-looks`
  (`SavedLook[]`), `spx-gfx-ai` (`AiSettings`, **holds the raw Anthropic key - never sync**). The
  working project is **not persisted at all** - memory-only in the zustand store. `crypto.randomUUID`
  ids exist; only `SavedGraphic` carries a timestamp. `packets.ts` `loadList`/`saveList` are the
  single read/write funnel for two of the four keys - the highest-leverage seam.
- **Control / realtime.** `ControlMessage = {t:'update',data} | play | stop | next`, channel
  `spx-control-${slug(name)}`. `receiverScript.ts` is a guarded, silently-degrading BroadcastChannel
  listener injected before `</body>` in SPX exports. The code already names the Era-5 Realtime swap
  "with the SAME message shape." `liveData.ts` is the precedent for an optional, marked, deletable
  runtime block appended to `template.js`.
- **AI gateway / env.** `callClaude` (`src/ai/anthropic.ts`) is the single chokepoint: proxy mode
  POSTs the raw Anthropic body to `${proxyUrl}/messages` and today attaches **no user token**.
  `aiConfigured()` is a two-state (stub vs configured) check. Env flows only through `settings.ts`'s
  `env()` helper over `import.meta.env`.
- **Export / offline.** Four targets (spxStarter, spxPack, casparcg, ograf). GSAP always bundled,
  never CDN. `validateTemplate` classifies an external `http(s)` URL as a **warning, not an error**
  (`ALLOWED_EXTERNAL = []`) - so a rogue CDN currently exports with only a warning. That is a latent
  gap to close *and* the hook for whitelisting the one blessed Supabase host.

## Sub-phases

Each is independently shippable and offline-invariant. Order is dependency-driven; nothing in an
earlier phase is reworked by a later one.

### 5.0 - Foundations (no visible feature; de-risks everything)
- `src/backend/config.ts`: the single feature-detection point (`isBackendConfigured()`,
  env reads for `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / `VITE_REQUIRE_AUTH`).
- `src/backend/storage.ts`: the `StorageProvider` interface (async CRUD by `kind` + `id`, the
  contract a cloud backend implements) + `LocalStorageProvider` over the existing keys, sharing one
  serialization codec with `packets.ts`/`brand.ts` (no divergence, no call-site churn - the UI keeps
  its synchronous local API; the async provider is the seam the 5.2 sync engine targets).
- Sync metadata: `updatedAt` added to `Packet`, `SavedLook`, `ProjectBrand`, set on every write and
  **backfilled on read** for existing records. The soft-delete `deleted?` tombstone lives on the
  `StoredRecord` sync contract; its *semantics* (propagating deletes, purge) land with the 5.2 sync
  engine, so 5.0 ships no dead half-wired field on the domain models.
- `supabase/` scaffold: `config.toml` (open auth/db/storage; private functions omitted),
  `migrations/` (documents + assets tables, per-user RLS, `updated_at` trigger; allowlist + auth
  hook), `seed.sql`, `README.md`.
- `.env.example`: add the (optional) Supabase vars with comments; blank = offline mode.
- **Gate:** `npm run build` green; offline E2E green (behaviour identical to today).

### 5.1 - Auth (invite-only) + AuthGate
- `@supabase/supabase-js` added; `src/backend/supabase.ts` client factory (returns `null` unless
  configured). Google OAuth + email/password.
- `AuthGate` engages **only** when the backend is configured *and* `VITE_REQUIRE_AUTH` is set
  (hosted). Self-host / offline: no login UI, straight into the app.
- Two-layer invite gate: disable public signup + a **Before-User-Created Postgres hook** checking an
  `allowlist` table (fires for OAuth *and* email/password). Admin invite (`inviteUserByEmail`,
  `service_role`) is a **private-repo Edge Function / documented admin script** - never client-side.
- "Signed in as… / sign out" UI; the AI-settings panel shows usage/BYO-key state per mode.
- **Live-verify checklist:** unknown Google account is rejected; allowlisted account passes; RLS is
  the real boundary (UI gate is UX only).

### 5.2 - Cloud persistence (projects, packets, looks)
Built + live-verified in three parts. **5.2a** = the sync engine + `SupabaseProvider` + tombstone
deletes for **packets and looks** (pure `reconcile`/`runSync`, hardened by an 11-agent adversarial
review). **5.2b** = assets externalized to Storage (content-hash keyed), the working project
**autosaved locally** (reload-restore, wizard-first startup unchanged), **brand + project cloud sync**
as per-user singletons (deterministic `uuid(uid:kind)` → one row each; reconciled by KIND, LWW, no
conflict-copy), and coordinated tombstone purge (both sides, 90-day grace). Known edge: a project
pulled from another device is adopted on reload, not live (a live "updated elsewhere" prompt is future
polish). Singletons sidestep the `id='default'` uuid-PK problem via the deterministic id, not a fixed
string.

- `SupabaseProvider implements StorageProvider`. Schema: `documents(id, user_id, kind, name,
  body jsonb, updated_at, deleted)` with per-user RLS; **binaries (data-URL fonts/images) go to a
  private Storage bucket**, deduped by content-hash, referenced from an `assets` table (jsonb would
  make packets multi-MB and wreck sync/egress).
- **Local stays the live read/write path; cloud is a background mirror.** A `SyncEngine` reconciles:
  first-login **3-way merge by id** (local-only → push anonymous drafts, cloud-only → pull,
  both → LWW on a DB-trigger `updated_at`, loser kept as a "(conflicted copy)"), soft-delete
  tombstones so deletes propagate, incremental `pull(since)` after.
- **The working project becomes a first-class autosaved "project"** (fills the GOALS "projects" gap;
  today only "save into a packet" persists anything).
- `spx-gfx-ai` (the secret) is **excluded** from sync.
- **Live-verify checklist:** two users can't read each other's rows; offline edits survive; conflict
  keeps both copies.

### 5.3 - Remote realtime control
- Opt-in, **default-off** export block (a marked, teachable, deletable region in the `liveData.ts`
  style - hand-rolled, no bundled client): subscribes to a **private** Realtime *broadcast* channel
  and forwards the existing `ControlMessage` to `update/play/stop/next`.
- `controlpanel.html` gains an optional Supabase path (drive the renderer from *any* device),
  degrading to BroadcastChannel when no URL is set.
- **Private channel + short-TTL room-scoped JWT** (anon key alone can't join a private channel - that
  is the isolation boundary), RLS on `realtime.messages` via `realtime.topic()`; a token-minting Edge
  Function issues room-scoped tokens. Renderer refreshes the token before `exp` (it runs unattended
  for hours).
- `validateTemplate`: promote external-dependency from **warning to error** and whitelist only
  `.supabase.co` (closes the latent CDN gap and gates the one blessed dependency).
- **Live-verify checklist:** panel on device A drives renderer on device B; a wrong-show token cannot
  drive the channel; default export ships zero network calls.

### 5.4 - Social ingestion + show chat
- Public send-in page → moderated queue → graphic. Needs private Edge Functions (social APIs, an
  inbound endpoint) + moderation tables/RLS. Depends on 5.1-5.2. Bigger; scoped when reached.

### 5.5 - Community shared templates ✅ (self-service cut, 2026-07-07)
- Logged-in users publish templates/looks others browse and use. **Shipped:** migration `0004`
  (`community_templates` as its OWN table — a one-way publish, never a `documents` sync kind; browse
  via SECURITY DEFINER `community_list`/`community_get` granted to `authenticated` only; a global
  `moderators` role + `is_moderator()`; a `community_reports` takedown path; a public
  `community-assets` Storage bucket with **author-scoped** writes `<uid>/<hash>`), the automated gate
  `community/gate.ts` = `validateTemplate` + new `validation/templateBench.ts` (promotes
  external-dep/missing-asset to blocking, blocks un-serializable/oversized) run at BOTH publish and
  import, `community/communityData.ts` (all null-guarded, reuses the `assets.ts` externalize codec),
  publish UI + "My submissions" in PacketManager, and the `CommunityGallery` + `🌐 Community` topbar
  button + `?template=<slug>` deep-link.
- **Decisions (2026-07-07, user):** (1) **self-service now** — the client gate publishes straight to
  `status='approved'`; the full lifecycle + moderator role + guard trigger ship so **human pre-review**
  is a one-line change (the INSERT branch of `community_moderation_guard`) plus the queue UI. (2)
  **signed-in-only** gallery reads (RPCs to `authenticated`); opening to anon later = also grant anon.
  (3) **single graphics + looks**; whole-packet publishing deferred.
- **Moderation gate composition:** automated (validate + bench, blocks) at publish AND import
  (defence-in-depth on a fetched row); human review is the deferred third gate (status flip).
- **Verified:** build + full offline E2E (55, incl. a new `community.spec.ts`: offline-invariance +
  gate behaviour) green; configured-mode UI smoke (publish sheet, gallery render); migration
  adversarially reviewed (3-lens workflow, 5 findings fixed — critical author self-approve/takedown
  reversal, INSERT-side audit forgery, report spoof/rate-limit bypass, URL-unsafe slug, asset
  poisoning). **Deferred to maintainer live-verify:** RLS isolation, the moderation guard, asset
  round-trip through the public bucket (supabase/README.md §Community sharing).
- **Deferred features:** human pre-review + moderator queue UI, whole-packet publishing, anon public
  gallery + a login-less `?template=<slug>` page.

### 5.6 - Payments / subscriptions (LAST)
- Stripe, metered generations - entirely in the private repo. Long beta first.

## Cross-cutting architecture calls

- **Persistence grain:** per-record (packet / look / project is the sync + conflict unit), never
  whole-key blobs (whole-key mirroring loses concurrent edits).
- **AI gateway auth:** in proxy mode attach `Authorization: Bearer <supabase jwt>` + `apikey: <anon>`
  so the Edge Function meters per user; `aiConfigured()` gains a third "signed-in hosted" state. The
  gateway must return the Anthropic response shape verbatim (or `callClaude`'s parser + forced-tool
  path break). Anon key is public-safe to ship; `service_role` is server-only.
- **Realtime transport:** Broadcast (ephemeral, table-free, sub-100ms), not Postgres Changes. Send
  state transitions, never per-frame streams (a 60fps clock stays local to the renderer) - Realtime
  msg/s quotas will force-disconnect a chatty client.
- **Repo split legal line:** the network API is the arms-length boundary that keeps the private
  functions proprietary. Never statically link private code into the AGPL bundle; keep the hosted SPA
  source in lockstep with this repo (AGPL §13).

## What "verified" means in this era

Given the code-first posture, each phase's PR states honestly:
- **Verified now:** `npm run build` green; offline E2E green; SQL migrations reviewed; the offline
  path is byte-for-byte unchanged when no backend is configured.
- **Deferred to live wiring (maintainer):** every item in that phase's "Live-verify checklist."

Never conflate the two. A green build is necessary, not sufficient, for anything server-side.
