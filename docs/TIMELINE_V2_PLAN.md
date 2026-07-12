# Timeline v2 — the step timeline

**Status: phases 1-7 LANDED (2026-07-11), plus the lower-thirds creation flip and a
CapCut-conventions polish pass (playhead cap + auto-follow scroll, deep zoom, per-keyframe
and per-step ease menus, ◀◆▶ keyframe navigation, label drag-scrubbing). A follow-up round
added the CapCut flagship move - dragging a selected, position-armed layer on the CANVAS
keys x/y at the playhead (e2e/canvas-keyframe.spec.ts) - selection auto-opening the
Inspector, and the workspace rework: in code-left mode the tool panels span the full width
under the preview + Inspector row, and the step timeline gained its larger editing scale
(28px rows, 12px labels; the classic strip keeps its compact scale), then the timeline
refit-on-resize + density-aware labels, and the second migration wave: CORNER BUG and
SCOREBOARDS create as data blocks (convertToDataRegion in shared/standard.ts). Phase 8
(deleting the literal patchers and the classic strip) is DEFERRED BY DESIGN until the
remaining categories migrate off the legacy region. The migration audit corrected the
original "standard contract" assumption: STARTING SOON and GAME TIMERS embed
tl.call(startClock/stopClock) inside the region — the keyframe model has no call
representation and the importer silently drops them, so they need a lifecycle-hook design
first; QUIZ's Continue is wrapper-driven (next() → revealAnswer, settings.steps='2' with
no data step) — the steps derivation would rewrite steps to '1' on the first edit and
break the reveal, so it needs a wrapper-steps representation; credits/tickers/infographics
still need the loop representation. INFO CARDS flip LAST of all: they host the classic
strip's spec suite (Hairline Card), and after this wave no other legacy category supports
the steps toggle — the suite retires together with the strip in Phase 8.**

**Ratified (2026-07-10) with twelve review adjustments, integrated below.**
The governing principle, stated at ratification:
*NoaCG Studio is both a visual editor and a code editor. The visual tools must generate
code a human is genuinely happy to open, understand, modify, and learn from. The timeline
must not hide the code, and the code must not fight the timeline.*

The direction: a basic, intuitive, CapCut-style animation timeline adapted for broadcast
graphics. A video editor has clips; NoaCG Studio has **steps**. Everything else should feel
like a familiar timeline. The interaction philosophy is *select it to affect it*, and the
result must feel simpler than what we have now, not more complicated.

This document is the audit + refactor plan: what the current architecture is, why it is
fighting this interaction model, what replaces it, the data model, the design decisions,
the risks, and the phased path that keeps the editor usable throughout.

---

## 1. The verdict: the architecture IS fighting this model

Being direct: **the current editing architecture cannot carry a keyframe timeline, and
patching it further would be malpractice.** The evidence is recent and concrete.

The current model is *parse-by-construction*: presets emit hand-shaped GSAP choreography
into the marked `/* == ANIMATION == */` region, and the editor regex-parses that code back
into a model (`blocks/timelineModel.ts`), then edits it with surgical literal patchers.
Every editing affordance costs one parser shape plus one patcher:

- Retiming a bar → `patchTweenTiming` (rewrites `duration:`/position literals).
- Retiming independently → `splitTween` first (rewrites a joint call into member calls).
- Per-tween ease → `patchTweenEase`. Per-step ease → `patchStepEase`.
- Regrouping presses → `patchStepRegroup` (rewrites three parallel arrays consistently).
- Enters-from values → `patchTweenVars` (+ `insertPartTween` for layers with no tween).
- Leaves-to values → `patchTweenToVars` (+ `insertPartOutTween`).
- Blur → its own reader AND its own writer (`setObjBlur`), because `filter: 'blur(8px)'`
  is a string, not a number.
- Mixing In/Out presets → `splitRegion` splices two emitted regions at the literal text
  `function buildOutTimeline` — and we fixed a stale-tag bug in exactly that splice days
  after shipping it.
- Steps living outside the root → `patchOutsideExit` keeps ONE recognizable `tl.to` line in
  sync at every "swap choke point".

That is ~15 hand-maintained code-shape contracts, each a place where a hand edit can
silently disable an affordance. The tax is linear per feature and the features ahead
(keyframes per property, draggable diamonds, interpolation editing, step duplication) would
make it combinatorial. A keyframe model **cannot** be represented as "readable free-form
GSAP calls we regex back" without the parser becoming a JavaScript interpreter.

