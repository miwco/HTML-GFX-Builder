# HyperFrames generation quality - measurements and what they changed

What real-model benchmarking of the HyperFrames video engine found, what was changed as a
result, and what is still open. Numbers and method are here so the next round compares
against evidence rather than memory.

Model throughout: `claude-sonnet-5` (the bench pins it; director and coder both use it).

## Running the bench

```bash
node scripts/video-bench.mjs <out-dir> [briefs] [runs] --engine=hyperframes
node scripts/video-bench.mjs <out-dir> [briefs] [runs] --engine=hyperframes --stub  # free
```

`--engine` runs the same briefs through either coder; everything downstream (source captured,
frame strip, checks) follows it. **`--stub` runs the whole path on the offline provider for
free** - use it to prove a bench change works before spending anything.

Two environment requirements, both learned the hard way:

- The dev server must **not** have `VITE_SUPABASE_*` set. With a backend configured the
  visitor is signed out and the wizard's video step renders a sign-in prompt instead of the
  controls; the bench now fails with that sentence instead of a bare selector timeout.
- Don't touch `.env` while a bench is in flight - Vite restarts on the change and the
  in-flight generation is lost.

Custom briefs are `{label, prompt, durationSec?, transparent?, assets?: [paths]}`; assets are
really uploaded through the wizard, which is the only way to exercise the `asset:<name>`
contract end to end.

## What the bench measures

Beyond validation:

- **Readability**, from the host's own `window.__noacgTextChecks` (occlusion, clip, safe
  area) - the same `src/video/textChecks.js` the injected validator probes with, so the
  bench and the generation gate cannot drift apart.
- **Repair rounds and their causes**, read off the API calls themselves (a repair round's
  message quotes the exact findings) - and each rejected source is written to
  `<id>.rejected-N.<ext>`, because a rejected result keeps the previous code in the store and
  the repair request is the only surviving copy of what the model actually wrote.
- **Real token usage**, from the API responses. The probe self-checks: if it fails to
  install, the run errors rather than reporting a fictional "0 tokens, 0 repair rounds"
  (an early run reported exactly that, wrongly).
- **Dead space** - the largest rectangle of the frame carrying no designed element at the
  hold, backdrops excluded. A metric and an outlier detector, **not** a pass/fail gate and
  not something to tune against; see the variance finding below.
- **Dead controls**, on BOTH engines - a declared control nothing reads. HyperFrames: a
  composition variable nothing binds (the validator enforces this, so the bench is an
  independent audit of the rule). Remotion: a declared input the module never reads off
  `fields`, counting all three read routes - nothing in the product enforces that one, so here
  the bench is the only thing looking. Auditing both is what makes a cross-engine repair-round
  comparison honest: a rule only one engine enforces shows up as repair rounds there and as
  silence on the other, which looks like a quality gap and is not one.

## Findings that changed the code

### The offline rule rejected inline SVG (contract failure, unfixable by repair)

`network-url` matched `/https?:\/\//` across the whole document, which hits
`xmlns="http://www.w3.org/2000/svg"` - the namespace every inline `<svg>` carries - and any
URL inside a comment. The failure mode was the worst kind: the message told the model to
"reference uploaded assets as asset:<name>", meaningless advice for a namespace, so **both
repair rounds were unwinnable by construction** and the generation failed outright. Observed
on a countdown that drew its ring pulse in SVG, at 3x the token cost of a clean run.

Fixed by making the rule precise rather than weaker: comments are stripped first, W3C
namespace URIs are excluded, and every real network reference - remote image, font,
stylesheet, script - still fails. Pinned in `e2e/video-hyperframes.spec.ts`.

### Type was sized by height fraction, so it failed in both directions

Compositions sized hero type as a fraction of frame height, which knows nothing about how
long the title is or how wide the chosen face runs. Result: under-scale on short strings
(titles spanning a third of the frame) *and* clipped text on long ones (a fixture line
running off both edges).

The prompt's fit formula assumed ~0.6 em per uppercase character for every face. Measured
against the actual bundled woff2 files, they span nearly 2x:

