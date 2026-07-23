# NoaCG Studio — Master Goals: Template Library, State Machines, Control Layer

> **STATUS 2026-07-22: COMPLETE — all five phases shipped.** Phase 1 (state schema,
> 2026-07-19), Phase 2 (graphic types, 2026-07-20), Phase 3 (the template factory + packs,
> 2026-07-21), Phase 4 (the node editor, 2026-07-21), Phase 5 (the control layer + profiles,
> 2026-07-21). The milestone entries live in `docs/GOALS.md`; the binding contracts the phases
> produced are `docs/STATE_MACHINE_SCHEMA.md`, `docs/GRAPHIC_TYPES.md`, `docs/PACK_TAXONOMY.md`,
> and `docs/CONTROL_LAYER.md`. This document is the historical master plan — the acceptance
> criteria in §1.4 remain the standing tests of the model, and §1.5's consciously-deferred list
> remains the honest record of what was left out. Committed to the repo after completion; it was
> previously an untracked working file in the primary checkout.

**How to use this document:** This is the long-term goals document for the next major stage of NoaCG Studio. It describes *what must be true*, not how to implement it — the codebase, its conventions, and CLAUDE.md govern the how. Work through it phase by phase across many sessions. Each phase begins with a survey and a plan presented for approval, and ends with a compound step. Nothing here is built from scratch: NoaCG already has a working editor, canvas, a basic timeline, a field model, an operator panel, preview, export with validation, and a basic control-page export. The mission is to build on those and make them good.

**Reference files in the repo root:**
- `live_format_graphics_needs.xlsx` — 60 live formats and the graphics each needs; source data for the template taxonomy
- `rive1-asic-next-sequence.JPG` — reference: a linear state chain (this is what a "default path" looks like)
- `rive2-options-sequence.JPG` — reference: the same chain with a branch (what the full graph allows)
- `tg123.png` — used by the separate import-workflow effort; not part of this document's scope

**Standing rules for every phase:**
1. Plan first. No implementation until the phase plan is approved.
2. Preserve, fix, extend — in that order. Justify every "new." No parallel implementations, no duplicate export or preview logic.
3. Ask Mirko whenever a product decision appears or an assumption about the existing code proves wrong. Do not guess silently on either.
4. Every phase ends with the compound step: a solution doc per repo conventions, proposed CLAUDE.md additions, and cheap automations of manual checks.
5. All core functionality is deterministic and works offline. No AI or network dependency in templates, playout, or the free core.

---

## Part 1 — The graphic model (the foundation everything shares)

### 1.1 Vocabulary

Adopt these terms consistently in code, schema, docs, and UI:

- **Data** — values: names, scores, answers, times. Held in the existing field model.
- **State** — what the graphic currently looks like. Each state's content is a timeline (the existing timeline function is the state's substance).
- **Transition** — an animated change from one state to another, with its own settings (style, duration, easing).
- **Event** — something that happened: an operator pressed a button, a timer elapsed. Events trigger transitions.
- **Action** — what an operator can do right now (the set of legal events from the current state).
- **Guard** — whether a transition is currently legal. In this model, guarding is structural: a transition can only fire if it exists from the current state. "Reveal" cannot fire before "Lock" because the author simply never drew a Reveal arrow from any state except Locked. No expression language.
- **Effect** — what a transition or state entry does: play the timeline, start/stop a state timer.

### 1.2 The model itself

A **graphic** consists of:

1. **Data fields** — any number, any position, via the existing field model. This iteration: text fields only. The model must not preclude later field kinds (numeric, clock, image, list/collection, externally-fed) but none are built now.
2. **One or more parallel state groups.** Each group is a small, independent state graph. A lower third has one group (Off → In → Out). An NFL-style scorebug has several (e.g. a flag group: off/shown; an alert group: off/touchdown/turnover; a clock group: running/stopped; a result group: live/final) — each 2–3 states, running in parallel. This is the mechanism that prevents state explosion. The schema supports multiple groups from day one even though most v1 templates use one.
3. **Transitions** with a **trigger type**: `operator` (an event from a control surface) or `timer` (auto-advance: the state has a duration and advances itself — tickers and slideshows need this from day one). The schema reserves a third trigger type, `data-condition`, for the future; it is not implemented now.
4. **A default path** — an ordered walk through the graph (see rive1 screenshot). This is the SPX/CasparCG compatibility contract: `next`/continue in any standard playout environment advances along the default path. Every template, however complex, must degrade gracefully to dumb-stepping via its default path. Branches beyond the default path are reachable only through the control layer (see rive2 screenshot).

