# Goals

The committed north star for this project. Check milestones off as they land; add new ones at the
bottom rather than rewriting history.

## North star

> **NoaCG Studio — the best and most useful place to create modern, premium broadcast graphics, and run them anywhere.**

Make an on-air-worthy graphic in a couple of minutes, no code required, then export it to whatever
environment the user already runs. Two kinds of user are first-class: a **non-technical creator** who
never opens the code, and a **professional** who drops into the always-available editor for full
control. The generated HTML/CSS/JS stays clean, well-named, and the single source of truth — its view
is optional. Users span organizations, TV channels, streamers, and universities (it's also used in
teaching, but the product is a production tool, not a code tutorial).

### Anything-goes export (a platform, not an SPX generator)

Export is **not SPX-first only**. The ambition is a flexible broadcast-graphics **platform** targeting
many broadcast and streaming environments - **SPX, OBS, vMix, CasparCG, OGraf**, and more over time.
SPX stays the canonical *internal* template format (and the strictest validation target); every other
target is an export adapter derived from that same source, so breadth is added without reworking the
core. Breadth across the whole live stack - plus automation, remote control, and smarter workflows - is
a primary long-term differentiator, not a nice-to-have.

### Operating principles (business posture)

- **Free forever for the core.** Creating, editing, exporting, controlling, and self-hosting are free,
  always - no feature paywall on the workflow.
- **One paid surface only, and later:** hosted AI generation for users who won't bring their own API
  key (real compute cost). **Bring-your-own-key stays free.** Premium features / paid services are
  deferred until there is a large user base and are not a current priority - don't build paywalls
  speculatively.
- **The goal now is users, not revenue.** Optimize for usefulness, adoption, and regular use
  (activation + retention). Money is a later, optional consequence of a large, happy user base. See
  the GTM plan + [[gtm-competitive]] memory.

### What "done right" feels like
- **Fast:** new project → on-air-worthy lower third in under 2 minutes, no code required.
- **Tasteful:** every template looks like a paid MotionArray/Envato asset, not a tutorial demo.
- **Consistent:** graphics made in the same project form a coherent **broadcast package** — the
  same style family, palette, and typography across every category, usable in a real program.
- **Yours:** custom brand colors (hex/picker) and imported fonts are first-class — fonts are
  embedded in the template and its export, never external.
- **Smooth:** animations run at 60 fps, transform/opacity-based, with professional easing.
- **Editable:** open any generated file and every line reads clearly — clear names, short comments,
  no cleverness — so a pro can extend it (but no one has to).
- **Reliable:** every export passes the validation gate and plugs straight into SPX.
- **Still code-first underneath:** hand edits are always possible; panels and wizard write
  deterministic patches and never fight the user's edits outside their marked regions.

## Milestones

### The choose-first creation flow (current push)
- [x] **Phase 0** — GOALS.md + DESIGN_LANGUAGE.md committed
- [x] **Phase 1** — Foundations: bundled open fonts, GSAP animation-preset library (marked
      regions + `animSpeed` + steps), shared lower-third scaffolding (auto-fit text, 9-zone
      positioning, `:root` style contract), wizard data model
- [x] **Phase 2** — 10 tasteful lower thirds (4 minimal · 3 sport · 3 glass), built and
      taste-judged via multi-agent workflow; user approved screenshots. Bonus: the 12-preset
      easing system (direction-correct per phase) per the approved easing doctrine
- [x] **Phase 3** — Creation wizard replaces the gallery: Entry → Category → Template → Fields →
      Style → Animation, with persistent live preview (Play/Stop at every step)
- [x] **Phase 4** — Live panels after creation: Style (colors/font/size/position via `:root`
      vars) + Motion (preset/speed/easing/steps via marked region); Brand tab retired into Style
- [x] **Phase 5** — "Import graphics" entry: drag-drop images → graphic type → prefilled wizard
      (logo-slot designs first, first image auto-placed)
- [x] **Phase 6** — Playwright specs for the wizard flow (9 passing), docs updated, old starters
      retired (Blank survives)

### Broadcast packages + your brand (current push)
- [x] **Custom colors** — a "Custom" palette in the wizard Style step: accent / text / dim / panel
      via color picker + free hex/rgba input (Style panel already edits them post-creation)
- [x] **Imported fonts, embedded** — upload .woff2/.woff/.ttf/.otf in the wizard or Style panel;
      the file becomes a template asset (`fonts/…`), gets a visible `@font-face`, renders in the
      preview, and ships inside the export (single file per font; weight sets later)
- [x] **Project brand + match toggle** — the app remembers the project's brand (family, palette
      incl. custom, font incl. imported); the wizard's "Use current project's colors & font"
      toggle (off by default — matching is an explicit choice) makes the next graphic belong
      to the same package
- [x] **Package-consistency foundations** — DESIGN_LANGUAGE addendum with per-family
      cross-category tokens (shape, type roles, motion timing); shared template assembler
      extracted from lowerThirds for all categories; continuous-motion machinery (linear loops)
- [x] **First wave categories** (each: briefs → workflow build + judge incl. a package-consistency
      criterion → sweep → screenshot approval, shown next to their lower-third siblings):
      - [x] Info cards (3 — one per family)
      - [x] End credits (4): role-above-name roll, title-left/name-right roll, one-pager
            swap, left-to-right crawl — each ending with a logo + year placeholder
      - [x] Tickers (3 — first continuous/linear motion graphics)

### Template catalog (each category repeats the Phase 2 pattern)
- [x] Lower thirds (10)
- [x] Full/half/custom screen info cards (3) — *first wave*
- [x] End credits (4) — *first wave*
- [x] Tickers (3) — *first wave*
- [x] Starting-soon loop with timer (3) — *wave 2* (shared countdown engine, hold-loop preset)
- [x] Game show countdown/timer (2) — *wave 2* (timer-run pop + timer-line-reveal)
- [x] Scoreboards (2) — *wave 2* (4-field contract, score-pop on update)
- [x] Infographics (2) — *wave 2* (count-up stat + bars-grow engines)
- [x] Corner bug / picture placeholder (1) — *wave 2* (logo slot on the standard assembler)
- [x] Game-show quiz graphics with options (1) — *wave 2* (next() reveals the correct answer)

**The catalog is complete: 31 designs across all 10 categories, every one family-consistent
with its lower-third siblings (§8), swept per category, and covered by an E2E spec.**

### Images done right (user feedback after wave 2)
- [x] **Broadcast field set** — the wizard/panels offer text, long text, number, and **Image**
      (SPX `filelist` listing `./images/`); dropdown/color/checkbox retired from generic UIs
      (kept only where a design truly needs a constrained choice, e.g. the quiz answer)
- [x] **Image-aware runtime** — every category's `update()` writes through `setFieldValue`:
      `<img id="fN">` gets the path as `src`, empty hides it and toggles `.has-image`
- [x] **Logo fields** — end credits (f2), corner bug, and the frosted info card expose their
      logo slot as a real SPX field; the Data panel gets an image picker + upload
- [x] **Export folder structure** — the zip contains `<project>/index.html` +
      `<project>/images/<file>` (+ fonts/, css/, js/), extracting straight into
      `[TemplatesFolder]/` the way SPX/CasparCG expect

