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
- **Align toward the anchor.** A left-anchored graphic left-aligns, a right-anchored one
  right-aligns. Centering is allowed for a **centre-anchored** graphic only (`bottom-center`), and
  only where the composition is genuinely symmetric — a centred rule, a centred kicker over a
  centred name, the title-card grammar. A centred ragged block sitting at the left safe margin is
  the failure this rule exists to prevent; centring a two-line strap "because it looks balanced"
  is still wrong.
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
  - **editorial** — structure by RULES, not panels: a 2 px hairline above or beside the block, a
    wide-tracked small-caps kicker, 0 radius, generous whitespace between the rule and the name.
    A panel, where one is used at all, is a flat printed surface (ink or paper), never a chip.
  - **cinematic** — no panel edge at all. Text sits on a soft scrim
    (`linear-gradient(transparent, rgba(0,0,0,0.55))`, or a left-to-right one for a side-anchored
    design); the only drawn element is a 1 px hairline. Light weights, wide positive tracking.
    Readability comes from the scrim, and extra separation from `filter: drop-shadow(…)` **on the
    box** — never a `text-shadow` on a line, which the line's own overflow-hidden mask would clip.
- Shadows lift, never smear: prefer one soft large shadow over multiple small ones.

## 4. Motion (GSAP)

The animation **is** the taste. Rules:

- **Animate only** `transform` (x/y/scale/skew), `opacity`, and `clip-path`. Never `left/top/
  width/height/margin` (layout thrash = jank).
