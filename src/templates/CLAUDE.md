# src/templates - the wizard catalog and template contracts

Loaded alongside the root CLAUDE.md when working in this directory. Keep it accurate. Read
docs/DESIGN_LANGUAGE.md before generating or judging templates. After template changes, run the
catalog sweep for the affected category (root CLAUDE.md, "Verifying changes").

blank.ts + the catalog, resolved through catalog.ts (CATALOG, variantsFor/variantById).

## Shared assemblers (every category builds on these)

- **shared/base.ts** - generic assembler pieces: :root vars, zones, auto-fit, runtime scaffold.
- **shared/standard.ts** - CategorySpec, assembleStandard, makeDefineVariant, and
  `convertToDataRegion` - the Timeline v2 flip: convert a freshly assembled template's legacy
  ANIMATION region into the NOACG_ANIM data block + interpreter through the parity-proven
  importer (blocks/animImport.ts) at create. The preset still authors the motion; only the
  marked region converts (category-owned runtime around it - score pops, clock painters -
  stays); a conversion failure keeps the legacy emit, never a broken template.
  `CategorySpec.dataRegion` triggers it inside assembleStandard; self-assembled categories
  (scoreboards, game timers, starting soon, quiz, infographics) call it directly. **EVERY category
  now creates as a data block** - the legacy region survives only in SAVED templates (see
  src/blocks/CLAUDE.md). The step-calls model
  (docs/TIMELINE_V2_PLAN.md §3b)
  carries `tl.call(startClock/stopClock)` through the conversion as step `calls`, so a countdown
  survives the flip (the clock runtime itself lives OUTSIDE the region and is untouched), and the
  loop model (gap 6) carries the ambient breath as a step `loop` (a repeating scale track) - this
  is what let STARTING SOON flip. The MEASURED-MOTION model (docs/DYNAMIC_MOTION_SCOPE.md) carries a
  `tl.add(builderName(target))` across as a step `dynamic` - this is what let TICKERS and END
  CREDITS flip (see their motion runtimes below).
  `convertToDataRegion(template, refine?)` takes an optional refinement of the imported data -
  the seam for a step the LEGACY region has no shape for, so a category can author it directly
  instead of growing a legacy step kind Phase 8 will delete. QUIZ is the one user
  (docs/TIMELINE_V2_PLAN.md §3c): its Continue reveal is a lifecycle CALL, not a reveal group,
  so it inserts a middle step `{ calls: [revealAnswer] }` before Out - which makes SPX's
  `steps: '2'` DERIVED (three steps -> one press) instead of a hard-coded value the timeline's
  steps re-sync would overwrite with '1' on the first edit, killing the reveal.
  INFO CARDS flipped last (`dataRegion: true`) - they are the standard contract's other line-based
  family, so they convert exactly like lower thirds, steps and all. Nothing blocked them but the
  spec suite they hosted, which now runs against a SAVED legacy template instead (e2e/timeline.spec.ts).
  A wrapper that needs the motion speed must read it via the shared `motionSpeed()` helper
  (base.ts `motionSpeedJs`: NOACG_ANIM.speed, else legacy animSpeed, else 1) - never the bare
  animSpeed global, which only exists inside a legacy region.
