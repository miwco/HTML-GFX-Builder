#!/usr/bin/env node
// The Vercel Sandbox render worker — runs INSIDE the provisioned sandbox (cwd
// /vercel/sandbox), where createSandbox() has already pnpm-installed @remotion/renderer +
// @vercel/blob and addBundleToSandbox() placed the composition at
// /vercel/sandbox/remotion-bundle. Handles EVERY output format.
//
//   node noacg-job/sandbox-job.mjs <manifest.json> <progress.json> <blobPath>
//
// Why a worker script instead of @remotion/vercel's renderMediaOnVercel: that helper
// spawns the render with inputProps passed as a single CLI argument, and our manifest
// embeds the whole self-contained document (inlined GSAP + assets), which blows past the
// OS 128 KB single-argument limit (E2BIG). Reading the manifest from a FILE and calling
// @remotion/renderer programmatically passes inputProps in-process — no argv limit.
//
// Reports through the progress-file protocol the api reconciler reads:
//   { state, progress, renderedFrames?, encodedFrames?, totalFrames?, outputBytes?,
//     blobUrl?, contentType?, error? }
// Only @remotion/renderer, @vercel/blob, and node builtins are available in the sandbox,
// so the PNG-sequence zip is hand-rolled (no jszip dependency).

import { mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [manifestPath, progressPath, blobPath] = process.argv.slice(2);
const JOB_DIR = '/vercel/sandbox/noacg-job';
const SERVE_URL = '/vercel/sandbox/remotion-bundle';

let lastWrite = 0;
function writeProgress(snapshot, { force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastWrite < 1000) return;
  lastWrite = now;
  const tmp = progressPath + '.tmp';
  writeFileSync(tmp, JSON.stringify({ ...snapshot, updatedAt: now }));
  renameSync(tmp, progressPath);
}

// Per-format output file + content type (mirrors src/render/manifest.ts RENDER_FORMATS).
const OUT = {
  mp4: { ext: 'mp4', contentType: 'video/mp4' },
  webm: { ext: 'webm', contentType: 'video/webm' },
  prores4444: { ext: 'mov', contentType: 'video/quicktime' },
  'png-still': { ext: 'png', contentType: 'image/png' },
  'png-sequence': { ext: 'zip', contentType: 'application/zip' },
};

try {
  mkdirSync(JOB_DIR, { recursive: true }); // ensure the progress/output dir before first write
  writeProgress({ state: 'provisioning', progress: 0 }, { force: true });
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const format = manifest.output.format;
  const out = OUT[format];
  if (!out) throw new Error(`unknown render format: ${format}`);

  const { ensureBrowser, selectComposition, renderMedia, renderStill, renderFrames } = await import('@remotion/renderer');
  const { put } = await import('@vercel/blob');

  await ensureBrowser();
  const composition = await selectComposition({ serveUrl: SERVE_URL, id: 'noacg', inputProps: manifest });
  const totalFrames = composition.durationInFrames;

  const outputPath = `${JOB_DIR}/output.${out.ext}`;
  const common = {
    composition,
    serveUrl: SERVE_URL,
    inputProps: manifest,      // in-process — never a CLI argument
    scale: manifest.scale ?? 1,
    chromiumOptions: { gl: 'angle' },
  };
  const mediaProgress = ({ progress, renderedFrames, encodedFrames, stitchStage }) =>
    writeProgress({
      state: stitchStage === 'muxing' || encodedFrames > 0 ? 'encoding' : 'rendering',
      progress,
      renderedFrames,
      encodedFrames,
      totalFrames,
    });

  if (format === 'mp4') {
    await renderMedia({ ...common, codec: 'h264', imageFormat: 'png', crf: manifest.output.crf ?? undefined, outputLocation: outputPath, onProgress: mediaProgress });
  } else if (format === 'webm') {
    await renderMedia({ ...common, codec: manifest.output.vp9 ? 'vp9' : 'vp8', imageFormat: 'png', pixelFormat: 'yuva420p', crf: manifest.output.crf ?? undefined, outputLocation: outputPath, onProgress: mediaProgress });
  } else if (format === 'prores4444') {
    await renderMedia({ ...common, codec: 'prores', proResProfile: '4444', imageFormat: 'png', pixelFormat: 'yuva444p10le', outputLocation: outputPath, onProgress: mediaProgress });
  } else if (format === 'png-still') {
    const stillMs = manifest.output.stillTimeMs ?? manifest.timing.totalDurationMs / 2;
    const frame = Math.min(totalFrames - 1, Math.max(0, Math.round((stillMs / 1000) * manifest.fps)));
    writeProgress({ state: 'rendering', progress: 0.3, renderedFrames: 0, totalFrames: 1 }, { force: true });
    await renderStill({ ...common, imageFormat: 'png', frame, output: outputPath });
    writeProgress({ state: 'rendering', progress: 1, renderedFrames: 1, totalFrames: 1 }, { force: true });
  } else if (format === 'png-sequence') {
    const framesDir = `${JOB_DIR}/frames`;
    mkdirSync(framesDir, { recursive: true });
    await renderFrames({
      ...common,
      imageFormat: 'png',
      outputDir: framesDir,
      onStart: () => {},
      onFrameUpdate: (renderedFrames) =>
        writeProgress({ state: 'rendering', progress: (renderedFrames / totalFrames) * 0.8, renderedFrames, totalFrames }),
    });
    writeProgress({ state: 'encoding', progress: 0.85, renderedFrames: totalFrames, totalFrames }, { force: true });
    zipDirectoryStore(framesDir, outputPath, totalFrames, manifest.projectName);
  }

  writeProgress({ state: 'uploading', progress: 0.92, renderedFrames: totalFrames, totalFrames }, { force: true });
  const { size } = statSync(outputPath);
  const blob = await put(blobPath, readFileSync(outputPath), {
    access: 'public',
    contentType: out.contentType,
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  writeProgress(
    { state: 'complete', progress: 1, renderedFrames: totalFrames, totalFrames, outputBytes: size, blobUrl: blob.url, contentType: out.contentType },
    { force: true },
  );
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  writeProgress({ state: 'failed', progress: 0, error: { code: 'render_failed', message: message.slice(0, 2000) } }, { force: true });
  process.exit(1);
}

/** Zip a directory of renderFrames output as frame-00000.png … — STORE (no compression),
 *  hand-rolled so the sandbox needs no zip dependency. Local file headers + central
 *  directory, CRC-32 per entry, fixed timestamps (deterministic). */
function zipDirectoryStore(dir, outFile, totalFrames, projectName) {
  const pad = Math.max(5, String(Math.max(0, totalFrames - 1)).length);
  const folder = (String(projectName || 'frames').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'frames') + '/';

  const byFrame = new Map();
  for (const f of readdirSync(dir)) {
    const m = /(\d+)\.png$/.exec(f);
    if (m) byFrame.set(Number(m[1]), f);
  }
  const ordered = [...byFrame.keys()].sort((a, b) => a - b);

  const crcTable = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c;
  }
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  const locals = [];
  const centrals = [];
  let offset = 0;
  const entries = [['', null], ...ordered.map((frameNo, i) => [`frame-${String(i).padStart(pad, '0')}.png`, path.join(dir, byFrame.get(frameNo))])];
  for (const [name, file] of entries) {
    const entryName = Buffer.from(folder + name, 'utf8');
    const data = file ? readFileSync(file) : Buffer.alloc(0);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(0, 10);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(entryName.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, entryName, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(0, 12);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(entryName.length, 28);
    central.writeUInt32LE(0, 30);
    central.writeUInt32LE(0, 34);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, entryName]));
    offset += 30 + entryName.length + data.length;
  }

  const centralStart = offset;
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);
  writeFileSync(outFile, Buffer.concat([...locals, centralBuf, end]));
}
