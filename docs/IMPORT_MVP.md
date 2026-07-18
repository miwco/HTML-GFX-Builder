# Import Graphic — the manual MVP workflow

The one core workflow this feature makes reliable, end to end:

1. Choose **Import graphic** from the wizard.
2. Import a flat PNG design (e.g. a lower third drawn in Photoshop) — the wizard's ONLY job.
3. Create: land in the real canvas editor with the **Data tab** open.
4. Add text / number / image fields there — each is a real SPX DataField AND a real placed
   layer on the artwork, so every playout system can edit it.
5. Drag, nudge, and resize the fields on the canvas; restyle them in the Inspector's Style tab.
6. Animate the whole design (the default in/out) or each layer on its own, from the Inspector.
7. Preview with sample data.
8. Export a working SPX / CasparCG template.

**Success condition:** a user turns an imported lower-third PNG into a working SPX template
with two editable text fields and selectable in/out animations in under ten minutes.

**Product line:** NoaCG is not replacing Photoshop, Figma, or After Effects. Graphics may be
designed elsewhere. NoaCG's job is the dynamic fields, broadcast behaviour, control logic,
preview, and export around them. This flow is **manual — no AI anywhere in it** (the AI-driven
Import card is a separate entry; per the founder it merges into Describe).

## Why imported graphics could not be animated before

Not a bug — an absent path. Three separate systems all gate on ONE fact: the HTML containing
`class="<prefix>-box"` (`model/structure.ts` `detectPrefix`).

| Gate | Where | Effect without a `-box` |
|---|---|---|
| Layer registry | `structure.ts:61` — the `[class*="-box"]` spine | no prefix → no root/panel/parts → nothing is canvas-selectable |
| Presets | `blocks/presetRegistry.ts:67` `emitPresetRegion` | returns `null` immediately → `presetApply` has no donor keyframes |
| Timeline dock | `components/StepTimeline.tsx:82` `TimelineDock` | no `NOACG_ANIM` + no legacy region → `LegacyTimeline` → renders `null` (no strip at all) |

An imported PNG never reached those gates anyway: the import flow assigns the first image to
`logoAssetPath` and places it in a **64–96 px logo box** inside a *different* house design. On
the 34 variants with `hasLogoSlot: false` it ships as an asset nothing references. There was no
path where an imported image became the graphic.

## The approach: satisfy the contract, don't loosen it

**The import produces a template the existing engine already accepts** — a standard-contract
template with a `.imported-design-box`. The alternative (teaching the registry and the presets
to handle arbitrary foreign HTML) is a structural change to the shared element-identity
contract, and would put every catalog template at risk to serve one flow.

Because the output is an ordinary contract-shaped template, all of this works with **no change
to any of it**: the TemplatePart registry, canvas selection, the step timeline, the Inspector,
keyframes, validation, and all six export targets.

## The structure contract

```
.imported-design            root — positioned, opacity:0 until play()
  .imported-design-box      the design UNIT: art + text animate together
    .imported-design-art    the artwork (<img>, or an empty box before import)
    .imported-design-mask   one per line, id="fwN" — carries the POSITION
      span#fN               the field — carries the TYPE; SPX writes into it
```

- The **mask wrapper** and the **span** are separate elements because they are separate
  decisions: the canvas drags the wrapper, the Fields step restyles the span. The wrapper also
  makes `#fN` a registry `line` part (the registry's rule: an `fN` whose parent carries
  `<prefix>-mask`), which is what makes it selectable and mask-reveal-capable later.
- **Self-assembled** from `templates/shared/base.ts`, not `assembleStandard` — the standard
  assembler gives `.<prefix>-box` `width: fit-content` + the auto-fit wrap cap, which would cap
  a 1920px design at the 1680px text safe area and shrink the user's artwork.