- **Easing doctrine** (the selectable presets live in `src/model/easings.ts`; generated code
  exposes them as the `easeIn` / `easeOut` variables in the marked ANIMATION block):
  - Movement must feel **responsive but polished** — smooth and snappy, never mechanical.
    Default to Easy Ease / ease-in-out-family curves; **avoid linear motion**.
  - **Entrances (in):** prefer **Ease Out** or **Back Out** — the object enters quickly and
    settles smoothly. Back Out (`back.out(1.4–1.8)`) is the pick for snappy pop-ins with a small
    overshoot.
  - **Exits (out):** prefer **Ease In** (`power2.in` / `power3.in`) — the object starts naturally
    and exits quickly. Exits run **30–40 % faster than entrances**.
  - **Bounce and Elastic are playful options only** — offered in the picker, never defaults.
  - **Linear is never a default** — reserve it for continuous motion: tickers, timers,
    progress bars, seamless loops.
  - The full preset list: Linear, Easy Ease, Ease In, Ease Out, Ease In-Out, Back, Bounce,
    Elastic, Expo, Cubic, Sine, Circ — each mapped to direction-correct GSAP curves per phase.
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
.lower-third-box {
  width: fit-content;              /* the panel hugs the text */
  max-width: 800px;                /* never grow past this — wrap instead (~42% of 1920) */
}
.lower-third-name {
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

## 7. Generated-code style (readability & editability)

- **Simplest clear code wins.** Prefer direct HTML/CSS/JS: descriptive names, simple top-to-bottom
  control flow, minimal indirection - a few obvious lines over a clever abstraction. A beginner
  should be able to locate the code that draws a thing and understand it. Add a helper, wrapper, or
  generic pattern only when it clearly makes the code *simpler to read*. This is a preference, not a
  ban on abstraction - reach for the simplest implementation that stays correct and maintainable.
- **Naming:** one descriptive prefix per category — lower thirds use `lower-third` (`.lower-third`, `.lower-third-box`, `.lower-third-name`,
  `.lower-third-title`, `.lower-third-kicker`, `.lower-third-accent`, `.lower-third-logo`). Functions are verbs:
  `buildInTimeline()`, `buildOutTimeline()`, `update(data)`, `play()`, `stop()`, `next()`.
- **Comment every CSS property** (short, right-aligned style as in existing templates) and every
  JS section. Comments explain *what it does*, not *that it changed*.
- **`:root` style contract** at the top of the CSS: `--accent`, `--text-color`, `--text-dim`,
  `--panel-bg`, `--font-heading`, `--scale`, `--type-scale` — each commented.
- **Two size knobs.** Every dimension scales via `calc(Npx * var(--scale))` (the whole-graphic
  knob, which also folds in resolution); font sizes additionally multiply by the text-only knob:
  `font-size: calc(Npx * var(--scale) * var(--type-scale))`. Nothing else consumes
  `--type-scale` — it changes the type, never the panel around it.
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

## 8. Package consistency (cross-category)

Graphics from one project must read as **one show**. Categories are not islands: every category
ships at least one variant per style family, and that variant must look like the **sibling** of its
lower-third counterpart. The shared `:root` contract + brand mechanism carry palette and font;
these family tokens carry the *shape and motion*:

| Token | minimal | editorial | cinematic | sport | glass | noacg (house) |
|---|---|---|---|---|---|---|
| Accent geometry | hairlines 2–4 px, short underlines | 2 px printed rules — above the block, beside it, or under the kicker | one 1 px hairline, nothing else drawn | slabs 8–12 px, fused to panel edges | dots, rings, gradient edges | one 8 px amber bar fused to the panel's left edge; solid amber label chips (dark ink) |
| Panel | none or keyline `rgba(255,255,255,0.14)` | none, or a flat printed surface (ink `rgba(16,15,14,0.9)` / paper `rgba(245,243,238,0.96)`) — never a chip | NONE. A soft scrim `linear-gradient(transparent → rgba(0,0,0,0.55))` + `text-shadow` on the type | solid slab, **skewX(−8°)** where skewed | translucent white 0.08–0.14 + `blur(18px)` + keyline 0.18 | void `rgba(10,12,16,0.86–0.92)` + `blur(8px)`; strips add a `rgba(246,166,35,0.5)` top edge |
| Radius | 0–2 px | 0 | 0 | 0 | 14–18 px | 0 on panels; 6 px on chips/badges |
| Shadow | none/subtle | `0 12px 36px rgba(0,0,0,0.28)` when a panel is used at all | no box shadow; separation is the scrim, plus `filter: drop-shadow(0 2px 14px rgba(0,0,0,0.5))` on the box where needed | hard offset (sticker-slab) | soft wide `0 20px 60px rgba(0,0,0,0.35)` | `0 16px 50px rgba(0,0,0,0.5)`; restrained amber glow `0 0 22–26px rgba(246,166,35,0.4–0.6)` on accent elements ONLY |
| Type | normal width, weights 400–700 | display 600, −0.015 em; kickers 0.24 em tracked caps in the ACCENT colour | display **400 and +0.06 em** — the one family whose big type OPENS UP; labels 0.34 em, dimmed, never accented | condensed/heavy caps, 0.02–0.1 em tracking on labels | soft rounded families, weights 500–800 | display 700, −0.01/−0.02 em; labels ALWAYS JetBrains Mono caps, 0.14–0.28 em tracking, accent or dark-on-accent |
| Motion feel | expo/power3 reveals, masked lines | expo reveals with the rule drawing first — the rule is the entrance | slow sine fades, 0.7–0.9 s; nothing travels far, nothing overshoots | ≤0.5 s snap-stingers, x-slides with skew | back.out pops, blur-ins | expo/power3 reveals like minimal — controlled, newsroomy; the glow never animates on its own |
| Continuous motion (tickers/credits/loops) | `ease: 'none'` (Linear) for the travel itself; entrances/exits still eased | same | same | same | same | same |

**editorial** and **cinematic** are the two newest families. They exist because the first four had
no voice for the two commonest premium references outside sport and streaming: the magazine /
newsroom strap (rules, kickers, printed hierarchy) and the documentary name super (a scrim, wide
light caps, no panel at all). Today they are filled in the LOWER-THIRD category only — the type ×
family matrix (`scripts/factory.mjs matrix`) shows their other cells empty, and a template pack
(`src/templates/packs.ts`) cannot name either as its family until those cells are filled. An empty
cell is work not yet done, not a defect.

The **noacg** family is the product's own on-air look (BRAND-MANUAL §3: void `#0a0c10`, amber
`#f6a623`, paper `#e8edf2`; markets up/down `#4ac47a`/`#e57a7d`), derived from the seven
`NoaCG-Brand-Kit/overlays/` pieces. It exists so the product's built-in output showcases the
brand. Its default label face is bundled JetBrains Mono (`labelFontFaceCss`) — a design-owned
second typeface the Style panel's heading-font swap never touches. Like every family, palette
and heading font remain fully user-swappable via the `:root` contract.

Rules:
- A new category variant **must name its lower-third sibling** in its brief and be judged against
  it ("would these two appear in the same show?").
- Reuse the exact token values above (e.g. sport's −8° skew, glass's blur 18) — don't improvise
  new ones per category.
- Category structure contracts mirror `.lower-third`: `.info-card`, `.credits`, `.ticker` roots with the same
  `:root` variable names, the same marked ANIMATION region, and the same auto-fit text rules.

## 9. Judging checklist (what reviewers score)

1. **Taste** — would this pass on a paid-asset marketplace? Palette discipline, spacing, type
   hierarchy per the rules above.
2. **Motion** — choreographed timeline, correct eases, right durations, fast-out; runs without
   jank; respects `animSpeed`; steps mode works when enabled.
3. **Auto-fit** — a 60-character name wraps to new rows, box grows upward, nothing overflows or
   clips wrongly.
4. **Code readability** — naming convention, every property/section commented, `:root` contract
   present, marked animation region present, simple ES5 JS.
5. **SPX validity** — `validateTemplate` passes; `update/play/next/stop` run clean; export is
   plug-and-play (relative paths, bundled font + GSAP).
