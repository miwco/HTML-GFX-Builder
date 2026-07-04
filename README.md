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

- **Choose-first creation wizard** — build a graphic by choosing, then learn from the code it
  writes: Entry (template / **import your own graphics** / blank) → Category → **Template**
  (live previews) → **Fields** (the design adapts) → **Style** (curated palettes **or your own
  custom colors**, 6 bundled open-license fonts **or an imported font — embedded in the template
  and its export**, size, 9-zone safe-area position) → **Animation** (signature GSAP presets,
  speed, **12 easing presets**, multi-step reveal), with a persistent live preview (Play/Stop) at
  every step. Aspect ratio (16:9 / 9:16 / 1:1), resolution, and fps chosen along the way.
- **Template catalog (31 designs, 10 categories)** — **10 lower thirds** (4 minimal · 3 sport ·
  3 glass), **3 info cards**, **4 end-credit formats** (stacked roll, two-column roll, one-pager
  swap, horizontal crawl — each ending with a logo + year block, all driven by a simple
  `Role | Name` text field), **3 tickers** (seamless marquees + an item flip), **3 starting-soon
  holds** with a live countdown, **2 game-show timers**, **2 scoreboards** (scores pop when they
  change on air), **2 infographics** (a count-up stat and animated bars), a **corner bug** with
  a logo slot, and a **quiz card** whose correct answer is revealed on Next/Continue. Every
  category ships designs tuned to read as **siblings** of their lower-third counterparts, so a
  project's graphics form one package.
- **Broadcast packages** — the app remembers your project's **brand** (style family, palette
  including custom colors, font including imported ones); the wizard's "Match current project"
  toggle applies it to every new graphic, so everything you make in a project belongs to one
  coherent, on-air-ready package.
- **Live Style & Motion panels after creation** — colors/font/size/position patch the `:root`
  style contract in the visible CSS; animation preset/speed/easing/steps rewrite only a clearly
  marked region of the JS. Your own edits outside the contract are never touched; Ctrl+Z undoes.
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
- **Assets & branding** — upload logos/images/fonts (stored as data URLs, bundled into the export
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
  model/        types, SPXGCTemplateDefinition parse/serialize, wizard data model (categories,
                variants, palettes), bundled-fonts registry + font import, project brand,
                easing presets
  templates/    blank + the catalog (resolved via catalog.ts): shared/ (generic assembler +
                countdown-clock engine), lowerThirds/ (lt01…lt10 + the GSAP animation presets
                with the marked-region contract), infoCards/, endCredits/ (roll/pager/crawl
                engines), tickers/ (marquee/flip engines), startingSoon/, gameTimers/,
                scoreboards/, cornerBug/, infographics/ (count-up/bars engines), quiz/
  store/        zustand store (template + UI state, undo history)
  preview/      composeDocument (inline CSS + GSAP + JS + assets into the iframe)
  blocks/       hierarchical building-block registry + deterministic edit helpers + :root CSS
                vars + marked-region animation patchers
  ai/           AIProvider interface + deterministic stub + presets
  validation/   validateTemplate (runs before export and on AI output)
  export/       target registry + Starter / Pack exporters (bundle fonts + assets)
  teach/        cursor explanations + curated CSS reference (Learn tab + suggestion chips)
  assets/       bundled GSAP + data-URL asset helpers
  components/    AppShell, CodeEditor, PreviewFrame, CanvasGuides, PlayoutSimulator, SidePanel,
                 SampleDataPanel, BuildingBlockMenu, StylePanel, AnimationPanel, LearnPanel,
                 AIPromptPanel, TemplateValidator, ExportPanel, wizard/ (stepper + live preview)
public/fonts/   six bundled open-license fonts (ship with every export)
scripts/        l3-sweep.mjs — per-category variant validation sweep + taste screenshots
                (Playwright; `node scripts/l3-sweep.mjs <shots-dir> <category>`)
docs/           GOALS.md · DESIGN_LANGUAGE.md · SPX_TEMPLATE_FORMAT.md
```

Export targets, building blocks, AI, and validation are kept modular so CasparCG and OGraf
exporters can be added later without touching the UI.

## Notes / future work

- The Monaco editor loads from a CDN in dev; self-hosting it would make the builder fully offline.
- AI is a deterministic stub — wiring a real Claude-backed `AIProvider` is a drop-in replacement.
- Possible next steps: CasparCG + OGraf exporters, the Claude-backed AI mode, a full package
  manager, and lightweight visual editing on top of the code.
