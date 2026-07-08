# Timeline & advanced animation — direction plan

The timeline's job: make **complex broadcast animation sequencing controllable and
reusable** — timing, easing, per-line choreography, and next()/step triggers — for people
who will never hand-edit GSAP. It is deliberately NOT the graphics creation surface (the
wizard + panels own creation) and NOT a Loopic-style keyframe composer clone.

## The anchor principle

The marked ANIMATION region is already a deterministic, re-emittable program: presets emit
`buildInTimeline()/buildOutTimeline()` with named knobs (`animSpeed`, `easeIn`, `easeOut`)
and per-phase preset comments the Motion panel can read back (`blocks/animPatch.ts`). The
timeline is a **richer view + richer knobs over that same region** — every timeline gesture
re-emits readable GSAP code between the markers; hand-written code outside them is never
touched. If the timeline can express it, the code shows it; if the code can't show it
readably, the timeline doesn't offer it.

## Phases

### T1 — Read-only timeline view (see the choreography) — ✅ SHIPPED + T1.5 (2026-07-08)
Parse the emitted region (we wrote it, so parsing is by construction, not heuristics) into
tracks: one row per animated element (accent, box, each line mask), bars for start/duration,
ease labels, phase markers (IN · OUT). Scrub pauses the live preview via the simulator.
**T1.5 (user feedback):** the timeline moved OUT of the Motion tab to where animation tools
put it — a collapsible strip directly under the preview, above the transport buttons — with a
**live playhead**: the simulator owns the running timeline (`window.__activeTl`), a rAF loop
follows it, ▶ Play sweeps the In phase, ■ Stop auto-switches to Out and sweeps it, loops wrap.
Idle parks at the end of In (the settled design-view state).

### T2 — Timing knobs on the tracks
Drag a bar's start/length → re-emit the region with per-element knob variables (e.g.
`var lineDelay = [0, 0.12, 0.2]` style, commented), same as animSpeed today. Eases editable
per element from the existing 12-preset easing vocabulary (direction-correct per phase —
the doctrine in model/easings.ts stays the law). Everything undoable, highlighted, and
still swappable: changing the preset re-emits cleanly because knobs live in the preset's
emit contract, not in free edits.

### T3 — Steps & next() sequencing (the live-graphics differentiator)
Model SPX Continue/next() as timeline SEGMENTS: reveal groups with an explicit order,
per-segment timing, and a visual "what plays on each press" strip. Covers quiz reveals,
multi-line straps, scoreboard moments. This is where we beat generic tools: the timeline
speaks playout (play/next/stop), not video-editor time.

### T4 — Custom sequences (escape hatch, later)
Add/reorder simple actions per element (move/fade/scale/blur) as new emitted tweens in the
region — still preset-grade readable output with comments. The moment a request needs
free-form keyframes, the answer is the code editor, one click away.

## Non-goals

- No general-purpose keyframe editor, no curves UI beyond the easing vocabulary.
- No timeline-owned state: the region is always the truth; reload from code at any time.
- No new runtime: GSAP timelines as today; `ease: 'none'` stays reserved for continuous
  motion (tickers/credits) per DESIGN_LANGUAGE §4.

## Sequencing vs Era 6

T1 (read-only view) can ship independently and even before WYSIWYG W2+ — it needs no new
code contracts. T2 needs a knob-emit extension per preset (touches every preset module —
plan one mechanical pass). T3 builds on the existing steps machinery. Recommended order:
W1 → T1 → T2 → W2/W3 → T3, re-evaluated against user feedback.