### 1.3 Hard rules of the model

- **Data updates never implicitly cause state transitions.** Changing a score changes the number in whatever state the graphic is in. State changes only happen through events.
- **Every state is enterable two ways:** via a transition (animated) or via **snap** (instant, no animation replay). Snap is what makes possible: recovery after refresh/crash, emergency direct jumps to any state, preview without playback, and undo (snap back to the previous state).
- **Events are processed serially** through a single queue per graphic, so near-simultaneous events and multi-part updates resolve deterministically and atomically.
- **Every template carries a format-version field.** A migration story exists from the first schema version onward: any schema change ships with a migration for existing templates. With a large catalog, this is non-negotiable.
- **Parameterize with data, not states.** A quiz's "answer B selected" is one *Selected* state plus a `selectedAnswer` data value — never four near-identical states. State counts stay small; data carries the variation.
- **Reset is two distinct operations:** reset visual state (snap all groups to their initial states) and reset data (clear/restore field values). Never conflated.

### 1.4 Acceptance criteria for the model (these are the tests that the schema is right)

- **Simplicity guard:** a lower third is expressible as one group, three states (Off → On → Out), fully drivable end-to-end with `next` alone. If any schema decision breaks this sentence, the schema is wrong.
- **Millionaire test:** question + four answers; reveal answers; select any answer (highlight); change selection freely; lock (after which selection events are structurally illegal); reveal correct; show correct/incorrect with different animations for the selected and correct answers; reset cleanly for the next question. Achieved with a handful of states in one or two groups plus data — no state explosion.
- **Scorebug test:** score, clock, possession, down & distance, timeouts update as data with no transitions; flag, alert, and final-result behavior live in small parallel groups; a score change, clock stop, and penalty alert arriving together resolve cleanly through the event queue.
- **Ticker test:** a ticker cycles its items via timer-triggered auto-advance with no operator input, and can still be paused/resumed by operator events.
- **Compatibility test:** exporting any of the above to SPX/CasparCG yields a template where `next` walks the default path correctly.

### 1.5 Consciously deferred (the schema must not block these; none are built now)

Dynamic collections (rows/items generated from data — ship fixed-size variants instead; the factory makes variants cheap); data-condition triggers; interruption priorities (model breaking-news as a parallel group for now); external data feeds (Sheets, Supabase, APIs, WebSocket — the field model just must not assume a human typed the value); operator permissions; correction logging reconciled with data sources; nested state machines (parallel flat groups cover broadcast reality).

---

## Part 2 — The phases

### Phase 1: State schema in the graphic model

**Goal:** the model in Part 1 exists in the codebase — schema, runtime, serialization, versioning — integrated with the existing timeline (as state content), field model, preview, and export. Existing simple graphics continue to work, representable as one group with a default path.

Done when: the five acceptance criteria in 1.4 pass with hand-written test definitions (no editor UI needed yet); existing templates load and play unchanged; format-version and migration mechanism exist; snap-to-state works in preview.

