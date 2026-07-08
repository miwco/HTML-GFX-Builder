# CLAUDE.md

Guidance for AI agents working in this repo. Keep it accurate — update it when architecture or
conventions change.

## What this is

**NoaCG Studio** — an **AI-assisted, multi-platform** browser tool for creating modern, premium HTML
broadcast graphics and exporting them to **many broadcast/streaming environments** (SPX Graphics,
CasparCG, OGraf today; **OBS, vMix and more over time** — "anything-goes export"). SPX remains the
**canonical internal template format** and the strictest validation target; other targets are export
adapters derived from that same source. (Brand: dark control-room aesthetic, one amber "on-air" accent,
restrained glow; full system in `NoaCG-Brand-Kit/BRAND-MANUAL.md`.) The aim is to be **the best and
most useful place to create broadcast graphics, and run them anywhere** — for organizations, TV
channels, streamers, and universities, technical and non-technical users alike (it's also used in
teaching, but the product is a production tool, not a code tutorial). **Business posture: free forever
for the core; the only paid surface is hosted AI without a BYO key; the current goal is users/adoption,
not revenue** (see `docs/GOALS.md` operating principles). The creation wizard builds a graphic from
choices (template → fields → style → animation): a **non-technical user never has to open the code**,
while a **professional** can drop into the always-available editor and take full control. Code stays
the single source of truth — the live panels patch it deterministically and nothing hides behind
visual-only tools — but its *view* is optional (the code editor can be hidden).

Binding project docs (read before generating or judging templates): **`docs/DESIGN_LANGUAGE.md`**
(taste + motion + code-style rules) and **`docs/GOALS.md`** (north star + milestone checklist —
keep it checked off as work lands).

**The pillars (keep every change true to these):**
- **Best & easiest to create** — the north star is premium output with the least friction; a
  non-technical user can make a great graphic without ever touching code.
- **AI-assisted** — AI and blocks help write the template; a pro stays in full control of the code.
- **Export anywhere, SPX-canonical** — the ambition is a platform that runs graphics in many
  environments (SPX, OBS, vMix, CasparCG, OGraf, and more). SPX is the canonical *internal* template
  format and the strictest validation target; every other target is an export adapter off the same
  source, so breadth is added without reworking the core. SPX compatibility stays rock-solid, but the
  product is not "an SPX generator."
- **Code is real & always available, view optional** — every visual/AI action writes real HTML/CSS/JS
  you can open and edit; **nothing hides behind a visual-only scene model**. But the code *view* is
  optional: no-code users keep it hidden, pros work in it directly.
- **Clean, editable code** — generated code is clean and commented so a professional can read and extend it.
- **Reliable export** — an SPX package must always be valid and plug-and-play (see the validation gate).

## Commands

```bash
npm install
npm run dev      # Vite dev server on http://localhost:5174 (landing at /, THE EDITOR AT /app)
npm run build    # tsc (typecheck) && vite build -> dist/   <-- run this after changes; it's the CI gate
npm run preview  # serve the production build
```

**Two pages (Vite MPA):** `index.html` is the static public landing at `/` (no React; carries a
redirect shim so old root `?chat=`/`?template=` share links land on `/app` with their query).
`app.html` is the editor at `/app` — dev/preview get the clean URL from the `app-clean-url`
plugin in vite.config.ts; production gets it from Vercel `cleanUrls` (vercel.json). E2E specs
navigate to `/app`.

There is **no unit-test suite**. Verify changes with `npm run build` plus in-browser checks (see
Verifying, below). Never mark work done on a green build alone if behaviour is observable — check it.

## Non-negotiable principles (these override default behaviour)

1. **Code is the single source of truth.** `SpxTemplate` (html/css/js + parsed definition) is
   canonical. Visual/AI/block actions must emit *deterministic, readable code patches*, never a
   hidden scene model. The editor always reflects exactly what was written.
