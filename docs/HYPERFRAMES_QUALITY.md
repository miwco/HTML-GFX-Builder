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
- **Dead controls** (HyperFrames) - declared composition variables nothing binds. Now
  enforced by the validator, so this stays as an independent audit of that rule.

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
   repair rounds. This is by design, not a second bug: `SOFT_RULES` in
   `src/ai/video/claudeVideoProvider.ts` demotes `text-clip` to a warning once the rounds are
   spent, so the user gets their composition with a caveat rather than nothing. The doctrine is
   sound for a *marginal* crop; it is wrong for this finding, because "100% of its width is
   clipped" is not a plausible false positive - it is certainly unreadable. Severity is
   available in the message and is currently ignored (follow-up 2).
2. **r2 shipped an occluded hero, and no gate can see it.** `src/video/textChecks.js` exports
   `occlusion()`, the bench calls it, and **neither engine's validator does** - the HyperFrames
   driver probes `clip().concat(safeArea())` and the Remotion host the same pair. Text painted
   behind a panel therefore ships unflagged on both engines. This also qualifies the claim in
   `src/video/readability.ts` that the engines judge a composition identically: they do, but
   both are blind in the same place (follow-up 3).

The bench now records a **gate self-check** per run - it re-validates the finished source
against the live bridge and reports whether the gate `probed`, so no readability figure from
this bench can ever again rest on a gate nobody confirmed had run. Every run above reports
`probed: true`.

Not re-measured: Remotion, and the other six briefs. The samples went where the known defect
was.

## Open follow-ups

Ordered by value. The first two are what the re-measurement above turned up, and neither needs
further generations to act on.

1. **Widen the re-measurement.** Three samples of one brief established that the 19% → 0%
   figure does not reproduce, but they cannot replace it with a number. A cross-brief rate
   needs the seven-brief set on both engines, which is what makes it a spend rather than a
   free follow-up. Until then this document quotes no defect rate at all, which is the honest
   position.
2. **Stop demoting a total crop.** `SOFT_RULES` demotes `text-clip` to a warning after two
   repair rounds so a false positive cannot discard finished work. That protects a marginal
   crop, but r1 shipped text that was **100% clipped** - a finding that cannot be a false
   positive. Gate the demotion on severity (the percentage is already in the message): a
   partial crop keeps shipping with a warning, a total one is a hard failure.
3. **Wire occlusion into the gate.** `textChecks.js` exports `occlusion()`; the bench uses it,
   neither validator does, so text painted behind a panel ships unflagged on both engines
   (r2). Not a one-liner: occlusion legitimately covers part of a hold, so it needs the
   bench's MAJORITY persistence rule rather than the all-frames rule `persistentTextIssues`
   applies to crops, and `ruleFor()` needs a rule name of its own instead of folding it into
   `text-clip`.
4. **The transparent/overlay brief is the weakest case on both engines** - the only
   readability finding in the varied pass, the most repairs on each engine, and the one
   design shape neither contract says much about (where a strap sits, safe margins, not
   filling the frame). This is the strongest candidate for a *measured* prompt improvement,
   but it needs more than one sample per engine before anyone writes prose.
5. **Sharpen the repair message when text looks duplicated.** An earlier rejection failed
   because the finding told the model to resize a line whose real problem was that it had
   been rendered twice ("NOACGNOACG"). A finding that notices a repeated substring and says
   so would probably be fixable inside the two rounds.
6. **The countdown-style minimal reveal** - historically the weakest brief, and the
   "uncommitted default" look it falls into is unmoved by prose. It came through clean in
   this pass, so treat the earlier finding as unconfirmed rather than settled.
7. **`<video>` / `<audio>` clips** - the largest deliberate divergence from real HyperFrames.
   A real feature (validator, driver, compose, and the render worker all have to agree on how
   a media clip seeks deterministically), not a prompt change.

## Handoff

**State.** Everything described here is on `main` except the readability-gate fix and its two
specs, which are on `claude/hf-readability-gate-determinism`. The bench supports both engines
(`--engine`), runs free against the offline provider (`--stub`), and records tokens, repair
rounds and their causes, the sources that failed a repair round, dead space, and dead
controls. Offline coverage is 14/14 clean across both engines and all seven briefs.

**What is trustworthy.** Contract validity (36/36 across two earlier multi-sample runs, 14/14
here), the deterministic checks (unbound variables, namespace URLs, asset inlining), the
measured font widths, and export self-containment - all verified directly rather than
inferred.

**What is not.** Every readability figure collected before the gate fix, since a probe that
could not run was recorded as clean and the bias is one-directional (optimistic). The gate is
sound now - it reports `probed`, and the bench records that per run - but the replacement
numbers do not exist yet: the re-measurement covered three samples of one brief, enough to
retire the old 0% and no more. **This document quotes no defect rate**, deliberately.
Design-taste conclusions are unreliable at these sample sizes and should not be drawn from
single runs; the within-brief spread is wide enough to swamp anything worth chasing.

**Cost discipline.** A clean generation is ~7-8k in / ~6-7k out (about $0.08). A run with two
repair rounds costs roughly three times that. Always prove a bench change with `--stub`
first; never touch `.env` while a run is in flight; and keep `VITE_SUPABASE_*` unset on the
dev server the bench drives.