- **Frame-sized art anchors at 0,0** (no zone insets — they exist to keep a house panel in the
  text safe area, and would push the user's own artwork off its own frame). A smaller design is
  a free-floating object and gets the ordinary 9-zone anchor.
- The artwork's natural size is **measured at import**, never assumed: it decides the graphic's
  size, the full-frame question, and where text defaults land.
- **Artwork larger than the frame is scaled down to fit it at import** (`DesignArt.width/height`
  become the fitted design-space size; the file's real pixels are kept as `sourceWidth/Height`
  for the summary). A larger file is almost always the same design exported at higher resolution
  (a 2×/retina export) - at natural size only its top-left quadrant would fit the frame, leaving
  a lower third drawn in its bottom half entirely off-screen. A 2× export of the frame therefore
  lands exactly frame-sized (anchored at 0,0), keeps its full resolution for sharpness, and text
  positions are measured in the fitted space the user actually sees.

## Whole-unit motion

`templates/importedDesign/designPresets.ts` — Fade · Slide up · Pop · Blur. They animate
`.imported-design-box` and nothing else. A flat design is one picture: the text is positioned to
sit inside artwork drawn around it, so moving a line independently of its art tears the design
apart. The catalog's line presets do exactly that (they stagger `#fN` out of masks), which is
why this family exists instead of reusing them — and why `presetsForType('imported-design')`
returns only these.

Per-element motion is not forbidden, just not the preset's business: this is a data-block
template like any other, so the timeline can key any layer after creation.

The presets emit a legacy region which `convertToDataRegion` converts to `NOACG_ANIM` at
create — the same emit→import path every category uses. No new engine code.

## Positioning: the canvas drag (and the Inspector's numeric X/Y)

A field's position lives in its wrapper's `#fwN` rule (`left`/`top`, design px measured from
the artwork's top-left). The assembler's `LineStyle.x/y` still writes it for a template built
with explicit lines, but the normal path is the editor: the canvas drag, the arrow-key nudge,
and the Inspector Style tab's X/Y inputs all patch that same rule.

**Dragging a selected field on the canvas re-places it.** The design tension
this had to resolve: on a data-block template, dragging a selected non-root layer writes **x/y
keyframes** at the playhead — that is *motion*, not a design position. For a placed line a drag
means "this is where the text sits". The resolution (`blocks/designLayout.ts`) follows the house
rule — the gate derives from the **code**, never the category: a line is *placed* when its
parent wrapper carries an id whose CSS rule holds readable `left`/`top` px values (the shape the
assembler emits, and a shape a pro can hand-write to opt any template's line in). A placed
line's drag patches that rule (one undoable CSS apply, in the rule's own `calc(Npx *
var(--scale))` or plain-px idiom) and is **excluded from the keyframe drag entirely**, so a
multi-select drag can never write motion keyframes for it. Everything else keeps the keyframe
drag unchanged, and catalog templates are untouched (their masks carry no wrapper ids).

## The wizard is a SETUP flow, not a second editor (2026-07-18)

The wizard is two steps — Start → Design — and its Design step's one CTA is **Create project**.
Creating builds the imported-design template **bare** (no fields) and lands in the real editor
with the **Data tab revealed** (`setActivePanel('data')`; the store's `panelRevealNonce` makes
the reveal fire even though 'data' is the stored default). Everything the wizard's old Text /
Style / Animation steps did lives in the editor now, once, on the real surfaces:

- **Fields** — the Data tab's add (below). The old wizard Text step's per-line X/Y/anchor/font/
  size/weight/color grid is replaced by the canvas gestures plus the Inspector's Style tab,
  which offer the same options and more against the SAME rules.
- **Whole-unit motion** — the default entrance is the Fade design preset; changing it is the
  Inspector's Animations tab on the Design (box) row, same presets, same generator.
- **Palette / font as base tokens** — the created template still carries the :root contract
  (default palette + font, or the project brand via the wizard's "Use current project's colors
  & font" toggle, offered on the Design step). The Style *panel* edits them post-create; a new
  line's defaults read them (`var(--text-color)`, `var(--font-heading)`).

A bare design's HTML/CSS carry teaching comments saying where fields will land; `resolveOptions`
honours an explicitly empty `lines` array for this (absent still falls back to suggestions).

**The box is labelled "Design", not "Panel".** `model/structure.ts` special-cases the
`imported-design` prefix, so the timeline row, canvas chip, and Inspector all say "Design" —
the box is the user's artwork, not a generated background panel.

## Fit: what a long value does to a placed line (2026-07-18)

A placed line was `white-space: nowrap` with no width cap, so a long operator value ran clean
off the artwork and off the frame. The line's **slot** is its wrapper's `max-width`; the
**fit mode** is how the text answers when the value outgrows it (`blocks/designLayout.ts`
`lineFit`/`setLineFit`, read from the code like every other reader here):

| Mode | Code shape | For |
|---|---|---|
| `overflow` | no cap (or `max-width: none`) | a line whose length the designer controls — the pre-fit behaviour, so **saved templates read as this and nothing changes under them** |
| `wrap` | cap + `white-space: normal` + `overflow-wrap: break-word` | descriptions, synopses — text that may take more rows |
| `shrink` | cap + `white-space: nowrap` + `data-fit="shrink"` | **the default for a new field**: names in a drawn slot |

`shrink` is the only one needing code, because CSS cannot size text to its container.
`templates/shared/textFit.ts` emits `fitPlacedText()` as **design-owned JS outside the marked
ANIMATION region** (like `shared/clock.ts` and the category motion runtimes), so the timeline
never rewrites it and it survives export untouched. The shared `update()` calls it when it
exists — the same optional-hook idiom `next()` uses for `revealNextStep` — and
`ensureTextFitRuntime` injects the block (and, for a template created before the hook, the
hook line) exactly once, the idempotent-bootstrap pattern `blocks/lottieInsert.ts` uses.

Two decisions worth keeping:

- **It shrinks by reducing font-size, not by condensing glyphs horizontally.** The horizontal
  squeeze is the older hardware-CG trick, but it distorts the typeface the user chose — and
  that typeface is part of the design they imported. A `FIT_MIN_RATIO` floor (0.55) stops it
  before illegibility; past the floor the slot's `overflow: hidden` clips, which is the honest
  outcome of a value that genuinely does not fit.
- **It re-fits on `document.fonts.ready`, not just DOM-ready.** The design's face loads with
  `font-display: swap`, so a DOM-ready-only pass measures the *fallback* font and leaves the
  fitted line overflowing the moment the real face swaps in. (Found by measuring the composed
  export document, not by reading the code — the same hazard `WizardPreview` already gates on.)

A new field is born with a slot equal to the room between it and the artwork's right edge, so
a long value can never leave the design without the user configuring anything.

## The canvas + data-field phase (post-MVP, 2026-07-18)

The wizard hands off to the REAL canvas (it always did — the output is a contract-shaped
template), and this phase makes the editor's data-field workflow first-class there:

- **The Data tab's add-field is real on an imported design.** `blocks/designLayout.ts
  addPlacedLine` is one pure transform emitting everything a field needs to exist end to end:
  the mask wrapper + `#fN` span inside the design unit (which makes it a registry `line`
  part — selectable, animatable, a timeline row), the wrapper's placement rule + the span's
  type rule in the assembler's exact idiom (so the drag/nudge/resize read it back), and the
  SPX DataField (the shared runtime's `update()` binds by id — zero JS changes, works in
  every export). The new line stacks under the LOWEST existing line and inherits its
  size/weight/color; the first line of a bare design starts in the artwork's lower-left. The
  gate is `designBoxInfo` — code-derived (a box whose unit carries `<prefix>-art`), never the
  category. Long text and image fields keep the definition-only add.
- **Image slots are placed fields too.** The Data tab's Image add runs `addPlacedImageSlot`:
  an `<img id="fN">` in a mask wrapper (a registry `image` part) with a sized slot box, a
  dashed outline while empty (the house rule — image placeholders are visible), and an SPX
  `filelist` DataField listing `images/` — the shared runtime's `setFieldValue` already
  handles the img show/hide and `.has-image`. A hidden empty slot stays selectable and
  draggable: the canvas lets the rendered WRAPPER stand in for a placed field's hidden
  element (`partScreenEl` in CanvasInteraction), and the corner handle resizes the slot's
  box (`slotSize`/`setSlotSize`, aspect preserved).
- **Canvas text tools (2026-07-19).** The stage toolbar grows a ↖ / T / boxed-T switch on
  placed-design templates: the **T tool** clicks point text onto the artwork (the field is
  created empty at the click - the insertion point - and the inline editor opens on it, so
  the user types directly on the canvas; an empty commit removes it again), and the **area
  tool** drags a rectangle that becomes a wrapping text box (fit 'wrap' at the dragged
  width, lorem ipsum starter content; its corner handle resizes the box width and the text
  rewraps). Both run the SAME addPlacedLine transform as the Data tab's add - next fN id,
  real DataField, registry layer, timeline row, Inspector Style tab - so a tool-created
  text is indistinguishable from a panel-created one. `NewPlacedLineSpec` carries the
  optional `at` (design px) and `text` for this. E2E: e2e/text-tools.spec.ts.
- **Keyboard nudging.** Arrows move every selected layer 1 px (Shift = 10). A placed field
  moves as placement (design px, the placement drag's inline preview, ONE `placeLine` apply
  per burst); every other selected non-root layer moves on the keyframe channel — GSAP x/y
  preview, x+y keyframes at the playhead, the drag's semantics key by key — so nudging works
  the same across the whole editor, not just on imports. One undoable apply per burst; Esc
  cancels. Precedence: the timeline's keyframe-set arrows listen in the CAPTURE phase and
  claim the key with preventDefault, so an explicitly selected keyframe set always wins over
  the layer nudge — selecting a diamond usually leaves its layer selected too, and only one
  of the two may act.
- **The corner handle resizes the DESIGN.** On a single selected placed field the corner
  handle edits a text line's `font-size` (`lineFontSize`/`setLineFontSize`) or an image
  slot's box (`slotSize`/`setSlotSize`), in the rules' own idiom — the keyframe scale/rotate
  handles step aside for placed fields, for the same reason the drag places instead of
  keying: a placed field's size is design, not motion.
- **The artwork is its own layer.** `.{prefix}-art` is a registry part (kind `image`, label
  "Artwork"), so the PNG and every text field are independent layers throughout — style and
  animate each on its own. The whole-unit presets stay the wizard's (and the Design row's)
  business; per-layer motion comes from the Inspector.
- **Per-layer presets work here.** `blocks/presetApply.ts`'s single-layer retarget chain now
  falls back to the donor's `-box` tracks — the whole-unit presets animate only the box, and
  that fallback is what lets Fade/Slide/Pop/Blur apply to ONE layer (the artwork, a line)
  from the Inspector's Animations tab.
- **Animations is the Inspector's default view on an imported design** (the artwork brought
  its look with it — what a user comes here for is motion). The switch fires when a
  placed-design template arrives; a manual tab choice afterwards sticks. No Inspector
  restructuring.
