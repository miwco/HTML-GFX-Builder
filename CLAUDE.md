# CLAUDE.md

Guidance for AI agents working in this repo. Keep it accurate - update it when architecture or
conventions change. This root file holds the product identity, the non-negotiables, and the
working practices; **deep per-area contracts live in nested CLAUDE.md files** in `src/model`,
`src/templates`, `src/store`, `src/blocks`, `src/export`, `src/render`, `src/landing`, and
`src/components` - they load automatically when you work on files there, and you should read
the relevant one before editing that area from outside it.

## What this is

**NoaCG Studio** - an **AI-assisted, multi-platform** browser tool for creating modern, premium
HTML broadcast graphics and exporting them to **many broadcast/streaming environments**
("anything-goes export": SPX Graphics, CasparCG, OGraf, OBS/vMix overlays today; more over
time). It's for organizations, TV channels, streamers, and universities, technical and
non-technical users alike (it's also used in teaching, but the product is a production tool, not
a code tutorial). Brand: dark control-room aesthetic, one amber "on-air" accent, restrained glow
- full system in `NoaCG-Brand-Kit/BRAND-MANUAL.md`. **Business posture: free forever for the
core; the only paid surface is hosted AI without a BYO key; the current goal is users/adoption,
not revenue** (see `docs/GOALS.md`). The aim is to be **the best and most useful place to create
broadcast graphics, and run them anywhere**.

Binding project docs (read before generating or judging templates): **`docs/DESIGN_LANGUAGE.md`**
(taste + motion + code-style rules) and **`docs/GOALS.md`** (north star + milestone checklist -
keep it checked off as work lands).

**The pillars (keep every change true to these):**
- **Best & easiest to create** - the north star is premium output with the least friction; a
  non-technical user can make a great graphic without ever touching code.
- **AI-assisted** - AI and blocks help write the template; a pro stays in full control of the code.
- **Export anywhere, SPX-canonical** - SPX is the canonical *internal* template format and the
  strictest validation target; every other target is an export adapter off the same source, so
  breadth is added without reworking the core. SPX compatibility stays rock-solid, but the
  product is not "an SPX generator."
- **Code is real & always available, view optional** - every visual/AI action writes real
  HTML/CSS/JS you can open and edit; **nothing hides behind a visual-only scene model**. But the
  code *view* is optional: no-code users keep it hidden, pros work in it directly.
- **Clean, editable code** - generated code is clean and commented so a professional can read and
  extend it.
- **Reliable export** - an SPX package must always be valid and plug-and-play (see the
  validation gate); the other targets hold the same bar.

## Commands

```bash
npm install
npm run dev      # Vite dev server (landing at /, THE EDITOR AT /app)
npm run build    # tsc && eslint && vite build -> dist/   <-- run this after changes; it's the CI gate
npm run lint     # eslint . --max-warnings 0 (also part of build; config in eslint.config.js)
npm run preview  # serve the production build
```

**The dev port is per-checkout** (`scripts/dev-port.mjs`): 5174 in the main checkout (5175 for
the live e2e suite), a stable path-derived port in a linked git worktree - so parallel worktrees
never fight over one server. Vite (strictPort), both Playwright configs, and the dev scripts all
derive the same number; `node scripts/dev-port.mjs` prints it. `.claude/launch.json` is
GENERATED with that port by postinstall (gitignored - never hand-edit or commit it).
`DEV_PORT=n` overrides everything if two worktrees ever hash to the same port.

**Two pages (Vite MPA):** `index.html` is the static public landing at `/` (no React; carries a
redirect shim so old root `?chat=`/`?template=` share links land on `/app` with their query).
`app.html` is the editor at `/app` - dev/preview get the clean URL from the `app-clean-url`
plugin in vite.config.ts; production gets it from Vercel `cleanUrls` (vercel.json). E2E specs
navigate to `/app`.

There is **no unit-test suite**. Verify changes with `npm run build` plus in-browser checks (see
Verifying, below). Never mark work done on a green build alone if behaviour is observable - check it.

## Non-negotiable principles (these override default behaviour)

