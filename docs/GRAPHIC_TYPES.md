# Graphic types

A **type** says what a graphic IS. A **design** says what it looks like. The catalog is
types × designs, and Phase 3 turns that second axis into themes without the first one moving.

Companion docs: `STATE_MACHINE_SCHEMA.md` (the machine a type declares),
`DESIGN_LANGUAGE.md` (the taste bar a design is judged against).

---

## 1. What a type declares

```ts
GraphicType {
  id, name, description, frequency?
  structure: { prefix, category, parts[] }   // the DOM contract, named logically
  fields:    TypeField[]                     // logical keys, compiled to f0..fN
  machine:   TypeMachine                     // groups, branches, default-path events
  controls:  TypeControlEvent[]              // what Phase 5 turns into buttons
  capabilities                               // the wizard's chips (maxLines, logo, presets)
  designs:   TypeDesign[]                    // one per look — Phase 3's themes axis
}
```

Everything a type knows is independent of styling. That is the whole point: the node editor
(Phase 4) edits any type's graph without knowing its CSS, and the control generator (Phase 5)
builds a page from `controls` and `fields` without knowing either.

**A type is a declaration, not a second way to build a template.** `variantsFromType` compiles
one into ordinary `TemplateVariant`s that go through the category's existing assembler, so
`variant.create(options) -> SpxTemplate` stays the single contract the wizard, the AI, the
sweeps and every spec already speak.

---

## 2. The rule that keeps types small

> **Persist a machine only when the derived one is wrong.**

`deriveMachine` already gives every template a correct one-group linear machine. A type with
no branches, no parallel groups and no event overrides compiles to **no `machine` key**, and
its template comes out byte-identical to what it emitted before.

Seven of the twelve shipped types are in that class. That is the design working, not a
shortcut — and it is what makes promoting an existing variant safe.

---

## 3. Fields

`TypeField` names fields **logically** (`selectedAnswer`), never `fN`. Ids are positional and
assigned at compile time, so inserting a field renumbers nothing the type references.

`role` routes a field into the plumbing that already exists for its shape:

| role | means | compiles |
|---|---|---|
| `line` | a visible text line | FIRST — `fieldsFromOptions` numbers lines `f0..n-1` |
| `data` | an operator value with its own element (a score, a rows source) | in order |
| `hidden` | input-only, in a `display:none` holder (a countdown's minutes) | in order |
| `logo` | the image slot | LAST — `applyLogoSlot` derives its id from the field count |

Those two ordering rules are enforced at compile time with a throw, because getting them wrong
desyncs the ids from the assembler that emits them, and a runtime surprise is worse than a
build failure.

Fields compile to `SpxField`, and the existing adapter turns those into the `FieldDescriptor`
every editing surface renders. One direction only: declaring descriptors would need a second
compiler that could disagree with the first.

---

## 4. The machine

The main group's **default path is derived, never declared**. Its length must equal the step
count, and the step count depends on the preset, the line count and the steps flag — so any
literal path a type wrote down would be wrong for some options. `compileMachine` takes
`deriveMachine`'s answer (which is also what the runtime derives, so editor and playout agree
by construction) and layers the type's declarations on top:

- `pathEvents[i]` renames the arrow from waypoint *i* to *i+1*.
- `exitOnNext` authors the arrow into the exit, so `next` alone takes the graphic off air.
  Default off = exact parity with a graphic that has no machine.
- `branches` are off-path states; `timeline: null` means pose-only.
- `parallel` groups are declared literally — nothing derives them.

Waypoints are addressed by position (`{ waypoint: 0 }`, `-1` = the exit) because a type cannot
know the state ids `deriveMachine` will fold out of the step names.

Timelines name **logical parts**, not selectors, and declare ease by ROLE (`'in'` / `'out'`)
rather than as a curve, so a branch moves like the graphic it belongs to whatever the wizard
picked. `reveals`/`hides` are absent from `TypeTimeline` by construction — they are the ordered
walk's mechanics and are invalid off it, so a type simply cannot write one.

### The one trap worth knowing

**A timer never arms on a timeline that never ends.** A timer transition is armed by a call
scheduled at the from-state's entry timeline end; a timeline holding a `repeat: -1` loop or a
measured `dynamics` builder never reaches that point, so the state silently never advances.
Verified directly against GSAP, and now a `validateMachine` ERROR rather than a discovery.

