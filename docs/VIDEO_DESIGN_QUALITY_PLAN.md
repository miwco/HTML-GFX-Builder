# Video design quality - diagnosis and improvement plan

Why the AI video harness (src/ai/video) produces weaker, more uniform designs than the
underlying model can deliver, and what to do about it. Written from a full audit of the
generation path plus real bench outputs (scripts/video-bench.mjs). Companion evidence:
the bench galleries referenced in §2.

## 1. Diagnosis - the likely quality bottlenecks, in order

### 1.1 The prompts prescribe one house recipe; the model executes instead of designing

The Motion Director and coder share MOTION_PRINCIPLES + the per-request skills
(src/ai/video/prompts.ts, skills.ts). Both are written as *prescriptions with numbers*:
the logo-reveal skill fixes tracking (-0.02em), hero size (height*0.2), the supporting
elements (a rule, a kicker, a monogram chip), the background (graded field + vignette);
stingers fix panel counts (2-4), angles (8-15deg), spring configs (damping 12-16).
A strong model given a recipe follows the recipe. Bench plans literally restate the skill
text back as the "plan" - the taste decisions were made in our prompt, once, for every
request that hits that skill. Result: competent, identical, minimal.

### 1.2 Negative rules dominate; there is almost no aspirational material

Most of MOTION_PRINCIPLES is bans and floors: no linear, no rainbow, no default blue, no
pure red, no flat fills, no placeholder, restraint, 1-2 typefaces, one accent,
"black/white/greys doing the heavy lifting", "subtle". The safest way to satisfy ~30
MUST/NEVER rules is the minimal centred-composition-on-dark-gradient - which is exactly
what comes out. Nothing in the prompt rewards ambition, texture, a signature device, or a
distinctive concept; one violation costs a repair round, but blandness costs nothing.

### 1.3 One canonical example = one attractor

EXAMPLE_COMPOSITION is a centred title + angled panels + light sweep + breathing hold +
small-caps kicker. Those five motifs now appear in nearly every output regardless of
brief. The example teaches the *contract shape* well, but it is also the only picture of
"good" the model ever sees, so it doubles as the sole style reference.

### 1.4 The dark-and-grey doctrine forbids half the design space

"Black/white/greys doing the heavy lifting", "layered darks", "metallic/dark backgrounds
read premium" - a warm daytime cooking title, a bright kids graphic, or a celebratory
gold-confetti moment has no license to exist. Premium ≠ dark; the prompt conflates them.

### 1.5 Typography is capped at system fonts

The contract allows imports only from react/remotion, bans network URLs, and the
player host ships no fonts - so every video is Arial Black / Helvetica / Georgia. The SPX
side bundles seven curated OFL faces (src/model/fonts.ts: Space Grotesk, Archivo, Oswald,
Bebas Neue, Inter, Manrope, JetBrains Mono) precisely because typography carries the
premium look; the video world cannot reach any of them. This is a hard ceiling no prompt
change can lift.

### 1.6 No diversity mechanism

The SPX harness names "same layout, different colours" a failure and parameterizes
diversity through its design-spec stage. The video harness has no equivalent: same skill
text + same example + same principles in, same design out. Repeat runs of one brief
converge (bench: two logo-reveal runs produced near-identical white-caps-on-graphite
lockups), and different briefs that share a skill converge too.

### 1.7 What is NOT the bottleneck

- **Validation/repair**: compile + static contract + live probe + occlusion checks reject
  broken code, not weak design - and most runs pass on the first attempt. The gate is not
  pushing toward blandness; the prompts are. (It also never *lifts* design - see §3.5.)
- **Model/params**: Sonnet 5, default temperature, forced tool output - all fine. The
  same model produces the strong SPX one-shot results that made the SPX harness opt-in.
- **Context handling**: the brief reaches both stages verbatim; uploaded images become
  vision blocks; refinements carry the recent chat + full module. Nothing material is
  stripped.
- **The bench .env** - a transport/metering concern only, now automated away (§4).

## 2. Evidence

- **Prompt audit**: see §1 citations (src/ai/video/prompts.ts, skills.ts,
  claudeVideoProvider.ts directorSystem/coderSystem).