1. **Code is the single source of truth.** `SpxTemplate` (html/css/js + parsed definition) is
   canonical. Visual/AI/block actions must emit *deterministic, readable code patches*, never a
   hidden scene model. The editor always reflects exactly what was written.
2. **Generated code must be clean, commented, and easy to edit.** Prefer simple, obvious code over
   clever code - a professional should be able to read and extend it. Rich-but-commented CSS is the
   house style.
3. **Offline-first, no unnecessary dependencies.** GSAP is bundled locally
   (`src/assets/gsap.min.js`); so is the Lottie player (`src/assets/lottie.min.js`,
   lottie_light/MIT — injected into previews and exports ONLY when the template uses a
   Lottie asset; detector in `src/assets/lottieSupport.ts`). Don't add runtime deps or
   external/CDN references in generated templates. The exported package must be
   plug-and-play (relative paths, bundled libraries).
4. **Validate before export.** `validation/validateTemplate.ts` is the gate; export is blocked on
   errors. Keep it authoritative - the platform owns SPX compatibility, not the AI.
5. **Building blocks and AI are deterministic transforms** `(template) => template` that insert
   clean code. No fragile free-form generation in the stub path.

## SPX template format (the contract)

Full reference: **`docs/SPX_TEMPLATE_FORMAT.md`** (derived from the real examples in
`example_projects/`). Essentials:

- A global `window.SPXGCTemplateDefinition = { ...settings, DataFields: [...] }` describes the
  operator's fields. Fields are `f0`, `f1`, … with an `ftype` (textfield, number, dropdown, …).
- SPX calls global `play()`, `stop()`, `update(data)` (a **JSON string**), and `next(data)`.
- **Field -> DOM convention (this project): each field `fN` maps to one element `id="fN"`.**
  `update()` writes the value straight into it via `getElementById`. **No hidden `.spx-data`
  holders, no `_gfx` display split** - that older "premium pack" style is documented but not what
  we generate. An input-only value (e.g. a countdown duration) may live in a hidden `<div id="fN"
  style="display:none">`.

## Architecture map

Directories marked * have their own CLAUDE.md with the binding per-area contracts.