- **The Inspector grows a Style tab for a selected placed field** — the layer-specific
  styling surface (the Inspector is where layer-specific things live; animation already
  does). It opens with **Content**: the field's operator label (`setFieldTitle` — the
  registry renames the timeline row and canvas chip from it) and, for text lines, the shown
  text (the canvas inline editor's pattern: definition default + live sample value in one
  commit). Then the design: for a text line font (bundled list or the design font — picking
  a bundled face also ships its @font-face, deduped), size, weight, color, anchor,
  line-height, tracking; for an image slot: its box; for both: numeric X/Y. Every control reads and writes the
  field's OWN rules through `blocks/designLayout.ts` (`lineTextStyle`/`setLineTextStyle` +
  the existing placement/size pairs) — the same rules the canvas gestures use, in the same
  idiom, one undoable apply per edit (the color inputs patch live like the Style panel's
  swatches). The tab is offered only while a placed field is selected; the global Style
  PANEL keeps the :root contract (palette, heading font, scale) and is no longer the wrong
  place to look for per-field text styling.

E2E: the whole roundtrip (wizard handoff → Data-tab add → place → nudge → resize → restyle →
per-layer animate → live sample data → validated export) is pinned in
e2e/import-graphic.spec.ts.

## Deliberately out of scope

Layered/PSD imports, OCR/text detection, Google Sheets, multi-step logic, state-machine
workflows, advanced custom keyframes. Remotion is a separate module and did not influence
any of this.
