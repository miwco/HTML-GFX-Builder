# External acceptance: the lower-third fixture under SPX and CasparCG

Everything below the "Prepare the fixture" line is a MANUAL checklist for the maintainer —
the parts of the core-editor acceptance (docs/SAVED_CONTENT_MODEL.md era) that only a real
playout stack can prove. Everything the browser can prove is already pinned by the e2e
suite (`library.spec.ts`, `machine-graph.spec.ts`, `import-*.spec.ts`, `exports.spec.ts`).

## Prepare the fixture (in the app, ~3 minutes)

1. `+ New project → Start from a template → Lower thirds` → pick any variant → Create.
2. In **◇ States**: `+ state → ▤ Name` then `+ state → ▤ Title` — the path now reads
   `▶ Enter → » Name In → » Title In → ■ Out` (the internal layer sequence).
3. Optional: select the `Enter → Name In` arrow, set **change: Cut — instant** (or Fade).
4. **💾 Save** → name it `Presenter lower third`, create package `Election Night`.
5. `🏠 Home → Control panels → Open control panel` → **＋ Add entry** three times, filling:
   - `Anna Andersson` / `Presenter`
   - `Michael Smith` / `Guest`
   - `Lisa Virtanen` / `Correspondent`
   (each entry's first field becomes its label). `⬇ controlpanel.html` downloads the
   standalone operator page with the entries baked in.
6. Back in the editor: **Export panel → SPX Graphics (starter folder)** and
   **CasparCG (single file)**. For the uploaded-font variant of the test, run the Import
   Graphic wizard instead (drop artwork → Text step → ⬆ Upload font…) and export that.

## SPX

1. Extract the starter folder into SPX's `ASSETS/templates/` and add the template to a
   rundown.
2. **Fields**: the operator sees `Name` / `Title`; typed values air on Continue/Play.
3. **The walk**: Play shows the bar only; the two SPX *Continue* presses reveal Name, then
   Title (the `steps: 3` setting — 3 phases — drives SPX's own Continue counter); Stop plays
   the exit.
4. **Fonts**: on a machine WITHOUT the font installed, the graphic renders in the bundled
   face (`fonts/` travels in the folder; `FONT_LICENSES.md` is present).
5. **Entries**: open the downloaded `<name>_controlpanel.html` beside a browser-source run
   of the exported `index.html` (same machine): pick `Anna Andersson` → ▶ Play entry;
   switch to `Michael Smith` → ▶ Play entry — the same graphic replays with the new data.

## CasparCG

1. Load the single-file export as a CasparCG HTML template (or via SPX's CasparCG server).
2. `CG ADD` + data: fields land (the JSON/XML shim); `CG PLAY`, `CG NEXT` × 2, `CG STOP`
   follow the same walk as SPX.
3. The single file plays from `file://` with NO network: fonts and the artwork are inlined
   (this is the class of defect exports.spec.ts pins — verify once on the real box).

## What to report back

- SPX Continue count matches the graph: `steps: 3` = 3 phases = **2** Continue presses
  (Enter → Name In → Title In), then Continue does nothing and Stop is still legal.
  Presses = `steps` − 1 — see docs/SPX_TEMPLATE_FORMAT.md §2 "Counting `steps`".
- A cut/fade transition on the first arrow visibly changes the Name reveal.
- The uploaded-font export renders identically on the playout machine.
- Entry switch → replay works over BroadcastChannel on the playout browser build.
