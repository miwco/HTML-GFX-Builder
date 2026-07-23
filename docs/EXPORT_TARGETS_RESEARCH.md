# Export targets — platform research (2026-07-08)

Where NoaCG Studio graphics can run, what each platform ingests, and what (if anything) we
must build. Guiding rule from GOALS: **SPX stays the canonical internal format; every target
is an export adapter off the same source.** The universal fallback is already shipped: any
tool that renders a browser source runs the **HTML overlay** target.

## Shipped targets

| Target | Path | Status |
|---|---|---|
| OBS Studio | HTML overlay (Browser Source, autoplay + control panel/dock) | ✅ shipped 2026-07-08 |
| vMix | HTML overlay (Web Browser input) | ✅ shipped 2026-07-08 |
| SPX Graphics | Starter + Advanced/Pack exports (the strictest validation target) | ✅ |
| CasparCG | Single self-contained .html + JSON/XML data shim | ✅ |
| OGraf (EBU) | Manifest + graphic.mjs Web Component | ✅ |
| LiveOS (NetOn.Live) | The OGraf package + LiveOS install README (engine is OGraf-compliant) | ✅ shipped 2026-07-09 |
| H2R Graphics | Self-contained .html + embedded GDD block + play() toggle shim | ✅ shipped 2026-07-08, live-confirmed in a real H2R install |

## Researched targets

### H2R Graphics — ✅ SHIPPED 2026-07-08 (research kept for the contract details)

H2R v3 has a **Custom HTML graphic type**: import an `.html` file; H2R calls global
**`play()`** on air/off air and **`update(json)`** with a JSON *string* of changed values —
**exactly the contract our templates already implement**. Editable fields are declared via a
**GDD block** (`<script type="application/json+gdd">`, SuperflyTV's Graphics Data Definition)
whose properties bind to element ids — the same id convention we use (`fN`).

As built (`export/targets/h2r.ts`): the self-contained overlay composer, a GDD `<script>`
generated from the SPX DataFields, and a marked toggle shim converting H2R's play()-both-ways
convention into the template's play()/stop() pair. Two real-install findings worth keeping:
the GDD `<script>` needs `name="graphics-data-definition"` or H2R silently shows no editable
fields, and the `file-path` gddType is unrecognized (filelist maps to a plain path input).
Both are E2E-pinned. Live-confirmed in the real H2R app (2026-07-08): fields render, edits work.
Sources: h2r.graphics/docs/graphics/custom-html, h2r.graphics/posts/20260116-new-in-v3.

### LiveOS (NetOn.Live) — ✅ SHIPPED 2026-07-09 via OGraf

NetOn.Live confirms the **LiveOS HTML5 graphics engine is OGraf-compliant — any OGraf HTML
template can be directly imported and played out in LiveOS** (NAB 2026 announcements). The
shipped target (`targets/liveos.ts`) therefore reuses the OGraf package builder
(`addOgrafPackage` in `targets/ograf.ts`) byte-for-byte and adds a LiveOS-specific README +
success message; the E2E pins the two targets to the identical graphic.mjs/manifest so they
can never drift. The alternative ingest path — Loopic's legacy `templates.json` export into
a LiveOS templates folder — remains publicly undocumented (checked 2026-07-09) and is NOT
built; revisit only if a real LiveOS install rejects the OGraf package. Still open: verify
against a live LiveOS instance/trial. Sources: docs.loopic.io (LiveOS integration),
NetOn.Live NAB 2026 posts ("LiveOS OGraf HTML5 graphics").

### Singular.Live, Flowics (Vizrt), uno by Chyron — NOT ingest targets

These are closed cloud composers: graphics are authored in THEIR editor and there is no
supported path to import third-party HTML templates (confidence: high for Singular/Flowics,
based on their docs positioning; re-check yearly). Interop happens at the *production* layer
instead — a NoaCG HTML overlay can run beside their output in the same switcher/encoder.
Verdict: out of scope as export targets; don't build speculative adapters.

## Doctrine for adding a target

1. Prefer adapters over new formats: compose from `selfContained.ts` / the SPX package
   builders; bake data via `ExportContext.sampleData` when the platform has no operator.
2. A target ships only with (a) a validation story, (b) an E2E that loads/drives the export
   like the platform would, and (c) a README in the zip with exact platform setup steps.
3. Field definitions travel with the graphic (SPX definition today, GDD/OGraf schema where
   the platform reads it) — never a separate hand-maintained mapping.
