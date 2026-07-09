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
read-only scheduled cloud agent. Not yet built — see the plan doc for the verified guardrails
(migration `0006`) and open decisions.

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
- [ ] Data-driven/live content architecture (ticker/scoreboard controlled from a backend) — later

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
