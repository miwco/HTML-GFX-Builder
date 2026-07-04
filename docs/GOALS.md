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
- **Smooth:** animations run at 60 fps, transform/opacity-based, with professional easing.
- **Teachable:** open any generated file and every line explains itself — clear names, short
  comments, no cleverness.
- **Reliable:** every export passes the validation gate and plugs straight into SPX.
- **Still code-first underneath:** hand edits are always possible; panels and wizard write
  deterministic patches and never fight the user's edits outside their marked regions.

## Milestones

### The choose-first creation flow (current push)
- [ ] **Phase 0** — GOALS.md + DESIGN_LANGUAGE.md committed
- [ ] **Phase 1** — Foundations: bundled open fonts, GSAP animation-preset library (marked
      regions + `animSpeed` + steps), shared lower-third scaffolding (auto-fit text, 9-zone
      positioning, `:root` style contract), wizard data model
- [ ] **Phase 2** — 10 tasteful lower thirds (4 minimal · 3 sport · 3 glass), built and
      taste-judged via multi-agent workflow; user approves screenshots
- [ ] **Phase 3** — Creation wizard replaces the gallery: Entry → Category → Template → Fields →
      Style → Animation, with persistent live preview (Play/Stop at every step)
- [ ] **Phase 4** — Live panels after creation: Style (colors/font/size/position via `:root`
      vars) + Animation (preset/speed/steps via marked region); Brand tab retires into Style
- [ ] **Phase 5** — "Import graphics" entry: drag-drop images → graphic type → prefilled wizard
- [ ] **Phase 6** — Playwright specs for the wizard flow, docs updated, old starters retired
      (Blank survives)

### Template catalog (each category repeats the Phase 2 pattern)
- [ ] Lower thirds (10)
- [ ] Full/half/custom screen info cards (3)
- [ ] End credits (3)
- [ ] Starting-soon loop with timer (3)
- [ ] Game show countdown/timer (2)
- [ ] Scoreboards (2)
- [ ] Tickers (3)
- [ ] Infographics (2)
- [ ] Corner bug / picture placeholder (1)
- [ ] Game-show quiz graphics with options (1)

### AI mode (after the wizard works)
- [ ] Claude-backed `AIProvider` (API key via `.env`, e.g. `VITE_ANTHROPIC_API_KEY`)
- [ ] Prompt → graphic template (iterative refine loop, validated before apply)
- [ ] Drag-and-drop images → AI builds a matching HTML template automatically (uses the design
      language + SPX skill for taste and correctness)

### Export & platform
- [x] SPX Starter + Advanced/Pack export with validation gate
- [ ] OGraf export target + schema-based validator (see `.claude/skills/ograf-expert`)
- [ ] CasparCG-flavored export notes/target if needed beyond SPX packaging
- [ ] Data-driven/live content architecture (ticker/scoreboard controlled from a backend) — later

### Quality bar (always-on)
- [x] `npm run build` green as the CI gate
- [x] Playwright E2E for core UI flows
- [ ] Every new user-facing flow ships with a Playwright spec
- [ ] Every template category ships with a harness sweep (validate + play/stop/update/next clean)
