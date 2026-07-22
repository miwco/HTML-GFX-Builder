# NoaCG Studio architecture - the modular monolith

**Binding.** This doc holds the cross-domain rules: the domain registry, the allowed dependency
edges, where new code goes, and the honest list of known debts. Per-domain contracts stay in the
nested `CLAUDE.md` files and the docs they reference - this doc never repeats them. Update this
file in the same PR that changes a cross-domain edge.

## 1. Stance

One application, one primary database (the optional Supabase backend), one build. Domains are
directories under `src/` with a declared public seam; parts get changed, tested, or extracted
later **only on demonstrated need** - never for tidiness. The two extractions that exist prove
the bar: `render-worker/` left the bundle because of a non-OSI license, `player-host/` because it
must run on an opaque origin with `sandbox="allow-scripts"`. A constraint the monolith cannot
satisfy (license, origin, trust boundary) justifies extraction; nothing else does.

Many feature branches run in parallel worktrees. The rule that keeps them from colliding: a
feature edits **its own domain plus thin wiring in `components/`**. The moment a feature needs
another domain's internals, stop - extend that domain's public seam in its own small commit
first, then consume the seam.

## 2. Domain registry

Layers are the mental model; the edge table in §3 is the law. Higher layers import lower ones,
never the reverse. `*` = the domain carries its own CLAUDE.md with the detailed contract.

| Layer | Domain | Owns | Public seam (import these) |
|---|---|---|---|
| 0 kernel | `model/` * | SpxTemplate, parse/serialize, persisted formats + migrations, library/shows/packets, field + structure contracts | the module named for the concern (`types`, `spxDefinition`, `library`, `structure`, `fieldModel`, ...) |
| 0 kernel | `assets/` | data-URL helpers, vendored gsap/lottie, OFL.txt | `assetUtils`, the vendored files |
| 1 transforms | `blocks/` * | deterministic `(template) => template` patchers, Timeline v2 engine, `NOACG_ANIM` literal, state-machine graph + mutators | `registry`, `animData`, `animMachine`, `machineEdit`, named patcher modules |
| 1 transforms | `templates/` * | wizard catalog, assemblers, graphic types, `:root` style contract | `catalog`, `variant.create(options)`, `types/` registry |
| 1 transforms | `validation/` | the export + AI gate, runtime bench | `validateTemplate`, `runtimeBench` |
| 1 transforms | `preview/` | srcdoc composition | `composeDocument` |
| 1 transforms | `editor/` | Monaco view-only helpers (comment visibility) | `commentVisibility` |
| 1 transforms | `format/` | code formatting (docs/FORMATTING.md) | `formatCode` |
| 2 services | `backend/` | THE Supabase client, auth, sync engine, asset externalization | `config` (`isBackendConfigured`, `loadBackendConfig`), `supabase` (`getSupabase`), `auth`, `syncController` |
| 2 services | `ai/` * + `ai/video/` | generation harnesses, providers, settings/preferences | `getAiProvider()`, `getVideoAiProvider()`, `settings`, `preferences` |
| 2 services | `export/` * | 6 targets + packet/show packaging | `registry`, `common` |
| 2 services | `render/` * | RenderManifest, schedule, tiers, job client | `manifest`, `schedule`, `limits` (the PURE trio), `client` |
| 2 services | `control/` | ControlMessage protocol, 3 receivers, panel generators | `controlModel`, `receiverScript`, `controlPanelHtml`, `realtimeControl`, `hostedReceiver`, `hostedControl` |
| 2 services | `video/` | video compile/validate/bridge pipeline | `compile`, `validate`, `playerBridge`, `videoFonts` |
| 2 services | `community/`, `showchat/` | shared templates, audience send-in | `communityData`, `chatData` |
| 3 app | `store/` * | editor UI state, undo, save link | `templateStore` (`applyTemplate`), `saveActions`, `videoProjectStore`, `docKindStore` |
| 3 app | `app/` | hash router | `router` |
| 3 app | `components/` *, `landing/` *, `teach/` | the React shell, landing, tooltips | (top of the graph - nothing imports these) |

## 3. Allowed edges (the ratchet)

The current, curated import graph. **Adding a new domain-to-domain edge requires editing this
table in the same PR, with one sentence of justification in the commit.** Everything may import
`model/` and `assets/`; those two are omitted from the lists. Edges not listed here and not in §6
are wrong - fix the code, not the table.

