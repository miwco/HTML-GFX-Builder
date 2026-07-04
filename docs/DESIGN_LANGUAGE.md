# Design Language

The taste rulebook for every generated template. Anyone (human or agent) building or judging a
template follows this. The bar: **every template should look like a paid MotionArray / Envato
Elements asset**, not a tutorial demo. When in doubt, remove something.

Values below are for a **1920×1080 canvas**; scale linearly for other resolutions (multiply by
`height / 1080`).

---

## 1. Typography

- **One family per graphic** (two max: heading + label). Pick from the bundled fonts registry.
- **Contrast through weight and size, not more fonts.** A lower third is typically:
  - **Name / headline:** 44–64 px, weight 600–800, line-height 1.05–1.15, letter-spacing 0 to
    −0.01em (big text tightens).
  - **Title / role line:** 22–30 px, weight 400–500, line-height 1.2–1.35.
  - **Kicker / label** (small caps line like "LIVE" or a category): 16–22 px, weight 600–700,
    `text-transform: uppercase`, letter-spacing **0.08–0.2em** (small caps breathe).
- Size ratio between name and title ≈ **1.8–2.2 : 1**. Closer than 1.5:1 looks indecisive.
- Never center-align a lower third's text; left-align (or right for right-anchored variants).
- `text-wrap: balance` on lines that may wrap (with the auto-fit pattern below).

## 2. Color

- **Palette discipline: exactly one accent color** per graphic + a neutral text/background system.
  Two accents = amateur hour.
- Neutrals: near-black panels are `rgba(8–18, 8–20, 14–28, 0.85–0.95)` — never pure `#000`.
  Light text is `#fff` for the name; the secondary line drops to 65–80 % opacity or a tinted
  neutral, never pure white for both.
- The accent appears in **small, sharp doses**: an accent bar, an underline, a kicker background,
  a gradient edge — not as the whole panel background (sport style may break this rule
  deliberately with a bold accent slab).
- Gradients: same-hue or adjacent-hue only (e.g. blue→indigo), 90–135°, subtle. Rainbow = never.
- Everything colorable goes through `:root` custom properties (`--accent`, `--text-color`,
  `--text-dim`, `--panel-bg`) so the Style panel can retint the whole graphic coherently.

## 3. Spacing & shape

- **Padding is generous:** text sits in a panel with 0.5–0.7em vertical / 1.0–1.4em horizontal
  padding. Cramped padding is the #1 tell of a bad lower third.
- Gap between name and title lines: 4–10 px (they read as one unit), plus 8–14 px to a kicker.
- **Shape language per style tag:**
  - **minimal** — no panel or a hairline one; 0–2 px radius; accent is a 2–4 px line/bar;
    whitespace does the work; optional 1 px `rgba(255,255,255,0.15)` keyline.
  - **sport** — angled edges (`clip-path` or `transform: skewX(-6deg to -12deg)` with counter-skew
    on text), layered slabs, 0 radius, heavy weights, condensed faces, accent used boldly.
  - **glass** — 12–24 px radius, `backdrop-filter: blur(12–24px)` over a translucent panel
    (`rgba(255,255,255,0.08–0.14)` on dark), 1 px inner keyline `rgba(255,255,255,0.18)`,
    soft wide shadow `0 20px 60px rgba(0,0,0,0.35)`.
- Shadows lift, never smear: prefer one soft large shadow over multiple small ones.

## 4. Motion (GSAP)

The animation **is** the taste. Rules:

- **Animate only** `transform` (x/y/scale/skew), `opacity`, and `clip-path`. Never `left/top/
  width/height/margin` (layout thrash = jank).
- **Ease vocabulary:** ins use `power3.out` or `expo.out`; springy pops use `back.out(1.4–1.8)`;
  outs use `power2.in` or `power3.in` and are **30–40 % faster than ins**. Never `linear`, never
  default ease.
- **Durations:** in = 0.5–0.9 s total; out = 0.3–0.5 s. Respect `animSpeed` (divide durations).
- **Choreograph, don't blob:** elements enter in sequence with 0.06–0.15 s staggers — accent
  first, then name, then title. One `gsap.timeline()` per direction (`buildInTimeline()`,
  `buildOutTimeline()`), never a pile of loose tweens.
