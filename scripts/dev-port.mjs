// One source of truth for the dev-server port. The main checkout keeps the classic 5174
// (5175 for the configured-mode live e2e suite); a linked git worktree gets a port from the
// approved 5180-5298 block, PREFERRED by a hash of its path and RESERVED through the shared
// registry in scripts/port-registry.mjs, so parallel worktrees never fight over one server.
// Vite, both Playwright configs, the dev scripts (l3-sweep, ai-bench, ai-compare), the guard
// hooks, and the Claude preview launch config (.claude/launch.json) all read the port here.
//
// The hash alone used to BE the port, and it collided: six worktrees on one machine, three of
// them on 5258, and only the first could start (vite runs with strictPort, and the repo guards
// correctly refuse a hand-started server or a hand-edited launch.json). The hash is now only a
// preference; the registry turns it into an assignment. See docs/DEV_PORTS.md.
//
// The resolved value is published in two generated, gitignored files - .claude/dev-port.json
// (the record: port, live port, preference, and which ticket backs it) and .claude/launch.json
// (what the preview tools start). Both are rewritten from the same resolution, never by hand.
//
// DEV_PORT=n still overrides everything, for the rare case where a specific number is needed;
// it takes no reservation, so it is a local escape hatch, not an assignment.
//
// CLI:
//   node scripts/dev-port.mjs            print this checkout's port, sync the generated files
//   node scripts/dev-port.mjs --json     print the full record
//   node scripts/dev-port.mjs --list     show every reservation in the repo and who holds it
//   node scripts/dev-port.mjs --prune    drop reservations whose worktree is gone
//   node scripts/dev-port.mjs --release  give this checkout's reservation back

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PORT_RANGE_LABEL,
  allocatePort,
  listTickets,
  normalizeRoot,
  pruneStaleReservations,
  releaseReservation,
  sameRoot,
  ticketPath,
} from './port-registry.mjs';
import { worktreeRoots } from './worktree-cleanup-lib.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The main checkout's fixed pair - it is unique per machine, so it needs no reservation. */
const PRIMARY_PORT = 5174;

/** True when this checkout is a linked git worktree (its .git is a pointer FILE, not a directory). */
function isWorktree() {
  try {
    return statSync(join(repoRoot, '.git')).isFile();
  } catch {
    return false; // no .git at all (tarball checkout) — behave like the main checkout
  }
}

/**
 * The repo's SHARED git directory - the primary checkout's .git, reached from any worktree.
 * That is where the port registry lives: visible to every worktree of this repo and to nothing
 * else, and it disappears with the repo. Returns null when this is not a git checkout.
 */
export function gitCommonDir() {
  const dotGit = join(repoRoot, '.git');
  let stat;
  try {
    stat = statSync(dotGit);
  } catch {
    return null;
  }
  if (stat.isDirectory()) return normalizeRoot(dotGit);
  // A linked worktree's .git is a pointer file: "gitdir: <common>/worktrees/<name>".
  const match = /^gitdir:\s*(.+)$/m.exec(readFileSync(dotGit, 'utf8'));
  if (!match) return null;
  return normalizeRoot(dirname(dirname(resolve(repoRoot, match[1].trim()))));
}

/** The shared reservation directory, or null outside a git checkout. */
export function registryDir() {
  const common = gitCommonDir();
  return common ? join(common, 'noacg-dev-ports') : null;
}

/**
 * "Is that checkout still live?" - the definition the registry reclaims stale tickets by.
 * A REGISTERED git worktree is live, whether or not its server is running; anything else is
 * gone. When git cannot answer we fall back to "the directory still exists", which errs
 * towards leaving other people's reservations alone.
 *
 * The `git worktree list` call is deferred to the first question asked, because the common
 * case - a reservation this checkout already holds - never asks one, and this module is
 * imported by a hook that runs on every shell command.
 */
function makeIsRootActive() {
  let live;
  let loaded = false;
  return (path) => {
    if (!loaded) {
      const roots = worktreeRoots(repoRoot);
      live = roots.length === 0 ? null : new Set(roots.map((r) => normalizeRoot(r).toLowerCase()));
      loaded = true;
    }
    // git unavailable: assume any checkout still on disk is live, so we never steal a port.
    return live === null ? existsSync(path) : live.has(normalizeRoot(path).toLowerCase());
  };
}

/**
 * Synchronous port probe. Resolution has to stay synchronous (vite.config and the Playwright
 * configs read the port while building their config object), and there is no sync socket API -
 * so the probe runs as a child process. Both ports of a candidate pair go in one spawn, and
 * results are cached, so a normal run (reservation already exists) spawns nothing at all.
 */
const busyCache = new Map();
function isPortBusySync(port) {
  if (busyCache.has(port)) return busyCache.get(port);
  const probe = join(repoRoot, 'scripts', 'port-probe.mjs');
  const res = spawnSync(process.execPath, [probe, String(port), String(port + 1)], { encoding: 'utf8' });
  let map = {};
  if (res.status === 0 && typeof res.stdout === 'string') {
    try {
      map = JSON.parse(res.stdout);
    } catch {
      map = {}; // unreadable probe output - treat as free rather than blocking allocation
    }
  }
  for (const [key, value] of Object.entries(map)) busyCache.set(Number(key), value === true);
  return busyCache.get(port) ?? false;
}

