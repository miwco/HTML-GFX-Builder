# Animation preset & keyframe model — review and extension roadmap

This answers three questions about the Timeline v2 animation model
(`src/blocks/animData.ts` + `animEval.ts` + `animEdit.ts` + `presetApply.ts`, runtime in
`src/templates/shared/animRuntime.ts`):

1. Are there animations the current preset architecture **cannot express**?
2. What **technical limitation** causes each gap?
3. Can the model be **extended** so more complex animations stay editable through the visual
   timeline and Inspector?

It is a living design note. The presets themselves apply cleanly as of the clean-swap rework
(see `docs/TIMELINE_V2_PLAN.md` ratification point 7, amended); the gaps below are about the
_expressive range_ of the underlying keyframe model, not about preset application.

## The model in one paragraph

`AnimData = { version, root, speed, steps[] }`. A `step` is
`{ name, duration, ease, reveals?, layers }`; `layers` maps a selector to
`Record<propName, Keyframe[]>`; a `Keyframe` is `{ time, value: number | string, ease? }`.
Numbers interpolate linearly editor-side (the runtime applies the eased curve via GSAP, agreeing
at keyframe times); strings (filter, clipPath) hold to the previous keyframe editor-side and
interpolate at runtime. The editable vocabulary (Inspector `PROP_ROWS`) is
`x, y, yPercent, scale, opacity, rotation, blur`. Activation is explicit `reveals` data.

## What it cannot express, and why