```
src/
  model/ *     data layer: SpxTemplate types, SPX definition parse/serialize, wizard catalog
               data, fonts, brand, packets, easings, autosaved project, template import,
               layout + prefs, structure.ts - the TemplatePart registry, THE shared
               element-identity contract (timeline, canvas selection, and step assignment all
               name elements through it) - and fieldModel.ts, THE shared editable-field
               contract: an SPX DataField and a video input both become one FieldDescriptor,
               so every surface that edits a field renders the same control
  templates/ * the wizard catalog: shared assemblers (base/standard/clock) + 10 categories
               (lower thirds, info cards, end credits, tickers, starting soon, game timers,
               scoreboards, corner bug, infographics, quiz); also the :root style contract,
               the DOM-ready runtime rule, the field/image policy, and the easing doctrine
  store/ *     templateStore.ts (zustand) - applyTemplate/undo choke point + editor UI state
  preview/     composeDocument.ts - inlines CSS + GSAP + JS + assets into the iframe srcdoc
               (plus a preview-only images/ -> data-URL shim, see src/templates/CLAUDE.md)
  blocks/ *    deterministic template transforms: the block registry (the offline AI stub's
               vocabulary), field editing, the Timeline v2 animation-data engine (animData
               schema/serializer, animEdit mutators, animEval resolver, animImport legacy
               converter, presetApply generators, presetRegistry = the preset library),
               stepAssign (appears-on-press), and timelineModel - the READER for legacy regions
               (Phase 8 deleted the patchers; nothing writes a legacy region any more)
  ai/          provider.ts (AIProvider + GenerateContext), claudeProvider.ts (the real provider:
               system prompt = SPX + house contracts + lt01's generated code as the canonical
               example; forced emit_template tool; validate + one repair round), anthropic.ts
               (direct browser call with the user's key OR the VITE_AI_PROXY_URL gateway),
               settings.ts (localStorage + .env: key, model), index.ts (getAiProvider - Claude
               when configured, stub otherwise), stubProvider.ts, presets.ts
  ai/video/    the VIDEO motion-design harness ("Video or animation with AI"): staged
               generation - keyword-first skill detection (skills.ts; one cheap Haiku
               call only when nothing matches) -> Motion Director (forced emit_motion_plan
               tool, a timed plan) -> Remotion coder (forced emit_remotion_module tool
               against prompts.ts: the composition contract + motion principles + a
               canonical example module that itself passes the pipeline) -> bounded
               repair (2 rounds, exact validator errors with frame numbers fed back).
               stubVideoProvider serves offline; refinements send recent chat + the
               current module and ask for minimal change
  video/       the composition pipeline for the video project kind: compile.ts (sucrase
               TSX->CJS + static contract checks: imports limited to react/remotion,
               deterministic frame-derived animation, no network/DOM), validate.ts
               (compile -> static -> live player probe of frames 0/mid/last),
               playerBridge.ts (the postMessage client for the sandboxed player host;
               SERIALIZED load/probe, disposed bridges resolve immediately),
               bridgeRegistry.ts, types.ts (asset logical names - the `assets` prop
               contract)
  validation/  validateTemplate.ts - runs before export and on AI output
  control/     the modular control-panel engine: controlModel.ts (fields -> shared FieldDescriptors
               by ftype, ONE generator, no per-template code; controlChannelName +
               ControlMessage protocol), controlPanelHtml.ts (the standalone controlpanel.html:
               the SAME descriptors rendered in dependency-free vanilla JS), receiverScript.ts
               (BroadcastChannel listener injected into exported index.html), liveData.ts
               (editable published-CSV -> update() polling block appended to template.js)
  export/ *    the export registry - 6 targets (SPX starter, HTML overlay for OBS/vMix, H2R,
               CasparCG, OGraf, LiveOS) + whole-packet export + packaging conventions
  render/ *    video/image rendering contracts: the versioned RenderManifest, the
               duration/HOLD schedule model, tier limits (ALL configurable numbers live
               there), the virtual-clock runtime (__noacgRender - every frame a pure
               function of the manifest), the render-document composer, and the UI-side
               client + job store. The service is api/render/*; the renderer is
               render-worker/. Feature-gated by VITE_RENDER_API; architecture + ops in
               docs/RENDER.md
  landing/ *   the landing page's GSAP motion system. POLICY: the landing never fakes product
               UI - on-air output and real screenshots only; roadmap features are tagged
               planned/coming, never shown as shipped
  teach/       knowledge.ts + explain.ts + cssReference.ts - surfaced as Monaco HOVER tooltips
               in the editor (registered in CodeEditor.tsx; an aid, not the point - there is no
               Learn tab)
  assets/      gsap.min.js (bundled) + assetUtils.ts (data-URL assets)
  backend/     the OPTIONAL Supabase backend: config.ts isBackendConfigured is the ONE
               feature-detection point (unset env = pure offline mode); supabase.ts (lazy
               client), auth.ts (Google OAuth + email/password + subscribeAuth),
               storage/supabaseProvider/sync/syncController (LWW cloud sync of
               packets/looks/brand for signed-in users), assets.ts (Storage bucket)
  community/   shared templates: communityData.ts (RPCs, signed-in only), gate.ts (validate +
               bench at publish AND import), useIsModerator.ts
  showchat/    audience send-in: SendIn page (?chat=<slug>), ModerationPanel, chatGraphicBlock
               (polling graphic block), chatData.ts
  components/ * the React app: AppShell (code | preview+Inspector row over full-width
               panels; a new selection auto-opens the Inspector), CodeEditor (Monaco),
               canvas direct manipulation + selection + position keyframing, PlayoutSimulator, the timeline dock
               (StepTimeline for data-block templates - i.e. everything the wizard makes;
               LegacyTimeline, read-only, for a saved region the importer refuses),
               Inspector (properties + keyframes + Animations), the five-tab SidePanel
               (Data / Control / Style / AI / Export - Motion lives on the timeline), wizard/,
               auth/, and video/ - the PARALLEL editor shell for the AI video project
               kind (VideoAppShell: TSX Monaco + the sandboxed Remotion Player preview +
               Chat/Settings/Assets/Export; App.tsx switches shells on docKindStore)
public/fonts/  the 7 bundled woff2 fonts (served at /fonts, copied into exports;
               jetbrains-mono.woff2 doubles as the app UI's mono face)
scripts/       dev-port.mjs (per-checkout port), l3-sweep.mjs (catalog sweep - see Verifying),
               renderDevPlugin.mjs (mounts api/render on the dev server), render-smoke.mjs +
               render-smoke-video.mjs (the video project's Content -> render round trip,
               checked in pixels) + make-render-manifest.mjs (render verification - see
               docs/RENDER.md),
               hooks/ (Claude Code guard hooks wired in .claude/settings.json: commit-message
               style, protected generated files, per-file lint on edit, dev-server policy,
               e2e port preflight, session-start worktree sanity check + port orientation)
docs/          GOALS.md (north star + milestones), DESIGN_LANGUAGE.md (taste rulebook),
               SPX_TEMPLATE_FORMAT.md (SPX contract), RENDER.md (video/image rendering)
api/           the render service's Vercel functions (start/status/cancel/complete/cleanup +
               the local-output file route) with the JobStore + RenderExecutor seams in
               api/_lib; typechecked by tsconfig.api.json inside the build gate
render-worker/ the Remotion renderer - its own exact-pinned package so the dependency (and
               its non-OSI license) never enters the AGPL app bundle
player-host/   the Remotion Player host for the video editor's live preview - its own
               exact-pinned package (same isolation posture as render-worker), built by
               scripts/build-player-host.mjs into public/player-host/ as ONE
               self-contained HTML page (inlined JS - module script fetches are
               CORS-blocked from the sandbox's opaque origin). Loaded in an iframe with
               sandbox="allow-scripts" ONLY (never add allow-same-origin: the opaque
               origin keeps AI/user composition code away from localStorage and the
               session); the app talks to it purely via postMessage with a per-session
               nonce (protocol spec: player-host/src/protocol.ts, mirrored by
               src/video/playerBridge.ts)
```

