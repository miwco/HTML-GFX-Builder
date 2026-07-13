// SessionStart hook: sanity-check the session's checkout before any work happens.
//
// The client's "worktree" checkbox sometimes scaffolds .claude/worktrees/<name>/ WITHOUT
// running `git worktree add` - an unregistered stub whose file and git operations silently
// fall through to the primary checkout, where they can collide with other sessions' work
// (this has caused real cross-session clobbering; see the worktree notes in CLAUDE.md).
// This hook compares the session cwd against `git worktree list` and warns loudly when
// that is happening; otherwise it prints a one-line orientation (checkout, branch, and
// this checkout's dev/live ports). SessionStart stdout is added to the agent's context.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readHookInput } from './lib.mjs';

const input = await readHookInput();
const sessionCwd = normalize(input?.cwd ?? process.cwd());

// All registered checkouts, primary first (git worktree list order). Run from the session
// cwd: in an unregistered stub git walks up to the primary checkout, which is exactly the
// fall-through this hook exists to detect.
const roots = gitLines(['worktree', 'list', '--porcelain'], sessionCwd)
  .filter((line) => line.startsWith('worktree '))
  .map((line) => normalize(line.slice('worktree '.length)));
if (roots.length === 0) process.exit(0); // not a git checkout - nothing to check

// Sweep leftover EMPTY worktree folders. `git worktree remove` on Windows can't delete the
// folder while a session is cwd'd inside it, so it deregisters the worktree and empties the
// files but leaves the now-empty directory behind. Once that session ends the folder unlocks;
// the next session removes it here. Strictly conservative: only a COMPLETELY EMPTY,
// git-UNREGISTERED folder that isn't this session's own cwd is removed - a still-busy folder
// stays locked (rmdir throws, we skip it), and any non-empty stub is left for the warning below.
try {
  const worktreesDir = join(roots[0], '.claude', 'worktrees');
  if (existsSync(worktreesDir)) {
    for (const name of readdirSync(worktreesDir)) {
      const dir = normalize(join(worktreesDir, name));
      if (roots.some((r) => r.toLowerCase() === dir.toLowerCase())) continue; // a registered worktree
      if (dir.toLowerCase() === sessionCwd.toLowerCase()) continue; // never sweep our own cwd
      try {
        if (readdirSync(dir).length === 0) {
          rmdirSync(dir); // rmdir refuses a non-empty dir, so this can only remove an empty one
          console.log(`Cleaned up an empty leftover worktree folder: ${dir}`);
        }
      } catch {
        // Locked (a live session still owns it) or already gone - leave it and move on.
      }
    }
  }
} catch {
  // Cleanup is best-effort and must never block session start.
}

const isUnder = (path, root) => path.toLowerCase() === root.toLowerCase() || path.toLowerCase().startsWith(root.toLowerCase() + '/');

// An unregistered .claude/worktrees/<name> stub: the cwd names a worktree folder that git
// does not know about.
const stubRoot = sessionCwd.match(/^(.*?\/\.claude\/worktrees\/[^/]+)/i)?.[1];
if (stubRoot && !roots.some((root) => root.toLowerCase() === stubRoot.toLowerCase())) {
  console.log(
    `WARNING - worktree sanity check FAILED. This session's cwd (${sessionCwd}) sits under ` +
      '.claude/worktrees/ but is NOT a registered git worktree, so every file and git operation ' +
      `silently falls through to the primary checkout (${roots[0]}), which other sessions may be ` +
      'using concurrently. Do not edit anything yet. Fix first:\n' +
      "  1. If this session's branch already exists (git branch --list 'claude/*'), register the " +
      `folder onto it: git worktree add "${sessionCwd}" <branch> - this works on an empty directory.\n` +
      '  2. Otherwise create a real worktree with the EnterWorktree tool.\n' +
      '  3. If the folder is unexpectedly non-empty, another session may own it - check before touching it.',
  );
  process.exit(0);
}

// Registered checkout: print a short orientation line. The checkout root is the most
// specific registered root containing the cwd (the primary root contains the linked
// worktrees' paths, so longest match wins).
const root = roots.filter((r) => isUnder(sessionCwd, r)).sort((a, b) => b.length - a.length)[0];
if (!root) process.exit(0); // cwd outside every checkout (shouldn't happen) - stay quiet

const branch = gitLines(['rev-parse', '--abbrev-ref', 'HEAD'], root)[0] ?? 'unknown';
const branchLabel = branch === 'HEAD' ? 'detached HEAD' : `branch ${branch}`;
const kind = root.toLowerCase() === roots[0].toLowerCase() ? 'primary checkout' : 'linked worktree';
let ports = '';
try {
  // This checkout's copy computes the port from its own location - correct per-worktree.
  const devPortModule = join(root, 'scripts', 'dev-port.mjs');
  if (existsSync(devPortModule)) {
    const { devPort, livePort } = await import(pathToFileURL(devPortModule));
    ports = ` - dev port ${devPort()}, live e2e port ${livePort()}`;
  }
} catch {
  // older checkout without the module - skip the port info
}
console.log(`Checkout: ${root} (${kind}, ${branchLabel})${ports}.`);
process.exit(0);

/** Run git with the given args in `cwd` and return stdout as trimmed lines. */
function gitLines(args, cwd) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (res.status !== 0 || typeof res.stdout !== 'string') return [];
  return res.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
}

/** Absolute path with forward slashes, for cross-checkout comparison on Windows. */
function normalize(path) {
  return resolve(path).replaceAll('\\', '/');
}