### UX overhaul (user feedback round 2 — portrait monitors + real use)
- [x] **Preview-over-tabs layout** — code editor full-height left; on the right the 16:9 canvas
      (sized by the template's aspect, clamped) sits above the tool tabs — no dead space on
      vertical screens, works on landscape too
- [x] **Validate tab removed** — validation runs automatically inside Export, errors listed
      inline, download gated
- [x] **Motion phases** — In / Out / Both control: mix one preset's entrance with another's
      exit (marked-region splice, per-phase `// In preset:` / `// Out preset:` comments,
      backward compatible); every Motion apply auto-replays the graphic
- [x] **Change highlighting** — every panel/AI apply diffs the code and highlights + scrolls to
      the changed lines in the editor (accent wash + gutter bar)
- [x] **Blocks tab removed** — add-field moved into the Data panel; element/motion inserts go
      through AI + Motion (the block registry remains as the offline AI stub's vocabulary)
- [x] **Learn tab removed** — the knowledge base became Monaco hover tooltips (hover play(),
      an fN id, or a CSS property); Claude-powered Explain stays in the AI panel

### Packet manager + more playout targets
- [x] **Packet manager (graphics)** — 📦 Packets in the topbar: save the current graphic into a
      named packet (same name = update), reopen any saved graphic, export the whole packet as
      ONE zip (a plug-and-play SPX folder per graphic)
- [x] **Packet manager (looks)** — named brand looks captured from the current graphic's actual
      :root vars + font (Style-panel tweaks included): apply to any graphic (highlighted,
      undoable), set as the project brand for new graphics, share/import as a .look.json file
- [x] **OGraf export** — EBU OGraf v1 package: .ograf.json manifest (data schema from the
      DataFields, stepCount) + graphic.mjs Web Component wrapping the template runtime; manifest
      self-check gates the build; E2E drives the component through the renderer contract
- [x] **CasparCG export** — one self-contained .html (CG ADD loads it directly) with a data shim
      accepting both JSON and CasparCG XML templateData payloads

## The pipeline (road ahead — user-defined eras, analyzed 2026-07-05)

Order matters: each era is independently shippable, and nothing in an earlier era gets
reworked by a later one. Social/chat features were MOVED from the local era into the
server era (no server = no CORS-free social APIs, no inbound chat endpoint).

### Era 1 — Hygiene
- [x] **Self-hosted Monaco** — bundled like GSAP (src/monacoSetup.ts: loader.config +
      Vite-bundled workers); E2E proves the editor works with every CDN blocked

### Era 2 — Workflow help: import to start
- [x] **Import HTML templates** — the wizard's Import entry accepts .html and SPX-style .zip:
      inline style/script split into the panes (the SPX definition stays in the HTML; bundled
      GSAP blobs dropped), zip assets pulled in with relative paths, then straight to Export's
      inline validation with the AI "Make SPX-ready" fix path; converting to
      SPX/CasparCG/OGraf comes free via the four targets. Round-trip E2E: an exported Starter
      zip re-imports as byte-identical code.
- SKIPPED for now (user decision 2026-07-05): animated-SVG import and Lottie import — revisit
  after the server era if demand shows. (Lottie = the big one: bundled lottie-web player,
  segment mapping, text-layer binding.)

### Era 3 — AI depth
- [x] **Chat-first Describe-it** — the brainstorm chat (ai/brainstorm.ts): every reply ends
      with a machine-readable BRIEF line; "Use as brief" fills the prompt box.
- [x] **Example prompt gallery** — 8 curated off-catalog briefs as one-click chips in the
      Describe-it step (ai/examplePrompts.ts).
- [x] **"Any graphic" quality push — iteration loop proven** — run #1: 12/12 valid, zero
      repair rounds; user review found text-on-text stacking (karaoke), mid-word label
      wraps (weather), invisible logo slots (versus). Fix: a **Layout safety** section in
      the generation system prompt (no unintentional overlap, double-length mental render,
      nowrap labels, broadcast contrast, visible image placeholders) + a **runtime overlap
      detector** in the bench (pairwise text-rect intersection in the settled frame;
      identical-text stacking whitelisted as deliberate layering). Run #2 on the flagged
      briefs: all three fixed. The loop (bench → review → prompt → re-bench) is the
      standing quality process; re-run the full bank after any system-prompt change.

### Era 3.5 — Catalog growth from bench winners (user idea 2026-07-05)
- [x] Six bench winners promoted into hand-tuned variants (18-agent workflow, judged vs the
      bench shots + family tokens): **tk04 Index Strip** (ticker), **ig03 Timing Tower**,
      **ig04 Poll Ring**, **ig05 Rising Total**, **ig06 Schedule Board** (infographics, with
      two new category presets: ring-fill + rows-cascade, and count-up now fills progress
      bars), **card04 Quote Card** (info card). Catalog: **36 designs**.
      DROPPED (user call — don't fight the contract): card05 Face-Off — a full-frame
      versus layout misfits the info-card auto-fit/steps contract; revisit as its own
      category if demand shows. Sweep-check gaps fixed along the way (infographics have no
      mask contract; formatted-number rebinds; coherent steps opt-out via
      StandardDesign.disableSteps).
- [x] Wizard category grouping: **Essentials** vs **Specials** (CategoryInfo.group).

### Public face (2026-07-08 — the landing page + open doors)
- [x] **Public landing page at `/`** — static, brand-true (void/amber, bundled fonts, no React,
      no CDN): hero + "runs on OBS · vMix · SPX · CasparCG · OGraf" chips + house-template
      screenshots + how-it-works + operability row + free/AGPL footer. The editor moved to
      **`/app`** (Vite MPA: app.html entry; dev/preview clean URL via the `app-clean-url` plugin,
      production via Vercel `cleanUrls`). Old root `?chat=`/`?template=` share links redirect
      with their query; in-app link generation follows `location.pathname`; Google OAuth returns
      to `/app` (origin+pathname). E2E: landing.spec (3) + every spec migrated to `/app`.

### Homebase (2026-07-08 — the signed-in account surface)
- [x] **Avatar account menu** in the topbar (Google photo or initial chip) → Your homebase ·
      Settings · Sign out; signed-out hosted mode keeps the plain "Sign in" button; offline
      builds still grow zero auth UI.
- [x] **Your homebase** — every saved graphic across all packets, newest first, open-into-editor;
      reads the SAME packet store 📦 Packets manages (one source of saved designs; cloud sync
      already mirrors it). Empty state routes to the wizard.
- [x] **Settings** — AI key + model (same ai/settings store the wizard uses) + workflow defaults
      (`model/prefs.ts`: default export target — the Export tab also remembers the last pick);
      brand/style defaults deliberately stay where the work happens (project brand + looks).
      *Future settings home: preferred styles, platform presets, personal brand assets.*
- [x] E2E: configured homebase.spec (avatar → homebase → settings → sign out, live-verified);
      offline export-default persistence spec.

### The NoaCG house family (2026-07-08 — brand-kit overlays as first-class templates)
- [x] **A 4th style family `noacg`** — the product's own on-air look (§8 tokens: 8px amber bar +
      void blur(8px) panels, mono label voice, restrained accent glow), so built-in output
      showcases the brand. New `NoaCG Amber` palette; JetBrains Mono bundled (variable 400-700,
      one file now also serving the app UI); `labelFontFaceCss` = a design-owned second typeface
      the Style panel's heading swap never touches; `StandardDesign.runtimeExtraJs` (the
      infographics doctrine generalized) for design-owned runtime like live clocks.
- [x] **7 house variants** rebuilt from `NoaCG-Brand-Kit/overlays/` (offline-first — no Google
      Fonts, full SPX runtime): **lt11 House Strap**, **lt12 House Breaking** (accent chip +
      headline panel), **lt13 House Interview** (3-line) · **bug02 House Clock** (logo/three-bar
      mark + live HH:MM:SS, accent seconds) · **tk05 House Wire** + **tk06 House Markets**
      (sign-colored deltas, live clock caps) · **card05 House Title** (mono kicker + huge title +
      radial accent glow; the overlay's opaque backdrop intentionally dropped — catalog graphics
      composite). Catalog: **43 designs**. Swept (lower-third / ticker / info-card all valid) +
      4 house E2E specs (clock ticks, deltas color, chip stacks, mono face loads).

### Era 4 — Local backend (no server, no login)
- [x] **Control panels for your graphics** — ONE modular engine (src/control/controlModel.ts)
      turns any graphic's SPX DataFields into an operator panel: number → +/− stepper (custom
      step), textarea → line editor, filelist → image picker, dropdown → select, etc. No
      per-template code. Lives as the in-app **Control tab** (live-drives the preview) and as a
      standalone **controlpanel.html** bundled with every SPX export — open the graphic as a
      browser source and the panel drives it over a BroadcastChannel (a receiver is injected
      into index.html). Same message shape swaps to a Supabase Realtime channel in Era 5.
- [x] **Google Sheets as a live source** — the Control panel adds an editable polling block to
      the template's own JS: fetch a published-CSV sheet every N seconds, map columns → fields
      (seeded from field titles), call update(). Runs in preview + export. Documented CORS
      reality: "Publish to web → CSV" links work client-side; the Era-5 gateway proxies the rest.
- ⚠ MOVED to Era 5: social-media import (X/YouTube comments) and the show-chat website —
  both need server-side API keys / an inbound endpoint; they are Supabase-era features.

### Era 5 — Server era (one coherent planning round before building)
**Planning round complete (2026-07-05)** — the binding design doc is **`docs/ERA5_PLAN.md`**
(8-agent codebase recon + Supabase pattern research). Read it before building any phase.
Stack: **Supabase** (✓ blessed 2026-07-05) — Google OAuth + email/password + tester
invites, Postgres for cloud-saved projects/packets/looks, Realtime channels for remote
control panels, Edge functions for the AI gateway + social ingestion later.
Repo shape: ✓ decided 2026-07-05, **refined in the planning round** — **private gateway split**.
This repo stays the complete self-hostable app under **AGPL-3.0** AND **carries the full
`supabase/` folder** (config.toml + migrations with schema/RLS/auth-hook + seed + `.env.example`)
so a self-hoster can `supabase db push` to a working instance; **only** billing / metered
AI-gateway / social-ingestion edge functions + secrets live in the private repo. The app reaches
the gateway via VITE_AI_PROXY_URL and Supabase URLs; with those unset it is pure offline mode.
Build posture: ✓ **code-first, verify later** — each phase ships full code + migrations +
edge-function stubs with `npm run build` green and the offline path E2E-green; live server paths
(auth, RLS isolation, realtime) are maintainer-verified against a real Supabase (per-phase
checklists in ERA5_PLAN.md). A green build never counts as "verified" for a server path.

Why operability is the priority — evidence (2026-07-05): the C-vs-B comparison rig
(`scripts/ai-compare.mjs`) ran 5 briefs through three arms on one model — raw one-shot,
raw + self-critique iteration, and our pipeline. On single-graphic quality the pipeline does
NOT beat a competent iterator (C ≈ B, occasionally worse). So the generation model is not the
moat; this era is — operability (control panels, live data, playout export, packets),
verification, and a compounding human-rated corpus. The only generation-side investment the
data justifies is a DETERMINISTIC motion checker (multi-timestamp overlap sampling — animated
correctness, e.g. karaoke wipes, is the one frontier every arm failed), NOT a "smarter AI" or
a taste-critic skills layer.
Sub-phases (see ERA5_PLAN.md for full scope + per-phase live-verify checklists):
- [x] **5.0 Foundations** — `src/backend/` (config feature-detection + StorageProvider interface
      + LocalStorageProvider), sync metadata (`updatedAt`) on packets/looks/brand with backfill,
      `supabase/` scaffold (config.toml + migrations + seed), `.env.example` vars. No visible
      feature; offline behaviour identical (build + offline E2E green).
