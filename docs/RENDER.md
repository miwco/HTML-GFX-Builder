# Video & image rendering

How NoaCG Studio turns a graphic into finished media (MP4 / WebM / PNG still /
PNG sequence ZIP / ProRes 4444 MOV). The user flow: open a graphic → Export tab →
**Video & image** → pick format + total duration → Render → real progress → Download.

## Architecture (NoaCG stays the source of truth)

No graphic is ever recreated as a Remotion composition and no GSAP animation is
rewritten. One generic, deterministic path serves every graphic:

```
SpxTemplate + Data panel values                       (the editor, source of truth)
  → composeRenderDocument()      src/render — a fully self-contained HTML document:
                                 virtual-clock runtime + GSAP + CSS (fonts inlined as
                                 data URLs) + template JS; live polling blocks stripped
  → RenderManifest               src/render/manifest.ts — the versioned job contract:
                                 document + w/h/fps/scale + timing + data + format
  → NoaCGGraphic composition     render-worker/remotion — ONE composition hosting the
                                 document in a srcdoc iframe, seeking its virtual clock
                                 to frame/fps under Remotion's delayRender protocol
  → executor                     api/_lib/executor.ts — LocalExecutor (dev/self-host:
                                 child process) | SandboxExecutor (hosted: Vercel Sandbox
                                 via @remotion/vercel, output to Vercel Blob)
  → download                     token-gated local file route, or the Blob URL
```

### Determinism: the virtual clock

**manifest + frame number = exact pixels.** The render document virtualizes `Date`,
`performance.now`, `setTimeout`/`setInterval`, and `requestAnimationFrame`, detaches
GSAP's rAF ticker, and drives `gsap.updateRoot(t)` in frame quanta while executing the
graphic's REAL cue lifecycle (`update → play → next× → stop`) as virtual timers
(src/render/runtimeScript.ts). Because the real code runs — only against our clock —
countdowns, `tl.call` clocks, count-up `onUpdate` callbacks, and `repeat:-1` marquees
all render exactly as they play live, reproducibly. Verified: two renders of the same
manifest are byte-identical, and a 3:00 countdown reads 2:59 at t=2 s and 2:53 at t=8 s
in the finished MP4.

