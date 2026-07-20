# HyperFrames generation quality - measurements and what they changed

What real-model benchmarking of the HyperFrames video engine found, what was changed as a
result, and what is still open. Numbers and method are here so the next round compares
against evidence rather than memory.

Model throughout: `claude-sonnet-5` (the bench pins it; director and coder both use it).

## How to read this document, and how to leave it

Most of it is a **record of measurements at a moment in time**, not a description of how the
code behaves today. That distinction has already cost a session: a pass observed clip findings
reading `clipped by <div>`, a later change fixed exactly that, and the observation sat here
looking like current behaviour. The same trap caught the routes a composition variable can
bind by, described here as a closed set that later grew, and a follow-up that stayed on the
open list after it was done.

So, when you change something this document describes:

- **Correct the claim where it is made, don't only append.** A reader hitting the old
  paragraph first will believe it. Marking a passage *Superseded* with a pointer is enough -
  the history is worth keeping, the ambiguity is not.
- **Close the follow-up in the same commit as the fix.** An open item that is secretly done
  invites the next session to redo it.
- **Distrust the absolutes you find here** - "the complete set", "the only route", "cannot
  miss one". Every one of them was true when written and is a hostage to the next change.
  Prefer "as measured", and date it.
- **A measurement is not a promise about the future.** Say what ran, on what, and when; if a
  change is verified in unit terms but never seen on a live generation, say that too rather
  than letting it read as proven.

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

**When the dev server dies mid-pass** - it has, twice, unattended, taking a brief's worth of
paid generations with it and leaving nothing to diagnose from. Three things now hold:

- `results.json` is rewritten after **every** run, not once at the end, so a crash costs the
  runs still to come and never the ones already paid for.
- A connection failure stops the pass with the cause named and a non-zero exit, instead of
  filling the remaining rows with identical failures that read like generation problems.
  Restart the server and re-run; completed runs are on disk.
- `npm run dev:bench` goes through `scripts/dev-bench.mjs`, which passes Vite's output through
  unchanged (the preview harness still reads its ready banner) and copies it to a gitignored
  `dev-bench.log` with a once-a-minute heartbeat. Read the end of that file after a death: a
  crash message means Vite died of something it could describe, and a log ending at a
  heartbeat means it was killed from outside without a word. The writes are synchronous
  because a buffered stream loses exactly the lines that matter when the process is killed
  outright - which is how the first version of this failed its own test.

The cause of those two deaths is still **unknown**; the logging above exists to identify it
next time rather than to guess now.

Custom briefs are `{label, prompt, durationSec?, transparent?, assets?: [paths]}`; assets are
really uploaded through the wizard, which is the only way to exercise the `asset:<name>`
contract end to end.

## The generation corpus - check a validator change for free, before spending

**Most of the questions this document answers with money can now be answered without any.**
`e2e/fixtures/generations/` holds 57 compositions kept from the 42-generation pass below -
both engines, seven briefs, the sources that SHIPPED and the ones a repair round rejected -
with `baseline.json` recording the findings each one produces today.
`e2e/video-generation-corpus.spec.ts` replays them through both static validators in about a
second, as part of the ordinary suite.

It exists because of the failure this document keeps recording: **a pattern that matches
something it was never meant to.** `network-url` hit `xmlns="http://www.w3.org/2000/svg"`;
`forbidden-api` hit `// deterministic distance, no repeat:-1`. Each looked obviously correct
in isolation, each made repair rounds unwinnable by construction, and each was found only
after a paid run. Both would have failed this spec in seconds, because the rules they broke
fire on documents that are otherwise perfectly legal - which is what the corpus is mostly
made of.

Read the baseline as two halves:

- **51 files report nothing.** This is the false-positive tripwire and the reason the corpus
  is worth its keep (under 800 kB): a new or edited rule that misfires on legitimate model
  output fails here immediately, against real generations rather than against the handful of
  documents someone writes by hand while holding the new rule in mind.
- **6 rejected sources still report their real `variables` findings.** The true-positive
  guard - a rule cannot be "fixed" by quietly ceasing to fire.

`forbidden-api` appears nowhere in the baseline, which is what pins the comment fix against
the exact generations that exposed it.

Regenerating is a deliberate act, never a convenience: `UPDATE_CORPUS_BASELINE=1 npx
playwright test video-generation-corpus` rewrites the baseline, and doing so asserts that the
new findings over 57 real generations are the ones you intended. A diff is not automatically
a failure - it is the question "did you mean to change what these documents report?".