- [x] **5.1 Auth (invite-only)** — `@supabase/supabase-js` (code-split; offline never loads it) +
      client factory; Google OAuth + email/password; AuthGate + LoginScreen + topbar AuthStatus,
      engaged only when configured + required; the allowlist table + Before-User-Created hook ship
      in migration 0002; `scripts/allowlist.mjs` admin tool; callClaude attaches the user JWT as a
      Bearer in proxy mode. **Live-verified 2026-07-06** on a real project: login gate,
      email/password sign-in, AuthGate→app handoff; `enforce_allowlist` present + locked. (Invite
      *rejection* still needs the dashboard Before-User-Created hook enabled.)
- [x] **5.2a Cloud persistence (packets + looks)** — `SupabaseProvider` (documents table, per-user
      RLS) + a pure `reconcile()`/`runSync()` engine (LWW, true-conflict → "(conflicted copy)",
      tombstone deletes) + `syncController` (guarded, debounced, serialized) + topbar `SyncStatus`.
      Local stays the live path; cloud mirrors. Build + offline E2E green (12 sync-logic assertions);
      hardened by an 11-agent adversarial review (7 bugs fixed). **Live-verified 2026-07-06**:
      authed write/read round-trip, auto-sync "Synced", delete, and cross-user RLS isolation (user 2
      cannot see user 1's rows). Body is inline jsonb until 5.2b.
- [x] **5.2b Cloud persistence (finish)** — assets externalized to the `user-assets` Storage bucket
      (content-hash keyed, so a shared font stores once; **live-verified**: row shrinks to ~236 B, one
      Storage object, exact rehydrate); the working project **autosaved** locally (survives reload,
      wizard-first startup unchanged); **brand + project cloud sync** as per-user singletons
      (deterministic `uuid(uid:kind)` → one row each, **live-verified**); coordinated tombstone purge
      (both sides, 90-day grace). *Known edge: a project pulled from another device is adopted on
      reload, not live — a live "updated elsewhere" prompt is future polish.*
- [x] **5.3 Remote realtime control** — opt-in default-off export block over a **public** Realtime
      Broadcast channel + publishable key (research call: no token to expire, so an on-air graphic
      never drops; isolation via an unguessable topic capability). Hand-rolled WS client;
      controlpanel.html gains an any-device REST-send path; validator host-suffix whitelists
      `.supabase.co`. **Live-verified** (WS-join + REST broadcast round-trip). Private-channel +
      minted-token "hardened mode" documented as deferred.
- [x] **5.4 Show chat** — public send-in page (`?chat=<slug>`) → owner moderation (Realtime queue,
      Approve/Reject/Air) → graphic block that polls on-air messages (feed or spotlight). All
      in-database (one migration: RLS + abuse trigger, no edge function). **Live-verified** every
      RLS boundary + the full submit→moderate→air→graphic flow. *Social-media API import (X/YouTube
      comments) deferred — it needs private API keys (repo-split), unlike this custom chat.*
- [x] **5.5 User-shared templates** (user idea 2026-07-05): a community section where logged-in
      users publish templates/looks others browse and use. Migration `0004` (own `community_templates`
      table — NOT a documents sync kind — + browse RPCs granted to `authenticated` only + a global
      `moderators` role + a report/takedown path + a public `community-assets` bucket with
      author-scoped writes); automated gate = `validateTemplate` + new `templateBench` composed in
      `community/gate.ts`, run at BOTH publish and import; publish UI + "My submissions" in
      PacketManager; the `🌐 Community` gallery (browse/Use/Report) + topbar button + `?template=<slug>`
      deep-link. **Decisions (2026-07-07):** self-service publishing now (clean gate → `approved`) with
      the full pre-review schema shipped for a one-line switch later; gallery reads signed-in-only;
      single graphics + looks (whole-packet publishing deferred). Offline-invariant (E2E-proven, no
      community UI without a backend); build + full E2E (55) green; migration adversarially reviewed
      (5 findings fixed). **Applied to live Supabase + fully live-verified (two-account pass,
      2026-07-07):** publish → cross-user browse + import + asset round-trip through the public bucket,
      author_id hidden, anon can't read, the author-self-approve attack blocked, moderator takedown +
      author-can't-reverse; a 6th (anon EXECUTE via Supabase default grants) and a 7th (moderator had
      no SELECT policy, so takedown matched 0 rows — migration 0005) were caught live and fixed. The
      **moderator takedown queue UI shipped** (🛡 Moderate, gated on `is_moderator()`; review a
      sandboxed preview → Remove/Restore; reports queue). **Deferred:** human pre-review flip (one line
      + the queue already exists), whole-packet publishing, anon public gallery + login-less share page.
- [x] **5.6 The open editor (free-to-try posture, 2026-07-08)** — the app-wide login wall is GONE
      (`VITE_REQUIRE_AUTH` removed; AuthGate/LoginScreen → an on-demand `SignInDialog` + `useAuthState`
      feature gates). Anyone can create, preview, and export with no account — hosted or self-hosted.
      Signing in (topbar button or any gate) unlocks the account features: cloud sync, community,
      show chat, AI (both the side panel and the wizard's Describe-it entry). Local packets stay
      anonymous-friendly; publish/sync nudge sign-in inline. Offline builds grow no auth UI at all
      (E2E-pinned). **Signup opened the same day** (migration `0006`: the Before-User-Created hook
      now allows everyone; applied + live-verified with a throwaway signup). Re-close = restore the
      0002 function body. *Remaining hardening (dashboard, manual): require email confirmation +
      enable captcha — the live project currently auto-confirms.*
- [ ] **5.7 Payments/subscriptions LAST** (long beta first; separate private repo, Stripe, metered
      generations)

### Era 6 — WYSIWYG editor + timeline
- [x] **W1 drag-to-position (2026-07-08)** — the Move toggle on the preview toolbar overlays a
      pointer layer (9-zone grid + ghost + target-cell highlight; the root is revealed while the
      mode is on): release computes nearest zone + residual nudge and writes the SAME
      `zoneDecls` patch the Style panel writes onto the detected root rule — deterministic,
      highlighted, undoable. Esc cancels. E2E: drag re-anchors bottom-left → top-right in the
      preview's stylesheet + Ctrl+Z restores; Escape leaves the code untouched.
- [x] **T1 read-only timeline view (2026-07-08)** — the Motion tab renders the marked ANIMATION
      region as tracks (`blocks/timelineModel.ts`: parse-by-construction of the emitted
      tl.set/to/fromTo calls — knobs, durations `X / animSpeed`, staggers, `'-=N'` overlaps;
      unrecognizable hand-edits degrade to an honest "the code is the truth" note). In/Out phase
      tabs with real durations (∞ badge for loops), one row per tween, and a scrubber that
      PAUSES the live preview at any moment (store `sendScrub` → simulator builds + pauses the
      phase timeline; OUT scrubs start from the settled on-air state). Timing knobs = T2.
- [x] **The direct-manipulation rework (2026-07-08, same-day user feedback on the build):**
      1) **Settled design view** — after every rebuild the preview shows the graphic SETTLED
      (simulator: `buildInTimeline().progress(1, true)` + a truth-restoring second `update()`;
      clocks/loops stay idle; blank/imported templates unaffected). The canvas is never dead.
      2) **No move mode** — `CanvasInteraction` replaces the W1 toggle: hand/text hover cursors,
      drag starts on the graphic with a 4px threshold, same zone+nudge patch; grid only during
      drag. 3) **W3 inline text editing shipped** — dblclick a visible `#fN` → overlay input →
      live sample value + SPX-definition default + static text in ONE undoable patch
      (`setFieldDefault`). 4) **T1.5** — the timeline is a collapsible strip UNDER the preview
      (above the transport), with a LIVE playhead following the simulator-owned `__activeTl`
      (Play sweeps In; Stop auto-switches to Out; scrub reclaims; end-snap fix so keyboard
      scrubs reach final set() calls). E2E: wysiwyg (3), timeline (5), inline-edit (2).
- [x] **T2 draggable timing bars (2026-07-08)** — drag a bar's body to retime a tween, its
      right-edge handle to stretch it (0.05s snap): `patchTweenTiming` (blocks/timelineModel.ts,
      the parser in reverse) rewrites the tween's `N / animSpeed` duration literal and writes an
      explicit absolute position (replacing '-=' overlaps) IN the emitted region — zero preset
      changes, the code keeps its readable sequential shape, the speed knob still scales
      everything. One undoable applyTemplate per release + auto-replay. set() ticks and
      measured durations stay read-only. Per-element eases = T2.5. E2E: stretch rewrites the
      literal + undo restores; move writes the absolute position + still plays.
