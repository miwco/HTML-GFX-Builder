// Replay a SAVED composition module through the real player host and print what the
// readability checks (src/video/textChecks.js) say about it, at the same HOLD frames the
// validator uses.
//
//   node scripts/probe-composition.mjs <file.tsx> [durationInFrames]
//
// Requires the dev server (this checkout's port). SPENDS NOTHING - it re-renders code that
// already exists, which makes it the tool for iterating on the checks themselves: run the
// bench once, then replay its whole output directory against a changed threshold as often
// as you like. That is how the zero-area blind spot was found and fixed (a bench logo
// reveal rendered a completely blank frame and every check scored it clean).

import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { transform } from 'sucrase';
import { devPort } from './dev-port.mjs';

const file = process.argv[2];
const frames = Number(process.argv[3] || 75);
const js = transform(readFileSync(file, 'utf8'), {
  transforms: ['typescript', 'jsx', 'imports'],
  jsxRuntime: 'automatic',
  production: true,
}).code;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`http://localhost:${devPort()}/player-host/index.html#n=e2e`);
await page.evaluate(() => {
  window.__events = [];
  window.addEventListener('message', (ev) => {
    if (ev.data && ev.data.channel === 'noacg-player' && ev.data.type === 'probe-result') {
      window.__events.push(ev.data);
    }
  });
});
const BASE = { channel: 'noacg-player', v: 2, nonce: 'e2e' };
const settings = { width: 1920, height: 1080, fps: 30, durationInFrames: frames };
const mid = Math.floor(frames / 2);
const later = Math.min(frames - 2, mid + Math.round(frames * 0.15));
await page.evaluate((m) => window.postMessage(m, '*'), {
  ...BASE, type: 'load', id: 1, compiledJs: js, settings, inputProps: {}, assets: [], autoplay: false,
});
await page.waitForTimeout(1500);
await page.evaluate((m) => window.postMessage(m, '*'), {
  ...BASE, type: 'probe', id: 1, frames: [0, mid, frames - 1], checkFrames: [mid, later],
});
await page.waitForTimeout(2500);
const res = await page.evaluate(() => window.__events);
console.log(`${file}  (checkFrames ${mid}, ${later})`);
console.log(JSON.stringify(res[0] ? res[0].textIssues : 'no probe result', null, 1));
await browser.close();
