# NoaCG Studio — Brand Manual

**v1.0 · July 2026**

A modern, premium broadcast graphics builder. 

---

## 1. The idea

The identity is built from the product itself. The mark is **three descending
bars** — the shape of a lower-third graphic — that also read as the **N** of
NoaCG. The tool *is* the logo.

The system is **dark by default** (a broadcast control-room / editor feel) with
a single **amber** accent used as an "on-air" cue, lifted by a **restrained
glow**. Premium, technical, calm — never neon, never busy.

---



## 2. Logo

**Primary lockup:** the bar mark + `NoaCG` wordmark with `STUDIO` set in mono
beneath. `Noa` is bold (700), `CG` is regular (400) in muted grey.

Approved variations (see `1-Brand-System.html`, section 01):

- **Primary / dark** — default, on dark backgrounds.
- **Inverted** — dark mark + wordmark on an amber field.
- **Mono / knockout** — all-white, for single-color or low-contrast placements.
- **Stacked** — mark above wordmark, for square/centered spaces.
- **Wordmark only** — when the mark is already present nearby.
- **Mark only** — app icon, favicon, avatar, corner bug.



### Construction & clear space

- Unit = **1x** = the height of one bar.
- Bar height `1x`, gap between bars `0.5x`, corner radius `0.2x`.
- Bar widths: **100% / 66% / 40%** (top to bottom).
- **Clear space** = `1x` on all sides. Keep it clear of other elements.



### Minimum size

- Mark: **16px**. · Full lockup: **96px** wide.

---



## 3. Color


| Role               | Name  | Hex       |
| ------------------ | ----- | --------- |
| Base canvas        | Void  | `#0A0C10` |
| Surfaces / panels  | Panel | `#141922` |
| Primary accent     | Amber | `#F6A623` |
| Glow / hover       | Glow  | `#FFC65C` |
| Live / record only | Rec   | `#E5484D` |
| Text / knockout    | Paper | `#E8EDF2` |


**Rules**

- Dark is the default ground. Amber is an **accent**, never large fields of it.
- **Rec red** is reserved for live/record status — nothing else.
- Maintain AA contrast for text (Paper on Void passes comfortably).

---



## 4. Typography

- **Space Grotesk** — display, UI, wordmark. Weights 400 / 500 / 600 / 700.
- **JetBrains Mono** — labels, data, timecode, technical tags. 400 / 500 / 700.

**Scale**

- Display 64 / 700 · H1 40 / 600 · H2 30 / 600
- Body 16 / 400 (line-height 1.5)
- Mono label 12, letter-spacing `.18em`, UPPERCASE

Both are free (Google Fonts / SIL Open Font License).

---



## 5. The glow (signature)

- Apply glow to the **amber only**, on a **dark** field.
- Blur ≈ **1.5×** the element size, opacity **≤ 50%**.
- **Never** glow on light backgrounds, never oversized halos, never on the
paper/mono bars. When in doubt, less.

---



## 6. Graphics templates (on air)

Ready-to-run overlays live in `/overlays/` — each is **1920×1080 with a
transparent background**, built to the rules above.


| File                         | Use                                  |
| ---------------------------- | ------------------------------------ |
| `lower-third-name.html`      | Name / title                         |
| `lower-third-breaking.html`  | Breaking topic banner + LIVE badge   |
| `lower-third-interview.html` | Interview: name, org, location       |
| `bug-clock.html`             | Corner logo bug + live-ticking clock |
| `ticker-news.html`           | Animated news crawl + category chip  |
| `ticker-markets.html`        | Markets strip                        |
| `title-card-fullframe.html`  | Full-frame title card (opaque)       |


**How to use:** drop any file into vMix / OBS / CasparCG / Singular as a
**browser source** at 1920×1080. The alpha composites straight over video.
Edit the text directly in the HTML. Fonts load from Google Fonts, so the
playout machine needs internet on first load (ask for font-embedded offline
versions if needed).

---



## 7. Misuse

Don't: stretch or squash the mark · recolor the bars · glow on light
backgrounds · rotate the mark · add outlines or drop shadows to the wordmark ·
place the logo on busy imagery without the dark scrim.

---



## What's in this kit

- `1-Brand-System.html` — the full visual brand system (open in any browser)
- `2-Icons.html` — app icon & favicon board
- `3-Templates.html` — on-air template gallery
- `assets/icons/` — 17 ready PNGs (app icons 16–1024, amber alt, transparent
mark, favicons)
- `overlays/` — 7 transparent HTML broadcast overlays + README
- `BRAND-MANUAL.md` — this file

*Questions or changes — the source design files can be re-exported at any time.*