- [x] **W2 corner scale handle (2026-07-08)** — hovering the graphic shows a handle at the
      root's bottom-right; dragging live-previews `--scale` (inline :root override, ×N badge)
      and releases ONE `patchCss` write of the variable (the Style panel's size mechanism),
      clamped 0.5–2. E2E: the drag grows --scale in the rebuilt preview within the clamp.
- [x] **T2.5 per-tween eases (2026-07-08)** — an ease chip per editable bar: the easing
      vocabulary's phase-correct half (doctrine intact) + auto (inherit the knob);
      `patchTweenEase` writes/clears a quoted ease literal in the tween's vars.
- [x] **T3.1+T3.2 steps sequencing (2026-07-08)** — the moat slice, competitor-researched
      (Loopic = stop-point keyframes, step count baked in; SPX = a bare Continue button):
      the strip shows the graphic as the playout chain **▶ In · » 2 · » 3 · ■ Out** —
      data-driven step count, real durations, the SPX `out` mode as a badge. The simulator
      owns each Continue's reveal tween so the LIVE PLAYHEAD sweeps every » Next press;
      step segments scrub (prior state jumped, callbacks suppressed), stretch
      (`var stepDurations = [...]` literals) and take per-step eases (`stepEases`) — all
      through the same undoable literal patcher. Emit upgrade also fixed a latent bug:
      replaying a steps template never reset `currentStep`.
- [x] **T3.3 reveal groups (2026-07-08)** — the better-than-Loopic move: `var stepGroups =
      [['#f1'], ['#f2']]` in the emitted block (a GROUP per Continue, 0.08s stagger inside a
      group); step segments show one row per line and dragging a row's bar onto another » tab
      regroups (`patchStepRegroup` rewrites groups+durations+eases as one undoable patch;
      emptied steps disappear with their timing; a »+ drop target splits a line into a new
      step). E2E: merge »3 into »2 → one press reveals both lines → split back out via »+.
- [x] **T3.5 the moment-cards UX pass (2026-07-09, tester feedback: "how do I add steps?")** —
      the strip now tells the playout story instead of assuming it: every segment is a MOMENT
      CARD with its operator cue underneath (▶ In "on ▶ Play" · » 2 "on 1st » Next" · ■ Out
      "on ■ Stop"); a read-only **● On air** card names the hold between the last reveal and
      the exit (until ■ Stop / auto-out Ns / stays) and clicking it parks the preview on the
      settled on-air look; step rows get an **"appears on" menu** (move a line to another
      » Next press, or its own new one — patchStepRegroup minus the drag); »+ Step disables
      with a tooltip reason instead of vanishing; an unparsable hand-edited region shows an
      honest one-liner; the header ease readout speaks the vocabulary's names (raw GSAP pair
      in the tooltip). Next (needs approval): converge the Motion panel into the In/Out cards
      and make the On air card edit `settings.out`.
- [x] **T3.6 step-workflow honesty fixes (2026-07-09, second tester round)** — app declares
      `color-scheme: dark` + the preview srcdoc gets the matching meta (native select popups
      were white-on-white on Windows; the pairing keeps the stage transparent); the appears-on
      menu is self-labeling ("appears on press 2") and cards/ghost/tooltips share the "press"
      vocabulary; a "Turn off step reveal" action on the strip (the Motion checkbox's
      counterpart); `countLines` no longer counts `<img>` logo fields as text lines — corner
      bugs and card03 stop offering a broken unmasked step reveal. Bigger rethink planned and
      approved separately (element→press assignment, derived part registry, cue-segmented
      strip): fix B1/B2 step-sync bugs next, generalize steps to non-text parts after the
      registry; timeline overview and canvas assignment wait for the Era-6 selection model.
- [x] **T3.7 step-sync bug fixes (2026-07-09)** — two intent-corrupting bugs: (B1) regroups
      only patched the JS, so a merge/split left a stale SPX `steps` count (a dead Continue
      press on air, wrong OGraf stepCount) — every step-count-changing path now re-syncs the
      definition via `withStepsSetting` (invariant: steps = groups + 1); (B2) any Motion
      preset/easing apply re-emitted the default one-line-per-press chain, silently deleting
      the user's regrouping — `presetConfigFromTemplate` now round-trips the existing
      `stepGroups`/`stepDurations`/`stepEases` literals (filtered to lines that still exist)
      and the emitters preserve them. Turning steps on now announces the behavior change on
      the strip ("▶ Play now shows only the first line…"), and the steps checkbox copy in the
      wizard + Motion panel uses the same press language. E2E: definition follows merge/split;
      preset swap keeps a merged chain + tuned ease.
- [x] **T4.0 the TemplatePart registry (2026-07-09)** — the shared element-identity contract
      (model/structure.ts `getTemplateParts(html, fields)`): DOM-derived, never stored —
      parts are {selector, kind: root|panel|accent|line|image|block, label, channel:
      mask|rise} with single-token selectors only (the region parsers can't round-trip more)
      and a uniqueness rule (a selector matching ≠1 elements is excluded, not guessed).
      `countLines` = the registry's mask-capable `line` parts (DOMParser replaces the
      attribute-order regex that miscounted logo imgs); the timeline strip's labels/ghost/
      appears menu read `part.label` (friendlyTarget keeps heuristics only for unregistered
      selectors). This is the contract the canvas selection layer and step generalization
      build on — canvas session must consume it, never fork it. E2E pins the Hairline
      part map + the selector shape rule.
- [x] **T4.1 any part on any press (2026-07-09)** — steps stop being lines-only: accents,
      logo/image slots, and any line but the first can be assigned to a » Next press.
      Emit changes (animPresets stepsBlock): a `stepReveals` map says HOW each part appears
      ('mask' slides within its line mask, 'rise' fades+rises — channel from the registry,
      never guessed from the selector); pre-hiding is `hidePendingSteps()` DERIVED from
      stepGroups at runtime, so "removed from every group ⇒ appears with ▶ Play" is true by
      construction; per-part reveals are positioned tweens in one timeline (mixed channels
      per press work). Patch split: moving between existing presses stays patchStepRegroup
      (array patch, keeps tuning); assigning/unassigning re-emits the IN phase
      (`applyStepChain`) because the entrance choreography changes (an assigned accent's
      intro draw drops; it returns on unassign). The step view lists unassigned parts with
      an "appears with ▶ Play" menu — pick a press to move them; assigned rows can go back.
      Emptied presses disappear; the last part leaving turns steps off. Validation warns on
      dangling step selectors. Deferred: block elements outside the root (opacity-gate
      problem); entering the steps world still needs 2+ lines (»+ gate) — a logo-only
      first step is a follow-up. E2E: accent onto its own press → hidden through Play,
      revealed on press 2, definition steps follow → unassigned back into the entrance.
- [x] **T4.2 the cue-segmented overview (2026-07-09, user-ratified over a global time
      axis)** — the strip's tracks area becomes ONE overview of the whole playout: every
      section (▶ In · each » press · ● hold · ■ Out) side by side, each on its own REAL
      local clock (a single global ruler would fabricate times for operator-driven cues);
      widths = duration × zoom (+/- buttons; fit once per template, min-width-aware), the
      hold a fixed hatched break; rows are registry parts spanning every section —
      multi-target tweens expand onto member rows at their true stagger offsets, set()-only
      bookkeeping rows drop. Every bar edits in place (the same literal patchers); reveal
      bars drag onto » cards to regroup; the gutter shows each part's "appears on press"
      menu at a glance + the selected moment's ease chips. Cards renumbered by PRESS ("» 1"
      = the 1st » Next) so headers, cards, menus, and tooltips finally share ONE numbering.
      timelineModel.buildOverview = the pure matrix derivation. E2E: overview structure,
      zoom scaling (hold fixed), header-click selection; the whole regroup/retime suite
      re-pinned on overview geometry (bars scroll into view in narrow panes).
