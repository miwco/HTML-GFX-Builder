import { defineConfig, devices } from '@playwright/test';
import { devPort } from './scripts/dev-port.mjs';

// End-to-end UI-flow tests. These drive the real dev server, so they verify the app the way a
// user experiences it. Run with `npm run test:e2e`.
// The port comes from scripts/dev-port.mjs (5174 in the main checkout, a stable per-worktree
// port in a linked worktree), so parallel worktrees never reuse each other's servers.
const base = `http://localhost:${devPort()}`;
export default defineConfig({
  testDir: './e2e',
  // The authed community flows live in e2e/configured and run under playwright.live.config.ts (a
  // configured, signed-in backend). Keep them out of this offline-pinned suite.
  testIgnore: '**/configured/**',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  // The suite is parallel-safe: every test gets a fresh browser context (isolated storage),
  // the dev server is stateless in the pinned offline mode, and the render specs stub their
  // API per-page. fullyParallel spreads the big spec files (timeline-v2 is ~40 tests) across
  // workers instead of leaving the largest file as the serial critical path.
  // 4 workers is the measured sweet spot on a 16-core dev box: the full suite passes clean,
  // and 8 workers only shaved ~30 s while making the tightest UI timings (Monaco decorations,
  // the stub AI's generate) flake under CPU contention.
  fullyParallel: true,
  workers: 4,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: base,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: base,
    reuseExistingServer: true,
    timeout: 60_000,
    // Pin the suite to OFFLINE mode regardless of the developer's local .env (which may hold real
    // Supabase creds for live testing). Env vars set here take priority over .env files in Vite,
    // so these empty values win and the app behaves as the no-backend tool the specs assume.
    // Auth/sync live paths are verified separately (supabase/README.md checklist).
    // VITE_RENDER_API is pinned ON: the render section is part of the offline surface the
    // suite covers (the local executor renders with zero backend — the self-host mode).
    // Render specs stub /api/render/* with page.route, so no real render runs in CI.
    // VITE_ANTHROPIC_API_KEY is pinned EMPTY so AI-adjacent specs exercise the offline
    // stub providers deterministically (a real key in the developer's .env must never
    // leak into the suite - the video specs rely on the stub generator).
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', VITE_RENDER_API: '1', VITE_ANTHROPIC_API_KEY: '', VITE_AI_MODEL: '', VITE_AI_PROXY_URL: '' },
  },
});