**What is NOT broken** — and this matters just as much:

- **The semantic model is right.** The current strip's cue-segmented view (every section on
  its own local clock, because steps wait for operator presses) is the *truthful* model of
  broadcast playout. The new "steps as clips" presentation sits perfectly on top of it:
  steps laid end-to-end for editing, with the understanding that on air, cues happen
  between them. A naive single-global-clock video timeline would be semantically wrong —
  a step's absolute start time does not exist until the operator presses Next.
- **The layer model exists.** `model/structure.ts` (`getTemplateParts`) is exactly the
  layer registry the new timeline rows need, and `selectedPart` in the store is exactly the
  shared selection ("select it to affect it" already works canvas ↔ strip ↔ chip).
- **The runtime contract is solid and everything external depends only on it** (audited
  below): global `play()/stop()/next()/update()` plus the builder globals
  `buildInTimeline()/buildOutTimeline()/revealNextStep()`.
- **Code as the single source of truth stays.** That pillar is not negotiable. What changes
  is *what the code is*.

## 2. The one architectural decision

> The marked ANIMATION region stops carrying free-form choreography and starts carrying
> **a declarative animation data literal plus a small fixed interpreter** — both still
> plain, readable, editable JS inside the template.

Concretely, the region becomes:

```js
/* == ANIMATION (generated — the timeline edits the data block below) == */
// The graphic's animation as data: steps play in order (step 1 on ▶ Play, each next
// step on » Next, the last on ■ Stop). Each layer's properties are keyframe lists on
// the step's local clock; "reveals" names the layers that first become visible in a
// step. Edit values freely — the timeline reads and writes this block.
var NOACG_ANIM = {
  "version": 1,
  "root": ".lower-third",
  "speed": 1,
  "steps": [
    { "name": "Enter", "duration": 0.9, "ease": "expo.out",
      "layers": {
        ".lower-third-accent": { "scaleX": [ { "time": 0, "value": 0 }, { "time": 0.45, "value": 1 } ] },
        "#f0": { "yPercent": [ { "time": 0.3, "value": 110 }, { "time": 0.85, "value": 0 } ] },
        "#f1": { "yPercent": [ { "time": 0.4, "value": 110 }, { "time": 0.95, "value": 0 } ] }
      }
    },
    { "name": "Out", "duration": 0.6, "ease": "power3.in",
      "layers": {
        "#f0": { "yPercent": [ { "time": 0, "value": 0 }, { "time": 0.35, "value": 110 } ] },
        ".lower-third-accent": { "scaleX": [ { "time": 0.25, "value": 1 }, { "time": 0.55, "value": 0 } ] }
      }
    }
  ]
};

// buildInTimeline()/buildOutTimeline()/revealNextStep(): build GSAP timelines from the
// data above. This interpreter is the same in every template — replace it entirely if
// you want hand-written choreography (the timeline UI then steps aside).
function buildStepTimeline(step) { /* ~60 lines, commented, ES5 */ }
function buildInTimeline() { ... }
function revealNextStep() { ... }
function buildOutTimeline() { ... }
/* == END ANIMATION == */
```

Why this preserves every pillar:

- **Code is real and always available.** The data block ships in the template, is
  hand-editable (change `0.45` to `0.9`, it works), and the interpreter is readable,
  commented, dependency-free ES5 (~2-3 KB). A pro can delete it all and write raw GSAP —
  the timeline UI then steps aside exactly as it does today for unparsable regions.
- **True two-way editing: Timeline ↔ Inspector ↔ Code.** The timeline model derives from
  `template.js` on every change (exactly as today), so typing a new `"time"` or `"value"`
  in Monaco updates the timeline and Inspector live; a visual edit mutates the parsed
  object and re-serializes the block. Round-tripping is lossless for content because the
  serializer is **canonical and deterministic** (fixed key order, fixed indentation, one
  keyframe per line): a small visual edit produces a small, stable diff — never a
  reformatting of the whole block — and the editor's change-highlight lands on exactly the
  changed lines. Code outside the markers is never touched. The one honest limit: custom
  comments *inside* the data literal do not survive a visual edit (JSON carries no
  comments); the block's explanatory comments live above it, where they are preserved.
