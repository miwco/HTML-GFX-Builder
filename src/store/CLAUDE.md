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
- **setTsx** - manual typing: NO history snapshot (Monaco native undo while focused),
  clears `future`.
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
- **sendControl** - the Control panel live-drives the preview through the simulator.
- **selectedParts / selectedPart** - the SHARED SELECTION (multi since the interaction
  model, docs/TIMELINE_INTERACTION_MODEL.md): an ordered list of TemplatePart selectors the
  canvas, the timeline, and the Inspector all highlight; selectedPart is the PRIMARY
  (first) and every setter keeps the two in sync. setSelectedPart replaces, setSelectedParts
  replaces wholesale (the lasso), toggleSelectedPart is shift-click. UI state only - no
  history, never written into the template.
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
- **activePanel** (`SidePanel` type) - the side panel's tab: FIVE ids
  (data/control/style/ai/export). Motion is not a tab - it lives on the timeline.