This is why the ticker type is a one-item rotator and not the classic marquee, and why it ships
its own `ticker-rotate` preset: the machine is the cycle, so the entrance has to finish.

---

## 5. Designs and promotion

A `TypeDesign` builds the template — normally by delegating to the existing catalog variant it
promotes. `attachMachine` then puts the compiled machine on afterwards, which is the one
mechanism for every type: it needs nothing exported from any category, and a type with no
machine gets its template back untouched.

**Promotion is id-preserving.** `mergeCatalog` replaces a hand-written variant by id and in
place, so a promoted design keeps its position in the browse grid and its identity in the AI's
variant enum, saved preferences and the sweeps. `e2e/graphic-types.spec.ts` pins that promotion
changes nothing but the machine: same html, same css, same JS outside the marked region.

`attachMachine` **throws** on an off-shape compiled machine, deliberately unlike
`convertToDataRegion`'s quiet degrade. That degrades because its input may be hand-written;
here the input is our own declaration compiled by our own code, and degrading would ship a
graphic whose control page has buttons that do nothing. Every catalog variant is created by the
bench spec, so a broken type is a red build.

### What makes a design promotable — six gates, not one

A compiled variant takes its TYPE's declarations, so promotion can change things about a design
that have nothing to do with which type it belongs to. "The required parts resolve" is the
weakest of the checks and the only obvious one. All six have to hold:

| gate | what fails | caught by |
|---|---|---|
| **parts** | a required selector is absent | `attachMachine` / `missingParts` |
| **fields** | the design emits a different field COUNT than the type declares | `graphic-types.spec.ts` |
| **machine + motion** | a timer transition on a design whose timeline never ends | `validateMachine` |
| **capabilities** | design and type disagree on any offered default | `graphic-types.spec.ts` |
| **samples** | the design's starting text differs from the type's field values | nothing — read it |
| **semantics** | the fields line up but MEAN different things | nothing — judgement |

The last three are the dangerous ones, and the last two are not mechanically checkable at all.
Measured on the first pass: 24 cells looked promotable on parts alone, 8 actually were.

#### The capabilities gate is the whole offered default set, not just `logo` and `maxLines`

`animationPresets` is a capability like the other two, and the loudest of them — **`[0]` is the
default a new project is created with**, and the list is exactly what the wizard, the Inspector
and the AI's legal-preset check offer. A type declaring one list for all its designs therefore
rewrites the motion of every design it promotes.

Measured across the twenty shipped promotions: **six drifted their default entrance and four
lost presets outright.** bug02, the house sponsor bug, opened with a plain fade instead of rising
into its corner. card02's `snap-stinger` — the preset its painted lean exists to survive — stopped
being offered anywhere. sb02 "Quiet Score", a *minimal* design, defaulted to a sport slam purely
because its type's other design is a sport one.

**Why nothing caught it, which is the durable part.** `create({})` resolves the preset from the
design's OWN variant record, not from the compiled one, so the emitted code never moves — and
neither does `catalog-baseline.json`, nor the render fingerprint, nor the byte-identity check
that exists precisely to police promotion. The drift lives entirely in what the UI offers. **A
baseline taken from output cannot see a gate that only changes input**, and this is the second
gate in this table with that shape (`samples` is the first).

`TypeDesign.animationPresets` is the escape hatch, exactly mirroring `TypeDesign.samples`: the
design keeps the vocabulary it was authored around, the type still declares the default for
designs that do not care. Like samples and unlike theme-token overrides, entries here are **not
conformance debt** — a sport slab and a glass panel are *supposed* to enter differently.

**`defaultZone` is the same story**, and it drifted on four designs. A type says a sponsor bug is
"parked in a corner"; *which* corner is a drawing decision, and bug01's frosted tile is authored
for the top-right safe area in its own file's opening comment. `TypeDesign.defaultZone` overrides
it the same way. (`palette` and `fontId` were already per-design — qz01's entry had simply
transcribed the sport family's volt/oswald over the board's own royal/archivo.)

The rule that falls out, and the one the spec now enforces: **a type may WIDEN what a design
offers — a longer preset list, more lines — but it may never change that design's own default or
take something away.**

Two worked examples, both real:
- `lt01` into **social-bug** passed every shape check — that type shares the lower-third prefix,
  category, parts *and* field count, and differs only in what the fields mean. It replaced the
  catalog's default lower third with a handle bug and broke about forty specs.
- `card04` into **title-card** would have offered five lines to a design built for three. It
  broke nothing, so no test objected; it was found by comparing declared capabilities.