| Face | measured em/char (heaviest weight) |
|---|---|
| Archivo | 0.74 |
| Inter | 0.68 |
| Manrope | 0.65 |
| Space Grotesk | 0.61 |
| JetBrains Mono | 0.60 |
| Oswald | 0.52 |
| Bebas Neue | 0.38 |

A single 0.6 constant therefore overflows the wide faces by ~23% and leaves the narrow ones
~37% short - both observed failures, one cause. The measurement now lives on each font
(`capAdvance` in `src/video/videoFonts.ts`) and is emitted into the font list both engine
contracts read; the sizing rule gives a width **floor** (55-80% of frame width) as well as a
ceiling.

**Very short heroes are carved out.** A countdown "3" would need a ~1400px font to span 55%
of the frame, so the rule was ignored and the numeral came out small. At roughly three
characters or fewer, height governs (35-60% of frame height). This is arithmetic, not taste.

### Dead controls

A declared composition variable that nothing binds renders a control in the Content panel
that does nothing when dragged - a promise the document does not keep, and one no validator
rule caught because the document is otherwise perfectly legal. Prompt guidance held for six
generations and then missed one (an accent declared, then written as a hex literal); across
36 it missed three. Binding is deterministic and checkable, so the validator now enforces it,
naming all three binding routes (`data-var-text`, `data-var-src`, `var(--id)`). Those are the
complete set of routes a value can take into a composition, so the check cannot miss one.

### The exported standalone HTML shipped a broken image

Opened over `file://` with no app and no server, an exported composition carried
`src="asset:noacg-icon-amber-512"` verbatim. `asset:` is a NoaCG convention - nothing outside
this app resolves it - so a downloaded file with an uploaded logo showed a broken image,
against the plug-and-play export pillar. The export now inlines asset data URLs alongside the
fonts and GSAP. (The exported file's timeline stays paused with no driver, which is
deliberate: the export targets HyperFrames tooling, which supplies its own.)

### The bench key made the e2e suite spend money

The suite pins offline mode through `webServer.env`, but `reuseExistingServer` means a server
already running on this checkout's port is reused with whatever `.env` it started from - and
this workflow puts a real key there. The stub-provider video specs then drove the REAL
provider: six failed as a baffling "no assistant turn in 10 s", each having fired a live
generation first. `expectOfflineAi` (`e2e/_video.ts`) now asserts the transport before the
wizard is touched, so the run stops with the cause named and *before* any spend.

### The readability gate reported "could not check" as "clean"

The gate returned opposite verdicts on byte-identical input in different sessions -
deterministic within a session, contradictory across them. The cause was not timing.

`validateHyperframesComposition` ran its live probe under `if (bridge && !bridge.disposed)`,
then handled the load result with `if (!loaded.ok && !loaded.disposed)` and `if (loaded.ok)`.
A **disposed** load matched neither branch, so nothing was recorded and the function returned
an empty error list - and an empty error list reads as `ok`. `bridge.load()` returns disposed
whenever `disposedFlag` is set **or the bridge has no iframe attached**, so any validation
that ran before the preview panel mounted, or while it was remounting, silently reported a
clean composition it had never looked at.

That is the whole "instability": the verdict tracked whether a preview happened to be mounted,
which is stable within a session and varies across them. It also closes the gap recorded above
- the composition was applied at generation time because `claudeVideoProvider`'s repair loop
only fires on `!ok`, so a silent pass skipped every repair round.

Two things follow in the code. `VideoValidationResult` now carries **`probed`**, so callers can
tell a verified-clean result from an unchecked one, and the AI harness attaches an explicit
"the runtime checks did not run" warning instead of presenting unverified work as verified.
And the HyperFrames validator now retries against the currently mounted bridge when its own is
disposed - the recovery `validateVideoModule` already had, which the HyperFrames port never
picked up. Both halves are pinned in `e2e/video-readability.spec.ts`.

Two hypotheses were **falsified** along the way, and neither is worth revisiting. A font-swap
race: forcing the fallback face moved the measured hero width 864 → 790 px without moving the
verdict. And seek-settle timing - the two-rAF-versus-150 ms settle is in the **Remotion** host
(`player-host/src/HostApp.tsx`) only; the HyperFrames probe seeks and measures synchronously in
one message handler and has no settle to race.