| # | Cannot express | Technical cause |
|---|---|---|
| 1 | **Per-property In/Out duration** (opacity fades in 0.2 s while x slides in 0.6 s _as first-class control_) | `duration` is a **step-level** scalar. All tracks in a step share it; different rates only exist by placing keyframes at different times inside the one duration. The Inspector now sets per-direction step durations, but not per-property. |
| 2 | **Transform-origin for scale/rotate** | There is no `transformOrigin` track and no per-layer static prop. Scale/rotate always pivot around GSAP's default (element centre). This blocks corner-anchored scale and pivoted rotation — and the deferred canvas scale/rotate handles need it. |
| 3 | **Motion paths / curved position** | `x` and `y` are independent scalar tracks interpolated linearly. No bezier/path property. (Deliberately excluded in the interaction model — "no motion paths".) |
| 4 | **Stagger as an authored control** | The legacy importer bakes `stagger` into per-keyframe time offsets; the schema has **no stagger field**, so once imported it is frozen as individual times. A preset cannot re-express it and the user cannot adjust it as one knob. |
| 5 | **Physics / spring parameters** | Springiness exists only as a GSAP ease string (`elastic.out`, `back.out`) on a keyframe; there are no mass/tension/velocity params (the resolver interpolates linearly and defers the curve to the runtime). |
| 6 | ~~**Loop / yoyo / repeat**~~ **(DONE — see Tier 3)** | A step gains `loops[selector][prop] = { repeat, yoyo?, repeatDelay? }`: a track plays in a repeating sub-timeline. The importer converts a *static* loop (a breathing pulse) and still refuses an inline DOM-measured one. Starting-soon migrated on it. |
| 6b | ~~**Measured motion**~~ **(DONE — see Tier 3)** | A step gains `dynamics: [{ time, build, target? }]`: a named builder measures the DOM and returns the tween (a marquee's track-width travel, a credits roll, one flip per item). The motion twin of the §3b calls. Tickers and end credits migrated on it. |
| 7 | ~~**3D transforms**~~ **(DONE — see Tier 2)** | `DESIGN_STATE` knew `rotationX/Y`, `skewX/Y` for import fidelity but the vocabulary exposed none. Now `rotationX/Y`, `z`, and `perspective` are editable numeric tracks (`skewX/Y` remain import-only). |
| 8 | ~~**Composed / multiple filters**~~ **(DONE — see Tier 2)** | The `filter` track now holds a COMPOSED string (`blur(8px) brightness(1.6) drop-shadow(0px 0px 10px)`), with one Inspector row per function; and strings interpolate editor-side when both keyframes have the same shape. |
| 9 | **Early exit (a layer leaving before the final Out)** | A layer's lifecycle is hidden → entering → visible → exiting-with-the-root. `reveals` is the only lifecycle data; there is no `hides`. |
| 10 | **Lifecycle calls (start/stop a clock, side effects)** | A step has no `calls` field; `importAnimData` drops `tl.call` lines. This is why starting-soon and game-timers can't migrate to the data model. |

## Can it be extended? Yes — three additive layers, in priority order

The model is deliberately small, but every gap above is an **additive** change (new optional
fields on `step`/`layer`/`keyframe`) that keeps the fixed-point serializer and the
parse-degrades-gracefully contract. None require a graph editor or expressions.

### Tier 1 — extend the editable vocabulary (unlocks the ratified open items)

- **`transformOrigin` as a per-layer static prop** (gap 2) — **DONE**. Stored as a single
  `transformOrigin` keyframe on the layer's activation step (string, e.g. `"0% 100%"`); the
  runtime honours it as an ordinary set (backward-compatible — no interpreter change needed).
  The Inspector's Properties tab has a nine-box pivot picker. So any keyframed scale/rotation now
  pivots correctly. **Canvas scale/rotate handles — DONE**: a single selected non-root layer shows
  a corner scale handle and a top rotate handle; dragging them previews live via GSAP and keys
  scale/rotation at the playhead around this pivot (CanvasInteraction, mirroring the
  position-keyframe drag).
- **`hides?: string[]` on a step** (gap 9) — **DONE**. The data twin of `reveals`: the layer's
  existence span ends where it is hidden; the timeline layer-block's right edge drags to set it,
  and the runtime hides the layer at the step boundary (setLayerHide + the block right edge +
  hideStep; a template with a pre-hides interpreter is re-emitted on first use).
- **`calls?: { time, call }[]` on a step** (gap 10). The drafted step-calls design
  (`docs/TIMELINE_V2_PLAN.md` §3b): the interpreter `tl.call`s `window[name]` at the local time,
  name-resolved (no eval). `resizeStep`/`duplicateStep`/`deleteStep` carry them; `parseTimeline`
  learns `tl.call` as a zero-duration entry; `presetApply` carries calls through `'all'` scope
  only. Unblocks starting-soon + game-timers. **Awaiting explicit ratification before build.**

### Tier 2 — richer per-property control

- **More filter rows + a composed filter track** (gap 8) — **DONE**. `blur`, `brightness`,
  `saturate`, `hue-rotate` and `glow` (a centred `drop-shadow`, colourless so it takes the
  element's own colour) are each an Inspector row, and they compose into the ONE `filter` track
  (`src/blocks/filterTrack.ts`).

  They are deliberately NOT independent tracks. `filter` is a single CSS property holding a list
  of functions — plain CSS can't keyframe its parts apart either — so splitting them would have
  forced per-element proxy state and an `onUpdate` recomposition into the interpreter. Instead the
  data keeps one composed string, and **the runtime needs no change at all**: GSAP interpolates a
  filter string's numbers positionally. That holds only while every keyframe in a step's filter
  track lists the same functions in the same order, which is the invariant `normalizeFilterTrack`
  keeps (a function missing from a keyframe is filled with its identity — what it was contributing
  anyway). The cost of the choice, stated plainly: filter functions **share a keyframe**, so the
  diamond stamps all of them at once. The Inspector's row hint says so.

  The second half of the gap is fixed too: `resolveValue` now interpolates the NUMBERS inside two
  same-shaped strings instead of stepping, so the Inspector tracks the preview mid-tween. Written
  generically, so `clipPath` (the mask-wipe presets) benefits identically.
- **3D transform rows** (gap 7) — **DONE**. `rotationX`, `rotationY`, `z`, and `perspective`
  (`transformPerspective`) are ordinary numeric tracks in the editable vocabulary, grouped under a
  "3D transform" divider in the Inspector's Properties tab (perspective first, with a hint that the
  rotations need it to read as 3D). No interpreter, resolver, validation, or preset change was
  needed — the runtime already tweens any GSAP property via `vars[prop]`, numbers interpolate in
  the resolver, and a preset clean-swap clears every track in its target step regardless of name.
  They pivot around the layer's transform-origin (the existing Pivot control). Parity + a UI arm/key
  path are pinned by `e2e/anim-engine.spec.ts` and `e2e/inspector.spec.ts`.
- **Per-property duration** (gap 1): keep step duration as the frame, but let a track carry a
  local time-scale, or simply lean on keyframe placement (the current, workable answer).

### Tier 3 — new motion primitives (larger, do only if demand is real)

- **Loop / yoyo / repeat** (gap 6) — **DONE**. A step carries `loops[selector][prop] =
  { repeat, yoyo?, repeatDelay? }` (additive; the `layers` arrays are untouched). The interpreter
  runs a looping track in its own repeating GSAP sub-timeline, the resolver folds the playhead time
  back into one pass (so the Inspector matches the looping preview), and the importer converts a
  loop whose values are finite literals — a breathing pulse — while still refusing one that is
  DOM-measured or lives on a nested timeline. **Starting-soon flipped to a data block on this**
  (its ambient breath is a looping `scale` track; the countdown rides the §3b step calls). A
  correction to the original framing: **tickers and credit rolls are NOT unblocked by loop/yoyo** —
  their travel is computed from live DOM measurement (`scrollWidth`, `clientHeight`), which the
  static keyframe model deliberately cannot express.
- **Measured motion** (the follow-up gap loop/yoyo exposed) — **DONE**. A step carries
  `dynamics: [{ time, build, target? }]`, where `build` names a global BUILDER function that
  measures the DOM and returns a GSAP tween/timeline the interpreter adds to the step — the motion
  twin of the §3b step calls, with the same no-eval `window[name]` lookup and the same posture (the
  data holds a name and a target; the logic stays readable JS outside the marked region). The
  builders ship in the category motion runtimes (`tickerMotion.ts`, `creditsMotion.ts`), the preset
  region references one with an ordinary `tl.add(builderName(target))`, and the legacy reader parses
  that — so there is ONE choreography source and the existing importer carries it. **Tickers and end
  credits flipped to data blocks on this**, leaving only quiz and info cards on the legacy region.
  Design + the ratified decisions: `docs/DYNAMIC_MOTION_SCOPE.md`. The timeline renders a measured
  segment READ-ONLY (a hatched, open-ended bar naming the builder) — there is nothing to keyframe,
  and the UI says so rather than implying an affordance.
- **Read-only glyphs for loops and §3b calls** — **DONE**. The three code-owned things in the data
  are now all surfaced on the timeline, and all three are read-only: measured motion (above), a
  LOOP repeat tail on the looping track's own row (starting at its last keyframe — the keyframes
  are the pass and stay editable; only the repeat is annotated; `↻∞` / `↻×N`, `⇄` for yoyo; a
  finite repeat ends exactly where it really ends, an endless one runs off the end), and a
  LIFECYCLE row of named call pins (`startClock()`). The principle: the timeline never silently
  hides motion, and never implies an affordance it doesn't have.
- **Stagger as a step/tween field** (gap 4), **motion paths** (gap 3), **spring params** (gap 5).
  Each is a genuinely new primitive with its own UI; the interaction model currently, and
  deliberately, excludes motion paths and a graph editor.

## Recommendation

Build Tier 1 next — it is small, additive, and directly serves the three ratified open items
(scale/rotate handles need `transformOrigin`; the timeline's right-edge trim needs `hides`;
starting-soon/game-timers need `calls`). Tier 2 is opportunistic polish. Tier 3 is real product
work to schedule against demand, and is what finally retires the legacy patchers.
