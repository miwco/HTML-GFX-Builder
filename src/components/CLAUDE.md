# src/components - the React app

Loaded alongside the root CLAUDE.md when working in this directory. Keep it accurate. The
store-side halves of these contracts are in src/store/CLAUDE.md; the code patchers they call are
in src/blocks/CLAUDE.md.

## Shell & editor

- **AppShell** - the workspace layout: a flexible DOCKABLE-PANEL model (model/layout.ts). The
  centre is fixed - the canvas (stage + transport) over the timeline, split by a draggable
  divider - and three docks (LEFT, RIGHT, BOTTOM) flank it, each hosting any panels
  (`code`, `inspector`, `data`, `control`, `style`, `ai`, `export`) as tabs. Default: code left,
  Inspector + the tool panels right, timeline roomy in the centre, bottom empty. Each dock renders
  only when it holds panels; the splitters resize the adjacent region. A tab can be MOVED to
  another dock or CLOSED via its ▾ menu; a dock's "+" re-adds any hidden panel (a closed panel
  stays closed across reloads and is offered there). The DockState (panels/active/size) +
  timelineSize persist via model/layout.ts (loadLayout migrates any non-v2 layout to the default).
  The dock component is **WorkspaceDock**; the panel bodies come from AppShell's `renderPanel`
  (the tool panels wrapped in `.panel-body`); MOBILE keeps the fused preview column + SidePanel.
  A NEW selection (any surface) reveals the Inspector - activates its tab, or re-docks it if it
  was closed - DEFERRED half a second past the double-click window: any new pointer press cancels
  the pending reveal and a live canvas gesture (store canvasGestureActive) skips it at fire time,
  so the workspace never resizes between the two clicks of a text double-click or under a drag
  (e2e/inline-edit.spec.ts pins this). The store's `activePanel` is a "reveal this panel" signal
  (the wizard shows Export after an import) - honoured in the docks, but not on mount. The topbar
  ◨/code toggles close-or-reveal those panels. Binds global Ctrl/Cmd+Z to undo() and
  Ctrl/Cmd+Shift+Z (+ Ctrl+Y) to redo() (skipped when focus is in Monaco or a form field).
  useIsMobile/useSplitter support the mobile and resizable layouts.
- **CodeEditor** - Monaco + change-highlight decorations + change dots on inactive tabs the last
  apply touched + hover explanations (the teach/ module registers its tooltips here; there is no
  Learn tab).
- **PreviewFrame** - the stage: the iframe + overlays live in a `.canvas-world` centred in the
  stage and translated by `pan`, scaled by fit × `zoom`. Zoom: the toolbar −/%/+ (the % resets
  to fit), Ctrl/Cmd+wheel (and trackpad pinch) toward the cursor, clamped 0.2–8×. Pan: a plain
  wheel when zoomed in, or a middle-mouse drag (captured before the overlay). Because the overlay
  is sized `stageW × (fit×zoom)` and CanvasInteraction reads its live bounding rect, zoom and pan
  need NO coordinate changes there — the gesture math follows automatically (pinned by the zoom
  case in e2e/multi-select.spec.ts). Off-canvas VISIBILITY (a pasteboard so elements that start
  off-screen render) is a separate step — it needs the iframe to render past the canvas bounds.
- **CanvasGuides**.

## Canvas direct manipulation (Era 6)

