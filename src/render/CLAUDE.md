# src/render - deterministic video/image rendering

Loaded alongside the root CLAUDE.md when working in this directory. Keep it accurate.

The contract layer for the Remotion exporter (render-worker/ is the renderer, api/ the
service). The core promise: **manifest + frame number = exact pixels** - a frame never
depends on rAF timing, CPU speed, or the wall clock.

## Purity rule (load-bearing)

`manifest.ts`, `schedule.ts`, and `limits.ts` are PURE - no DOM, no `?raw`, no
`import.meta`. The Remotion composition in render-worker/ imports them relatively and
webpack-compiles them, and the api/ functions import them under Node. Vite-isms in these
three files break the renderer build. Browser-only modules (composeRenderDocument,
measure, buildManifest, config) may use anything the app uses.

- **manifest.ts** - RenderManifest (the versioned job contract), RENDER_FORMATS metadata,
  MeasuredDurations, RenderCue/Segment/Schedule, durationInFrames. `width`/`height` are the
  AUTHORED template resolution - output sizing goes through `scale`, never by resizing the
  document (marquee widths, credit-roll heights, and --scale depend on layout at the
  authored size).
- **schedule.ts** - computeSchedule: the duration/HOLD model. User picks TOTAL duration;
  measured animation durations are preserved; the remainder splits EQUALLY across hold
  slots (after IN + after each played step, never after OUT). total < fixed = hard error.
  Continuous phases (repeat:-1, duration >= 1e7 s) cost 0 fixed time. Cues snap to the
  frame grid. Imported templates without builder globals only render with outMode 'none'.
- **limits.ts** - RENDER_LIMITS tiers (anonymous/free/paid) + RENDER_CONFIG: every
  configurable number lives here; UI checks are UX, api/ re-validates authoritatively.
  `resolveTier()` is the single seam a future paid tier changes.
- **runtimeScript.ts** - RENDER_RUNTIME_JS: the virtual clock (Date/performance/timers/rAF
  virtualized, network stubbed) + `__noacgRender` { prepare, setSchedule, seek, vNow,
  getErrors }. The graphic executes its REAL cue lifecycle (update -> play -> next -> stop)
  against virtual time; GSAP is driven by gsap.updateRoot(t) after GSAP_DETACH_JS removes
  its ticker hook. Injection order (composeRenderDocument owns it): runtime FIRST, then
  GSAP, then the detach snippet, then styles, then template JS. Seeks are monotonic - the
  host hard-resets (fresh iframe) for backward seeks.
- **composeRenderDocument.ts** - the render document: preview-style inlining + bundled
  fonts fetched from /fonts as data URLs + polling blocks (LIVE DATA / SHOW CHAT / REMOTE
  CONTROL) stripped. color-scheme must MATCH the Remotion host page (default light) or
  Chromium paints the iframe opaque and kills alpha.
- **measure.ts** - the client estimate pass: hidden iframe AT TEMPLATE RESOLUTION ->
  prepare() -> MeasuredDurations. The renderer re-measures in its own page; those numbers
  are authoritative. Both feed the same computeSchedule.
- **buildManifest.ts** - template + sampleData + user options -> RenderManifest (stamps
  epochMs; snapshots data).
- **config.ts** - isRenderConfigured() (VITE_RENDER_API) - the ONE feature-detection
  point; unset = zero render UI (offline posture, same as backend/config.ts).
