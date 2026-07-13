// The Remotion player host (public/player-host/, its own package - built by
// scripts/build-player-host.mjs) drives untrusted composition modules behind postMessage.
// These specs pin the protocol: load/loaded, eval + mount error reporting, and the frame
// probe used by AI validation. The page is driven top-level (window.parent === window),
// so postMessage from the page itself is accepted by the host's source check.

import { test, expect, type Page } from '@playwright/test';

const SETTINGS = { width: 1920, height: 1080, fps: 30, durationInFrames: 90 };
const BASE = { channel: 'noacg-player', v: 1, nonce: 'e2e' };

const GOOD_MODULE = `
  const React = require('react');
  const R = require('remotion');
  exports.default = function C() {
    const f = R.useCurrentFrame();
    return React.createElement(R.AbsoluteFill, { style: { background: '#123' } },
      React.createElement('div', { style: { color: '#fff', fontSize: 80 } }, 'frame ' + f));
  };
`;

const THROWS_AFTER_40 = `
  const React = require('react');
  const R = require('remotion');
  exports.default = function C() {
    const f = R.useCurrentFrame();
    if (f > 40) throw new Error('dies after frame 40');
    return React.createElement(R.AbsoluteFill, null, 'ok');
  };
`;

/** Start collecting host->app events on the page (call before triggering them). */
async function collectEvents(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __events: unknown[] };
    w.__events = [];
    window.addEventListener('message', (ev) => {
      const d = ev.data as { channel?: string; type?: string };
      if (d && d.channel === 'noacg-player' && !['load', 'probe', 'seek', 'play', 'pause', 'replay', 'set-props'].includes(d.type ?? '')) {
        w.__events.push(ev.data);
      }
    });
  });
}

async function post(page: Page, msg: Record<string, unknown>): Promise<void> {
  await page.evaluate((m) => window.postMessage(m, '*'), { ...BASE, ...msg });
}

async function eventsOfType(page: Page, type: string): Promise<Record<string, unknown>[]> {
  return page.evaluate(
    (t) => ((window as unknown as { __events: { type: string }[] }).__events ?? []).filter((e) => e.type === t),
    type,
  ) as Promise<Record<string, unknown>[]>;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/player-host/index.html#n=e2e');
  await collectEvents(page);
});

test('demo mode renders a playing composition', async ({ page }) => {
  // beforeEach landed on the same URL with a different hash - force a real reload so
  // main.tsx re-evaluates the hash.
  await page.goto('/player-host/index.html#demo');
  await page.reload();
  await expect(page.getByTestId('demo-title')).toBeAttached();
});

test('loads a good module and reports loaded', async ({ page }) => {
  await post(page, { type: 'load', id: 1, compiledJs: GOOD_MODULE, settings: SETTINGS, inputProps: {}, assets: [], autoplay: false });
  await expect.poll(() => eventsOfType(page, 'loaded')).toHaveLength(1);
  // The module actually rendered frame 0.
  await expect(page.locator('text=frame 0')).toBeAttached();
});

test('reports eval errors for disallowed imports and missing default export', async ({ page }) => {
  await post(page, { type: 'load', id: 2, compiledJs: 'const axios = require("axios"); exports.default = () => null;', settings: SETTINGS, inputProps: {}, assets: [], autoplay: false });
  await expect.poll(async () => (await eventsOfType(page, 'load-error')).length).toBe(1);
  await post(page, { type: 'load', id: 3, compiledJs: 'exports.helper = 1;', settings: SETTINGS, inputProps: {}, assets: [], autoplay: false });
  await expect.poll(async () => (await eventsOfType(page, 'load-error')).length).toBe(2);
  const errors = await eventsOfType(page, 'load-error');
  expect(String(errors[0].message)).toContain('axios');
  expect(String(errors[1].message)).toContain('default-export');
});

test('reports a mount error and keeps the last good module', async ({ page }) => {
  await post(page, { type: 'load', id: 4, compiledJs: GOOD_MODULE, settings: SETTINGS, inputProps: {}, assets: [], autoplay: false });
  await expect.poll(() => eventsOfType(page, 'loaded')).toHaveLength(1);
  await post(page, { type: 'load', id: 5, compiledJs: 'exports.default = function C(){ throw new Error("boom at render"); };', settings: SETTINGS, inputProps: {}, assets: [], autoplay: false });
  await expect.poll(async () => (await eventsOfType(page, 'load-error')).length).toBe(1);
  const [err] = await eventsOfType(page, 'load-error');
  expect(err.phase).toBe('mount');
  expect(String(err.message)).toContain('boom at render');
  // The previous module is still mounted (frame 0 content visible again).
  await expect(page.locator('text=frame 0')).toBeAttached();
});

test('probe renders the requested frames and catches frame-specific errors', async ({ page }) => {
  // A clean module probes clean.
  await post(page, { type: 'load', id: 6, compiledJs: GOOD_MODULE, settings: SETTINGS, inputProps: {}, assets: [], autoplay: false });
  await expect.poll(() => eventsOfType(page, 'loaded')).toHaveLength(1);
  await post(page, { type: 'probe', id: 6, frames: [0, 45, 89] });
  await expect.poll(async () => (await eventsOfType(page, 'probe-result')).length).toBe(1);
  const [ok] = await eventsOfType(page, 'probe-result');
  expect(ok.ok).toBe(true);

  // A module that dies past frame 40 fails the mid/last-frame probe with frame numbers.
  await post(page, { type: 'load', id: 7, compiledJs: THROWS_AFTER_40, settings: SETTINGS, inputProps: {}, assets: [], autoplay: false });
  await expect.poll(() => eventsOfType(page, 'loaded')).toHaveLength(2);
  await post(page, { type: 'probe', id: 7, frames: [0, 45, 89] });
  await expect.poll(async () => (await eventsOfType(page, 'probe-result')).length).toBe(2);
  const results = await eventsOfType(page, 'probe-result');
  const bad = results[1] as { ok: boolean; errors: { frame: number; message: string }[] };
  expect(bad.ok).toBe(false);
  expect(bad.errors.some((e) => e.frame >= 41 && e.message.includes('dies after frame 40'))).toBe(true);
});
