---
name: video-quality-round
description: >-
  Run a video AI quality round in NoaCG Studio - real-token generations through
  scripts/video-bench.mjs, key-frame capture, runtime readability checks, and a review
  gallery - then turn the findings into prompt-harness changes in src/ai/video. Use when
  asked to bench the video output, run a quality round or quality pass on the video
  generator, check whether video generations regressed, or judge Motion Director /
  Remotion / HyperFrames generation quality.
---

# Video AI quality round

The bench (`scripts/video-bench.mjs`) drives the wizard's real example chips through real
model calls, captures frames from the live player, runs the runtime readability checks, and
writes a review gallery. It is the raw material for iterating `src/ai/video/`.

**⚠ This spends real tokens.** Each generation is two Sonnet calls (director + coder) plus
up to two repair rounds - expect tens of cents per run, multiplied by examples × runs.
Confirm scope with the user before starting, and say what it will cost.

## Before running

1. **Dev server on this checkout's port** - `node scripts/dev-port.mjs` prints it. Start it
   the normal way; never hand-roll a server in Bash.
2. **`VITE_ANTHROPIC_API_KEY`** in `.env` or the environment. The bench aborts before
   spending anything if it is missing.
3. **Fresh player host** - `npm run build:player-host`. A stale built host has no readability
   checks to call, and the round silently reports nothing.

The bench seeds the app's AI settings itself (key + model, `proxyUrl: ''`, harness off), so a
dev server started with a fuller `.env` (hosted-mode proxy, Supabase) still benches in
direct bring-your-own-key mode.

## Running

```bash
node scripts/video-bench.mjs [out-dir] [labels | count | briefs.json] [runs-per-example]
```

- **out-dir** - defaults to `./video-bench-out`.
- **second arg** - a comma list of example labels (`"Sports stinger,Countdown"`), the first N
  examples, or a path to a `.json` file of custom briefs (`[{label, prompt, durationSec?}]`,
  typed into the wizard instead of a chip).
- **third arg** - repeats each example. Generation is stochastic: a single sample tells you
  almost nothing about reliability. Use ≥3 when judging a change.

The built-in labels are the wizard's own chips (`Sports stinger`, `News intro`, `Logo
reveal`, `Countdown`) - the bench drives the shipped prompts, never a drifted copy.

Scope honestly: a smoke check is one label × one run; a real quality round is the full set ×
three. Pick with the user, and never quietly sample fewer than you report.

## Reading the results

Frames are captured across the entrance, build, midpoint, hold, exit, and final; readability
is checked at the hold fractions, where the hero must be legible. Two checks matter most:

- **occlusion** - the title painting behind the shape panels
- **clipping** - "KITCHEN" rendering as "KITCH"

A finding at a single frame is noise; one that persists across hold frames is the real
defect. Review the gallery yourself rather than trusting the pass/fail count alone - taste
problems (mush, no committed device, dead air) never trip a check.

## Turning findings into changes

Findings land in the prompt harness, not in per-template patches: the skills menus and
reference cards in `src/ai/video/`, the Motion Director plan contract, or the engine coder
prompts. Read `src/ai/CLAUDE.md` and `src/ai/video`'s contract before editing either.

After a harness change, re-bench the same labels with the same run count and compare like
for like. A quality claim without a before/after at equal sample size is not a result.

## Known traps

- **Engine coverage** - `--engine=remotion|hyperframes` picks the engine the wizard creates
  with; it defaults to **remotion**, so a plain run covers ONE engine. Run both and compare
  like for like before reporting a result as covering both.
- **Free dry runs** - `--stub` seeds no key, so the app falls back to the offline provider and
  the whole rig runs without spending anything. Use it to verify the RIG - navigation, engine
  pick, capture, checks, gallery output - before a paid pass. It does NOT exercise anything
  inside `claudeVideoProvider`: prompt assembly, reference-card selection and skill injection
  all live on the paid path, and `stubVideoProvider` never imports them. For selection, run
  `node scripts/reference-select-check.mjs` (also free) - it imports the real module through
  the dev server and prints both arms over the real brief bank.
- **Ghost store** - after HMR, an eval-context `import('/src/store/…')` can resolve a
  different module instance than the running app. If state reads disagree with the visible
  UI, restart the dev server and reload before trusting any assertion.
- **Hosted-mode env** - a `.env` carrying `VITE_AI_PROXY_URL` does not break the bench (it
  overrides to direct mode), but it does change what the app does outside the bench. Keep the
  two straight when debugging a discrepancy.
- **Stale bench comments** - the header in `scripts/video-bench.mjs` refers to
  `player-host/src/textChecks.ts`; the checks actually live in `src/video/textChecks.js` and
  are inlined into the player host at build time. Trust the source tree.
