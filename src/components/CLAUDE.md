# src/components - the React app

Loaded alongside the root CLAUDE.md when working in this directory. Keep it accurate. The
store-side halves of these contracts are in src/store/CLAUDE.md; the code patchers they call are
in src/blocks/CLAUDE.md.

## Shell & editor

- **AppShell** - the workspace layout. code-left mode: code on the left; the RIGHT REGION
  stacks the preview row (stage + timeline | Inspector) over the FULL-WIDTH tool panels -
  the Inspector column is exactly as tall as the preview block (its content scrolls within),
  so no dead corner sits under it and the panels get the whole width beside the code column.
  preview-top mode: full-width preview row (stage | Inspector) over a code | panels row.
  The stage's aspect-ratio comes from the template resolution. `inspectorRatio` is a
  fraction of the WORKSPACE width in both modes (code-left converts it to a row-relative
  fraction when rendering). A NEW selection (any surface) auto-opens a collapsed Inspector -
  DEFERRED half a second past the double-click window: any new pointer press cancels the
  pending open and a live canvas gesture (store canvasGestureActive) skips it at fire time,
  so the workspace never resizes between the two clicks of a text double-click or under a
  drag (e2e/inline-edit.spec.ts pins this). An explicit ◨ collapse holds while the selection
  stays the same. Binds global Ctrl/Cmd+Z
  to undo() and Ctrl/Cmd+Shift+Z (+ Ctrl+Y) to redo() (skipped when focus is in Monaco or a
  form field). Desktop layout modes + splitters persist via model/layout.ts;
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
  CANVAS POSITION KEYFRAMING (docs/TIMELINE_INTERACTION_MODEL.md, amendment 3): on a
  data-block template, dragging any SELECTED non-root layer moves the WHOLE selection (layers
  contained in another dragged layer are excluded - the parent's transform carries them) and,
  on release, ONE undoable apply writes each layer's x/y keyframes at the parked playhead -
  the drag itself arms, no Inspector setup. Live GSAP x/y preview while dragging (the same
  animEdit + spliceAnimData path the Inspector edits through, re-parked after the rebuild);
  Escape springs everything back. The root keeps the zone drag, unselected layers don't drag
  on their own, and legacy templates keep the classic gestures exactly. Pinned by
  e2e/canvas-keyframe.spec.ts.
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
  timeline surface per template: a NOACG_ANIM data region gets the clip-style STEP TIMELINE
  outright (the classic strip's literal patchers cannot read it); a legacy region keeps
  TimelineView, with a '⧉ new timeline' peek chip and an undoable '◆ use keyframes' conversion
  (blocks/animImport.ts + the animRuntime writer).
  The step timeline's vocabulary: a time ruler with the operator's cue markers (▶ » ● ■) at
  every boundary; step CLIPS - right-edge resize (default PRESERVES keyframe timing: extending
  leaves settled air, shrinking clamps at the last keyframe; Alt-drag STRETCHES times
  proportionally), context menu Duplicate/Rename/Delete + the step's default ease, »+ adds a
  step, a hold popover edits the SPX `out` setting, a speed select scales everything; LAYER
  ROWS - every registry part gets a row - with aggregate keyframe diamonds, a ▸ caret that
  EXPANDS the layer into per-property sub-rows (each track's own diamonds; drag/Delete/ease
  scoped to that property via moveKeyframe/deleteKeyframe/setKeyframeEase's prop arg), and a
  LAYER STATE BLOCK: the existence span (activation step -> the end of Out) with the
  keyframed entering/exiting phases emphasized - its LEFT edge drags between step boundaries
  as the same activation move the gutter/chip make (no right-edge trim until the `hides`
  model extension exists). KEYFRAME SETS: click selects a diamond, shift-click builds a set,
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
  drag-scrub the value, blur is the one non-transform (its keyframes live on `filter` as
  'blur(Npx)'), and arming BOTH Position X and Y also unlocks the canvas position-keyframe
  drag (see CanvasInteraction). The Animations tab names which steps move the layer and holds the preset
  picker (preset + In/Out/Both + easing dropdown + per-direction duration + Apply -
  blocks/presetApply.ts); Apply is a CLEAN SWAP of the targeted direction's motion (it never
  blends with the previous preset), and re-parks the preview at the playhead. Legacy templates get a
  read-only shell (the timeline's convert chip arms editing). Its column lives in both
  desktop layout modes with a splitter + the topbar ◨ Inspector toggle (layout prefs
  inspectorRatio/inspectorCollapsed); it defaults open only on wide screens (>= 1500 px),
  and any NEW selection auto-opens it (an explicit collapse holds while the selection is
  unchanged - see AppShell).
- **TimelineView** - the classic collapsible strip under the preview; since Timeline v2 it
  serves LEGACY-REGION categories only (data-block templates get StepTimeline via
  TimelineDock, and lower thirds now create as data blocks). MOMENT CARDS
  `▶In · »1 · »2 · »+Step · ●On air · ■Out` (step cards numbered by PRESS; cue subtitles
  aria-hidden - getByRole('▶ Play') must stay unique in specs) over the CUE-SEGMENTED OVERVIEW
  (blocks/timelineModel.ts buildOverview): ONE strip, all sections side by side, each on its own
  real local clock (widths = duration × zoom; zoom +/- buttons; fit once per template.name), the
  hold a fixed hatched break, registry-part rows spanning every section (multi-target tweens
  expand onto member rows at their stagger offsets; set()-only rows drop).
  Every bar edits in place AND independently: dragging a member of a joint multi-target tween
  SPLITS it per target first (splitTween) so only that layer retimes; bars resize from BOTH
  edges (left = start with the end pinned); dragging any eligible bar across sections moves WHEN
  the part appears (entrance bar -> » press = assign, reveal bar -> entrance = unassign - all
  through stepAssign.changePartPress; section bodies + cards are drop zones; dragged bars get
  pointer-events:none so hit-testing sees through).
  The gutter has each part's "appears on press" menu + the selected moment's ease chips
  (patchTweenEase/patchStepEase). Each part row's ▸ arrow opens the PHASE-AWARE transform
  drawer (X/Y/scale/opacity/rotation + blur): on ▶In it edits ENTERS-FROM (in tween
  from-values settling to identity - patchTweenVars, insertPartTween for partless layers); on
  ■Out it edits LEAVES-TO (out tween to-values - patchTweenToVars, insertPartOutTween;
  opacity never auto-stripped so the exit still fades). Blur is the one non-transform
  (serializes to filter:'blur(Npx)' via setObjBlur). The root never gets a drawer;
  press-assigned parts have none on In but do on Out (leaving is independent of entering).
  THE STRIP IS THE ONE MOTION SURFACE for legacy templates (the Motion side-tab is retired):
  the selected ▶In/■Out card's inspector row holds that phase's preset picker + easing choice
  (swapAnimationPhase / setAnimKnob - phase-correct halves per the easing doctrine; the Out
  card names presets in their exit direction, Blur in -> Blur out), the header holds the
  animSpeed knob, and the selected ●On air card's note edits the SPX `out` setting
  (until-Stop / auto-out N ms / stays - synced into the definition like withStepsSetting).
  ●On air = a pseudo-card (phaseId 'hold'); clicking it parks on the settled look. »+Step
  disables with a tooltip reason. An unparsable marked region gets an honest one-liner PLUS a
  start-over preset select (blank/imported templates get no strip); a 'both' swap re-emits the
  whole region and brings the timeline back. One undoable apply + auto-replay per edit - the
  code always the truth. Row LABELS are the shared-selection handles: clicking one (or a bar,
  without dragging) selects that element on the canvas too (store selectedPart); the selected
  row washes amber.

## Panels (SidePanel: five tabs - Data / Control / Style / AI / Export)

There is no Motion tab: motion editing lives on the timeline under the preview (StepTimeline
or TimelineView via TimelineDock) plus the Inspector.

- **SampleDataPanel** - sample values + add-field.
- **ControlPanel** - operator view from the control/ engine; live-drives the preview via
  store.sendControl -> simulator; downloads controlpanel.html; adds the Google-Sheets live-data
  block.
- **StylePanel** - reads/writes the :root style contract (src/templates/CLAUDE.md): colors,
  font swap, zone re-anchoring, post-creation font import.
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

## Wizard (wizard/)

CreationWizard (Entry -> Category -> Template -> Fields -> Style -> Animation, persistent live
preview), draft.ts, WizardPreview, MiniPreview, steps/. Creating calls `variant.create(options)`
which generates the complete, commented template.

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