Determinism is promised **per environment** (same machine / same sandbox image); OS
font rasterizers may differ sub-pixel across platforms. Wall-clock graphics (the corner
bug's live clock) read the manifest's `epochMs`, so they render a fixed, reproducible
time — by design.

### Total duration and HOLD (src/render/schedule.ts)

The user picks the TOTAL duration; animations keep their real durations, measured
in-page at final resolution (`__noacgRender.prepare()` builds each phase once, reads
`duration()`, kills it, resets — so layout-sized phases like credit rolls and ticker
marquees are correct by construction). The remainder becomes HOLD, split **equally**
across the slots after IN and after each played step — never after OUT, which ends the
render exactly on the total. Endless loops (`repeat:-1`) count as continuous with fixed
cost 0. A total shorter than the fixed animation time is a hard error carrying the
measured numbers, raised in the UI preflight AND by the renderer.

### Formats (official Remotion codec settings)

| Format | Codec | Alpha | Notes |
|---|---|---|---|
| MP4 | h264, yuv420p | no | flattened onto a chosen background color |
| WebM | vp8 (vp9 opt-in) + yuva420p | yes | alpha plays in Chrome/Firefox, not Safari |
| PNG still | renderStill | yes | defaults to the settled on-air moment |
| PNG sequence | renderFrames → `frame-00000.png` zip | yes | zero-padded, STORE zip |
| ProRes 4444 MOV | prores '4444' + yuva444p10le | yes | the NLE path |

All video renders capture PNG frames (broadcast gradients band under JPEG capture).
Output size = template resolution × the scale option — the document itself is never
resized (layout math depends on the authored resolution).

## Service (api/render/*)

`start` validates the manifest against the caller's tier, enforces quotas
(duplicate-submit first — it answers the already-running job id — then concurrency,
then hourly/daily windows), stores sha256 hashes of two per-job secrets (the browser's
status/cancel token; the worker's completion secret), and launches the executor.
Sandbox launches run under `waitUntil` AFTER the 202 — no request waits on VM
provisioning. `status` reconciles executor progress into the job, finalizes completion,
and fails lost jobs past their deadline. `cancel` stops the executor. `complete` is the
worker-secret callback. `cleanup` (cron, CRON_SECRET) sweeps expired outputs and stale
jobs.

Job ledger: `render_jobs` in Supabase (migration 0007) when
`SUPABASE_SERVICE_ROLE_KEY` is set; otherwise in process memory (dev/self-host).

### Tiers & limits (src/render/limits.ts — every number lives there)

| | anonymous | free (signed in) | paid (defined, not yet reachable) |
|---|---|---|---|
| formats | mp4, webm, png-still | + png-sequence, prores4444 | all |
| max output / fps | 1920×1080 / 30 | 1920×1080 / 60 | 4096×2304 / 60 |
| max duration | 15 s | 60 s (prores/seq 30 s) | 300 s |
| concurrent / hour / day | 1 / 2 / 6 | 2 / 10 / 40 | 4 / 30 / 150 |

Client checks are UX; the server re-validates everything. Introducing a paid tier =
changing `resolveTier()` to read an entitlements source; nothing else moves.

## Security posture

Rendered documents contain user-authored HTML/CSS/JS — treated as untrusted code:

- Hosted renders run in **Vercel Sandbox** (Firecracker microVM), destroyed per job.
  User JS executes in the sandbox's Chrome page, never in our functions.
- The render document needs **zero network** (assets + fonts ride as data URLs) and its
  runtime stubs `fetch`/`XHR`/`WebSocket`/`BroadcastChannel` to inert no-ops; the marked
  LIVE DATA / SHOW CHAT / REMOTE CONTROL blocks are stripped before rendering.
- Job identity is two independent secrets (browser token / worker secret), stored only
  as sha256; wrong tokens get the same 404 as missing jobs. Anonymous quotas key on a
  salted IP hash — raw IPs are never stored.
- Runaway protection: per-frame Remotion timeouts, a per-job sandbox wall clock derived
  from frames×resolution (RENDER_CONFIG), a timer-fire cap inside the virtual clock,
  and the cleanup cron as backstop. Output size is capped per tier.
- Finished files live at unguessable `renders/<jobId>/…` Blob paths with a short TTL
  (anonymous 2 h, free 24 h). Public-read-by-URL is a deliberate v1 tradeoff — the
  4.5 MB function response cap rules out proxied downloads; switching to private blobs
  with signed URLs would be isolated to the executor/blob helpers.
- Remaining hardening candidates: a pathname-scoped Blob token instead of the RW token
  in the sandbox env (blocked on @remotion/vercel's upload accepting client tokens) and
  a deny-by-default sandbox network policy phase-switched after provisioning.

## Running it

**Local / self-host (no cloud at all):** set `VITE_RENDER_API=1` in `.env`, run
`npm install` inside `render-worker/` once, start the dev server. The Export tab's
render section appears and renders on your machine (LocalExecutor spawns
`render-worker/job.mjs`; first run downloads Chrome Headless Shell). Verify with
`node scripts/render-smoke.mjs`.

**Hosted (Vercel):**
1. Apply migration `supabase/migrations/0007_render_jobs.sql` to the live database.
2. Create a Blob store (Vercel → Storage → Blob) and connect it to the project.
3. Set the project env vars and redeploy:

```
VITE_RENDER_API=1
RENDER_EXECUTOR=sandbox
BLOB_READ_WRITE_TOKEN=   (from the Blob store)
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=             (any long random string)
IP_HASH_SALT=            (any long random string)
```

The deploy build prebuilds the Remotion bundle (`vercel.json` buildCommand) and ships
it to the functions (includeFiles); sandboxes get it via `addBundleToSandbox` — nothing
of ours is npm-installed inside sandboxes. `@vercel/sandbox` is pinned to the version
`@remotion/vercel` is built against; bump them together only.

### First-deploy checklist

- [ ] anonymous MP4 1080p25 ≤15 s renders and downloads
- [ ] signed-in ProRes 4444 renders; alpha verified in an NLE
- [ ] signed-in PNG sequence (the custom seq-job path — least field-proven; watch the
      sandbox logs on the first run)
- [ ] cancel mid-render stops the sandbox (Vercel dashboard shows it gone)
- [ ] third anonymous render within an hour answers 429
- [ ] the cleanup cron log shows expired outputs deleted after TTL
- [ ] sandbox count returns to zero after each job

## Testing

- `npm run test:e2e` — offline suite; includes `render-schedule.spec.ts` (schedule +
  limits math) and `render.spec.ts` (panel states over a stubbed API).
- `node scripts/render-smoke.mjs` — the REAL full loop on this machine: manifest from a
  live catalog template → api → local Remotion render → download + MP4 sniff + token
  probes. Not in CI (renders take minutes and download Chrome).
- `node scripts/make-render-manifest.mjs <out> <variantId> [sec] [format] [fps] [scale]
  [createOptionsJson]` + `node render-worker/cli.mjs <manifest> <out>` — render any
  catalog variant by hand.

## License note

Remotion is source-available: free for individuals and organizations up to 3 people,
paid company license above that (https://remotion.dev/license). NoaCG Studio is
currently a solo project, so the free tier applies. The dependency is isolated in
`render-worker/` (its own package) and never enters the AGPL app bundle — revisit the
license if the organization grows past 3 people.
