# src/model - the data layer

Loaded alongside the root CLAUDE.md when working in this directory. Keep it accurate.

- **types.ts** - SpxTemplate (html/css/js + parsed definition - the canonical unit), Resolution,
  ASPECTS, AssetFile, DEFAULT_SETTINGS.
- **spxDefinition.ts** - parse/serialize the `window.SPXGCTemplateDefinition` block inside the
  template HTML.
- **structure.ts** - detectPrefix/countLines + getTemplateParts, the TemplatePart registry: THE
  shared element-identity contract. DOM-derived `{selector, kind, label, channel}`, single-token
  selectors only. Timeline labels, canvas selection, and step assignment must all name elements
  through it.
- **wizard.ts** - categories, variants, WizardOptions, palettes.
- **fonts.ts** - bundled OFL fonts registry + CustomFont import helpers.
- **brand.ts** - ProjectBrand save/load (localStorage 'spx-gfx-brand'), captured on every wizard
  Create.
- **packets.ts** - packet manager data layer: graphics collections 'spx-gfx-packets' + brand
  looks 'spx-gfx-looks' + captureLookFromTemplate/applyLookToTemplate.
- **easings.ts** - the easing catalog; the doctrine is in src/templates/CLAUDE.md +
  DESIGN_LANGUAGE §4.
- **defaultTemplate.ts** - the fallback template.
- **project.ts** - the current working project, autosaved to localStorage 'spx-gfx-project' so a
  reload restores the last graphic. One slot: creating a new graphic overwrites it (durable saves
  go to Packets). Soft-delete tombstone for cloud-sync parity.
- **importTemplate.ts** - import an EXISTING template (.html file or SPX-style zip) and split it
  into the editor's three panes; foreign templates rarely follow the house contracts, so the
  Style/Motion panels degrade gracefully, validation shows what's missing, and the AI panel's
  "Make SPX-ready" is the guided fix path.
- **layout.ts** - desktop layout prefs (localStorage 'spx-gfx-layout'): 'code-left' |
  'preview-top' + splitter ratios; the mobile layout ignores it.
- **prefs.ts** - small device-level workflow defaults (localStorage 'spx-gfx-prefs'):
  defaultExportTarget, timelineCollapsed. Not synced; keep it tiny.
- **id.ts** - uuid() that ALWAYS returns a valid RFC-4122 v4, even where crypto.randomUUID is
  undefined (plain-HTTP LAN hosts, CasparCG's CEF). Record ids must be real UUIDs: the cloud
  `documents.id` column is a uuid PK, and a non-UUID id would be rejected by Postgres and poison
  sync.