- [x] **T5 independent layers + basic per-layer animation (2026-07-10, third tester round)** —
      the interaction rethink the tester asked for, as ONE coherent drag model:
      (1) layers edit INDEPENDENTLY — dragging any member of a joint multi-target tween
      splits it into per-target calls first (`splitTween`: exact stagger offsets become
      explicit positions, phase length unchanged) so only the grabbed layer retimes;
      (2) bars resize from BOTH edges (left handle moves the start, end pinned);
      (3) dragging a bar ACROSS sections moves WHEN the part appears — entrance bar onto a
      » press assigns it there, reveal bar onto the entrance un-assigns — all through the
      canvas-shared `changePartPress`, with section bodies as drop zones and a ghost chip
      naming the destination (dropping outside a bar's section can never stretch a phase);
      (4) each layer row's ▸ arrow opens the ENTERS-FROM drawer: X / Y / Scale / Opacity /
      Rotation from-values that settle to the design position (`patchTweenVars` edits
      from/to literals minimally, `insertPartTween` gives partless layers a tween) — the
      deliberately small basic-animation set (slide-ins etc.), NOT a keyframe system (the
      future Flow mode owns advanced logic); (5) select options painted explicitly
      (color-scheme alone failed on the tester's Chromium — white popup, grey text) and
      the timeline selects go solid/full-contrast; clicking a bar (without dragging)
      selects the element, extending the canvas↔code↔timeline sync. E2E: split-on-drag,
      both-edge resize, drop-to-press round-trip, drawer literal round-trip, explicit
      option colors.
- [x] **W4.1 the canvas selection model (2026-07-09)** — click a structural element in the
      preview to select it: registry-backed hit-testing (`getTemplateParts` selectors via an
      elementFromPoint closest-ancestor walk, rect-containment fallback for pointer-events:
      none imports), an amber outline + naming chip speaking `part.label` (the same words as
      the timeline strip), a hover outline + tag previewing what a click would select, and
      click-again-to-climb (line/panel → whole graphic — the registry's nesting, so the root
      stays reachable). Empty canvas or Escape deselects (Escape yields to drag/inline-edit/
      form focus). The chip surfaces ONLY actions that already exist where they apply:
      "Double-click to edit" on text lines; the corner --scale handle stays anchored while
      the whole graphic is selected. Selection is editor UI state ONLY — no store field, no
      template write, rAF-tracked rects so it follows animation and rebuilds. Step/press
      assignment on selection is deliberately NOT here (lands after both Era-6 tracks merge).
      E2E: canvas-selection (5 — select/name, hover, deselect ×2, climb+handle, edit/drag
      layering).
- [x] **W4.2 shared selection (2026-07-09, the first convergence slice)** — the two Era-6
      tracks meet: the canvas selection selector moved from component state into the store
      (`selectedPart`), and both surfaces speak it. Clicking an element on the canvas washes
      its overview row amber (label lit, inset edge); clicking a row's LABEL in the strip
      selects that element on the canvas (outline + chip), clicking the selected label
      deselects both. Only registry-part rows are handles (unregistered hand-tween rows stay
      inert); still UI state only — no history, no template write. Next convergence slice:
      the chip's "appears on press" action reusing applyStepChain. E2E: canvas-selection +1
      (both directions + deselect, no code written).
- [x] **W4.3 "appears on press" from the canvas (2026-07-09, the payoff slice)** — the
      selected element's chip carries the timeline gutter's press control: select the
      accent/logo/a line on the canvas → "appears with ▶ Play / on press N / on a new
      press". Same conditions as the gutter (steps on, chain groupable, eligible kinds,
      never the first line), same soloLast guard, ONE undoable apply + auto-replay. The
      decision tree extracted to blocks/stepAssign.ts `changePartPress` (entrance→press
      and press→entrance re-emit the IN phase with the registry channel; press→press stays
      the tuning-preserving array patch) and the gutter now delegates to it — the two
      surfaces cannot drift. The chip opts into pointer input only while it carries the
      control and swallows its events (the gesture layer under it never fires). E2E:
      canvas-selection +1 (assign via chip → code + gutter agree → back to the entrance).
- [x] **T4.5 blocks join the press chain (2026-07-10, closes T4.1's deferral)** — building-
      block elements (data-gfx + id, siblings of the root) can now appear on a » press. The
      opacity-gate problem solved with an emitted OUTSIDE GATE, both halves derived from the
      chain: (load side) the steps block hides `stepOutsideParts` from first paint, DOM-ready-
      guarded, so nothing shows before ▶ Play; (exit side) ONE recognizable `tl.to(...)` line
      in buildOutTimeline — kept in sync surgically by `patchOutsideExit` at the swap choke
      points, so assign/unassign never resets out-phase tuning and the line's own dragged
      timing survives updates (it parses as a normal editable fade bar in the overview).
      Outside-ness decided by real DOM containment, not part kind. `assignableParts` now
      includes blocks (chains round-trip through preset swaps without dropping them); the
      gutter menu and the canvas chip both offer them. E2E: canvas-selection +1 — insert the
      Logo block, give it its own press from the chip, and pin the whole lifecycle (hidden
      settled → revealed on press 2 → fades on ■ Stop → always-on again after unassign, gate
      code gone).
- [x] **T6 one motion surface (2026-07-10, the approved T3.5 follow-up)** — the Motion
      side-tab is retired; the strip's moment cards ARE the motion surface (SidePanel: five
      tabs). The selected ▶ In / ■ Out card grows an inspector row with that phase's preset
      picker (presetsForType, per-category) and easing choice (the vocabulary's phase-correct
      half — doctrine intact), writing the panel's exact patches (`swapAnimationPhase` /
      `setAnimKnob`); the animSpeed knob lives on the strip header (Slower/Normal/Faster);
      the ● On air card's note now EDITS the SPX `out` setting (until ■ Stop / auto-out N ms
      with an editable delay / stays-no-out), synced into the definition like
      `withStepsSetting`. The unparsable-region fallback keeps the Motion tab's one remaining
      duty: an honest one-liner plus a start-over preset select (a 'both'-phase swap re-emits
      the whole region and brings the timeline back). Found & fixed on the way: `splitRegion`
      left the "// Out preset:" tag in the head slice, so an In-swap followed by an Out-swap
      stranded a stale duplicate tag that won the readback (the panel had the same bug).
      Steps stay where T3.6 put them (»+ Step / turn-off on the strip); the wizard's
      Animation STEP is untouched (a different surface for a different moment). E2E: the
      motion specs re-pinned on the strip + new coverage (per-phase swap from a card, speed
      knob, out-mode sync, fallback).
- [x] **T6.1 motion-surface tester fixes (2026-07-10, first round on the converged strip)** —
      four issues from trying the build: (1) an EXIT could leak its end state into the next
      playback — most visibly a Blur exit leaves filter:blur on the box that a non-blur
      entrance never resets, so the replay started blurred; the simulator now `resetGraphic`s
      (clears GSAP inline props on the root subtree) before every entrance, so play → hold →
      exit → clean reset → play again always starts from the true initial state. (2) The SPX
      `out` = N ms auto-out never fired in the editor preview (only export); the simulator now
      schedules the exit after the entrance settles + the hold, cancelled by any manual
      play/stop/next/scrub. (3) The In and Out cards showed identical preset labels; the Out
      card now names presets in their exit direction (Blur in → Blur out, Drop in → Drop out;
      direction-neutral names like Mask wipe unchanged). (4) The per-layer transform drawer
      was entrance-only; it is now PHASE-AWARE — enters-from on the In card, leaves-to on the
      Out card (patchTweenToVars edits the exit's to-vars, insertPartOutTween gives a partless
      layer its own exit tween; opacity never auto-stripped so the exit still fades). E2E:
      leak-free replay, auto-out in preview, in/out naming, the leaves-to drawer round-trip.
      (Also answered: the missing Login/Community menus were an env artifact — this worktree
      has no `.env`, so the app runs offline and both account surfaces stay hidden by design.)
- [x] **T6.2 per-layer blur (2026-07-10, second tester round)** — the per-layer drawer gains
      a Blur field on BOTH phases: enters-from materialises a layer out of a blur, leaves-to
      dissolves it into one. Blur is the one non-transform in the drawer — it serializes to
      `filter: 'blur(Npx)'` (a string literal, not a bare number), so it has its own reader/
      writer (`setObjBlur`, a `DRAWER_PROPS`/`DRAWER_IDENTITY` vocabulary alongside the
      transforms). All four drawer patchers handle it (patchTweenVars/patchTweenToVars edit
      the from/to objects; insertPartTween gives a blur-in fromTo, insertPartOutTween a
      blur-out to()), and splitTween still separates a joint tween first so only the grabbed
      layer blurs. The simulator's reset already clears leaked filter, so blur leaves cleanly.
      E2E: the drawer exposes blur on both cards and an exit blur round-trips + resets.
- [x] **T7 Timeline v2 — the step timeline (2026-07-11; phases 1-7 + the creation flip +
      the CapCut polish pass; Phase 8 deferred, see below)**: the declarative engine
      (NOACG_ANIM data block + interpreter, canonical serializer, importer, golden parity
      harness); the Inspector column + redo; the clip-style ribbon (cue markers, ruler,
      scrub); keyframes (arm/auto-key at the playhead, diamond drag/delete); presets as
      keyframe generators (In/Out/Both, declared props only, layer-relative In); steps as
      clips (preserve/stretch resize, duplicate/rename/delete, »+, hold popover, speed);
      LOWER THIRDS CREATE AS DATA natively — the classic-strip spec suite moved to its
      still-legacy sibling (info cards' Hairline Card, 34 tests); Phase 7 parity (the
      OBS/vMix overlay honors auto-out with a measured entrance, data-block validation
      warnings, the AI prompt teaches the data shape, l3-sweep updated); and the polish
      pass — playhead grab cap + auto-follow scroll, 1000 px/s deep zoom, per-keyframe
      and per-step ease menus (right-click), ◀◆▶ keyframe navigation, label
      drag-scrubbing. **Phase 8 (retire the literal patchers + the classic strip) waits
      for the remaining category migrations.** Since shipped, each unblocking a wave:
      the §3b STEP CALLS (a named lifecycle hook — game timers), LOOP/YOYO (a repeating
      track — starting soon), and MEASURED MOTION (a named builder that reads the DOM and
      returns the tween — **tickers and end credits**, docs/DYNAMIC_MOTION_SCOPE.md).
      **Only quiz (wrapper-driven Continue) and info cards (they host the classic strip's
      spec suite) remain on the legacy region.** Phase 8 is ratified to retire the strip's
      EDITING patchers while keeping a minimal read-only renderer: a saved template whose
      measured motion is hand-written inline can never be auto-converted, and silently
      regenerating it would discard its owner's tuning. Original plan entry follows — the
      CapCut-style rethink: steps as clips, a real playhead/ruler, an Inspector panel,
      proper keyframes, presets as keyframe generators with In/Out/Both. The audit
      concluded the parse-by-construction patcher architecture is at end of life for this
      feature set; the marked region moves to a declarative data literal + fixed
      interpreter while keeping the builder-globals contract (so the simulator and every
      export are untouched). Full plan, data model, the twelve design decisions, risks,
      and 8 phases: **docs/TIMELINE_V2_PLAN.md**.
Drag/move/scale writes the SAME deterministic patches the panels write today (zone +
nudge + --scale foundations already exist) — code stays the source of truth. Timeline UI
for in/out timings + step triggers maps onto the marked ANIMATION region + animSpeed/
duration knobs. Big; planned last deliberately. **Binding plans (2026-07-08):
`docs/WYSIWYG_PLAN.md`** (slices W1 drag-to-position → W2 scale handle → W3 in-place text →
W4 element nudges, with guardrails) **and `docs/TIMELINE_PLAN.md`** (T1 read-only timeline
view → T2 timing knobs → T3 steps/next() sequencing → T4 custom sequences; not a Loopic
clone, never a creation surface). Recommended order: W1 → T1 → T2 → W2/W3 → T3.

