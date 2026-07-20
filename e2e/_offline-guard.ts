// globalSetup for the offline e2e suite: refuse to run against a dev server that is not
// pinned to offline mode.
//
// THE HOLE THIS CLOSES. playwright.config.ts pins the suite offline through `webServer.env`
// (empty Supabase creds, empty AI key and proxy). That env is only applied when PLAYWRIGHT
// STARTS the server. With `reuseExistingServer: true` a server someone already started on
// this checkout's port is adopted as-is and every pin is silently skipped - so a developer's
// real .env decides what the suite runs against, while the config still reads as if it had
// pinned it. The failure is quiet and confusing: backend-sensitive specs fail because the
// visitor is signed out, and AI specs stop exercising the offline stub providers the video
// specs depend on. The config comment already says a real key "must never leak into the
// suite"; a reused server is exactly how it does.
//
// WHAT IT ACTUALLY DOES, AND WHEN. Measured, not assumed: globalSetup runs AFTER webServer,
// so in a normal run the server IS already listening by the time this executes - Playwright
// started it moments earlier. The guard therefore probes on every run and cannot tell "the
// one Playwright just started" from "a foreign one it reused". It does not need to: it reads
// the env the server actually serves, which is pinned in the first case and whatever the
// developer's .env said in the second. Correct either way.
//
// The early return covers only the case where nothing is listening at all (webServer failed,
// or a future Playwright reorders the phases); it is not the common path.
//
// Cost: one headless page load per suite run, ~1s against a ~5min suite.

import { chromium } from '@playwright/test';
import { devPort } from '../scripts/dev-port.mjs';

/** Keys playwright.config.ts pins EMPTY. A non-empty value means the pin did not apply. */
const MUST_BE_EMPTY = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_ANTHROPIC_API_KEY',
  'VITE_AI_PROXY_URL',
] as const;

/** Never print a real secret; a leaked key must not end up in CI logs. */
function redact(value: string): string {
  return value.length <= 8 ? '***' : `${value.slice(0, 4)}…${value.slice(-2)} (${value.length} chars)`;
}

export default async function offlineGuard(): Promise<void> {
  const base = `http://localhost:${devPort()}`;

  const alreadyRunning = await fetch(base, { method: 'GET' })
    .then((r) => r.ok)
    .catch(() => false);
  if (!alreadyRunning) return; // Nothing to inspect; see the note above.

  const browser = await chromium.launch();
  let env: Record<string, unknown>;
  try {
    const page = await browser.newPage();
    await page.goto(`${base}/app`, { waitUntil: 'domcontentloaded' });
    env = await page.evaluate(async () => {
      const probe = (await import('/e2e/_env-probe.ts')) as Record<string, unknown>;
      return { ...probe };
    });
  } finally {
    await browser.close();
  }

  const leaked = MUST_BE_EMPTY.filter((k) => String(env[k] ?? '').trim() !== '');
  if (leaked.length === 0) return;

  const detail = leaked.map((k) => `  ${k} = ${redact(String(env[k]))}`).join('\n');
  throw new Error(
    `Refusing to run the offline e2e suite against a server that is not offline-pinned.\n\n` +
      `A dev server is already listening on ${base}, so Playwright reused it ` +
      `(reuseExistingServer) and webServer.env was never applied. It carries:\n\n${detail}\n\n` +
      `Stop that server and re-run, so Playwright starts its own pinned one.\n` +
      `(Started via the preview tools? Stop it there. This checkout's port comes from ` +
      `scripts/dev-port.mjs.)`,
  );
}
