# WYSIWYG editor — Era 6 plan (first slices)

The goal: direct manipulation ON the preview canvas — drag to position, resize, edit text in
place — without ever betraying the core principle: **code is the single source of truth**.
Every canvas gesture writes the SAME deterministic patch a panel would write. There is no
scene model, no hidden transform layer, nothing the code editor can't show.

## Why this is cheap now (the foundations already exist)

- **Position** is already a code contract: the 9-zone anchor + `nudge {x,y}` written by
  `zoneDecls()` into the root rule; the Style panel re-anchors via the same patch
  (`blocks/cssVars.ts` + `zoneDecls`). A drag is just "compute nearest zone + residual nudge
  → apply the existing patch."
- **Size** is one knob: `--scale` in the `:root` contract.
- **Text** is sample data: the Data panel's values drive `update()` — inline editing writes
  `setSampleValue`, not code.
- **Selection** is the structure contract: every category has a known root
  (`.l3/.card/.ticker/…`) and known line elements (`#fN`).

## Slices (each independently shippable)

### W1 — Drag to position — ✅ SHIPPED, then REVISED (2026-07-08): no mode
Shipped first as a "Move" toggle; user feedback immediately showed the mode was unnecessary
(broadcast graphics take no pointer input, so nothing competes for the mouse). Now the
`CanvasInteraction` layer is ALWAYS on: hand cursor over the graphic, drag starts only ON the
root's rect and only past a 4px threshold (accidental-move protection replaces the mode), the
9-zone grid + ghost appear during the drag only. Release emits the zone+nudge patch (identical
to the Style panel's position control), highlighted + undoable; Esc cancels. Prerequisite that
made it work: the **settled design view** — after every rebuild the preview shows the graphic
settled (entrance jumped to its end with callbacks suppressed + a truth-restoring update(), so
clocks/loops stay idle), never a blank canvas.
- Guardrails unchanged: zone snap ALWAYS (freeform absolute positions stay out — wrapped-text
  growth and safe areas depend on anchoring).

### W2 — Resize (scale) handle — ✅ SHIPPED (2026-07-08)
Hovering the graphic reveals a corner handle at the root's bottom-right (a small halo keeps
it reachable just outside the rect); dragging it live-previews `--scale` via an inline :root
override on the preview document (cleared on release/rebuild), with a ×N badge. Release =
one `patchCss` write of `--scale` (the Style panel's size control, continuous), clamped
0.5–2, rounded to 2 decimals.

### W3 — Edit text in place — ✅ SHIPPED (2026-07-08), stronger than planned
Double-click a visible `#fN` element (text cursor on hover) → an overlay input over it.
Commit writes BOTH the live sample value (like the Data panel) AND the field's default in the
SPX definition + the static markup text (`setFieldDefault` in blocks/edit.ts) — one undoable
template patch, so what you type is what every export ships. Hidden `#fN` source divs
(credits/tickers/timers/quiz) are excluded — their visible rows aren't fields.

### W4 — Element nudges (later, carefully)
Per-element offsets (e.g. move the accent bar) require a new, honest contract — e.g. emitted
`--offset-*` vars per element with comments — designed with the same rigor as the zone
contract. NOT in the first wave; a wrong move here creates the hidden-scene-model problem.

## Non-goals (deliberate)

- No free-form canvas: anchoring + auto-fit are what make the graphics broadcast-safe.
- No WYSIWYG-only state: if the code editor can't show it, we don't do it.
- No per-element drag in W1–W3: the root is the unit, exactly like the Style panel today.

## Verification

Each slice: an E2E spec driving the real pointer gestures (Playwright mouse) + asserting the
emitted code patch (zone decls / --scale / sample value), plus the standard build gate. The
preview iframe pointer plumbing (a transparent overlay ABOVE the iframe while editing) keeps
Monaco/GSAP quirks out of the tests — assert on code and DOM, not screenshots.
