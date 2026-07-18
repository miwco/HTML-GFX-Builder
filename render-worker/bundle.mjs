#!/usr/bin/env node
// Prebuild the Remotion composition bundle for the Vercel Sandbox executor.
// Runs in the DEPLOY build step (vercel.json buildCommand); the api functions ship the
// output via includeFiles and addBundleToSandbox() uploads it into each render sandbox —
// nothing of ours is npm-installed inside sandboxes.
//
//   node render-worker/bundle.mjs      -> render-worker/bundle/

import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync, rmSync } from 'node:fs';
import { bundle } from '@remotion/bundler';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// The bundled-font CSS module (gitignored, generated from public/fonts) must exist before
// the Remotion bundle imports it. Deploy runs this file with a fresh checkout, so generate
// it here too - postinstall does the same for local dev.
const genScript = path.join(HERE, '..', 'scripts', 'gen-video-font-css.mjs');
if (existsSync(genScript)) {
  console.log('generating bundled video fonts…');
  execSync(`node "${genScript}"`, { stdio: 'inherit' });
}

const outDir = path.join(HERE, 'bundle');
rmSync(outDir, { recursive: true, force: true });

const result = await bundle({
  entryPoint: path.join(HERE, 'remotion', 'index.ts'),
  outDir,
  onProgress: (p) => {
    if (p % 25 === 0) console.log(`bundling ${p}%`);
  },
});
console.log('Remotion bundle ready:', result);