- **Human-readable by decree.** Descriptive names — `time`, `value`, `ease`, `duration`,
  `layers`, `reveals` — not `t`/`v`. Layer keys are the registry's stable selectors
  (`#f0`, `.lower-third-accent`): intentional ids and structural classes, never styling
  classes, readable in both the HTML and the animation code. Honestly, editing
  `{ "time": 0.5, "value": 0 }` is *easier* for a professional than today's GSAP
  position-arg semantics (`'-=0.3'` overlap math).
- **The editor's parse/patch tax drops to zero.** The editor extracts the `{...}` literal
  and `JSON.parse`s it (strict JSON inside the braces — the emit guarantees it). Every edit
  is: mutate the object, re-serialize canonically, one `applyTemplate`. Keyframes, step
  resizing, duplication, presets, In/Out/Both — all become data operations. The ~15
  literal patchers are deleted.
- **Presets and keyframes are one system by construction.** A preset is a pure function
  `(layers, direction, params) → keyframes` written into the same structure. No black-box
  second engine — the "Slide In, from left, 500 ms" example becomes literally
  `x: [{time: 0, value: -300}, {time: 0.5, value: 0}]`, visible and editable.
- **Preview/export parity is structural.** The same JS (data + interpreter) is inlined
  verbatim into the preview iframe (`composeDocument`) and shipped verbatim by all six
  export targets. There is no second implementation to drift.
- **No `eval` anywhere.** The runtime never parses anything — `NOACG_ANIM` is already a JS
  object. Only the editor parses (JSON.parse on extracted text). This matters: the
  community bench (`templateBench.ts`) flags `eval(`/`new Function(` as suspicious.

### The preserved contract (verified by audit)

Everything outside the timeline UI depends on one of two contracts, and both survive:

1. **SPX globals** `play()/stop()/next()/update(data)` — untouched (the category scaffolds
   in `templates/*/shared.ts` keep calling the builders exactly as today).
2. **Builder globals** `buildInTimeline()`, `buildOutTimeline()`, `revealNextStep()`
   (returning a GSAP timeline; `revealNextStep` returns `null` when exhausted). These are
   called directly by `PlayoutSimulator` (play/settle/scrub/auto-out), `MiniPreview`
   (wizard thumbnails), and indirectly by the OGraf export's `playAction` step loop.
   **The interpreter defines the same globals with the same semantics** — so the
   simulator, wizard, control engine, receiver script, and every export work unmodified.

## 3. The animation data model

### Steps (the clips)

```
steps: [ step1, step2, ..., out ]
```

- `steps[0]` plays on ▶ Play. `steps[1..n-2]` each play on one » Next press (SPX Continue).
  `steps[n-1]` plays on ■ Stop — **Out is just the last step**, editable like any other
  (resize, scrub, keyframes, presets), not a hidden special case. The In/Hold/Out
  hardcoding dissolves; the generic model is `Step 1 → ... → Out`.
- A step has `name` (rename-able, defaulting to "Enter"/"Step N"/"Out"), `duration`
  (seconds, snapped to 0.05), `ease` (the step's default GSAP ease — the old
  easeIn/easeOut knobs become per-step defaults), `reveals` (below), and `layers`.
- `settings.steps` (the SPX definition) stays derived: `steps.length - 1` states
  (entrance + Continue presses). `settings.out` stays the SPX truth for the hold
  (`manual` / N ms / `none`) — it is not duplicated into the data block.
- **The hold is not a step.** It is the cue wait between the last content step and Out. On
  the ribbon it renders as a slim fixed break glyph when `out` is manual/none — it truly
  has no duration — and as a real, resizable segment when `out` is N ms. This is the one
  honest deviation from a video editor, and it is exactly where broadcast differs.
- **Cue boundaries stay visible.** The ribbon may read as one continuous timeline, but
  steps are cue-driven on air. Every boundary carries a subtle cue marker in the ruler —
  `▶` before step 1, `»` between content steps, the hold break and `■` before Out — using
  the same cue language the moment cards taught. A user must never be surprised that
  step 2 waits for an operator.

### Layer activation is explicit data, not inference

