import { defineConfig, devices } from '@playwright/test';

// End-to-end UI-flow tests. These drive the real dev server, so they verify the app the way a
// user experiences it. Run with `npm run test:e2e`.
export default defineConfig({
  testDir: './e2e',
  // The authed community flows live in e2e/configured and run under playwright.live.config.ts (a
  // configured, signed-in backend). Keep them out of this offline-pinned suite.
  testIgnore: '**/configured/**',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 60_000,
    // Pin the suite to OFFLINE mode regardless of the developer's local .env (which may hold real
    // Supabase creds for live testing). Env vars set here take priority over .env files in Vite,
    // so these empty values win and the app behaves as the no-backend tool the specs assume.
    // Auth/sync live paths are verified separately (supabase/README.md checklist).
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
  },
});
