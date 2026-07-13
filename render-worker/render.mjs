// The render engine — manifest in, media file out. Shared by cli.mjs (local runs, the
// dev-loop executor) and worker.mjs (Vercel Sandbox). All codec settings follow Remotion's
// official transparent-video guidance (https://www.remotion.dev/docs/transparent-videos);
// this switch is the runtime mirror of the RENDER_FORMATS table in src/render/manifest.ts.

import { bundle } from '@remotion/bundler';
import { ensureBrowser, renderFrames, renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Bundle the Remotion project once per process (webpack, ~10-30 s cold). */
let serveUrlPromise = null;
export function bundleProject() {
  serveUrlPromise ??= bundle({
    entryPoint: path.join(HERE, 'remotion', 'index.ts'),
    onProgress: () => {},
  });
  return serveUrlPromise;
}

/**
 * Render a manifest to outputPath (extension must match the format).
 * onProgress({ stage, progress, renderedFrames, encodedFrames, totalFrames }) — stage is
 * 'bundling' | 'rendering' | 'encoding'; progress is 0..1 within the whole job.
 */
export async function renderManifest(manifest, outputPath, { onProgress = () => {} } = {}) {
  await ensureBrowser();
  onProgress({ stage: 'bundling', progress: 0 });
  const serveUrl = await bundleProject();

  // kind:'remotion' = an authored composition module (video editor); everything else is
  // the classic html render document. Same engine, same formats - just the composition.
  const compositionId = manifest.kind === 'remotion' ? 'noacg-user' : 'noacg';
  const composition = await selectComposition({ serveUrl, id: compositionId, inputProps: manifest });
  const totalFrames = composition.durationInFrames;
  mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });

  const common = {
    composition,
    serveUrl,
    inputProps: manifest,
    scale: manifest.scale ?? 1,
    chromiumOptions: { gl: 'angle' },
  };

  const mediaProgress = ({ progress, renderedFrames, encodedFrames, stitchStage }) => {
    onProgress({
      stage: stitchStage === 'muxing' || encodedFrames > 0 ? 'encoding' : 'rendering',
      progress,
      renderedFrames,
      encodedFrames,
      totalFrames,
    });
  };

  const format = manifest.output.format;
  if (format === 'mp4') {
    await renderMedia({
      ...common,
      codec: 'h264',
      imageFormat: 'png', // broadcast gradients/glows band under jpeg capture
      crf: manifest.output.crf,
      outputLocation: outputPath,
      onProgress: mediaProgress,
    });
  } else if (format === 'webm') {
    await renderMedia({
      ...common,
      codec: manifest.output.vp9 ? 'vp9' : 'vp8',
      imageFormat: 'png',
      pixelFormat: 'yuva420p', // the official alpha-in-WebM setting
      crf: manifest.output.crf,
      outputLocation: outputPath,
      onProgress: mediaProgress,
    });
  } else if (format === 'prores4444') {
    await renderMedia({
      ...common,
      codec: 'prores',
      proResProfile: '4444',
      imageFormat: 'png',
      pixelFormat: 'yuva444p10le', // 4444 with real alpha
      outputLocation: outputPath,
      onProgress: mediaProgress,
    });
  } else if (format === 'png-still') {
    const defaultStillMs =
      manifest.kind === 'remotion'
        ? (totalFrames / 2 / manifest.fps) * 1000 // the middle frame
        : manifest.timing.totalDurationMs / 2;
    const stillMs = manifest.output.stillTimeMs ?? defaultStillMs;
    const frame = Math.min(totalFrames - 1, Math.max(0, Math.round((stillMs / 1000) * manifest.fps)));
    onProgress({ stage: 'rendering', progress: 0.2, renderedFrames: 0, totalFrames: 1 });
    await renderStill({ ...common, imageFormat: 'png', frame, output: outputPath });
    onProgress({ stage: 'rendering', progress: 1, renderedFrames: 1, totalFrames: 1 });
  } else if (format === 'png-sequence') {
    const framesDir = mkdtempSync(path.join(tmpdir(), 'noacg-frames-'));
    try {
      await renderFrames({
        ...common,
        imageFormat: 'png',
        outputDir: framesDir,
        onStart: () => {},
        onFrameUpdate: (renderedFrames) =>
          onProgress({ stage: 'rendering', progress: (renderedFrames / totalFrames) * 0.8, renderedFrames, totalFrames }),
      });
      onProgress({ stage: 'encoding', progress: 0.85, renderedFrames: totalFrames, totalFrames });
      await zipFrames(framesDir, outputPath, totalFrames, manifest.projectName);
      onProgress({ stage: 'encoding', progress: 1, renderedFrames: totalFrames, totalFrames });
    } finally {
      rmSync(framesDir, { recursive: true, force: true });
    }
  } else {
    throw new Error(`unknown render format: ${format}`);
  }

  return { totalFrames };
}

/** Zip renderFrames output as frame-00000.png … (zero-padded, deterministic order). */
async function zipFrames(framesDir, outputPath, totalFrames, projectName) {
  const pad = Math.max(5, String(Math.max(0, totalFrames - 1)).length);
  const zip = new JSZip();
  const folder = zip.folder(sanitize(projectName) || 'frames');
  const files = readdirSync(framesDir).filter((f) => f.endsWith('.png'));
  // renderFrames names files element-<frame>.png — index them by their frame number.
  const byFrame = new Map();
  for (const f of files) {
    const m = /(\d+)\.png$/.exec(f);
    if (m) byFrame.set(Number(m[1]), f);
  }
  const ordered = [...byFrame.keys()].sort((a, b) => a - b);
  ordered.forEach((frameNo, i) => {
    const name = `frame-${String(i).padStart(pad, '0')}.png`;
    folder.file(name, readFileSync(path.join(framesDir, byFrame.get(frameNo))));
  });
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' }); // PNGs are already compressed
  writeFileSync(outputPath, buf);
}

function sanitize(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
