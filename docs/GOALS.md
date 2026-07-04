# Goals

The committed north star for this project. Check milestones off as they land; add new ones at the
bottom rather than rewriting history.

## North star

> **Build a broadcast-quality graphic in under 2 minutes by choosing — then learn from the code it
> wrote.**

The user does not want to write code; they want to **learn** code. So the app writes it for them:
they choose a template, fields, style, and animation, and the result is simple, commented,
well-named HTML/CSS/JS they can read, understand, and edit. The code is always visible, always the
source of truth, and always exports to a working SPX package.

### What "done right" feels like
- **Fast:** new project → on-air-worthy lower third in under 2 minutes, no code required.
- **Tasteful:** every template looks like a paid MotionArray/Envato asset, not a tutorial demo.
- **Consistent:** graphics made in the same project form a coherent **broadcast package** — the
  same style family, palette, and typography across every category, usable in a real program.
- **Yours:** custom brand colors (hex/picker) and imported fonts are first-class — fonts are
  embedded in the template and its export, never external.
- **Smooth:** animations run at 60 fps, transform/opacity-based, with professional easing.
- **Teachable:** open any generated file and every line explains itself — clear names, short
  comments, no cleverness.
- **Reliable:** every export passes the validation gate and plugs straight into SPX.
- **Still code-first underneath:** hand edits are always possible; panels and wizard write
  deterministic patches and never fight the user's edits outside their marked regions.

## Milestones

### The choose-first creation flow (current push)
- [x] **Phase 0** — GOALS.md + DESIGN_LANGUAGE.md committed
- [x] **Phase 1** — Foundations: bundled open fonts, GSAP animation-preset library (marked
      regions + `animSpeed` + steps), shared lower-third scaffolding (auto-fit text, 9-zone
      positioning, `:root` style contract), wizard data model
- [x] **Phase 2** — 10 tasteful lower thirds (4 minimal · 3 sport · 3 glass), built and
      taste-judged via multi-agent workflow; user approved screenshots. Bonus: the 12-preset
      easing system (direction-correct per phase) per the approved easing doctrine
- [x] **Phase 3** — Creation wizard replaces the gallery: Entry → Category → Template → Fields →
      Style → Animation, with persistent live preview (Play/Stop at every step)
- [x] **Phase 4** — Live panels after creation: Style (colors/font/size/position via `:root`
      vars) + Motion (preset/speed/easing/steps via marked region); Brand tab retired into Style
- [x] **Phase 5** — "Import graphics" entry: drag-drop images → graphic type → prefilled wizard
      (logo-slot designs first, first image auto-placed)
- [x] **Phase 6** — Playwright specs for the wizard flow (9 passing), docs updated, old starters
      retired (Blank survives)

### Broadcast packages + your brand (current push)
- [x] **Custom colors** — a "Custom" palette in the wizard Style step: accent / text / dim / panel
      via color picker + free hex/rgba input (Style panel already edits them post-creation)
- [x] **Imported fonts, embedded** — upload .woff2/.woff/.ttf/.otf in the wizard or Style panel;
      the file becomes a template asset (`fonts/…`), gets a visible `@font-face`, renders in the
      preview, and ships inside the export (single file per font; weight sets later)
- [x] **Project brand + match toggle** — the app remembers the project's brand (family, palette
      incl. custom, font incl. imported); the wizard preselects it ("Match current project", on
      by default) so the next graphic automatically belongs to the same package
- [x] **Package-consistency foundations** — DESIGN_LANGUAGE addendum with per-family
      cross-category tokens (shape, type roles, motion timing); shared template assembler
      extracted from lowerThirds for all categories; continuous-motion machinery (linear loops)
- [x] **First wave categories** (each: briefs → workflow build + judge incl. a package-consistency
      criterion → sweep → screenshot approval, shown next to their lower-third siblings):
      - [x] Info cards (3 — one per family)
      - [x] End credits (4): role-above-name roll, title-left/name-right roll, one-pager
            swap, left-to-right crawl — each ending with a logo + year placeholder
      - [x] Tickers (3 — first continuous/linear motion graphics)

### Template catalog (each category repeats the Phase 2 pattern)
- [x] Lower thirds (10)
- [x] Full/half/custom screen info cards (3) — *first wave*
- [x] End credits (4) — *first wave*
- [x] Tickers (3) — *first wave*
- [x] Starting-soon loop with timer (3) — *wave 2* (shared countdown engine, hold-loop preset)
- [x] Game show countdown/timer (2) — *wave 2* (timer-run pop + timer-line-reveal)
- [x] Scoreboards (2) — *wave 2* (4-field contract, score-pop on update)
- [x] Infographics (2) — *wave 2* (count-up stat + bars-grow engines)
- [x] Corner bug / picture placeholder (1) — *wave 2* (logo slot on the standard assembler)
- [x] Game-show quiz graphics with options (1) — *wave 2* (next() reveals the correct answer)