let resolved = null;

/**
 * This checkout's full port record: `{ port, livePort, preferred, source, root, ticket }`.
 * Resolved once per process, then published to .claude/dev-port.json.
 */
export function devPorts() {
  if (!resolved) {
    resolved = resolvePorts();
    writePortRecord(resolved);
  }
  return resolved;
}

function resolvePorts() {
  if (process.env.DEV_PORT) {
    const port = Number(process.env.DEV_PORT);
    return { port, livePort: port + 1, preferred: port, source: 'DEV_PORT override', root: normalizeRoot(repoRoot), ticket: null };
  }
  const dir = registryDir();
  if (!isWorktree() || !dir) {
    return {
      port: PRIMARY_PORT,
      livePort: PRIMARY_PORT + 1,
      preferred: PRIMARY_PORT,
      source: 'primary checkout',
      root: normalizeRoot(repoRoot),
      ticket: null,
    };
  }
  const ticket = allocatePort({
    root: repoRoot,
    registryDir: dir,
    isRootActive: makeIsRootActive(),
    isPortBusy: isPortBusySync,
  });
  return {
    port: ticket.port,
    livePort: ticket.livePort,
    preferred: ticket.preferred,
    source: ticket.reused ? 'reservation' : 'new reservation',
    root: normalizeRoot(repoRoot),
    ticket: ticketPath(dir, ticket.port),
  };
}

/**
 * The dev-server port for this checkout: 5174 in the main checkout, else this worktree's
 * reserved port from the approved 5180-5298 block.
 */
export function devPort() {
  return devPorts().port;
}

/** The configured-mode (live e2e) server port — always the dev port's odd neighbour. */
export function livePort() {
  return devPorts().livePort;
}

/** Write a generated JSON file only when its content would actually change. Returns true if written. */
function writeIfChanged(path, json) {
  if (existsSync(path) && readFileSync(path, 'utf8') === json) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, json);
  return true;
}

/**
 * Publish the resolved record to .claude/dev-port.json - the worktree-specific place any tool
 * (or a human troubleshooting) can read the ACTUAL port without importing this module. It is a
 * mirror of the reservation, rewritten from it on every resolution, never authoritative on its
 * own: the ticket in the shared registry is what decides.
 */
export function writePortRecord(record = devPorts()) {
  return writeIfChanged(join(repoRoot, '.claude', 'dev-port.json'), JSON.stringify(record, null, 2) + '\n');
}

/**
 * (Re)write .claude/launch.json so the Claude preview tools start and find the dev server
 * on this checkout's port. The file is generated (gitignored), never hand-edited.
 * Returns true when the file was (re)written, false when it was already current.
 */
export function writeLaunchConfig() {
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
  return writeIfChanged(join(repoRoot, '.claude', 'launch.json'), json);
}

/**
 * Drop reservations whose worktree git no longer knows about. Safe to call from anywhere: an
 * active checkout's ticket is never touched, and no process is ever signalled.
 */
export function pruneStalePorts({ includeCorrupt = false } = {}) {
  const dir = registryDir();
  if (!dir) return [];
  return pruneStaleReservations({ registryDir: dir, isRootActive: makeIsRootActive(), includeCorrupt });
}

// CLI ------------------------------------------------------------------------------------

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const flag = process.argv[2] ?? '';
  const dir = registryDir();

  if (flag === '--list') {
    if (!dir) {
      console.log('Not a git checkout - no port registry.');
    } else {
      const isActive = makeIsRootActive();
      const tickets = listTickets(dir);
      console.log(`Dev-port reservations (${dir}), approved range ${PORT_RANGE_LABEL}:`);
      if (tickets.length === 0) console.log('  (none)');
      for (const t of tickets) {
        if (t.corrupt) {
          console.log(`  ${t.port}  UNREADABLE reservation - clear with --prune`);
          continue;
        }
        const marks = [isActive(t.root) ? 'active' : 'STALE'];
        if (sameRoot(t.root, repoRoot)) marks.push('this checkout');
        if (t.preferred !== t.port) marks.push(`preferred ${t.preferred}`);
        console.log(`  ${t.port} (live ${t.livePort})  ${t.root}  [${marks.join(', ')}]`);
      }
    }
  } else if (flag === '--prune') {
    const removed = pruneStalePorts({ includeCorrupt: true });
    console.log(removed.length === 0 ? 'No stale reservations.' : `Released ${removed.map((t) => t.port).join(', ')}.`);
  } else if (flag === '--release') {
    if (!dir) {
      console.log('Not a git checkout - nothing to release.');
    } else {
      const released = releaseReservation(dir, repoRoot);
      console.log(released.length === 0 ? 'This checkout holds no reservation.' : `Released ${released.join(', ')}.`);
    }
  } else if (flag === '--json') {
    writeLaunchConfig();
    console.log(JSON.stringify(devPorts(), null, 2));
  } else {
    // Default: sync the generated files and print the port (postinstall, and by hand).
    writeLaunchConfig();
    console.log(devPort());
  }
}
