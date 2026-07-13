// Build the Remotion Player host (player-host/) into public/player-host/ so the app can
// serve it as a plain static asset in dev, preview, and production. Hash-guarded: a no-op
// when neither the host sources nor its lockfile changed, so postinstall stays fast.
//
// The host is its own npm package (like render-worker/) so the Remotion dependency never
// enters the AGPL app bundle - see player-host/package.json. Run with --force to rebuild
// unconditionally.

import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hostDir = join(root, 'player-host');
const outDir = join(root, 'public', 'player-host');
const hashFile = join(outDir, '.build-hash');
const force = process.argv.includes('--force');

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      yield* walk(p);
    } else {
      yield p;
    }
  }
}

function sourceHash() {
  const h = createHash('sha256');
  const files = [...walk(join(hostDir, 'src')), join(hostDir, 'index.html'), join(hostDir, 'vite.config.ts'), join(hostDir, 'package.json')];
  const lock = join(hostDir, 'package-lock.json');
  if (existsSync(lock)) files.push(lock);
  for (const f of files.sort()) {
    h.update(f.slice(hostDir.length));
    h.update(readFileSync(f));
  }
  return h.digest('hex');
}

const hash = sourceHash();
const built = existsSync(join(outDir, 'index.html'));
const prev = existsSync(hashFile) ? readFileSync(hashFile, 'utf8').trim() : null;

if (!force && built && prev === hash) {
  console.log('[player-host] up to date');
  process.exit(0);
}

const run = (cmd) => {
  console.log(`[player-host] ${cmd}`);
  execSync(cmd, { cwd: hostDir, stdio: 'inherit' });
};

// npm ci needs a lockfile; the first-ever build (or a dep change) falls back to install.
const hasLock = existsSync(join(hostDir, 'package-lock.json'));
const hasModules = existsSync(join(hostDir, 'node_modules'));
if (!hasModules) run(hasLock ? 'npm ci' : 'npm install');
run('npm run build');

if (!statSync(join(outDir, 'index.html')).isFile()) {
  console.error('[player-host] build produced no index.html');
  process.exit(1);
}

// Inline the (single) JS chunk into index.html. LOAD-BEARING: the host runs in a
// sandboxed iframe WITHOUT allow-same-origin, so its origin is opaque ('null') - and
// module <script src> fetches are CORS-mode requests, which every ordinary static server
// rejects for a null origin. Inlining means the page needs zero subresource fetches and
// works under any server with no header configuration.
const indexPath = join(outDir, 'index.html');
let html = readFileSync(indexPath, 'utf8');
html = html.replace(/<script type="module"[^>]*src="\.\/(assets\/[^"]+)"[^>]*><\/script>/g, (_, rel) => {
  const js = readFileSync(join(outDir, rel), 'utf8')
    // Escape sequences that would terminate/confuse the inline script context.
    .replaceAll('</script', '<\\/script')
    .replaceAll('<!--', '<\\!--');
  return `<script type="module">${js}</script>`;
});
if (/src="\.\/assets\//.test(html)) {
  console.error('[player-host] inlining failed - external asset references remain');
  process.exit(1);
}
writeFileSync(indexPath, html);
rmSync(join(outDir, 'assets'), { recursive: true, force: true });

mkdirSync(outDir, { recursive: true });
writeFileSync(hashFile, sourceHash());
console.log('[player-host] built into public/player-host/ (single self-contained page)');