2. **Generated code must be clean, commented, and easy to edit.** Prefer simple, obvious code over
   clever code — a professional should be able to read and extend it. Rich-but-commented CSS is the
   house style.
3. **Offline-first, no unnecessary dependencies.** GSAP is bundled locally
   (`src/assets/gsap.min.js`). Don't add runtime deps or external/CDN references in generated
   templates. The exported package must be plug-and-play (relative paths, bundled GSAP).
4. **Validate before export.** `validation/validateTemplate.ts` is the gate; export is blocked on
   errors. Keep it authoritative — the platform owns SPX compatibility, not the AI.
5. **Building blocks and AI are deterministic transforms** `(template) => template` that insert
   clean code. No fragile free-form generation in the stub path.

## SPX template format (the contract)

Full reference: **`docs/SPX_TEMPLATE_FORMAT.md`** (derived from the real examples in
`example_projects/`). Essentials:

- A global `window.SPXGCTemplateDefinition = { ...settings, DataFields: [...] }` describes the
  operator's fields. Fields are `f0`, `f1`, … with an `ftype` (textfield, number, dropdown, …).
- SPX calls global `play()`, `stop()`, `update(data)` (a **JSON string**), and `next(data)`.
- **Field → DOM convention (this project): each field `fN` maps to one element `id="fN"`.**
  `update()` writes the value straight into it via `getElementById`. **No hidden `.spx-data`
  holders, no `_gfx` display split** — that older "premium pack" style is documented but not what we
  generate. An input-only value (e.g. a countdown duration) may live in a hidden `<div id="fN"
  style="display:none">`.

## Architecture

