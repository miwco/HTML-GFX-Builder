# src/blocks - deterministic template transforms

Loaded alongside the root CLAUDE.md when working in this directory. Keep it accurate.

Everything here is a pure `(template) => template` transform that emits clean, commented code
(root non-negotiables 1, 2 and 5). The panels, canvas, and timeline are thin UIs over these
patchers.

## registry.ts - building blocks

BuildingBlock[] - there is no Blocks tab anymore; this is the offline AI stub's vocabulary. Pure
transforms grouped by a hierarchical `path` (e.g. `['Lower third']`, `['Animation','GSAP']`) with
a `primaryTab` (the tab to reveal after applying). Inserted elements are positioned in the
lower-left action-safe area via `positionForNewElement`, tagged `data-gfx`, and styled with
`textCssRule` (rich commented CSS). Animation is two tracks: **CSS** (`@keyframes` + class
applied to the element) and **GSAP** (tween injected into `play()/stop()`).

## edit.ts

Field/definition editing helpers: nextFieldId, addFieldToDefinition, setFieldDefault, …

## cssVars.ts

:root variable read/write helpers (the Style panel's patch layer).

## The Timeline v2 animation-data engine

Data-block templates carry `var NOACG_ANIM = { ... };` (strict JSON inside the braces) plus a
fixed interpreter in the marked ANIMATION region (emitted by
src/templates/shared/animRuntime.ts). These modules are the editor's side of that contract;
editor <-> runtime parity is pinned by e2e/anim-engine.spec.ts.

- **animData.ts** - the schema + the literal's read/write. AnimData = version/root/speed/steps;
  a step = name/duration/ease/reveals?/hides?/calls?/dynamics?/loops?/layers (durations and keyframe times
  are speed-relative: playback divides by `speed`; `reveals` names the layers that FIRST become
  visible in that step, `hides` the layers that LEAVE in it - the early-exit twin, its existence
  span ends there instead of at the final Out; both are explicit data, never inferred from
  keyframes). `loops` is `loops[selector][prop] = { repeat, yoyo?, repeatDelay? }` - a per-track
  loop (GSAP values: repeat -1 = forever, yoyo = breathe back and forth): the interpreter plays
  that track in its own repeating sub-timeline, so an ambient breath lives in the same data as
  every other track (the `layers` arrays are untouched - loops sit beside them). `calls` are
  lifecycle hooks - `{ time, call }` where `call` is a bare identifier
  naming a global template function (a clock engine's `startClock`/`stopClock`); the interpreter
  fires them via `window[name]` at their moment on the step's clock (no eval, ever), and settle
  suppresses them like any GSAP callback (docs/TIMELINE_V2_PLAN.md §3b). `dynamics` is the MOTION
  twin of `calls` - `{ time, build, target? }`, where `build` names a global BUILDER function that
  measures the DOM and RETURNS a GSAP tween/timeline the interpreter adds to the step
  (docs/DYNAMIC_MOTION_SCOPE.md). This is the ONLY way motion whose magnitude comes from the
  operator's content can live in the data at all - a marquee's track-width travel, a credits roll's
  content-height, one flip segment per item: no static keyframe number can hold a value that changes
  the moment the text does. The data holds a NAME and a TARGET, never code; the measured logic stays
  readable JS OUTSIDE the marked region (the category motion runtimes - see src/templates/CLAUDE.md),
  which is also why it survives export untouched. The timeline renders these READ-ONLY: you cannot
  meaningfully keyframe "travel by measured width", so the visual editor steps aside and names the
  builder instead of implying an affordance it doesn't have. A keyframe is
  `{ time, value, ease? }` - value is a number or a string (filter/clipPath interpolate as
  strings); `ease` is the ease INTO the keyframe, defaulting to the step's. `locateAnimData`
  brace-matches respecting JSON strings (a hand-edited block need not match the canonical
  layout); parsing is strict JSON + structural validation - anything off-shape degrades to
  "hand-crafted" honestly, never a crash. `serializeAnimData` is CANONICAL: fixed key order,
  fixed 2-space indentation, keyframes one per line, 3-decimal rounding - a fixed point
  (serialize(parse(serialize(x))) === serialize(x)) so a small visual edit only touches the
  lines it changed. `spliceAnimData` replaces ONLY the object literal; every other character
  of the file (interpreter, user code) is untouched.
- **animEdit.ts** - pure keyframe mutators; every editing surface routes through these, then
  spliceAnimData + one applyTemplate makes the edit real, undoable code. setKeyframe /
  deleteKeyframe (per property), moveLayerKeyframes / deleteLayerKeyframes (the aggregate
  diamond's drag/Delete), setKeyframeEase / setStepEase, and setLayerActivation - the data
  twin of the legacy press chain: moving between presses carries the layer's tuned reveal
  keyframes, entering/leaving the press world writes the channel's default motion; emptied
  presses disappear and default step names renumber. Steps as clips: resizeStep ('preserve'
  keeps keyframe timing - extending leaves settled air, shrinking clamps at the last keyframe
  so motion never silently truncates; 'stretch' = Alt scales times proportionally),
  setLayerHide - the early-exit twin: writes/clears a step's `hides` for a layer (clamped after
  its activation; hiding at Out clears it), driven by the timeline block's RIGHT edge.
  duplicateStep (copies keyframes, NOT reveals or hides; never lands after Out), renameStep,
  deleteStep (layers it revealed return to "appears with ▶ Play" with the channel's default
  motion), addStep (an empty content step just before Out).
- **filterTrack.ts** - the composed FILTER lens (docs/PRESET_MODEL_REVIEW.md gap 8). `filter` is
  ONE CSS property holding a LIST of functions, so the data keeps ONE `filter` track of composed
  strings (`blur(8px) brightness(1.6)`) - plain CSS can't keyframe its parts apart either. This
  module parses/composes that string so each function (blur, brightness, saturate, hueRotate,
  glow = a colourless centred drop-shadow) can be its own Inspector row. THE INVARIANT: every
  keyframe in a step's filter track must list the SAME functions in the SAME order - that is what
  lets the runtime tween `filter` as a plain string with NO interpreter special-case (GSAP matches
  the numbers positionally; a track whose keyframes disagree on shape jumps instead of
  interpolating). `normalizeFilterTrack` enforces it, filling a keyframe's missing functions with
  their identity (what they were contributing anyway). Write through animEdit's
  `setFilterComponent`, never `setKeyframe('filter', …)` directly - it resolves the OTHER functions
  at that moment first, so editing brightness never silently resets a blur that was mid-tween.
  CONSEQUENCE, by design: filter functions SHARE a keyframe (the diamond stamps them all at once).
- **animEval.ts** - the editor-side playhead resolver, deliberately the ONLY logic duplicated
  from the runtime interpreter (the preview runs the real one): within a step the first
  keyframe holds backward to the step start; between keyframes numbers interpolate LINEARLY
  (the eased in-between is the preview's job - at keyframe times the two agree exactly);
  STRINGS interpolate too when both keyframes have the same shape (the numbers inside them lerp
  in place - `blur(0px) brightness(1)` -> `blur(8px) brightness(1.4)`), which is what GSAP does at
  runtime, so the Inspector tracks the preview instead of stepping; written generically, so
  clipPath (mask-wipe) benefits identically. Differently-shaped strings have no meaningful
  in-between and hold the previous keyframe; a step without the track inherits the last keyframe
  value from an earlier step; null = the layer's design (CSS) state. A LOOPING track folds the
  query time back into one pass (loopedTime: GSAP repeat/yoyo/repeatDelay math), so the
  Inspector number tracks the repeating preview. Plus
  stepSeconds/stepOffsets/activationStep/hideStep helpers (hideStep = the step a layer leaves,
  its `hides` step else the final Out).
- **animImport.ts** - the one-time legacy converter: parses a legacy marked region via
  timelineModel's parseTimeline and converts the choreography into AnimData (a `to()`'s from
  values come from the settled DESIGN_STATE table). `parseTimeline` also reads `tl.call(fn)`
  hooks with their resolved positions (parsePhase walks tweens + calls in one document-ordered
  pass; a call never shifts a tween's INDEX, so the legacy patchers are untouched), and the
  importer attaches them to the enter/out step as speed-relative `calls` - this is what lets
  game timers flip to data blocks. It also reads a repeating tween's loop (repeat/yoyo/
  repeatDelay) and writes a step `loop` when the tween's values are finite LITERALS (a breathing
  pulse - this is what lets STARTING SOON flip); a DOM-measured loop (a marquee's `x:-scrollWidth`)
  or a nested-timeline loop written INLINE fails the phase's `loopsConvertible` gate and the whole
  template stays legacy. It also reads `tl.add(builderName(target))` as a `dynamics` segment
  (parseTimeline's `TimelineDynamic`) - which is what unblocked TICKERS and CREDITS: their presets
  no longer inline the measured math, they call a named builder that lives outside the region, so
  the region parses and the measured motion rides across as data. A `tl.add(...)` in any OTHER
  shape (a bare local timeline variable) fails `dynamicsConvertible` and the template stays legacy -
  the importer can carry a NAME, it cannot lift arbitrary measured JS out of a hand-written
  buildInTimeline, and it never guesses (docs/DYNAMIC_MOTION_SCOPE.md §8.1 - the ratified reason
  Phase 8 keeps a read-only legacy renderer rather than deleting the classic strip outright).
  Neither calls nor dynamics shift a tween's INDEX, so the legacy patchers are untouched.
  Used for read-only rendering of legacy templates on the new timeline AND the explicit, undoable
  convert-on-first-motion-edit; templates the old parser cannot read stay hand-crafted.
- **presetApply.ts** - presets as keyframe generators DERIVED from their legacy emitters
  through the parity-proven importer (emit the preset's region against a scratch copy of this
  template, convert it, lift out the tracks - one choreography source, zero taste drift).
  Applying a preset is a CLEAN SWAP (ratified): the targeted layer's tracks in that direction's
  step are cleared first, then the donor's are written - switching presets never leaves the
  previous preset's (or a hand-keyed) track behind. The Inspector passes an easing (resolved to
  a GSAP pair, stamped onto the written keyframes so it never disturbs a shared step) and an
  optional per-direction duration (sets the target step's length and scales the donor keyframes
  to fit). 'in' is layer-relative (it targets the step where THAT layer becomes active), 'out'
  always targets the final step, 'both' writes both - independently editable after. Scope 'all'
  = the whole graphic adopting the donor's full choreography and the chosen/donor step duration
  and ease - skipping press-revealed layers, whose entrance belongs to their » press; it also
  swaps the target phase's step `calls` for the donor's (a clock preset carries its
  startClock/stopClock) and its `dynamics` for the donor's (a ticker preset carries its measured
  builder), both scaled to the settled duration. Per-layer applies never touch calls or dynamics -
  they are step-level, not layer motion. Because every builder of a category ships in every template
  of it (a ticker carries BOTH tickerMarquee and tickerFlipCycle), swapping the motion preset of a
  measured category is a PURE DATA EDIT - one `build` name - and nothing outside the marked region
  is rewritten, which is what the marker contract requires (docs/DYNAMIC_MOTION_SCOPE.md §8.2).

## The legacy patchers (animPatch / stepAssign / timelineModel)

These literal patchers still serve the categories that have NOT migrated to the data region
(info cards, quiz, infographics — lower thirds, corner bug, scoreboards, game timers, starting
soon, TICKERS and END CREDITS create as data blocks), plus every SAVED legacy template until
its owner presses "use keyframes". Phase 8 of docs/TIMELINE_V2_PLAN.md retires them - deferred by
design until the remaining categories migrate (the blockers per category are documented in
src/templates/CLAUDE.md and the plan's status block).
RATIFIED (docs/DYNAMIC_MOTION_SCOPE.md §8.1): Phase 8 removes the classic strip's EDITING patchers
(timelineModel's splitTween/patchTweenTiming/… - the bulk of the code) but KEEPS a minimal
read-only view. A saved template whose measured motion is hand-written inline can never be
auto-converted (the importer refuses it rather than guessing), and silently regenerating it would
discard the owner's tuning - which "code is the single source of truth" forbids. So it must still
render truthfully somewhere; converting stays an explicit, undoable user action.

## animPatch.ts - the marked ANIMATION region

The classic timeline strip only ever touches the marked region
(`/* == ANIMATION … == */ … /* == END ANIMATION == */`) and its three knob variables
(`animSpeed`, `easeIn`, `easeOut`); user code outside the markers is never modified. The
splicers REFUSE a NOACG_ANIM data region (they return the JS unchanged - data templates go
through the engine above).

- `readAnimationInfo` reads per-phase "// In preset:" / "// Out preset:" comments, falling back
  to "// Preset:".
- `swapAnimationPhase(js, id, cfg, 'in'|'out'|'both')` splices two emitted regions at the
  buildOutTimeline boundary - steps code travels with the IN phase.
- Presets are per-category (`presetsForType`); the root prefix is detected via
  model/structure.ts (hyphen-safe). Preset/steps swaps re-emit the region (undoable).
- The steps toggle only shows for line-based categories (lower thirds, info cards, scoreboards,
  corner bug) - continuous, clock, and data-driven formats hide it.

## stepAssign.ts - "appears on press"

`changePartPress` is the ONE appears-on-press transition, shared by the timeline gutter's menu
and the canvas chip. On a data-block template it routes through animEdit's
`setLayerActivation` (plus the SPX steps re-sync), same PressChange shape out. On a legacy
region: entrance->press and press->entrance re-emit the IN phase via `applyStepChain`;
press->press stays the tuning-preserving `patchStepRegroup` literal patch.
Blocks (`data-gfx` + id, OUTSIDE the root) are assignable too - the emitted outside gate hides
them from first paint (steps block, DOM-ready guarded) and `patchOutsideExit` keeps ONE surgical
buildOutTimeline fade line in sync at the animPatch swap choke points, so they leave with the
exit without resetting out-phase tuning.

## timelineModel.ts - the classic timeline's model + patchers

`buildOverview` builds the cue-segmented overview that TimelineView renders (see
src/components/CLAUDE.md), plus the surgical patchers the classic strip edits with:
`splitTween`, `patchTweenTiming`, `patchTweenEase`, `patchStepEase`, `patchTweenVars` /
`insertPartTween` (enters-from), `patchTweenToVars` / `insertPartOutTween` (leaves-to), and
`setObjBlur` (blur's filter-string read/write). Its `parseTimeline` is also the reader
animImport.ts converts legacy regions through.
