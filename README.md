# SPX HTML GFX Builder

A code-first, browser-based tool for building HTML broadcast graphics and exporting them as working
**SPX** templates. You always see and edit the real HTML, CSS, and JS (with GSAP); building blocks,
branding, a teaching layer, and an AI assistant support that workflow rather than hiding the code.

For contributor/agent guidance and conventions, see [`CLAUDE.md`](CLAUDE.md). For the SPX template
format, see [`docs/SPX_TEMPLATE_FORMAT.md`](docs/SPX_TEMPLATE_FORMAT.md).

## Run

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # typecheck + production build to dist/
```

## What it does

- **Project start / template gallery** — pick a starter (lower third, fullscreen title, starting
  soon, corner bug, info box, countdown, scoreboard, blank), an **aspect ratio** (16:9 / 9:16 / 1:1),
  a **resolution** (1080p / 4K / 720p / vertical / square), and **fps**.
- **Code editor** (Monaco) with HTML / CSS / JS tabs — the template is the single source of truth.
- **Live preview** in a sandboxed iframe, scaled to fit, with a visible **canvas outline** and
  toggleable **safe-area** and **rule-of-thirds** guides, over transparent / black / video-like
  backgrounds.
- **Playout simulator** — Play / Stop / Update / Next call the template's SPX runtime functions.
- **Sample data panel** — edit the values sent to `update(data)`, one control per field `ftype`.
- **Building blocks** — a searchable, hierarchical menu of deterministic, well-commented code
  inserts. Groups include **Lower third** (name + title, etc.), **Layouts**, **Boxes & lines**,
  **Logos & images**, **Text & data**, **Sport**, and **Animation** split into two learning tracks:
  **CSS** (`@keyframes` applied to an element) and **GSAP** (tweens injected into `play()/stop()`).
  Inserted elements land in the lower-left action-safe area with rich, commented CSS. Every apply is
  **undoable** (toast button or **Ctrl/Cmd+Z**), and after inserting, **suggested-property chips**
  add common CSS one click at a time.
- **Branding & assets** — upload logos/images/fonts (stored as data URLs, bundled into the export
  under `assets/` with relative paths); brand colours are managed as `:root` CSS variables; add
  `@font-face` from an uploaded font.
- **Learn (teaching) layer** — click any token in the editor for a short, SPX-specific explanation,
  and browse a curated **CSS property reference** with examples and deep-links to MDN.
- **AI assistant** — currently a deterministic stub behind a clean `AIProvider` interface
  (generate / modify / explain / fix / make-SPX-ready). Every result is validated before it applies.
- **Validation** — runtime functions, `SPXGCTemplateDefinition`, field↔DOM mapping, relative asset
  paths (HTML + CSS), missing assets, JS syntax, and preview runtime errors. Errors block export.
- **Export** (modular targets) — **Starter** (1:1 with the editor code) and **Advanced / Pack**
  (fuller SPX package with a helper interface + metadata). Both are plug-and-play: relative paths,
  bundled GSAP, no external dependencies.

## SPX field convention

Each data field `fN` maps to **one element `id="fN"`**; `update(data)` (a JSON string) writes the
value straight into it via `getElementById`. No hidden holders or `_gfx` display split. See
[`docs/SPX_TEMPLATE_FORMAT.md`](docs/SPX_TEMPLATE_FORMAT.md) for the full contract and the
alternative "premium pack" split style.

## Architecture

```
src/
  model/        types, SPXGCTemplateDefinition parse/serialize, default template
  templates/    hand-authored starter templates + registry
  store/        zustand store (template + UI state, undo history)
  preview/      composeDocument (inline CSS + GSAP + JS + assets into the iframe)
  blocks/       hierarchical building-block registry + deterministic edit helpers + brand CSS vars
  ai/           AIProvider interface + deterministic stub + presets
  validation/   validateTemplate (runs before export and on AI output)
  export/       target registry + Starter / Pack exporters + shared helpers
  teach/        cursor explanations + curated CSS reference (Learn tab + suggestion chips)
  assets/       bundled GSAP + data-URL asset helpers
  components/    AppShell, CodeEditor, PreviewFrame, CanvasGuides, PlayoutSimulator, SidePanel,
                 SampleDataPanel, BuildingBlockMenu, BrandPanel, LearnPanel, AIPromptPanel,
                 TemplateValidator, ExportPanel, TemplateGallery
```

Export targets, building blocks, AI, and validation are kept modular so CasparCG and OGraf
exporters can be added later without touching the UI.

## Notes / future work

- The Monaco editor loads from a CDN in dev; self-hosting it would make the builder fully offline.
- AI is a deterministic stub — wiring a real Claude-backed `AIProvider` is a drop-in replacement.
- Possible next steps: more graphic types (ticker, question/multiple-choice, game-show score),
  CasparCG + OGraf exporters, and lightweight visual editing on top of the code.
