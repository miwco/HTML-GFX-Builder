# Broadcast design system - skills evaluation and reference-library architecture

Research and implementation plan. **Steps 1-2 are built and verified; the paid A/B has not
run**, so the change is proven correct, not yet proven better (§13.1). The
measured-before/after rule from `docs/VIDEO_DESIGN_QUALITY_PLAN.md` governs what remains, and
the contrast selector ships behind a one-line flag precisely so both arms can be benched.

Goal being served: future AI generations that look art-directed, differ from each other in
real ways, draw on broader design vocabulary than the model's defaults, move with intent, and
still read as broadcast rather than as a web page.

---

## 0. The finding that reframes the question

**The three skills under evaluation are agent skills. They cannot improve NoaCG's output.**

Two different things are called "skills" in this codebase, and they do not touch:

| | Agent skills | Harness fragments |
|---|---|---|
| Where | `.claude/skills/*/SKILL.md` | `src/ai/video/skills.ts`, `referenceCards.ts` |
| Loaded by | Claude Code, while editing this repo | NoaCG's own system prompts, at generation time |
| Audience | me, the agent | the end user's graphic |
| Ships to users | no | yes |

Taste Skill, `emilkowalski/skills`, and Impeccable are all the first kind. Installing any of
them changes what an agent does *while editing the repo*. NoaCG's generation path is
`claudeProvider.ts` / `claudeVideoProvider.ts` calling the Anthropic API with prompt text
assembled from `src/ai/**`. An installed `SKILL.md` never enters that path.

So the question "should we install these to make generations better?" has a strict answer:
**no, because installation is not a mechanism that reaches generations.** The only way any of
this improves output is if specific principles are *rewritten into `src/ai/**` prompt text*.

That splits the work cleanly, and the rest of this document keeps the two apart:

- **Layer 1 - authoring side.** Agent skills that help whoever edits the harness and judges
  bench galleries. Cheap, reversible, gitignored, zero user-facing risk.
- **Layer 2 - product side.** Prompt content in `src/ai/**`. This is where quality, variety,
  token cost, and consistency actually move, and where the benchmark gate applies.

---

## 1. Comparison of the three skill systems

All three were read as actual repository files, not landing pages.

| | Taste Skill | emilkowalski/skills | Impeccable |
|---|---|---|---|
| Repo | `Leonxlnx/taste-skill` | `emilkowalski/skills` (note: `/skill` is a 301) | `pbakaus/impeccable` |
| Stars | 65,206 | 18,140 | 48,094 |
| Licence | MIT | MIT | Apache-2.0 |
| AGPL-3.0 compatible | yes, one-way in | yes, one-way in | yes, one-way in |
| Shape | 13-skill bundle, one 87 KB file each | 6 skills, 2 with progressive disclosure | 1 skill, 23 lazy-loaded commands |
| Load cost | ~24k tokens (single skill) | ~2.5k-7.2k per skill, ~28.8k all | ~7k always-on, ~11-20k typical |
| Executable code | none | **none** | **yes** - mandated `node` scripts |
| Network egress | none | none | **yes** - `context.mjs` calls `impeccable.style` |
| Medium-agnostic share | ~12-16% | ~25-30% | ~35-40% |
| Verdict | **reject** | **harvest ~7 rules; do not install by default** | **harvest; do not install** |

### Taste Skill - reject

A React/Next/Tailwind landing-page linter written as prose. Its own first line scopes it:
"Landing pages, portfolios, and redesigns." Roughly 84-88% is inert or wrong for a fixed
1920x1080 non-interactive canvas - nav-bar height caps, hero-fits-viewport, dark-mode toggles,
`prefers-reduced-motion`, Core Web Vitals, scroll-hijack GSAP skeletons, form-field contrast.

It is not neutral overhead, because it is written as **mandatory rules with a ~60-box failing
checklist**. A model carrying it will manufacture web chrome to satisfy checkboxes that
describe a page NoaCG does not produce.

Two additional disqualifiers:
- A bare `npx skills add Leonxlnx/taste-skill` installs **all 13 skills** (verified against
  the repo's `skills/` listing), not just the taste one.
- Section 4.8 *compels* image-generation tool calls: "If ANY image-gen tool is available in
  the environment ... you MUST use it." This session has `generate_image` connected. That
  spends real credits unprompted.

Worth stealing as a *method*, not as text: it names the model's actual attractor basin at hex
level (a "premium consumer" palette ban listing `#f5f1ea`, `#b08947`, and friends) and mandates
rotation away from it. NoaCG's broadcast equivalent - the cyan-to-blue gradient, white italic
condensed caps, chevron wipe - deserves the same treatment. `MOTION_PRINCIPLES` already does
this once, naming "a centred word on a plain dark radial gradient with a light sweep and a
small-caps kicker" as "this tool's most common failure". That instinct is correct and
under-used.

### Impeccable - harvest, do not install

Genuinely the best-written of the three, and Apache-2.0 so the prose is legally liftable. But
over half its byte weight (`live.md`, `adapt.md`, `interaction-design.md`, `harden.md`,
`onboard.md`, `optimize.md`, `clarify.md`, `document.md`) is dead in a non-interactive medium,
and it carries operational baggage NoaCG should not accept: it mandates running Node scripts,
requests `Bash(...)` permissions, installs a post-write edit hook, mandates spawning parallel
sub-agents, and its required per-session boot step performs unannounced network egress to
`impeccable.style`.

What is worth taking is listed in §3.2. The strongest items - light-on-dark three-axis
compensation, all-caps tracking floors, `tabular-nums`, and the
restrained/committed/full-palette/drenched colour axis - are unusually well suited to graphics
keyed over live video, which is not a use case its author had in mind.

### emilkowalski/skills - the interesting one, and the one most likely to do harm

This is the user's priority, so it gets the full treatment in §2.

---

## 2. Emil Kowalski's motion doctrine vs NoaCG's

Values below were fetched from the repo directly and cross-checked, not summarised.

### 2.1 The numbers are calibrated for a medium NoaCG does not have

Emil's doctrine optimises **perceived latency under user input**. Every headline number is
derived from "the user clicked and is waiting". NoaCG has no user, no click, and no waiting.

| | Emil (UI) | NoaCG today | Ratio |
|---|---|---|---|
| Entrance duration | 150-250ms dropdowns; **"UI stays under 300ms"** | in = **0.5-0.9s** (`DESIGN_LANGUAGE.md` §4) | NoaCG **2-3x slower** |
| Exit duration | 200-500ms modals | out = **0.3-0.5s** | comparable |
| Stagger | **30-80ms** | SPX **0.06-0.15s**; video **2-5 frames** (67-167ms @30fps) | NoaCG **~2x wider** |
| Exit easing | **"Entering or exiting -> ease-out"** | **"Exits: prefer Ease In (`power2.in`/`power3.in`)"** | **direct contradiction** |

The exit-easing row is a real doctrinal conflict, not a gap. Emil wants dismissal to feel
instant, so he decelerates out. Broadcast wants an element to gain momentum as it leaves
frame, so it accelerates out. **NoaCG is right for its medium and Emil is right for his.**

The stagger row matters more than it looks: 30-80ms is **0.75-2.4 frames** at broadcast frame
rates. Sub-frame staggers quantise to zero or one frame and read as simultaneous. Emil's
number is not merely suboptimal here, it is unrepresentable.

Note also that the one row of his duration table that would cover NoaCG is deliberately blank:
"Marketing / explanatory | *Can be longer*". The skill declines to give guidance for
non-interactive motion.

**Conclusion: adopting his numeric doctrine wholesale would systematically speed NoaCG's motion
by 2-3x and invert its exits.** NoaCG's existing calibration is already broadcast-correct and
better than what the skill would supply.

### 2.2 What is genuinely void

Roughly half the corpus. Interruptibility (which `apple-design` calls "the single most
important principle"), all gesture content, velocity handoff, rubber-banding, momentum
projection, press feedback, the frequency table and its keyboard-shortcut rules, perceived
performance, `prefers-reduced-motion` (13 mentions), hover gating, Radix/Base UI CSS
variables, and the Framer-Motion hardware-acceleration rules.

One inversion is worth flagging because it would generate **false positives** if wired into a
review step: `review-animations` standard #6 penalises `@keyframes` for restarting from zero
instead of being interruptible. Deterministic, frame-indexed, non-interruptible timelines are
precisely the Remotion model. A reviewer carrying that standard would flag NoaCG's core
architecture as a defect.

### 2.3 What Emil adds that NoaCG genuinely lacks

Short, precise, and worth having. Seven items, roughly 200-300 tokens once rewritten:

1. **Nothing appears from nothing.** Never `scale(0)`; start from `scale(0.9-0.97)` + opacity.
   NoaCG says nothing about this. Medium-agnostic physical plausibility.
2. **Symmetric enter/exit paths.** "If something disappears one way, we expect it to emerge
   from where it came." A panel entering from the right must leave to the right. Absent from
   both NoaCG doctrines.
3. **Spatially motivated origin.** Motion origin must be *earned*, not defaulted to centre.
   (His literal form - "popovers scale from their trigger" - needs translating: a stat grows
   from the axis it belongs to; a name wipes from the side its bar entered.)
4. **Overshoot gated on apparent momentum.** Bounce only when the element visibly carried
   momentum into the frame; never on something that simply faded up. NoaCG offers Back/Bounce
   easings with no rule for *when* they are legitimate.
5. **Frame-level smoothness.** Keep per-frame positional delta below the strobing threshold;
   for very fast motion a subtle motion blur or stretch reads better than a hard streak. This
   is the one passage in the corpus written as if it had broadcast in mind, and it is *more*
   applicable to an offline render than to web UI.
6. **Named curves for the video harness.** `cubic-bezier(0.23, 1, 0.32, 1)` (strong ease-out),
   `(0.77, 0, 0.175, 1)` (strong ease-in-out). SPX already has a full GSAP easing doctrine;
   the Remotion side has only prose ("springs and clamped interpolate curves with intent")
   and no named values. This is a real gap on one engine only.
7. **Blur as a crossfade bridge.** Blur blends two states so a crossfade reads as one
   transformation rather than two overlapping objects. `DESIGN_LANGUAGE.md` has `blur-in` as a
   reveal but not blur as a *transition* tool. The "keep under 20px, expensive in Safari"
   constraint evaporates in an offline render.

Also worth noting as a **method** rather than content: his `review-animations` skill has the
right *shape* for a critique step - explicit verdict tiers ordered by impact, a mandated
`| Before | After | Why |` output table, a counter-example of the wrong format, and a terminal
block/approve decision. That structure is reusable even though its ten standards are not.

### 2.4 Verdict on Emil

**Do not install into the default generation path.** ~50% void, ~20% needs re-derivation, and
the numeric core is wrong for broadcast by 2-3x with an inverted exit curve.

**Do harvest the seven items above into `src/ai/video/prompts.ts`.** They are additive, they
do not conflict with anything NoaCG currently says, and they cost ~200-300 tokens.

Optionally install it **for the authoring loop only** (§5), where reading his review structure
while editing the harness is useful and carries no user-facing risk.

---

## 3. What to install, adapt, or reject

### 3.1 Install now

Nothing, into the product. One optional authoring-side install (§5.1), gitignored and
one-command reversible.

### 3.2 Adapt into NoaCG-owned prompt text

| Source | Item | Destination |
|---|---|---|
| Emil | the 7 motion items in §2.3 | `src/ai/video/prompts.ts` (`MOTION_PRINCIPLES`) |
| Emil | verdict-tier + Before/After/Why critique *structure* | authoring skill, §5 |
| Impeccable | light-on-dark 3-axis compensation (line-height +0.05-0.1, tracking +0.01-0.02em, one weight step) | `MOTION_PRINCIPLES` + `DESIGN_LANGUAGE.md` §1 |
| Impeccable | all-caps tracking floor (5-12% on short caps labels) | already partly present; tighten |
| Impeccable | `tabular-nums` for scores, clocks, vote counts | `DESIGN_LANGUAGE.md`; scoreboard/ticker variants |
| Impeccable | colour-commitment axis (restrained / committed / full-palette / drenched) | **reference-card axis** (§6) - this is the highest-value single item |
| Impeccable | display tracking floor `>= -0.04em` | `DESIGN_LANGUAGE.md` §1 |
| Impeccable | dark-surface depth from surface lightness, not shadow | `MOTION_PRINCIPLES` lit-surface doctrine |
| Taste Skill | *method only*: name the attractor basin explicitly and mandate rotation | already present once; extend |

Everything above gets **rewritten in NoaCG's own words for broadcast**, not pasted. That is
both the better engineering choice and the cleaner licence position (§7).

### 3.3 Reject outright

Taste Skill in full. Impeccable's operational layer (scripts, hooks, sub-agent mandates,
network egress). Emil's durations, stagger numbers, exit easing, frequency table,
interruptibility standard, and every gesture/hover/reduced-motion rule.

---

## 4. Where the real problem is (and it is not taste guidance)

Three of the four stated goals are **variety** problems, not taste problems. Taste guidance
does not fix them, and may make them worse by pulling every generation toward one articulated
ideal.

### 4.1 The SPX alternatives do not differ by construction

`generateAlternatives` (`src/ai/claudeProvider.ts:742-800`) makes three options with:

- **one** model call, not three
- the **same** system prompt for all three
- **no** temperature, top_p, or top_k anywhere in `src/` (`anthropic.ts:57-67` sets only
  `model`, `max_tokens`, `system`, `messages`, `tools`, `tool_choice`)
- no preset rotation, no seeding

The entire diversity mechanism is two paragraphs of prose asking for variety plus
`minItems: 3, maxItems: 3`. Asking one model in one pass for "three genuinely different
directions" reliably returns three points clustered near the same attractor. This is exactly
the "same layout, different colours" failure `src/ai/CLAUDE.md` names as a tripwire - the
telemetry can *detect* it but nothing in the pipeline *prevents* it.

The offline stub is more honest: `stubProvider.ts:160-178` takes the first three variants of
the matched category, guaranteeing three different chassis.

### 4.2 The video reference cards are a mirror, not a window

`src/ai/video/referenceCards.ts` holds six cards, and its own header says they are "distilled
from NoaCG's shipped SPX template families (`docs/DESIGN_LANGUAGE.md` §8 tokens + the catalog's
signature reveals)".

