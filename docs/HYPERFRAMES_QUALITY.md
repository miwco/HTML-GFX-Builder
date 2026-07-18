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
> ships. The current pass re-measures against the real gate.

## Open follow-ups

1. **Sharpen the repair message when text looks duplicated.** A rejection was observed where
   the finding told the model to resize a line whose real problem was that it had been
   rendered twice ("NOACGNOACG"). A finding that notices a repeated substring and says so
   would probably be fixable inside the two rounds.
2. **The countdown-style minimal reveal is the weakest brief** - the most defects of any brief
   benchmarked, and the "uncommitted default" look it falls into is unmoved by prose. Treat it
   as its own problem rather than a symptom of general taste.
3. **`<video>` / `<audio>` clips** - the largest deliberate divergence from real HyperFrames.
   A real feature (validator, driver, compose, and the render worker all have to agree on how
   a media clip seeks deterministically), not a prompt change.
