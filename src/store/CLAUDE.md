# src/store - store contracts

Loaded alongside the root CLAUDE.md when working in this directory. Keep it accurate.

Three stores: **templateStore** (the SPX editor - template + UI state), **videoProjectStore**
(the parallel AI-video editor), and **docKindStore** (which shell App.tsx renders; persisted
via model/docKind.ts). The SPX and video stores are fully parallel - neither imports or
mutates the other; only the wizard flips docKind.

## videoProjectStore.ts

Holds ONE VideoProject + the video editor's UI state, mirroring templateStore's contracts:

- **applyProject(next)** - the undoable choke point (30-cap history). AI results bundle
  tsx + motionPlan + chat turns into ONE snapshot so undo reverts them together.
- **patchSettings / addAsset / removeAsset** - undoable single applies.
- **setInputValue(key, value) / resetInputs** - edit the editable inputs (the video Template
  Definition). Consecutive edits to the SAME key COALESCE into one undo checkpoint (a colour
  drag, a headline typed char by char) via a module-level `inputEditKey`; every other mutator
  calls `resetCoalesce()` so the next field edit starts fresh. resetInputs restores every
  value to its default in one checkpoint. The Content panel edits live (VideoContentPanel);
  the preview updates instantly through the player host's set-props channel (no recompile).
- **setSource** - manual typing into the project's live source field (`tsx` or `html`,
  whichever the engine reads - model/videoTypes.ts withVideoSource): NO history snapshot
  (Monaco native undo while focused), clears `future`.
- **appendChat / dropLastChat** - optimistic chat turns without history spam; dropLastChat
  rolls back a failed send.
- **loadProject** - whole-document replace (wizard create / reopen): clears history.
- **autosave** - 800 ms-debounced subscription -> saveCurrentVideoProject; a quota failure
  sets `autosaveFailed` (the shell warns - never lose video work silently).
- **busy** - the in-flight AI stage label; blocks concurrent sends.
- **replayNonce / previewError / activePanel** - UI state, no history.

## templateStore.ts

templateStore.ts (zustand) holds the template plus editor UI state.

- **applyTemplate(next, opts)** - THE mutation choke point: snapshots the previous template for
  undo. Blocks, AI, panels, gallery, and canvas gestures all flow through it.
  `opts.resetSampleData` (used by the wizard on Create) starts sample data from the NEW
  template's field defaults; plain applyTemplate intentionally preserves typed sample values for
  matching field ids. Don't drop the flag from the wizard path: the old template's values would
  leak into the new graphic's fields.
- **baseline / resetToBaseline()** - `baseline` is the pristine template as the project was
  created/imported/opened; every whole-project swap (applyTemplate with `resetSampleData`)
  captures it, and it persists in the SavedProject (model/project.ts) so a reload keeps a real
  Reset target (pre-baseline projects fall back to the loaded template). `resetToBaseline()`
  restores it through applyTemplate (ONE undoable apply) + resetSampleData. Distinct from
  `resetToDefault()` (a blank createDefaultTemplate, unused in the UI). The topbar `↺ Reset`
  button calls it behind a confirm.
- **undo() / redo()** - undo() restores the snapshot and pushes the undone state onto the
  `future` stack; redo() re-applies from it. Any NEW edit (apply, patchCss, manual typing)
  clears `future` - the classic undo-tree cut. Global Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z
  (+ Ctrl+Y), bound in AppShell, unless focus is in Monaco or a form field.
- **setHtml/setCss/setJs** - editor edits; editing HTML re-parses the definition so
  `fields`/`settings` stay in sync. The preview rebuilds on a ~350 ms debounce.
- **lastChange** - per-tab changed-line ranges from every apply (drives the editor's
  change-highlight decorations).
- **replayNonce** - motion applies (timeline/Inspector edits) auto-replay via PlayoutSimulator.
- **patchCss** - Style-panel patches: highlight without history spam.
- **sendScrub** - timeline view -> simulator pauses the preview's in/out timeline at a time.
- **sendControl** - the Control panel live-drives the preview through the simulator
  (update/play/stop/next). **sendEvent(name, payload?) / sendSnap(assignments)** are its
  state-machine twins (docs/STATE_MACHINE_SCHEMA.md): dispatch one operator event (the optional
  flat {field: value} payload lands only if the machine's structural guard accepts it), or enter
  states INSTANTLY - `null` assignments = every group to its initial, the VISUAL half of reset
  (the data half is resetSampleData; the two are never conflated). Both ride the same
  `controlCommand` nonce and are no-ops on templates without the machine runtime; the preview
  snaps with `{ timers: false }` so a parked design view never auto-advances.
- **selectedParts / selectedPart** - the SHARED SELECTION (multi since the interaction
  model, docs/TIMELINE_INTERACTION_MODEL.md): an ordered list of TemplatePart selectors the
  canvas, the timeline, and the Inspector all highlight; selectedPart is the PRIMARY
  (first) and every setter keeps the two in sync. setSelectedPart replaces, setSelectedParts
  replaces wholesale (the lasso), toggleSelectedPart is shift-click. UI state only - no
  history, never written into the template.
- **partLocks / setPartLock** - EXPLICIT canvas locks by part selector. A locked part takes no
  direct-manipulation gesture (drag, handle, lasso) but stays selectable by click and from the
  timeline. Only user toggles live here; a part with no entry follows the canvas's own default
  (an imported design's artwork starts locked - see src/components/CLAUDE.md). UI state, no
  history, never in the template; CLEARED on a whole-project swap, because part selectors
  repeat across projects.
- **playhead / setPlayhead** - the step timeline's parked playhead `{ step, t }` (step index +
  local time in effective seconds). UI state only - no history; the Inspector stamps
  keyframes at it.
- **addAsset / addAssets / removeAsset** - undoable in-place snapshots (NOT applyTemplate:
  an asset add must not re-parse the definition, close the gallery, or repaint the change
  highlight). `addAssets` batches a multi-file import into ONE history slot; `addAsset`
  delegates to it. Undo/redo restore whole-template snapshots, so assets travel with them.
- **canvasGestureActive / setCanvasGestureActive** - true while a canvas gesture is in flight
  (inline edit, root/layer/scale drag; published by CanvasInteraction). AppShell's deferred
  Inspector auto-open checks it at fire time so the workspace never resizes under a gesture.
  UI state only - no history.
- **activePanel** (`SidePanel` type) - the mobile strip's tab AND the desktop docks' "reveal
  this panel" signal: SEVEN ids (inspector/data/control/style/assets/ai/export - a subset of
  model/layout.ts's PanelId; `code` is not a tab). Motion is not a tab - it lives on the
  timeline.
  **panelRevealNonce** bumps on EVERY setActivePanel call - the docks key their reveal effect
  on the nonce, not on the id changing, so re-requesting the stored panel still reveals it
  (the Import Graphic wizard revealing the default 'data' tab is the case that needs this).