### Era 7 — Nightly automation + the auto-generated graphics library (committed direction, unscheduled)
Binding plan: **`docs/NIGHTLY_AUTOMATION_PLAN.md`**. The site continuously generates and (eventually)
publishes new premium graphics — a large free library covering almost any use case (lower thirds,
titles, timers, tickers, scoreboards, event/holiday/sports/news/social formats, …), with an automatic
quality + safety gate that auto-rejects anything broken, low-quality, inappropriate, or off-brand.
Also nightly health checks (build, E2E, `npm audit`, Supabase advisors). Trajectory: **human-reviewed
now** (drafts land `pending` in the Era-5.5 community table via a least-privilege bot; a human approves
in the 🛡 queue) → **gate-trusted auto-publish later** once the automatic gate matches human judgment.
Reuses `claudeProvider.generate` + `publishGate` + the bench harness; runs on GitHub Actions cron + one
read-only scheduled cloud agent. Job A (the health/CI gates) is built (push CI + weekly audit,
2026-07-21); the generation jobs B/C are plan only — see the plan doc for the verified guardrails
(the nightly-drafts migration, numbered `0010` there) and open decisions.

### AI mode (after the wizard works)
- [x] Claude-backed `AIProvider` (key via the in-app AI settings or `VITE_ANTHROPIC_API_KEY`;
      model configurable, Sonnet 5 default; `VITE_AI_PROXY_URL` is the seam a future hosted
      gateway plugs into without app changes)
- [x] Prompt → graphic template ("Describe it" wizard entry: validated before apply, one
      automatic repair round on validator errors, refine loop on the result; generated code
      keeps the house contracts so the Style/Motion panels and brand still work on it)
- [x] Images in generation — upload logo / still, Claude SEES them (vision), they bundle as
      `images/` assets; project brand colors carried in via the match toggle
- [x] AI panel (modify / fix / explain / make-SPX-ready) backed by Claude when configured,
      by the deterministic stub otherwise

### Export & platform
- [x] SPX Starter + Advanced/Pack export with validation gate
- [x] OGraf export target + manifest validator (see `.claude/skills/ograf-expert`)
- [x] CasparCG export target (self-contained single file + XML data shim)
- [x] **HTML overlay export (2026-07-08)** — one self-contained autoplay .html for plain browser
      sources (OBS Browser Source, vMix Web Browser input, anything that renders a web page):
      fills fields on load (Data-panel values baked at export, SPX-definition defaults as
      fallback) then play(); ships the BroadcastChannel receiver + controlpanel.html (OBS custom
      dock workflow documented) and honors the 5.3 remote-control block. Shared single-file
      composer extracted (`export/selfContained.ts`, reused by CasparCG). E2E: loads the exported
      file with zero outside calls and asserts the baked value + settled opacity.
- [x] **Export research (2026-07-08)** — `docs/EXPORT_TARGETS_RESEARCH.md`: **H2R Graphics** is a
      HIGH-priority small adapter (its Custom HTML type calls our exact `play()`/`update(json)`
      contract; fields declared via a GDD script block we can generate from DataFields);
      **LiveOS** is likely free via our existing OGraf export (OGraf demoed at NAB 2026; else a
      templates.json adapter); **Singular.Live / Flowics / uno** are closed composers — not
      ingest targets, interop at the production layer.
- [x] **H2R Graphics export target (2026-07-08)** — self-contained .html for H2R's Custom HTML
      graphic type: embedded GDD block (`application/json+gdd`, properties keyed by element id
      from the SPX DataFields) becomes H2R's editable inputs; a marked toggle shim converts
      H2R's play()-both-ways convention into the template's play()/stop() pair. E2E drives it
      exactly like H2R (update json string → toggle on → toggle off). 6 export targets.
      **Real-H2R fix (2026-07-08):** the GDD `<script>` needs `name="graphics-data-definition"`
      — without it H2R silently shows no editable fields (found by the user importing into a
      real H2R install; verified against H2R's own Loopic-exported sample). Also dropped the
      unrecognized `file-path` gddType (filelist → plain single-line path input). E2E now pins
      the `name` attribute. **Live-confirmed in the real H2R app (2026-07-08): fields render
      and text edits work.**
- [x] **LiveOS export target (2026-07-09)** — NetOn.Live confirms the LiveOS HTML5 graphics
      engine is OGraf-compliant (any OGraf template imports and plays directly), so the
      target (`export/targets/liveos.ts`, registry id `liveos`) reuses the OGraf package
      builder (`addOgrafPackage`, extracted in `targets/ograf.ts`) and wraps it with
      LiveOS-specific install steps + success message. E2E pins the LiveOS and OGraf
      exports to byte-identical graphic.mjs/manifest so the targets can never drift; the
      driven OGraf contract test covers the shared module. Loopic's legacy `templates.json`
      ingest stays unbuilt (schema not public — see EXPORT_TARGETS_RESEARCH.md). Still to
      do: confirm against a real LiveOS install, like H2R was.
- [x] **Video & image rendering (2026-07-12)** — export any graphic as finished MEDIA from the
      Export tab: MP4 / transparent WebM / transparent PNG still / PNG-sequence ZIP / ProRes
      4444 MOV, rendered by Remotion driving the graphic's OWN runtime (no per-graphic
      compositions, no rewritten animations). A virtual clock makes every frame a pure
      function of the manifest (countdowns/marquees/count-ups render exactly as live;
      repeat renders are byte-identical); the user picks the TOTAL duration, measured
      animation time is preserved, and the remainder becomes hold. Local executor for
      dev/self-host; hosted path = Vercel Sandbox (@remotion/vercel) + Blob with per-job
      secret auth, tier quotas (ProRes/sequence sign-in-gated), the render_jobs ledger
      (migration 0007), and a cleanup cron. Contract: `src/render/CLAUDE.md` +
      `docs/RENDER.md`. Still to do: live-verify the sandbox path on a real deployment
      (needs the Blob store + env vars), like H2R was.
- [x] **AI video & animation projects (2026-07-13)** — a second project kind beside live
      graphics: "Video or animation with AI" in the New Project wizard creates a
      fixed-duration React/Remotion composition (stingers, intros, logo reveals,
      countdowns, graphics over uploaded video). A staged motion-design harness generates
      it (skill detection → a timed Motion Director plan → the Remotion coder against a
      composition contract + canonical example → bounded compile/probe/repair), the code
      stays visible and editable in Monaco, a sandboxed Remotion Player previews it live
      (player-host/, its own package — Remotion never enters the AGPL bundle; the iframe's
      opaque origin keeps AI code away from the user's key), chat refinement iterates,
      projects autosave + save/reopen, and the EXISTING render service outputs
      MP4/WebM/PNG/sequence/ProRes via manifest kind:'remotion' (the same compiled module
      the preview runs). Uploaded images/SVGs/video become `assets` props; a video asset
      can be the background layer. Merged to main 2026-07-13; the input-model convergence
      (editable Remotion inputs mapped to the Template Definition system) followed 2026-07-14,
      and the HyperFrames engine joined as a second video engine 2026-07-18. Still to do:
      sandbox-executor live verification, a Blob upload channel for large assets, and the
      visual Motion Critic pass (experiment-gated - docs/VIDEO_DESIGN_QUALITY_PLAN.md §3.5).
- [ ] Data-driven/live content architecture (ticker/scoreboard controlled from a backend) — later

### The SPX generation harness (2026-07-17 — AI that beats a bare prompt, provably)
- [x] **One "Create with AI" entry** — the wizard's Describe-it and Import cards merged: a
      brief plus optional images and/or an existing .html/.zip in one drop zone; the
      byte-faithful no-AI "Open as code" import stays one click away (never sign-in-gated),
      the images → catalog continuation survives, and Convert brings a foreign template to
      the house contracts guided by the prompt.
- [x] **Grounded-first generation** — one small design-spec call routes each brief; catalog-fit
      specs assemble DETERMINISTICALLY through the real wizard assemblers (correct by
      construction, panel/timeline-editable), with compositional design adjustments
      (typography scale/weight/tracking, density, alignment, shape, panel treatment) so
      different briefs produce different designs — not one layout in new colours — plus an
      optional bounded polish patch that can only improve (revert on any gate/bench failure).
      Off-catalog briefs go to the free-form coder (nearest catalog design as the canonical
      example) with a validated 2-round repair loop; taste guidance is genre-reasoning, not a
      fixed look, and uploaded references are read as a design system that outweighs it.
- [x] **The runtime bench in the loop** — every AI result is exercised in a live iframe
      (lifecycle, field binding, overlap/overflow, doubled-text stress, house editability);
      findings feed repair rounds verbatim; the whole catalog must pass its own bench
      (e2e/bench.spec.ts calibration tripwire). The offline stub assembles catalog-grade
      results through the same pipeline.
- [x] **Value proven, not assumed** — per-run telemetry (tokens, latency, calls, repairs,
      route, variant diversity) + scripts/ai-compare.mjs rebuilt as the standing proof: same
      brief, same model, four arms (raw / raw+self-critique / pre-harness / the harness),
      neutral scoring. The decision rule: a harness stage keeps its place only if it shows a
      clear improvement for its cost.
- Deferred until the benchmark earns them: a selective vision taste critic, a curated taste
  library with per-brief retrieval, and a nightly taste-analysis task (reviewable proposals).
- [x] **The harness made optional, comparative, and learning** (user verdict on run #1: not
      yet consistently better visually — raw already looks strong): a "Use NoaCG harness
      (3 options)" checkbox (default OFF = the pure one-shot baseline, statically validated,
      no repair); harness ON generates THREE distinct directions from one design-stage call
      with an option picker; the committed pick feeds aggregated preference counters that
      surface into the design prompt as a subtle tie-breaker (≥8 selections, ratios only).
