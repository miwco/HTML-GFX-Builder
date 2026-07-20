# src/export - export targets & packaging

Loaded alongside the root CLAUDE.md when working in this directory. Keep it accurate. Exported
packages must be plug-and-play - relative paths, bundled GSAP, no CDN references - and
validation gates every export (root non-negotiables 3 and 4).

- **registry.ts** - 6 targets, each with its own successMessage + ExportContext (the Data
  panel's sampleData rides along so serverless targets can bake it).
- **slug.ts** - shared slug helper (lives here to avoid an import cycle).
- **selfContained.ts** - single-file composer: inline CSS/GSAP/JS/assets/FONTS + extra body
  scripts. ASYNC, because the fonts are fetched to be embedded.
- **bundledFonts.ts** - the one place that knows how a builder font leaves the app. Generated CSS
  always says `url("fonts/<file>")`; there are exactly two ways to honour that, and the package
  shape picks one. A FOLDER package ships the file beside the HTML (common.ts
  `addReferencedFonts`); a SINGLE-FILE package has no sibling to ship to, so `inlineBundledFonts`
  embeds the bytes as a data: URL. Call it AFTER inlineAssetRefs - an imported font is an asset
  and is already substituted by then, so whatever still matches is builder-bundled. A font that
  cannot be fetched THROWS here (the folder writer only skips): nothing downstream fails when a
  face is missing, because `font-display: swap` just paints the fallback, so the graphic would
  play out in the wrong typeface with no error anywhere. That was a real shipped bug in all three
  single-file targets. Pinned by exports.spec.ts, which opens each one alone over `file://` -
  setContent() and srcdoc both inherit the dev server's base URL and hide exactly this class of
  defect.
- **targets/spxStarter.ts** - the one SPX export = spxTarget, id 'spx'; + buildStarterInto,
  reused by packets.
- **targets/htmlOverlay.ts** - OBS/vMix browser source: an autoplay block fills fields from baked
  sampleData -> definition defaults, then play(). An auto-out `out` = N ms setting rides
  along: the block measures the entrance from a paused throwaway timeline and schedules
  stop() at entrance + delay (the bundled control panel's Stop still works sooner). Receiver
  + controlpanel.html bundled.
- **targets/h2r.ts** - H2R Custom HTML: GDD block from DataFields + play()-toggle shim.
- **targets/casparcg.ts** - selfContained + JSON/XML data shim.
- **targets/ograf.ts** - EBU OGraf v1: manifest from DataFields + graphic.mjs Web Component;
  AMD-guarded gsap loader. `addOgrafPackage` is reused by **targets/liveos.ts** - LiveOS's HTML5
  graphics engine is OGraf-compliant, so that target is the same package with NetOn.Live install
  steps in the README.
- **packetExport.ts** - whole packet -> one zip, a Starter folder per graphic.
- **common.ts** - addSharedAssets, addReferencedFonts, injectControlReceiver + addControlPanel,
  FONT_LICENSES.md.

## Packaging conventions

- Asset paths: uploads land at `images/<file>` (fonts at `fonts/<file>`); the export zip wraps
  everything in one project folder, so extracting into a templates folder yields
  `[TemplatesFolder]/<project>/index.html` + `<project>/images/<file>` - the layout SPX and
  CasparCG expect. Both of those exporters use `zip.folder(slug(name))`.
- Uploads are base64 data URLs in `template.assets[]`; the preview inlines them, the exporter
  decodes them to real files. The Assets panel may nest ONE user folder inside a bucket
  (`images/logos/<file>`) - every writer zips `asset.path` verbatim, so nesting flows through.
- Lottie: a template that uses a Lottie animation (detector `assets/lottieSupport.ts`) ships
  the bundled player - `js/lottie.min.js` in folder packages (addSharedAssets), inlined in
  single-file targets, `lib/lottie.min.js` + an `ensureLottie()` loader in OGraf packages,
  where the embedded TEMPLATE_HTML also gets its `.json` assets inlined as data: URLs (an
  embedded string has no base URL to resolve a relative path against). The generated
  bootstrap decodes data: URLs inline (atob, no fetch), so single-file exports play from
  file:// too; the folder starter keeps the real `lottie/<file>.json` and plays over http
  (SPX's normal serving mode).