**What it does not cover:** the runtime half. Clip, safe-area and occlusion findings need a
mounted player, so they are still measured by the bench and by
`e2e/video-readability.spec.ts`, not here. The corpus is the static rules - which is where
every false positive found so far has lived.

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
  composition variable nothing binds. Remotion: a declared input the module never reads off
  `fields`. **Both are now enforced by the validators**, so the bench is an independent audit
  of each rule rather than the only thing looking - the Remotion half was added after this
  audit found the gap, and the audit is what proved the new rule does not misfire. Auditing
  both is also what made the cross-engine repair-round comparison honest: a rule only one
  engine enforces shows up as repair rounds there and as silence on the other, which looks
  like a quality gap and is not one.

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
naming the binding routes: `data-var-text`, `data-var-src`, `var(--id)`, and a container style
query, `@container style(--id: …)`. The first three were once described here as the complete
set; the style query was added later, when removing `boolean`/`enum` from the contract
(follow-up 4) surfaced it as the only route by which those types can change what a viewer
sees. Treat the list as current, not closed - a value route this check does not know about
reads as a dead control, and a rule that rejects working code cannot be repaired around.

**The Remotion side now has the same rule** (`inputs`). It went unchecked far longer for a
structural reason: Remotion declares its inputs in the emit tool rather than in the code, so
the validator was never handed them, and a declared-but-unread input shipped a dead control
with nothing to catch it. They now travel with the source. Measured at 0 occurrences across
21 real generations - which is the argument for the rule rather than against it: it costs
nothing today and catches the defect the moment model behaviour drifts. It counts three read
routes (`fields.key`, `fields['key']`, destructuring) and stands down entirely when a module
hands `fields` on wholesale, because a key may then never appear literally and an invented
finding costs a repair round.

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

> **Superseded.** That "on both engines" was one sample per engine. At three it did not hold:
> Remotion is 3/3 clean on the overlay with no repair rounds, HyperFrames 1/3. See "Correcting
> an earlier claim about the overlay brief" below - the brief is hard on ONE engine, for a
> reason that is now measured.

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

All nine findings were plain `string` (×6) and `color` (×3) variables - not `boolean`/`enum`,
which the contract advertised at the time without giving them a working route. That was a
separate latent trap, it did not fire here, and it has since been closed (follow-up 4 below).
The colours were cheap to fix (`var(--accent)` in CSS, one round).
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

### Why HyperFrames clips text more (answered from the same 42 generations, no new spend)

The residual gap above - `text-clip` ×8 across 4 runs against Remotion's ×3 across 1 - has a
single mechanical cause, and it is visible in the findings before opening a single source:

- every HyperFrames clip is **`clipped by <div>`** - an inner element;
- every Remotion clip is **`clipped by <div.__remotion-player>`** - the frame itself.

(Those are the messages **as they read during that pass**. The bare `<div>` was itself a
defect - the finding described elements by class and never by id, while generated
compositions select structure by id - and has since been fixed; a clip finding now names the
box that binds the width and states its size. The observation below still stands: what
differs between the engines is *which* element does the cutting.)

Remotion's text is only ever cut by the edge of the world. HyperFrames' text is cut by a box the
composition built around it. The determinant is narrow: **an explicit width on an ancestor of
`white-space: nowrap` text.**

The within-engine control is the cleanest evidence, because it holds the engine fixed. All three
HyperFrames overlay runs were the same brief:

| run | how the strap is built | result |
|---|---|---|
| r1 | `#strap` 100%×100% (a positioning layer), `#panel` an **empty sibling** bar, `#text-block` **no width** | clean, 0 repairs |
| r2, r3 | text **nested inside** `#strap { width: 34% }`, behind `#name-mask { overflow: hidden }` | 3 repair rounds, clips of 20%, 26%, **49%** |

Nothing bounds the text in r1, so nothing can crop it. In r3 a `nowrap` role line lives inside a
653 px strap while the contract's fit arithmetic sizes type against the **frame**, so the box and
the type are computed from unrelated numbers and disagree by as much as half the line.

Remotion lands in r1's shape by default. Its idiom is `AbsoluteFill` siblings ordered by
`zIndex`, so the panel is a self-closing backing bar and the text lockup is a separate layer with
no width and no clipping ancestor - text may legitimately overhang its bar. Measured in
`transparent-lower-third-r1.tsx`: `panelWidth = width * 0.34` (the *same* 34% as the failing
HyperFrames strap) with the name sized to span 60% of the frame, and it is clean, because the
text is not inside the panel. Where Remotion does bound text it derives the bound *from* the
text - `namePanelWidth = targetNameWidth / 0.86` in r3 - so the two cannot disagree.