```
src/
  model/        types.ts (SpxTemplate, Resolution, ASPECTS…), spxDefinition (parse/serialize),
                wizard.ts (categories, variants, WizardOptions, palettes), fonts.ts (bundled OFL
                fonts registry + CustomFont import helpers), brand.ts (ProjectBrand save/load,
                localStorage 'spx-gfx-brand'), packets.ts (packet manager data layer: graphics
                collections 'spx-gfx-packets' + brand looks 'spx-gfx-looks' +
                captureLookFromTemplate/applyLookToTemplate), easings.ts, defaultTemplate
  templates/    blank.ts + the wizard catalog, resolved through catalog.ts (CATALOG,
                variantsFor/variantById):
                  shared/       base.ts (generic assembler pieces: :root vars, zones, auto-fit,
                                runtime scaffold) + standard.ts (CategorySpec, assembleStandard,
                                makeDefineVariant) + clock.ts (countdown engine: hidden minutes
                                field → M:SS + {prefix}-done at zero; DOM-ready-safe) — every
                                category builds on these
                  lowerThirds/  lt01…lt13 on shared.ts (prefix 'l3') + animPresets.ts (6
                                marked-region GSAP presets, prefix-parameterized — they animate
                                any category's .{prefix}-box structure)
                  infoCards/    card01…card05 (prefix 'card')
                  endCredits/   cr01…cr04 (prefix 'credits') + creditsPresets.ts (credits-roll /
                                credits-pages / credits-crawl); data-driven: a hidden #f0
                                textarea holds "Role | Name" lines, template JS parses and
                                rebuilds #credits-track, ends with logo + year (.credits-end)
                  tickers/      tk01…tk06 (prefix 'ticker') + tickerPresets.ts (ticker-marquee /
                                ticker-flip); data-driven: #f0 lines → #ticker-track items;
                                marquee = items rendered twice, slide one set width, linear
                                repeat:-1 (seamless loop)
                  startingSoon/ ss01…ss03 (prefix 'ss', hold-loop preset: entrance + calm
                                .ss-pulse breathing + clock via shared/clock.ts, minutes in f2)
                  gameTimers/   gt01…gt02 (prefix 'gt', type 'countdown'; timer-run pop +
                                timer-line-reveal; minutes in f1; .gt-done styles time-up)
                  scoreboards/  sb01…sb02 (prefix 'sb'; fixed 4-field contract f0-f3 as
                                sb-masks so the standard presets drive them; update() pops a
                                score's mask when it changes on air)
                  cornerBug/    bug01…bug02 (prefix 'bug', standard assembler, logo slot +
                                placeholder mark; bug02 = house live clock via
                                StandardDesign.runtimeExtraJs — design-owned JS emitted
                                BEFORE the marked ANIMATION region, DOM-ready guarded)
                  infographics/ ig01…ig02 (prefix 'ig'; design owns fields + runtimeExtraJs;
                                igPresets: count-up — suffix-preserving number tween — and
                                bars-grow over #ig-bars .ig-bar-fill[data-value])
                  quiz/         qz01 (prefix 'qz'; f0 question, f1-f4 options, hidden f5
                                correct-answer dropdown; next() → revealAnswer() adds
                                .qz-correct/.qz-dim, update() clears the reveal)
  store/        templateStore.ts — zustand; template + UI state; undo history; lastChange
                (per-tab changed-line ranges from every apply — the editor highlight);
                replayNonce (Motion applies auto-replay via PlayoutSimulator); patchCss
                (Style-panel patches: highlight without history spam)
  preview/      composeDocument.ts — inlines CSS + GSAP + JS + assets into the iframe srcdoc
  blocks/       registry.ts (BuildingBlock[] — no Blocks tab anymore; this is the offline AI
                stub's vocabulary), edit.ts (nextFieldId, addFieldToDefinition, …), cssVars.ts,
                animPatch.ts (marked-region readers/patchers: readAnimationInfo reads per-phase
                "// In preset:" / "// Out preset:" comments falling back to "// Preset:";
                swapAnimationPhase(js, id, cfg, 'in'|'out'|'both') splices two emitted regions
                at the buildOutTimeline boundary — steps code travels with the IN phase)
  ai/           provider.ts (AIProvider + GenerateContext), claudeProvider.ts (real provider:
                system prompt = SPX + house contracts + lt01's generated code as the canonical
                example; forced emit_template tool; validate + one repair round), anthropic.ts
                (direct browser call with the user's key OR VITE_AI_PROXY_URL gateway),
                settings.ts (localStorage + .env: key, model), index.ts (getAiProvider —
                Claude when configured, stub otherwise), stubProvider.ts, presets.ts
  validation/   validateTemplate.ts — runs before export and on AI output
  control/      the modular control-panel engine (Era 4): controlModel.ts (fields → operator
                control descriptors by ftype, ONE generator, no per-template code;
                controlChannelName + ControlMessage protocol), controlPanelHtml.ts (the
                standalone controlpanel.html, same descriptors, inline), receiverScript.ts
                (BroadcastChannel listener injected into exported index.html), liveData.ts
                (editable published-CSV → update() polling block appended to template.js)
  export/       registry.ts (5 targets + ExportContext — the Data panel's sampleData rides
                along so serverless targets can bake it), slug.ts (shared, avoids a cycle),
                selfContained.ts (single-file composer: inline CSS/GSAP/JS/assets + extra body
                scripts), targets/spxStarter.ts (+ buildStarterInto, reused by packets),
                targets/spxPack.ts, targets/htmlOverlay.ts (OBS/vMix browser source: autoplay
                block fills fields from baked sampleData -> definition defaults, then play();
                receiver + controlpanel.html bundled), targets/casparcg.ts (selfContained +
                JSON/XML data shim), targets/ograf.ts (EBU OGraf v1: manifest from DataFields +
                graphic.mjs Web Component; AMD-guarded gsap loader), packetExport.ts (whole
                packet -> one zip, a Starter folder per graphic), common.ts (addSharedAssets,
                addReferencedFonts, injectControlReceiver + addControlPanel, FONT_LICENSES.md)
  teach/        knowledge.ts + explain.ts — surfaced as Monaco HOVER tooltips in the editor
                (registered in CodeEditor.tsx; there is no Learn tab), cssReference.ts
  assets/       gsap.min.js (bundled), assetUtils.ts (data-URL assets)
  backend/      the OPTIONAL Supabase backend (Era 5): config.ts (isBackendConfigured — the ONE
                feature-detection point; unset env = pure offline mode), supabase.ts (lazy
                client), auth.ts (Google OAuth + email/password + subscribeAuth),
                storage.ts/supabaseProvider.ts/sync.ts/syncController.ts (LWW cloud sync of
                packets/looks/brand for signed-in users), assets.ts (Storage bucket)
  community/    Era 5.5 shared templates: communityData.ts (RPCs, signed-in only), gate.ts
                (validate + bench at publish AND import), useIsModerator.ts
  showchat/     Era 5.4 audience send-in: SendIn page (?chat=<slug>), ModerationPanel,
                chatGraphicBlock (polling graphic block), chatData.ts
  components/    AppShell (two-pane layout: code left; preview stacked over the tool tabs
                 right — the stage's aspect-ratio comes from the template resolution),
                 CodeEditor (Monaco + change-highlight decorations + hover explanations),
                 PreviewFrame, CanvasGuides, PlayoutSimulator (auto-replays on replayNonce),
                 SidePanel (six tabs: Data / Control / Style / Motion / AI / Export),
                 SampleDataPanel (sample values + add-field), ControlPanel (operator view from
                 control/ engine; live-drives the preview via store.sendControl → simulator;
                 downloads controlpanel.html; adds the Google-Sheets live-data block),
                 StylePanel, AnimationPanel (In/Out/Both phase control), AIPromptPanel,
                 ExportPanel (validation inline), PacketManager (📦 topbar modal),
                 CommunityGallery (🌐), ModerationQueue (🛡), SyncStatus,
                 Homebase (signed-in dashboard: all saved graphics across packets, one
                 store with 📦 Packets), SettingsDialog (AI key/model + workflow defaults
                 from model/prefs.ts; ExportPanel remembers the last-picked target there),
                 wizard/ (CreationWizard, draft.ts, WizardPreview, MiniPreview, steps/),
                 auth/ (useAuthState hook + authUi store + SignInDialog + SignInPrompt +
                 AuthStatus avatar menu → Homebase/Settings/Sign out — see "Auth posture"
                 below)
public/fonts/   the 7 bundled woff2 fonts (served at /fonts, copied into exports;
                jetbrains-mono.woff2 doubles as the app UI's mono face)
scripts/        l3-sweep.mjs — Playwright dev tool: `node scripts/l3-sweep.mjs <shots-dir>
                <category>` validates every variant × preset × easing (+ category-specific
                track/loop checks) and captures taste screenshots
docs/           GOALS.md (north star + milestones), DESIGN_LANGUAGE.md (taste rulebook),
                SPX_TEMPLATE_FORMAT.md (SPX contract)
```