### A preview rebuild could overtake the probe and get measured instead

The third instance of this document's recurring failure, and the one that took a wrong diagnosis
first - which is itself the finding worth keeping.

A readability spec failed about one run in eight under four-worker load, reporting `probed:
true` with an empty finding list on a fixture whose text is permanently off-frame. The first
explanation was a paint race: the HyperFrames probe measures synchronously right after
`tl.time()`, unlike the Remotion host which settles two animation frames first, so perhaps the
glyphs had no layout yet and `textChecks` skipped them. A settle was added. **The failure rate
did not move**, and the change was reverted rather than kept as plausible-looking insurance -
geometry comes from `getBoundingClientRect`, which forces layout synchronously, so there was
never anything to wait for.

Instrumenting the actual call order found it immediately:

```
  2ms load(FIXTURE) start
494ms load(project) start      <- the panel's debounced rebuild enqueues
504ms load(FIXTURE) done
504ms probe start              <- the probe can only enqueue NOW, behind it
732ms load(project) done       <- so the rebuild runs first, replacing the document
770ms probe done issues=0      <- the checks measure the project, and pass it
```

Both bridges serialize work on a promise chain, so the earlier guess that the panel "bypassed
the chain" was wrong too. The defect is subtler: validation's `load` and `probe` were **two
separate chain entries**, and the probe can only be enqueued once the load resolves - so
anything enqueued in that window legitimately runs first. The preview panel shares the same
iframe and rebuilds it on a debounce, so its load slid in between and the gate delivered a
verdict on a composition nobody asked it to check.

Fixed by making the pair atomic: `loadAndProbe()` on both `HyperframesBridge` and `PlayerBridge`
runs mount-then-measure inside ONE chain entry, and both validators use it. The spec that caught
this deliberately does **not** wait for the preview to go quiet - it races the rebuild on
purpose and asserts the candidate was still mounted when the probe finished, so a regression in
the guarantee fails the test instead of hiding behind a wait.

## Findings that did not change the code

### Dead space cannot A/B a prompt change

Three samples of the same brief, same prompt, same model, differ by a **median of 16 points
on HyperFrames and 23 on Remotion** (largest observed: 10% / 33% / 11%). Any effect worth
chasing is an order of magnitude below that noise floor; detecting a 5-point shift would need
tens of samples per brief per arm.

So: dead space works as an **outlier detector** ("this frame is mostly empty") and not as a
mean-shift metric. Do not commission runs to prove a prompt change moved it. Both engines
score about the same on it (24.3% vs 23.4%), which does at least retire the worry that
HyperFrames composes worse than Remotion.

### Design-taste changes could not be shown to help

Two were tried and are **not** in the code: a frame-balance rule in `MOTION_PRINCIPLES`, and
a second canonical example intended to break the "centred word on a dark gradient" default.
Neither produced a measurable improvement at the sample sizes available, and the second
pushes against the deliberate decision to stop art-directing the examples. The general lesson
is the variance one above: at these sample sizes, taste changes are unfalsifiable, so prefer
changes that are *correct by construction* (measured font widths, deterministic checks) over
changes that need a benchmark to justify them.

## Reliability

Across two independent multi-sample runs (18 generations each, six brief types from a 2.5 s
ident to a 6 s multi-element sequence, one driven by a real uploaded asset), **HyperFrames
was 36/36 contract-valid** - level with Remotion. It composes equivalently, fails in the same
ways, and recovers through the same repair loop.

Reliability is therefore not what keeps the engine flagged experimental. Feature coverage is:
no `<video>`/`<audio>` clips, no sub-compositions, image-variable changes reload the preview.

