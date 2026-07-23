# The Control Layer (Phase 5)

How operators drive graphics. Control pages are GENERATED FROM THE STATE MACHINE
(docs/STATE_MACHINE_SCHEMA.md): every operator-triggered transition becomes a button, every
data field an input — per template, from one generator, with no per-template code. This doc
is the binding contract for `src/control/`, the show model, and the hosted-control schema
(supabase/migrations/0008_hosted_control.sql).

## The one generator, three surfaces

- **`control/controlModel.ts`** is the vocabulary: `fieldDescriptors` (SPX fields → the shared
  `FieldDescriptor`s), `eventButtons` (the machine's buttons via `blocks/animMachine.ts
  machineControls`), `eventLegality` (event → group → the states it fires from — the
  structural guard, precomputed), and the `ControlMessage` protocol.
- Three surfaces render that vocabulary and must stay in step:
  1. the in-app **Control tab** (`components/ControlPanel.tsx`, React),
  2. the standalone **`controlpanel.html`** (`control/controlPanelHtml.ts`, vanilla JS —
     the one deliberate second renderer, show-shaped: one card per graphic),
  3. the **hosted page** (`components/HostedControlPage.tsx`, `?control=<slug>`).
- The simulator's event strip is the FOURTH renderer of the same vocabulary: the same
  `machineControls` merge for its labels and the same `isEventLegal` for its greying. It owns
  the preview iframe, so it runs the one poll of `noacgMachineState()` and publishes the
  pointers to `templateStore.machineGroups`, which is where the in-app Control tab reads them.

## Buttons come from the machine

- `machine.controls` (blocks/animData.ts `MachineControl`) is ADDITIVE OPTIONAL metadata
  INSIDE `NOACG_ANIM`: label, section, order, `payload` (field ids whose current values ride
  the event), `destructive`. It travels in the template, so exported and hosted panels keep
  their labels with no registry to ask. Graphic types declare it as `TypeControlEvent`
  (logical payload keys); `compileControls` resolves them to `fN` ids at attach.
- Every authored operator event gets a button even undeclared (label = the event name).
  An undeclared `next` is skipped — the lifecycle » Next already fires it. A declared entry
  whose event no arrow carries is dropped and `validateMachine` warns; a payload key no
  field has warns in `validateTemplate`.
- Legality is the structural guard mirrored as greying: while a surface knows the graphic's
  state it disables buttons the machine would drop; before it knows, everything is enabled
  and the runtime guard decides. `eventLegality(js)` precomputes the table and
  `isEventLegal(table, event, state)` asks it — every React surface calls THAT one, so a
  press refused in the editor is refused identically on the hosted page. The editor's strip
  was the last surface that only pretended: it took every press and dropped the illegal ones
  silently, which reads as a broken button rather than an impossible one. Never invent a
  third "legal events" implementation — editor-side is `operatorEvents`/`eventLegality`,
  runtime-side is the interpreter, and `controlPanelHtml.ts` inlines the same rule because it
  ships without React.

## The protocol

`ControlMessage` = `update | play | stop | next | event | snap | hello`; replies
(`ControlReply`) = `state` (after every handled message, and on timer advances via a 1 s
watcher) and `graphic-online` (once at boot). Three receivers forward commands to the
template globals (`update/play/stop/next` + `noacgDispatch`/`noacgSnap`) and must stay in
agreement: `receiverScript.ts` (BroadcastChannel), `realtimeControl.ts` (Realtime Broadcast,
send-only panel path), `hostedReceiver.ts` (the durable log path). An event's payload is
applied only if the machine accepts the event — that is the atomic multi-part change.

## Prepared vs published, and the event log

- **Nothing airs merely because it was typed.** With Live off, edits are STAGED (badge) and
  air on an explicit ⟳ Take, or ride an event's payload (which un-stages exactly the fields
  it airs).
- The standalone panel keeps a per-channel EVENT LOG in localStorage (`noacg-log-<channel>`):
  a capped timestamped history of sent commands + the merged latest data + the last reported
  state. Recovery is both halves of reset, in order: the data half (update), then the visual
  half (snap — timers arm). A rebooted graphic announces `graphic-online` and is rebuilt; a
  reloaded panel seeds fields/chip/legality from the log.
- An accepted event's payload merges into the log's latest data — recovery must replay it.

## Shows (the rundown level)

`model/shows.ts` — an ORDERED set of graphics that run together, one card each on its own
channel (`spx-control-<slug>`), packet-store conventions (localStorage, `updatedAt` LWW,
tombstones), sync kind `'show'`. The single-graphic case is a show of one — the standalone
panel is built by the same `renderPanelPage`. `export/showExport.ts buildShowZip` packages a
Starter folder per graphic + one `show_controlpanel.html`; a PUBLISHED show also bakes the
hosted receiver into each graphic at export (the saved snapshot stays clean).

## Hosted control (migration 0008)

- **The INSERT is the send.** `control_events` is the append-only command log (DB-ordered);
  Realtime Postgres Changes deliver rows; a (re)joining side fills its gap from
  `control_tail`. There is no second command path.
- `control_shows` (id = the local Show.id) carries the capability `slug`, the `panel` spec
  (name/fields/js/image paths/entries per graphic — never full templates), the shared `staged`
  buffer, and `live` — each graphic's own report of applied data + machine state.
- **Entries are published, not authored, on the hosted page.** The panel spec carries each
  graphic's saved `ControlEntry` rows (docs/SAVED_CONTENT_MODEL.md §4), read out of the
  library at publish time; the page renders a READ-ONLY switcher, and picking one loads its
  values into the SHARED staging buffer — the same path typing takes — so an entry airs on an
  explicit take, never on selection. Editing entries stays in the app (`#/control/<id>`), one
  re-publish away from air. The library record is found by `SavedGraphic.graphicId` (recorded
  when the graphic is added to the show), falling back to a unique library name for copies
  added before that link existed; an ambiguous name publishes no entries rather than guessing.
  `panel` is jsonb with no version of its own, so a row published by an older build simply
  carries no entries and is normalized to `[]` on read.
- **Capability model:** owning/publishing requires sign-in (RLS); OPERATING needs only the
  slug, through SECURITY DEFINER RPCs (`control_show_by_slug`, `control_send`,
  `control_stage`, `control_report`, `control_tail`). Revoke = unpublish or rotate.
  `control_events` is anon-readable by design — the show_id uuid is the secret, exactly the
  public-channel + secret-topic posture of the 5.3 remote block.
- **Recovery is self-service:** the hosted receiver reboots by reading its own last report
  (data, then snap), then follows the log. The hosted page re-reads the row on load. Staging
  and live reports ride the log as meta rows (`t:'staged'|'live'`) so every open page follows
  without polling; those are never applied as graphic commands.
- The graphic reports AFTER applying (debounced): harvest the definition's fields from the
  DOM + `noacgMachineState()` → `control_report`.

## Profiles

The routed Home (`components/home/HomePage.tsx`, `#/home` — docs/SAVED_CONTENT_MODEL.md §3;
it replaced the old Homebase modal) is the profile: saved graphics across packages, video
projects, shows with their hosted-page links, community submissions. Sync kinds now
include `'show'` and `'video'` (video tombstones strip the heavy payload to a readable
stub). All local-first; cloud mirrors for signed-in users.

## Live-verify checklist (maintainer, real Supabase — a green build never counts)

1. `supabase db push` applies 0008 cleanly on the project.
2. Signed in: Shows section → publish a 2-graphic show → URL appears; `control_shows` row
   has slug/panel; Unpublish deletes it and the link 404s honestly.
3. Signed OUT (incognito): open `?control=<slug>` → cards render; edits stage (second
   incognito window follows them live); ⟳ Take airs; event buttons grey/enable with state.
3b. Entries: a graphic with saved entries shows the switcher; picking one fills the fields and
   stages them (the second window follows), ⟳ Take airs them, ▶ Play entry takes and plays;
   a hand edit afterwards drops the selection back to "Choose an entry…"; editing an entry in
   the app changes the hosted page only after a re-publish.
4. Export the published show; run a graphic's `index.html` as a browser source (another
   machine ideally): hosted page drives it; kill + reload the graphic → it snaps back to the
   pre-kill state with the aired data; reload the hosted page mid-show → chip + fields
   resume.
5. Two operators: A stages a result (B sees it staged), A takes, B's chip updates; refresh
   B mid-show → recovers.
6. Burst the send cap (hold a stepper with Live on) → the page surfaces the slow-down error,
   nothing crashes, the graphic stays consistent.
7. Sync: save a show + a video signed-in on device A; device B pulls both; delete on B;
   A converges (tombstones propagate; video tombstone body is a stub).
