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
- **wizard.ts** - categories, variants, WizardOptions, palettes. A variant declares its
  CAPABILITIES - `maxLines` (1-5 line capacity), `logo: 'none' | 'optional' | 'built-in'`,
  `animationPresets` - which drive the wizard's Fields/Animation options AND the Template
  step's filter chips, so a new family inherits both automatically. Sizing is two knobs:
  `sizeScale` (--scale, whole graphic) and `typeScale` (--type-scale, text only).
- **fonts.ts** - bundled OFL fonts registry + CustomFont import helpers.
- **themeTokens.ts** - the SHAPE half of the `:root` style contract, and DESIGN_LANGUAGE §8's
  family table in code: panel blur/radius/shadow/keyline, accent weight/glow/ink, the label
  face + tracking + colour, display weight + tracking, with values for all four `StyleTag`
  families. `resolveTokens(family, ...overrides)` layers a design's disagreements over its
  family; **that override map is conformance debt, and its size is the metric** (§8's own rule
  is "reuse the exact token values, don't improvise per category"). `tokenVarsCss` emits ONLY
  the tokens the consuming stylesheet actually reads - same no-dead-knobs doctrine as the
  imported design's missing `--type-scale`. Values are complete CSS values (`calc(18px *
  var(--scale))`, `none`, `50%`), never bare numbers, so one token covers a scaled length, a
  keyword and a percentage without the consuming rule knowing which it got. Shadow-slot
  neutral is `NO_SHADOW` (`0 0 0 0 transparent`), because these compose into comma-separated
  `box-shadow` lists and `none, none` is invalid CSS. Deliberately absent: density (unmeasured,
  genuinely per-design), the sport skew (`skewX(0deg)` is not inert - it makes a stacking
  context), and motion feel (it lives in the NOACG_ANIM block, not in CSS).
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
- **layout.ts** - the desktop DOCKABLE-PANEL layout (localStorage 'spx-gfx-layout', version 3):
  three docks (left/right/bottom), each a `DockState` {panels, active, size}, plus `timelineSize`
  (the centre's canvas/timeline split). `PanelId` = code | inspector | data | control | style |
  assets | ai | export. A panel not in any dock is intentionally CLOSED (not re-added on load -
  AppShell offers it from a dock's "+"). loadLayout migrates: v2 gets 'assets' inserted once
  right after 'style' (v2 semantics say absent = closed, so without the version bump no existing
  user would ever see the new tab); anything older resets to the default; the mobile layout
  ignores all of this. See src/components/CLAUDE.md (AppShell / WorkspaceDock).
- **prefs.ts** - small device-level workflow defaults (localStorage 'spx-gfx-prefs'):
  defaultExportTarget, timelineCollapsed. Not synced; keep it tiny.
- **id.ts** - uuid() that ALWAYS returns a valid RFC-4122 v4, even where crypto.randomUUID is
  undefined (plain-HTTP LAN hosts, CasparCG's CEF). Record ids must be real UUIDs: the cloud
  `documents.id` column is a uuid PK, and a non-UUID id would be rejected by Postgres and poison
  sync.
- **videoTypes.ts** - VideoProject, the canonical unit of the AI VIDEO editor ("Video or
  animation with AI"): ONE composition source + duration/fps/size/transparency + assets (the
  exact AssetFile shape, sync-ready) + `inputs` (editable inputs, below) + AI chat history and
  motion plan. Parallel to SpxTemplate - the two worlds never mix; `kind: 'video'` is the
  serialized discriminant. **`engine: 'remotion' | 'hyperframes'`** (VIDEO_ENGINES carries the
  wizard-card metadata) picks which source field is live - `tsx` (a single-file React/Remotion
  module, the default) or `html` (a standalone HyperFrames composition; runtime in
  src/video/hyperframes/) - chosen at creation, never converted; read/write the active source
  through `videoSource(p)`/`withVideoSource(p, code)`. Records stored before the field load as
  'remotion' (videoProject.ts normalize). Also DocKind and createDefaultVideoProject
  (engine-matched starter composition).
  **VideoInput** = the video project's Template Definition, the counterpart of an SPX
  DataField: `{ key, type: text|number|color|select|image, label, value, default, options?/
  min?/max?/step? }`. The AI declares a handful (via the emit tool) so a non-technical user
  edits the content in the Content panel WITHOUT touching TSX; the composition reads them from
  its `fields` prop as `fields.<key> ?? default`. An `image` input's value is the LOGICAL NAME
  of a project asset (the counterpart of an SPX `filelist` filename): the composition resolves
  it against the `assets` prop it already receives (`assets[String(fields.logo ?? '')]`), so an
  image input adds NO bytes to the render manifest budget. `videoFieldValues(inputs)` builds
  the `{key: value}` bag passed as `fields` into BOTH the live preview (VideoPlayerFrame
  set-props) and the render (buildVideoManifest inputProps). `mergeVideoInputs(prev, next)`
  adopts a regenerated set while keeping values the user already edited - and a provider that
  simply DIDN'T re-declare its inputs must send `null`, not `[]`, or the merge empties the user's
  Content panel and reverts their text to the code defaults (`[]` means "no editable content" and
  is honoured as such; see ai/video/claudeVideoProvider.ts).
  `videoInputDescriptor(input)` is the adapter to the shared `FieldDescriptor` (fieldModel.ts)
  the Content panel renders - the same descriptor an SPX DataField becomes.
  **`authoredFor`** = the settings the current code was WRITTEN against (null until a generation
  lands). The AI plans motion to a duration and a frame and writes the resulting numbers into the
  code; changing the settings afterwards changes the player and the renderer but NOT that code, so
  a shortened piece loses its exit and a composition that paints its own background still renders
  opaque under `transparent`. `settingsDrift(project)` says what no longer matches, in the user's
  words, and `driftRequest(project)` is the refinement that brings the code up to date (the
  Settings panel's one-click offer).
- **videoInputInfer.ts** - reads a composition's editable inputs OUT OF ITS CODE: every
  `fields.<key> ?? <literal>` the module reads, typed from the fallback (a hex string is a colour,
  a number is a number, an `assets[String(fields.x ?? '')]` lookup is an image). The code is the
  source of truth, so it decides what is editable - a hand-written field gets the same control the
  AI would have declared. `contentInputs(declared, tsx)` is what the Content panel shows: declared
  inputs first and unchanged (they carry labels/options/bounds a fallback can't express), then
  whatever else the code reads. A read with NO literal fallback is ignored on purpose - without a
  default there is nothing to show, reset to, or type the control from.
- **fieldModel.ts** - the canonical editable-field vocabulary shared across the two authoring
  worlds. `FieldKind` = the kinds the product supports (text/lines/number/color/select/toggle/
  image); the video Template Definition uses the `VideoFieldKind` subset (`VideoInputType`,
  text/number/color/select/image). **`FieldDescriptor`** is the shared SHAPE both worlds adapt
  into - `{key, label, kind, defaultValue, options?, min?/max?/step?}` - plus `FieldValue`
  (string | number) and `clampToField`. An SPX DataField becomes one via control/controlModel.ts
  `fieldDescriptors`; a VideoInput via videoTypes.ts `videoInputDescriptor`. **Every surface that
  edits a field renders descriptors, never raw fields**, so the SPX Data panel, the SPX operator
  panel, and the video Content panel are literally the same component
  (components/fields/FieldControl.tsx) and cannot drift. A new field kind is added HERE, mapped
  in the two adapters, and rendered once.
- **videoProject.ts** - video persistence mirroring project.ts/packets.ts: current slot
  'spx-gfx-video-project' (autosave; returns false on quota so the shell can WARN - video
  assets are big) + saved list 'spx-gfx-video-saved' with soft-delete tombstones.
- **docKind.ts** - the persisted editor-world switch ('spx-gfx-doc-kind'); App.tsx branches
  AppShell vs VideoAppShell on it. Falls back to 'spx' when the video slot is empty.
- **videoLayout.ts** - the video shell's own layout prefs (localStorage 'spx-gfx-video-layout'):
  just codeRatio + codeCollapsed. Separate from layout.ts on purpose - the video shell has a
  simple code|preview split, not the SPX dockable workspace.