- [x] **Benchmark winners promoted into the catalog** (the Era-3.5 move, repeated): both
      kids' timers → gt03 "Sunny Pop" + gt04 "Stage Ring" (design-owned ring/tick runtimes
      + autoEase on the gt contract), raw election bars → ig07 "Election Bars" (count-up
      readouts riding the bars-grow measured-motion builder), and both versus cards → a NEW
      **versus** category (vs01 "Arena Duel" + vs02 "Collision Card", vs-slam/vs-glide
      presets) — the full-frame match-up that misfitted info-cards (dropped card05) now owns
      its contract. Catalog: **11 categories, 49 designs**.

### Import Graphic - your own artwork becomes the design (2026-07-18)
The flat-PNG import workflow; **docs/IMPORT_MVP.md is the binding contract.** NoaCG is not
replacing Photoshop/Figma/After Effects - graphics may be designed elsewhere; NoaCG's job is
the dynamic fields, broadcast behaviour, preview, and export around them. Distinct from the
Phase 5 "Import graphics" entry above, which routes a dropped image into a catalog design's
logo slot: here the image IS the design.
- [x] **MVP wizard flow** - the wizard's Import graphic entry: drop a flat PNG, measured at
      import (never assumed) - frame-sized art anchors at 0,0; larger art is scaled to fit the
      frame, so a 2x/retina export lands exactly frame-sized; smaller art floats with the
      ordinary 9-zone anchor - then the Text step places lines in the artwork's own px, and
      whole-unit in/out presets (Fade / Slide up / Pop / Blur) animate artwork + text as one
      picture. The output is a standard-contract template (`.imported-design-box`) the part
      registry, timeline, canvas selection, and all six export targets accept with no changes.
      A canvas drag re-places a line through its wrapper's CSS rule
      (blocks/designLayout.ts) - a design decision, never a motion keyframe.
- [x] **Wizard taste pass (founder-ratified)** - one CTA on the Design step (the footer Next
      reads "Add text fields >"); the Style step slims to what still applies (Palette + Font
      always; Graphic size + Position only for smaller-than-frame art; the global Text size
      knob never shows - each line sizes itself on the Text step); the box part is labelled
      "Design", not "Panel".
- [x] **Canvas + data fields phase** - the Data tab's add-field creates a real placed line on
      the artwork (visible element + placement CSS rule + SPX DataField + selectable layer,
      one undoable apply, wired into update() and every export with no manual code); placed
      lines nudge with the keyboard and resize their text with a canvas handle; the artwork is
      its own registry layer so the PNG and every field animate independently (Inspector
      presets apply per layer; Animations is the Inspector's default view on an imported
      design); E2E covers the full import -> canvas -> field -> animate -> preview -> SPX
      export roundtrip.
- [x] **Image slots + editor-wide nudge (follow-up)** - the Data tab's Image add creates a
      placed image slot on the artwork (SPX filelist field, dashed empty-slot mark, corner
      box resize; the slot stays selectable and draggable while empty), and arrow-key
      nudging extends beyond placed fields to EVERY selected layer - placed fields move as
      placement CSS, other layers key x/y at the playhead like the drag, one undoable apply
      per burst either way.
- [x] **The wizard becomes a setup flow (2026-07-18)** - Import graphic is two steps (Start ->
      Design -> Create): the template creates BARE and lands in the editor with the Data tab
      revealed; the wizard's Text/Style/Animation steps are gone from the flow. Fields come
      from the Data tab (the placed add), placement from the canvas + the Inspector Style
      tab's numeric X/Y, and a selected placed field is styled in the Inspector's new Style
      tab (font incl. shipped @font-face, size, weight, color, anchor, line-height, tracking;
      slot box for image fields) - deterministic patches of the field's own rules
      (blocks/designLayout.ts lineTextStyle/setLineTextStyle), undoable, live in preview and
      export. Whole-unit and per-layer motion both live in the Inspector's Animations tab.
      Follow-up (same day): the Style tab opens with CONTENT rows (field label via
      setFieldTitle + shown text via the inline-edit pattern), and an imported design
      declares no --type-scale, so the Style panel's global Text-size knob (keyed on the
      var's presence) no longer appears as a dead control there.
- [x] **Long values stay inside the design (fit)** - a placed line was uncapped and nowrap, so
      a long name ran off the artwork and off the frame. A line now has a SLOT (the wrapper's
      max-width) and a fit mode: shrink (one row, condensed to fit - the default for a new
      field, and what broadcast CG does with a name in a drawn slot), wrap, or free (the
      pre-fit behaviour, which is what every saved template reads as). Shrink rides a
      design-owned runtime outside the marked region (templates/shared/textFit.ts) that the
      shared update() calls through an optional hook, injected idempotently; it reduces
      font-size rather than distorting the user's typeface, floors at 55%, and re-measures on
      document.fonts.ready so it never fits against the fallback face. Inspector Style tab
      group + E2E for all three modes.

### State machines in the graphic model (2026-07-19 — Phase 1 of the template-library stage)

The stage this opens (types × themes catalog, node editor, generated control pages) is planned
in `docs/noacg-master-goals.md`; the model itself is contracted in `docs/STATE_MACHINE_SCHEMA.md`.

- [x] **The model exists in the code** - `NOACG_ANIM` format version 2 adds an optional
      `machine`: parallel state GROUPS, each a small graph of states (a state's content is a
      timeline) joined by transitions fired by operator events or timers, plus the DEFAULT PATH
      that `next` walks. One data block, in the marked ANIMATION region - no second scene model.
- [x] **The multi-step reveal feature was ABSORBED, not duplicated** - `steps` IS the default
      path (`defaultPath[i]`'s timeline is `steps[i]`, the positional binding), so every existing
      timeline surface keeps working and `settings.steps` stays derived, now through one rule
      (`animMachine.ts spxSteps`).
- [x] **Existing templates are untouched and behave identically** - a template with no `machine`
      key IS the implicit one-group linear machine, derived on read and never persisted; the
      version-1 interpreter statements are kept verbatim as the machine-less path. The whole
      catalog gained dispatch / snap / introspection without one template file changing.
- [x] **Format-version + migration mechanism** - a normalizing parse migrates version 1 on read,
      serialization always writes the current version, an unknown version degrades read-only.
      Promoted to a root non-negotiable, so every persisted format follows it.
- [x] **Snap-to-state works in preview** - `noacgSnap` composes a state's pose instantly with
      suppressed callbacks (recovery, emergency jumps, preview without playback); `snap(null)` is
      the visual half of reset, kept distinct from resetting data. Store `sendSnap`/`sendEvent`
      drive it; the simulator grows a minimal event strip for explicit-machine templates only.
- [x] **The five acceptance criteria pass** against hand-written definitions
      (`e2e/state-machine.spec.ts` + `e2e/_machines.ts`): the simplicity guard (a lower third is
      three states, drivable with `next` alone), the Millionaire test (selection is DATA on one
      state; after Lock, select is structurally illegal), the scorebug test (parallel groups,
      simultaneous events through one serial queue), the ticker test (timer auto-advance,
      pause/resume, and a settled preview that never advances), and the compatibility test
      (`update`/`play`/`next`/`stop` alone walk the default path). Zero export-target changes.

### Graphic types (2026-07-20 — Phase 2 of the template-library stage)

Contract: `docs/GRAPHIC_TYPES.md`. Types chosen by frequency across the 60 formats in
`live_format_graphics_needs.xlsx` (measured, not estimated).

- [x] **A type is first-class** - it declares structure, fields, state groups + default path,
      and control events, with no mention of colour, type or shape. That separation is what
      Phase 3 (types × themes), Phase 4 (one editor per type) and Phase 5 (control pages
      generated from the machine) all need.
- [x] **Types compile into variants, not around them** - `variant.create(options)` stays the
      one contract; `mergeCatalog` replaces by id, so a promoted design keeps its identity and
      its slot. Pinned by a spec asserting promotion changes nothing but the machine.
- [x] **Persist a machine only when the derived one is wrong** - 7 of the 12 types declare
      none and emit byte-identical output.
- [x] **Twelve types**: lower third (52/60), sponsor bug (37), countdown (30), topic card (29),
      title card (23), agenda (22), social handle (17), poll (13), holding screen (9), ticker
      (8), scoreboard (5), quiz board. Title card replaced the quote card (6/60) on the doc's
      own frequency criterion; the social bug and the ticker rotator are new designs.
- [x] **The acceptance criteria are met by SHIPPED types**, not only fixtures: the quiz board
      for the Millionaire arc (one Selected state + a data field; lock removes the arrow rather
      than refusing the event), the scoreboard for parallel groups and simultaneous events, the
      ticker for timer auto-advance with pause/resume, every type for SPX compatibility.
- [x] **Phase 1's debt paid**: the step editor works under a machine (steps and waypoints move
      together; a waypoint an authored branch points at is demoted, not orphaned), plus four
      real bugs - two silently-dead affordances, a rename that drifted from state ids, OGraf's
      step pointer desyncing, and an off-shape machine that only warned and shipped.
- [x] **A trap encoded as a rule**: a timer never arms on a timeline that never ends, so a
      timer state carrying endless loops or measured motion is now a validation error. This is
      why the ticker type is a rotator with its own finishing entrance preset.

### The template factory — types × themes (2026-07-21 — Phase 3 of the template-library stage)