**The catalog is complete: 31 designs across all 10 categories, every one family-consistent
with its lower-third siblings (§8), swept per category, and covered by an E2E spec.**

### Images done right (user feedback after wave 2)
- [x] **Broadcast field set** — the wizard/panels offer text, long text, number, and **Image**
      (SPX `filelist` listing `./images/`); dropdown/color/checkbox retired from generic UIs
      (kept only where a design truly needs a constrained choice, e.g. the quiz answer)
- [x] **Image-aware runtime** — every category's `update()` writes through `setFieldValue`:
      `<img id="fN">` gets the path as `src`, empty hides it and toggles `.has-image`
- [x] **Logo fields** — end credits (f2), corner bug, and the frosted info card expose their
      logo slot as a real SPX field; the Data panel gets an image picker + upload
- [x] **Export folder structure** — the zip contains `<project>/index.html` +
      `<project>/images/<file>` (+ fonts/, css/, js/), extracting straight into
      `[TemplatesFolder]/` the way SPX/CasparCG expect

### UX overhaul (user feedback round 2 — portrait monitors + real use)
- [x] **Preview-over-tabs layout** — code editor full-height left; on the right the 16:9 canvas
      (sized by the template's aspect, clamped) sits above the tool tabs — no dead space on
      vertical screens, works on landscape too
- [x] **Validate tab removed** — validation runs automatically inside Export, errors listed
      inline, download gated
- [x] **Motion phases** — In / Out / Both control: mix one preset's entrance with another's
      exit (marked-region splice, per-phase `// In preset:` / `// Out preset:` comments,
      backward compatible); every Motion apply auto-replays the graphic
- [x] **Change highlighting** — every panel/AI apply diffs the code and highlights + scrolls to
      the changed lines in the editor (accent wash + gutter bar)
- [x] **Blocks tab removed** — add-field moved into the Data panel; element/motion inserts go
      through AI + Motion (the block registry remains as the offline AI stub's vocabulary)
- [x] **Learn tab removed** — the knowledge base became Monaco hover tooltips (hover play(),
      an fN id, or a CSS property); Claude-powered Explain stays in the AI panel

### Later (explicitly deferred)
- [ ] Full package manager (named, saved packages; apply-to-all; share as a file) — the
      project-brand mechanism above is the light version

### AI mode (after the wizard works)
- [x] Claude-backed `AIProvider` (key via the in-app AI settings or `VITE_ANTHROPIC_API_KEY`;
      model configurable, Sonnet 5 default; `VITE_AI_PROXY_URL` is the seam a future hosted
      gateway plugs into without app changes)
- [x] Prompt → graphic template ("Describe it" wizard entry: validated before apply, one
      automatic repair round on validator errors, refine loop on the result; generated code
      keeps the house contracts so the Style/Motion panels and brand still work on it)
- [x] Images in generation — upload logo / still, Claude SEES them (vision), they bundle as
      `images/` assets; project brand colors carried in via the match toggle
- [x] AI panel (modify / fix / explain / make-SPX-ready) backed by Claude when configured,
      by the deterministic stub otherwise

### Export & platform
- [x] SPX Starter + Advanced/Pack export with validation gate
- [ ] OGraf export target + schema-based validator (see `.claude/skills/ograf-expert`)
- [ ] CasparCG-flavored export notes/target if needed beyond SPX packaging
- [ ] Data-driven/live content architecture (ticker/scoreboard controlled from a backend) — later

### Quality bar (always-on)
- [x] `npm run build` green as the CI gate
- [x] Playwright E2E for core UI flows
- [x] Every new user-facing flow ships with a Playwright spec (wizard suite: 9 specs; package
      suite: 6 specs — custom colors, font import + export, brand match, one create+play spec
      per new category, ticker loop sanity; wave-2 suite: 6 specs — clock ticks, score update,
      corner bug, count-up, quiz reveal)
- [x] Lower thirds ship with a harness sweep (`scripts/l3-sweep.mjs <shots-dir> <category>`:
      validate + runtime × preset × easing + auto-fit/track checks + taste screenshots);
      category-aware — run for every category (`lower-third`, `info-card`, `end-credits`,
      `ticker`)