`TypeDesign.samples` (by logical field key) is the escape hatch for the samples gate: a design
keeps the text it was written around while the type still declares defaults for anything that
does not care. **These are not conformance debt.** A theme-token override records a design
disagreeing with its family and that map is meant to shrink; a sample is *supposed* to suit its
design. Only the wizard's suggested lines are affected — the emitted html, css and js are
identical either way, which is why no baseline moves and why a rendered check is the only thing
that sees it.

---

## 6. The twelve types

Counts are how many of the 60 reference formats in `live_format_graphics_needs.xlsx` ask for
that graphic. Every type now ships in all four style families; the design named here is the
noacg (or, where the house has none, the flagship) look, and its machine is the same whichever
family a cell is in.

| Type | Freq | Flagship design | Machine |
|---|---|---|---|
| Lower third | 52 | lt11 House Strap | – |
| Sponsor bug | 37 | bug02 House Clock | – |
| Countdown | 30 | gt05 House Countdown | parallel `clock` (pause/resume) |
| Topic card | 29 | card06 House Topic | – |
| Title card | 23 | card05 House Title | – |
| Agenda | 22 | ig08 House Schedule | – |
| Social handle | 17 | lt14 House Handle | – |
| Poll result | 13 | ig11 House Poll | – |
| Holding screen | 9 | ss04 House Hold | parallel `clock` |
| Ticker | 8 | tk07 House Rotator | timer cycle + pause/resume/skip |
| Scoreboard | 5 | sb03 House Score | parallel `flag` / `clock` / `result` |
| Quiz board | — | qz02 House Quiz | branches `selected` / `locked` |

The last three earn their place by what they prove rather than by frequency: parallel groups,
timer-driven motion, and the far end of the model.

### The matrix is full — and how it filled

All 48 cells (12 types × noacg / glass / sport / minimal) are filled. The route there is worth
recording, because it was not the one the first pass predicted:

- **The promotion well ran dry fast.** 24 cells looked promotable on parts alone; 8 actually were
  on the first pass, and after promoting the single design that cleared all six gates on the
  second (lt05 into the sport lower third), **zero** promotable designs remained. Every other cell
  is a DESIGNED variant. "The parts resolve" is the weakest evidence a design belongs to a type,
  and in a mature catalog it is almost always the *only* thing that resolves.
- **Designed, not promoted, is the norm — not a failure.** A cell with no promotable candidate is
  a cell that needs a design, and 30 of them got one, each named against its lower-third sibling
  and built from its family's shape tokens rather than improvised. A designed variant is a
  first-class fill; a promotion is just the shortcut available when an existing design already *is*
  the graphic.
- **Type-uniform runtimes belong in one place.** When every design of a type renders its content
  the same way — a schedule board's rows, a poll's bars — that rebuild is not per-design and does
  not belong copied into each. It lifts into a shared helper (`infographics/dataRuntimes.ts`), and
  the designs that used to inline it emit byte-identical output afterwards, so the baseline proves
  the extraction changed nothing.
- **A rotator is a preset, not a redesign.** The three ticker cells are strips with ordinary
  items; the shared ticker runtime turns any design into a rotator when the rotate preset is
  chosen (the track stops travelling and wraps, the separator hides). The design work was the
  strip, not the motion.

### Which acceptance criterion each proves

- **Simplicity guard** — lower third: one group, three states, no machine key at all.
- **Scorebug** — scoreboard: scores are data that move no pointer; flag, clock and result are
  three 2-state groups instead of eight combined states; simultaneous events resolve in order.
- **Ticker** — ticker: items cycle with no operator input, and pause holds them.
- **Millionaire** — quiz board: one `selected` state plus a `selectedAnswer` field (never one
  state per answer); after `lock` there is no `select` arrow, so a late pick is dropped with its
  payload rather than refused by a condition.
- **Compatibility** — every type: `update`/`play`/`next`/`stop` alone still walk the default
  path, which is what a playout server has.

---

## 7. Adding a type

1. Declare it in `src/templates/types/<id>.ts` — structure, fields, machine, controls,
   capabilities, designs.
2. Register it in `types/registry.ts`.
3. `e2e/graphic-types.spec.ts` then holds it to the bar automatically: it must parse, clear the
   export gate, resolve every part it promised, keep `settings.steps` derived, and declare only
   control events its machine actually authors.

If it needs no branches or parallel groups, leave `machine: {}` — the derived one is right.
