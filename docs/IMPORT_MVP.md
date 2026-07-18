# Import Graphic — the manual MVP workflow

The one core workflow this feature makes reliable, end to end:

1. Choose **Import graphic** from the wizard.
2. Import a flat PNG design (e.g. a lower third drawn in Photoshop).
3. Add text fields and place them on the artwork.
4. They are real SPX DataFields, so every playout system can edit them.
5. Choose a whole-graphic **in** animation.
6. Choose a whole-graphic **out** animation.
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

## Positioning: the Text step and the canvas drag

Text is placed in the wizard's **Text** step: X / Y in the artwork's own pixels (measured from
its top-left) plus an anchor edge, with the live preview showing where each line lands. That is
what writes `LineStyle.x/y` → the `#fwN` rule's `left`/`top`.

**After creation, dragging a selected field on the canvas re-places it.** The design tension
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

## Wizard taste decisions (post-MVP pass)

Three calls made after the visual taste pass, all founder-ratified:

- **One CTA on the Design step.** The step body has no button of its own; the wizard footer's
  Next is the step's single forward action and reads **"Add text fields ›"** there — descriptive,
  in the wizard's standard place.
- **The Style step slims to what still applies.** Palette and Font always show (they style the
  text lines). The global **Text size** knob never shows for an imported design — the assembler
  sizes each line from its own `LineStyle.fontSize` (set on the Text step) and reads no
  `--type-scale`. **Graphic size** and **Position** show only for a smaller-than-frame design;
  a frame-sized design covers the canvas as drawn, and scaling or re-anchoring it could only
  push it off its own frame.
- **The box is labelled "Design", not "Panel".** `model/structure.ts` special-cases the
  `imported-design` prefix, so the timeline row, canvas chip, and Inspector all say "Design" —
  the box is the user's artwork, not a generated background panel.

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
- **Keyboard nudging.** Arrows move every selected placed line 1 design px (Shift = 10),
  previewed live through the same inline left/top channel the placement drag uses; the burst
  commits as ONE undoable `placeLine` apply once the keys go quiet, so holding an arrow never
  floods the history. Esc cancels the pending burst.
- **The corner handle resizes the TEXT.** On a single selected placed line the corner handle
  edits the line's `font-size` in its own `#fN` rule (`lineFontSize`/`setLineFontSize`, the
  rule's own idiom) — the keyframe scale/rotate handles step aside for placed lines, for the
  same reason the drag places instead of keying: a placed line's size is design, not motion.
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

E2E: the whole roundtrip (add → place → nudge → resize → per-layer animate → live sample
data → validated export) is pinned in e2e/import-graphic.spec.ts.

## Deliberately out of scope

Layered/PSD imports, OCR/text detection, image data fields, Google Sheets, multi-step
logic, state-machine workflows, advanced custom keyframes. Remotion is a separate module and
did not influence any of this.