### Auth posture (Era 5.6 — the open editor)

**There is no login wall, ever.** The editor — create, preview, export, local packets — is open to
everyone, hosted or self-hosted. Only *account features* gate themselves: cloud sync, community,
show chat, and AI (hosted mode). The pattern: read `useAuthState().needsSignIn` (true only when a
backend is configured AND the visitor is signed out) and render `SignInPrompt` / call
`useAuthUi().openSignIn(reason)` — never block the app. Offline builds (no Supabase env) must grow
**zero** auth UI (E2E-pinned in `e2e/auth.spec.ts`). Signup is OPEN (migration `0006` made the
Before-User-Created hook permissive; restore the 0002 function body to re-close it to the
allowlist). Don't reintroduce an app-wide gate.

### The choose-first creation flow (primary UX)

New projects go through the **CreationWizard** (Entry → Category → Template → Fields → Style →
Animation, persistent live preview). Creating calls `variant.create(options)` which generates the
complete, commented template. After creation, code is the source of truth and two **live panels**
keep working via deterministic patches:

- **Style panel** — reads/writes the `:root` style contract (`--accent`, `--text-color`,
  `--text-dim`, `--panel-bg`, `--font-heading`, `--scale`), swaps the marked `@font-face` block
  (bundled or imported), re-anchors the root element via `zoneDecls`, and can import a font
  post-creation.