This is not the examples' fault, which was the first guess and is wrong: **both** canonical
examples teach an `overflow: hidden` reveal mask. The difference is that Remotion's mask is a
flex child with auto width, while HyperFrames' sits inside a strap the model gave an explicit
percentage width - the natural way to build a card in CSS. Confirmed outside the overlay brief:
`esports-opener-r1` clips "NOVA" inside `.slab-wrap { width: 62% }`.

So the fix, when it is worth making, looked like one sentence in the HyperFrames contract rather
than a new rule: hero and strap text either sits in a layer with no width bound (panel painted as
a sibling behind it), or the fit arithmetic runs against **the container's** width rather than the
frame's. Not done here - it is a prompt change, and this document's own standing lesson is that
prompt changes need a measured before/after rather than prose.

> **That sentence was written, measured, and REVERTED on 2026-07-20 - it made the structure
> worse, not better.** See "The contract sentence that failed its measurement" below. The
> mechanism described in this section is still the correct diagnosis; the prescribed fix is not.
> Do not re-derive the same sentence from this paragraph and land it unmeasured.

### Correcting an earlier claim about the overlay brief

The varied pass concluded the transparent overlay was "the hardest brief on both engines". At one
sample per engine that was over-read. At three:

| | HyperFrames | Remotion |
|---|---|---|
| Clean runs | 1/3 | **3/3** |
| Repair rounds | 3 | **0** |
| Shipped readability defect | 1 | 0 |

It is a hard brief on **HyperFrames only**, for the containment reason above - a lower-third is
the one shape whose whole design is text inside a box. Follow-up 2 below asked for exactly this
sample size before anyone wrote prose about it; this is that prose, and it narrows the follow-up
from "both engines" to one.

> **Superseded on 2026-07-20 as a statement about the engines.** Three fresh samples per engine
> on this brief inverted it. On the overlay brief: Remotion spent 4 repair rounds across 2 of its
> 3 runs, every one of them `text-clip`; HyperFrames spent 0 `text-clip` rounds in either of its
> two arms (BEFORE 0 rounds, AFTER 1 round, that one `text-safe-area`). All 9 overlay runs shipped
> contract-valid with no readability defect. The overlay brief is hard on *whichever* engine draws
> a narrow strap on the day - not on HyperFrames specifically. The **containment mechanism** above
> survives (it is structural, and was re-confirmed by reading the sources); the **engine
> attribution** does not. See the 2026-07-20 pass below.

## The contract sentence that failed its measurement (18 generations, ~$2.1, 2026-07-20)

Follow-up 2's candidate change, written and measured exactly as this document demands. **The
result is negative and the sentence is not in the code.** Recorded because a negative result that
is not written down gets re-derived: the paragraph proposing this sentence is persuasive, and the
next reader will land it on the strength of the prose unless this section is here.

**Method.** The two briefs the follow-up named - "Transparent lower-third" and "Single-word hero"
from `scripts/video-bench-briefs.varied.json`, copied byte-identical - three samples each, on
`claude-sonnet-5`, against the same dev server, BEFORE and AFTER the one-sentence change. A
Remotion arm on the same two briefs ran as a contemporaneous control. 18 generations,
199,970 in / 167,211 out.

The sentence added a `CONTAINMENT` bullet to `HYPERFRAMES_CONTRACT`: hero and strap text either
sits in a layer with no width bound (panel painted as a SIBLING behind it), or the type
arithmetic runs against the container's width rather than the frame's.

**Repair rounds did not move.**

| | BEFORE | AFTER |
|---|---|---|
| Contract-valid | 6/6 | 6/6 |
| Runs needing a repair | 2/6 | 2/6 |
| Repair rounds | 3 | 2 |
| Repair causes | `variables`×2 `text-clip`×1 | `text-safe-area`×1 `text-occluded`×1 |
| Shipped readability defects | 0 | 0 |

Fisher's exact on runs-needing-repair gives **p = 1.0**. At 2-3 rounds per arm nothing here is
distinguishable from noise, in either direction.

**The structural read is what settles it, and it points the wrong way.** Repair rounds are a weak
instrument at n=6, so every shipped source was classified directly for the defect the sentence
targets - is the hero/name line inside an ancestor narrower than the frame, while its type is
sized from the frame? That is a property of the code, not a sampled outcome, so it is far more
sensitive than a round count:

| | BEFORE | AFTER |
|---|---|---|
| AT-RISK, both briefs | 1/6 | **3/6** |
| AT-RISK, overlay brief only | 1/3 | **3/3** |
| Type fitted to the CONTAINER's width | 1 | **0** |

The sentence asked for one of two safe shapes and produced neither more often. Two specifics
carry the conclusion, both verified by reading the sources rather than trusting a classifier:

- **The model already writes the safe shape without being told.** `before/transparent-lower-third-r1`
  computes `PANEL_W = 0.36 * 1920; INNER_W = PANEL_W * 0.78; fontSize = (INNER_W * 0.65) /
  (CAP_ADV * CHAR_COUNT)` - the container-fitted arithmetic the sentence exists to induce, emitted
  spontaneously. No AFTER run did this.
- **Where the sentence was followed, it was followed by halves.**
  `after/transparent-lower-third-r3` did paint the panel as a sibling behind the text - and still
  put `width: 60%` on `#text-block` and sized from `const FRAME_W = 1920; targetWidth =
  FRAME_W * 0.30`. The memorable parenthetical ("panel as a sibling") landed; the load-bearing
  clause ("the text layer carries no width") did not. Offering two escape routes in one sentence
  let the model take a third path that satisfies neither.

**Why this is a negative result and not a null one.** A null result would justify keeping a
harmless sentence. This one moved the target metric the wrong way on the brief it was written for
(1/3 → 3/3 AT-RISK) while buying nothing measurable, so it was reverted. `HYPERFRAMES_CONTRACT`
is unchanged on `main`.

**What the honest next attempt looks like**, if anyone takes this up: not a rephrasing. The
generations that fail do so because a `nowrap` line's size and its box's size are computed from
different numbers - which a validator can *see* in the rendered geometry and a prompt can only
ask about. The clip finding already reports exactly that pair (`needs 916px but that box gives it
561px`) and, as measured below, repairs from it now win. A structural fix belongs in the checks,
not in more contract prose. Note also that nothing in these 18 runs shipped a readability defect,
so the *user-visible* cost of the whole containment issue is currently zero - which is an argument
for leaving it alone rather than for spending on it.

## The two unverified caveats, now measured (same 18 generations)

Both were flagged in the handoff as proven in unit and corpus terms only.

**1. The sharpened clip finding produces repairs that WIN. Confirmed in production terms.**
`text-clip` fired 5 times across 3 runs (1 HyperFrames BEFORE, 4 Remotion). Every one of those
runs shipped clean: `gate.probed` true, `gate.ok` true, zero readability issues on the shipped
source. The two runs that spent BOTH rounds (`ctrl-remotion/transparent-lower-third-r1` and
`-r3`) each wrote `rejected-1` and `rejected-2` and then shipped a clean third emit - so this is a
genuine win, **not** the soft-rule demotion that would also leave `ok: true`. Across all 18
generations, **zero readability defects shipped**, against the 42-generation pass where clips did
ship.

Both message branches fired on live generations, each correctly:

```
- text-clip: "Senior Climate Scientist — W" is CUT OFF - 39% of its width is clipped by <div>.
  The line needs 916px but that box gives it 561px. Give the text room …
- text-clip: "Senior Archivist, National H" is CUT OFF - 18% of its width is clipped by
  <div.__remotion-player>. At 825px it FITS that 1920px box - it …
```

The first names the binding box and hands over the arithmetic; the second correctly refuses to
report widths as a size problem and sends the model to MOVE the text instead. That is the
too-wide / parked-offscreen split working on real output, which had only ever been replayed.

**2. The Remotion `inputs` rule still has never fired.** Zero occurrences in the 6 Remotion
generations here, and `deadVars` is 0 across all 18 runs on both engines. Cumulative: **0 across
27 Remotion generations** (21 in the earlier audit, 6 here). The rule remains a correct-by-
construction guard that has never caught anything live - which is what it was argued for, but it
is still not a *demonstrated* win and should not be described as one.

One caveat on how to measure it next time: the bench's `gate` re-validation is called **without**
`declaredInputs`, so `inputs` can never appear in `gate.rules`. It can only surface in
`repairCauses` (the harness passes `emitted.inputs` on the repair path) or in the bench's own
independent `deadVars` audit. Looking only at `gate.rules` would report a false zero.

## Open follow-ups

