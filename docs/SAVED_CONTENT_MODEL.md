# The saved-content model (the library, packages, and the graphic lifecycle)

**Status: adopted 2026-07-21.** This is the binding contract for how finished work is saved,
organized, reopened, and controlled. It supersedes the packet-embedded storage model
(packets keep their key and sync kind, but become FOLDERS over the library).

## 1. The shape

```text
User
├── Package  (model/packets.ts Packet — a folder: show, production, or collection)
│   └── Graphic … (by reference: GraphicDoc.packageId)
├── Unassigned Graphic  (GraphicDoc with packageId: null)
│   └── Control panel + entries (ControlEntry[] ON the graphic)
└── Video  (model/videoProject.ts — unchanged)
```

- **`GraphicDoc`** (`model/library.ts`, localStorage `spx-gfx-graphics`, sync kind
  `'graphic'`) is the durable unit: `{ id, name, packageId, template, baseline?,
  entries, activeEntryId, createdAt, updatedAt, deleted? }`. The id is a stable UUID —
  renaming never breaks references. `entries` are the control panel's named data rows
  (`{ id, label, values: Record<fieldId, string>, updatedAt }`).
- **`Packet`** stays `{ id, name, updatedAt, deleted? }` + a legacy `graphics` array that
  is MIGRATED ON READ: any embedded `SavedGraphic` found in a packet (v1 shape, or one
  written by an older build) is extracted into the library with `packageId` set, and the
  packet is rewritten with `graphics: []` + `version: 2`. The migration is convergent —
  re-running it is a no-op — and an old build reading a v2 packet sees an empty-but-valid
  packet while the graphics stay safe under the key it never reads.
- **Shows** (`model/shows.ts`) are unchanged: the rundown/control aggregation unit.
- A graphic belongs to AT MOST one package (`packageId`), so "move to package" is one
  record write and package contents are a filter, never a second list to keep in sync.

## 2. The working document and Save

`model/project.ts` (the autosaved working slot) gains `graphicId?: string | null` and
`dirty?: boolean` — which library record the open document IS, and whether it has changed
since the last explicit Save. The store (`templateStore`) tracks
`saved: { graphicId, dirty, status: 'idle' | 'saving' | 'failed' }`:

- Any template mutation marks `dirty` (the same subscription that autosaves).
- **Save** writes the template (+ baseline + entries) into the linked GraphicDoc; first
  save opens the SAVE DIALOG: name the graphic, keep it standalone, add it to an existing
  package, or create a new package.
- **Save As / Duplicate** mints a new GraphicDoc id.
- The autosave slot is the crash-safety net (reload restores edits, dirty flag included);
  Save is the durable, named, synced record. Both survive; they are never conflated.
- Opening another document with unsaved changes asks first (Save / Discard / Cancel).

## 3. Navigation (hash routes, one application)

`src/app/routes.ts` — hash routing (static-host safe, refresh restores, browser
Back/Forward are real history):

| Route | Surface |
|---|---|
| *(none)* | The editor, whichever kind `docKind` persisted (unchanged refresh behavior). |
| `#/home` (+`#/home/<section>`) | Home — recent, graphics, packages, control panels, videos. |
| `#/package/<id>` | One package's contents. |
| `#/graphic/<id>` | Open that library graphic in the SPX editor. |
| `#/control/<graphicId>` | The graphic's control panel (fields + entries + event buttons + live preview). |
| `#/video` | The video editor shell. |
| `#/new` | The creation wizard over the editor. |

`?control=<slug>` and `?chat=<slug>` query routes are untouched (hosted capability URLs).
Home and the control panel are ROUTED SURFACES, not modals, so Package → Graphic → Back
returns to the package, Graphic → Control panel → Back returns to the graphic, and
Video ↔ Graphics is plain history. The old Homebase modal and the topbar 📦 Packets
button are retired; packages are managed through Save and Home.

**Card thumbnails are a LIVE render, never a stored picture** (`components/home/GraphicThumb.tsx`).
Every Home graphic card renders the real template through `preview/composeDocument`, in a small
iframe scaled from the template's own resolution and parked at its settled on-air state (the
editor canvas's own settle recipe: `update()` → `buildInTimeline().progress(1, true)` →
`update()`). Nothing about the record changes: no thumbnail field on `GraphicDoc`, so no format
version bump, no migration, and no second copy of the artwork riding every cloud sync. It also
cannot go stale — a template edited on another device shows its new look the moment it syncs,
which is exactly when a preview has to be trusted. The cost, re-rendering per Home visit, is paid
down by mounting each iframe only once its card scrolls into view.

## 4. Control panel entries

An **entry** is a named, saved data row for one graphic ("Anna Andersson — Presenter"):
create / duplicate / edit / delete / select; the ACTIVE entry's values feed the editor
preview (sample data), the in-app control panel's Play, and the exported standalone
`controlpanel.html` (entries are baked into the panel spec as a switcher). Entries live
ON the GraphicDoc, so they save, reopen, and sync with the graphic.

The HOSTED control page (`?control=<slug>`) publishes them the same way: `publishControlShow`
reads each show graphic's entries out of the library into the `panel` spec, and the page
renders a READ-ONLY switcher. Picking an entry loads its values into the SHARED staging
buffer — the same path typing takes — so it airs on an explicit take, and the hosted
`staged`/`live` model stays per-graphic, not per-entry. Authoring stays in the app; a change
reaches operators on the next publish. A show's copy of a graphic records `graphicId` (the
library record it came from) so the lookup is by stable id, not by name — see
docs/CONTROL_LAYER.md.

The whole-SHOW export (`export/showExport.ts`) carries entries the same way, and through the
same resolver (`model/library.ts` `entriesForSavedGraphic` — graphicId, unique-name fallback):
each graphic's entries are read out of the library at export time and baked into both the
aggregated `show_controlpanel.html` and that graphic's own `controlpanel.html`. Entries are
never embedded in the `Show` record, so this is not a persisted-shape change and needs no
migration — the show export references the library graphic and resolves entries on export.

## 5. Versioning

`GraphicDoc` carries `version: 1`; `Packet` bumps to `version: 2` with the on-read
migration in the same commit (doctrine: STATE_MACHINE_SCHEMA §5). Additive fields never
bump; sync kind `'graphic'` ships with Supabase migration `0009_graphic_kind.sql`.
