# Theme defaults review

A recommendation for the human on the four families' token defaults in `src/model/themeTokens.ts`.

> **STATUS 2026-07-21: APPLIED, as recommended and user-approved.** The four sport changes
> below landed (panelShadow encoded as lt07's hard offset, which made lt07's own override a
> deletable no-op too); the two keep-as-is decisions held, with the three 18px glass overrides
> (lt08/card03/ig04) conformed down to 16px; the literal-drift holdouts were routed through
> their tokens and the factory now greps the literal forms; the logo chip reads
> `var(--panel-radius)`. Overrides equal to the new defaults were deleted. The render baseline
> was re-recorded with the diff confirmed against the keeper lists below. Still open: the
> `labelColor` / `displayTracking` modelling questions (per-design vs family token) — those are
> re-modelling, not re-valuing, and were deliberately not part of this application.

The remainder of this document is the review as written before the decision, kept because the
keeper lists and the reasoning are the audit trail for the re-record. The point of the doc is to make the override map's shape legible and to say, per
token, whether an override reads as drift (an accident worth deleting) or intent (a design that
genuinely needs a different value), with the exact render-baseline cost of conforming it.

## How this was measured

Every number is derived deterministically, not eyeballed: each of the **79 catalog variants** is
created and its emitted `:root` compared token-by-token against its family default. That captures
the **resolved** override — the value that actually renders — for exactly the tokens a design reads.
**43 of 79 variants carry at least one override.**

Measured on the full 48-cell matrix. Worth noting up front: of the ~30 designs added to fill the
matrix, **only `ss04` carries a token override at all** (`labelTracking` 0.24em). The new work is
essentially conformance-clean, so everything below is pre-existing debt, not something the fill
introduced.

**The metric has one structural blind spot.** It only sees tokens routed through the `tokens:` map.
A design that hand-types a value the token was meant to carry shows up as *conformant* — see
§"The blind spot".

---

## Summary — the twelve tokens

| token | overrides | verdict |
|---|---|---|
| `fontLabel` | 0 | clean; the model is right |
| `accentGlow` | 0 in the map, **literals elsewhere** | blind-spot drift (noacg) |
| `panelBlur` | 1 (+1 literal) | drift |
| `panelKeyline` | 1 | drift (ig06) |
| `accentInk` | 4 | intent in motive, the **default** is wrong |
| `panelRadius` | 7 | 3 drift (glass 18px), 2 intent (pills), 2 borderline |
| `panelShadow` | 10 | mostly intent; the sport default serves nobody |
| `accentWeight` | 10 | see below — the fill *settled* this one |
| `displayWeight` | 13 | sport default should be 800 |
| `displayTracking` | 8 | sport default is wrong; token may be over-modelled |
| `labelColor` | 15 | **mis-modelled** — not a family property |
| `labelTracking` | 31 | two defaults wrong, two spreads legitimate |

**The render-baseline rule for every proposal:** changing a family default moves the render
fingerprint of every same-family design that *reads* the token and does *not* already override it
(the "keepers"). Deleting an override that equals the new default is a no-op. Each recommendation
states: *N keepers move → re-record those; M overrides become deletable.*

---

## Four defaults worth changing (strongest first)

### 1. `labelTracking` · sport: `0.08em` → `0.14em` — recommend

Sport reads it 16×, overrides 7×, **all seven move up** (0.10, 0.14×3, 0.15, 0.16×2); not one moves
down. The `themeTokens.ts` header notes 0.08 was a correction from a §8 misread — it found the right
element (a label, not a display line) but landed on a value nine keepers tolerate and seven reject.

- **Render cost:** 9 sport keepers move 0.08→0.14 (re-record). lt07/ig03/vs02 (already 0.14) become
  deletable no-ops; ss02/vs01 (0.16), gt02 (0.10), gt04 (0.15) stay.

### 2. `displayWeight` · sport: `700` → `800` — recommend

Sport reads it 14×, overrides 5×, **every one goes up** (800×3, 900×2). §8 gives sport
"condensed/heavy caps." 700 is a floor sport keeps climbing off.

- **Render cost:** 9 sport keepers move 700→800 (re-record). gt03/vs01/qz01 (800) become deletable;
  lt06/ss02 (900) stay.

### 3. `displayTracking` · sport: `0.02em` → `-0.01em` — recommend, with a question

Sport reads it 14×, overrides 5×; four of the five adopt `-0.01em` — the value the *other three
families* already use — and only vs01 opens up (0.03). §8's "sport opens up and shouts" is about
labels and condensed caps, not display tracking.

- **Render cost:** 9 sport keepers move (re-record). lt06/ss02/vs02 become deletable; qz01 (0.01)
  and vs01 (0.03) stay.
