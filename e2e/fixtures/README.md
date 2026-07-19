# e2e fixtures

Real generated artifacts kept as reproducers, so an investigation does not need to spend
tokens regenerating one.

- **`hf-transparent-lower-third.html`** - a HyperFrames transparent lower-third from the
  varied-brief benchmark whose two text lines sit at x = -1551 through the entire hold: the
  strap never leaves its entrance position, so nothing is readable. It is the reproducer for
  the open readability-gate instability described in `docs/HYPERFRAMES_QUALITY.md`
  (follow-up 1) - the same source has validated both PASS and FAIL in different sessions.
  Validate it with `validateHyperframesComposition` against the real mounted bridge at
  4 s / `transparent: true`.