- `templates` -> blocks (`animData`, `animMachine`, shared runtime)
- `blocks` -> templates (preset data tables + `shared/animRuntime`, `shared/textFit`)
- `validation` -> blocks, templates, preview
- `preview`, `editor`, `format`, `backend`, `landing`, `teach` -> (kernel only)
- `store` -> blocks, validation
- `ai` -> templates, blocks, validation, video, backend (`getAccessToken` only - proxy metering)
- `video` -> validation, render
- `render` -> control, preview, showchat, backend (`getAccessToken` only)
- `export` -> blocks, control (the panel/receiver generators are control's declared packaging seam)
- `control` -> blocks, backend
- `community` -> backend, validation
- `showchat` -> backend, control
- `app` -> (nothing)
- `components` -> any lower domain, **through its seam column in §2**

Hard invariants (1, 3 and 4 are lint-enforced - §7; 2 and 5 stay review-time until Stage B):

1. **`@supabase/supabase-js` is value-imported only inside `backend/`** (type-only imports of
   `SupabaseClient` are fine anywhere). All client access goes through `getSupabase()`; all
   feature detection through `isBackendConfigured()` / `loadBackendConfig()`. The injected
   receiver scripts hand-roll their transport by design (an exported graphic carries no bundle)
   but still read config through `backend/config`.
2. **The render purity trio** (`render/manifest.ts`, `schedule.ts`, `limits.ts`) stays DOM-free,
   `?raw`-free, `import.meta`-free - `api/` and `render-worker/` compile these same files.
3. **`store/` is imported only by `components/`, `App.tsx`, and `blocks/registry.ts`
   (grandfathered type import, §6).** Processing domains (ai, export, render, control, video,
   backend, community) never touch the store - they take and return plain documents.
4. **Nothing imports `components/`.** UI is the top of the graph.
5. **`model/` imports nothing above layer 0** except the four grandfathered edges in §6.

## 4. Where does new code go

| The change is... | It lives in |
|---|---|
| a new persisted shape, or any shape change to one | `model/` - version + migration in the same commit (root CLAUDE.md rule 6) |
| a deterministic edit to template code | a named patcher in `blocks/` |
| a new catalog template, variant, pack, or graphic type | `templates/` |
| a new export target or packaging convention | `export/targets/` + the registry |
| an operator surface, protocol message, or receiver | `control/` |
| prompt, harness, provider, or AI settings work | `ai/` (SPX) or `ai/video/` |
| manifest, schedule, tier, or render-job work | `render/` (respect the purity trio) |
| a cloud table, sync kind, or auth change | `backend/` + `supabase/migrations/` (RLS in the same migration) |
| video compile/validate/bridge work | `video/` |
| editor UI state, undo, save/guard flow | `store/` |
| a panel, dialog, or canvas interaction | `components/` - thin, per §5 |

New sync kind: the checklist is the seam, deliberately not a registry - extend the `SyncKind`
union + `SINGLETON_KINDS` (`backend/storage.ts`), `SYNC_KINDS` (`backend/sync.ts`), the
`LocalStorageProvider` branches (`backend/storage.ts`), the tombstone purge
(`backend/syncController.ts`), and widen `documents_kind_check` in a migration (0009 is the
model to copy).

## 5. UI thinness

A component may **select** a helper and **commit** its result; it may never **be** the transform.
Concretely: calling a `blocks/`/`model/` function and passing the result to `applyTemplate` is
the pattern; assembling document coherence inline -
`applyTemplate({ ...template, js, settings, html: replaceDefinitionInHtml(...) })` - is not.
When a change needs a transform that does not exist, write it as a named, exported function in
`blocks/` (or `model/` for parse/serialize concerns) and call it. Logic files without JSX do not
live under `components/`.

Grandfathered offenders (hoist the inline assembly into `blocks/` **when you are already
touching that code path** - never as a drive-by campaign): `CanvasInteraction.tsx` (13 inline
`applyTemplate` sites), `StepTimeline.tsx:375` and `:388`, `Inspector.tsx:280`, and
`components/wizard/draft.ts` (a 430-line logic module parked in the UI tree - move it toward
`blocks/`/`templates/` when next reworked).

## 6. Known debts (grandfathered, shrink-only)

Each entry is an accepted violation of §3. Fix it when already touching the file; a fix deletes
the row. Do not add rows without updating §3's justification trail.

| Edge | Where | Smallest safe fix |
|---|---|---|
| model -> templates | `model/defaultTemplate.ts:4` imports `lt01` | move `defaultTemplate.ts` into `templates/` (it is catalog data); update the ~2 importers |
| model -> export | `model/importTemplate.ts:10` imports `ensureExternalRefs` | relocate `ensureExternalRefs` out of `export/common` into `model/` - it is a document hygiene helper, not packaging |
| model -> blocks | `model/packets.ts:11` imports `cssVars` | move `blocks/cssVars.ts` to `model/` (generic template-text util; mechanical move) |
| model -> editor | `model/prefs.ts:5` type-only `CommentVisibility` | accepted - type-only, harmless; move the type to `model/` if ever inconvenient |
| blocks -> store | `blocks/registry.ts:23` type-only `EditorTab` | move the `EditorTab` type into `blocks/` (it is "which tab a block wants"); `store/` re-exports |
| control -> export | `controlModel.ts:11`, `realtimeControl.ts:13` import `slug` | move `slug()` to `model/` - generic util misplaced in `export/`; deletes the control/export cycle |
| model <-> assets | `fonts.ts` <-> `assetUtils` | accepted - kernel siblings, both layer 0 |
| blocks -> templates presets | `blocks/presetRegistry.ts` imports 8 preset tables | accepted - data-table aggregation, no logic cycle; revisit only if a preset ever imports blocks logic |

## 7. Enforcement roadmap

- **Stage A - wired.** The "Architecture Stage A" blocks in `eslint.config.js` pin invariants 1,
  3, and 4 of §3 via `@typescript-eslint/no-restricted-imports` (zero new dependencies; part of
  `npm run lint` and the build gate). Because flat-config rule options **replace** rather than
  merge when several blocks match a file, `src/` is split into disjoint regions, each carrying
  the full restriction set for its region - keep it that way when editing. The one file-level
  exemption (`src/blocks/registry.ts`) mirrors its §6 row; delete both together. Invariants 2
  and 5 stay review-time: they need different mechanisms (`no-restricted-globals`/syntax for the
  purity trio, a resolver-aware tool for the model layer rule).
- **Stage B - the full ratchet (proposed, needs a go-ahead).** `dependency-cruiser`
  (devDependency) encoding §3's edge table plus cycle detection, wired into `npm run build` next
  to eslint, with §6 as the explicit exception list. Every debt fixed shrinks the config.

Until then, `scripts/e2e-affected.mjs` remains the de-facto machine-readable domain map (its
`CORE` list is the "shared kernel" statement); keep it in step with this doc when domains move.