Product decisions to surface during planning: exact serialized shape within the existing graphic format; how the existing "multi-step reveal" feature maps onto default paths (it is probably an early version of the same idea — absorb it, don't duplicate it).

### Phase 2: Type registry and the first ten types

**Goal:** a **graphic type** is a first-class concept: a type defines structure, fields, state groups, default path, and control events — independent of visual styling. Build a registry and hand-craft the first ~10 types to the quality bar everything else will be measured against, chosen by frequency in the Excel data: lower third, countdown/timer, sponsor/logo bug, social handle bug, topic/question card, quote card, agenda/schedule full-screen, ticker (auto-advance), poll/vote result, and one flagship stateful type (quiz board, Millionaire-style) to prove the far end.

Done when: all ten exist as polished, shippable templates in one neutral house theme; each passes the relevant 1.4 criteria plus existing export validation for all targets; each ships with its state machine pre-built and ready — usable with zero editing.

### Phase 3: The template factory (types × themes)

**Goal:** the catalog scales as **types × themes**, not as bespoke files. A **theme** is a design-token set (color, type, shape, motion feel) applied across types consistently. The Excel's 60 formats become **packs**: curated type-subsets in a fitting theme (Esports pack, Election pack, Church pack…).

The factory is a repeatable batch loop (runnable manually or on a schedule, e.g. nightly via CI running Claude Code headless — the scheduling harness is part of this phase): analyze the Excel → maintain the taxonomy → generate type+theme combinations → run every generated template through the review checklist and export validation → reject or fix failures → catalog the passes. Quality gates are not optional; a template that fails any acceptance check does not enter the catalog.

Done when: the loop runs end-to-end producing validated templates in batches; the taxonomy document maps every Excel format to its pack; catalog growth is a config change, not new engineering.

Product decisions to surface: theme count and design direction for launch; font licensing — every bundled font must be licensed for redistribution inside sold templates before the factory bakes it into anything; premium delivery — whether paid templates are account-bound assets in profiles or distributable files (this decision shapes Phase 5).

### Phase 4: The node editor

**Goal:** a visual state-machine editor beneath the canvas view, swappable with the timeline editor (Rive-style toggling). One generic editor for every graphic type — what differs between templates is the graph inside it, never the editor.

It must support: states as boxes (each opening its timeline when selected); transitions as arrows created by dragging box-to-box (reverse transitions by dragging back); clicking an arrow to edit the transition (style — fade, push, wipe, etc. — duration, easing, trigger type); marking the default path; managing parallel groups; and a one-click **reset to shipped state** for any template, since templates arrive ready and users must be able to break them fearlessly.

The primary use case is small edits to ready-made machines — swap a transition style, adjust a duration — not building from scratch. Optimize for inspect-and-tweak first; authoring-from-blank second.

Done when: a non-programmer can open any Phase 2/3 template, see its graph, change a transition from fade to push in under a minute, break something, and restore the shipped state — without documentation.

### Phase 5: Control layer and profiles

**Goal:** operators drive graphics from **control pages generated from the state machine**: every operator-triggered transition becomes a button, every data field an input. A Millionaire template's control page therefore has answer entry plus Select/Lock/Reveal; a scorebug's has score steppers, clock start/stop, possession toggle; a lower third's has Take/Next — bespoke per template, for free, from one generator. This absorbs and improves the existing basic control-page export rather than replacing it.

The control layer must additionally provide:
- **A show/rundown level:** a show runs many graphics at once (bug + lower third + ticker), each with its own machines; a show's control page aggregates its graphics' controls. The single-graphic case is just a show of one.
- **Prepared vs published:** the control page can stage data locally (a fight result, an election call) and push it on an explicit "take" — nothing appears on air merely because it was typed.
- **An event log:** every event and data update recorded with timestamps. This yields crash/refresh recovery (rebuild last known state, snap to it), transition history, and later undo — recovery must work in this phase.
- **Hosted control:** control pages live on the NoaCG site under user profiles, alongside the profile becoming robust: saved work, every template the user has created or owns, and their control pages, all in one place. (Exported standalone HTML control pages remain for offline/local use.)

Done when: a two-operator scenario works — one person edits data and stages a result, takes it on air, the browser is refreshed mid-show and recovers to the correct on-air state — and a profile shows the user's templates and running control pages.

Product decisions to surface: account/storage architecture for profiles (ties to the premium-delivery decision from Phase 3); realtime transport between hosted control pages and playout.

---

## Part 3 — Phase order and dependencies

The order is 1 → 2 → 3 → 4 → 5 and it is deliberate: the schema must exist before any template carries it (1 before 2); the quality bar must exist before the factory scales it (2 before 3); the editor edits machines that already exist everywhere (4 after 2); the control generator generates from a schema proven across many types (5 last). Phases 3, 4, and 5 may interleave at the session level once Phase 2 is done, but nothing in a later phase may compromise an earlier phase's acceptance criteria — rerun them after significant changes.

Every phase closes with the compound step (standing rule 4). The goal of this entire document is that each session starts smarter than the last one: by launch, CLAUDE.md and the solution docs should describe a system a brand-new session could extend correctly without this document.
