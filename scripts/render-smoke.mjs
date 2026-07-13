// Full-loop render smoke test against the RUNNING dev server: build a tiny real manifest
// in-page, POST /api/render/start, poll /api/render/status to completion, download the
// file, verify it. Exercises the exact modules production deploys (handlers + executor +
// worker) with the local executor — no Vercel, no Supabase.
//
//   node scripts/render-smoke.mjs            (dev server must be running)

import { chromium } from '@playwright/test';
import { devPort } from './dev-port.mjs';

const BASE = `http://localhost:${devPort()}`;
const fail = (msg) => { console.error('SMOKE FAIL:', msg); process.exit(1); };

// 1) A small, fast manifest from a real catalog template (2 s, 640-wide via scale 1/3? no
//    — scale must stay 1: layout is authored at template resolution; short duration is
//    what keeps this quick).
const browser = await chromium.launch();
let manifest;
try {
  const page = await browser.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  manifest = await page.evaluate(async () => {
    const { CATALOG } = await import('/src/templates/catalog.ts');
    const v = Object.values(CATALOG).flat().find((x) => x.id === 'lt01');
    const tpl = v.create();
    const data = {};
    for (const f of tpl.fields) data[f.field] = f.value;
    const { buildRenderManifest } = await import('/src/render/buildManifest.ts');
    return (await buildRenderManifest(tpl, data, { format: 'mp4', totalDurationMs: 2000, epochMs: 0 })).manifest;
  });
} finally {
  await browser.close();
}
console.log(`manifest: ${manifest.projectName} ${manifest.output.format} ${(manifest.documentHtml.length / 1024).toFixed(0)} kB doc`);

// 2) start
const startRes = await fetch(`${BASE}/api/render/start`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ manifest }),
});
if (startRes.status !== 202) fail(`start -> ${startRes.status}: ${await startRes.text()}`);
const { jobId, jobToken, pollIntervalMs, totalFrames } = await startRes.json();
console.log(`job ${jobId} started (${totalFrames} frames)`);

// 3) poll to terminal
const t0 = Date.now();
let status;
for (;;) {
  if (Date.now() - t0 > 5 * 60_000) fail('timed out after 5 minutes');
  await new Promise((r) => setTimeout(r, pollIntervalMs));
  const res = await fetch(`${BASE}/api/render/status?id=${jobId}`, {
    headers: { authorization: `Bearer ${jobToken}` },
  });
  if (!res.ok) fail(`status -> ${res.status}: ${await res.text()}`);
  status = await res.json();
  console.log(`  ${status.state} ${status.percent}%` +
    (status.frames ? ` (${status.frames.rendered}/${status.frames.total})` : ''));
  if (['complete', 'failed', 'cancelled', 'expired'].includes(status.state)) break;
}
if (status.state !== 'complete') fail(`terminal state ${status.state}: ${JSON.stringify(status.error)}`);
if (!status.output?.url) fail('complete but no output url');

// 4) download and sanity-check the file
const dl = await fetch(`${BASE}${status.output.url}&token=${jobToken}`);
if (!dl.ok) fail(`download -> ${dl.status}`);
const buf = Buffer.from(await dl.arrayBuffer());
if (buf.byteLength < 10_000) fail(`file suspiciously small: ${buf.byteLength} bytes`);
if (buf.byteLength !== status.output.bytes) fail(`size mismatch: ${buf.byteLength} != ${status.output.bytes}`);
// MP4 sniff: 'ftyp' at offset 4.
if (buf.subarray(4, 8).toString('ascii') !== 'ftyp') fail('downloaded file is not an MP4');

// 5) wrong-token probes must 404
const bad = await fetch(`${BASE}/api/render/status?id=${jobId}`, { headers: { authorization: 'Bearer nope' } });
if (bad.status !== 404) fail(`bad token -> ${bad.status}, expected 404`);

console.log(`html-kind PASS: ${buf.byteLength} bytes in ${((Date.now() - t0) / 1000).toFixed(1)}s, token gating OK`);

// ── Phase 2: kind:'remotion' — an authored composition module through the same service ──

const { execFileSync } = await import('node:child_process');
const { readFileSync, mkdirSync } = await import('node:fs');
mkdirSync('.render-dev', { recursive: true });
execFileSync('node', ['scripts/make-remotion-manifest.mjs', '.render-dev/smoke-remotion.json', '40', 'mp4']);
const remotionManifest = JSON.parse(readFileSync('.render-dev/smoke-remotion.json', 'utf8'));

// The smoke submits 3 jobs total but the anonymous quota is 2/h - give each phase-2 job
// its own synthetic principal (ipHash reads x-forwarded-for; fine against the local dev
// server, which is the only place this script runs).
let smokeIp = 0;
const runJob = async (manifestBody) => {
  const res = await fetch(`${BASE}/api/render/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.99.0.${++smokeIp}` },
    body: JSON.stringify({ manifest: manifestBody }),
  });
  if (res.status !== 202) fail(`remotion start -> ${res.status}: ${await res.text()}`);
  const started = await res.json();
  const begun = Date.now();
  for (;;) {
    if (Date.now() - begun > 5 * 60_000) fail('remotion job timed out after 5 minutes');
    await new Promise((r) => setTimeout(r, started.pollIntervalMs));
    const s = await fetch(`${BASE}/api/render/status?id=${started.jobId}`, {
      headers: { authorization: `Bearer ${started.jobToken}` },
    });
    if (!s.ok) fail(`remotion status -> ${s.status}`);
    const st = await s.json();
    if (['complete', 'failed', 'cancelled', 'expired'].includes(st.state)) return { status: st, jobToken: started.jobToken };
  }
};

const rem = await runJob(remotionManifest);
if (rem.status.state !== 'complete') fail(`remotion terminal state ${rem.status.state}: ${JSON.stringify(rem.status.error)}`);
const remDl = await fetch(`${BASE}${rem.status.output.url}&token=${rem.jobToken}`);
const remBuf = Buffer.from(await remDl.arrayBuffer());
if (remBuf.subarray(4, 8).toString('ascii') !== 'ftyp') fail('remotion output is not an MP4');
console.log(`remotion-kind PASS: ${remBuf.byteLength} bytes`);

// A throwing module must FAIL the job with the real message (never hang or lie).
const broken = { ...remotionManifest, compiledJs: 'exports.default = function C(){ throw new Error("smoke boom"); };' };
const brk = await runJob(broken);
if (brk.status.state !== 'failed') fail(`broken module ended ${brk.status.state}, expected failed`);
if (!JSON.stringify(brk.status.error ?? {}).includes('boom') && !JSON.stringify(brk.status.error ?? {}).toLowerCase().includes('composition')) {
  fail(`broken module error lacks a useful message: ${JSON.stringify(brk.status.error)}`);
}
console.log('remotion failure-path PASS:', brk.status.error?.message?.slice(0, 80));

console.log('SMOKE PASS (html + remotion kinds)');
