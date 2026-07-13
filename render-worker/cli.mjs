#!/usr/bin/env node
// Local render runner: node cli.mjs <manifest.json> <output-file>
// The output extension should match the manifest's format (mp4/webm/mov/png/zip).
// Generate a manifest from a real catalog template with scripts/make-render-manifest.mjs
// (dev server must be running).

import { readFileSync } from 'node:fs';
import { renderManifest } from './render.mjs';

const [manifestPath, outputPath] = process.argv.slice(2);
if (!manifestPath || !outputPath) {
  console.error('usage: node cli.mjs <manifest.json> <output-file>');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const durSec =
  manifest.kind === 'remotion'
    ? manifest.durationInFrames / manifest.fps
    : manifest.timing.totalDurationMs / 1000;
console.log(
  `Rendering "${manifest.projectName}" (${manifest.kind ?? 'html'}) — ${manifest.output.format}, ` +
  `${manifest.width}x${manifest.height}@${manifest.fps} x${manifest.scale}, ` +
  `${durSec.toFixed(1)}s`,
);

const t0 = Date.now();
let lastLine = '';
const { totalFrames } = await renderManifest(manifest, outputPath, {
  onProgress: ({ stage, progress, renderedFrames, totalFrames }) => {
    const line = `${stage} ${(progress * 100).toFixed(0)}%` +
      (renderedFrames != null && totalFrames ? ` (${renderedFrames}/${totalFrames} frames)` : '');
    if (line !== lastLine) { console.log(line); lastLine = line; }
  },
});
console.log(`Done: ${outputPath} (${totalFrames} frames, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