- **Signature reveals** (each variant has one, matched to its style):
  - *line/underline reveal:* accent line scales `scaleX 0→1` (set `transform-origin: left`),
    text slides up from behind an `overflow: hidden` line-mask with a slight y+opacity.
  - *mask wipe:* panel reveals via `clip-path: inset(0 100% 0 0)` → `inset(0 0% 0 0)`.
  - *pop-spring:* scale 0.9→1 + y 20→0 with `back.out(1.6)` (glass style).
  - *snap-stinger:* fast x-slide with skew that settles (sport; total in ≤ 0.5 s).
  - *blur-in:* opacity + `filter: blur(12px)→0` on the panel only (sparingly — filter is costly).
- Steps mode (SPX Continue): step 1 shows the name line; each `next()` reveals the following line
  with the same vocabulary. Out always takes the whole graphic.
- `will-change: transform, opacity` on animated elements (and remove nothing else — keep it simple).
- Loops (tickers/starting-soon, later): pauseable, seamless, no rewind pops.

## 5. The auto-fit text pattern (mandatory in all text graphics)

Text boxes **hug their content and wrap gracefully**; operators type any length.

```css
.l3-box {
  width: fit-content;              /* the panel hugs the text */
  max-width: 800px;                /* never grow past this — wrap instead (~42% of 1920) */
}
.l3-name {
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped lines get even lengths */
}
```

- Anchor lower thirds with `bottom:` (not `top:`) so wrapped lines grow **upward** and the
  graphic never sinks out of the safe area.
- Line-masks used for reveals must wrap-safe: mask the *block*, not a hardcoded height.
- Max width defaults to keeping the panel inside the action-safe area from its anchor zone.

## 6. Position

Nine anchor zones snapped to safe areas (5 % inset at 1080p ≈ 96 px sides / 54 px top-bottom;
use the tighter classic 120 px left inset for lower-left thirds). Zone sets the anchoring edges
(`left/right/top/bottom` + transforms for centered zones); a nudge offset adds to them.

## 7. Generated-code style (teachability)

- **Naming:** one short prefix per category — lower thirds use `l3` (`.l3`, `.l3-box`, `.l3-name`,
  `.l3-title`, `.l3-kicker`, `.l3-accent`, `.l3-logo`). Functions are verbs:
  `buildInTimeline()`, `buildOutTimeline()`, `update(data)`, `play()`, `stop()`, `next()`.
- **Comment every CSS property** (short, right-aligned style as in existing templates) and every
  JS section. Comments teach *what it does*, not *that it changed*.
- **`:root` style contract** at the top of the CSS: `--accent`, `--text-color`, `--text-dim`,
  `--panel-bg`, `--font-heading`, `--scale` — each commented.
- **Marked animation region** in template.js:
  ```js
  /* == ANIMATION (generated — the Animation panel rewrites this block) == */
  var animSpeed = 1;  // 1 = normal · 0.75 = slower · 1.5 = faster
  function buildInTimeline() { /* … */ }
  function buildOutTimeline() { /* … */ }
  /* == END ANIMATION == */
  ```
  Nothing outside the markers may be touched by the Animation panel.
- Keep JS ES5-flavored and plain (`var`, `function`) to match SPX's classic-template idiom; no
  build steps, no modules, no cleverness. Field convention: one element `id="fN"` per data field;
  `update(data)` writes values straight in (see `docs/SPX_TEMPLATE_FORMAT.md`).

## 8. Judging checklist (what reviewers score)

1. **Taste** — would this pass on a paid-asset marketplace? Palette discipline, spacing, type
   hierarchy per the rules above.
2. **Motion** — choreographed timeline, correct eases, right durations, fast-out; runs without
   jank; respects `animSpeed`; steps mode works when enabled.
3. **Auto-fit** — a 60-character name wraps to new rows, box grows upward, nothing overflows or
   clips wrongly.
4. **Code teachability** — naming convention, every property/section commented, `:root` contract
   present, marked animation region present, simple ES5 JS.
5. **SPX validity** — `validateTemplate` passes; `update/play/next/stop` run clean; export is
   plug-and-play (relative paths, bundled font + GSAP).