- **The question:** after this, all four families sit at `-0.01em` and the token is a constant.
  Worth asking whether it should be a family token at all. (ig07's `0.12em` — 13× the value, a
  wide-tracked caps line — shows it already covers two typographic roles.)

### 4. `panelShadow` · sport: `NO_SHADOW` → a hard-offset slab — recommend the *direction*, not a value

Sport reads it 5×, overrides **5×** — every sport reader paints its own shadow, so the default
serves nobody. The encoded `NO_SHADOW` came from sb01/qz01, which don't read the token at all.

- **Render cost: zero fingerprints move** (0 keepers). Safe, future-facing.
- **The catch:** the five sport shadows are genuinely per-design (vs01's accent halo, lt07's
  `0 10px 0` hard offset, gt03/gt04's four-part sticker stacks, vs02's drop). No single value fits
  them, so encode a hard-offset slab as the *starting point* for new sport designs and accept that
  the loud ones keep overriding.

---

## Two the fill settled — do **not** change

### `accentWeight` · minimal: keep `3px`

An earlier read of this called the minimal default a coin-flip and leaned toward 2px. On the full
matrix that is **no longer true**: minimal reads it 19×, overrides 8× (7 to 2px, lt03 to 4px), so
**11 keepers hold 3px against 7 dissenters**. The default is now the clear majority and the seven
2px entries read as a hairline cluster, not a mandate. Changing it would move 11 fingerprints to
satisfy 7. **Leave 3px**; if anything, conform the seven.

### `panelRadius` · glass: keep `16px`, conform the three 18px down

Glass reads it 18×, overrides 6× — and the six are not a bloc: lt09/tk03 are `999px` pills
(load-bearing shape, intent), lt10 is `14px`, and only **lt08/card03/ig04 are the identical
`18px`**. Three files, one value, no comment: copy-paste drift. But **12 keepers actively use
16px**, so 16 is the family's real value.

- *Conform the three down to 16px* (delete their overrides): **zero keeper fingerprints move**,
  three variants re-render. Cheaper and safer.
- *Move the default to 18px:* 12 keepers move. Not worth it.

---

## Two tokens are mis-modelled, not mis-valued

### `labelColor` — not a family property

15 overrides, and **every one adopts another family's default value**: 6 minimal designs want
`--accent` (minimal's default is `--text-dim`); 4 sport designs want `--text-dim` (sport's is
`--text-color`); glass's `--accent` is rejected by 4 of its 13 readers in two directions. Whether a
kicker is accent-coloured, dimmed, or primary is a **role decision** that varies design-by-design
inside every family. Re-picking the four values will not get this below ~10 overrides.

- **Recommendation:** accept it as per-design and stop counting it as debt, or split it into two
  tokens (a structural label colour and an accent-kicker treatment). Do not re-value it.

### `displayTracking` — collapses to a constant (see proposal 3)

---

## The blind spot: literal drift the override map cannot see

`--accent-glow` reports **0 overrides**, yet the glow is hand-typed as a literal in several noacg
designs — `bug02` (`12px/60%`), `lt12` (`26px/45%`), `tk05` (`26px/40%`), `tk06` (`24px/40%`) — each
a near-miss of the family value (`22px/60%`), none commented as deliberate. `lt12` also hand-types
`backdrop-filter: blur(8px)` — *exactly* the noacg default — so its generated `:root` never declares
`--panel-blur` at all and the Style panel cannot reach that knob for that design.

The token now has **8 readers** (the matrix fill added several that use it properly), so the literal
holdouts are a shrinking minority — worth conforming rather than tolerating.

- **Recommendation:** route these through their tokens, and have the nightly sweep grep the literal
  forms of every token so the conformance metric stops reporting them green. (vs01/vs02's accent
  halos are a different, intentional sport effect — leave them.)

---

## One correctness issue found in passing (not token debt)

`src/templates/shared/logoSlot.ts:48` hardcodes `border-radius: calc(12px * var(--scale))` on the
injected logo chip for **every** family. On a sport or noacg panel (family radius `0`) that puts a
rounded chip inside a hard-cornered panel. A mild on-air inconsistency; fixing it moves the render
baseline of every variant using the shared logo slot, so it is noted rather than changed. If
conformed, the chip should read `var(--panel-radius)`.

---

## What I did not touch, and why

`FAMILY_TOKENS` and every design's override map are unchanged. This document recommends; the
family-defaults decision is the human's, because moving a default re-renders shipped catalog designs
and the taste call on 1-2px and tracking deltas wants a human eye on the actual pixels, not a count.
When a default does change, re-record `e2e/catalog-render-baseline.json` and confirm the diff moves
**only** the keepers this doc names — any other variant moving is a second, unintended change.