They describe **NoaCG's own four style families**. They are neither the model's internal
defaults nor broad external reference - they are the catalog reflected back. A card system
built this way cannot produce a look the product does not already ship. That is the precise
mechanical reason generations converge, and it is the gap the user is pointing at with "draw
from broad, high-quality reference material rather than only the model's internal defaults".

Selection compounds it: `.filter(c => c.keywords.test(prompt)).slice(0, 2)` is first-match-wins
by array order with no scoring, and `sport`'s regex - `/sport|match|team|derby|versus|vs\b|
league|goal|esport|energy|fast|aggressive/i` - claims a large share of broadcast vocabulary.
The same cards win repeatedly.

### 4.3 Consequence for the plan

The highest-leverage work is **a reference library with contrast-aware, anti-dominance
selection** - not more taste prose. Diversity has to come from the *selection system*, because
a single model pass will not self-differentiate on request.

`src/ai/CLAUDE.md` already names this as deferred: "a curated taste library with per-brief
retrieval ... Add them only when the compare rig shows they pay for themselves." That deferral
was argued on **visual-taste** payoff. The **variety** claim is a different and more directly
measurable one, and `docs/VIDEO_DESIGN_QUALITY_PLAN.md` §5 already defines "distinctiveness
across briefs" as a scored review axis. So the gate can be met without relitigating the
taste question.

---

## 5. Proposed NoaCG skill structure

The user asked whether to split into broadcast art direction / broadcast motion / reference
selection / critique. Answer: **yes as concepts, but they belong in two different places**, per
§0. Do not invent a new mechanism - the video harness already proves the pattern.

### 5.1 Layer 1 - authoring-side agent skills (`.claude/skills/`)

Gitignored (`.gitignore:45-49`), invisible to git history, removable with one command. Zero
user-facing risk. These help whoever edits the harness and judges bench galleries.

| Skill | Purpose | Status |
|---|---|---|
| `broadcast-motion-critique` | Judge a bench gallery. Emil's verdict-tier + Before/After/Why structure, calibrated to broadcast numbers (0.5-0.9s in, ease-in out, 2-5 frame staggers) and to the five review axes in `VIDEO_DESIGN_QUALITY_PLAN.md` §5. | **write ourselves** |
| `emilkowalski/skills` | Read `review-animations` + `apple-design` §11 while editing motion prompts. Reference only. | **optional install, not default** |

If installed, pin the commit SHA and record it in `docs/` - the repo is 36 commits against
18k stars and churning.

**One housekeeping item found while auditing:** `.claude/skills/video-quality-round/` is
untracked, gitignored, and worktree-local. It has never been committed. Deleting this worktree
or running `npx skills remove --all` destroys it permanently. It is first-party content living
in a directory whose gitignore comment declares it vendor-only. Worth resolving independently
of this work - either commit it with a `git add -f`, or move first-party skills somewhere the
blanket ignore does not cover.

Related: `C:\Users\ahonemi\.claude\skills\` holds pre-rebrand duplicates of `ograf-expert` and
`spx-html-template-expert` that shadow the repo copies with no deterministic precedence. That
is why each appears twice in the skill listing. Worth deleting the stale user-level pair.

### 5.2 Layer 2 - product-side prompt content (`src/ai/**`)

This is where output quality changes. Four concerns, mapped onto existing structures:

| Concern | Mechanism | Where |
|---|---|---|
| Broadcast art direction | reference cards, extended and given axes | `src/ai/video/referenceCards.ts`; **new** `src/ai/referenceCards.ts` for SPX |
| Broadcast motion | prose additions | `src/ai/video/prompts.ts` (`MOTION_PRINCIPLES`); `docs/DESIGN_LANGUAGE.md` §4 |
| Reference selection | contrast-aware picker + anti-dominance ledger | **new** `src/ai/referenceSelect.ts`, shared by both harnesses |
| Critique / review | **defer** | - |

**Critique is deliberately deferred.** `src/ai/CLAUDE.md` already gates "a selective vision
taste critic" on benchmark proof, and `docs/GOALS.md` Era 5 records a measured finding that the
pipeline does not beat a competent iterator on single-graphic quality. Adding a critique stage
costs a model call per generation and is the least likely of the four to pay for itself. Revisit
only after the reference work has a measured result.

Note the asymmetry worth preserving: `src/ai/CLAUDE.md` principle 2 states prompts must give
"reasoning criteria ... never a fixed aesthetic". A reference card is **not** a fixed aesthetic
- it is one candidate vocabulary among many, explicitly framed as ignorable ("the brief always
outranks the reference"). Keeping cards as *selectable, contrastive, refusable* options is what
keeps this compatible with the doctrine rather than in tension with it.

---

## 6. Reference-library schema and retrieval

### 6.1 The legal architecture, decided first

The schema is shaped by the constraint, not the other way round. **The library stores no
images and no copied prose.**

A card is an *original, abstracted description of a design convention*, written in NoaCG's own
words - exactly what the existing six cards already are. Source URLs are recorded for human
provenance only: never fetched at generation time, never embedded, never shown to the model.

This keeps the whole system on the safe side of every open question in §7 by construction:

- no copies stored, so the reproduction right is never implicated
- no image ever reaches a model, so the "AI reference use" question does not arise
- styles and conventions are not copyrightable - only specific expression is
- trade dress is avoided structurally: **no card may instruct imitation of a named network or
  package.** A card may say "Nordic public-broadcasting convention: generous air, humanist
  sans, restrained palette"; it may not say "look like NRK".

That last rule is the difference between extracting design DNA and cloning a package, and it
should be enforced in review, not merely intended.

### 6.2 The card schema

Extends the proven `ReferenceCard` shape rather than replacing it. `id`, `keywords`, and `card`
are unchanged and stay compatible with today's six cards.

```ts
export interface ReferenceCard {
  id: string;
  keywords: RegExp;          // eligibility filter (unchanged)
  card: string;              // the prose design DNA (unchanged)

  /** Orthogonality axes - these drive contrast selection, not the prompt text. */
  axes: {
    /**
     * THE TWO MOST DISCRIMINATING AXES. Regional research found these separate design
     * cultures far more sharply than colour or typography, and they are exactly what the
     * model's US-default prior gets wrong. Nordic (1-2 / 'beside') and Japanese (5-7 /
     * 'overlay-annotated') are opposite extremes and the best pair for proving the
     * generator responds to metadata at all.
     */
    infoLayers: 1 | 2 | 3 | 4 | 5 | 6 | 7;   // simultaneous semantic layers permitted
    graphicImageRelation: 'beside' | 'is-the-image' | 'overlay-annotated'
                        | 'fused-3d' | 'wraps-presenter';

    density: 1 | 2 | 3 | 4 | 5;                    // air <-> cockpit
    geometry: 'orthogonal' | 'skewed' | 'chamfered' | 'circular' | 'organic';
    typeVoice: 'condensed-caps' | 'geometric-sans' | 'humanist'
             | 'serif-editorial' | 'mono-technical' | 'display-expressive';
    colorBehavior: 'restrained' | 'committed' | 'full-palette' | 'drenched';
    motionLanguage: 'snap' | 'glide' | 'mechanical' | 'organic' | 'cut';
    surface: 'flat-graphic' | 'lit-material' | 'glass' | 'paper-texture' | 'screen-native';
    era: '1990s' | '2000s' | '2010s' | 'contemporary' | 'retro-futurist';

    /** The hold IS the design in game show; unthinkable in sport. */
    holdCharacter: 'none' | 'brief' | 'dramatised';
    /** Esports elements breathe at rest; sports/news elements are static at rest. */
    idleLoop: boolean;
    /** Financial L-bar / J-screen structurally shrinks the video window. Rare elsewhere. */
    reducesVideoWindow: boolean;
  };

  /** Genre eligibility - a card may be right for sport and wrong for a memorial. */
  genres: BroadcastGenre[];   // 'sport' | 'news' | 'entertainment' | 'factual' | 'esports' | ...

  /** Human provenance. Never fetched, never sent to a model. */
  provenance: {
    kind: 'original' | 'observed-convention';
    note: string;             // how this DNA was abstracted
    sources?: string[];       // URLs for a human to verify against
  };
}
```

Against the user's requested metadata list: genre -> `genres`; graphic type -> `keywords`;
era -> `axes.era`; tone -> carried by `card` prose; density, typography, geometry, colour
behaviour, material -> `axes`; motion language, transitions, pacing -> `axes.motionLanguage`
plus `card`; suitable/unsuitable use -> `genres` plus the card's own framing; source/studio and
rights -> `provenance`.

Two requested fields are **deliberately not stored**: image treatment and any local image
copy. Both would move the system from "abstracted convention" to "stored reproduction", which
is the line §6.1 exists to hold.

### 6.3 Retrieval: contrast selection, not keyword first-match

Replaces `.filter(...).slice(0, 2)`. Three stages, all deterministic and free:

1. **Eligibility.** Filter by `keywords` match and `genres` fit. A memorial brief never sees
   the celebration card regardless of keyword overlap.
2. **Max-min contrast.** For N alternatives, greedily pick the set that maximises minimum
   pairwise axis distance (ordinal distance on `density`/`era`, Hamming on the categorical
   axes). This is what makes three options differ in *spatial system, typography, density and
   motion language* rather than in colour - the user's explicit requirement, enforced
   arithmetically instead of requested in prose.
3. **Anti-dominance.** A recency ledger down-weights cards used in the last N generations.
   Same posture and storage as `preferences.ts` (localStorage, local only, no server).

**Preventing collapse into a house style.** `preferences.ts` already has the right instincts
and they must be preserved here: gates at `MIN_SELECTIONS = 8` / `MIN_SHOWN = 6`, a
`RATIO_THRESHOLD` above base rate, a maximum of 4 facets, and prompt wording that frames
learning as "a SUBTLE tie-breaker ... the brief, genre, and references always win". Two
additions specific to references:

- **Learning biases eligibility weight, never the contrast step.** Preference may make a card
  more likely to appear; it may never reduce the spread of the chosen set. The max-min
  constraint runs last and is not preference-weighted.
- **A floor on exploration.** At least one of the three alternatives is drawn from outside the
  user's learned preferences. Without this, ratings converge the library to a house style,
  which is the failure mode the user named.

Adding `referenceCardId` to `AlternativeFacets` (`preferences.ts:40-50`) and to `AiDiversity`
(`telemetry.ts:31-39`) makes card usage both preference-learnable and visible to
`scripts/ai-compare.mjs`'s sameness tripwire, at near-zero cost.

### 6.4 Library size and shape

Today: 6 cards, all self-referential, video-only. Target for the first real pass: **18-24
cards** spanning the genre and regional space in §10, with the four NoaCG family cards retained
(they are legitimately useful, just insufficient alone).

Token cost is unchanged: selection stays deterministic and the injected text stays at 2 cards
per generation. A larger library costs nothing at runtime - it only widens what selection can
reach. This is the cheapest of all the proposed changes and the one most directly aimed at the
stated goals.

---

## 7. Copyright, licensing, attribution

### 7.1 The three skills

NoaCG is **AGPL-3.0-only** (`package.json`). All three skills are permissively licensed and
therefore **one-way compatible**: their material may be incorporated into an AGPL-3.0 work, and
the combined work is distributed under AGPL-3.0. The reverse would not hold.

| Skill | Licence | Copyright line | Obligation if prose is copied |
|---|---|---|---|
| Taste Skill | MIT | `Copyright (c) 2026 Leonxlnx` | retain notice + MIT text |
| emilkowalski/skills | MIT | `Copyright (c) 2026 Emil Kowalski` | retain notice + MIT text |
| Impeccable | Apache-2.0 | `Copyright 2025 Paul Bakaus` | retain notice, include licence, **state that files were changed** (§4(b)); no trademark grant (§6) |

Three practical notes:

- **The `SKILL.md` files carry no per-file licence header.** The grant lives only in the root
  `LICENSE`. A copied file therefore arrives with zero attribution attached; it has to be added
  deliberately.
- **Rewriting avoids the obligation entirely.** Design rules and principles are ideas, and
  ideas are not copyrightable - only their specific expression is. §3.2 recommends rewriting
  for broadcast, which is both the better engineering outcome and the cleaner licence position.
  A courtesy credit still costs nothing and is good practice.
- **`apple-design` contains short quotes from Apple WWDC talks.** Emil licenses his expression
  under MIT; he cannot license Apple's. Short and attributed, so ordinary quotation - but a
  reason not to vendor that file wholesale.

If anything is vendored rather than rewritten, add a `THIRD-PARTY-NOTICES.md` entry naming the
project, licence, copyright line, and full licence text.

### 7.2 The reference library - where the safe/unsafe line actually falls

The line falls exactly between storing images and storing descriptions, and it is clean:

| Approach | Position |
|---|---|
| Human-written textual descriptions of design characteristics | **Clearly safe.** Style sits on the idea side of the idea/expression line (17 U.S.C. §102(b); *Baker v. Selden*). Copying a style, however distinctive, is not infringement absent copying of protected expression. And the prose is NoaCG's own authorship |
| Structured enumerated design DNA (axis values, ranges, durations) | **Clearly safe, and safest of all.** Facts are unprotectable (*Feist*); these are abstractions at the highest level |
| URLs and citations | **Safe.** Linking is not copying |
| **Stored images** | **The only genuinely risky option.** Every hazard below attaches to this path alone |

**Why images are worse than they look, and why the usual fair-use intuition fails.**
*Kelly v. Arriba Soft* and *Perfect 10 v. Amazon* protected thumbnails because they served a
*different function* from the originals. **Andy Warhol Foundation v. Goldsmith** (598 U.S. 508,
2023) reframed factor one to ask whether the use shares the original's purpose. A broadcast
graphic exists to be a broadcast graphic; a library that stores broadcast graphics in order to
make broadcast graphics shares that purpose exactly. That is the weakest possible posture, and
materially worse than the thumbnail cases.

It is worse still outside the US. **The UK has no general fair use** - CDPA 1988 fair dealing is
a closed list, and a reference library feeding a product fits none of the heads (s.29 research is
non-commercial only, as is the s.29A TDM exception). **The EU** is likewise a closed list; the
DSM Art. 4 TDM exception is conditional on lawful access *and* on the rightsholder not having
reserved the right in machine-readable form, which most broadcaster sites now do.

Open-sourcing makes it worse, not better: distribution destroys any "private internal copy"
framing, and US statutory damages run to $150,000 per work for wilful infringement without
proof of loss. Honest summary: **low likelihood, high severity, cheap to avoid** - exactly the
profile where the risk gets designed out rather than managed. §6.1 designs it out.

### 7.3 The claim most likely to reach NoaCG is trademark, not copyright

This is the most useful finding in the legal research and it redirects where the engineering
effort should go.

The case law on *reference* use is reassuring: no court has held that consulting a work to
inform style creates a derivative work. The trigger is **memorisation and reproduction**.
*Getty v. Stability* [2025] EWHC 2863 (Ch) held model weights are **not** infringing copies
because they do not store the works; the Munich court in *GEMA v. OpenAI* (Nov 2025) found
infringement precisely where memorisation *was* demonstrated. *Bartz v. Anthropic* established
that acquisition provenance is decisive - lawful acquisition was "quintessentially
transformative", pirated copies were not.

But look at what actually survives. In **Getty v. Stability (US)**, on 23 April 2026, the court
**denied the motion to dismiss on every Lanham Act claim** - infringement, false designation,
dilution, UCL - while dismissing the DMCA claim. In the UK, Getty **dropped its training and
output copyright claims mid-trial** and won narrowly on trade mark. In *Andersen v. Stability*,
the claims allowed to proceed included **false endorsement and trade dress**.

Three consequences NoaCG should treat as binding:

1. **A broadcast package is close to textbook trade dress** - a source-identifying combination
   of mark, colour system, geometry, motion behaviour and sound. The BBC Blocks, the Channel 4
   "4", the Sky roundel, the ABC Lissajous and the Globo sphere clear the fame bar for
   **dilution**, which requires neither confusion nor competition (15 U.S.C. §1125(c)).
2. **The First Amendment escape hatch narrowed.** *Jack Daniel's v. VIP Products* (599 U.S. 140,
   2023) held the *Rogers* threshold test does not apply where a mark is used as a source
   designator for the defendant's own goods. Rogers will not save a tool that outputs channel
   identities.
3. **Andersen's false-endorsement claim survived because Midjourney published a list of artists
   whose styles it could reproduce.** A NoaCG UI offering "BBC News" or "Globo" as a selectable
   style preset would be that exact fact pattern. **Network names must never appear in the
   generation path, in a card, or in marketing copy.** "Nordic public-service aesthetic" is
   fine; "BBC-style" is an exhibit.

### 7.4 The resulting hard rules

These are architectural, not aspirational:

- **Two-layer schema, brand-blind at the boundary.** `provenance` is human-facing (broadcaster,
  year, studio, URL). `axes` + `card` are machine-facing and carry **no brand names**. Only the
  machine-facing layer reaches a prompt. §6.2 already has this shape; the rule is that the
  boundary is enforced, not merely intended.
- **Never single-source.** Every generation draws on at least two, preferably three, unrelated
  references with a cap on any one reference's weight. §6.3's contrast selection does this
  already - which means the variety mechanism and the legal mitigation are **the same
  mechanism**. That is a genuinely convenient alignment and an argument for building it well.
- **Abstract to the cluster, not the instance.** Store "Nordic public-service news, 2020s" with
  ranges - never one broadcaster's exact lower third.
- **Never feed real broadcaster frames as img2img or style-reference conditioning.** Describing a
  design in words sits on the idea side of §102(b); passing pixels into conditioning at
  inference does not. This is the single technical choice that would move NoaCG from safe to
  contested, and NoaCG should simply not build that path.
- **Own the type.** Use the bundled OFL faces. Never ship NRK Sans, BBC Reith, Sky Sports Sans
  or the ITV F37 families - font software is copyrightable in the US, and **typefaces are
  protected artistic works in the UK for 25 years** under CDPA ss.54-55.
- **Output-side guardrails.** Since trademark is the live risk, checks belong on the output:
  detection against known broadcaster wordmarks and roundels. The US Copyright Office's 2025
  Part 3 report confirms output guardrails weigh in a developer's favour.

### 7.5 Genuinely open sources

Worth knowing, because one common assumption is wrong:

- **ZDF Terra X Creative Commons** (`terrax-cc.zdf.de`) - ~50 clips released June 2020 under
  **CC BY 4.0 / CC BY-SA 4.0**, mostly graphic explanatory units. Actual broadcast motion
  graphics that may be reused. The best genuinely open broadcast-graphics source found.
- **Open Images / Open Beelden** (`openimages.eu`) - Netherlands Institute for Sound and Vision,
  CC-licensed AV archive with a public API.
- **Internet Archive TV News Archive** - a research *access* right under 17 U.S.C. §108(f)(3),
  **not a reuse licence.** Perfect for observing and describing; not for storing.
- **Correction worth recording: the BBC Creative Archive is defunct.** It was a pilot that ran
  from autumn 2004 to September 2006, UK-only and non-commercial, roughly 500 clips. BBC Motion
  Gallery and BBC Rewind are commercial licensing operations. Do not architect around BBC
  openness.

---

## 8. Proof of concept

Small, isolated, measurable, and confined to the video harness - which already has the
mechanism, the bench, and a defined review rubric. Nothing in the SPX path is touched until
this reports.

### 8.1 Why the video harness first

`src/ai/video/referenceCards.ts` already exists and works, `scripts/video-bench.mjs` already
measures runs, and `docs/VIDEO_DESIGN_QUALITY_PLAN.md` §5 already defines "distinctiveness
across briefs" as a scored axis. The variety claim can therefore be tested against an existing
rubric with no new measurement infrastructure.

### 8.2 Steps

1. **Add the `axes` / `genres` / `provenance` fields** to the six existing cards. Pure
   metadata; no prompt text changes; no behaviour change. Verifies the schema fits reality.
2. **Add 6 new orthogonal cards** from §10 - deliberately chosen to occupy axis positions the
   current six leave empty (high-density data, mono-technical type, drenched colour,
   paper-texture surface, cut motion, retro-futurist era).
3. **Implement `referenceSelect.ts`** with max-min contrast selection and the recency ledger.
   Keep the old path behind a flag so A/B is a one-line switch.
4. **Free plumbing check.** `node scripts/video-bench.mjs <dir> --stub` exercises the bench RIG
   for free - navigation, engine pick, capture, the checks - and nothing more. It does **not**
   verify selection: `--stub` seeds an empty key, so `getVideoAiProvider()` resolves to
   `stubVideoProvider`, which never imports `referenceCards`. `selectReferenceCards` is called
   from exactly one place, `claudeVideoProvider.ts`, on the paid path. Verify the selector
   itself with `node scripts/reference-select-check.mjs`, which imports the real module through
   the dev server and prints both arms over the real brief bank, with the axis spread of each
   pick. It reads the BANK rather than invented strings on purpose: keyword-shaped test strings
   hid that an earlier selector was inert on 6 of 7 real briefs. Also replay the 57-file corpus
   in `e2e/fixtures/generations/` through `scripts/probe-composition.mjs` for free.
5. **Real-token A/B.** Same brief bank, same model, two arms: current keyword selection vs
   contrast selection. `scripts/video-bench.mjs` with the varied brief bank.
6. **Judge on the existing five axes**, with distinctiveness-across-briefs as the primary
   metric and clean rate as a guardrail. The change must not regress `isClean`.

### 8.3 Decision rule

The repo's standing rule applies unchanged: *each change keeps its place only if the gallery
shows a clear improvement for its cost.* Because selection is deterministic, the token cost of
this change is **zero** - which means the bar is simply "measurably more distinct, no worse on
clean rate". If it does not clear that, the cards revert and the seven motion additions from
§2.3 stand on their own.

### 8.3b Measured before paying: the mechanism does not move the primary metric

`scripts/reference-select-simulate.mjs` replays a whole pass deterministically, so the two arms
could be compared on REFERENCES for free before buying generations. Over 11 real briefs (the
varied bank plus the four shipped chips), 3 runs, the bench's exact order and warming ledger:

| | contrast | legacy |
|---|---|---|
| distinct picks | 17 | 8 |
| across-brief mean distance | 0.505 | 0.522 |
| across-brief mean, run 1 only | 0.517 | 0.522 |
| two briefs given the same pair | 5 | 0 |

**Contrast selection does not improve distinctiveness across briefs - the primary metric.** On
run 1, which is the honest read (it takes ledger rotation out, since the rubric scores that
separately as within-brief variation), the two arms are a wash and contrast is fractionally
behind. Every measurable gain lands on within-brief rotation instead: 17 distinct picks against
8, and 3 variants per brief against 1.

Three structural causes, all visible for free:

1. **The anchor dominates the pick and is exempt from anti-dominance by design.** Of 7 matching
   briefs, `editorial-warm` anchors 3 and `sport` 2 - so five of seven share two anchors, and
   the anchor never rotates and never ages out. Contrast only ever chooses the COMPANION, the
   lesser half of the pick, while the metric is dominated by the anchor.
2. **The anchor is `matched[0]` - array order, not match strength.** Where several cards match,
   nothing picks the best or the least-recently-used one.
3. **Keyword coverage has a hole.** 4 of 11 briefs (single-word hero, logo sting, logo reveal,
   countdown) match NO card, so both arms inject no reference at all - 36% of a paid pass would
   buy no signal on selection, and those generations get zero design DNA either way.

Note what this does and does not settle. It compares the references handed over, not the videos
made from them, so it cannot prove the feature worthless - two more-contrasting companions might
still yield a better single design. What it does establish is that the paid A/B **as designed**
would very likely return "no improvement on the primary metric", which is worth knowing before
the money rather than after. The earlier encouraging figure (0.765 vs 0.505) measured spread
WITHIN a pick, which is a different quantity from distinctiveness ACROSS briefs; the feature was
being justified on the wrong one.

### 8.3c Closing the coverage hole changed the answer

Cause 3 above was fixed first, because it is a product defect regardless of how the A/B lands:
a brief matching no card is generated with **no design DNA at all**, in either arm. Two genuinely
missing worlds were authored (`brand-ident`, `countdown-clock`) and `graphic-poster` - which
already described the stark full-frame register - had `stark|full-frame|cold open` added to its
keywords. Pool 12 -> 14.

| 11 briefs x 3 runs | before | after |
|---|---|---|
| briefs matching any card | 7/11 | **11/11** |
| across-brief gain, run 1 | -0.005 | **+0.019** |
| across-brief gain, full pass | -0.017 | -0.010 |
| cross-brief collisions (contrast vs legacy) | 5 vs 0 | 7 vs 9 |

So the selector was being judged largely on briefs it never saw. With coverage closed it moves
ahead of the keyword pick on the primary metric and now produces FEWER duplicate pairs than
legacy rather than more. The verdict is nonetheless **marginal, not vindicated**: +0.019 is a
small edge, and the full-pass figure is still slightly negative.

One artifact the fix exposed, and it is the mechanism's own shape rather than a bug: **max-min
contrast makes the most axis-extreme card the universal companion.** `brand-ident` is the only
card at `fused-3d`, so it is maximally far from everything and takes the companion slot 9 times
of 33; on a cold ledger `data-terminal` does the same. The anti-dominance ledger rotates the
winner but does not stop the pattern. Adding a card at a novel axis position therefore does not
just add a genre - it installs a new default companion, which is worth knowing before authoring
more of them.

### 8.3e Fixing the two structural causes

Causes 1 and 2 from §8.3b were then fixed directly, since both are indefensible on their own
terms regardless of the metric.

**The anchor was `matched[0]` - declaration order.** It is now the strongest match: the count of
DISTINCT keyword phrases the prose contains, then their total length, with recency breaking ties
only among equally strong matches so anti-dominance can never override relevance. The effect is
small but real and clearly correct where it fires: the esports opener anchored `sport` (matched
once, on "energy") purely because that card is declared earlier, and now anchors
`competitive-overlay` (matched twice, on "esport" and "gaming"). An esports brief was being read
as a generic sports brief by an accident of array order.

**Anti-dominance was an eligibility FILTER, so it could not fix companion dominance.** Filtering
recent cards still leaves the contrast step taking argmax-distance over the survivors, so the
furthest-out remaining card wins every time and the ledger only rotates which extreme that is.
It is now a continuous penalty subtracted from the candidate's score (`RECENCY_WEIGHT`, 0.25 in
axis-distance units - see the constant for why that magnitude), which discourages without banning.

| 11 briefs x 3 runs | coverage only | + mechanism fix |
|---|---|---|
| across-brief gain, run 1 | +0.019 | **+0.043** |
| across-brief gain, full pass | -0.010 | **+0.040** |
| run-1 collisions, contrast vs legacy | - | 1 vs 1 (tied) |
| top-3 cards' share of all slots | 47% | **41%** |

The full-pass figure is now positive too, so the result no longer depends on which read you take.
Note the full-pass COLLISION count rose (7 -> 14 against legacy's 9) while the run-1 count stayed
tied at 1: a global ledger pushes different briefs onto the same alternatives in lockstep on
later runs. That is runs 2-3 behaviour, scored under axis (4), and it is the honest cost of
rotation.

Two cards (`stage-format`, `public-service-nordic`) now go unused across the whole corpus. They
are narrow-genre cards that nothing in this bank asks for - worth knowing, not worth forcing.

None of this changes the standing conclusion: these are still measurements of REFERENCES, not of
videos. The gain is real and roughly doubled, and it is still a proxy.

### 8.3d The paid pass's verdict, written down before it runs

Fixed here, in advance, because the free work above already tells us the expected effect is
SMALL - and a small expected effect is exactly the situation where a bar chosen after seeing the
gallery stops being a measurement. The repo's doctrine is a trustworthy before/after; deciding
what counts as a win afterwards voids it.

**Design.** Both arms over the same bank, same model, same engine (`--engine` defaults to
remotion, so one engine unless stated). Flip `USE_CONTRAST_SELECTION` between arms and change
nothing else. Run `reference-select-simulate.mjs` on the bank first and paste its output into the
result write-up, so the references each arm was handed are on the record beside the videos.

> **AMENDED 2026-07-20, before any spend - see §8.3f.** Two of the sentences above are now known
> to be wrong, and they are corrected rather than quietly dropped because the point of writing a
> verdict down early is that it can be caught being wrong.
>
> 1. **"Flip `USE_CONTRAST_SELECTION` and change nothing else" is not a controlled comparison.**
>    The keyword path is `filter(...).slice(0, 2)`, so a brief matching one card is handed ONE
>    card, while contrast anchors one and always widens to two. The arms differed in HOW MUCH
>    reference prose was injected, not only in which cards. The control arm is therefore the
>    **dosage-matched padded-legacy** arm added to `reference-select-simulate.mjs`, never raw
>    legacy.
> 2. **The free gate's headline number does not stand in for the primary metric, and on this
>    mechanism the two move in opposite directions.** See §8.3f. The gate now reports spread and
>    collisions beside the mean, and vetoes on them independently.

**Primary metric - distinctiveness across briefs (§5 axis 3).** Judged on hold-phase frames,
comparing briefs against each other. Contrast wins only if a reviewer can identify MORE briefs as
visually distinct designs than in the legacy arm. A tie is not a win: the feature costs
maintenance and card authoring, so it must clear the bar, not reach it.

**Guardrail - clean rate.** `isClean` must not regress at all. A distinctiveness gain bought with
more validation failures is a loss.

**Judged separately, and NOT admissible for the primary.** Within-brief variation (§5 axis 4).
Contrast will win this by construction - the ledger rotates companions, which is the mechanism's
one uncontested effect. Counting it toward the primary would be scoring the same behaviour twice.
Judge axis 4 on runs 2-3, and judge axis 3 on run 1 only, where every brief sees the same ledger.

**Confounds to state in the write-up, not discover afterwards.** The 4 briefs that used to match
nothing now do (§8.3c), so this bank is not comparable to any earlier pass. The most
axis-extreme card dominates the companion slot, so a distinctiveness gain may be that ONE card's
effect rather than the selection mechanism's - check the histogram before crediting the mechanism.

**What ends it.** If the primary is a tie or a loss, contrast selection reverts. The 14 cards and
the seven motion additions in §2.3 stay either way: coverage and motion principles earned their
place independently, and neither depends on how the companion is chosen.

### 8.3f The proxy rewards the mechanism's worst behaviour

Written before the paid pass, which has still not been run. Two findings, both free, both
measured on the 7-brief bench bank at 3 runs with the bench's real order and warming ledger.

**Finding 1 - the arms differed in dosage, not only in choice.** `detectReferenceCards` is
`filter(...).slice(0, 2)`; `selectReferenceCards` anchors one and always widens to two. So on the
3 of 7 briefs matching a single card - 9 of 21 generations - legacy injected one reference and
contrast injected two. A gallery win under that design could not be attributed to the selection
mechanism, because "two cards of design DNA beat one" explains it just as well and costs a
one-line change to the keyword path. `reference-select-simulate.mjs` now runs a third arm,
**padded-legacy**: the keyword choice rule, in declaration order, topped up to two from the same
genre-compatible field contrast draws from. Dosage held constant, only the companion varying.

Measured, the confound turns out to be modest - the run-1 gain falls from **+0.054** against raw
legacy to **+0.048** against the dosage-matched control, so 11% of the headline was dosage. The
comparison was still uncontrolled, and the fix is cheap, so the control stays.

**Finding 2 - and this is the one that matters.** The mechanism concentrates. `data-terminal`
takes 8 of 21 companion slots and `dense-telop` 5: **62% of every companion comes from two cards
that no brief in the bank ever matches.** They win because they sit at the axis extremes, so they
are the furthest card from *any* anchor, and the recency ledger only rotates which of the two it
is. The spread of reference sets collapses with it - run-1 sd **0.052** against the control's
0.135 - and only a third of companions share even two genres with the card they accompany.

It is not merely a statistical artifact. It hands out guidance that is wrong on its face: a warm
Sunday-morning cooking title is given the dense variety-telop card, and a channel ident is given
the financial trading-terminal card.

So the obvious next move was to fix the companion rule and re-measure. `scripts/reference-companion-sweep.mjs`
sweeps the candidates against the dosage-matched control, holding the anchor rule fixed:

| companion rule | run-1 mean | run-1 sd | top-2 share | distinct companions | genre fit |
|---|---|---|---|---|---|
| argmax (shipped) | 0.581 | 0.052 | 62% | 7 | 0.33 |
| band 0.55 | **0.503** | 0.127 | **38%** | 8 | 0.43 |
| band 0.65 | 0.507 | 0.104 | 43% | 9 | 0.43 |
| band 0.75 | 0.556 | 0.071 | 43% | 10 | 0.33 |
| argmax, 2+ shared genre | 0.573 | 0.083 | 57% | 7 | 1.00 |
| argmax, recency x3 | 0.552 | 0.061 | 38% | 10 | 0.33 |
| padded-legacy (control) | 0.533 | 0.135 | 71% | 4 | 0.86 |

**Every rule that de-concentrates moves the proxy toward or below the control.** Targeting a
contrast BAND instead of the maximum gives visibly better companions - the esports opener gets
`sport`, the ident gets `noacg-house` - and scores 0.503, *below* the keyword control it is
supposed to beat.

That is not a tuning problem. `setDistance` is the mean cross-distance between two picks, so it is
maximised by handing every brief the most mutually-alien card available, which IS the
concentration. **The proxy's reward and the mechanism's worst behaviour are the same quantity.**
The +0.043 that this document has been treating as the expected effect size is therefore largely a
measurement of how reliably the selector reaches for an extreme, not of how distinct the resulting
designs would be - and the pre-registered primary metric, a COUNT of visually distinct designs,
is exactly what concentration and a collapsed spread would push DOWN.

**What this does and does not settle.** It does not show contrast selection produces worse videos;
nothing here has generated a frame. What it settles is narrower and enough to act on: the free
gate cannot green-light the paid pass, because the number it would green-light on is measuring the
artifact. Any paid A/B run from here needs a primary metric that is not a monotone function of
axis distance, or it will confirm the mechanism by construction.

The 14 cards and the seven motion additions in §2.3 are untouched by all of this, exactly as
§8.3d anticipated: coverage and motion principles never depended on how the companion is chosen.

### 8.4 Explicitly out of scope for the PoC

Generating a library of graphics. Touching the SPX harness. Adding a critique model call.
Installing any third-party skill into the generation path. Changing validation, export,
templates, timeline, or render.

---

## 9. Boundaries - what would eventually change

Tight by design. Everything below is additive; nothing replaces working functionality.

**Phase 1 - PoC (video only)**

| File | Change |
|---|---|
| `src/ai/video/referenceCards.ts` | add `axes`/`genres`/`provenance`; grow 6 -> 14 cards |
| `src/ai/referenceSelect.ts` | **new** - contrast selection + recency ledger |
| `src/ai/video/claudeVideoProvider.ts` | selection call site only (~1 line, behind a flag) |
| `src/ai/video/prompts.ts` | the 7 motion additions from §2.3 (~200-300 tokens) |
| `docs/BROADCAST_DESIGN_SYSTEM_RESEARCH.md` | this document |

**Phase 2 - only if Phase 1 measures well (SPX)**

| File | Change |
|---|---|
| `src/ai/referenceCards.ts` | **new** - SPX-side library sharing the same schema |
| `src/ai/claudeProvider.ts` | one conditional splice into `specSystemPrompt()`, using the existing `preferenceHint()` idiom at lines 240-243 |
| `src/ai/designSpec.ts` | optional `referenceCardId` on the spec schema |
| `src/ai/preferences.ts`, `src/ai/telemetry.ts` | add `referenceCardId` facet |
| `docs/DESIGN_LANGUAGE.md` | §1 and §4 additions from §3.2 |

**Phase 3 - authoring side, independent of both**

`.claude/skills/broadcast-motion-critique/SKILL.md` (gitignored). Optional pinned install of
`emilkowalski/skills`.

**Never touched by this work:** `src/validation/`, `src/export/`, `src/templates/`,
`src/blocks/`, `src/render/`, `src/components/`, `src/model/`, `api/`, `render-worker/`,
`player-host/`. No change to the SPX contract, the `:root` contract, the marked ANIMATION
region, or any export target.

**Interaction with active work:** the only shared file with any other in-flight branch is
`src/ai/video/prompts.ts`. Phase 1's additions there are append-only within `MOTION_PRINCIPLES`
and should be landed as a single small commit to keep merges trivial.

---

## 10. Reference sources

### 10.1 These are a reading list, not a crawl target

Research into the rights posture of the obvious sources produced a decisive result, and it
confirms the §6.1 architecture rather than complicating it:

- **Creative Review's robots.txt names and blocks `ClaudeBot`, `GPTBot`, `CCBot`,
  `Google-Extended`** with `Disallow: /`.
- **Vimeo's robots.txt states outright** that access to user content and metadata "is not
  permitted for scraping, harvesting, or use in training machine learning models." Art of the
  Title, Stash and most studio sites embed Vimeo, so this reaches further than it first looks.
- **The One Club (One Show + ADC + TDC)** is `User-agent: * / Disallow: /` with allowlist
  exceptions for search engines only.
- **Behance** rate-limits on the first request and its public API has been dead since ~2021.

**Under the proposed design none of this binds NoaCG, because NoaCG never crawls.** A human
reads these sources and writes an original abstracted card; the URL is stored for provenance
and never fetched. That removes the crawler, the storage, the rights exposure, and the ML-training
prohibition question in one move. The cost is human authoring effort for 18-24 cards - bounded,
one-time, and precisely the step that produces genuine abstraction instead of scraped noise.

**This is a deliberate rejection of the "Class A crawlable / Class B link-only" split** that a
larger reference pipeline would normally use. At this library size, crawling buys nothing that
careful authoring does not, and costs a great deal of rights surface.

### 10.2 The list

Ranked by signal per unit of reading time. Verified during this research; several widely-cited
names turned out to be dead and are called out.

**Tier 1**

| Source | URL | Why |
|---|---|---|
| NewscastStudio graphics gallery | `newscaststudio.com/graphics/` | The biggest gap-filler found. Organised by show and event, free, large still galleries, studio attribution. RSS at `/graphics/feed/` |
| The Motion Awards | `motionawards.com` | Categories map directly onto this problem: News/Sports/TV » Graphic Package. Free, back to 2016 |
| Motionographer | `motionographer.com` | Best source for motion *breakdowns* with attribution. Tags `project_breakdown`, `studiostories` |
| Art of the Title | `artofthetitle.com` | Exhaustive credits, browsable by studio and designer |
| Television Academy Emmy database | `televisionacademy.com/awards/awards-search` | Authoritative index (Outstanding Main Title Design, Outstanding Live Graphic Design). Note: credits only, no stills |
| SVG PLAY | `svgplay.sportsvideo.org` | Recorded Sports Graphics Forum sessions - designers narrating their own decisions over frames. Highest signal-per-minute source found |

**Tier 2** - D&AD Pencil winners (`dandad.org/awards/pencil-winners/`), Stash Media
(`stashmedia.tv`, paywalled: $99/yr personal, free RSS carries credits), Clio Entertainment and
Clio Sports (`clios.com/winners-gallery/explore/`), G.E.M.A. (ex-Promax/BDA - the 2024 rebrand
disrupted the archive; the free Issuu winners books at `issuu.com/promaxglobal` are the more
reliable historical record), Brand New (`underconsideration.com/brandnew/`) for critical writing
on *why* an identity works.

**Studios worth indexing.** Corrections first, because several commonly-cited names are gone:

| Commonly cited | Actual status |
|---|---|
| Elastic (`elastic.tv`) | 301s to `makemake.com` - consolidated into MAKEMAKE, autumn 2025 |
| Superunion | Merged into Design Bridge and Partners; domain 404s |
| Method Studios | Brand retired; 301s to `company3.com` |
| Troika | Chapter 11; `troikamedia.com` 404s. **Do not index** - though their historic NBC Sunday Night Football and CNBC work remains worth studying |
| ChyronHego | Rebranded to plain **Chyron** in 2022 |
| Gmunk | Individual artist (Bradley Munkowitz), not a studio |
| Studio Output | Domain is now a parking page |

Live and worth reading, grouped by what they actually do:

- **Channel identity / broadcast branding:** DixonBaxi, Trollbäck+Company, Gretel, loyalkaspar,
  Block & Tackle, Art&Graft, Red Bee Creative (the BBC ident lineage), Nomad Studio,
  DesignStudio, Design Bridge and Partners, Venturethree, Mainframe.
- **Sports packages:** Drive Studio (`drivestudio.com/broadcast/` - the densest sports portfolio
  found, client and year on every entry), Girraphic, Reality Check Systems, Gameday Creative,
  Alston Elliot (operator/integrator more than design house), MOOV.
- **News and elections:** Astucemedia (the most genuinely election-specialist shop found),
  Clickspring Design, Devlin Design Group, Eyeball.
- **Titles and craft:** Imaginary Forces, Prologue, MAKEMAKE, Territory Studio (screen
  graphics/FUI - a distinct and directly relevant discipline), yU+co, Perception.
- **Motion craft:** Buck, ManvsMachine, Golden Wolf, NOMINT, Sehsucht, Aixsponza, Nexus,
  Not To Scale, Digital Kitchen (`thisisdk.com`), Oddfellows, Giant Ant.
- **Vendor case-study libraries** - structured, client-attributed, and built to be read:
  Vizrt (`vizrt.com/community/case-studies/`, 211 studies, genre-categorised), Chyron,
  Ross Video, Singular.live, Pixotope, Zero Density, wTVision.

**Explicitly deprioritised:** Behance and Dribbble (unattributed reposts and decontextualised
crops beside real work, no quality signal - use for discovering studio names only), Pinterest,
and the education businesses (School of Motion, Motion Hatch, Motion Design School) which are
useful for craft vocabulary and worthless as a visual corpus.

---

## 11. Genre design DNA

This is the vocabulary that becomes cards. It is synthesised from the sources in §10 - working
parameters to tune, not published specs. The value is that the genres differ *systematically*,
which is exactly what contrast selection needs.

**Sports.** Condensed-to-extra-condensed grotesque, black weight, all-caps, tight tracking
(-10 to -25/1000em). **Tabular lining figures are mandatory** - proportional figures make a
ticking clock jitter horizontally, and that is the single most common amateur tell. Score digits
run 1.5-2.5x team abbreviations. Two-layer colour: a neutral network chassis carrying *team*
colour as variable payload, increasingly as a solid colour field behind a 2-3 character
abbreviation rather than a logo, because colour fields survive small sizes where logos mush.
Skew 8-14deg is the inherited speed signifier. Persistent bug is 4-8% of frame area; full-screens
60-100%; everything inside a 5% title-safe inset. Motion snaps: 8-14 frame builds, aggressive
fast-out/slow-in, 2-4 frame staggers, exits faster than entrances at 5-8 frames. **Scores hard-cut
or flip - they never tween.** Clocks are monospaced and never animate.

**News and elections.** Inverts sports almost point for point. Humanist or neo-grotesque sans at
*regular-to-medium* weight, mixed case, generous tracking, larger x-height. Condensed cuts are
for tickers only, never headlines. Restrained near-monochrome chassis with one saturated accent.
Rectilinear, no skew; rules and hairlines rather than chamfers. Lower third occupies the bottom
15-22%. Motion glides: 15-25 frame builds, symmetric ease, minimal overshoot, nothing bounces or
rotates - the affective register is *composure*, and motion that draws attention to itself reads
as untrustworthy. Breaking news is the sanctioned exception. Elections are the genre's density
exception, running full-frame, and **vote counts roll rather than cut, because the count is the
drama.**

**Esports.** The densest genre: a MOBA overlay routinely takes 15-25% of frame. Two-register
type - a game-derived display face plus a compact UI face at 12-18px equivalent, far smaller
than any traditional sport would accept, because the audience is game-literate. Side colour
(blue/red, attack/defence) is structural and outranks team brand colour. Dark chassis at 60-85%
opacity because it composites over a bright game render. Fastest motion in broadcast: 4-10 frame
builds, 1-2 frame staggers across 6-10 sub-elements. **Idle loops are constant** - breathing
glows, animated grid textures - a real distinction from sports and news, where an element at
rest is genuinely static.

**Financial.** The one genre where the numeral is the primary design object. Tabular figures are
absolutely mandatory; near-monospaced treatment so that a price ending .00 and one ending .99
occupy identical width. **The L-bar / J-screen structurally shrinks the video window to 70-80%
of frame** - a signature that essentially does not occur elsewhere. Motion is continuous rather
than event-based: the crawl runs a constant ~90-130 px/sec at 1080p, and individual quote updates
flash a coloured cell for 6-12 frames then decay (the "tick flash" borrowed from trading
terminals). Least director control of any genre - the market decides when a number changes, so
the design must absorb digit-count changes without reflow.

**Game show and entertainment.** Structurally inverted: the graphic *is* the content, not an
overlay, and is frequently a physical LED surface shot in-frame rather than a keyed layer - so
it must survive being a lit object in a room. Occupancy 30-100%. Type is the largest on
television. Lozenge and pill forms dominate. Bevel, bloom and volumetric light remain
*legitimate* here in a way they were abandoned everywhere else after ~2015; a flat aesthetic
reads as wrong. **The hold is the design:** build 12-20f, then 1-4 seconds of dead air on a pulse
loop, then resolve 6-10f, then celebrate 30-60f. A 4-second hold would be unthinkable in sports.

### 11.1 Semantic colour is a lookup table, not a palette choice

The most important single finding for correctness, and it is not an aesthetic matter:

- **Financial up/down inverts by region.** Western markets: green up, red down. Japan, mainland
  China, Korea, Taiwan: **red up, green/blue down.**
- **Political party colours are region-locked and factual.** US red=Republican / blue=Democrat.
  UK blue=Conservative, red=Labour, orange=Lib Dem, yellow=SNP. Germany black=CDU/CSU, red=SPD,
  green=Greens, yellow=FDP, blue=AfD.

Getting these wrong is a factual error, not a taste failure. They belong in a locale lookup
consulted by the generator, **not** in a reference card and **not** in the model's discretion.
Worth treating as a hard constraint in the same class as the SPX field contract.

---

## 12. Regional design cultures

This is the direct answer to "output defaults to generic American tech branding".

### 12.1 The insight that matters most

**The cultures do not differ mainly in taste. They differ in information architecture** - how
many simultaneous semantic layers a screen is permitted to carry, and whether the graphic sits
*beside* the image or *on* it. Everything else follows from those two choices.

That is why §6.2 promotes `infoLayers` and `graphicImageRelation` to the top of the axis list.
They discriminate harder than colour or typography, and they are precisely what a US-default
prior gets wrong.

| Axis | Nordic | British | Japanese | Brazilian | American |
|---|---|---|---|---|---|
| **Simultaneous layers** | **1-2** | 2-3 | **5-7** | 2-3 | 4-5 |
| **Graphic vs image** | **beside** | **is the image** (ident as short film) | **on** it, annotated | fused in 3D light | wraps presenter |
| Type strategy | one bespoke variable humanist doing every job; no pairing | authored, named, story-bearing | mixed-script: gothic for impact, mincho for gravitas | rounded humanist, warm | condensed grotesque, heavy |
| Case | **sentence case, lowercase-preferring** | mixed, editorial | N/A for CJK | **lowercase for proximity** | **ALL CAPS**, tight |
| Colour model | a **program**: named, genre-coded, flat, mid-chroma | **single-hue channel ownership** + an inhabited world | **semantic legend**: red=evacuate, yellow=attention, blue=info | saturated, tropical, full-spectrum | red/white/blue, glossy |
| Gradients | **actively removed** | used as *space to travel through* | rare; flat fills + hard outlines | luminous, refractive | decorative bevel/chrome |
| Motion | **slow, singular, physical.** One transform per beat, 400-800ms, **no overshoot** | camera moves, not UI transitions | **fast, staccato, per-word**, SFX-locked | **continuous curvilinear**, nothing snaps | fast, whoosh-synced, overshoot + blur |
| Depth | flat | shallow 3D / real space | flat with outline separation | **volumetric, light-as-material** | faux-3D bevel |
| Logo attitude | **untouched heritage anchor** | **playful, deconstructible, withheld to the last beat** | persistent corner bug | **a 3D object living in space** | locked, always visible |
| Underlying value | public-service legibility; nothing shouts | channel as editorial personality | max simultaneous info + explicit emotional framing | warmth, spectacle, national self-image | urgency, authority, scale |

**Nordic and Japanese are the opposite extremes on nearly every row, which makes them the
correct test pair** for proving the generator responds to metadata rather than reverting to its
US prior. If a Nordic brief and a Japanese brief produce visually similar output, the reference
system is not working.

### 12.2 Anchors worth reading

- **Nordic.** NRK's 2022 masterbrand by **ANTI** with variable typeface **NRK Sans** by
  Typotheque is the strongest single reference - and note that **the 1979 logo was deliberately
  left untouched** while everything around it changed. Yle's 2024 overhaul colour-codes by
  division (violet news, lime sport). SVT's 2016 rebrand *removed* gradients. DR's radio identity
  divides the format into two equal fields with headlines hyphenated to mimic musical rhythm.
- **British.** Channel 4, 2 November 1982, **Martin Lambie-Nairn** - nine blocks assembling into
  a "4", a literal visual translation of the publisher-broadcaster model, animated in Los Angeles
  because no UK computer could do it. BBC Two 1991 (Lambie-Nairn, 30+ idents). Channel 4 2023
  (Pentagram + 4creative) reassembled the blocks after eight years apart. BBC One "Lens" 2022
  (ManvsMachine) - **this is the correct ManvsMachine broadcast credit**, not BBC Two 2018.
- **Japanese.** **Telop** (テロップ) is the defining system and the sharpest contrast with Western
  practice: multi-coloured *per phrase*, heavy double outlining plus shadow so it survives over
  arbitrary video, word-synchronous entry locked to sound effects. The academic treatment
  (Sasamoto, O'Hagan & Doherty, *Television & New Media*, 2017) finds telop is **affective, not
  merely informational** - deployed to instruct the viewer how to *feel* about what was said.
  That is a fundamentally different brief from a Western lower third. The **L-shaped disaster
  layout** is architecturally mandatory, and its colour is a fixed legend, not a mood.
- **Brazilian.** **Hans Donner** created Globo's 1976 mark - a sphere with a screen cutout
  containing a second sphere, the Earth seen through a television - then founded Globo's
  Departamento de Videografia, which took over all visual output. The 2021 unification chose
  **lowercase letterforms explicitly for proximity** and rounded typography for "circle and
  movement".

### 12.3 Known gaps, recorded rather than papered over

RÚV (Iceland) has no documented major rebrand with a named studio. Yle's 2012 agency could not
be verified. SBS Australia, the CNA 2019 agency, and **all of Africa** (SABC, M-Net/SuperSport,
West and East African networks) returned nothing substantive. If Africa matters to the library
it needs dedicated primary research rather than a card written from thin sourcing.

Two attribution warnings: RAI rebrands circulating under the names "Eloisa" and "Flopicco" are
**almost certainly Behance concept work, not commissioned identity** - do not index them as
official. Korean sourcing (KBS/SBS mark origins) is Namuwiki-derived and medium confidence.

---

## 13. Summary of what was done, and what to do next

### 13.1 Status: steps 1-2 BUILT, step 3 (paid A/B) not started

The hold was lifted on 2026-07-20 and the two no-spend steps landed. **No real-token bench has
run**, so nothing here is measured against the arm it replaces - the change is verified as
*correct*, not yet as *better*.

| Step | State |
|---|---|
| 1. Seven motion additions to `MOTION_PRINCIPLES` | **done** |
| 2. Card schema + 14 cards + contrast selection behind a flag | **done** |
| 3. Real-token A/B on distinctiveness across briefs | **not started** - the next decision |
| 4. SPX-side library | not started, gated on step 3 |

**Verified:** `npm run build` green (typecheck + lint + build); **all 293 e2e specs pass**
(5.1 min); selector exercised directly through the dev server against 9 briefs.

Measured selector behaviour versus the shipped keyword pick:

| | keyword pick | contrast |
|---|---|---|
| Brief-matched card survives | - | 9/9 |
| Returns a full pair | 3/9 | 9/9 |
| Mean pair separation (0-1) | 0.39-0.58 where a pair existed | 0.688 |
| Companion rotates over 4 repeats of one brief | no | 4 distinct |

#### The selector was inert on realistic briefs (caught pre-bench)

Worth recording separately, because it nearly cost a wasted paid bench and because the
failure is invisible to unit-style checks.

Before running the A/B, the two arms were compared on the actual bench bank
(`scripts/video-bench-briefs.varied.json`). **Six of seven briefs came out byte-identical** -
the paid run would have measured almost nothing.

The cause: short synthetic test strings match one card, but real briefs are verbose prose that
match two by keyword. With `count = 2` the selector then "chose" between exactly two
candidates, which is no choice. It only engaged where a brief matched zero or one card - the
opposite of what was intended. Worse, a matched pair can itself be narrow: the awards brief
matched `celebration` + `stage-format`, two cards **0.181** apart, and a matched-only pool
cannot escape that.

Fix: anchor exactly ONE card (the best match) and always draw companions from the wider
genre-compatible field, rather than widening only when too few matched. Result on the same
bank - arms differ on 5/7, mean pair separation 0.765 against the legacy 0.505, and the awards
brief goes 0.181 -> 0.701 while keeping `celebration` as its anchor.

The general lesson: **a selection heuristic must be checked against real brief text, not
representative keywords.** The two briefs that still return no cards match no keyword at all,
so both arms agree honestly there.

#### Two things the free verification caught

Both are recorded because they are easy to reintroduce.

**Unanchored max-min discards the relevant card.** The first implementation selected the two
most mutually-unlike cards in the pool. That is a correct reading of "maximise contrast" and it
is wrong: an awards brief returned `editorial-warm` + `dense-telop` and **dropped
`celebration`** - the one card that actually matched. A nordic brief lost
`public-service-nordic` the same way. Relevance must PIN the first pick (`pickContrasting`'s
`seed` argument) and contrast may only choose the companions. Anything that maximises spread
over an unpinned pool will rediscover this bug.

**Keyword eligibility alone is too narrow for contrast to act.** Most briefs match one or two
cards, so the selector had nothing to choose between and returned exactly what the legacy path
returned. The fix is that matched cards *vote on genre* and cards sharing a voted genre join the
pool - which widens the field without letting a cooking brief reach the data-terminal card.

#### Known characteristic, for the A/B to judge

`dense-telop` is the axis outlier (6 info layers, density 5, cut motion, screen-native), so on a
**cold** ledger it wins the companion slot for 5 of the 9 test briefs. The recency ledger
disperses this within a session - four repeats of one brief gave four distinct companions - but
a first-ever generation will often see it. This is left untuned deliberately: tuning selection
weights before the measured A/B is exactly the kind of unmeasured prompt-fiddling this repo's
decision rule exists to prevent.

### 13.2 Record of changes

**Product code: untouched.** No change to any generation path, prompt text, or configuration.
All skill contents were evaluated by reading the source repositories over HTTPS (GitHub API and
`raw.githubusercontent.com`), which was sufficient to judge them fully.

Housekeeping performed alongside the research:

| Change | Detail |
|---|---|
| `docs/BROADCAST_DESIGN_SYSTEM_RESEARCH.md` | this document (new) |
| `.gitignore` | `.claude/skills/` -> `.claude/skills/*` plus named re-includes for the three first-party skills. Git cannot un-ignore a path inside an ignored *directory*, so ignoring the *contents* is what makes the exceptions possible. Vendor skills stay ignored - verified |
| `.claude/skills/video-quality-round/` | **rescued.** Was untracked, gitignored and worktree-local, never committed; deleting this worktree would have destroyed it. Now tracked by rule rather than by `git add -f` |
| `.claude/skills/video-quality-round/SKILL.md` | corrected one stale "known trap": it claimed the bench has no engine flag, but `--engine=remotion\|hyperframes` exists (`scripts/video-bench.mjs:50`). Also documented `--stub`, which runs the whole rig free. Fixed rather than enshrined, since tracking the file makes it official |
| user-level stale skills | pre-rebrand duplicates of `ograf-expert` and `spx-html-template-expert` removed from `~/.claude/skills/`. They shadowed the repo copies with no deterministic precedence, which is why each appeared twice in the skill list. Verified first: each differed from the repo copy by exactly one line, the old product name. **Moved to the session scratchpad rather than hard-deleted**, so the action is reversible |

**Installed: `emilkowalski/skills`, narrowed to `review-animations` only.** Project-scoped, so it
lands in the gitignored `.claude/skills/` and never enters git history. Two files
(`SKILL.md` + `STANDARDS.md`).

The narrowing is deliberate and worth keeping if this is ever revisited. Five of the six skills
in that repo are **model-invocable**, and they carry motion numbers this document establishes as
wrong for broadcast by 2-3x with an inverted exit curve (§2.1). A skill auto-firing while someone
edits `src/ai/video/prompts.ts` would inject "UI animations stay under 300ms" and "ease-out on
exits" into exactly the wrong session. `review-animations` alone carries
`disable-model-invocation: true`, so it cannot fire unbidden - and its verdict-tier and
Before/After/Why structure is the part actually worth reusing (§2.3). The specific *values* from
the other five are already transcribed in §2.3, so the files were not needed.

**To reverse:** `npx skills remove review-animations`. The lockfile (`skills-lock.json`) is
gitignored, so nothing about the install is committed.

### 13.3 The recommendation in one paragraph

Install none of the three into the generation path - they are agent skills and cannot reach it
(§0). Harvest seven motion principles from Emil and roughly eight typographic and colour rules
from Impeccable, rewritten for broadcast, at a cost of a few hundred tokens (§3.2). Reject Taste
Skill outright. Then spend the real effort on the thing that actually addresses the stated goals:
**a reference library with contrast-aware, anti-dominance selection**, because three of the four
goals are variety problems and no amount of taste prose fixes a mechanism that asks one model in
one pass to differentiate from itself (§4).

### 13.4 Order for when the hold lifts

1. **The seven motion additions** to `MOTION_PRINCIPLES` - smallest, safest, independently
   valuable, and one append-only edit to a single file, so it merges trivially against other
   in-flight branches. Note the standing rule from `docs/GOALS.md` Era 3: re-run the bank after
   any system-prompt change. Cheap to write, but not trustworthy until a bench pass.
2. **The PoC in §8** - schema fields, ~12 cards per §13.1, contrast selection behind a flag.
   The selector is verifiable free with `scripts/reference-select-check.mjs`; `video-bench.mjs
   --stub` and the 57-file fixture replay through `probe-composition.mjs` check the surrounding
   rig, not selection (§8.2 step 4). All of that comes before any paid run.
3. **The measured A/B** - real tokens, two arms, judged on distinctiveness across briefs against
   the five-axis rubric in `docs/VIDEO_DESIGN_QUALITY_PLAN.md` §5. This is what earns the change
   its place and clears the deferral recorded in `src/ai/CLAUDE.md`.
4. **Only if that measures well:** the SPX-side library and the `specSystemPrompt()` splice.

Steps 1 and 2-4 are independent; step 1 can land at any time without touching the reference work.

