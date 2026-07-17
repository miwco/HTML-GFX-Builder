# src/ai - the SPX generation harness

Loaded alongside the root CLAUDE.md when working in this directory. Keep it accurate.
(The VIDEO harness is its own world: src/ai/video + src/video - see the root map.)

## The doctrine

The harness exists to make AI results reliably better than a plain model call - and it must
EARN that claim in scripts/ai-compare.mjs, never assume it. Its principles, in priority order:

1. **Ground engineering, not visual style.** The platform pins the SPX definition, field ids,
   the :root contract, auto-fit, zones, the NOACG_ANIM data region + interpreter, and export
   readiness. The AI owns composition, typography, spacing, proportions, colour, shape
   language, motion character, density, and hierarchy.
2. **The brief and references define taste.** Prompts state reasoning criteria (hierarchy,
   intentional contrast, genre/audience-suited density, motion supporting reading order) -
   never a fixed aesthetic. A news strap and a children's game show earn different answers.
   Uploaded references are read as a design SYSTEM that outweighs the generic rules.
3. **Different briefs must produce different designs** - "same layout, different colours" is
   a named failure. Telemetry records variant/preset/palette per run; the compare rig's
   top-chassis counter is the sameness tripwire.
4. **The smallest harness that wins.** A catalog-fit generation costs ONE small model call
   (the design spec); everything after it is deterministic. Stages that only add cost get cut.

## The harness is ON BY DEFAULT (with a still-live off switch)

The 2026-07-17 benchmark proved the harness a clean win on reliability, editability,
overlaps, and cost (5/5 clean vs the baselines' 3/5, 0 overlaps, ~3x fewer output tokens,
fastest); the earlier hesitation was about VISUAL taste, which the deterministic-conversion
work (below) and the refreshed structure briefs closed enough to make it the default. So:

- **Default (checkbox on, `AiSettings.useHarness` defaults true): `generateAlternatives`** —
  one design-stage call (forced `emit_design_alternatives`) returns THREE genuinely
  different directions; each assembles like a single harness generation. The AI step
  offers the pick.
- **Off switch (checkbox cleared): `generateRaw`** — ONE model call with `RAW_SYSTEM` (format
  basics only, no taste teaching, no worked example), statically validated for display,
  NO bench and NO repair loop. Keep this path pure: it is the baseline the harness is
  measured against, and diluting it makes the comparison dishonest.
- **Preference learning (`preferences.ts`)**: the pick is staged on selection and COMMITTED
  when the project is created — aggregated shown/chosen facet counters (chassis, category,
  density, palette, zone, preset, route), localStorage-only. `preferenceHint()` feeds the
  design-stage prompt a SUBTLE tie-breaker only after ≥8 selections and ≥6 shows per facet;
  it never overrides the brief and never reacts to a single click.

## The pipeline (claudeProvider.generate — one harness run; generateAlternatives runs it ×3)

1. **Design spec** (`designSpec.ts`, forced `emit_design_spec`) - the only mandatory model
   call and the ROUTER. Returns `fit: 'catalog' | 'custom'` plus every design parameter:
   chassis (`variantId`), lines, palette/font/zone/size, animation preset choice, real
   COMPOSITIONAL parameters (typography scale ratio/weight/tracking, density, alignment,
   shape/panel), `referenceSystem` (read from uploads), and an optional `flourish`.
   `catalogDigest()` puts the whole assemblable world in the system prompt.
2. **Grounded assembly** (`specToTemplate`) - catalog-fit specs run through the REAL wizard
   assemblers (`variant.create`): correct by construction, timeline/Style-panel editable.
   Every out-of-range value CLAMPS to the nearest legal one; the project brand palette wins.
3. **Design adjustments** (`designAdjust.ts`) - the spec's compositional parameters apply as
   a marked CSS override block (cascade beats the design CSS; contracts untouched; every
   adjustment guarded on the structure existing). This is what keeps grounded output diverse.
4. **Polish** (`polish.ts`, only when the spec carries a flourish) - ONE bounded call.
   Writable: appended override CSS + the root element's inner HTML. `applyPolish` rejects
   patches touching :root/@font-face/scripts or losing a field id / an anim-data selector;
   a rejected or bench-failing patch REVERTS. Polish never makes a result worse.
