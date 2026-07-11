#!/usr/bin/env node
// One render job with file-based progress — the executor protocol:
//   node job.mjs <manifest.json> <output-file> <progress.json>
// Writes progress.json (throttled ~1/s) through the job's life:
//   { state: 'provisioning'|'rendering'|'encoding'|'complete'|'failed',
//     progress: 0..1, renderedFrames, encodedFrames, totalFrames, outputBytes?, error? }
// The LocalExecutor spawns this directly; the Vercel Sandbox worker (worker.mjs) wraps it
// with Blob upload + the completion callback. Progress writes are atomic (tmp + rename)
// so a concurrent reader never sees a torn file.

import { readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { renderManifest } from './render.mjs';

const [manifestPath, outputPath, progressPath] = process.argv.slice(2);
if (!manifestPath || !outputPath || !progressPath) {
  console.error('usage: node job.mjs <manifest.json> <output-file> <progress.json>');
  process.exit(1);
}

let lastWrite = 0;
function writeProgress(snapshot, { force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastWrite < 1000) return;
  lastWrite = now;
  const tmp = progressPath + '.tmp';
  writeFileSync(tmp, JSON.stringify({ ...snapshot, updatedAt: now }));
  renameSync(tmp, progressPath);
}

writeProgress({ state: 'provisioning', progress: 0 }, { force: true });

try {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const { totalFrames } = await renderManifest(manifest, outputPath, {
    onProgress: ({ stage, progress, renderedFrames, encodedFrames, totalFrames }) => {
      writeProgress({
        state: stage === 'bundling' ? 'provisioning' : stage,
        progress,
        renderedFrames,
        encodedFrames,
        totalFrames,
      });
    },
  });
  const { size } = statSync(outputPath);
  writeProgress(
    { state: 'complete', progress: 1, renderedFrames: totalFrames, encodedFrames: totalFrames, totalFrames, outputBytes: size },
    { force: true },
  );
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  // The composition throws structured messages (unrenderable timing, graphic errors) —
  // pass them through so the UI can show the actual cause.
  writeProgress(
    { state: 'failed', progress: 0, error: { code: 'render_failed', message: message.slice(0, 2000) } },
    { force: true },
  );
  process.exit(1);
}
