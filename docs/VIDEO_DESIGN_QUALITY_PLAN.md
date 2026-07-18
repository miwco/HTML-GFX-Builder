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

### 3.3 Bundle the seven fonts into the video world (DONE - mechanical ceiling lift)

Shipped. The seven OFL faces are now available to every composition in both the preview
and the final render. Design (single source of truth = src/video/videoFonts.ts):
- The @font-face rules are built once (videoFontFaceCss) and injected identically into
  both worlds as DATA URLs (the preview iframe has an opaque origin, so a served font URL
  would be a cross-origin CORS request every static server refuses - the bytes must be
  embedded, exactly like the host's inlined JS).
- Preview: scripts/build-player-host.mjs inlines the @font-face block + a boot warm-load
  into the host page, and folds the font CSS into its build-hash so a font change rebuilds.
- Render: scripts/gen-video-font-css.mjs emits render-worker/remotion/videoFontFaces.
  generated.ts (gitignored; regenerated in postinstall and at the top of bundle.mjs), which
  UserComposition injects behind a delayRender document.fonts gate so no captured frame
  paints fallback type.
- Contract: REMOTION_CONTRACT lists the families with genre hints, forbids @font-face /
  import / fetch of a font (they are pre-injected - this also removes the network-URL
  temptation that rejected a run in §5b), and the canonical example now sets a bundled face.
Verified: all seven resolve in the live preview (distinct glyph widths, not fallback) and
the render bundle embeds the data URLs.

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

### 3.6 De-art-direct the wizard chips (DONE)

The four example prompts now state intent, audience, and energy - not the finished design.
No chip names a palette any more ("deep graphite gradient", "deep navy backdrop", "amber
keyline" are gone); the logo chip's never-a-placeholder line stays, because that is a
functional requirement rather than art direction. What each chip keeps is the keyword its
offline sample routes on (stubVideoProvider.pickSample), so an offline user still gets the
matching starter.

DEFERRED, and worth a decision: the SET is still four dark broadcast genres, which teaches
the graphite default by composition even with neutral prose. Swapping one (the countdown was
the candidate - a warm daytime cooking title would cover a palette world nothing else does)
is NOT a pure copy edit: the countdown chip is the canonical e2e fixture (video-project.spec
asserts its first number renders) and the bench's default label list names it. The reopen-strip
spec also matches on the chip's opening words - the one place chip prose is load-bearing.

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

## 5b. A/B result (this branch - arm B landed)

Arm B = §3.1 (technique-menu skills) + §3.2 (reference cards, new
src/ai/video/referenceCards.ts) + §3.4 (palette-world principle) applied to
prompts.ts/skills.ts/claudeVideoProvider.ts. Same model, same briefs, 2 runs each.
Galleries: `bench-armB/review.html` (chips) and `bench-armB-briefs/review.html` (neutral).

Verdict: **clear win, landed.** The reference cards + committed-concept instruction moved
each brief into its own material world instead of the graphite default:
- **Chips** (still art-directed, so palette is fixed by the brief): the sports stinger went
  from graphite minimalism to a committed gold/navy/crimson slash architecture; the
  countdown gained a ticking dial world instead of a bare number in a void. News/logo
  stay dark because their chip text prescribes it (see §3.6 - re-point the chips).
- **Neutral briefs** (the real test): cooking became a textured cream paper card with a
  serif lockup, kicker and flourish (EDITORIAL-WARM card); awards became a gold-ribbon +
  star + shimmer "moment" (CELEBRATION card); esports produced two DIFFERENT committed
  concepts across runs. Diversity across briefs is high and within-brief runs differ in
  concept - the goal (more intentional, not more uniform) held.
- **Cost**: unchanged. Reference selection is deterministic keyword matching (no model
  call); the injected text rides the existing Director call.

Caveats the A/B surfaced (feed §6):
- **Clipping persists**: news r1 still clipped "WORLD REPORT" -> "WORLD REP" at the hold.
  Prompt guidance alone is unreliable here; §6's programmatic check is required.
- **Network temptation grows**: cooking r1 was REJECTED for an http(s) URL - asking for
  richer material (paper texture, real type) tempts the model to fetch a texture or web
  font. This is the strongest argument for §3.3 (bundle the fonts) and for hardening the
  "design texture in code, never fetch" contract line + quoting the offending line on
  repair. The gate caught it (kept the prior code), so it never shipped.

Not yet done (deliberately deferred): §3.3 fonts (mechanical, benefits both arms - keep it
out of the prompt A/B), §3.5 vision critic (only if quality plateaus), §3.6 chip rewrite
(product copy decision).

## 6. Follow-up hardening surfaced by the baseline and the A/B (independent of the prompt work)

All three landed; §6.1 records the decisions worth knowing.

- **Text-clip check** (DONE): the readability pass now measures the GLYPHS - a Range over
  each text element's own text nodes - against the frame and every overflow-clipping
  ancestor, and flags a loss of more than 12% of the text's width or height. Measuring the
  range rather than the element box is what makes it work: nowrap type inside a fixed-width
  clipped card overflows silently, and the element's own rect reports the uncut box. One
  implementation (player-host/src/textChecks.ts, alongside the occlusion check it absorbed
  from the bench) serves BOTH consumers: the injected validator, where a persistent crop
  becomes a repair round, and scripts/video-bench.mjs, which calls it over CDP.
- **Repair reliability** (DONE): the static checks now QUOTE the offending source line
  (`Offending line 42: \`...\``, video/compile.ts + hyperframes/validate.ts), and the repair
  prompt says that exact line must not survive the fix.
- **Prompt-cache the coder system prompt** (DONE): generateValidated marks `cacheSystem` on
  the first coder call and every repair round.

### 6.1 Decisions behind the clip check

- **Thresholds**: 12% of the text's own width/height, with an 8px floor. "WORLD REPORT" ->
  "WORLD REP" loses ~17% and "KITCHEN" -> "KITCH" ~28%, so both trip it; a trailing space or
  an antialiasing bleed cannot. Losing one glyph off a long headline is deliberately BELOW
  the line - a false positive costs a discarded composition, a false negative costs a bench
  note.
- **Hold frames only, and only when it PERSISTS**: the validator checks two frames inside
  the hold (never frame 0 or the last frame) and the bench three, and a clip counts only
  when it is present at every one of them. An entrance still emerging from a mask clears
  itself by the second sample; a cropped headline is cut at all of them. Occlusion keeps its
  any-sample semantics - text buried behind a panel for part of the hold is still buried.
- **Intentional masks read as clean**: a rect test cannot see clip-path or mask-image, so a
  masked reveal is a false NEGATIVE, which is the side to err on.
- **A surviving crop is demoted, not fatal**: it drives both repair rounds, but if it
  outlives them the composition ships with the finding as a WARNING (the SPX harness's rule
  for its editability findings) - the user waited for this, and a false positive must not
  silently throw the work away.
- **Latency is load-bearing in the e2e mocks**: the live probe only runs once the preview
  has mounted its bridge. A real generation takes seconds and always clears that bar, but an
  instantly-answered mock beats the player to the screen and validation quietly falls back
  to the static checks - `mockClaude(..., { delayMs })` (e2e/_video.ts) is what keeps the
  probe-dependent specs honest.
- **Both engines run the SAME checks**: neither runtime can import a module from the app
  (each is an opaque-origin sandbox, and the HyperFrames driver is injected as a string), so
  the one implementation travels as SOURCE - `src/video/textChecks.js`, inlined into the
  player host by scripts/build-player-host.mjs and into the composed document by
  hyperframes/compose.ts, exactly as the bundled fonts already do. The frame choice and the
  persistence rule are shared as a normal module (src/video/readability.ts).
### 6.2 Measured on real output (14 generations, Sonnet 5)

`bench-clip-briefs` (the 3 neutral briefs ×2) and `bench-clip-chips` (the 4 rewritten chips
×2). Findings, all verified against the frame strips rather than the pass count:

- **False positives: none.** 13 of the 14 compositions render their type intact at the hold,
  and the check stayed silent on every one. The cooking brief - which produced "KITCH" twice
  in the baseline - now renders "SUNDAY KITCHEN" complete in both runs.
- **A blind spot the corpus exposed, now fixed.** The 14th (a logo reveal) rendered a
  COMPLETELY BLANK frame - glyph halves absolutely positioned inside a zero-height
  overflow:hidden wrapper - and every check scored it clean. The cause was the check's own
  "big enough to matter" gate: it measured the ELEMENT's box, and type clipped away entirely
  has a zero-area box. So total clipping was invisible while partial clipping was caught,
  exactly backwards. The clip check now gates on the GLYPH extent; re-probing the whole
  corpus afterwards, the broken one is flagged at both hold frames (so it would drive a
  repair round) and all 13 good ones stay silent.
- **The occlusion rule was too eager.** A benched countdown put its outgoing digit behind the
  dial for exactly ONE sample mid-swap - a transition working as designed, reported as a
  defect by the any-sample rule. Occlusion now needs a MAJORITY of the hold samples; clipping
  still needs all of them.
- **Still unaddressed: safe-area margins.** An awards reveal set its headline running nearly
  frame-edge to frame-edge (~8% side margin). Nothing is cut, so the clip check is right to
  stay quiet - but this is the second failure class §6 named, and it needs its own rule
  (glyph extent vs a safe-area inset), not a wider clip threshold.

**The tool that made this cheap:** `scripts/probe-composition.mjs` replays a SAVED module
through the real player host and prints the findings, spending nothing. Run the bench once,
then iterate on the checks against its whole output directory as often as you like.