- **Motion panel** — only touches the marked region
  (`/* == ANIMATION … == */ … /* == END ANIMATION == */`) and its three knob variables
  (`animSpeed`, `easeIn`, `easeOut`). Presets are per-category (`blocks/animPatch.ts
  presetsForType`); the root prefix is detected from `class="(\w+)-box"`. Preset/steps swaps
  re-emit the region (undoable); user code outside the markers is never modified. The steps
  toggle only shows for line-based categories (lower thirds, info cards, scoreboards, corner
  bug) — continuous, clock, and data-driven formats hide it.

**Sample data on create:** `applyTemplate(template, { resetSampleData: true })` is used by the
wizard so a new project starts from ITS field defaults — plain `applyTemplate` (blocks, panels,
AI) intentionally preserves typed sample values for matching field ids. Don't drop the flag from
the wizard path: the old template's values would leak into the new graphic's fields.

**Template runtime rule:** generated template.js loads in `<head>` in exported packages — any
load-time DOM work (initial rebuild/paint) must use the DOM-ready guard pattern (see
shared/clock.ts or the rebuild calls in credits/tickers/infographics runtimes).

**Images & fields (the broadcast field policy):**
- Field types offered to users are the ones live graphics actually use: `textfield`,
  `textarea`, `number`, and **`filelist` = the image field** (SPX lists files from
  `assetfolder: './images/'`). `dropdown`/`checkbox`/`color` exist in the SPX format but are
  reserved for genuinely constrained design choices (e.g. the quiz's correct-answer dropdown) —
  don't offer them in generic field UIs.
- Asset path convention: uploads land at `images/<file>` (fonts at `fonts/<file>`); the export
  zip wraps everything in one project folder, so extracting into a templates folder yields
  `[TemplatesFolder]/<project>/index.html` + `<project>/images/<file>` — the layout SPX and
  CasparCG expect. Both exporters use `zip.folder(slug(name))`.
- Every runtime writes fields through the shared `setFieldValue` helper (base.ts
  `setFieldValueJs`): text -> textContent, `<img id="fN">` -> src (empty value hides the img and
  toggles `.has-image` on its parent so CSS can show a placeholder). Data-driven categories may
  instead keep the path in a hidden source div (credits' #f2 logo).
- Logo slots are real SPX fields: credits f2, corner bug + card03 design-owned `extraFields`
  (`StandardDesign.extraFields`, id computed after all user fields).
- The preview iframe can't resolve `images/...` set at runtime — composeDocument injects a
  MutationObserver shim that swaps known relative paths for their in-memory data URLs.
  Exported packages never include the shim.

**Easing doctrine** lives in `model/easings.ts` + DESIGN_LANGUAGE §4: entrances use Out-direction
curves, exits use In-direction and run faster; Back Out for pops; Bounce/Elastic playful-only;
Linear only for continuous motion (credits rolls, ticker marquees — strictly `ease: 'none'`).

**Broadcast packages.** Graphics made in one project must read as siblings — DESIGN_LANGUAGE §8
holds the per-family cross-category tokens (minimal / sport / glass / **noacg house** shape, type,
and motion values; noacg is the product's own on-air look, rebuilt from the brand-kit overlays). Two mechanisms enforce it: the **project brand** (`model/brand.ts`, captured on every
wizard Create; the wizard's "Match current project" toggle re-applies palette + font via
`brandPatch`) and **sibling judging** (every new category variant is judged against its
lower-third counterpart). Custom colors enter through the wizard's Custom palette (hex/rgba +
picker); imported fonts become template assets (`fonts/<file>` data-URL) with a visible
`@font-face`, are registered via the FontFace API for the builder UI, and ship as real binaries
in the export.

Key flows and patterns:

- **Editing:** `setHtml/setCss/setJs` update the template; editing HTML re-parses the definition so
  `fields`/`settings` stay in sync. Preview rebuilds on a ~350 ms debounce.
- **Building blocks** (`blocks/registry.ts`): pure transforms grouped by a hierarchical `path`
  (e.g. `['Lower third']`, `['Animation','GSAP']`) with a `primaryTab` (tab to reveal after
  applying). Inserted elements are positioned in the lower-left action-safe area via
  `positionForNewElement`, tagged `data-gfx`, and styled with `textCssRule` (rich commented CSS).
  Animation is two tracks: **CSS** (`@keyframes` + class applied to the element) and **GSAP**
  (tween injected into `play()/stop()`).
- **Undo:** `applyTemplate` snapshots the previous template; `undo()` restores it. Blocks, AI, and
  gallery all flow through `applyTemplate`. Global **Ctrl/Cmd+Z** (AppShell) calls `undo()` unless
  focus is in Monaco or a form field.
- **Assets/branding:** uploads are base64 data URLs in `template.assets[]`; the preview inlines
  them, the exporter decodes them to real files under `assets/`. Brand colours are `:root` CSS
  variables.
- **Editor hover help (optional):** the `teach/` module surfaces explanations as Monaco hover
  tooltips for users who open the code — an aid, not the point. There is no Learn tab.

## Verifying changes

Always `npm run build` (typecheck + build) after changes.

- **UI flows → use Playwright.** Verify user-facing flows with the E2E suite in `e2e/` (specs drive
  the real dev server). Run `npm run test:e2e`. Add a spec for any new user-facing flow (gallery,
  blocks, undo, guides, branding, export, …).
- **Logic checks without UI (fast path):** Vite serves source modules, so in a browser context you
  can `await import('/src/blocks/registry.ts?t=' + Date.now())`, apply blocks to
  `createBlankTemplate(...)`, run `validateTemplate`, and load `composeDocument(tpl)` into a hidden
  iframe to call `update()/play()/stop()`. Good for blocks, templates, validation, and export logic.
- **Store/state checks:** `import('/src/store/templateStore.ts')` then `useTemplateStore.getState()`.
- **Template catalog sweep:** `node scripts/l3-sweep.mjs <shots-dir> <category>` (dev server must
  be running; category = `lower-third` | `info-card` | `end-credits` | `ticker`) — validates every
  variant × preset × easing (runtime, steps, auto-fit, credits/ticker track checks) and captures
  settled-state taste screenshots. Run it for the affected category after template changes.

**Gotchas:**
- After many edits the Vite dev server can serve a **stale module** (HMR lag) — restart it if a
  change isn't reflected.
- Worse: after HMR updates, `import('/src/store/…')` in an eval/console context can resolve a
  **different module instance** than the running app (a "ghost store" — your clicks patch the real
  store while your assertions read the stale one). If state reads disagree with visible UI,
  **restart the dev server and reload** before trusting any eval-based assertion.
- Monaco isn't fully interactive in a headless preview and GSAP animations don't visibly tick (rAF);
  assert on DOM/state, not screenshots, for those.
- In Playwright specs, **never clear localStorage via `addInitScript`** — the script also runs in
  the same-origin srcdoc preview iframe, so every preview rebuild wipes the key (this silently
  deleted the project brand). Fresh browser contexts already isolate storage per test.
- The preview rebuilds on a ~350 ms debounce after `applyTemplate` — Playwright specs must wait for
  it (or for an element unique to the new document) before clicking Play or asserting inside the
  iframe, or they hit the previous document.

## Git

- Work happens on `main` (the old feature branches were merged and deleted). Only branch if the user
  asks.
- The working rhythm in this repo: **commit each completed, verified phase/step** with a descriptive
  message. **Never add a `Co-Authored-By` trailer or any agent co-author** (the user's global rule).
  The user likes GitHub kept up to date, but ask before pushing unless they've already asked in the
  current effort.
- Don't commit `dist/` changes as part of feature work.
