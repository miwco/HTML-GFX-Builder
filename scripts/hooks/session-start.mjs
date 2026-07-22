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
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readHookInput } from './lib.mjs';
import { reattachMainIfSafe } from '../reattach-main.mjs';
import { sweepEmptyLeftoverFolders } from '../worktree-cleanup-lib.mjs';

const input = await readHookInput();
const sessionCwd = normalize(input?.cwd ?? process.cwd());

// All registered checkouts, primary first (git worktree list order). Run from the session
// cwd: in an unregistered stub git walks up to the primary checkout, which is exactly the
// fall-through this hook exists to detect.
const roots = gitLines(['worktree', 'list', '--porcelain'], sessionCwd)
  .filter((line) => line.startsWith('worktree '))
  .map((line) => normalize(line.slice('worktree '.length)));
if (roots.length === 0) process.exit(0); // not a git checkout - nothing to check

// Sweep leftover EMPTY worktree folders (shared rule with /cleanup-worktrees). `git worktree
// remove` on Windows can't delete the folder while a session is cwd'd inside it, so it
// deregisters the worktree and empties the files but leaves the now-empty directory behind.
// Once that session ends the folder unlocks; the next session removes it here. The helper is
// strictly conservative: only a COMPLETELY EMPTY, git-UNREGISTERED folder that isn't this
// session's own cwd is removed - a still-busy folder stays locked, and any non-empty stub is
// left for the warning below.
const { removed } = sweepEmptyLeftoverFolders({
  primaryRoot: roots[0],
  registeredRoots: roots,
  protect: [sessionCwd],
});
for (const dir of removed) {
  console.log(`Cleaned up an empty leftover worktree folder: ${dir}`);
}

// Keep the primary checkout on `main` - it is our canonical main worktree. The client parks
// it on a detached HEAD (same commit, off the branch) whenever it spins up a linked worktree,
// so `main` drifts off the root. Reattach it whenever that is unambiguously safe; the single
// shared definition of "safe" lives in scripts/reattach-main.mjs (also used by /safe-merge).
// This never touches a dirty tree, real detached work, or a main that is checked out elsewhere.
try {
  const { assessment, message } = reattachMainIfSafe(roots[0]);
  if (message) {
    console.log(message);
  } else if (assessment.detached && !assessment.safe) {
    console.log(
      `Note: the primary checkout (${roots[0]}) is on a detached HEAD and was left as-is - ` +
        `${assessment.reason}. Reattach it to main manually once that clears.`,
    );
  }
} catch {
  // Self-heal is best-effort and must never block session start.
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
  // This checkout's copy resolves the port from its own location - correct per-worktree.
  const devPortModule = join(root, 'scripts', 'dev-port.mjs');
  if (existsSync(devPortModule)) {
    const { devPorts, pruneStalePorts } = await import(pathToFileURL(devPortModule));
    // Reservations outlive the worktrees that took them (a removed worktree cannot give its
    // own port back). Session start is where the registry gets swept, same as the folders.
    const released = pruneStalePorts?.() ?? [];
    if (released.length > 0) {
      console.log(`Released dev-port reservations left by removed worktrees: ${released.map((t) => t.port).join(', ')}.`);
    }
    const record = devPorts();
    ports = ` - dev port ${record.port}, live e2e port ${record.livePort}`;
    // Say so when the deterministic preference was taken: the number is still stable, but it
    // is not the one the path hashes to, and that is worth seeing before debugging a URL.
    if (record.preferred !== record.port) ports += ` (preferred ${record.preferred} was taken)`;
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