Ordered by value. The re-measurement turned up two; the total-crop half is done (above), so
what remains of it is the spend.

1. **Decide how a composition binds text it also animates.** *Deliberately deferred
   (2026-07-19): the cost is ~9 findings across 18 runs and nothing ships broken often enough
   to justify the change now. Reopen with the numbers below, not from scratch.* The measured
   cause of the
   repair-round gap (above): `data-var-text` needs a leaf element, animated headline text is
   never one, and each of the three ways the model resolved that was bad - a hidden mirror that
   passes the rule while being dead, a dropped stagger, or a value written into every fragment.
   Three routes, none free: a driver re-apply hook so split text can be rebuilt when a value
   changes; validator rules against a shared `data-var-text` id and a hidden bound element
   (correct, but leaves no legal path and would *raise* repair rounds unless paired with the
   first); or a taught pattern in the contract. Needs a decision before code.
2. ~~**Stop HyperFrames text being cropped by the box the composition built around it.**~~
   **Measured 2026-07-20; the prescribed fix failed and was reverted. Not open as a prompt
   change.** The candidate sentence made the structure worse on the brief it targeted (AT-RISK
   1/3 → 3/3 on the overlay) and moved repair rounds not at all (p = 1.0); see "The contract
   sentence that failed its measurement". Two things changed alongside it: the engine
   attribution is retired (the same pass had Remotion needing 4 repair rounds on this brief and
   HyperFrames 0), and the user-visible cost is currently **zero** - no readability defect
   shipped in 18 generations. The containment mechanism itself is real and still described
   above. If it is ever worth acting on, act in the CHECKS, which can see the box-vs-type
   geometry, not in more contract prose - and note the bar is now higher, since the thing being
   fixed is latent rather than shipping.
3. ~~**Sharpen the repair message when text looks duplicated.**~~ **Explained, not a message
   problem.** "NOACGNOACG" is the driver writing one variable's value into every element that
   shares its `data-var-text` id - what the model does when it splits animated text and binds
   each fragment. Reproduced live (`HURRICANEHURRICANE`). Subsumed by item 1; no wording change
   would have helped.
4. ~~**`boolean` and `enum` variables have no working binding route.**~~ **Done** - the contract
   stopped offering them. It advertised six types while the driver carried a scalar by two
   routes (`--<id>` in CSS, `data-var-text`), neither of which makes a boolean or a named
   choice do anything a viewer sees, so a model taking the offer earned a rejection for a
   control that does nothing. It now advertises `string`, `number`, `color`, `image`. Both
   types stay accepted by the parser for hand-written work, and a container style query -
   `@container style(--flag: true)`, the one route by which they CAN work - now counts as a
   binding, because rejecting a binding that works is unfixable and burns every repair round.
5. **The countdown-style minimal reveal** - historically the weakest brief, and the
   "uncommitted default" look it falls into is unmoved by prose. It came through clean in
   this pass, so treat the earlier finding as unconfirmed rather than settled.
6. **`<video>` / `<audio>` clips** - the largest deliberate divergence from real HyperFrames.
   A real feature (validator, driver, compose, and the render worker all have to agree on how
   a media clip seeks deterministically), not a prompt change.

## Handoff

**State.** Everything described here is on `main`: the comment-blanking fix, the sharpened
clip finding, the generation corpus, the Remotion `inputs` rule, and the removal of
`boolean`/`enum` from the contract. Two things the 42-generation pass found and did NOT fix:
follow-up 1, deferred by decision, and follow-up 2 - which was taken up on 2026-07-20, measured,
and closed NEGATIVE: the contract sentence it prescribed was written, benched over 18
generations, found to make the structure worse, and reverted. `HYPERFRAMES_CONTRACT` is
unchanged.

**Both of those caveats were measured on 2026-07-20 and are now settled** (section above). The
clip finding is confirmed in production terms: 5 live `text-clip` findings, every affected run
shipped clean, both message branches fired correctly, and zero readability defects shipped across
18 generations. The `inputs` rule is confirmed *unfired*: still 0 occurrences, now across 27
Remotion generations - a guard that has never caught anything live, which is honest rather than
disappointing but must not be written up as a win. The bench supports both engines
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

**Spend last, not first.** Every validator or contract change should clear the generation
corpus (above) before anyone commissions a run: it replays 57 real generations for free, and
both false positives this document records would have been caught there. Reach for tokens
only for what the corpus cannot see - the runtime readability half, and whether a prompt
change actually moved the output.
