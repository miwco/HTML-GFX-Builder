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
  (the wizard shows Export after an import, Data after an Import Graphic create) - the docks key
  the reveal on `panelRevealNonce` (bumped by every setActivePanel call), so re-requesting the
  stored default still reveals, and mount never does. The topbar
  ◨/code toggles close-or-reveal those panels. Binds global Ctrl/Cmd+Z to undo() and
  Ctrl/Cmd+Shift+Z (+ Ctrl+Y) to redo() (skipped when focus is in Monaco or a form field).
  useIsMobile/useSplitter support the mobile and resizable layouts.
- **CodeEditor** - Monaco + change-highlight decorations + change dots on inactive tabs the last
  apply touched + hover explanations (the teach/ module registers its tooltips here; there is no
  Learn tab). Its toolbar also carries the **Comments** control (src/editor/, shared with the
  video shell's VideoCodeEditor): Normal / Dimmed / Hidden is a VIEW preference - comment spans
  come from Monaco's own tokenizer and are painted with DECORATIONS, so the code, the undo stack,
  the cursor and every export stay untouched, and hidden comments leave their blank line where it
  was. It reapplies on every model swap (each tab is its own model, and a language's tokenizer
  loads lazily - hence the bounded retry) and, in Hidden, temporarily reveals any comment holding
  the selection, a diagnostic marker, or a find match. Persisted in model/prefs.ts. Pinned by
  e2e/comments.spec.ts.
- **PreviewFrame** - the stage: the iframe + overlays live in a `.canvas-world` centred in the
  stage and translated by `pan`, scaled by fit × `zoom`. Zoom: the toolbar −/%/+ (the % resets
  to fit), Ctrl/Cmd+wheel (and trackpad pinch) toward the cursor, clamped 0.2–8×. Pan: HOLD
  SPACE and drag, a middle-mouse drag, or a plain wheel when zoomed in - all captured before
  the overlay, so a pan can only ever move the VIEW, never a document element. Space arms only
  while the pointer is over the stage (off it, Space stays the timeline's Play key) and never
  while a text field/Monaco has focus. Releasing Space restores the previous tool at once (as
  does losing window focus mid-drag). **spaceKey.ts owns who gets the key** — see below; the
  pan does not claim it and the timeline does not stand down, they both just ask. Because the overlay
  is sized `stageW × (fit×zoom)` and CanvasInteraction reads its live bounding rect, zoom and pan
  need NO coordinate changes there — the gesture math follows automatically (pinned by the zoom
  case in e2e/multi-select.spec.ts). Off-canvas VISIBILITY (a pasteboard so elements that start
  off-screen render) is a separate step — it needs the iframe to render past the canvas bounds.
  **pasteboard.ts owns HOW MUCH** margin: derived from the graphic's own authored motion (the
  largest px `x`/`y` keyframe), rounded up in steps so authoring doesn't re-fit the stage on
  every commit. Margin is not free — the stage fits the PADDED document, so a flat third of a
  frame on every side shrank the working canvas for the many templates that never leave it.
  Where the reach is unknowable the old flat pad stands: a legacy/unparsable region, MEASURED
  motion, or PERCENT travel (`xPercent`/`yPercent` moves a layer by a fraction of its own size,
  which the data does not carry). Pinned by e2e/pasteboard.spec.ts.
- **CanvasGuides**.
- **spaceKey.ts - WHO OWNS A KEY.** Several components listen on `window` for the same keys.
  They are SIBLINGS ON ONE NODE, so `stopPropagation` cannot reach across and the order they
  fire in is only the order they subscribed - which an unrelated `useEffect` dep can change.
  So no surface CLAIMS a contested key; each asks this module and acts only if the answer is
  its own. `spacePansCanvas()` is true when the CANVAS is the active surface, the pointer is
  over the stage, and nothing is being typed into; PreviewFrame arms the pan on it and
  StepTimeline plays when it is false. `activeSurface` (store) flips on a pointerdown on the
  stage or the timeline strip - panels and dialogs deliberately leave it alone, so a trip to
  the Inspector keeps whichever of the two you were in; it defaults to 'canvas'.
  `editorShortcutsLive()` gates every document-editing shortcut on "no modal, not typing", and
  `useModalGate(open)` is how a modal declares itself - **pass `open` explicitly for a surface
  that stays mounted and renders null when closed** (the wizard and the sign-in dialog both
  do), or the gate holds down for the whole session and silently kills every shortcut.
  Two rules worth keeping: a guard must answer on EVERY keydown including OS auto-repeat (a
  claim-based design covers only the first one, and a held key is the real gesture); and Space
  belongs to a focused button - the pan takes it anyway on purpose (clicking a stage tool
  leaves that button focused), play never does. Pinned by e2e/keyboard.spec.ts + the Space
  cases in e2e/import-canvas.spec.ts, which assert what did NOT happen.

## Canvas direct manipulation (Era 6)

- **CanvasInteraction** - always-on direct manipulation: drag the root -> nearest
  zone + residual nudge -> the SAME zoneDecls patch the Style panel writes; dblclick a visible
  #fN -> inline edit -> sample value + definition default via blocks/edit.ts setFieldDefault;
  corner handle -> live --scale preview, diagonal-aware, clamped 0.25-4. Every gesture commits as
  ONE undoable applyTemplate and jumps the editor to the changed tab, highlighted; the root is
  detected via model/structure.ts detectPrefix.
  CURSORS name the gesture IN PROGRESS, never one that is merely possible: hover is the plain
  arrow (the hover outline + name chip say what a click would select), an active move reads
  `move`, handles keep their resize arrows, an armed tool its own, and the HAND belongs to
  panning alone (PreviewFrame's `.panning` / `.panning-active` on the stage outrank
  everything while a pan is armed). The rotate handle therefore carries an inline-SVG rotate
  cursor - CSS has no keyword for one, and a hand there would say "drag me somewhere" for a
  control that turns in place. It is percent-encoded with `charset=utf-8` and single-quoted
  attributes; the raw `;utf8,<svg …>` form does NOT decode in Chromium, and a bad data URI
  falls back SILENTLY, which is why e2e/import-canvas.spec.ts loads the URI as an image
  rather than trusting the computed value.
  THE DESIGN UNIT (imported designs): `.{prefix}-art` and `.{prefix}-box` swap the keyframe
  scale/rotate handles for the ROOT's --scale handle. The artwork's size IS the composition's
  size - every placed field is `calc(Npx * var(--scale))` against it - so one --scale patch
  moves artwork and fields together, where a scale KEYFRAME on the artwork alone would leave
  every field behind. Keyframing its scale still lives in the Inspector's Properties tab.
  LAYER SCALE/ROTATE HANDLES (data-block, a single selected non-root layer): a corner scale
  handle + a top rotate handle on the selection box; dragging previews live via GSAP and, on
  release, keys `scale` / `rotation` at the playhead (keyframePlace + setKeyframe + spliceAnimData,
  ONE undoable apply, re-parked) - pivoting around the layer's transform-origin (the Inspector
  pivot). Escape springs it back. The root keeps its own --scale corner handle.
  THROUGH THE LENS: this file keyframes at the PLAYHEAD, and the playhead belongs to whichever
  timeline is open - so its `dataModel` is `lensRead(…, timelineTarget)` and every write folds
  back through `projectedJs` (blocks/timelineLens.ts), never raw `parseAnimData`/`writeAnimData`.
  Reading the raw document meant that, with a branch state's timeline on screen, a canvas drag
  wrote its x/y into the default path's step: the strip showed the branch, the keyframe landed
  on the walk, and nothing said so.
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
  never keys motion for them; catalog templates (mask divs without ids) never match. A single
  selected placed FIELD swaps the keyframe scale/rotate handles for a SIZE corner handle - a
  text line's font-size, or an image slot's wrapper box (aspect preserved) - one CSS patch on
  release (design, never a scale keyframe). A placed field whose element is HIDDEN (an empty
  image slot - setFieldValue display:none's the img) stays selectable/outlined/draggable: the
  rendered wrapper stands in via partScreenEl. KEYBOARD NUDGE (arrows, 1 px, Shift = 10) moves
  every selected layer: placed fields as placement CSS, other non-root layers on the keyframe
  channel (GSAP preview, x+y keyframes at the playhead); a burst commits as ONE undoable apply
  once the keys go quiet, Esc cancels. The timeline's keyframe-set arrows listen in the
  CAPTURE phase and preventDefault, so a selected keyframe set always beats the layer nudge
  (a diamond click usually leaves its layer selected too — only one may act). Pinned by
  e2e/import-graphic.spec.ts + e2e/canvas-keyframe.spec.ts.
  DIRECT GRAB + LOCKS (imported designs): a press on a PLACED field grabs it - selects it and
  starts its placement drag in ONE gesture, no select-then-drag round trip (the release then
  skips the climb, since that click already made its selection). Scoped to placed fields on
  purpose: their drag is a design decision costing one undo, while a keyframe layer's drag
  WRITES MOTION, so selection stays the deliberate step there and catalog templates are
  untouched. **partLocks.ts** owns what "locked" MEANS and which parts start that way, so the
  overlay and the Inspector can never disagree: store `partLocks` + `setPartLock` hold only
  EXPLICIT toggles, `partLocked()` falls back to `defaultPartLock()` for everything else. A
  locked part takes no drag, handle, or lasso but stays selectable by click and from the
  timeline - locking is about the POINTER, never editability. Exactly one part has a default:
  an imported design's ARTWORK (a full-bleed image UNDER every field, so unlocked it swallows
  every press meant for the text) - a press on BARE artwork then falls through to the root's
  zone drag, which moves the whole graphic. A locked ROOT gives up that zone drag too, so the
  press marquees over the graphic instead. Two surfaces toggle it: the **Inspector's identity
  header** (any part - the general home) and the **selection chip's padlock** (the artwork
  only, where the default is the surprising one). Locks are UI state, cleared on a
  whole-project swap.
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
  actions that already exist: dblclick-to-edit on text lines, corner resize on the root. On
  MOBILE (useIsMobile) the chip shows the label ONLY - every hint describes a pointer/keyboard
  gesture a touch screen doesn't have, and less guidance beats a wrong instruction. The chip
  is width-capped to the stage (maxWidth + a left clamp; label/hint ellipsize in CSS), so it
  can never overflow a narrow canvas. An
  eligible selected part's chip carries the "appears" select - offered on ANY editable data
  block, even one with no middle steps yet: existing steps are listed BY NAME and "appears in
  a new step »" creates and names the step itself (blocks/layerTimeline.ts createStepFromLayer,
  the same transform the Inspector and states graph use), which is how a freshly dropped asset
  becomes the graphic's next step in one click; moves between existing steps stay the
  blocks/stepAssign.ts patch. The chip swallows its own pointer events so the gesture layer
  under it never fires. The canvas also owns a CONTEXT MENU (right-click; the right button
  never starts a gesture): one action for now - "Add template graphic…", opening the same
  InsertTemplateDialog the Assets panel's button does (its open flag is the shared
  useInsertTemplateUi store; the dialog itself mounts once in AppShell).