- **Plans restating skills**: bench plan JSONs - e.g. a logo-reveal plan whose typography
  section reproduces the skill's numbers (-0.02em, height*0.2, wide-tracked kicker) and
  whose assetUsage names the same rule + kicker the skill lists.
- **Convergence**: repeat bench runs of one brief land on near-identical designs; the
  chips themselves art-direct ("deep graphite gradient... specular light sweep... breathes
  gently"), so the shipped examples showcase obedience, not design.
- **Baseline galleries** (this branch, gitignored - regenerate on demand):
  `bench-baseline/review.html` (the 4 shipped chips x2) and
  `bench-baseline-briefs/review.html` (3 neutral, non-art-directed briefs x2). Findings:
  - The chips all land in the same dark-minimal spot (navy/graphite, centred white caps,
    amber underline, small-caps kicker); news r1 vs r2 differ mostly in the title string.
  - The neutral briefs immediately show more range (neon-glitch esports, warm brown serif
    cooking title with steam curls, gold awards moment) - the capability exists; the
    chip briefs and the prompt doctrine suppress it.
  - WITHIN-brief convergence is severe: the two cooking runs are near-identical.
  - NEW failure class the checks miss: hero text CLIPPING at the hold ("KITCHEN" cut to
    "KITCH" in both cooking runs; the awards r2 headline runs frame-edge to frame-edge).
    The bench scored all of these "clean" - see §6.
  - Reliability: 13/14 valid; one sports-stinger run still contained a banned window.*
    access after both repair rounds and was rejected.

## 3. Improvement plan

Ordered by expected leverage per unit of risk. Principles over rules; retrieved
references over one house style; originality required, copying forbidden.

### 3.1 Turn skills from recipes into technique menus (prompt-side, high leverage)

Rewrite each skill as a *craft catalog*: 3-5 genuinely different named directions per
genre (e.g. logo reveals: assembly-from-parts, masked-wipe architectural, light-and-glass,
stamp/impact, orbiting-elements), each 1-2 lines of intent rather than fixed numbers.
Keep the few numbers that are floors (readability holds, safe margins). Add an explicit
instruction to the Director: *choose one direction and commit; name the single memorable
device this piece will be remembered by; a piece that could pass as a default template is
a failure*. Add the current attractor to the named failures: "centred wordmark on a dark
radial gradient with a light sweep and a small-caps kicker" is only acceptable when the
brief asks for exactly that.

### 3.2 Reference-selection step: design DNA cards from the SPX catalog (retrieval)

The product already owns a taste corpus: DESIGN_LANGUAGE.md (family token table §8,
signature reveals §4) and 40+ shipped variants whose CSS encodes palette, shape, layering
and motion character. Add a deterministic retrieval step (no extra model call: keyword map
like skills.ts, or fold into the existing Haiku fallback): brief -> 1-2 relevant *design
DNA cards* - compact structured text extracted at build time from the catalog family
tokens (shape language, radius/shadow/keyline vocabulary, type treatment incl. weight and
tracking character, motion feel, one palette discipline note). Inject into the Director
prompt as INSPIRATION with an explicit rule: *these are sibling graphics from the same
product, not the answer; produce an original design that could sit next to them - the
brief always outranks the reference*. Feed two cards when the brief is ambiguous so no
single card becomes the new attractor.

### 3.3 Bundle the seven fonts into the video world (mechanical, permanent ceiling lift)

Inject @font-face for the bundled woff2 set into the player host document and the render
worker (data-URL or served file, both offline-safe), declare the available families in
REMOTION_CONTRACT, and teach the skills which families suit which genre (the catalog
already maps styleTags). Every output benefits; no output is forced to change. Parity
rule: preview and render must load the same faces, or WYSIWYG breaks.

### 3.4 License the full palette space

Replace the dark-doctrine lines with a genre-aware principle: the brief's audience and
energy pick the palette world (a warm kitchen daytime look is as premium as a graphite
newsroom); keep the actual bans (rainbow gradients, default blue, pure #FF0000) and the
lit-surface/layering doctrine, which is palette-neutral.

### 3.5 (Experiment-gated) a vision taste critic

The probe already renders frames. One cheap vision call scoring the hero frame against a
short judging list (hierarchy, frame fill, distinctiveness, polish) with ONE bounded
revision round would be the only stage that can *see* the result. The SPX world
deliberately deferred its critic until the compare rig proves it pays - hold video to the
same standard: build it only if §5's experiment shows the prompt+reference changes alone
plateau below the bar.

### 3.6 De-art-direct the wizard chips

Rewrite the four example prompts to state intent, audience, and energy - not the finished
design. The chips are the bench's briefs; as long as they prescribe graphite + light
sweep, the bench measures obedience and the first thing every new user sees is the same
five motifs.

## 4. The bench .env - explained and automated

- **Why it existed**: `loadAiSettings()` fills anything the app hasn't saved from the dev
  server's env: `proxyUrl: saved.proxyUrl ?? env('VITE_AI_PROXY_URL')`. The bench used to
  seed only `{apiKey, model}`, so a dev server started from a full `.env` (the main
  checkout's sets VITE_AI_PROXY_URL for hosted mode) silently routed every bench call to
  the hosted gateway - unauthenticated, mismetered, or failing. Pruning the worktree
  `.env` to only VITE_ANTHROPIC_API_KEY forced direct mode.
- **Which file**: the `.env` at the root of the checkout whose dev server the bench
  drives (each worktree has its own; Vite reads it at server start, and video-bench.mjs
  also reads the key from it).
- **Benchmark-only**: yes. Normal development wants the full `.env`; only the bench (and
  the SPX ai-compare/ai-bench rigs, same mechanism) needed the pruned one.
- **Now automated**: video-bench.mjs seeds `proxyUrl: ''` and `useHarness: false` (an
  empty string beats the `??` fallback), so direct BYO-key mode wins regardless of the
  server's env, and a preflight asserts the app resolved to direct mode before spending
  tokens. The pruned `.env` is no longer required - only the key must be present (in
  `.env` or the environment). Consider porting the same seed+preflight to
  scripts/ai-bench.mjs and ai-compare.mjs.

## 5. The comparison experiment

Two arms, same model (Sonnet 5), same briefs, same runs, judged on real rendered frames:

- **Briefs**: the 4 shipped chips (regression guard) + 3 neutral briefs that do not
  art-direct (esports opener / warm cooking title / awards reveal -
  scripts/video-bench-briefs.sample.json, run as
  `node scripts/video-bench.mjs <out> scripts/video-bench-briefs.sample.json 2`).
- **Arms**: A = current prompts (bench-baseline*, already captured); B = §3.1 + §3.2 +
  §3.4 (+§3.6 for the chips, run under both old and new chip text so the regression
  guard stays honest). §3.3 (fonts) ships separately - it is mechanical, benefits both
  arms, and would otherwise confound the prompt comparison.
- **Scoring**: the bench's automated checks (validation pass rate, occlusions) as the
  floor; then a side-by-side gallery review of hold-phase frames on: (1) premium
  polish, (2) frame command at the hero moment, (3) distinctiveness ACROSS briefs (do
  the seven briefs produce seven different designs?), (4) convergence WITHIN a brief
  (r1 vs r2 may differ in concept - that is a virtue), (5) brief fit (did the cooking
  title get warm?). Diversity is a first-class objective: arm B does NOT win by making
  everything look NoaCG-branded.
- **Decision rule** (the SPX doctrine): each change keeps its place only if the gallery
  shows a clear improvement for its cost. If B wins, land it and re-point the chips; if
  B only ties, escalate to §3.5.

## 6. Follow-up hardening surfaced by the baseline (independent of the A/B)

- **Text-clip check**: the bench's readability pass (and ideally the injected validator's
  probe) should flag a text element whose rendered box is cut by an ancestor's overflow
  clip or by the frame edge at hold frames - the baseline shipped "KITCH|" twice and an
  edge-to-edge headline, all scored clean. Detection sketch: at the hold frames, for each
  text element compare its bounding rect against the viewport and against each
  overflow-hidden ancestor's rect; flag when a readable element loses more than a few
  percent of its width/height.
- **Repair reliability**: one run kept a banned window.* access through both repair
  rounds. Consider making the repair prompt quote the offending line (the static check
  knows the match) instead of just the rule text.
- **Prompt-cache the coder system prompt**: generateValidated does not set cacheSystem,
  so each repair round re-sends the full coder system prompt uncached (the SPX coder
  path already marks it). Pure cost, no behaviour change.
