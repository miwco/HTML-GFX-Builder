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
| 6 | **Loop / yoyo / repeat** | No `repeat`/`yoyo`/`repeatDelay`. Infinite/looping motion (ticker marquees, credit rolls) is outside the model — `importAnimData` returns `null` for infinite phases, so those categories stay hand-written. |
| 7 | **3D transforms** | `DESIGN_STATE` knows `rotationX/Y`, `skewX/Y` for import fidelity, but the editable vocabulary exposes none of them (no `z`, `rotationX/Y`, `perspective`). |
| 8 | **Composed / multiple filters** | `blur` is special-cased as `filter: 'blur(Npx)'`, a single string track. You cannot animate two independent filters (blur + brightness), and strings are stepped editor-side (only the runtime interpolates them). |
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

- **More filter rows + a composed filter track** (gap 8): drop-shadow/brightness/hue as their own
  editable rows, serialized into one `filter` string the runtime interpolates.
- **3D transform rows** (gap 7): expose `rotationX/Y`, `z`, `perspective` as ordinary numeric
  tracks — the runtime already understands them; only the vocabulary and Inspector rows are
  missing.
- **Per-property duration** (gap 1): keep step duration as the frame, but let a track carry a
  local time-scale, or simply lean on keyframe placement (the current, workable answer).

### Tier 3 — new motion primitives (larger, do only if demand is real)

- **Stagger as a step/tween field** (gap 4), **loop/yoyo** (gap 6), **motion paths** (gap 3),
  **spring params** (gap 5). Each is a genuinely new primitive with its own UI; the interaction
  model currently, and deliberately, excludes motion paths and a graph editor. Loop/yoyo is the
  prerequisite for migrating tickers/credits off the legacy patchers.

## Recommendation

Build Tier 1 next — it is small, additive, and directly serves the three ratified open items
(scale/rotate handles need `transformOrigin`; the timeline's right-edge trim needs `hides`;
starting-soon/game-timers need `calls`). Tier 2 is opportunistic polish. Tier 3 is real product
work to schedule against demand, and is what finally retires the legacy patchers.