*(Ratification point 5 — a genuine correction to the first draft, which derived visibility
from a layer's first keyframe.)* **When a layer becomes active and how it animates are
separate concepts.** Each step carries an explicit reveal list:

```
{ "name": "Step 2", "duration": 0.45, "reveals": ["#f1"], "layers": { "#f1": { ... } } }
```

- A layer named in a step's `reveals` is hidden by the interpreter from ▶ Play until that
  step plays (including outside-the-root layers — containment is checked at runtime with
  `root.contains(el)`, replacing `hidePendingSteps` + `stepOutsideParts` +
  `patchOutsideExit` wholesale).
- A layer in no `reveals` list is active from step 1.
- The reveal *animation* is simply the layer's keyframes in that step (the preset/importer
  writes them from the registry channel — mask lines slide within their mask, rise parts
  fade+rise); adding a stray keyframe to some other step can never silently change WHEN a
  layer appears.
- The "appears on press" controls (gutter menu, canvas chip) become edits to `reveals` —
  same UI contract, one-line data change.

### Layers (the rows)

Rows are the `TemplatePart` registry (kept as-is): root, panel, accent, lines, images,
blocks. Layer keys are part selectors (single-token, the registry's existing rule — ids
and structural classes by construction, never styling classes). A selector in the data
that no longer matches the HTML degrades gracefully (row warning + validation warning —
replacing today's `stepGroups` dangling-selector check).

**Collapsed rows (ratification point 10):** one row per layer, showing **aggregate
keyframe diamonds** (a diamond wherever ANY property has a keyframe; a filled/stacked
glyph marks several). Selecting a property in the Inspector highlights only that
property's diamonds on the row. No After Effects-style per-property subrows in v1.

### Keyframes

`{ "time": seconds-on-the-step's-local-clock, "value": number | string, "ease": "gsap-ease"? }`

- `value` is a number for transforms/opacity and a string for filter/clipPath (GSAP
  interpolates those natively) — blur stops being a special case forever.
- `ease` is the ease INTO that keyframe, defaulting to the step's `ease`. Bounce/back ARE
  true GSAP eases — they stay in the easing vocabulary (`model/easings.ts`, already tagged
  playful), not fake presets.
- Value resolution: a property's value at (step k, t) = interpolation between surrounding
  keyframes in step k; before step k's first keyframe = the last keyframe value from any
  earlier step; before ANY keyframe = the layer's design (CSS) state. **Unchanged state
  persists automatically** — nobody keyframes "stays put".

### The design decisions (as ratified)

1. **Keyframes are step-relative.** Global time is a fiction in broadcast (steps wait for
   cues); step-local storage makes resize/duplicate trivial (keyframes travel with their
   step) and matches SPX/OGraf step semantics. The RULER still displays concatenated time
   (sum of prior durations + local t) so it *looks* like one CapCut timeline; the playhead
   is internally `(stepIndex, localT)`.
2. **Values persist by evaluation, not materialization.** No auto-keyframes at boundaries;
   the design state is the implicit base. "Title enters in step 1, sits still in step 2,
   moves in step 3, fades in Out" costs zero bookkeeping.
3. **Resizing a step keeps keyframe timing unchanged by default** *(ratification point 8 —
   reversed from the first draft, and the video-editor convention argument wins: trimming
   a clip does not retime its content)*. Extending leaves settled air at the end — correct
   and predictable. Shrinking clamps at the last keyframe's time (no invisible truncated
   motion). **Alt-drag stretches proportionally** ("make this step faster/slower"), and
   stretch mode may pass the clamp. Dragging an individual keyframe sets exact timing.
4. **Duplicating a step copies keyframes and `reveals` verbatim in local time.** The
   duplicate's *resolved* starting state comes from its new predecessor — correct by
   construction, and exactly what the quiz workflow wants (duplicate "reveal A", retarget
   the layer key from answer A's selector to B's).
5. **Reordering steps is deferred out of v1.** The model supports it for free (keyframes
   travel with the step), but duplication + moving a layer between steps cover the real
   broadcast cases. Out is pinned last regardless.
