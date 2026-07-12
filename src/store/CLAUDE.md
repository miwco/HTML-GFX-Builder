# src/store - templateStore contracts

Loaded alongside the root CLAUDE.md when working in this directory. Keep it accurate.

templateStore.ts (zustand) holds the template plus editor UI state.

- **applyTemplate(next, opts)** - THE mutation choke point: snapshots the previous template for
  undo. Blocks, AI, panels, gallery, and canvas gestures all flow through it.
  `opts.resetSampleData` (used by the wizard on Create) starts sample data from the NEW
  template's field defaults; plain applyTemplate intentionally preserves typed sample values for
  matching field ids. Don't drop the flag from the wizard path: the old template's values would
  leak into the new graphic's fields.
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
- **canvasGestureActive / setCanvasGestureActive** - true while a canvas gesture is in flight
  (inline edit, root/layer/scale drag; published by CanvasInteraction). AppShell's deferred
  Inspector auto-open checks it at fire time so the workspace never resizes under a gesture.
  UI state only - no history.
- **activePanel** (`SidePanel` type) - the side panel's tab: FIVE ids
  (data/control/style/ai/export). Motion is not a tab - it lives on the timeline.
