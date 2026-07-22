# NoaCG Studio

**NoaCG Studio** is a modern, premium broadcast graphics builder. Create on-air lower thirds,
tickers, scoreboards, info cards and more by choosing — template → fields → style → animation, with
a live preview at every step — then run them anywhere: an **HTML overlay for OBS / vMix browser
sources**, or working **SPX**, **CasparCG**, and **OGraf** templates. Free, and free to try —
creating, previewing, and exporting need no account.

**Live app: [noacg-studio.vercel.app](https://noacg-studio.vercel.app)** — no account needed to
create, preview, or export.

Two audiences are first-class: a **non-technical creator** who never opens the code, and a
**professional** who drops into the always-available Monaco editor for full control. Either way the
generated HTML/CSS/JS stays clean, commented, and the single source of truth — its view is just
optional. AI and the live panels write deterministic, readable code; nothing hides behind a
visual-only scene model.

For contributor/agent guidance and conventions, see [`CLAUDE.md`](CLAUDE.md). For the SPX template
format, see [`docs/SPX_TEMPLATE_FORMAT.md`](docs/SPX_TEMPLATE_FORMAT.md).

## Run

```bash
npm install
npm run dev      # http://localhost:5174 (public landing at /, the editor at /app; a git worktree reserves its own port — scripts/dev-port.mjs prints it, docs/DEV_PORTS.md explains it)
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
- **Template catalog (43 designs, 10 categories)** — **13 lower thirds** (3 NoaCG house ·
  4 minimal · 3 sport · 3 glass), **5 info cards**, **4 end-credit formats** (stacked roll,
  two-column roll, one-pager swap, horizontal crawl — each ending with a logo + year block, all
  driven by a simple `Role | Name` text field), **6 tickers** (seamless marquees incl. a
  live-clock news wire + a sign-colored markets strip, and an item flip), **3 starting-soon
  holds** with a live countdown, **2 game-show timers**, **2 scoreboards** (scores pop when they
  change on air), **6 infographics** (count-up stats, animated bars, poll rings, timing towers,
  schedules), **2 corner bugs** (logo slot; the house one has a live ticking clock), and a
  **quiz card** whose correct answer is revealed on Next/Continue. Every
  category ships designs tuned to read as **siblings** of their lower-third counterparts, so a
  project's graphics form one package.
- **Broadcast packages** — the app remembers your project's **brand** (style family, palette
  including custom colors, font including imported ones); the wizard's "Match current project"
  toggle applies it to every new graphic, so everything you make in a project belongs to one
  coherent, on-air-ready package.
- **Live Style & Motion panels after creation** — colors/font/size/position patch the `:root`
  style contract in the visible CSS; animation preset/speed/easing/steps rewrite only a clearly
  marked region of the JS. The Motion panel scopes changes to **In / Out / Both** (mix one
  preset's entrance with another's exit) and **replays the graphic on every apply** so you see
  the change. Your own edits outside the contract are never touched; Ctrl+Z undoes.
- **Code editor** (Monaco) with HTML / CSS / JS tabs — the template is the single source of
  truth. Every panel/AI change **highlights the exact lines it wrote** and scrolls them into
  view, and hovering `play()`, a field id, or a CSS property shows a short SPX-specific
  explanation right in the code.
- **Live preview** in a sandboxed iframe, scaled to fit, with a visible **canvas outline** and
  toggleable **safe-area** and **rule-of-thirds** guides, over transparent / black / video-like
  backgrounds.
- **Playout simulator** — Play / Stop / Update / Next call the template's SPX runtime functions.
- **Sample data panel** — edit the values sent to `update(data)`, one control per field `ftype`,
  and **add new fields** (text / long text / number / image) straight into the SPX definition.
- **Control panel** (operator view) — one modular engine turns a graphic's fields into an
  operator UI (number → +/− stepper, textarea → line editor, image → picker), no per-template
  code. It live-drives the preview, and a self-contained **controlpanel.html** ships with every
  SPX export: run the graphic as a browser source and operate it from another tab over a
  BroadcastChannel. It also adds a **Google Sheets live source** — an editable polling block that
  pulls a published CSV into the fields on an interval.
- **Import existing templates** — drop an `.html` file or an SPX-style `.zip` into the wizard's
  Import entry: it opens as editable code (styles/scripts split into the panes, assets pulled
  in), validation shows what needs fixing, and the export targets turn it into SPX, CasparCG,
  or OGraf.
- **Image fields & assets** — fields use the types live broadcast actually needs: text, long
  text, number, and **Image** (SPX `filelist` — the operator picks a file from the project's
  `images/` folder). End credits, the corner bug, and the frosted info card expose their logo
  slot as a real Logo field; uploads are stored as data URLs, render live in the preview, and
  export as real files under `images/`. Brand colours are managed as `:root` CSS variables.
- **AI mode** — the "Describe it" entry generates a complete template from a prompt, optionally
  with your logo / a still frame (Claude sees the images) and your project's brand colors. The
  generated code keeps the same contracts as the wizard's (`:root` style vars, marked ANIMATION
  region), so the Style/Motion panels keep working on it; every result is **validated before it
  can apply**, with one automatic repair round, and a refine box iterates on the result. The AI
  panel modifies / fixes / explains the current graphic. Bring your own Anthropic key (in-app AI
  settings or `.env`, see `.env.example`); it is stored locally and sent only to Anthropic. A
  `VITE_AI_PROXY_URL` config exists for pointing at a hosted key-holding gateway instead.
- **Validation, inside Export** — runtime functions, `SPXGCTemplateDefinition`, field↔DOM
  mapping, relative asset paths (HTML + CSS), missing assets, JS syntax, and preview runtime
  errors run automatically in the Export panel; errors are listed inline and block the download.
- **Export** (four targets) — **SPX Starter** (1:1 with the editor code) and **SPX Advanced /
  Pack** extract as `[TemplatesFolder]/your_project/index.html` with `images/` beside it;
  **CasparCG** produces ONE self-contained `.html` (CSS, JS, GSAP, images inlined — exactly what
  `CG ADD` loads) with a data shim that accepts both JSON and CasparCG XML payloads; **OGraf
  (EBU v1)** produces a `.ograf.json` manifest (data schema generated from your fields) plus a
  `graphic.mjs` Web Component wrapping the template's own runtime, ready for any OGraf renderer.
  All plug-and-play: relative paths, bundled GSAP, no external dependencies.
- **Packet manager** (📦 Packets) — save a show's graphics together into a named packet: reopen
  any of them, and export the whole packet as one zip (a folder per graphic). Named **brand
  looks** capture the current graphic's colors + font: apply one to any graphic, set it as the
  brand for new graphics, or share it as a `.look.json` file.

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

## License

**AGPL-3.0** (see [LICENSE](LICENSE)): the app is free to use, self-host, and modify — but
anyone offering a modified version as a network service must share their changes under the
same license. The hosted/paid service (when it exists) keeps its server-side gateway in a
separate private repository; this repository is the complete self-hostable product.

## Notes / future work

- Fully offline: the Monaco editor is bundled with the app (no CDN), like GSAP and the fonts.
- The road ahead (import-to-start, deeper AI, control panels + live data, accounts/realtime,
  WYSIWYG) lives in [`docs/GOALS.md`](docs/GOALS.md) under "The pipeline".