6. **Out internally:** `steps[steps.length - 1]`, played by `stop()`. A layer may have no
   Out keyframes (it leaves with the root's hide), its own keyframes, or a preset-written
   exit. The root hide at the end of Out is the interpreter's job, not emitted per-preset.
7. **"In" is relative to the selected layer** *(ratification point 6)*: applying an In
   animation targets the step where THAT layer becomes active — its `reveals` step, or
   step 1 for always-active layers. "Out" always targets the final step. So for a Score
   revealed in step 3, Slide In writes step 3 keyframes.
8. **Presets are keyframe generators with a declared property set** *(ratification point
   7)*: each preset declares the properties it controls (slide-fade: y/yPercent + opacity;
   pop: scale + y + opacity; blur: filter + opacity...). Applying a preset replaces
   keyframes ONLY for its declared properties within its target scope (the layer's In
   step, the Out step, or Both) — a manually keyframed rotation survives a Slide In.
   In and Out are disjoint data, so one can never overwrite the other; Both writes both,
   independently editable after. Direction resolves per phase (Slide Left: In = enter
   from the left, Out = exit to the left).
9. **Automatic keyframes use the armed-property convention.** A property with ≥ 1 keyframe
   on the selected layer is *armed*; editing its value in the Inspector writes/updates the
   keyframe at the playhead. Un-armed edits change the design/base value (a Style-panel-
   style patch, no keyframe). The diamond toggles arming; deleting the last keyframe
   disarms. Predictable, no keyframe spam.
10. **Preview/export parity is structural** (same JS everywhere), with two known
    divergences addressed in Phase 7: (a) the editor's "play full animation" needs a
    stand-in duration for a manual hold (real N ms when auto-out; a labeled preview
    default otherwise — on air the operator owns it); (b) **the OBS/vMix overlay export
    ignores auto-out today** (the editor honors it since T6.1) — the overlay's autoplay
    block gains the same scheduled stop, closing a parity gap that already exists.
11. **One evaluator, not two engines** *(ratification point 9, investigated)*: the runtime
    interpreter's unique job is building GSAP timelines — the editor never duplicates
    that; the preview iframe runs the real thing for all playback/scrub. What the editor
    needs besides plain data reads (diamond/segment rendering needs no evaluation at all)
    is **value resolution at the playhead** for the Inspector — ~40 lines of
    last-keyframe-lookup + lerp. That small resolver is the ONLY duplicated logic, it
    shares the schema types, and a parity spec drives the real interpreter in the iframe
    against it across a matrix of templates × times. Full sharing (emitting the editor's
    code into templates) was rejected: it would couple the template runtime to the
    bundler and violate offline-first simplicity for ~40 lines of lerp.
12. **Removed, not preserved:** the entire literal-patch layer (`patchTweenTiming`,
    `patchTweenEase`, `patchStepTiming/Ease/Regroup`, `splitTween`, `patchTweenVars`,
    `patchTweenToVars`, `insertPartTween`, `insertPartOutTween`, `setObjProp`,
    `setObjBlur`, `patchOutsideExit`), the phase splicing (`splitRegion`/`tagInPhase`/
    `tagOutPhase` and the `// In preset:`/`// Out preset:` tags), `currentStepChain`
    round-tripping, `stepAssign`'s three-path re-emit logic (becomes a `reveals` edit),
    the per-row drawer (superseded by the Inspector), and most of `TimelineView`'s
    drag-state machinery. Much of this shipped THIS WEEK — sunk cost is not a reason to
    keep an architecture that fights the product.

## 3b. Step calls — lifecycle hooks in the data model (DRAFT, awaiting ratification)

The migration audit (2026-07-11) found the keyframe model cannot carry the clock
categories: starting soon and game timers embed `tl.call(startClock)` /
`tl.call(stopClock)` inside the marked region, and the importer silently drops call
lines — converting those templates would kill the countdown. This section drafts the
representation that unblocks them. **Explicitly out of scope:** quiz's wrapper-driven
Continue (a steps-representation question, not a lifecycle one) and the loop categories'
endless timelines.

### The data

A step gains an optional `calls` list — side effects on the step's local clock, exactly
where keyframes already live:

```json
{ "name": "Enter", "duration": 0.9, "ease": "expo.out",
  "calls": [ { "time": 0.85, "call": "startClock" } ],
  "layers": { "#f0": { "yPercent": [ ... ] } }
}
```

- `call` is the NAME of a global function defined in the template's own JS (the clock
  engine, a design-owned runtime — code that already lives outside the markers). Strict
  JSON stays strict: a bare identifier string (`/^[A-Za-z_$][A-Za-z0-9_$]*$/`), never an
  expression, never arguments. Anything off-shape fails structural validation and the
  block degrades to "hand-crafted" honestly, like any other malformed data.