- **TEXT TOOLS** (the stage toolbar's ↖ / T / boxed-T switch, PreviewFrame; placed-design
  templates only - the designBoxInfo gate, code-derived): store `canvasTool` arms them
  ('select' | 'text' | 'area-text'; T is the keyboard shortcut, Escape disarms). The T tool
  clicks POINT TEXT onto the artwork: one addPlacedLine at the click (born empty, shifted a
  line-height up so the click is the insertion point) + the inline editor opened on it
  immediately - committing empty (or Escape untyped) undoes the creation; Escape after typing
  commits (the Illustrator rule). The area tool DRAGS a rectangle that becomes a wrapping
  text box: addPlacedLine at the rect origin + setLineFit 'wrap' with the dragged width,
  pre-filled with lorem ipsum; its corner handle then resizes the BOX width (kind 'area' -
  text rewraps), not the font-size. Both create real fields through the Data tab's exact
  transform - next fN id, DataField, registry layer, timeline row, Inspector Style tab - and
  disarm back to Select after creating. While the inline editor is open, typing MIRRORS live
  into the preview element (type-on-canvas); cancel restores the template's text. Pinned by
  e2e/text-tools.spec.ts.

## Playout & timeline

- **PlayoutSimulator** - owns the running preview timeline `__activeTl`; settles the design view
  after every rebuild (progress(1, true) + a second update()); auto-replays on replayNonce;
  resolves the SCRUB phases, including `state:<group>:<state>` for a BRANCH timeline
  (blocks/timelineLens.ts `scrubPhase`): snap the group to the state's canonical predecessor
  (`branchRoute`, off animMachine's `canonicalPath`, which the interpreter's own
  `noacgCanonicalPath` mirrors) so the segment animates FROM the right look, then hold the
  runtime's `noacgEnterTimeline` paused. A branch used to send no scrub at all, so its timeline
  was authored blind - the playhead moved and the picture did not;
  handles the store's `event`/`snap` commands against the template's STATE MACHINE
  (docs/STATE_MACHINE_SCHEMA.md) - snapping with `{ timers: false }`, because a parked design
  view must never auto-advance - and, ONLY for a template carrying an EXPLICIT machine, renders
  the **event strip**: one button per authored operator event plus a current-state chip, each
  button DISABLED where the machine would drop the press (controlModel `isEventLegal`). It owns
  the iframe, so it runs the ONE 500ms poll of `noacgMachineState()` and publishes the pointers
  to store.machineGroups - the Control panel greys its own copy of the same buttons from there,
  and the rule lives once for the editor, the hosted page and the exported panel. An ordinary
  template shows nothing new. The four cue buttons stay THE lifecycle surface for both kinds of template;
  playNext owns each Continue's reveal tween as `__activeTl` step-N. resetGraphic clears GSAP
  inline props on the root subtree before every entrance so a prior exit never leaks its end
  state (e.g. a Blur exit's filter into a Slide entrance that never resets it). Honors the SPX
  `out` = N ms setting by scheduling the exit after the entrance settles + the hold - cancelled
  by any manual play/stop/next/scrub.
- **MachineGraph** - the NODE EDITOR (Phase 4, docs/STATE_MACHINE_SCHEMA.md §6a): the machine
  graph surface toggling with the step timeline in the bottom dock (the SEGMENTED
  `≡ Timeline | ◇ States` switch - both surfaces always visible, active highlighted;
  data-block templates only). Boxes carry the ▤ layer / ◇ graphic timeline badge
  (animMachine `timelineKind`, derived never stored - a timeline that only fires a lifecycle
  `call` counts as ◇, since its effect has no one layer to attribute it to; a POSE is a state
  that does nothing at all on entry). The card's description composes TWO facts - what
  entering does, and where the timeline lives (`stateContent`) - rather than gluing a kind
  word to a suffix, which is how a state came to say "entering plays nothing · its own inline
  timeline" in one breath; and it names a transition's ends the way the BOXES do, with the
  ids (which never follow a rename, by design) one hover away. The main lane's "+ state" is a
  three-way menu (pose / step on the path / ▤ timeline from layer via
  blocks/layerTimeline.ts, shared with the Inspector's Animations-tab button); Delete
  removes the selection (arrow / branch state / middle waypoint through the step mutators +
  the SPX `steps` sync) and a press on empty canvas (incl. the wires SVG) clears it;
  transition styles now include **Cut — instant** (duration/ease hidden for it). The play and
  final-stop edges are MATERIALISED lifecycle transitions (deriveMachine emits them,
  parseAnimData injects them into older explicit machines), so even a default two-step lower
  third has selectable entrance/exit arrows; their card shows the style rows only (trigger,
  event and Delete stand down — machineEdit refuses those edits), and an authored operator
  arrow into the final waypoint keeps the spine while the stop edge bows beside it, dashed.
  States as boxes (default path = the amber spine, badges match
  the timeline's cue markers, ▶ » ■ · ○ rest), transitions as labelled arrows, parallel groups
  as lanes, the preview's live state highlighted via the simulator chip's poll. Click a state
  = snap the preview there, parked; cards edit names (a path state renames through
  `renameStep` so the bound step label can never fork), trigger/event/timer, and TRANSITION
  STYLES (fade/push/wipe + duration/ease); port-drag draws arrows (same group only, minted
  unique event, selected for renaming — the persisted index is found via a serialize→parse
  round trip because the canonical serializer SORTS transitions); boxes drag to positions
  persisted as the additive `at` field. A machine-less template shows its DERIVED machine
  ("derived from the steps" chip) and the first edit materializes it in the same undoable
  apply. Waypoints stay the timeline's to add/delete (positional binding); the card links
  there ("Open its timeline" parks the playhead at the step) - and a BRANCH state's card
  offers "+ Add a timeline" (machineEdit `setStateTimeline`) or opens the one it has, swinging
  the dock onto it through store `timelineTarget` (blocks/timelineLens.ts). The step timeline
  then shows that ONE clip under a bar naming the state, with the path-only affordances
  (add/duplicate a step, the hold, the Play/Next/Stop cue) stood down. Every write is a
  blocks/machineEdit.ts mutator → `writeAnimData` → ONE applyTemplate; illegal edits (reserved
  or duplicate event, deleting the walk's only edge) return null and the control reverts.
  STRUCTURE: `.machine-graph` is a FRAME that fills the dock (`.timeline-dock` grows into the
  splitter's room via `flex: 1 0 auto`, so the surface is sized by the DOCK, never by the
  diagram); `.mg-viewport` inside it scrolls the `.mg-canvas`, and the OVERLAYS — the detail
  card, the foot chips, and the "+ state" menu (placed in frame coordinates by `framePoint`)
  — are siblings of the viewport, so they size against the dock and panning can't drag them
  away from what they describe. That is not cosmetic: while the diagram sized the surface, a
  two-state lower third made the card 104px around 211px of content, putting the whole
  Cut/Fade picker below an invisible fold, and hid every "▤ timeline from layer" entry.
  PROBLEM MARKS: a box whose state `validateMachine` has something to say about (animMachine
  `stateProblems` — unreachable, or a timer on a timeline that never ends) wears a coloured
  dot, and its card carries the finding phrased as the NEXT MOVE rather than the export
  report's verdict (`problemAdvice`). The finding used to reach only the Export panel, so a
  branch could carry a whole hand-built timeline and never be entered with nothing said where
  it was authored. `boxWidth` takes an allowance for the dot — without it a two-word state
  ellipsizes exactly when its name matters most. An off-path POSE now wears ○ like the rest
  state; it was previously the one box on the graph with no mark at all.
  Gotchas: the box button must NOT have `overflow: hidden` — it would clip the connect port
  half off the right edge and eat its pointerdown (the name span does its own ellipsis); and
  `toBeVisible()` is blind to overflow clipping, so anything about reaching a control is
  pinned by comparing rects (`boxInside` in e2e/machine-graph.spec.ts), never by visibility.
  Pinned by e2e/machine-graph.spec.ts.
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
  A selected PLACED FIELD (an imported design's line or slot - blocks/designLayout.ts
  placedLines, code-derived) additionally offers a **Style tab**: CONTENT rows (the field's
  operator label via blocks/edit.ts setFieldTitle - definition title + layer metadata, the
  registry renames the row/chip from it - and for text lines the shown text, the canvas
  inline editor's pattern: setFieldDefault + the live sample value), numeric X/Y placement, and
  for a text line the full typography set (font incl. bundled-face shipping, size, weight,
  color, anchor, line-height, tracking) plus a FIT group (Shrink / Wrap / Free + the slot
  width - what a long operator value does to the line), for an image slot its box - every
  control a deterministic patch of the field's OWN rules via designLayout (setLineFit,
  setLineTextStyle, placeLine,
  setSlotSize), one undoable apply per edit, colors patching live like the Style panel. The
  tab exists only while a placed field is selected (a non-placed selection falls back to
  Properties without clobbering the stored choice). A placed field's look is DESIGN, never
  keyframes - the same doctrine as its drag.
  The Animations tab leads with the layer's LIFECYCLE rows - **Appears** (with ▶ Play / an
  existing step by name / "in a new step »" via createStepFromLayer) and **Disappears** (with
  ■ Out / an early exit via animEdit setLayerHide) - the same transforms the canvas chip and
  the timeline block edges write, shown for the default path only. Below them it names which
  steps move the layer and holds the preset
  picker (preset + In/Out/Both + easing dropdown + per-direction duration + per-direction
  DELAY - a hold before the motion: the apply shifts the written keyframes later within the
  step and the layer holds its first pose through the wait, no keyframe knowledge needed +
  Apply - blocks/presetApply.ts); Apply is a CLEAN SWAP of the targeted direction's motion
  (it never blends with the previous preset), re-parks the preview at the playhead, and a
  target line under it names WHICH step each direction will actually edit. On an imported
  design (the placed-design shape, code-derived) Animations is the DEFAULT tab - the artwork
  brought its look, so per-layer motion is what the Inspector is for there; a manual tab
  choice afterwards sticks. Legacy templates get a
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
**SidePanel** is now the MOBILE surface only: a SEVEN-tab strip - **Inspector** leads, then the
six tool panels. The Inspector belongs there because the mobile stack has no docks, so the strip
is the only route to a panel, and the Inspector is where a SELECTED layer is edited (properties,
the placed-field Style tab, motion) - without it a phone can add fields but never style or
animate them. It renders RAW (it brings its own padding + scrolling, like the desktop dock's
renderPanel); the tool panels keep the shared `.panel-body`. A new selection does NOT auto-switch
the mobile tab (AppShell's reveal effect is desktop-only: on a phone a tab swap under the fold
would be a surprise, not a reveal). There is no Motion tab: motion editing lives on the timeline
(StepTimeline via TimelineDock) plus the Inspector. Pinned by the mobile cases in
e2e/layout.spec.ts.

- **SampleDataPanel** - sample values (shared field rows, `includeHidden`: a hidden field carries
  a real input value like a countdown's duration, so it must be testable here) + add-field. On a
  placed-design template (designBoxInfo, code-derived) a text/number add goes through
  blocks/designLayout.ts addPlacedLine and an Image add through addPlacedImageSlot - a REAL
  placed field on the artwork; on a standard-contract CATALOG template a text/number add goes
  through blocks/edit.ts addCatalogLine - a real line in the assembler's own mask idiom, right
  after the last one. Both gates are code-derived, and both select the new layer on arrival so
  the Inspector reveals. Long text, images off-design, and off-shape templates (fixed
  contracts, data-driven categories) keep the definition-only add.
- **ControlPanel** - operator view from the control/ engine (the same shared field rows, `live`
  on, hidden fields skipped as SPX skips them); live-drives the preview via store.sendControl ->
  simulator; renders the state machine's EVENT BUTTONS (controlModel eventButtons - labels/
  sections/payloads from `machine.controls`, payload values from sampleData via
  store.sendEvent), GREYED by `isEventLegal` against store.machineGroups exactly as a hosted
  control page greys them; downloads controlpanel.html; hosts the SHOWS section (model/shows.ts
  rundowns, aggregated show export, and - signed-in - publishing the hosted control page,
  docs/CONTROL_LAYER.md); adds the Google-Sheets live-data block.
- **HostedControlPage** - the `?control=<slug>` operator page (routed in App.tsx like ?chat=):
  one card per graphic off the stored panel spec - event buttons with structural-guard
  greying, shared staged fields (local echo + debounced control_stage), explicit take, state
  chip from the graphics' own reports, and the graphic's saved ENTRIES as a READ-ONLY
  switcher (published in the panel spec; picking one stages its values for every operator,
  ▶ Play entry takes and plays, a hand edit drops the selection - authoring stays in
  GraphicControlPage). Login-optional by design (the slug is the capability); offline builds
  answer the route honestly, which is also why the page's UI is covered by the maintainer's
  live checklist rather than the offline e2e suite (e2e/hosted-control.spec.ts pins the
  publish-side spec build).
- **StylePanel** - reads/writes the :root style contract (src/templates/CLAUDE.md): colors,
  font swap, zone re-anchoring, post-creation font import (an imported font still lands in
  template.assets and shows in the Assets panel's list).
- **AssetsPanel** - the template's bundled files as folder-grouped ROWS (images, video loops
  .webm/.mp4 - hard-capped at MAX_VIDEO_ASSET_BYTES since assets ride the saved template as
  data URLs - Lottie .json gated by looksLikeLottie, fonts): DnD file import (one addAssets =
  one undo step), rows are
  drag SOURCES (`application/x-noacg-asset`, exported as ASSET_DRAG_TYPE) for the canvas drop
  (CanvasInteraction) and for folder-header drops; folders are path segments (one level inside
  the bucket) - moving/renaming goes through blocks/assetOps.ts moveAsset, which rewrites every
  code reference in the SAME undoable apply, then patches stale sampleData values. Empty
  user-created folders are ephemeral component state on purpose (assets sync as template JSON).
  Each row carries a USAGE mark (reference count > 0: ✓ / n×) so it's obvious which assets the
  graphic actually places - re-dragging a used asset adds another element instance, never a
  duplicate file. The Information section derives name/format/dimensions/aspect/size/alpha/
  Lottie timing/video duration + reference count per selection via src/assets/assetInfo.ts
  (async probe, cached) - the model stays { path, data }. The header's **"✚ Template
  graphic…"** opens InsertTemplateDialog - the catalog browser in INSERT mode
  (blocks/templateInsert.ts): a picked variant's graphic joins the current project (namespaced,
  fields renumbered, :root scoped onto the inserted root, its whole step run merged - one undo
  step) with two choices: PLACEMENT (from the start / as a new next step) and "Its lines"
  (reveal together / step by step), the second building the donor with its line-by-line reveal
  so every step of it joins the host's default path. Both are code-derived from one donor build
  per card: templates needing their own runtime are greyed with the reason, and the lines choice
  stands down for a category whose designs have no stepped build at all. Pinned by e2e/assets.spec.ts, e2e/asset-workflow.spec.ts +
  e2e/template-insert.spec.ts.
- **AIPromptPanel**; **ExportPanel** (validation inline; remembers the last-picked target via
  model/prefs.ts). Below the zip targets it mounts **render/RenderPanel** — the Video & image
  section (MP4/WebM/PNG/sequence/ProRes via the render API) — ONLY when `isRenderConfigured()`
  (VITE_RENDER_API): unconfigured builds grow zero render UI, and ProRes/sequence gate on
  `needsSignIn` like AI does. Its measured In/Hold/Out breakdown re-runs when the template or
  sample data changes; job state lives in src/render/renderJobStore.ts (sessionStorage resume).
  Contracts in src/render/CLAUDE.md; specs in e2e/render.spec.ts (stubbed API).
- **CommunityGallery** (🌐), **ModerationQueue** (🛡), **SyncStatus**, **SettingsDialog**
  (AI key/model + workflow defaults from model/prefs.ts).

## Save + Home (docs/SAVED_CONTENT_MODEL.md)

PacketManager and the Homebase modal are RETIRED - packages are managed through Save and
Home, both routed (src/app/router.ts) so browser Back/Forward walk between surfaces.

- **save/SaveControls** - the topbar Save button + honest status (Not saved / Unsaved
  changes / Saving… / Saved / Save failed) + the ▾ menu (Save As, open saved) + global
  Ctrl/Cmd+S (capture phase, works inside Monaco, stands down under modals).
- **save/SaveDialogs** - the first-save/Save-As dialog (name + standalone / package / new
  package) and the unsaved-changes guard (Save & continue / Save first… / Discard /
  Cancel), mounted once per shell; both declare useModalGate.
- **home/HomePage** - `#/home[/<section>]` + `#/package/<id>`: recent work, the graphics
  library (search, open, 🎛 control panel, rename, duplicate, move-to-package, two-step
  delete), packages (create/rename/export via buildGraphicsZip/delete - deleting a package
  KEEPS its graphics as standalone), control panels, videos, brand looks (absorbed from
  PacketManager). Local-first, no auth gate - sign-in only adds sync.
- **home/GraphicThumb** - a card's THUMBNAIL: the real graphic rendered small through
  preview/composeDocument and parked at its settled on-air state (the PlayoutSimulator settle
  recipe - update, buildInTimeline().progress(1, true), update again; a template with no builder
  contract falls back to its own play(), since a card has no Play button beside it). A LIVE
  render, deliberately not a picture stored on GraphicDoc: no persisted-format change, no
  migration, nothing extra to sync, and it can never disagree with the template it previews.
  The iframe mounts only when the card scrolls into view (IntersectionObserver), so a library
  of a hundred graphics parses GSAP for the rows a user can actually see. The box is fixed-width
  and keeps the template's aspect, so a non-16:9 graphic keeps its shape. It is FRAMED ON THE
  GRAPHIC, not on the canvas (preview/frameGraphic.ts, shared with the wizard's picker cards):
  a lower third is a band across a fraction of a 1920×1080 frame, and at 144px the whole-canvas
  view was an unreadable smear of one. Measured after the settle, so nothing is framed mid-air.
- **home/GraphicControlPage** - `#/control/<graphicId>`: the saved graphic's operator
  panel, and the surface that AIRS (the editor's Rehearse tab is the preview-only twin) -
  live graphic + transport + machine event buttons (GREYED by controlModel
  `isEventLegal` against a 500ms poll of the graphic's own `noacgMachineState`, exactly as the
  editor's Rehearse panel, the event strip and the hosted page do — this surface shipped without
  it, so every button looked pressable whether or not the graphic would drop the press) + a
  STATE CHIP naming the graphic's current state (the fact the greying is judged against, so a
  button is never greyed without the surface saying why) + ENTRIES (named data
  rows: add/duplicate/rename/delete/select-active, ▶ Play with an entry, ★ make an entry
  the template's default data via setFieldDefault) + the downloadable controlpanel.html
  with entries baked in (control/controlPanelHtml.ts opts.entries renders an entry
  switcher). Entry mutations compose through a read-fresh `patch(cur => …)` - two edits in
  one tick must never overwrite each other. An entry's ✕ is ARMED (two-step, like Home's
  graphic delete): typed-in data with no undo behind it, on a row someone drives live.
- **AuthStatus** now routes 🏠 Home from the account menu (initials avatar fallback); the
  topbar's always-visible 🏠 Home button is the no-account door to the same place.

## Video editor shell (video/)

The PARALLEL editor world for the AI video project kind (VideoProject, src/model/videoTypes.ts).
App.tsx renders **VideoAppShell** instead of AppShell when docKindStore says 'video'; only the
wizard flips that switch. Every panel follows the project's ENGINE ('remotion' | 'hyperframes',
picked at creation): the code pane, the preview bridge, the validator, the render manifest, and
the source download all branch on it, while chat/Content/Settings/Assets stay one surface.
Layout: code pane (lazy Monaco, **VideoCodeEditor** - Composition.tsx with syntax-only TSX
diagnostics from monacoSetup.ts, or composition.html for a HyperFrames project; typing goes
through store.setSource) | splitter (model/videoLayout.ts `codeRatio` pref, independent of the
SPX dockable workspace) | right column =
**VideoPlayerFrame** (the player stage; sandbox="allow-scripts" iframe either way - the
prebuilt Remotion Player host driven by PlayerBridge, or the HyperFrames composed-srcdoc
driver driven by HyperframesBridge (src/video/hyperframes/); bridgeRegistry holds whichever
is mounted and the chat's validator narrows to its engine's kind) over a
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
**VideoExportPanel** (mounts **VideoRenderPanel** when isRenderConfigured() - the engine's
manifest kind ('remotion' compiledJs+inputProps, or 'hyperframes' composed documentHtml)
through the shared render service, with an upload-budget meter; plus the engine's source
download - the .tsx module, or a standalone composition.html with the bundled GSAP inlined
so it stays plug-and-play). **SavedVideoProjects** = the 📁 My videos modal
(explicit saves; the current slot autosaves separately). The shell binds the same global
undo/redo keys as AppShell with the same Monaco/form-field guard. AI chat gates on
`needsSignIn` (hosted mode) exactly like AIPromptPanel; everything else stays open.

## Wizard (wizard/)

CreationWizard (Entry -> Browse -> Fields -> Style -> Animation, persistent live preview),
draft.ts, WizardPreview, MiniPreview, steps/. Creating calls `variant.create(options)`
which generates the complete, commented template. FIVE entry cards: template, Create with AI,
video, Import graphic, blank.

**Browse** (steps/BrowseStep.tsx, mode 'template' only) is the FACETED template storefront
(docs/TEMPLATE_TAXONOMY_PROPOSAL.md §12) replacing the old Category -> Template pair: search
(alias-aware, src/templates/search.ts), optional programme family/format selects (RANKING —
"Best for X" / "Also works" sections, never exclusion), category tiles with live counts (only
categories with catalog content render), field-count buckets (range-intersection over the
reachable visible range), style-family chips, and the specialist facets (structure /
capabilities / placement-motion) under a More-filters disclosure. Filter state lives in
CreationWizard (`browseFilters`) so Back returns with filters intact; the setter is passed as
a REACT DISPATCH so chip toggles compose as functional updates (two clicks in one batch must
never overwrite each other). Zero results name no template dishonestly: the empty state
offers "remove the most limiting filter" (computed: the chip whose removal restores the most
results) and a Create-with-AI hand-off. Cards carry the strict info budget (category ·
subtype, top families, field summary from semantics, ≤3 capability badges, style family,
complexity), with everything the budget excludes - the full field schema, all formats,
structures, capabilities and motion - one ⓘ click away in the card's detail panel (a SIBLING
button of the card button, never nested; one panel open at a time). The footer's brand
toggle feeds `brandFamily` as browse CONTEXT, not a filter: the package's siblings rank
first, no chip appears, Clear-all leaves it alone, and a genuine programme match always
outranks it. MiniPreview mounts its iframe only when the card scrolls into view
(IntersectionObserver — the whole catalog can be on one grid now). On ≤768px the facet
controls collapse behind the `.wz-browse-drawer-btn` toggle (active-count badge; search,
active chips and results stay visible — closed by default via a matchMedia initial state,
and desktop CSS ignores the closed state entirely). The import-images
continuation (mode 'import') keeps the old ImportStep -> TemplateStep flow and indices; the
catalog flow's later steps sit one index earlier (`animStep`).

**Import graphic** (mode 'design', steps/ImportDesignStep + PrepareDesignStep +
PlaceFieldsStep + the shared AnimationStep) is a SETUP flow, not a second editor:
Start -> Design (drop the image - any raster format the browser decodes: PNG, JPEG, WebP,
GIF, AVIF, rejecting only a file with no intrinsic pixel size, since every downstream number
comes from that measurement; live preview from the moment it lands; Create is available from
here on - every later step is an optional stop) -> Prepare -> Text -> Animation -> Create.
The **Text step** (PlaceFieldsStep) places editable fields ON the artwork: T = click point
text, ⬚ = drag a wrapping area box; move/resize/Delete; per-field name, preview text, and
typography (family / size / weight / color / align / line-height / tracking) with a live
styled render on the placement canvas. Specs live in `draft.designFields` (DESIGN px) and
become REAL placed fields at build - draft.ts `withDesignFieldSpecs` runs addPlacedLine +
setLineTextStyle + setLineFit, so wizard placement, editor, preview, and export agree by
construction (browser-verified pixel-exact). The **FontPicker** (wizard/FontPicker.tsx,
searchable) offers the bundled OFL library, upload (woff2/woff/ttf/otf -> CustomFont,
embedded in template.assets + every export), and - Chromium only, permission-gated - Local
Font Access, where a picked installed font is EMBEDDED exactly like an upload so playout
never depends on the machine's fonts. The **Animation step** is the standard one
(imported-design's fade/slide/pop/blur cards + in/out direction + speed + easing + the
full-lifecycle demo).
The **Prepare step** carries the two artwork decisions: ERASE baked-in text (source-px rects
drawn on DesignPrepCanvas -> assets/eraseRegion flat-fill; flat verdicts apply immediately,
non-flat holds behind "Use it anyway"). Marks ACCUMULATE into `draft.designErases` - a design
usually has a name AND a title - each run against the artwork as it stands; removing one
REPLAYS the survivors from draft.designOriginal, which is what keeps fills from compounding
(a fill cannot be undone in place). The erase MEASURES the ink it removes, split into LINES,
and every line seeds a real field at create - the one amendment to "bare" - built from that
line's own bounds, cap height, top, and the edge it was set from, never from the loose
rectangle the user drew)
and the SCALING MODE (fixed default / horizontal 9-slice stretch with draggable guides + a
content-width demo slider that pushes sample text through WizardPreview's demoText prop into
the real emitted runtime; with stretch and no erase the PREVIEW build adds one demo line that
Create strips). The create hands off to the editor with the Data tab revealed
(setActivePanel('data') + the store's panelRevealNonce). Fields, styling, and motion all live
in the editor: the Data tab's placed add, the canvas gestures, the Inspector's Style/Animations
tabs. FieldsStep/StyleStep carry NO imported-design branches any more - design mode never
reaches them. Contract: docs/IMPORT_MVP.md; E2E: e2e/import-graphic.spec.ts +
e2e/import-prepare.spec.ts + e2e/import-stretch.spec.ts.

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

**Video mode** (Entry card "Video or animation with AI" -> steps/VideoStep): prompt + a
GENERATION-ENGINE picker (the VIDEO_ENGINES cards: Remotion preselected, HyperFrames tagged
Experimental) + duration/aspect/fps/transparency + asset upload -> an INSTANT create
(`createDefaultVideoProject`, the brief seeded as chat[0], the engine recorded on the
project); generation runs in the video shell's chat, not the wizard. The step's
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
(-> Home / Settings / Sign out). The gating pattern: read `useAuthState().needsSignIn` (true
only when a backend is configured AND the visitor is signed out) and render `SignInPrompt` /
call `useAuthUi().openSignIn(reason)` - never block the app. Signup is OPEN (migration `0006`
made the Before-User-Created hook permissive; restore the 0002 function body to re-close it to
the allowlist). No login wall, ever - see the root CLAUDE.md "Auth posture".