Contract: `docs/GRAPHIC_TYPES.md`. The catalog is types × style families, and the second axis is
now full: every one of the 12 types ships in all four families (noacg / glass / sport / minimal).

- [x] **The 48-cell matrix is complete** - 12 types × 4 style families, every cell filled. The
      naive "24 promotable" estimate from the first pass fully collapsed: after promoting the one
      design that survived all six gates (lt05 into the sport lower third), the promotion well was
      dry, so the remaining cells are DESIGNED variants, each named against its lower-third sibling
      and reusing its family's shape tokens (DESIGN_LANGUAGE §8). 30 new designs across every
      category, from corner bugs to the flagship quiz board.
- [x] **The capabilities gate became mechanical, and caught a shipped defect** - promotion took
      its type's `animationPresets`, `defaultZone`, palette and font wholesale, so six promoted
      designs had drifted their DEFAULT entrance and four had lost presets outright (the house bug
      opened on a plain fade, the stats card lost its signature stinger, a minimal scoreboard
      defaulted to a sport slam). Invisible to every check because `create({})` resolves the preset
      from the design's own record - a baseline taken from OUTPUT cannot see a gate that only
      changes INPUT. `TypeDesign.animationPresets` / `defaultZone` are the escape hatch (mirroring
      `samples`), and `graphic-types.spec.ts` now enforces it: a type may WIDEN what a design
      offers but never change its default or take something away.
- [x] **"Persist a machine only when the derived one is wrong" held across the fill** - the new
      lower thirds, cards, bugs and boards emit no machine key; only the countdowns, holding
      screen, scoreboards, tickers and quiz boards carry one, and each drives the parallel or
      branch machine its type already declared with zero new machine code.
- [x] **Shared content runtimes, not copy-paste** - the schedule-row and poll-bar rebuilds were
      identical across every board of a type, so they moved into `infographics/dataRuntimes.ts`;
      ig06 and ig02 now call the shared helpers and emit byte-for-byte what they did before (the
      baseline did not move), and the six new boards reuse them.
- [x] **Every fill is verified** - `npm run build`, the type conformance suite, the machine
      tests (countdown clock, scorebug, ticker cycle, Millionaire arc), the `l3-sweep` for swept
      categories, a render probe for the rest, and both catalog baselines recorded as pure
      additions. A documented non-promotion (the sport agenda's standings-vs-schedule ambiguity)
      stays recorded where the next reader looks.
- [x] **The batch loop is a run-anytime gate** - `node scripts/factory.mjs` (dev server up)
      derives the matrix from the live registry, runs every design through the six gates,
      validates the pack config, and greps every variant's emitted CSS for literal forms of
      family-valued tokens (the conformance metric's blind spot); any failure exits non-zero,
      so it sits in CI beside `npm run build`.
- [x] **The gates run without a human** - the commit-driven gates (build + offline E2E + the
      factory gates) joined `.github/workflows/ci.yml` on every push and PR, and the
      time-driven check (dependency audit + staleness) runs weekly
      (`.github/workflows/weekly-audit.yml`, Monday cron, rolling failure issue). Job A of
      docs/NIGHTLY_AUTOMATION_PLAN.md, split by what actually drifts; the AI generation
      pipeline (jobs B/C) stays a plan behind its own decisions.
- [x] **Every reference format has its pack** - the 60 live-program formats map onto 12 packs
      (`docs/PACK_TAXONOMY.md`; config in `src/templates/packs.ts`). A pack is PURE CONFIG over
      the filled matrix - one entry, no new template work - which is the "catalog growth is a
      config change" claim made true for the axis it is true on; a new THEME is deliberately
      not config (twelve designs + a token row), and the doc records what one costs.

### The node editor (2026-07-21 — Phase 4 of the template-library stage)

The visual state-machine editor beneath the canvas (`src/components/MachineGraph.tsx`): one
generic graph surface for every graphic — what differs between templates is the graph inside
it, never the editor. Optimized for inspect-and-tweak first, authoring-from-blank second.

- [x] **The graph surface toggles with the step timeline** (Rive-style, in the bottom dock):
      states as boxes badged with the timeline's cue vocabulary (▶ » ■ · ○ rest), the default
      path as the amber spine (the walk `play`/`next`/`stop` really follow, with the edge into
      the final waypoint honestly dashed as stop's when no next arrow is authored), authored
      branches as labelled arrows, parallel groups as lanes, and the preview's LIVE state
      highlighted. Clicking a state snaps the preview there — parked, no timers.
- [x] **A machine-less template shows its DERIVED machine**, labelled "derived from the
      steps", and the first graph edit MATERIALIZES exactly that machine into the literal
      inside the same undoable apply — so the editor is never empty, never lies, and never
      forks a second model.
- [x] **Inspect-and-tweak cards** — a state's card renames it (a path state through
      `renameStep`, so the bound step label can never fork) and opens its timeline parked at
      its step; a transition's card switches trigger, renames its event, sets a timer delay —
      every commit one undoable apply through the shape gate, so an illegal edit (reserved or
      duplicate event, non-positive delay) reverts in place.
- [x] **Structural editing** — drag from a state's port to draw a real operator arrow
      (selected for immediate renaming); delete an arrow from its card, refused only when it
      is the sole edge behind a default-path step (the walk must stay connected — judged by
      the validator, so deleting one of two parallel arrows stays legal); add and delete
      branch states and parallel groups; drag boxes to positions persisted as the additive
      `at` field (no format bump). Waypoints stay the TIMELINE's to add and delete — the
      positional binding means the state and its clip are one thing.
- [x] **Transition styles are consumed, not reserved** — an arrow may carry `fade`,
      `push-left/right/up/down` or `wipe-left/right` with duration and ease, played by the
      interpreter INSTEAD of the target state's entry timeline: two phases on the root around
      an instant pose swap composed by the SNAP recipe, so a styled entry and a snap agree on
      every pose (including pose-only branch states, whose look lives on the route). The
      frozen-interpreter pairing rule extends to styles: `writeAnimData` re-emits the region
      under a pre-styles interpreter, and validation blocks a hand-spliced mismatch at export.
- [x] **Break fearlessly** — the topbar ↺ Reset (the create-time `baseline` snapshot,
      persisted with the project) restores the shipped template after any machine surgery,
      undoably; pinned by the acceptance spec.
- [x] **The acceptance walk passes as a spec** (`e2e/machine-graph.spec.ts`, 9 tests): open a
      shipped template, see its graph, restyle a transition, draw and delete arrows, add
      states and groups, break something, restore the shipped state — plus the styled-change
      pose landing and the pairing rule, driven end-to-end.

### Control layer & profiles (2026-07-21 — Phase 5 of the template-library stage)

Contract: `docs/CONTROL_LAYER.md`. Control pages GENERATED from the state machine — every
operator transition a button, every field an input, from one generator; the existing basic
control-page export absorbed, not duplicated.

- [x] **Event buttons from the machine** — the additive `machine.controls` metadata (declared
      on graphic types as TypeControlEvent, logical payload keys resolved to field ids at
      attach) travels INSIDE the template; `machineControls` is the one merge all four
      surfaces render (Control tab, controlpanel.html, the hosted page, the simulator strip).
      Legality = the structural guard mirrored as greying. `ControlMessage` grew event/snap
      cues, forwarded by all three receivers to `noacgDispatch`/`noacgSnap`.
- [x] **Shows** — the rundown unit (`model/shows.ts`, packet conventions, sync kind 'show'):
      ordered graphics, one aggregated `show_controlpanel.html` per export, each card on its
      own channel driving its graphic independently. A single graphic is a show of one.
- [x] **Prepared vs published** — with Live off, edits are STAGED (badge) and air only on an
      explicit ⟳ Take or riding an event's payload; nothing airs merely because it was typed.
- [x] **The event log + recovery** — the standalone panel logs every command per channel
      (capped history + merged latest data + last reported state); a rebooted graphic
      announces itself and is rebuilt (data half, then snap — reset is two operations,
      recovery is both), a reloaded panel resumes from the log. Pinned end-to-end in
      `e2e/control.spec.ts`.
- [x] **Hosted control over a durable command log** (migration 0008) — the INSERT is the
      send: control_events (DB-ordered, Realtime-delivered, tail-fillable), control_shows
      (capability slug, panel spec, SHARED staging, each graphic's own live report).
      Operating needs no account (SECURITY DEFINER RPCs; the slug is the capability); the
      hosted receiver block rebuilds a rebooted graphic from its own last report. The
      ?control=<slug> page is multi-operator by construction. Live paths await verification
      against a real project (checklist in docs/CONTROL_LAYER.md).
- [x] **Profiles** — the homebase is the one place: graphics across packets, video projects,
      shows with hosted-page links, community submissions; sync kinds grew 'show' and
      'video' (video tombstones strip payloads to readable stubs).

### Quality bar (always-on)
- [x] `npm run build` green as the CI gate
- [x] Playwright E2E for core UI flows
- [x] Every new user-facing flow ships with a Playwright spec (wizard suite: 9 specs; package
      suite: 6 specs — custom colors, font import + export, brand match, one create+play spec
      per new category, ticker loop sanity; wave-2 suite: 6 specs — clock ticks, score update,
      corner bug, count-up, quiz reveal)
- [x] Lower thirds ship with a harness sweep (`scripts/l3-sweep.mjs <shots-dir> <category>`:
      validate + runtime × preset × easing + auto-fit/track checks + taste screenshots);
      category-aware — run for every category (`lower-third`, `info-card`, `end-credits`,
      `ticker`)
