import { createProject } from './_create';

// The Export tab's Video & image render section (src/components/render/RenderPanel.tsx).
// The offline suite runs with VITE_RENDER_API=1 (playwright.config.ts webServer env), so
// the section is present; every /api/render call here is stubbed with page.route — no
// real render runs in CI (the real loop is covered by scripts/render-smoke.mjs).

import { test, expect, type Page } from '@playwright/test';

async function createHairline(page: Page) {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
}

async function openRenderPanel(page: Page) {
  await page.getByTestId('dock-tab-export').click();
  await expect(page.getByTestId('render-panel')).toBeVisible();
  // The panel measures the graphic in a hidden iframe before it can render.
  await expect(page.getByTestId('render-breakdown')).not.toContainText('Measuring', { timeout: 15_000 });
}

test('render section lists the five formats and a real timing breakdown', async ({ page }) => {
  await createHairline(page);
  await openRenderPanel(page);
  for (const id of ['mp4', 'webm', 'png-still', 'png-sequence', 'prores4444']) {
    await expect(page.getByTestId(`render-format-${id}`)).toBeVisible();
  }
  // Measured breakdown: In · Hold · Out with real seconds (lt01 has a real entrance+exit).
  const breakdown = page.getByTestId('render-breakdown');
  await expect(breakdown).toContainText('In');
  await expect(breakdown).toContainText('Hold');
  await expect(breakdown).toContainText('Out');
  await expect(page.getByTestId('render-start')).toBeEnabled();
});

test('a too-short total is a hard preflight error that disables rendering', async ({ page }) => {
  await createHairline(page);
  await openRenderPanel(page);
  await page.getByTestId('render-duration').fill('1');
  await expect(page.getByTestId('render-breakdown')).toContainText('animations need');
  await expect(page.getByTestId('render-start')).toBeDisabled();
});

test('happy path: start -> progress -> complete -> download link (stubbed API)', async ({ page }) => {
  const statuses = [
    { state: 'provisioning', percent: 6, format: 'mp4', jobId: 'j1' },
    { state: 'rendering', percent: 45, format: 'mp4', jobId: 'j1', frames: { rendered: 60, encoded: 0, total: 150 } },
    {
      state: 'complete', percent: 100, format: 'mp4', jobId: 'j1',
      output: { url: '/api/render/file?id=j1', downloadUrl: '/api/render/file?id=j1', bytes: 250_000, contentType: 'video/mp4', expiresAt: new Date(Date.now() + 3600_000).toISOString() },
    },
  ];
  let statusCalls = 0;
  await page.route('**/api/render/start', (route) =>
    route.fulfill({ status: 202, json: { jobId: 'j1', jobToken: 'tok', pollIntervalMs: 100, totalFrames: 150 } }));
  await page.route('**/api/render/status**', (route) =>
    route.fulfill({ status: 200, json: statuses[Math.min(statusCalls++, statuses.length - 1)] }));

  await createHairline(page);
  await openRenderPanel(page);
  await page.getByTestId('render-start').click();
  await expect(page.getByTestId('render-progress')).toBeVisible();
  await expect(page.getByTestId('render-result')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('render-result')).toContainText('MP4');
  await expect(page.getByTestId('render-result')).toContainText('250 kB');
  const href = await page.getByTestId('render-download').getAttribute('href');
  expect(href).toContain('/api/render/file?id=j1');
  expect(href).toContain('token=tok');
  // "Render another" resets to the idle form.
  await page.getByRole('button', { name: 'Render another' }).click();
  await expect(page.getByTestId('render-start')).toBeVisible();
});

test('a failed job shows the server message and recovers', async ({ page }) => {
  await page.route('**/api/render/start', (route) =>
    route.fulfill({ status: 202, json: { jobId: 'j2', jobToken: 'tok', pollIntervalMs: 100, totalFrames: 150 } }));
  await page.route('**/api/render/status**', (route) =>
    route.fulfill({ status: 200, json: {
      jobId: 'j2', state: 'failed', percent: 0, format: 'mp4',
      error: { code: 'render_failed', message: 'The graphic threw at frame 12' },
    } }));

  await createHairline(page);
  await openRenderPanel(page);
  await page.getByTestId('render-start').click();
  await expect(page.getByTestId('render-error')).toContainText('The graphic threw at frame 12', { timeout: 10_000 });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByTestId('render-start')).toBeVisible();
});

test('quota rejection surfaces the server message inline', async ({ page }) => {
  await page.route('**/api/render/start', (route) =>
    route.fulfill({ status: 429, json: { error: { code: 'quota', message: 'Hourly render limit reached (2/h). Try again later.' } } }));
  await createHairline(page);
  await openRenderPanel(page);
  await page.getByTestId('render-start').click();
  await expect(page.getByTestId('render-error')).toContainText('Hourly render limit reached');
  // Still recoverable: the button stays available for a later retry.
  await expect(page.getByTestId('render-start')).toBeEnabled();
});

test('cancel mid-render returns to the idle form', async ({ page }) => {
  await page.route('**/api/render/start', (route) =>
    route.fulfill({ status: 202, json: { jobId: 'j3', jobToken: 'tok', pollIntervalMs: 100, totalFrames: 150 } }));
  await page.route('**/api/render/status**', (route) =>
    route.fulfill({ status: 200, json: { jobId: 'j3', state: 'rendering', percent: 30, format: 'mp4' } }));
  await page.route('**/api/render/cancel', (route) =>
    route.fulfill({ status: 200, json: { jobId: 'j3', state: 'cancelled', percent: 0, format: 'mp4' } }));

  await createHairline(page);
  await openRenderPanel(page);
  await page.getByTestId('render-start').click();
  await expect(page.getByTestId('render-cancel')).toBeVisible();
  await page.getByTestId('render-cancel').click();
  await expect(page.getByTestId('render-error')).toContainText('Render cancelled');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByTestId('render-start')).toBeVisible();
});