### Auth posture (the open editor)

**There is no login wall, ever.** The editor - create, preview, export, local packets - is open
to everyone, hosted or self-hosted. Only *account features* gate themselves: cloud sync,
community, show chat, and AI (hosted mode). Offline builds (no Supabase env) must grow **zero**
auth UI (E2E-pinned in `e2e/auth.spec.ts`). Don't reintroduce an app-wide gate. The
`needsSignIn`/`SignInPrompt` gating pattern and the open-signup migration note live in
src/components/CLAUDE.md.

### The choose-first creation flow (primary UX)

New projects go through the **CreationWizard** (Entry -> Category -> Template -> Fields -> Style
-> Animation, persistent live preview); `variant.create(options)` generates the complete,
commented template. A fifth entry card, **"Video or animation with AI"**, creates the parallel
VIDEO project kind instead (React/Remotion, fixed duration - see src/ai/video, src/video, and
components/video in the map above); creating/opening a video flips the persisted doc-kind
switch and every SPX create path flips it back. After creation, code is the source of truth and two **live panels** keep
working via deterministic patches: the **Style panel** writes the `:root` style contract
(src/templates/CLAUDE.md) and **the step timeline under the preview** touches ONLY the marked
ANIMATION region (src/blocks/CLAUDE.md) - user code outside the markers is never modified. The
timeline dock picks its surface from the CODE, never from the category, which is what keeps a
template saved before the migration working. The wizard applies
with `resetSampleData: true` so a new project starts from its own field defaults
(src/store/CLAUDE.md).

## Verifying changes

Always `npm run build` (typecheck + lint + build) after changes. The tree stays lint-clean:
fix findings properly rather than sprinkling eslint-disable comments.

- **UI flows -> use Playwright.** Verify user-facing flows with the E2E suite in `e2e/` (specs
  drive the real dev server). Run `npm run test:e2e`. Add a spec for any new user-facing flow
  (gallery, blocks, undo, guides, branding, export, …).
