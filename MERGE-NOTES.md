# Import Graphic + canvas usability — merge notes

Branch `claude/import-graphic-canvas-scaling-ce8761`, 10 commits, linear on `origin/main`
(`a035f56`). `npm run build` clean, full `npm run test:e2e` **310 passed**.

Not merged — landing is the user's call.

## What the branch does

| # | Commit | Change |
|---|---|---|
| 1 | `840d0b2` | Artwork/design unit carry the **design `--scale` handle** instead of the keyframe scale handle, so artwork and placed fields scale as one composition, as layout CSS |
| 2 | `48bf90b` | Import copy stops saying PNG-only (the gate was always `image/*`); rejects a file with no intrinsic pixel size |
| 3 | `c7db0d1` | A press on a **placed field grabs it** (select + drag in one gesture); **canvas locks**, artwork locked by default |
| 4 | `402365c` | **Space-drag panning**; cursors name the gesture in progress, hand reserved for panning |
| 5 | `ea6dba9` | Erase **measures the ink** it removes; seeded field takes its bounds, size, top and anchor from that |
| 6 | `e235431` | JPEG/WebP import + preview/export-after-scale specs; area docs |
| 7 | `b1f293e` | Chip readability fix |
| 8 | `c875e24` | Type size read from the **baseline**, not the whole ink run; slot carries side bearings |
| 9 | `2b5e988` | **Inspector lock** for any part; `partLocks.ts`; SVG rotate cursor |
| 10 | `f83800f` | **Multi-region, multi-line Prepare**: marks accumulate, each line seeds its own field |

## Overlap with the parallel state-machine branch

Three shared files. Everything else is Import-Graphic-local or new.

**`src/components/CanvasInteraction.tsx` — the real conflict surface.** Four edit sites:

1. `onPointerDown`, before the placement branch: a `topHit`/`promoted` block that grabs an
   unselected **placed field**. Scoped to placed fields on purpose — a keyframe layer's drag
   writes motion, so `docs/TIMELINE_INTERACTION_MODEL.md` amendment 3 ("unselected layers
   don't drag on their own") is untouched on every non-imported template. My first attempt
   promoted every part kind and broke 8 catalog specs; if that branch rewrites this ladder,
   keep the placed-field scoping.
2. `layerTfSel` / `lineSizeSel` gained `designUnitSelected` and `isLocked` guards.
3. The hover-cursor block **shrank** — the `cursor` state and `overKfLayer` are deleted.
   Highest textual-conflict risk if they touch hover.
4. `commitLasso` and the root-drag branch skip locked parts.

**`src/store/templateStore.ts`** — additive: `partLocks`, `setPartLock`, and one line in
`applyTemplate` clearing locks on a whole-project swap.

**`src/components/Inspector.tsx`** — additive: two store selectors, a `locked` const, and a
button in the identity header. Low risk unless they restructure that header.

**Not touched:** timeline, anim data/runtime, template registry, export models, preview
rebuild, `structure.ts`.

## Cherry-pick order if you want it in pieces

Commits are independent except: 8 and 10 build on 5, and 9 builds on 3 (`partLocks.ts`
extracts the lock default 3 introduced). 1, 2, 4 stand alone.

## Specs that changed meaning (not just moved)

Three pre-existing specs asserted behaviour this branch deliberately replaces. Worth a look
if the other branch also edits them:

- `import-prepare.spec.ts` "seeds the first text field" and "on a 2x export…" — pinned the
  loose *rectangle*'s numbers; now assert the measured ink's.
- `import-prepare.spec.ts` "re-running starts from the original" — pinned "a second rect
  REPLACES the first". Marks now accumulate, so it tests the same property (fills never
  compound) through the remove-and-replay path instead.
- `import-stretch.spec.ts` "a long value grows the design" — its sample name no longer fits
  at the now-correctly-recovered type size; shortened.

## Re-verify after their branch lands

1. `npm run test:e2e` in full — the canvas specs (`import-canvas`, `wysiwyg`,
   `canvas-selection`, `multi-select`, `canvas-keyframe`, `text-tools`, `pasteboard`) are the
   ones that would catch a bad merge of the pointer ladder.
2. Specifically re-check that a press on an **unselected non-placed layer** still does *not*
   drag it on a catalog template — that is the invariant my narrowing protects.
3. Space-pan arms only over the stage: `PreviewFrame` swallows the keydown in the **capture**
   phase, and `StepTimeline`'s Space-to-play listener does not check `defaultPrevented`. If
   either listener moves, re-check both.

## Known gaps, deliberately left

- Direct-grab is placed-fields-only (see above) — by design, not an oversight.
- The baseline detector's blind spot is a string where most glyphs descend ("gypsy"); names
  and titles are not shaped that way.
- Locks are session UI state, not persisted with the project.
- `e2e/render.spec.ts` + `video-settings.spec.ts` fail if a dev server is already running on
  this checkout's port without the suite's pinned env (`VITE_RENDER_API=1`). That is the
  documented `reuseExistingServer` gotcha, not a branch regression — kill any hand-started
  server first.