5. **Custom path** - briefs whose STRUCTURE no catalog family carries go to the free-form
   coder: house contracts + the NEAREST catalog variant's real create() output as the
   canonical example + the design stage's direction, then the validated repair loop
   (`MAX_REPAIR_ROUNDS = 2`, RE-VALIDATED every round, exact findings fed back).
   **The region contract is authored, not emitted:** the example's ANIMATION region is shown
   in its AUTHORING shape (the legacy GSAP builders, via `emitPresetRegion`) and the prompt
   teaches that grammar - natural GSAP the model is reliably good at, instead of the bespoke
   strict-JSON data block it reliably got wrong. Every emit (first and repairs) runs
   `convertEmittedRegion`: canonicalize a drifted open marker, then `convertToDataRegion` -
   the SAME parity-proven importer every wizard category uses at create - so a convertible
   emit ships as a timeline-editable data block.
   **The STRUCTURE SPINE is the conversion's precondition, so the prompt states it as a hard
   requirement** (root `<div class="PREFIX">` holding `<div class="PREFIX-box">`, that -box
   class ALONE on the element; `PREFIX-mask` around each `#fN`; `PREFIX-accent`). Learned the
   expensive way (ai-compare, 2026-07-17): the coder followed the authoring grammar perfectly
   and `parseTimeline` read every region, but `importAnimData` bails on `detectPrefix` FIRST,
   and detectPrefix keys entirely off `class="{prefix}-box"` - which the old prompt never named
   (the example merely showed it, and models generalize the idea, not the literal class). Every
   free-form result converted the moment a `-box` was injected. Worse, the bench's own repair
   message told the model to "give the root a single class and prefix every child class",
   which does NOT satisfy the check - so the custom route's repair rounds were UNWINNABLE by
   construction. That message now names the real contract. If a future editability finding
   looks model-shaped, suspect the teaching message before the model. An unconvertible region keeps the model's
   own code (honest hand-crafted output, read-only timeline) and its `bench-editability`
   findings DEMOTE TO WARNINGS at the end - they never burn a repair round alone, though
   they ride along in any round a functional error triggers. Exception: when the template
   being MODIFIED already carried a readable data block, losing it is a regression, so
   editability stays a hard error there and the repair loop fights it.

`modify` refines a grounded result at SPEC level while it is still house-shaped (the caller
passes the result's `spec` back via `GenerateOptions.spec`); anything else refines at code
level. `convertImport` = deterministic import first (model/importTemplate.ts), then the
validated conversion - the AI only ever sees parsed code, never raw bytes.

## The quality gate (injected, not owned)

The provider is UI-free: callers inject `GenerateOptions.validate` (an `SpxValidator`) -
the app wires `validateTemplate` + `benchTemplateRuntime` (src/validation/runtimeBench.ts:
live-iframe lifecycle, field binding, overlap/overflow, doubled-text stress, and the house
editability contract). Bench findings are teaching messages that drive repair rounds. A
result that still fails is returned WITH its validation attached - surfaced, never
auto-applied. Grounded assemblies get NO repair loop: one failing its own bench is a
platform bug worth surfacing. On the free-form path the editability contract is enforced
deterministically first (`convertEmittedRegion`, pipeline item 5): repair rounds only fire
on FUNCTIONAL findings, and residual `bench-editability` findings surface as warnings -
except when a modify started from a data-shaped template, where they stay errors.

## Telemetry & the value proof

`telemetry.ts` records every run locally (stages, tokens from the API usage block, repair
rounds, route, diversity fields; localStorage ring, JSON-exportable). The standing proof:

- `scripts/ai-compare.mjs` - same brief, same model, four arms (raw / raw+self-critique /
  pre-harness / the harness), neutral scoring (runtime bench + motion-sampled overlaps +
  screenshots) plus cost/latency/diversity. **The decision rule: each stage keeps its place
  only if it shows a clear improvement for its cost.**
- `scripts/ai-bench.mjs` - the single-arm brief bank + review gallery for prompt iteration.

Both need the dev server + a real key and SPEND TOKENS - never CI.

## Other files

- `anthropic.ts` - the one API client (BYO key or VITE_AI_PROXY_URL gateway); forced-tool
  calls, `callClaudeDetailed` returns usage + model, `cacheSystem` marks a prompt-cache
  breakpoint (the coder + its repairs share one system prompt).
- `stubProvider.ts` - the offline provider: keyword -> DesignSpec -> the SAME specToTemplate
  pipeline, so offline results are catalog-grade; block answers remain as fallback.
- `settings.ts`, `index.ts` (getAiProvider), `brainstorm.ts`, `examplePrompts.ts`,
  `presets.ts` - unchanged roles.

**Deferred (benchmark-gated, deliberate):** a selective vision taste critic (free-form path
only, evidence-based findings, never auto-rewrites a valid grounded result), a curated taste
library with per-brief retrieval, and a nightly taste-analysis task producing reviewable
proposals. Add them only when the compare rig shows they pay for themselves.
