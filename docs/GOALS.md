# Goals

The committed north star for this project. Check milestones off as they land; add new ones at the
bottom rather than rewriting history.

## North star

> **Build a broadcast-quality graphic in under 2 minutes by choosing — then learn from the code it
> wrote.**

The user does not want to write code; they want to **learn** code. So the app writes it for them:
they choose a template, fields, style, and animation, and the result is simple, commented,
well-named HTML/CSS/JS they can read, understand, and edit. The code is always visible, always the
source of truth, and always exports to a working SPX package.

### What "done right" feels like
- **Fast:** new project → on-air-worthy lower third in under 2 minutes, no code required.
- **Tasteful:** every template looks like a paid MotionArray/Envato asset, not a tutorial demo.
- **Consistent:** graphics made in the same project form a coherent **broadcast package** — the
  same style family, palette, and typography across every category, usable in a real program.
- **Yours:** custom brand colors (hex/picker) and imported fonts are first-class — fonts are
  embedded in the template and its export, never external.
- **Smooth:** animations run at 60 fps, transform/opacity-based, with professional easing.
- **Teachable:** open any generated file and every line explains itself — clear names, short
  comments, no cleverness.
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
      incl. custom, font incl. imported); the wizard preselects it ("Match current project", on
      by default) so the next graphic automatically belongs to the same package
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
- [ ] **5.5 User-shared templates** (user idea 2026-07-05): a community section where logged-in
      users publish templates/packets others browse and use — moderation gate = validator + bench
      checks (automated) + human review
- [ ] **5.6 Payments/subscriptions LAST** (long beta first; separate private repo, Stripe, metered
      generations)

### Era 6 — WYSIWYG editor
Drag/move/scale writes the SAME deterministic patches the panels write today (zone +
nudge + --scale foundations already exist) — code stays the source of truth. Timeline UI
for in/out timings + step triggers maps onto the marked ANIMATION region + animSpeed/
duration knobs. Big; planned last deliberately.

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