- `time` is on the step's speed-relative clock, same as keyframe times; the serializer
  writes one call per line, key order `time, call`; the step's canonical key order
  becomes `name, duration, ease, reveals, calls, layers`.
- Schema version stays 1 — the field is additive and optional, and every template
  carries its own interpreter, so there is no cross-version runtime to appease.

### The runtime (interpreter)

`buildStepTimeline` places each call with GSAP's own primitive, resolved by name at fire
time so hand edits and load order never matter, and a missing function is a silent no-op:

```js
// Step calls: named template functions fire at their moment on the step's clock
// (the clock engine's startClock/stopClock — the timeline never owns that logic).
for (var c = 0; c < (step.calls || []).length; c++) {
  (function (name, at) {
    tl.call(function () {
      var fn = window[name];
      if (typeof fn === 'function') fn();
    }, null, at / speed);
  })(step.calls[c].call, step.calls[c].time);
}
```

No `eval`, no `new Function` — a `window[name]` lookup keeps the community bench clean.
Scrub/settle semantics inherit GSAP's exactly (the simulator's `progress(1, true)`
already suppresses callbacks on settle), so preview behavior matches the legacy emit by
construction — the calls run through the SAME mechanism they run through today.

### The editor

- **animEval**: untouched — calls carry no values to resolve.
- **animEdit mutators**: `resizeStep` 'preserve' clamps shrinking at the last keyframe
  OR call time (a call pushed past the duration would silently never fire); 'stretch'
  scales call times proportionally like keyframes. `duplicateStep` copies calls verbatim
  (data is data — no hidden magic; startClock is idempotent by design). `deleteStep`
  drops them with the step. New `moveCall` / `deleteCall` mutators only if the UI ever
  edits them — v1 does not.
- **The timeline renders calls, read-only**: a small `ƒ` tick on the step clip at the
  call's time, its title naming the function ("calls startClock() here — edit it in the
  code"). The timeline must not hide code truths, but editing stays in the code in v1.
- **Validation**: a warning (not an error) when a named function is not defined in
  template.js — same spirit as the dangling-selector check.

### The importer and presets

- `parseTimeline` learns `tl.call(fnName)` and `tl.call(fnName, null, position)` as a
  zero-duration entry in the same sequential position math as tweens (today it skips the
  line, which is positionally safe but loses the call). The converter emits it as a step
  call at the resolved local time. This is the ONE parser change, and it is additive.
- Preset generators (`presetApply`) carry step calls through 'all'-scope applies (the
  donor's calls replace the target's); per-layer applies never touch them — calls are
  step-level data, not layer motion.
- The golden parity harness extends to the clock categories: legacy emit vs converted
  data must produce identical settled states AND identical clock lifecycles (started
  after entrance, frozen before exit).

### What this deliberately does not do

No arguments, no expressions, no arbitrary JS in data (the no-eval posture is absolute);
no per-layer calls; no editor UI for authoring calls in v1 (presets and the importer
write them; pros edit the JSON line). If a future category needs parameters, the answer
is a named wrapper function in the template's own code — the data stays a name and a
time.

## 4. Keep / Refactor / Replace / Remove

**Keep (unchanged or near-unchanged):**
- `model/structure.ts` — the TemplatePart registry IS the layer model.
- Store `selectedPart` + `CanvasInteraction`/`CanvasSelection` — selection sync exists and
  works in both directions; the Inspector becomes its third consumer.
- `PlayoutSimulator` ownership model — `__activeTl`, settle-on-rebuild, the T6.1 reset and
  auto-out, replay-on-nonce; scrub generalizes to `(stepIndex, localT)`.
- `composeDocument`, all `src/export/targets/*`, `src/control/*`, `spxDefinition`,
  validation gate structure, `model/easings.ts` vocabulary, brand/style contracts, prefs,
  the undo-history mechanism (gains redo).
- The preset library's *taste* — every preset's designed motion is re-expressed as
  keyframe data; DESIGN_LANGUAGE doctrine, autoEase pairs, and category sweeps all apply.

**Refactor:**
- `templates/*/animPresets.ts` + category preset modules — emitters become keyframe
  generators; `shared/base.ts runtimeJs()` unchanged (it calls the builders).
- `validateTemplate.ts` — replace the `stepGroups` regex warning with data-block checks
  (valid JSON, known version, selectors exist, durations positive, Out present).
