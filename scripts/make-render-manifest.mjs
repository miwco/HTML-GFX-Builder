// Generate a render-manifest fixture from a REAL catalog template — the l3-sweep pattern:
// drive the running dev server, import source modules in-page, write the manifest JSON.
//
//   node scripts/make-render-manifest.mjs <out.json> <variantId> [totalSec] [format] [fps] [scale] [createOptionsJson]
//
// e.g. node scripts/make-render-manifest.mjs .render-dev/lt01.json lt01 6 mp4
//      node scripts/make-render-manifest.mjs .render-dev/steps.json lt01 12 mp4 25 1 '{"animation":{"steps":true}}'
// Formats: mp4 | webm | png-still | png-sequence | prores4444
// The dev server must be running (npm run dev). epochMs is pinned to 0 so repeated renders
// of the same fixture are byte-comparable.

import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { devPort } from './dev-port.mjs';

const [out, variantId, totalSec = '6', format = 'mp4', fpsArg = '', scaleArg = '1', createOptionsJson = ''] = process.argv.slice(2);
if (!out || !variantId) {
  console.error('usage: node scripts/make-render-manifest.mjs <out.json> <variantId> [totalSec] [format] [fps] [scale] [createOptionsJson]');
  process.exit(1);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
  await page.goto(`http://localhost:${devPort()}/`, { waitUntil: 'domcontentloaded' });

  const manifest = await page.evaluate(async ({ variantId, totalMs, format, fps, scale, createOptions }) => {
    const { CATALOG } = await import('/src/templates/catalog.ts');
    const variant = Object.values(CATALOG).flat().find((v) => v.id === variantId);
    if (!variant) throw new Error(`unknown variant "${variantId}" — ids: ` +
      Object.values(CATALOG).flat().map((v) => v.id).join(', '));
    const tpl = variant.create(createOptions || undefined);
    const data = {};
    for (const f of tpl.fields) data[f.field] = f.value;
    const { buildRenderManifest } = await import('/src/render/buildManifest.ts');
    const { manifest, measured } = await buildRenderManifest(tpl, data, {
      format,
      totalDurationMs: totalMs,
      fps: fps || undefined,
      scale,
      epochMs: 0,
    });
    console.log('measured', JSON.stringify(measured));
    return manifest;
  }, {
    variantId, totalMs: Number(totalSec) * 1000, format,
    fps: Number(fpsArg) || 0, scale: Number(scaleArg) || 1,
    createOptions: createOptionsJson ? JSON.parse(createOptionsJson) : null,
  });

  const outPath = resolve(out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(manifest));
  const est = manifest.estimatedDurations;
  console.log(
    `${outPath}\n${variantId} ${format} ${manifest.width}x${manifest.height}@${manifest.fps} ` +
    `total ${totalSec}s — measured in ${est.inMs}ms, steps [${est.stepMs.join(', ')}], out ${est.outMs}ms` +
    `${est.continuous.in ? ' (continuous in)' : ''}${est.continuous.out ? ' (continuous out)' : ''}`,
  );
} finally {
  await browser.close();
}