- **CanvasInteraction** - always-on direct manipulation: hover cursors; drag the root -> nearest
  zone + residual nudge -> the SAME zoneDecls patch the Style panel writes; dblclick a visible
  #fN -> inline edit -> sample value + definition default via blocks/edit.ts setFieldDefault;
  corner handle -> live --scale preview, diagonal-aware, clamped 0.25-4. Every gesture commits as
  ONE undoable applyTemplate and jumps the editor to the changed tab, highlighted; the root is
  detected via model/structure.ts detectPrefix.
  LAYER SCALE/ROTATE HANDLES (data-block, a single selected non-root layer): a corner scale
  handle + a top rotate handle on the selection box; dragging previews live via GSAP and, on
  release, keys `scale` / `rotation` at the playhead (keyframePlace + setKeyframe + spliceAnimData,
  ONE undoable apply, re-parked) - pivoting around the layer's transform-origin (the Inspector
  pivot). Escape springs it back. The root keeps its own --scale corner handle.
  CANVAS POSITION KEYFRAMING (docs/TIMELINE_INTERACTION_MODEL.md, amendment 3): on a
  data-block template, dragging any SELECTED non-root layer moves the WHOLE selection (layers
  contained in another dragged layer are excluded - the parent's transform carries them) and,
  on release, ONE undoable apply writes each layer's x/y keyframes at the parked playhead -
  the drag itself arms, no Inspector setup. Live GSAP x/y preview while dragging (the same
  animEdit + spliceAnimData path the Inspector edits through, re-parked after the rebuild);
  Escape springs everything back. The root keeps the zone drag, unselected layers don't drag
  on their own, and legacy templates keep the classic gestures exactly. Pinned by
  e2e/canvas-keyframe.spec.ts.
  PLACEMENT DRAG (imported designs): a selected PLACED line - one whose wrapper id has a CSS
  rule with left/top px values (blocks/designLayout.ts placedLines; the imported-design shape,
  code-derived, never category) - drags as PLACEMENT, not motion: live inline left/top preview
  in the rule's own idiom, ONE undoable placeLine CSS patch on release, Escape clears the
  previews. Placed lines are excluded from the keyframe drag entirely, so a multi-select drag
  never keys motion for them; catalog templates (mask divs without ids) never match. Pinned by
  e2e/import-graphic.spec.ts.
  The SELECTION model (multi, docs/TIMELINE_INTERACTION_MODEL.md): a click selects the
  innermost TemplatePart under the point (registry-driven closest-ancestor hit test,
  rect-containment fallback); clicking the sole selected part again climbs to its container;
  SHIFT-click toggles membership; a drag on EMPTY canvas draws a lasso selecting every
  rendered non-root part it touches (the root is excluded by design); hover previews the
  name; Escape or empty canvas deselects. Selection is editor UI state ONLY - it lives in
  store selectedParts (ordered, first = primary in selectedPart) so the timeline and the
  Inspector track the same elements - never written into the template. Pinned by
  e2e/multi-select.spec.ts.
- **CanvasSelection** - the presentational selection/hover overlay: amber outline + a chip
  speaking part.label - the registry's words, same as the timeline strip. Chips hint only
  actions that already exist: dblclick-to-edit on text lines, corner resize on the root. An
  eligible selected part's chip carries the "appears on press" select - the timeline gutter's
  control from the canvas, same conditions, same blocks/stepAssign.ts patch - and swallows its
  own pointer events so the gesture layer under it never fires.

## Playout & timeline

- **PlayoutSimulator** - owns the running preview timeline `__activeTl`; settles the design view
  after every rebuild (progress(1, true) + a second update()); auto-replays on replayNonce;
  playNext owns each Continue's reveal tween as `__activeTl` step-N. resetGraphic clears GSAP
  inline props on the root subtree before every entrance so a prior exit never leaks its end
  state (e.g. a Blur exit's filter into a Slide entrance that never resets it). Honors the SPX
  `out` = N ms setting by scheduling the exit after the entrance settles + the hold - cancelled
  by any manual play/stop/next/scrub.
- **TimelineDock / StepTimeline** (Timeline v2, both in StepTimeline.tsx) - the dock picks the
  timeline surface from the CODE, never from the category (which is what lets a template saved
  years ago still open correctly): a NOACG_ANIM data region gets the clip-style STEP TIMELINE,
  editable - every category creates this way, so it is the normal case; a LEGACY region the
  importer can read gets the SAME step timeline, READ-ONLY, with an undoable '◆ use keyframes'
  conversion one click away (blocks/animImport.ts + the animRuntime writer) - it shows the real
  choreography, converted, rather than a lesser second editor; a legacy region it CANNOT read gets
  **LegacyTimeline** (below).
  The step timeline's vocabulary: a time ruler with the operator's cue markers (▶ » ● ■) at
  every boundary; step CLIPS - right-edge resize (default PRESERVES keyframe timing: extending
  leaves settled air, shrinking clamps at the last keyframe; Alt-drag STRETCHES times
  proportionally), context menu Duplicate/Rename/Delete + the step's default ease, »+ adds a
  step, a hold popover edits the SPX `out` setting, a speed select scales everything; LAYER
  ROWS - every registry part gets a row - with aggregate keyframe diamonds, a ▸ caret that
  EXPANDS the layer into per-property sub-rows (each track's own diamonds; drag/Delete/ease
  scoped to that property via moveKeyframe/deleteKeyframe/setKeyframeEase's prop arg), and a
  LAYER STATE BLOCK: the existence span (activation step -> the step it LEAVES: its `hides`
  step, else the end of Out) with the keyframed entering/exiting phases emphasized - its LEFT
  edge drags between step boundaries as the same activation move the gutter/chip make, and its
  RIGHT edge drags to set an EARLY EXIT (blocks/animEdit setLayerHide writes the step's `hides`;
  dragging to Out clears it). Setting a hide on a template whose interpreter predates the
  feature re-emits the whole region so the exit actually plays.
  THE THREE READ-ONLY SURFACES. Three things in the data are NOT keyframes you can grab, and each
  is SURFACED (so the timeline never silently hides motion) but never draggable (so it never
  implies an affordance it lacks). All three are code-owned; the tooltips say so.
  - MEASURED MOTION (`dynamics`, docs/DYNAMIC_MOTION_SCOPE.md): its own rows BELOW the layer rows,
    one per target, as a hatched OPEN-ENDED bar naming the builder (`tickerMarquee()`). It runs to
    the end of the timeline because its real length is measured from the operator's content at play
    time - any fixed width would be a lie. The target (`#ticker-track`) is intentionally NOT a
    registry part, so it is not canvas-selectable.
  - LOOPS (`loops[selector][prop]`, PRESET_MODEL_REVIEW gap 6): a repeat TAIL on the layer's own
    row (and on its property sub-row when expanded), starting at the looping track's LAST keyframe -
    the keyframes ARE the pass and stay editable; only the repeat is annotated. Labelled `↻∞` /
    `↻×N` plus `⇄` for yoyo. Drawn from the data, so a FINITE repeat ends exactly where it really
    ends (`last + repeat × (pass + repeatDelay)`) and closes with a cap; an endless one - or a
    finite one that outlives the authored timeline, since a step's duration is a FLOOR not a cap -
    clamps to the canvas and drops the cap, reading as "still going".
  - LIFECYCLE CALLS (`calls`, TIMELINE_V2_PLAN §3b): their own `lifecycle` row, one PIN per call at
    its moment, naming the function (`startClock()`). A side effect has no duration and nothing to
    interpolate, so it is deliberately drawn unlike a keyframe diamond.
  KEYFRAME SETS: click selects a diamond, shift-click builds a set,
  dragging any selected diamond moves the WHOLE set (magnetic snap to playhead/step
  edges/other keyframes within ~7px, Alt free, 0.05s grid fallback), Delete clears the set,
  ←/→ nudges it, Ctrl/Cmd+C/V copies and pastes the group at the playhead, Ctrl/Cmd+D
  duplicates it in place. A drag on the empty rows area draws the SAME amber marquee the canvas
  lasso uses (.tlv2-lasso) and boxes every diamond it touches (x -> time, y -> the row bands;
  shift adds; an expanded layer is boxed per-property); the ruler/clips band keeps its scrub.
  A draggable
  playhead with a grab cap + auto-follow scroll and deep zoom (up to 1000 px/s); Space plays
  (never while typing).
  Every edit is a pure data mutation (blocks/animEdit.ts) spliced back by
  blocks/animData.ts - ONE undoable apply each (a group drag/delete/paste chains mutations
  into one apply); playhead/scrub/selection never write history.
  Parity between editor and runtime is pinned by e2e/anim-engine.spec.ts; the interaction
  contract lives in docs/TIMELINE_INTERACTION_MODEL.md.
- **Inspector** (Timeline v2) - the persistent panel RIGHT of the preview and the shared
  selection's third consumer (canvas <-> timeline <-> Inspector): identity + resolved property
  values at the settled state (parseAnimData -> importAnimData -> animEval resolveValue). On a
  data-block template the Properties tab EDITS: each property carries a ◇/◆ diamond - arm it
  to stamp a keyframe at the store playhead, edit an armed value to auto-key there, click a
  diamond sitting ON a keyframe to remove it; ‹ › navigate the layer's keyframes, labels
  drag-scrub the value, and arming BOTH Position X and Y also unlocks the canvas position-keyframe
  drag (see CanvasInteraction). The vocabulary (PROP_ROWS) is x/y/yPercent/scale/opacity/
  rotation, a **Filter** group - blur/brightness/saturate/hueRotate/glow, which are NOT separate
  tracks: they share the ONE composed `filter` track (blocks/filterTrack.ts), so a row edits one
  function of the string and a keyframe there carries them ALL (the row hint says so). A filter
  row carries `filter: <key>` in PROP_ROWS and writes through animEdit's `setFilterComponent` -
  plus a **3D transform** group - `rotationX`/`rotationY`/`z` and `perspective`
  (`transformPerspective`), ordinary numeric tracks the interpreter tweens with no special-casing
  (perspective enables the 3D look; they pivot around the Pivot's transform-origin). Adding a
  numeric prop needs only a PROP_ROWS entry - no runtime/resolver/validation change; a new FILTER
  function needs only a FILTER_FUNCS entry in blocks/filterTrack.ts plus its PROP_ROWS row.
  The Animations tab names which steps move the layer and holds the preset
  picker (preset + In/Out/Both + easing dropdown + per-direction duration + Apply -
  blocks/presetApply.ts); Apply is a CLEAN SWAP of the targeted direction's motion (it never
  blends with the previous preset), and re-parks the preview at the playhead. Legacy templates get a
  read-only shell (the timeline's convert chip arms editing). It is a dockable panel (default:
  the active tab of the RIGHT dock) - shown/hidden/resized/moved like any panel; any NEW
  selection reveals it (activates its tab, or re-docks it if closed - an explicit close holds
  while the selection is unchanged, see AppShell).
- **LegacyTimeline** (Phase 8) - the READ-ONLY chart of a legacy region the importer REFUSES:
  measured motion written inline (`x: -track.scrollWidth`), or a loop it would have to guess at.
  Such a template can never be auto-converted, and regenerating it would discard its owner's
  tuning - so it must still RENDER truthfully (DYNAMIC_MOTION_SCOPE §8.1). It draws the
  CUE-SEGMENTED OVERVIEW (blocks/timelineModel.ts buildOverview): ONE strip, all sections side by
  side (▶ In · » presses · ● hold · ■ Out), each on its own real local clock, the hold a hatched
  break, registry-part rows spanning every section. A live playhead follows the simulator; clicking
  a section or dragging the scrub parks the preview there - reading the code, never writing it. Row
  LABELS are shared-selection handles, as everywhere.
  It offers NO editing affordance, because Phase 8 deleted the patchers that backed them: no bar
  drags, no resize grips, no enters-from drawer, no preset picker, no ease chips, no steps toggle.
  The note says why, and the JS tab is where you edit it. Its ONE write is **"start over with a
  preset"**, which emits that preset as DATA (presetRegistry.emitPresetRegion -> importer ->
  data block): the way out of unconvertible code leads FORWARD, never to another legacy region, and
  undo restores the hand-written version. An unparsable region gets an honest one-liner plus that
  same select; blank/imported templates get no strip at all.

## Field controls (fields/) - ONE control, every surface

**FieldControl.tsx** is THE editable-field control. Every surface where a human changes a field's
value renders it: the SPX Data panel, the SPX Control panel, and the video Content panel. They
differ only in the DESCRIPTORS they pass (model/fieldModel.ts `FieldDescriptor`) and where the
value lives - never in what a number/colour/image control looks like or how it behaves. `FieldRow`
adds the label, the optional id badge, and the per-field **Reset** to the descriptor's
`defaultValue` (shown only once the value differs). Controls emit their kind's natural type - a
number for `number`, a string otherwise.
**SpxFieldRow.tsx** is the SPX binding both SPX panels share (sampleData + asset upload; values
stringify at that boundary because SPX sample data is a flat string map); the video panel binds
its own store the same way.
**Do not hand-roll a field control.** A new kind is added to `FieldKind`, mapped in the two
adapters (control/controlModel.ts `fieldDescriptors`, model/videoTypes.ts `videoInputDescriptor`),
and rendered once here. The exported standalone controlpanel.html (control/controlPanelHtml.ts)
renders the SAME descriptors in dependency-free vanilla JS because it ships without React - it is
the one deliberate second renderer; keep it in step.

## Panels (the six tool panels - Data / Control / Style / Assets / AI / Export)

On DESKTOP each is a dockable panel (AppShell renders them into the docks; see WorkspaceDock).
**SidePanel** (the six-tab strip) is now the MOBILE surface only. There is no Motion tab: motion
editing lives on the timeline (StepTimeline via TimelineDock) plus the Inspector.

- **SampleDataPanel** - sample values (shared field rows, `includeHidden`: a hidden field carries
  a real input value like a countdown's duration, so it must be testable here) + add-field.
- **ControlPanel** - operator view from the control/ engine (the same shared field rows, `live`
  on, hidden fields skipped as SPX skips them); live-drives the preview via store.sendControl ->
  simulator; downloads controlpanel.html; adds the Google-Sheets live-data block.
- **StylePanel** - reads/writes the :root style contract (src/templates/CLAUDE.md): colors,
  font swap, zone re-anchoring, post-creation font import (an imported font still lands in
  template.assets and shows in the Assets panel's list).
- **AssetsPanel** - the template's bundled files as folder-grouped ROWS (images, Lottie .json
  gated by looksLikeLottie, fonts): DnD file import (one addAssets = one undo step), rows are
  drag SOURCES (`application/x-noacg-asset`, exported as ASSET_DRAG_TYPE) for the canvas drop
  (CanvasInteraction) and for folder-header drops; folders are path segments (one level inside
  the bucket) - moving/renaming goes through blocks/assetOps.ts moveAsset, which rewrites every
  code reference in the SAME undoable apply, then patches stale sampleData values. Empty
  user-created folders are ephemeral component state on purpose (assets sync as template JSON).
  The Information section derives name/format/dimensions/aspect/size/alpha/Lottie timing +
  reference count per selection via src/assets/assetInfo.ts (async probe, cached) - the model
  stays { path, data }. Pinned by e2e/assets.spec.ts.
- **AIPromptPanel**; **ExportPanel** (validation inline; remembers the last-picked target via
  model/prefs.ts). Below the zip targets it mounts **render/RenderPanel** — the Video & image
  section (MP4/WebM/PNG/sequence/ProRes via the render API) — ONLY when `isRenderConfigured()`
  (VITE_RENDER_API): unconfigured builds grow zero render UI, and ProRes/sequence gate on
  `needsSignIn` like AI does. Its measured In/Hold/Out breakdown re-runs when the template or
  sample data changes; job state lives in src/render/renderJobStore.ts (sessionStorage resume).
  Contracts in src/render/CLAUDE.md; specs in e2e/render.spec.ts (stubbed API).
- **PacketManager** (📦 topbar modal), **CommunityGallery** (🌐), **ModerationQueue** (🛡),
  **SyncStatus**, **Homebase** (signed-in dashboard: all saved graphics across packets, one
  store with 📦 Packets), **SettingsDialog** (AI key/model + workflow defaults from
  model/prefs.ts).

## Video editor shell (video/)

The PARALLEL editor world for the AI video project kind (VideoProject, src/model/videoTypes.ts).
App.tsx renders **VideoAppShell** instead of AppShell when docKindStore says 'video'; only the
wizard flips that switch. Layout: TSX code pane (lazy Monaco, **VideoCodeEditor**, syntax-only
TSX diagnostics from monacoSetup.ts) | splitter (model/videoLayout.ts `codeRatio` pref,
independent of the SPX dockable workspace) | right column =
**VideoPlayerFrame** (the player stage; the sandboxed Remotion Player iframe host) over a
tabbed panel: **VideoAiChatPanel** (the primary authoring surface - auto-runs the FIRST
generation when chat holds exactly one unanswered user turn, guarded PER PROJECT ID with a
retry button on failure; every AI result applies as ONE undoable applyProject; failed
validation keeps the previous working code and offers "Apply anyway"), **VideoContentPanel**
(the editable inputs the AI declared - the video Template Definition; each input becomes a shared
FieldDescriptor and renders the SHARED field row (fields/), the same one the SPX Data and operator
panels use, editing `project.inputs` live through store.setInputValue - so a non-technical user
changes the headline/accent/score/logo without touching TSX and the preview updates instantly
via the player host's set-props channel; the image control is an asset PICKER over the project's
uploaded assets by logical name - uploading itself lives in the Assets tab, which enforces the
manifest budget; per-field Reset comes from the shared row, "Reset all" from the panel. The panel
also shows inputs INFERRED FROM THE CODE (model/videoInputInfer.ts): any `fields.<key> ?? default`
the module reads but nobody declared, badged `code` - the code is the source of truth, so a pro
who hand-writes a field gets the same control the AI would have declared. A declared input wins
(it carries a label, select options, number bounds a fallback can't express); an inferred one is
adopted into project.inputs on its first edit, which is why store.setInputValue takes the whole
input, not just a key),
**VideoSettingsPanel**
(undoable patchSettings; duration edits in seconds, fps changes preserve seconds. Settings drive
the player and the renderer at once but NOT the composition's code, which was written against
whatever they were at generation time - so the project records that (`authoredFor`) and the panel
reports any DRIFT (videoTypes.ts settingsDrift: duration, fps, frame size, transparency) with a
one-click "update the code", which goes through store.requestAi -> the CHAT panel's one AI path,
so it lands as a normal turn and undoes like any other edit. The render preflight repeats the
warning. `authoredFor: null` = provenance unknown (the starter, or a pre-existing saved project):
warn about nothing),
**VideoAssetsPanel** (data-URL assets, 3 MB/asset hard cap - the render manifest budget; uploads
go through video/types.ts uniqueVideoAssetPath so an asset's LOGICAL NAME is settled once, into
the immutable path - adding or deleting another asset must never rename one, because the code and
image-input values point at that name. A few big assets can still exhaust localStorage: the save
fails LOUDLY (the shell's `video-autosave-failed` flag), never silently),
**VideoExportPanel** (mounts **VideoRenderPanel** when isRenderConfigured() - kind:'remotion'
manifests through the shared render service, with an upload-budget meter; plus the .tsx
source download). **SavedVideoProjects** = the 📁 My videos modal
(explicit saves; the current slot autosaves separately). The shell binds the same global
undo/redo keys as AppShell with the same Monaco/form-field guard. AI chat gates on
`needsSignIn` (hosted mode) exactly like AIPromptPanel; everything else stays open.

## Wizard (wizard/)

CreationWizard (Entry -> Category -> Template -> Fields -> Style -> Animation, persistent live
preview), draft.ts, WizardPreview, MiniPreview, steps/. Creating calls `variant.create(options)`
which generates the complete, commented template. FOUR entry cards: template, Create with AI,
video, blank.

The steps are driven by each variant's declared CAPABILITIES (model/wizard.ts): the Template
step filters the card grid with style/logo/line-capacity chips; the Fields step offers up to
`maxLines` text lines plus the logo toggle + custom upload on a `logo: 'optional'` design
(built-in slots show it checked and locked); the Style step has TWO size knobs (Graphic size ->
--scale, Text size -> --type-scale); the Animation step renders the slide family as ONE card
with a direction-of-travel picker. WizardPreview cancels pending lifecycle-demo timers when a
debounced srcdoc commits (a stale stop() must never blank the fresh document), pushes field
values from a latest-template ref, and gates the auto-entrance on `document.fonts.ready`
(capped) so a font choice shows on the entrance itself. Pinned by e2e/wizard-preview.spec.ts,
wizard-logo.spec.ts, and wizard-filters.spec.ts.

**Create with AI** (Entry card -> steps/AiStep, mode 'ai') is the MERGED describe/import step.
One drop zone accepts images AND an existing .html/.zip template. A dropped template parses
deterministically (model/importTemplate.ts) into a card with two actions: **"Open as code (no
AI)"** — the byte-faithful import (applyTemplate + Export panel, exactly the old Import entry;
it renders OUTSIDE the `needsSignIn` gate and must stay there — only the AI actions are an
account feature) — or **Convert** (provider.convertImport, guided by the prompt). Dropped
images become `GenerateContext.images` chips with a "Design around these with a catalog
template" escape that patches the draft and continues into the mode-'import' images ->
category -> TemplateStep flow (ImportStep is now that slim continuation only). The step
injects the harness's validator (`validateTemplate` + `benchTemplateRuntime` merged) into
every provider call, streams `onProgress` stages into the busy line, shows the route badge
(catalog design system / +flourish / custom) on the result card, and passes a grounded
result's `spec` back on refine so spec-level refinement re-assembles deterministically
(src/ai/CLAUDE.md).

The harness is ON BY DEFAULT, with the **"Use NoaCG harness (3 options)"** checkbox
(`AiSettings.useHarness`, default true — the benchmark showed it a clean win) still able to
turn it off. On → `generateAlternatives`: three directions, rendered as `[data-alt]`
option buttons; selecting one swaps the preview and STAGES the pick
(src/ai/preferences.ts); CreationWizard's `createFromAi` COMMITS it — the aggregated
counters become the design stage's subtle preference hint. Off → `generateRaw` (one-shot,
static validation only, no bench). Conversion of an imported template always runs the
validated conversion flow regardless of the checkbox. The default is pinned by
e2e/ai.spec.ts ("the harness checkbox is on by default").

**Video mode** (Entry card "Video or animation with AI" -> steps/VideoStep): prompt + duration/
aspect/fps/transparency + asset upload -> an INSTANT create (`createDefaultVideoProject`, the
brief seeded as chat[0]); generation runs in the video shell's chat, not the wizard. The step's
reopen strip lists saved videos plus a "Continue" chip for the autosaved current video project
(shown from the SPX shell). Creating/opening a video flips docKind to 'video'; every SPX create
path (template/AI/blank/import) flips it back to 'spx'.

**Sample data on create:** the wizard applies with
`applyTemplate(template, { resetSampleData: true })` so a new project starts from ITS field
defaults - plain applyTemplate (blocks, panels, AI) intentionally preserves typed sample values
for matching field ids. Don't drop the flag from the wizard path: the old template's values
would leak into the new graphic's fields.

## Auth UI (auth/)

useAuthState hook + authUi store + SignInDialog + SignInPrompt + AuthStatus avatar menu
(-> Homebase / Settings / Sign out). The gating pattern: read `useAuthState().needsSignIn` (true
only when a backend is configured AND the visitor is signed out) and render `SignInPrompt` /
call `useAuthUi().openSignIn(reason)` - never block the app. Signup is OPEN (migration `0006`
made the Before-User-Created hook permissive; restore the 0002 function body to re-close it to
the allowlist). No login wall, ever - see the root CLAUDE.md "Auth posture".
