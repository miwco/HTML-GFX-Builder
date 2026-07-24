# docs/ — what to trust, and for what

The map of this directory. Every file below is classified by what it is TODAY; a doc whose
header says HISTORICAL is kept for rationale and must not be read as current behaviour.
When work changes what a binding doc describes, update the doc in the same PR (root
CLAUDE.md rule); when a plan finishes, mark it historical here and in its header rather
than letting it read as open.

Layers of documentation, top to bottom:

1. **Vision & principles** — root `CLAUDE.md` (identity + non-negotiables),
   `GOALS.md` (north star, business posture, and the milestone log).
2. **Cross-domain architecture** — `ARCHITECTURE.md` (binding, machine-enforced).
3. **Domain contracts** — the nested `src/*/CLAUDE.md` files plus the binding docs below.
4. **Active plans** — work that is decided but not done.
5. **Rationale / historical** — completed plans and measurement records, kept because they
   explain why the code is shaped the way it is. Git preserves everything; these stay
   because they are still *read*, not because deleting them is hard.

## Binding contracts (current truth — keep updated)

| Doc | Contract for |
|---|---|
| `ARCHITECTURE.md` | The modular monolith: domain registry, allowed import edges, debts. Machine-enforced (eslint + dependency-cruiser). |
| `STATE_MACHINE_SCHEMA.md` | What a graphic IS: `NOACG_ANIM` v2, states/transitions/events, the default path, snap, versioning doctrine (§5), the node editor. |
| `GRAPHIC_TYPES.md` | The type registry: type vs design, the six promotion gates, the factory. |
| `PACK_TAXONOMY.md` | The 60 reference formats → 12 packs mapping + the gap list (evidence for the next type). |
| `COMPETITION_PACK.md` | The esports / competition / result / reveal pack: its 12 types, their state flows and events, and how the four categories share one assembler. |
| `CONTROL_LAYER.md` | Operator surfaces: the one generator, the ControlMessage protocol, shows, hosted control (migration 0008), staging + event log. |
| `SAVED_CONTENT_MODEL.md` | The library: GraphicDoc, packages-as-folders, hash routes, control entries, Save semantics. |
| `DESIGN_LANGUAGE.md` | The taste bar: typography, color, motion doctrine, the §8 family tokens, generated-code style. |
| `SPX_TEMPLATE_FORMAT.md` | The external SPX contract this product targets (reference; keep in sync with SPX). |
| `TIMELINE_INTERACTION_MODEL.md` | The editing surfaces' interaction contract (selection, keyframes, playhead, what NoaCG deliberately does not copy from NLEs). |
| `IMPORT_MVP.md` | The Import Graphic flow: the structure contract, fit modes, Prepare/erase, 9-slice stretch. Shipped; doubles as the domain record. |
| `RENDER.md` | The render service: manifest kinds, virtual clock, tiers, security posture, deploy checklist. |
| `EXPORT_TARGETS_RESEARCH.md` | Where exports run: shipped targets + the doctrine for adding one. |
| `FORMATTING.md` | What Prettier may and may not touch, and why. |
| `DEV_PORTS.md` | Per-worktree dev-port reservation. |
| `ACCEPTANCE_SPX_CASPARCG.md` | OPEN manual checklist: the parts of acceptance only a real SPX/CasparCG stack can prove. Not yet run. |

## Active plans (decided, not done)

| Doc | State |
|---|---|
| `GROWTH_EXECUTION_PLAN.md` | The adoption push. Locked 2026-07-08; only open signup done. The §9 backlog is the work queue when growth resumes. |
| `NIGHTLY_AUTOMATION_PLAN.md` | Era 7. Job A (CI/health gates) built; generation jobs B/C plan-only, waiting on the §10 decisions (they spend real money nightly). |
| `VIDEO_DESIGN_QUALITY_PLAN.md` | Video AI quality. Most of it landed (arm B, fonts, readability gates); still open: the experiment-gated vision critic (§3.5) and the chip-set palette decision (§3.6). |

## Rationale / historical (do not read as current behaviour)

| Doc | What it explains |
|---|---|
| `ERA5_PLAN.md` | Why the server era is shaped as it is (Supabase, AGPL split, offline invariance). Shipped through 5.6; 5.7 payments open. |
| `TIMELINE_PLAN.md` | The pre-v2 timeline direction + the Loopic/SPX competitive research. Superseded by Timeline v2. |
| `WYSIWYG_PLAN.md` | The first canvas-editing slices and their guardrails. Shipped and extended. |
| `TIMELINE_V2_PLAN.md` | The declarative-timeline rewrite: the audit, the twelve decisions, the category migration story. Complete. |
| `DYNAMIC_MOTION_SCOPE.md` | Why measured motion is a named-builder primitive (`dynamics`) and not an expression language. Shipped. |
| `PRESET_MODEL_REVIEW.md` | The keyframe model's expressive range: which gaps closed (most) and which stay open by choice (stagger knob, springs, per-property duration, motion paths). |
| `THEME_DEFAULTS_REVIEW.md` | The family-token audit behind the applied 2026-07-21 defaults. Open remnant: the `labelColor` / `displayTracking` re-modelling questions. |
| `HYPERFRAMES_QUALITY.md` | Video-engine bench measurements + the corpus. Note its own header: measurements are dated records, not promises. |
| `BROADCAST_DESIGN_SYSTEM_RESEARCH.md` | The skills evaluation + reference-library architecture. Shipped on `SELECTION_MODE='legacy'` with the 14-card pool; contrast selection measured and rejected. |
| `noacg-master-goals.md` | The five-phase template-library / state-machine / control-layer master plan. **All five phases complete** (2026-07-19 → 2026-07-21). §1.4's acceptance criteria remain the model's standing tests. |

## Untracked companions (primary checkout only)

- `live_format_graphics_needs.xlsx` (repo root) — the 60-format source data behind
  `PACK_TAXONOMY.md` and the type frequencies.

## Where the roadmap lives

`GOALS.md` is the ONE milestone log — add new milestones at the bottom, never duplicate a
roadmap into a second file. Plans get their own doc only while they need design rationale;
when they finish, they move to the historical table above.