- **Logic checks without UI (fast path):** Vite serves source modules, so in a browser context you
  can `await import('/src/blocks/registry.ts?t=' + Date.now())`, apply blocks to
  `createBlankTemplate(...)`, run `validateTemplate`, and load `composeDocument(tpl)` into a hidden
  iframe to call `update()/play()/stop()`. Good for blocks, templates, validation, and export logic.
- **Store/state checks:** `import('/src/store/templateStore.ts')` then `useTemplateStore.getState()`.
- **Template catalog sweep:** `node scripts/l3-sweep.mjs <shots-dir> <category>` (dev server must
  be running; category = `lower-third` | `info-card` | `end-credits` | `ticker`) - validates every
  variant × preset × easing (runtime, steps, auto-fit, credits/ticker track checks) and captures
  settled-state taste screenshots. Run it for the affected category after template changes.

**Gotchas:**
- After many edits the Vite dev server can serve a **stale module** (HMR lag) - restart it if a
  change isn't reflected.
- The app declares `color-scheme: dark` (styles.css `:root`) and composeDocument injects the
  matching `<meta name="color-scheme" content="dark">` into the preview srcdoc. **Keep them
  paired** - Chromium paints an iframe opaque (white stage) when embedder and iframe schemes
  disagree. Exported packages get neither.
- The e2e suite pins **offline mode** via `webServer.env` in playwright.config.ts, but
  `reuseExistingServer: true` means a dev server already running on THIS checkout's port
  (started by hand, with the real `.env`) gets reused - backend-sensitive specs then fail
  confusingly. Kill any manual server on this checkout's port (`node scripts/dev-port.mjs`
  prints it) before `npm run test:e2e`. Other worktrees' servers are harmless - they live on
  their own ports.
- Worse: after HMR updates, `import('/src/store/…')` in an eval/console context can resolve a
  **different module instance** than the running app (a "ghost store" - your clicks patch the real
  store while your assertions read the stale one). If state reads disagree with visible UI,
  **restart the dev server and reload** before trusting any eval-based assertion.
- Monaco isn't fully interactive in a headless preview and GSAP animations don't visibly tick (rAF);
  assert on DOM/state, not screenshots, for those.
- In Playwright specs, **never clear localStorage via `addInitScript`** - the script also runs in
  the same-origin srcdoc preview iframe, so every preview rebuild wipes the key (this silently
  deleted the project brand). Fresh browser contexts already isolate storage per test.
- The preview rebuilds on a ~350 ms debounce after `applyTemplate` - Playwright specs must wait for
  it (or for an element unique to the new document) before clicking Play or asserting inside the
  iframe, or they hit the previous document.

## Git

- Most work happens on a **feature branch**, usually in a git worktree - several are typically active
  at once. If a session starts on `main` with work to do, branch first.
- The working rhythm in this repo: **commit each completed, verified phase/step** to the FEATURE
  BRANCH with a descriptive message. **Never add a `Co-Authored-By` trailer or any agent co-author**
  (the user's global rule).
- **`main` is only ever touched when the user asks for it, in that message - from ANY checkout.**
  Nothing lands on your own initiative: no commit made while sitting on `main`, no `git merge` into
  main, no `git push origin main`, no `safe-merge`. Being in the primary checkout on `main` is not
  permission to land - the user decides when work lands, and decides it *after* they know the change
  is safe. Commit verified work to the feature branch, report what you did and what you verified, and
  STOP. (This supersedes the older "push to main without asking" note - that was about not re-asking
  before a push, not license to initiate a landing.)
- **Commit messages:** write clear, human-readable messages that explain the actual change - they
  must be understandable to any outside developer reading the history cold. No chat/session
  language, internal planning names, or AI-sounding phrases ("as requested", "starting era 5",
  "continued work", "made changes", "AI update", "per your instructions"). Never mention Claude,
  Codex, ChatGPT, agents, prompts, or the conversation unless the commit is specifically about AI
  tooling.
- Don't commit `dist/` changes as part of feature work.