> **Note on the readability-gate numbers.** An earlier round measured a
> 19%-of-runs-shipping-unreadable-text defect rate falling to zero once a gate was added, but
> that was measured against a *parallel* implementation of the gate developed on a branch;
> `main`'s gate (`src/video/textChecks.js` + `src/video/readability.ts`) is different code
> with a stricter persistence rule. Those figures are indicative, not a measurement of what
> ships. **And the 0% end of it did not survive re-measurement**: three samples of the hardest
> brief against the fixed gate shipped two readability defects (see "The re-measurement against
> the fixed gate"). Treat the 19% → 0% pair as a historical note, not a result.

## The varied-brief pass (14 generations, $1.62)

Seven briefs through both engines, one sample each, chosen to exercise what had just
changed rather than to re-measure known ground: the two hardest chips, a brief with a **real
uploaded asset**, a **transparent overlay** (never benched before), a deliberately **long**
title, and a **single-word** hero (the short-hero height carve-out).

| | HyperFrames | Remotion |
|---|---|---|
| Contract-valid | 7/7 | 7/7 |
| Clean | 6/7 | 7/7 |
| Repair rounds | 4 | 2 |
| Readability findings | 1 run | 0 runs |
| Dead controls | 0 | 0 |
| Tokens | 86,830 in / 70,674 out | 69,713 in / 60,085 out |
| Cost | $0.88 | $0.74 |

Both engines validated everything. **Input tokens roughly halved** against earlier rounds
(~7-8k vs ~16-20k per run) because the coder prompt now carries one worked example rather
than two - the second example was tried and dropped, and this is the measured cost it was
adding.

The **transparent overlay was the hardest brief on both engines** - the only readability
finding in the set (HyperFrames) and the most repair rounds on each. Everything else,
including the long title and the single-word hero, came through clean on both.

### The one real defect, and what it revealed

HyperFrames' transparent lower-third shipped with **both text lines completely invisible**.
Measured in the preview: the strap sits at x = -1551 through the entire hold - still parked
in its entrance position, ~124% of its own width off the left edge. The composition's own
timing is correct (hold 0.70-3.15 s of 4 s), so the entrance tween never took effect;
the likeliest cause is the script it wrote to re-measure and re-set the panel width running
after the timeline was built, invalidating the percentage-based `from` value.

Three things follow, and they matter more than the single defect:

1. **The check was right.** "100% of its width is clipped" was not a false positive - the
   text really was off-frame. Verified by measuring the geometry directly.
2. **The current validator rejects this composition.** Re-run against the saved source with
   the real bridge, it fails. So the gate catches it *today*.
3. **Yet it was applied at generation time**, after two repair rounds that made it worse
   (55% clipped → 100%). The app does not apply failed results - it keeps the previous
   version and says so - which means validation *passed* at that moment and fails now on the
   same source. **That gap is now explained**: the validator reported a probe it could not
   run as a clean result, so the generation-time call passed without measuring anything and
   the repair loop never fired. See "The readability gate reported 'could not check' as
   'clean'" above. The reproducer is committed as
   `e2e/fixtures/hf-transparent-lower-third.html`.

### A correction to this document's own metric

**Dead space is meaningless for a transparent project.** An overlay is supposed to leave the
frame empty - footage is playing there. The benched lower-third measured 67% "dead" on
Remotion while being a perfectly reasonable design. The bench now reports `n/a (overlay)` for
transparent runs instead of a number that invites the wrong reading. The earlier finding that
dead space cannot A/B a prompt change stands; this narrows where it means anything at all.

### Export self-containment, verified outside NoaCG

An exported composition with an uploaded logo was opened over `file://` in a clean browser
context **with every network request aborted**:

- nothing was even attempted over the network (zero blocked requests);
- no unresolved `asset:` references; the logo renders from its inlined data URL;
- 7 `@font-face` rules present, and `document.fonts.check` confirms the bundled faces
  (Archivo, Oswald, Bebas Neue) actually load from their embedded data URLs;
- GSAP present, timeline registered, no page errors.

(A first attempt reported the fonts as unusable; that was a flawed width-comparison probe,
not a real failure - `fonts.check` is the authoritative test.)

## The re-measurement against the fixed gate (3 samples, ~$0.54)

Three HyperFrames samples of the transparent lower-third - deliberately the *hardest* brief in
the set, not a cross-brief average, so these are worst-case numbers and are not comparable to a
defect rate over seven briefs.

| Run | Repair rounds | Shipped? | A sound gate's verdict on what shipped |
|---|---|---|---|
| r1 | 2 | yes | **fails** - both text lines 100% clipped |
| r2 | 0 | yes | clean by the gate; the bench saw the hero **painted behind a panel** |
| r3 | 0 | yes | clean |

**The gate demonstrably fires now.** r1's two repair rounds were driven by exact `text-clip`
findings, which is what a working gate looks like: before the fix, a validation that never
probed produced no findings and therefore no rounds.

**But the 19% → 0% figure does not reproduce.** Two of three samples shipped a readability
defect, by two different routes:

1. **r1 shipped text that is 100% clipped**, after the model failed to fix it across both
   repair rounds. This was by design, not a second bug: `SOFT_RULES` in
   `src/ai/video/claudeVideoProvider.ts` demotes `text-clip` to a warning once the rounds are
   spent, so the user gets their composition with a caveat rather than nothing. The doctrine is
   sound for a *marginal* crop; it was wrong for this finding, because "100% of its width is
   clipped" is not a plausible false positive - it is certainly unreadable.

   **Fixed.** `textChecks.js` now carries the loss percentage on each clip finding, and
   `readability.ts` reports a line whose visible extent is zero at every hold frame under its
   own rule, `text-clip-total`, which is deliberately absent from `SOFT_RULES`. A partial crop
   keeps the forgiving behaviour; a total one stays failed. The two paths are pinned as a pair
   in `e2e/video-readability.spec.ts` - the same module, differing only in how far the text is
   pushed out of its box, reaching opposite verdicts.
2. **r2 shipped an occluded hero, and no gate could see it.** `src/video/textChecks.js` exports
   `occlusion()`, the bench calls it, and **neither engine's validator did** - the HyperFrames
   driver probed `clip().concat(safeArea())` and the Remotion host the same pair. Text painted
   behind a panel therefore shipped unflagged on both engines, which qualified the claim in
   `src/video/readability.ts` that the engines judge a composition identically: they did, but
   both were blind in the same place.

   **Fixed.** Both probes now include `occlusion()`, reported as `text-occluded` (soft - the
   hit test samples five points and can be fooled by a decorative painted layer, so it drives
   repair rounds without discarding finished work). It keeps the ALL-frames persistence rule
   rather than the bench's looser majority-of-three: the bench only reports, while a gate
   finding costs a repair round, and a majority would flag a transition that legitimately
   sweeps a panel across the hero. The occlusion message also now says what to DO - it is fed
   to the model verbatim, and "it is behind a panel" alone reads as a sizing problem, which is
   the one fix that cannot work. Pinned as a pair in `e2e/video-readability.spec.ts`: the
   covered document is rejected, the same document with the panel moved off the text is not.

The bench now records a **gate self-check** per run - it re-validates the finished source
against the live bridge and reports whether the gate `probed`, so no readability figure from
this bench can ever again rest on a gate nobody confirmed had run. Every run above reports
`probed: true`.

Not re-measured: Remotion, and the other six briefs. The samples went where the known defect
was.

## The full re-measurement against the fixed gate (28 generations, ~$4.73)

Seven briefs (`scripts/video-bench-briefs.varied.json`, committed this time so the next round
compares against the same input) through both engines, two samples each.

| | HyperFrames | Remotion |
|---|---|---|
| Contract-valid | 14/14 | 14/14 |
| Clean - no readability defect shipped | **14/14** | **14/14** |
| Gate probed | 14/14 | 14/14 |
| Post-hoc audit rejected what shipped | 0 | 0 |
| Repair rounds | 8 | 0 |
| Dead controls | 0 | 0 |
| Tokens | 177,398 in / 152,187 out | 109,964 in / 105,953 out |

**The occlusion check earned itself on real generations.** HyperFrames' repair causes were
`variables` ×9, `text-safe-area` ×1, and `text-occluded` ×2 - the newly wired check fired on
`single-word-hero-r2`, where the hero and its kicker were both painted behind a panel at 5 of 5
sample points. One repair round later it shipped clean. Before this round that generation would
have shipped with its headline invisible, and every number in this table would have called it
clean - which is precisely what happened to r2 in the varied pass above.

**What this does and does not establish.** It does establish that the gate now measures what it
judges: every run carries `probed: true`, and the bench's independent checks agree with the
gate's post-hoc audit on all 28. It does **not** establish a defect-rate improvement over the
varied pass. Those briefs were reconstructed from this document's prose rather than restored
from a stored set, the sample counts differ, and - the point of this whole thread - the earlier
figures were collected through a gate that could report an unrun check as a pass. Two samples
per brief is still small, and the demotion path was never exercised here, because no crop
survived its repair rounds.

**The engines diverged sharply on repair rounds** - 8 against 0, on identical briefs. One pass
cannot say whether that is the HyperFrames contract being harder to satisfy, the Remotion coder
being better served by its example, or noise at this sample size. Recorded, not explained.

## Why the engines diverge on repair rounds (42 generations, ~$7.48)

The 28-generation pass recorded an unexplained 8-against-0 split and left it as the next thing
to measure. Same committed brief set, three samples per brief per engine. A dev-server crash
took the HyperFrames arm's `logo-sting-with-asset` brief (3 runs), so both arms are compared on
the **six briefs that completed on both** - otherwise HyperFrames would be scored on the harder
subset.

| | HyperFrames | Remotion |
|---|---|---|
| Runs (matched briefs) | 18 | 18 |
| Contract-valid | 17/18 | 18/18 |
| Gate probed | 18/18 | 18/18 |
| Runs needing a repair | **10** | **2** |
| Repair rounds | 15 | 3 |
| Dead controls, as the audit counts them | 0 | 0 |
| Controls that actually work when used | **16/18** | 18/18 |
| Tokens | 261,688 in / 229,469 out | 162,785 in / 154,647 out |

Read the two control rows together. The audit asks whether a binding exists, and by that
measure both engines are perfect. Two HyperFrames runs shipped a binding that exists and does
not work - one writes into a hidden node the viewer never sees, one writes the value twice -
and both were *produced by the repair round the audit's own rule triggered*. Both are measured
below, in the app, not inferred.

The split holds: 10 of 18 against 2 of 18 runs needing repair, Fisher's exact p = 0.012. It is
not noise. The causes decompose into three unrelated things, only one of which is the engine
composing worse.

**The token premium is entirely repair rounds, not the medium.** A repair-free run costs
7,807 in / 7,998 out on HyperFrames and 8,038 in / 7,963 out on Remotion - within noise of each
other. The HyperFrames coder prompt is also the *smaller* of the two (~2.4k tokens of contract
plus example, against Remotion's ~2.9k). Every token of the ~60% premium is bought by rounds.

### `forbidden-api` ×3 - the validator was reading the model's comments

All three were false positives, and not one was a real API use. The `FORBIDDEN` loop scanned
raw source, so `/\brepeat\s*:\s*-1\b/` matched sentences like

```
// deterministic distance, no repeat:-1, no runtime randomness.
```

On `awards-reveal-r2` this burned **both** repair rounds and failed the generation outright -
the only contract failure in the pass. The failure is self-sustaining: the finding quotes the
offending line, so the model rewords its comment and matches again. This is the third instance
of the shape this document keeps finding - a rule that cannot be satisfied makes the repair loop
unwinnable by construction - after the xmlns namespace bug and the "give the root a single
class" message in `src/ai/CLAUDE.md`. The prompts ask for commented code, so the harness was
selecting for the sentences that trip it.

**Fixed** by `blankComments` (`src/video/compile.ts`), shared by both validators: comment bodies
are replaced by spaces before any pattern scan, preserving every offset so `quoteMatch` still
names the right line. It tracks string literals, so `href="//cdn"` is not mistaken for a
comment; where it cannot tell, it leaves the text alone, which keeps today's behaviour rather
than hiding a real violation. Verified against the three saved rejections (all three now clean)
and against real violations (all still rejected). The defect was **shared with Remotion** - a
`// never call Math.random()` comment would have been rejected there too, and a URL in a `//`
comment tripped `network-url` on both. It only surfaced on HyperFrames because only that engine
bans `repeat: -1`. Pinned on both engines: `e2e/video-hyperframes.spec.ts` and
`e2e/video-project.spec.ts`.

### `variables` ×9 - the binding contract fights the motion

This is the real HyperFrames-specific cost, and it is not an enforcement artefact. The obvious
suspicion - that Remotion ships the same dead controls unflagged, since `validateVideoModule` is
never even handed the declared inputs - was tested and is **false**: the bench now audits
Remotion inputs against all three read routes (`fields.k`, `fields['k']`, destructuring), and
found **0 dead inputs across 21 runs**. Remotion genuinely binds what it declares.

The difference is what a binding *is*. Remotion's is a **value** the code reads, so
`fields.title` can be split, mapped, and staggered freely. HyperFrames' `data-var-text` is a
**node identity**, and the driver sets `textContent` on it - which requires the element to be a
leaf. Animated headline text is the one thing that is never a leaf: the model splits it into
per-word or per-half spans, exactly as the motion skills teach. The binding and the motion want
the same element, so on every text-hero brief the model must pick one.

All nine findings were plain `string` (×6) and `color` (×3) variables - not the `boolean`/`enum`
types the contract advertises without giving them a working route, which is a separate latent
trap that did not fire here. The colours were cheap to fix (`var(--accent)` in CSS, one round).
The three text cases each resolved badly, in a different way:

- **`long-title-r1` satisfied the rule with a hidden mirror.** It kept its eight per-word spans
  and added `<div id="line1-source" class="var-source" data-var-text="line1">` plus a one-shot
  script copying the words into the visible spans at load. That is the hidden-holder pattern the
  SPX contract explicitly bans, and the control is **dead**: scalar edits apply through set-vars
  with no reload (pinned in `e2e/video-hyperframes.spec.ts`), so the sync never re-runs.
  Measured in the app - the control was set to "EDITED BY THE USER", the hidden node took the
  text, and the visible title still read "THE LONG ROAD TO". The run shipped marked clean.
- **`long-title-r2` paid in motion.** It dropped per-word staggering entirely (zero word spans
  in the shipped source) and bound a leaf `<span class="hero-line">`.
- **`single-word-hero-r3` broke the control while passing the rule.** It split LANDFALL into
  two halves and put `data-var-text="title"` on **both**. The driver writes the value into every
  match, so editing the control renders the word twice - measured live: setting it to
  "HURRICANE" rendered `HURRICANEHURRICANE`.

That last one closes open follow-up #3 below. The unexplained "NOACGNOACG" duplication was not a
model error to be talked out of with a sharper message - it is the driver faithfully writing one
variable into every element that shares its id, which is what the model does when it splits
animated text and dutifully binds each fragment. Only one run in 18 shared a binding this way,
so it does not explain the clipping gap generally, but it does explain that finding.

**Not fixed here** - the honest fix is a design decision, not a patch. The options are to give
the driver a re-apply hook so a composition can rebuild split text when a value changes, to
reject a shared `data-var-text` id and a hidden bound element (which catches both bad
resolutions but leaves the model with no legal path, so it would raise repair rounds), or to
teach the contract a supported pattern for animating bound text. Left for a decision rather than
guessed at.

### The rest is a real, and much smaller, composition gap

Stripping the false positives and the binding conflict leaves `text-clip` ×8 and
`text-safe-area` ×3 on HyperFrames against `text-clip` ×3 on Remotion - identical rules, the
same `textChecks.js`, both probes calling the same three checks. HyperFrames does clip text more
often. That is worth chasing, and it is a far smaller claim than 15-against-3 suggests: of the
23 HyperFrames findings, 3 were a gate bug and 9 came from a contract conflict Remotion does not
have.

**What this does not establish.** Three samples per brief is still small, the arms are matched on
six briefs rather than seven, and the readability gap in particular rests on 4 runs against 1.
The `variables` mechanism is the part that is solid: it was traced to specific code, reproduced
in the app twice, and the competing explanation (that Remotion hides the same defect) was tested
and refuted.

## Open follow-ups

Ordered by value. The re-measurement turned up two; the total-crop half is done (above), so
what remains of it is the spend.

1. **Decide how a composition binds text it also animates.** The measured cause of the
   repair-round gap (above): `data-var-text` needs a leaf element, animated headline text is
   never one, and each of the three ways the model resolved that was bad - a hidden mirror that
   passes the rule while being dead, a dropped stagger, or a value written into every fragment.
   Three routes, none free: a driver re-apply hook so split text can be rebuilt when a value
   changes; validator rules against a shared `data-var-text` id and a hidden bound element
   (correct, but leaves no legal path and would *raise* repair rounds unless paired with the
   first); or a taught pattern in the contract. Needs a decision before code.
2. **The transparent/overlay brief is the weakest case on both engines** - the only
   readability finding in the varied pass, the most repairs on each engine, and the one
   design shape neither contract says much about (where a strap sits, safe margins, not
   filling the frame). This is the strongest candidate for a *measured* prompt improvement,
   but it needs more than one sample per engine before anyone writes prose.
3. ~~**Sharpen the repair message when text looks duplicated.**~~ **Explained, not a message
   problem.** "NOACGNOACG" is the driver writing one variable's value into every element that
   shares its `data-var-text` id - what the model does when it splits animated text and binds
   each fragment. Reproduced live (`HURRICANEHURRICANE`). Subsumed by item 1; no wording change
   would have helped.
4. **`boolean` and `enum` variables have no working binding route.** The contract advertises six
   types; the driver has two scalar routes (`--<id>` in CSS, `data-var-text`), and neither makes
   a boolean or an enum do anything useful. Latent rather than measured - all nine `variables`
   findings were `string`/`color` - so either give them a route or stop offering them.
5. **The countdown-style minimal reveal** - historically the weakest brief, and the
   "uncommitted default" look it falls into is unmoved by prose. It came through clean in
   this pass, so treat the earlier finding as unconfirmed rather than settled.
6. **`<video>` / `<audio>` clips** - the largest deliberate divergence from real HyperFrames.
   A real feature (validator, driver, compose, and the render worker all have to agree on how
   a media clip seeks deterministically), not a prompt change.

## Handoff

**State.** Everything described here is on `main` except the comment-blanking fix, its two
specs, and the repair-round analysis, which are on `claude/hyperframes-repair-analysis`. The
one thing the 42-generation pass found and did NOT fix is follow-up 1 - it needs a decision on
how a composition binds text it also animates. The bench supports both engines
(`--engine`), runs free against the offline provider (`--stub`), and records tokens, repair
rounds and their causes, the sources that failed a repair round, dead space, and dead
controls. Offline coverage is 14/14 clean across both engines and all seven briefs.

**What is trustworthy.** Contract validity (36/36 across two earlier multi-sample runs, 14/14
here), the deterministic checks (unbound variables, namespace URLs, asset inlining), the
measured font widths, and export self-containment - all verified directly rather than
inferred. So is the repair-round decomposition in the 42-generation pass: the comment false
positives were replayed against the three saved rejections, and both variable defects were
reproduced by driving the real app.

**What is not.** Every readability figure collected BEFORE the gate fix, since a probe that
could not run was recorded as clean and the bias is one-directional (optimistic) - treat the
varied pass's counts and the 19% → 0% pair as history, not evidence. The 28-generation pass
above is sound (every run carries `probed: true`, and two independent measurements agree), but
it is a snapshot of the fixed system, **not a before/after**: its briefs were reconstructed
rather than restored, so it cannot be differenced against the earlier numbers. Design-taste
conclusions are unreliable at these sample sizes and should not be drawn from single runs; the
within-brief spread is wide enough to swamp anything worth chasing.

**Cost discipline.** A clean generation is ~7-8k in / ~6-7k out (about $0.08). A run with two
repair rounds costs roughly three times that. Always prove a bench change with `--stub`
first; never touch `.env` while a run is in flight; and keep `VITE_SUPABASE_*` unset on the
dev server the bench drives.
