// Build a kind:'remotion' render-manifest fixture with a hand-written compiled module -
// no browser or dev server needed (the module is plain CJS React.createElement code, the
// same shape the editor's sucrase compile emits). Drives the local render loop:
//
//   node scripts/make-remotion-manifest.mjs .render-dev/user.json [frames] [format] [fps] [scale]
//   node render-worker/cli.mjs .render-dev/user.json .render-dev/user.mp4
//
// The fixture animates a bar + counter from useCurrentFrame (deterministic), reads text
// from inputProps, and shows one tiny data-URL image asset - covering the module-eval,
// props, and asset paths of the worker's UserComposition.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [outPath, framesArg, formatArg, fpsArg, scaleArg] = process.argv.slice(2);
if (!outPath) {
  console.error('usage: node scripts/make-remotion-manifest.mjs <out.json> [frames=75] [format=mp4] [fps=25] [scale=1]');
  process.exit(1);
}
const durationInFrames = Number(framesArg ?? 75);
const format = formatArg ?? 'mp4';
const fps = Number(fpsArg ?? 25);
const scale = Number(scaleArg ?? 1);

// A 2x2 orange PNG as a data URL (the asset-delivery path).
const DOT_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEUlEQVR4nGP8//8/AwwwMSAAAD0lAwXULCcWAAAAAElFTkSuQmCC';

// Plain CJS, no JSX - what sucrase emits for a simple module.
const COMPILED_JS = `
"use strict";
const React = require('react');
const R = require('remotion');
exports.default = function Fixture(props) {
  const frame = R.useCurrentFrame();
  const cfg = R.useVideoConfig();
  const t = frame / cfg.durationInFrames;
  const barW = R.interpolate(frame, [0, cfg.durationInFrames * 0.6], [0, cfg.width * 0.6], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const assets = props.assets || {};
  return React.createElement(R.AbsoluteFill, {
    style: { background: '#101318', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' },
  },
    React.createElement('div', { style: { color: '#f4f4f5', fontSize: 72, fontWeight: 800 } },
      (props.title || 'FIXTURE') + ' f' + frame),
    React.createElement('div', {
      style: { width: barW, height: 12, background: '#f6a623', marginTop: 24, borderRadius: 6 },
    }),
    assets.dot ? React.createElement(R.Img, {
      src: assets.dot,
      style: { width: 48, height: 48, marginTop: 24, imageRendering: 'pixelated', opacity: 0.5 + t * 0.5 },
    }) : null
  );
};
`;

const manifest = {
  version: 2,
  kind: 'remotion',
  projectName: 'remotion-fixture',
  compiledJs: COMPILED_JS,
  inputProps: { title: 'FIXTURE', assets: { dot: DOT_PNG } },
  durationInFrames,
  transparent: format !== 'mp4',
  width: 1280,
  height: 720,
  fps,
  scale,
  output: { format },
};

mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`wrote ${outPath} — kind:remotion, ${durationInFrames} frames @ ${fps} fps, ${format}`);
