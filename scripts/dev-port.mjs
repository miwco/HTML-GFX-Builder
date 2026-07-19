// One source of truth for the dev-server port. The main checkout keeps the classic 5174
// (5175 for the configured-mode live e2e suite); a linked git worktree gets a stable port
// derived from its path, so parallel worktrees never fight over the same server. Vite,
// both Playwright configs, the dev scripts (l3-sweep, ai-bench, ai-compare), and the
// Claude preview launch config (.claude/launch.json) all read the port from here.
//
// Override with DEV_PORT=n if two worktrees ever hash to the same port (vite runs with
// strictPort, so a collision fails loudly instead of drifting to a neighbour port).
// Run directly (`node scripts/dev-port.mjs`) to print this checkout's port and (re)write
// .claude/launch.json — package.json's postinstall does this on every npm install.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** True when this checkout is a linked git worktree (its .git is a pointer FILE, not a directory). */
function isWorktree() {
  try {
    return statSync(join(repoRoot, '.git')).isFile();
  } catch {
    return false; // no .git at all (tarball checkout) — behave like the main checkout
  }
}

/**
 * The dev-server port for this checkout: 5174 in the main checkout, else a stable
 * path-derived even port in the 5180–5298 block (odd neighbours are the live-suite ports).
 */
export function devPort() {
  if (process.env.DEV_PORT) return Number(process.env.DEV_PORT);
  if (!isWorktree()) return 5174;
  // djb2 over the lowercased absolute path — stable across runs, distinct across worktrees.
  let h = 5381;
  for (const c of repoRoot.toLowerCase()) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return 5180 + 2 * (h % 60);
}

/** The configured-mode (live e2e) server port — always the dev port's odd neighbour. */
export function livePort() {
  return devPort() + 1;
}

/**
 * (Re)write .claude/launch.json so the Claude preview tools start and find the dev server
 * on this checkout's port. The file is generated (gitignored), never hand-edited.
 * Returns true when the file was (re)written, false when it was already current.
 */
export function writeLaunchConfig() {
  const path = join(repoRoot, '.claude', 'launch.json');
  const json =
    JSON.stringify(
      {
        version: '0.0.1',
        configurations: [
          { name: 'dev', runtimeExecutable: 'npm', runtimeArgs: ['run', 'dev'], port: devPort() },
          // The video bench needs the SAME port with the backend vars blanked (.env.bench), so
          // the wizard shows the engine picker instead of a sign-in prompt. Generated here
          // because the preview tools are the only sanctioned way to start a server in this
          // repo - without it the bench has no way to get the server it documents needing.
          { name: 'dev-bench', runtimeExecutable: 'npm', runtimeArgs: ['run', 'dev:bench'], port: devPort() },
        ],
      },
      null,
      2,
    ) + '\n';
  if (existsSync(path) && readFileSync(path, 'utf8') === json) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, json);
  return true;
}

// CLI: sync launch.json and print the port (used by postinstall and by hand).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeLaunchConfig();
  console.log(devPort());
}