- `ai/claudeProvider.ts` — prompt prose (markers, knobs, builder rules) rewritten for the
  data block; the live lt01 example re-teaches automatically once lt01's emitter flips.
- `scripts/l3-sweep.mjs` — marker/`var easeIn` assertions updated to the data shape.
- Steps-on detection (`js.includes('function revealNextStep')` in `CanvasInteraction` and
  the timeline) — becomes model-driven (`steps.length > 1`).
- The store — add a redo stack (`future[]`, cleared on new apply) + Ctrl/Cmd+Shift+Z.
  **Today there is no redo at all**; the spec requires it.
- `wizard/draft.ts` `buildDraftTemplate` — the out-preset mix stops splicing JS and writes
  Out keyframes via the preset generator.
- `stepAssign.changePartPress` — same public shape (canvas chip keeps working), internals
  become `reveals` edits.

**Replace:**
- `TimelineView.tsx` → the new `Timeline` component: time ruler with cue markers, a
  draggable playhead, contiguous step segments (clips), layer rows with aggregate
  diamonds, zoom (buttons + Ctrl/wheel), gentle snapping (0.05 s grid + step boundaries +
  playhead; Alt bypasses), horizontal/vertical scroll, context menus (step:
  Duplicate/Rename/Delete; keyframe: Delete/Duplicate), Space play/pause, Delete on
  selected keyframe.
- `blocks/timelineModel.ts` → `blocks/animData.ts` (extract/parse/canonically-serialize/
  mutate the data literal; pure functions: `resizeStep`, `duplicateStep`, `setKeyframe`,
  `moveKeyframe`, `deleteKeyframe`, `setReveal`, `applyPreset`) + `blocks/animEval.ts`
  (the ~40-line playhead value resolver, parity-tested against the interpreter). The old
  `parseTimeline` survives ONLY as the one-time importer for legacy regions.
- The per-row drawer + the In/Out card inspector row → the **Inspector** panel (right of
  the preview): Properties tab (X/Y/scale/opacity/rotation/blur + width/height where
  relevant; number fields + diamonds; readable labels; no low-contrast dropdowns) and
  Animations tab (preset, apply-to In/Out/Both, duration, easing, direction). The speed
  knob and per-step ease move here too. AI Help tab explicitly deferred.
- Layout: on wide screens `code | preview | Inspector` (a third column in the existing
  splitter system — `AppShell` already has persisted layout prefs and drag dividers; the
  Inspector becomes a region with its own ratio, collapsible). The preview stays a true
  16:9 stage, never covered, never distorted. `SidePanel` (Data/Control/Style/AI/Export)
  stays under the preview for now — Style's per-element pieces may migrate into the
  Inspector later, not in this refactor. Mobile: Inspector collapses to a sheet;
  desktop-first explicitly.

**Remove** (Phase 8, only after every major category has migrated and soaked —
ratification point 12): everything in decision 12's list, plus the old strip's CSS and
its e2e specs (rewritten, not deleted — same behavioral coverage on the new surface).

## 5. Risks

