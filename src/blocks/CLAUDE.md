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
  a step = name/duration/ease/reveals?/layers (durations and keyframe times are speed-relative:
  playback divides by `speed`; `reveals` names the layers that FIRST become visible in that
  step - activation is explicit data, never inferred from keyframes). A keyframe is
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
  duplicateStep (copies keyframes, NOT reveals; never lands after Out), renameStep,
  deleteStep (layers it revealed return to "appears with ▶ Play" with the channel's default
  motion), addStep (an empty content step just before Out).
- **animEval.ts** - the editor-side playhead resolver, deliberately the ONLY logic duplicated
  from the runtime interpreter (the preview runs the real one): within a step the first
  keyframe holds backward to the step start; between keyframes numbers interpolate LINEARLY
  (the eased in-between is the preview's job - at keyframe times the two agree exactly);
  strings hold the previous keyframe; a step without the track inherits the last keyframe
  value from an earlier step; null = the layer's design (CSS) state. Plus
  stepSeconds/stepOffsets/activationStep helpers.
- **animImport.ts** - the one-time legacy converter: parses a legacy marked region via
  timelineModel's parseTimeline and converts the choreography into AnimData (a `to()`'s from
  values come from the settled DESIGN_STATE table). Used for read-only rendering of legacy
  templates on the new timeline AND the explicit, undoable convert-on-first-motion-edit;
  templates the old parser cannot read stay hand-crafted - the importer never guesses.
- **presetApply.ts** - presets as keyframe generators DERIVED from their legacy emitters
  through the parity-proven importer (emit the preset's region against a scratch copy of this
  template, convert it, lift out the tracks - one choreography source, zero taste drift). A
  preset replaces ONLY the properties its donor animates in the targeted scope (a manually
  keyed rotation survives a Slide In); 'in' is layer-relative (it targets the step where THAT
  layer becomes active), 'out' always targets the final step, 'both' writes both -
  independently editable after. Scope 'all' = the whole graphic adopting the donor's full
  choreography, step duration, and ease (the classic whole-preset swap, as data) - skipping
  press-revealed layers, whose entrance belongs to their » press.

## The legacy patchers (animPatch / stepAssign / timelineModel)

These literal patchers still serve the categories that have NOT migrated to the data region
(info cards, starting soon, game timers, quiz, credits, tickers, infographics — lower
thirds, corner bug, and scoreboards create as data blocks), plus every SAVED legacy
template until its owner presses "use keyframes". Deleting them and the classic strip is
Phase 8 of docs/TIMELINE_V2_PLAN.md - deferred by design until the remaining categories
migrate (the blockers per category are documented in src/templates/CLAUDE.md and the plan's
status block).

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