- **shared/animRuntime.ts** - the emitted ES5 interpreter (Timeline v2), identical in every
  data-driven template: reads the NOACG_ANIM literal and defines the SAME builder globals the
  whole platform depends on (buildInTimeline / buildOutTimeline / revealNextStep), so the
  simulator, wizard thumbnails, control engine, and every export work unchanged. It pre-hides
  press-revealed layers (their reveal step's first keyframe values; plain opacity 0 fallback),
  shows/hides the CSS-hidden root, fades press-revealed layers OUTSIDE the root with the exit
  (unless the Out step animates them itself), runs a `loops` track in its own repeating
  sub-timeline (repeat/yoyo/repeatDelay - the ambient breath), and divides every duration and
  keyframe time by `speed`. `emitAnimRegion` emits the full marked region (data header + literal +
  interpreter); `replaceRegionWithAnimData` swaps a template's region for the data-driven
  emit (the converter's writer).
- **shared/clock.ts** - countdown engine: hidden minutes field -> M:SS + `{prefix}-done` at zero;
  DOM-ready-safe.

## Categories

- **lowerThirds/** - lt01…lt13 on shared.ts (prefix 'lower-third', `dataRegion: true` - the
  first category to create as NOACG_ANIM data blocks) + animPresets.ts (the shared marked-region
  GSAP preset bank, prefix-parameterized - it animates any category's `.{prefix}-box` structure;
  on a data category the preset's emit is converted at create, and blocks/presetApply.ts derives
  keyframes from the same emitters after). The bank leads with the **Slide family**
  (`makeSlidePreset`: slide-up/-down/-left/-right - one choreography, four directions of travel,
  ids adjacent + `SLIDE_FAMILY`/`isSlidePreset` so pickers group them: the wizard renders ONE
  Slide card with a direction picker, the Inspector one optgroup), then line-reveal, mask-wipe,
  pop-spring, snap-stinger, blur-in, fade, flip-3d.
- **infoCards/** - card01…card05 (prefix 'info-card', `dataRegion: true`). The standard contract's
  other line-based family: they use the same 9-preset bank as lower thirds and convert exactly like
  them, steps and all (a » press per body line becomes a middle step with its `reveals`).
- **endCredits/** - cr01…cr04 (prefix 'credits') + creditsPresets.ts (credits-roll /
  credits-pages / credits-crawl) + **creditsMotion.ts**; data-driven: a hidden #f0 textarea holds
  "Role | Name" lines, template JS parses and rebuilds #credits-track, ends with logo + year
  (.credits-end). DATA BLOCKS via convertToDataRegion.
- **tickers/** - tk01…tk06 (prefix 'ticker') + tickerPresets.ts (ticker-marquee / ticker-flip) +
  **tickerMotion.ts**; data-driven: #f0 lines -> #ticker-track items; marquee = items rendered
  twice, slide one set width, linear repeat:-1 (seamless loop). DATA BLOCKS via convertToDataRegion.

### The category MOTION RUNTIMES (tickerMotion.ts / creditsMotion.ts / igMotion.ts)

These categories move by magnitudes that only exist once the operator's DATA is in the DOM: a
marquee slides exactly one track-width, a roll covers its own content height, a flip runs one
segment per item, a stat counts to the figure they typed, a bar grows to its own `data-value`, a
list cascades one row per line they wrote. No static keyframe can hold a number that changes the
moment the data does - which is why these were the last categories on the legacy patchers.

The fix (docs/DYNAMIC_MOTION_SCOPE.md): each measured motion is a named BUILDER - a plain function
that measures the DOM and RETURNS a GSAP object - emitted OUTSIDE the marked ANIMATION region, in
the design-owned runtime, exactly like shared/clock.ts. The preset's region does not inline the
math; it just calls it: `tl.add(tickerMarquee('#ticker-track'))`. Consequences, all load-bearing:

- the region stays fully PARSEABLE, so the ordinary importer converts it (the segment becomes a step
  `dynamic`) - ONE choreography source, no second code path;
- the builders survive the conversion and the export untouched (they're outside the markers);
- **every builder of a category ships in every template of it**, so swapping the motion preset is a
  pure data edit (one `build` name) with nothing outside the markers rewritten;
- the speed knob is read through `motionSpeed()`, never the region's `animSpeed`;
- a builder takes `(target, opts)` - `opts` is `{speed, ease}` from the interpreter (absent when the
  LEGACY emit calls it, so always default), and it may compose other builders (igMotion's count-up
  adds the bar growth once the figure lands). Give a `tl.add()` an EXPLICIT position when the phase
  has more than one: a segment is zero-advance in the importer's clock but a real child in GSAP's,
  so a bare `'-=N'` after one would resolve differently in the two.

Adding a measured motion to another category = add a builder to its runtime + have the preset
`tl.add()` it. Do NOT inline measured math in a region: it makes the template unconvertible.
- **startingSoon/** - ss01…ss03 (prefix 'starting-soon', hold-loop preset: entrance + calm
  .starting-soon-pulse breathing + clock via shared/clock.ts, minutes in f2). DATA BLOCKS via
  convertToDataRegion (self-assembled, calls it directly): the breath imports as a looping scale
  track (gap 6) and startClock/stopClock ride the step calls (§3b); the clock runtime stays
  outside the region.
- **gameTimers/** - gt01…gt02 (prefix 'game-timer', type 'countdown'; data blocks via
  convertToDataRegion; timer-run pop + timer-line-reveal; minutes in f1; .game-timer-done
  styles time-up). The preset's startClock()/stopClock() ride the conversion as step `calls`
  (§3b); the clock runtime (shared/clock.ts) stays outside the region.
- **scoreboards/** - sb01…sb02 (prefix 'scoreboard', data blocks via convertToDataRegion;
  fixed 4-field contract f0-f3 as scoreboard-masks so the standard presets drive them;
  update() pops a score's mask when it changes on air - speed via motionSpeed()).
- **cornerBug/** - bug01…bug02 (prefix 'corner-bug', standard assembler, `dataRegion: true`,
  logo slot + placeholder mark; bug02 = house live clock via StandardDesign.runtimeExtraJs -
  design-owned JS emitted BEFORE the marked ANIMATION region, DOM-ready guarded, survives the
  data conversion untouched).
- **infographics/** - ig01…ig06 (prefix 'infographic'; design owns fields + runtimeExtraJs) +
  igPresets (count-up / bars-grow / ring-fill / rows-cascade) + **igMotion.ts**. DATA BLOCKS via
  convertToDataRegion. EVERY infographic's motion is MEASURED - the stat counts to the figure the
  operator typed, each bar grows to its own `data-value`, the ring draws to that percent, and the
  cascade runs one row per line they wrote - so none of it is a number a keyframe can hold, and it
  all lives in the category motion runtime (see below). The region keeps only the panel entrance
  (real, editable keyframes) and NAMES the measured part. A count-up design may or may not pair a
  progress bar with its figure, so `PresetConfig.hasBars` tells the preset - without it a bar-less
  design (ig01) would carry a phantom timeline layer for an element it doesn't have.
- **quiz/** - qz01 (prefix 'quiz'; f0 question, f1-f4 options, hidden f5 correct-answer dropdown).
  DATA BLOCKS via convertToDataRegion + a refinement (§3c above): the Continue reveal is a real
  middle step that CALLS revealAnswer() (adds .quiz-correct/.quiz-dim + pops the winner;
  update() clears the reveal). Each answer ROW carries `quiz-option` (the shared look) AND
  `quiz-option-N` (its own animation identity) - the entrance staggers the four, and a stagger
  lives in the keyframe model as per-row start times, which one class matching four elements
  cannot carry. The numbered rows are registry parts, labelled by their field ("Answer B").

## The :root style contract

Every template exposes `--accent`, `--text-color`, `--text-dim`, `--panel-bg`, `--font-heading`,
`--scale`, `--type-scale`. The Style panel reads/writes exactly these, swaps the marked
`@font-face` block (bundled or imported), re-anchors the root element via `zoneDecls`, and can
import a font post-creation. **Two size knobs:** every dimension is authored as
`calc(Npx * var(--scale))` (whole-graphic size; resolution is folded into `--scale` by
`computeScale`), and font sizes additionally multiply by `var(--type-scale)` (text-only size,
a raw multiplier — S 0.9 · M 1 · L 1.15). Nothing but `font-size` consumes `--type-scale`.

## Template runtime rule

Generated template.js loads in `<head>` in exported packages - any load-time DOM work (initial
rebuild/paint) must use the DOM-ready guard pattern (see shared/clock.ts or the rebuild calls in
the credits/tickers/infographics runtimes).

## Fields & images (the broadcast field policy)

- Field types offered to users are the ones live graphics actually use: `textfield`, `textarea`,
  `number`, and **`filelist` = the image field** (SPX lists files from
  `assetfolder: './images/'`). `dropdown`/`checkbox`/`color` exist in the SPX format but are
  reserved for genuinely constrained design choices (e.g. the quiz's correct-answer dropdown) -
  don't offer them in generic field UIs.
- Every runtime writes fields through the shared `setFieldValue` helper (base.ts
  `setFieldValueJs`): text -> textContent, `<img id="fN">` -> src (an empty value hides the img
  and toggles `.has-image` on its parent so CSS can show a placeholder). Data-driven categories
  may instead keep the path in a hidden source div (credits' #f2 logo).
- Logo slots are real SPX fields, declared as a VARIANT CAPABILITY
  (`TemplateVariant.logo: 'none' | 'optional' | 'built-in'`): built-in designs (corner bugs,
  credits' f2) always carry their slot; 'optional' designs get the wizard's Fields-step logo
  toggle + custom upload and only emit the field when it's on (`ResolvedOptions.logoEnabled`).
  A design either hand-authors its slot (lt07's badge, lt08's docked square, card03) as
  design-owned `extraFields` (id computed after all user fields), or opts in with zero code:
  `shared/logoSlot.ts` `applyLogoSlot` injects the standard slot (filelist field +
  `<img id="fN" class="{prefix}-logo">` leading the box + placeholder CSS) from
  `assembleStandard` when `logoEnabled` and `designHasLogoSlot` says the design has none.
- The preview iframe can't resolve `images/...` paths set at runtime - preview/composeDocument.ts
  injects a MutationObserver shim that swaps known relative paths for their in-memory data URLs.
  Exported packages never include the shim.
- Asset path convention (uploads at `images/<file>`, fonts at `fonts/<file>`, one-folder zip
  layout): see src/export/CLAUDE.md.

## Easing doctrine

model/easings.ts + DESIGN_LANGUAGE §4: entrances use Out-direction curves, exits use In-direction
and run faster; Back Out for pops; Bounce/Elastic playful-only; Linear only for continuous motion
(credits rolls, ticker marquees - strictly `ease: 'none'`).

## Broadcast packages (siblings)

Graphics made in one project must read as siblings - DESIGN_LANGUAGE §8 holds the per-family
cross-category tokens (minimal / sport / glass / **noacg house** shape, type, and motion values;
noacg is the product's own on-air look, rebuilt from the brand-kit overlays). Two mechanisms
enforce it: the **project brand** (model/brand.ts, captured on every wizard Create; the wizard's
"Use current project's colors & font" toggle - off by default - re-applies palette + font via
`brandPatch`) and **sibling judging** (every new category variant is judged against its
lower-third counterpart). Custom colors enter through the wizard's Custom palette (hex/rgba +
picker); imported fonts become template assets (`fonts/<file>` data-URL) with a visible
`@font-face`, are registered via the FontFace API for the builder UI, and ship as real binaries
in the export.
