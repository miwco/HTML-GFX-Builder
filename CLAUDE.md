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
npm run dev      # Vite dev server (landing at /, THE EDITOR AT /app)
npm run build    # tsc (typecheck) && vite build -> dist/   <-- run this after changes; it's the CI gate
npm run preview  # serve the production build
```

**The dev port is per-checkout** (`scripts/dev-port.mjs`): 5174 in the main checkout (5175 for
the live e2e suite), a stable path-derived port in a linked git worktree — so parallel worktrees
never fight over one server. Vite (strictPort), both Playwright configs, and the dev scripts all
derive the same number; `node scripts/dev-port.mjs` prints it. `.claude/launch.json` is
GENERATED with that port by postinstall (gitignored — never hand-edit or commit it).
`DEV_PORT=n` overrides everything if two worktrees ever hash to the same port.

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
                captureLookFromTemplate/applyLookToTemplate), easings.ts, defaultTemplate,
                structure.ts (detectPrefix/countLines + getTemplateParts — the TemplatePart
                registry, THE shared element-identity contract: DOM-derived {selector, kind,
                label, channel}, single-token selectors only; timeline labels, canvas
                selection, and step assignment must all name elements through it)
  templates/    blank.ts + the wizard catalog, resolved through catalog.ts (CATALOG,
                variantsFor/variantById):
                  shared/       base.ts (generic assembler pieces: :root vars, zones, auto-fit,
                                runtime scaffold) + standard.ts (CategorySpec, assembleStandard,
                                makeDefineVariant) + clock.ts (countdown engine: hidden minutes
                                field → M:SS + {prefix}-done at zero; DOM-ready-safe) — every
                                category builds on these
                  lowerThirds/  lt01…lt13 on shared.ts (prefix 'lower-third') + animPresets.ts (9
                                marked-region GSAP presets, prefix-parameterized — they animate
                                any category's .{prefix}-box structure)
                  infoCards/    card01…card05 (prefix 'info-card')
                  endCredits/   cr01…cr04 (prefix 'credits') + creditsPresets.ts (credits-roll /
                                credits-pages / credits-crawl); data-driven: a hidden #f0
                                textarea holds "Role | Name" lines, template JS parses and
                                rebuilds #credits-track, ends with logo + year (.credits-end)
                  tickers/      tk01…tk06 (prefix 'ticker') + tickerPresets.ts (ticker-marquee /
                                ticker-flip); data-driven: #f0 lines → #ticker-track items;
                                marquee = items rendered twice, slide one set width, linear
                                repeat:-1 (seamless loop)
                  startingSoon/ ss01…ss03 (prefix 'starting-soon', hold-loop preset: entrance + calm
                                .starting-soon-pulse breathing + clock via shared/clock.ts, minutes in f2)
                  gameTimers/   gt01…gt02 (prefix 'game-timer', type 'countdown'; timer-run pop +
                                timer-line-reveal; minutes in f1; .game-timer-done styles time-up)
                  scoreboards/  sb01…sb02 (prefix 'scoreboard'; fixed 4-field contract f0-f3 as
                                scoreboard-masks so the standard presets drive them; update() pops a
                                score's mask when it changes on air)
                  cornerBug/    bug01…bug02 (prefix 'corner-bug', standard assembler, logo slot +
                                placeholder mark; bug02 = house live clock via
                                StandardDesign.runtimeExtraJs — design-owned JS emitted
                                BEFORE the marked ANIMATION region, DOM-ready guarded)
                  infographics/ ig01…ig06 (prefix 'infographic'; design owns fields + runtimeExtraJs;
                                igPresets: count-up — suffix-preserving number tween — and
                                bars-grow over #infographic-bars .infographic-bar-fill[data-value])
                  quiz/         qz01 (prefix 'quiz'; f0 question, f1-f4 options, hidden f5
                                correct-answer dropdown; next() → revealAnswer() adds
                                .quiz-correct/.quiz-dim, update() clears the reveal)
  store/        templateStore.ts — zustand; template + UI state; undo history; lastChange
                (per-tab changed-line ranges from every apply — the editor highlight);
                replayNonce (Motion applies auto-replay via PlayoutSimulator); patchCss
                (Style-panel patches: highlight without history spam); sendScrub (timeline
                view → simulator pauses the preview's in/out timeline at a time);
                selectedPart (the Era-6 SHARED SELECTION: one TemplatePart selector the
                canvas and the timeline strip both highlight — UI state only, no history)
  preview/      composeDocument.ts — inlines CSS + GSAP + JS + assets into the iframe srcdoc
  blocks/       registry.ts (BuildingBlock[] — no Blocks tab anymore; this is the offline AI
                stub's vocabulary), edit.ts (nextFieldId, addFieldToDefinition, …), cssVars.ts,
                animPatch.ts (marked-region readers/patchers: readAnimationInfo reads per-phase
                "// In preset:" / "// Out preset:" comments falling back to "// Preset:";
                swapAnimationPhase(js, id, cfg, 'in'|'out'|'both') splices two emitted regions
                at the buildOutTimeline boundary — steps code travels with the IN phase),
                stepAssign.ts (changePartPress — the ONE "appears on press" transition,
                shared by the timeline gutter's menu and the canvas chip: entrance→press
                and press→entrance re-emit the IN phase via applyStepChain, press→press
                stays the tuning-preserving patchStepRegroup literal patch; blocks
                (data-gfx + id, OUTSIDE the root) are assignable too — the emitted
                outside gate hides them from first paint (steps block, DOM-ready
                guarded) and patchOutsideExit keeps ONE surgical buildOutTimeline
                fade line in sync at the animPatch swap choke points, so they leave
                with the exit without resetting out-phase tuning)
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
  export/       registry.ts (6 targets, each with its own successMessage + ExportContext — the
                Data panel's sampleData rides along so serverless targets can bake it), slug.ts
                (shared, avoids a cycle), selfContained.ts (single-file composer: inline
                CSS/GSAP/JS/assets + extra body scripts), targets/spxStarter.ts (the one SPX
                export = spxTarget, id 'spx'; + buildStarterInto, reused by packets),
                targets/htmlOverlay.ts (OBS/vMix browser source: autoplay
                block fills fields from baked sampleData -> definition defaults, then play();
                receiver + controlpanel.html bundled), targets/h2r.ts (H2R Custom HTML: GDD
                block from DataFields + play()-toggle shim), targets/casparcg.ts (selfContained
                + JSON/XML data shim), targets/ograf.ts (EBU OGraf v1: manifest from DataFields
                + graphic.mjs Web Component; AMD-guarded gsap loader; addOgrafPackage
                reused by targets/liveos.ts — LiveOS's HTML5 graphics engine is
                OGraf-compliant, so that target is the same package with NetOn.Live
                install steps in the README), packetExport.ts (whole
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
                 CodeEditor (Monaco + change-highlight decorations + change dots on
                 inactive tabs the last apply touched + hover explanations),
                 PreviewFrame, CanvasInteraction (Era 6 — always-on direct manipulation:
                 hover cursors, drag the root → nearest zone + residual nudge → the SAME
                 zoneDecls patch the Style panel writes; dblclick a visible #fN → inline
                 edit → sample value + definition default via blocks/edit.ts
                 setFieldDefault; corner handle → live --scale preview, diagonal-aware,
                 clamped 0.25–4; every gesture commits as ONE undoable applyTemplate and
                 jumps the editor to the changed tab, highlighted; root detected via
                 model/structure.ts detectPrefix; plus the SELECTION model: a click
                 selects the innermost TemplatePart under the point — registry-driven
                 closest-ancestor hit test, rect-containment fallback — clicking the
                 selected part again climbs to its container, hover previews the name,
                 Escape or empty canvas deselects, the corner handle stays anchored
                 while the whole graphic is selected; selection is editor UI state
                 ONLY — the selector lives in store selectedPart so the timeline
                 strip highlights the same element — never written into the template),
                 CanvasSelection (the presentational selection/hover overlay: amber
                 outline + a chip speaking part.label — the registry's words, same as
                 the timeline strip; chips hint only actions that already exist:
                 dblclick-to-edit on text lines, corner resize on the root; an
                 eligible selected part's chip carries the "appears on press" select —
                 the timeline gutter's control from the canvas, same conditions, same
                 blocks/stepAssign.ts patch — and swallows its own pointer events so
                 the gesture layer under it never fires),
                 CanvasGuides,
                 PlayoutSimulator (owns the running preview timeline __activeTl; settles
                 the design view after every rebuild — progress(1, true) + a second
                 update(); auto-replays on replayNonce; playNext owns each Continue's
                 reveal tween as __activeTl step-N; resetGraphic clears GSAP inline props
                 on the root subtree before every entrance so a prior exit never leaks
                 its end state — e.g. a Blur exit's filter into a Slide entrance that
                 never resets it; honors the SPX `out` = N ms setting by scheduling the
                 exit after the entrance settles + the hold, cancelled by any manual
                 play/stop/next/scrub), TimelineView (collapsible strip
                 under the preview: MOMENT CARDS ▶In · »1 · »2 · »+Step · ●On air · ■Out
                 (step cards numbered by PRESS; cue subtitles aria-hidden —
                 getByRole('▶ Play') must stay unique in specs) over the CUE-SEGMENTED
                 OVERVIEW (timelineModel.ts buildOverview): ONE strip, all sections side
                 by side each on its own real local clock (widths = duration × zoom,
                 zoom +/- buttons fit once per template.name), the hold a fixed hatched
                 break, registry-part rows spanning every section (multi-target tweens
                 expand onto member rows at their stagger offsets; set()-only rows drop);
                 every bar edits in place AND independently: dragging a member of a
                 joint multi-target tween SPLITS it per target first (splitTween) so
                 only that layer retimes; bars resize from BOTH edges (left = start
                 with the end pinned); dragging any eligible bar across sections moves
                 WHEN the part appears (entrance bar → » press = assign, reveal bar →
                 entrance = unassign — all through stepAssign.changePartPress, section
                 bodies + cards are drop zones, dragged bars get pointer-events:none so
                 hit-testing sees through); the gutter has each part's "appears on
                 press" menu + the selected moment's ease chips (patchTweenEase/
                 patchStepEase); each part row's ▸ arrow opens the PHASE-AWARE transform
                 drawer (X/Y/scale/opacity/rotation + blur): on ▶In it edits ENTERS-FROM
                 (in tween from-values settling to identity — patchTweenVars, insertPartTween
                 for partless layers), on ■Out it edits LEAVES-TO (out tween to-values —
                 patchTweenToVars, insertPartOutTween; opacity never auto-stripped so the
                 exit still fades); blur is the one non-transform (serializes to
                 filter:'blur(Npx)' via setObjBlur — enters-from materialises out of blur,
                 leaves-to dissolves into it); root never gets a drawer, press-assigned
                 parts have none on In but do on Out (leaving is independent of entering);
                 ●On air = pseudo-card (phaseId 'hold'), click parks on the settled
                 look; »+Step disables with a tooltip reason; THE STRIP IS THE ONE
                 MOTION SURFACE (the Motion side-tab is retired): the selected ▶In/■Out
                 card's inspector row holds that phase's preset picker + easing choice
                 (swapAnimationPhase / setAnimKnob — phase-correct halves per the
                 easing doctrine; the Out card names presets in their exit direction,
                 Blur in → Blur out), the header holds the animSpeed knob, and the
                 selected ●On air card's note edits the SPX `out` setting (until-Stop /
                 auto-out N ms / stays — synced into the definition like
                 withStepsSetting); an unparsable marked region gets an honest
                 one-liner PLUS a start-over preset select — the one Motion-tab duty
                 that state still needs; a 'both' swap re-emits the whole region and
                 brings the timeline back (blank/imported templates get no strip) —
                 one undoable apply + auto-replay per edit, the code always
                 the truth; row LABELS are the shared-selection handles: clicking one
                 (or a bar, without dragging) selects that element on the canvas too
                 (store selectedPart), the selected row washes amber),
                 Inspector (Timeline v2 — the persistent panel RIGHT of the preview,
                 the shared selection's third consumer: identity + resolved property
                 values at the settled state via parseAnimData→importAnimData→
                 resolveValue, plus an Animations tab naming which steps move the
                 layer; read shell until the keyframe phase arms editing; its column
                 lives in both desktop layout modes with a splitter + the topbar
                 ◨ Inspector toggle — layout prefs inspectorRatio/inspectorCollapsed),
                 SidePanel (five tabs: Data / Control / Style / AI / Export),
                 SampleDataPanel (sample values + add-field), ControlPanel (operator view from
                 control/ engine; live-drives the preview via store.sendControl → simulator;
                 downloads controlpanel.html; adds the Google-Sheets live-data block),
                 StylePanel, AIPromptPanel,
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
complete, commented template. After creation, code is the source of truth and two **live
surfaces** keep working via deterministic patches:

- **Style panel** — reads/writes the `:root` style contract (`--accent`, `--text-color`,
  `--text-dim`, `--panel-bg`, `--font-heading`, `--scale`), swaps the marked `@font-face` block
  (bundled or imported), re-anchors the root element via `zoneDecls`, and can import a font
  post-creation.
- **Motion = the timeline strip** (there is no Motion tab; the wizard's Animation step is the
  other, create-time surface) — only ever touches the marked region
  (`/* == ANIMATION … == */ … /* == END ANIMATION == */`) and its three knob variables
  (`animSpeed`, `easeIn`, `easeOut`). Presets are per-category (`blocks/animPatch.ts
  presetsForType`, offered on the selected In/Out card and on the unparsable-region fallback);
  the root prefix is detected via `model/structure.ts` (hyphen-safe). Preset/steps swaps
  re-emit the region (undoable); user code outside the markers is never modified. Steps
  live on the strip (»+ Step / the step hint's turn-off action) and only exist for line-based
  categories (lower thirds, info cards, scoreboards, corner bug) — continuous, clock, and
  data-driven formats don't offer them.

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
wizard Create; the wizard's "Use current project's colors & font" toggle — off by default —
re-applies palette + font via `brandPatch`) and **sibling judging** (every new category variant is judged against its
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
- **Undo/redo:** `applyTemplate` snapshots the previous template; `undo()` restores it and pushes
  the undone state onto `future`; `redo()` re-applies it. Any NEW edit (apply, patchCss, manual
  typing) clears `future`. Blocks, AI, and gallery all flow through `applyTemplate`. Global
  **Ctrl/Cmd+Z** / **Ctrl/Cmd+Shift+Z** (+ Ctrl+Y) in AppShell, unless focus is in Monaco or a
  form field.
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
- The app declares `color-scheme: dark` (styles.css `:root`) and composeDocument injects the
  matching `<meta name="color-scheme" content="dark">` into the preview srcdoc. **Keep them
  paired** — Chromium paints an iframe opaque (white stage) when embedder and iframe schemes
  disagree. Exported packages get neither.
- The e2e suite pins **offline mode** via `webServer.env` in playwright.config.ts, but
  `reuseExistingServer: true` means a dev server already running on THIS checkout's port
  (started by hand, with the real `.env`) gets reused — backend-sensitive specs then fail
  confusingly. Kill any manual server on this checkout's port (`node scripts/dev-port.mjs`
  prints it) before `npm run test:e2e`. Other worktrees' servers are harmless — they live on
  their own ports.
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
  The user likes GitHub kept up to date: push completed, verified work to `main` without asking
  (standing permission, 2026-07-08).
- **Commit messages:** write clear, human-readable messages that explain the actual change — they
  must be understandable to any outside developer reading the history cold. No chat/session
  language, internal planning names, or AI-sounding phrases ("as requested", "starting era 5",
  "continued work", "made changes", "AI update", "per your instructions"). Never mention Claude,
  Codex, ChatGPT, agents, prompts, or the conversation unless the commit is specifically about AI
  tooling.
- Don't commit `dist/` changes as part of feature work.
