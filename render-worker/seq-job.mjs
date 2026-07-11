#!/usr/bin/env node
// PNG-sequence job for the Vercel Sandbox executor. Runs INSIDE the provisioned sandbox
// (cwd /vercel/sandbox), where createSandbox() has already pnpm-installed
// @remotion/renderer + @vercel/blob and addBundleToSandbox() placed the composition at
// /vercel/sandbox/remotion-bundle — so this script has zero setup of its own.
//
//   node noacg-job/seq-job.mjs <manifest.json> <progress.json> <blobPath>
//
// Renders every frame as a transparent PNG, zips them (STORE — PNGs are already
// compressed) with zero-padded names, uploads the zip to Vercel Blob
// (BLOB_READ_WRITE_TOKEN env), and reports through the progress-file protocol the
// api reconciler reads: { state, progress, renderedFrames, totalFrames,
// outputBytes?, blobUrl?, contentType?, error? }.

import { mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [manifestPath, progressPath, blobPath] = process.argv.slice(2);

let lastWrite = 0;
function writeProgress(snapshot, { force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastWrite < 1000) return;
  lastWrite = now;
  const tmp = progressPath + '.tmp';
  writeFileSync(tmp, JSON.stringify({ ...snapshot, updatedAt: now }));
  renameSync(tmp, progressPath);
}

try {
  writeProgress({ state: 'provisioning', progress: 0 }, { force: true });
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const { selectComposition, renderFrames, ensureBrowser } = await import('@remotion/renderer');
  const { put } = await import('@vercel/blob');

  await ensureBrowser();
  const serveUrl = '/vercel/sandbox/remotion-bundle';
  const composition = await selectComposition({ serveUrl, id: 'noacg', inputProps: manifest });
  const totalFrames = composition.durationInFrames;

  const framesDir = '/vercel/sandbox/noacg-job/frames';
  mkdirSync(framesDir, { recursive: true });
  await renderFrames({
    composition,
    serveUrl,
    inputProps: manifest,
    imageFormat: 'png',
    scale: manifest.scale ?? 1,
    outputDir: framesDir,
    chromiumOptions: { gl: 'angle' },
    onStart: () => {},
    onFrameUpdate: (renderedFrames) =>
      writeProgress({ state: 'rendering', progress: (renderedFrames / totalFrames) * 0.8, renderedFrames, totalFrames }),
  });

  writeProgress({ state: 'encoding', progress: 0.82, renderedFrames: totalFrames, totalFrames }, { force: true });
  const zipFile = '/vercel/sandbox/noacg-job/frames.zip';
  zipDirectoryStore(framesDir, zipFile, totalFrames, manifest.projectName);

  writeProgress({ state: 'uploading', progress: 0.92, renderedFrames: totalFrames, totalFrames }, { force: true });
  const { size } = statSync(zipFile);
  const blob = await put(blobPath, readFileSync(zipFile), {
    access: 'public',
    contentType: 'application/zip',
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  writeProgress(
    { state: 'complete', progress: 1, renderedFrames: totalFrames, totalFrames, outputBytes: size, blobUrl: blob.url, contentType: 'application/zip' },
    { force: true },
  );
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  writeProgress({ state: 'failed', progress: 0, error: { code: 'render_failed', message: message.slice(0, 2000) } }, { force: true });
  process.exit(1);
}

/** Zip a directory of renderFrames output as frame-00000.png … — STORE (no compression),
 *  hand-rolled so the sandbox needs no zip dependency. Format: local file headers +
 *  central directory, CRC-32 per entry. */
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
    local.writeUInt16LE(20, 4);            // version needed
    local.writeUInt16LE(0, 6);             // flags
    local.writeUInt16LE(0, 8);             // method: STORE
    local.writeUInt32LE(0, 10);            // dos time/date (fixed: deterministic zips)
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
    central.writeUInt32LE(0, 30);          // extra/comment/disk/attrs (internal)
    central.writeUInt32LE(0, 34);          // external attrs
    central.writeUInt32LE(0, 38);          // (reserved split — kept zero)
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