**Existing templates.** Catalog templates: regenerated (we own them); risk is taste
regressions — mitigated by the per-category l3-sweep + sibling judging + the golden parity
harness (Phase 1: old emit vs converted data must produce identical settled states and
phase durations before any UI flips). Saved/community/AI templates: zero silent change —
they run on the legacy surface until the user's first motion edit converts them, undoably.
Building-block tweens injected into `play()` by `blocks/registry.ts` live OUTSIDE the
region; they keep working (invisible to the timeline, same as today's unregistered rows).

**Preview.** The simulator is the deepest non-UI consumer of the builder globals (audited:
play/settle/scrub/auto-out and MiniPreview all call them directly) — preserved contract,
so the risk concentrates in the new scrub math `(stepIndex, localT)` and full-play
chaining. Both get dedicated specs. The T6.1 settle/reset semantics carry over unchanged.

**SPX + exports.** Lowest risk of the three: all six targets ship `template.js` verbatim
(audited file-by-file); OGraf's `stepCount` derives from `settings.steps`, which the data
model keeps in sync via the same derivation as today. Two real items: the overlay auto-out
parity fix (a gap that exists TODAY, fixed in Phase 7) and validation's step-selector
warning (updated in Phase 7). The community publish gate is static analysis only and the
interpreter uses no `eval`, so nothing new trips it.

## 6. Phases

Each phase lands green (build + full e2e), committed, editor fully usable. The new stack
grows alongside the old one. **The legacy strip is not retired until every major category
has migrated and soaked** (ratification point 12): the surface is chosen per template —
data-block templates get the new timeline, old-shape templates keep the current strip —
so nothing regresses mid-migration.

- **Phase 0 — ratified 2026-07-10** (this document, with the twelve adjustments).
- **Phase 1 — the engine, no UI.** `NOACG_ANIM` schema + canonical serializer + the
  runtime interpreter + the playhead resolver + the legacy importer (`parseTimeline`-based
  converter) + the golden parity harness (catalog variants × presets: converted data vs
  old emit → identical durations/settled states; resolver vs interpreter at sampled
  times). Nothing user-visible changes.
- **Phase 2 — Inspector shell + layout + redo.** Third column, selection-driven, showing
  the selected layer's resolved values (read-only until Phase 4 arms editing); store gains
  redo; keyboard undo/redo wired. The current strip still runs everything.
- **Phase 3 — the new timeline, read-first.** Ruler with cue markers, playhead, scrubbing
  (via the generalized simulator scrub), step segments, layer rows with aggregate
  diamonds, zoom, scroll — rendering BOTH new-format templates and legacy ones (through
  the importer, read-only). Playhead/scrub/selection create no history.
- **Phase 4 — keyframes + the first flip (lower thirds).** Diamonds in the Inspector,
  keyframe drag/delete on the timeline, armed-property auto-key, interpolation live in
  the preview. Lower-thirds presets emit the new format; new lower thirds get the new
  timeline. **The old strip stays for every other category.**
- **Phase 5 — presets, In/Out/Both.** Animations tab; presets as keyframe generators with
  declared property sets and per-layer In targeting; wizard draft path rewired; remaining
  categories flip one by one (credits/tickers/infographics/clock keep their design-owned
  runtimes — only their region contents change shape).
- **Phase 6 — steps as clips, fully.** Boundary drag (adjacent-step trade, no gaps or
  overlaps), resize from both edges (default preserve timing, Alt stretches), Duplicate/
  Rename/Delete via context menu, add-step, snapping, `settings.steps` sync, Space/
  Delete/arrow-nudge shortcuts.
- **Phase 7 — parity + migration polish.** Overlay auto-out fix; validation data checks;
  AI prompt update; l3-sweep update; convert-on-edit UX for saved templates; full-play
  hold semantics documented in-product.
- **Phase 8 — retirement + tests.** Only now: remove the patcher layer, the old strip,
  and the old specs; rewrite e2e coverage (the checklist below); update CLAUDE.md/GOALS/
  DESIGN_LANGUAGE.

## 7. Test plan

Unit-style (Phase 1, browser logic-check harness): interpreter ↔ resolver parity across
sampled (step, t) points; value resolution across steps; resize (both modes); duplication;
reveal gating (including outside-root layers); importer round-trips for every catalog
variant × preset; canonical-serializer stability (serialize(parse(x)) is a fixed point;
one edit → minimal diff).

E2E (rewritten per phase, final sweep in Phase 8): canvas↔timeline↔Inspector selection
sync (both directions); add/move/delete keyframe (timing changes, diamonds sync);
manual code edit of a keyframe's time/value updates the timeline + Inspector, then a
visual edit preserves the rest of the block (two-way pin); playhead/scrub updates the
preview and creates no history; armed-property auto-key at the playhead; step resize
default vs Alt-stretch; duplicate preserves state + reveals; In preset does not touch Out
and vice versa, and preserves un-declared manual keyframes; Both writes both,
independently editable; undo/redo across keyframe + step edits; preview playback matches
timeline timing; legacy template loads on the legacy surface and converts on first edit,
undoably; every export target still validates and ships; control readability (the
explicit-option-colors pin stays).

## 8. What we are explicitly NOT building

Graph editor, expressions, motion paths, bezier handles, nested comps, parenting, masking,
frame-based display (seconds/ms only — nobody should need the show's frame rate to animate
a lower third; frames can become a display mode later), multi-selection, step reordering
(v1), gaps between steps, an AI tab in the Inspector, per-property timeline subrows.
Steps + layers + playhead + selection + Inspector + keyframes + presets + In/Out/Both +
easing + preview parity is the whole v1.
