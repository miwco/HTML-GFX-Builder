// The dev-server PORT REGISTRY - how a checkout gets a port it can actually start on.
//
// WHY THIS EXISTS. The port is derived from the checkout path (deterministic, so a worktree
// keeps its number across restarts and every tool derives it independently without talking to
// anything). But a hash over 60 slots collides: with six worktrees on one machine, three
// hashed to the same port, and only the first could start - vite runs with strictPort, and the
// repo guards correctly refuse a hand-started server, a hand-picked port, or an edited
// launch.json. So the derived port is a PREFERENCE; this registry turns it into an ASSIGNMENT.
//
// SHAPE. One ticket FILE per reserved port, in the repo's shared git dir
// (<git-common-dir>/noacg-dev-ports/), which every worktree of the repo - and only this repo -
// can see:
//
//   5202.json  ->  { port, livePort, root, preferred, createdAt }
//
// A ticket is created with the exclusive 'wx' flag. That is the entire concurrency story: the
// filesystem, not a lock we would have to police, decides who won when two worktrees start in
// the same instant. The loser gets EEXIST and walks to the next candidate.
//
// OWNERSHIP RULES, all in one place:
//   - A ticket naming an ACTIVE worktree is untouchable, whether or not its server is running.
//     A worktree owns its port for as long as it exists; that is what keeps the number stable.
//   - A ticket naming a worktree git no longer knows about is STALE and is reclaimed.
//   - A ticket we cannot parse blocks its slot but is never auto-deleted (a torn read during
//     someone else's write must not cost them their port). `--prune` clears those explicitly.
//   - A port that answers TCP while nobody holds a ticket for it belongs to something outside
//     this repo - a zombie server from a removed worktree, or an unrelated app. We give our
//     claim back and walk on. We never touch the process: killing another session's server is
//     the exact failure this mechanism exists to prevent.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** The approved dev-port block: even ports 5180-5298. Each odd neighbour is that port's live-e2e port. */
export const PORT_RANGE = Object.freeze({ first: 5180, last: 5298, stride: 2 });

/** How many ports the block holds (60). */
export const SLOT_COUNT = (PORT_RANGE.last - PORT_RANGE.first) / PORT_RANGE.stride + 1;

/** The fallback walk's stride in SLOTS. Coprime with SLOT_COUNT, so the walk visits every slot exactly once. */
const WALK_STEP = 7;

/** Human-readable form of the approved range, for error messages. */
export const PORT_RANGE_LABEL = `${PORT_RANGE.first}-${PORT_RANGE.last}`;

/** Absolute path with forward slashes, so tickets compare across Windows/posix spellings. */
export function normalizeRoot(path) {
  return resolve(path).replaceAll('\\', '/');
}

/** Case-insensitive checkout-path equality (Windows filesystems are case-insensitive). */
export function sameRoot(a, b) {
  return normalizeRoot(a).toLowerCase() === normalizeRoot(b).toLowerCase();
}

/** The slot a checkout path prefers: djb2 over the lowercased path - stable across runs. */
export function preferredSlot(root) {
  let h = 5381;
  for (const c of normalizeRoot(root).toLowerCase()) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return h % SLOT_COUNT;
}

/** The port a checkout path prefers, before any collision handling. */
export function preferredPort(root) {
  return PORT_RANGE.first + PORT_RANGE.stride * preferredSlot(root);
}

/** The k-th candidate port for a checkout: its preference first, then a full deterministic walk. */
export function candidatePort(root, k) {
  const slot = (preferredSlot(root) + k * WALK_STEP) % SLOT_COUNT;
  return PORT_RANGE.first + PORT_RANGE.stride * slot;
}

/** Path of the ticket file that reserves `port`. */
export function ticketPath(registryDir, port) {
  return join(registryDir, `${port}.json`);
}

/**
 * The ticket reserving `port`, or null when the slot is free.
 * A file that exists but does not parse into a valid ticket comes back as
 * `{ port, corrupt: true }` - occupied, but never silently reclaimed.
 */
export function readTicket(registryDir, port) {
  const path = ticketPath(registryDir, port);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof parsed?.root !== 'string' || parsed.port !== port) return { port, corrupt: true };
    return { ...parsed, port };
  } catch {
    return { port, corrupt: true };
  }
}

/** Every ticket currently in the registry, lowest port first. */
export function listTickets(registryDir) {
  let names;
  try {
    names = readdirSync(registryDir);
  } catch {
    return []; // no registry yet - nothing is reserved
  }
  return names
    .map((name) => /^(\d+)\.json$/.exec(name))
    .filter(Boolean)
    .map((m) => readTicket(registryDir, Number(m[1])))
    .filter(Boolean)
    .sort((a, b) => a.port - b.port);
}

/**
 * Give back every reservation held by `root`. Only ever removes tickets that name `root`, so
 * one checkout can never release another's port.
 * Returns the ports released.
 */
export function releaseReservation(registryDir, root) {
  const released = [];
  for (const ticket of listTickets(registryDir)) {
    if (ticket.corrupt || !sameRoot(ticket.root, root)) continue;
    rmSync(ticketPath(registryDir, ticket.port), { force: true });
    released.push(ticket.port);
  }
  return released;
}

/**
 * Drop reservations whose worktree is gone (and, with `includeCorrupt`, tickets that no longer
 * parse). Never touches a ticket belonging to an active checkout, and never touches a process.
 * Returns the removed tickets.
 */
export function pruneStaleReservations({ registryDir, isRootActive, includeCorrupt = false }) {
  const removed = [];
  for (const ticket of listTickets(registryDir)) {
    const stale = ticket.corrupt ? includeCorrupt : !isRootActive(ticket.root);
    if (!stale) continue;
    rmSync(ticketPath(registryDir, ticket.port), { force: true });
    removed.push(ticket);
  }
  return removed;
}

/**
 * The port assigned to `root`: its existing reservation, or a fresh one taken from the approved
 * range starting at its preference.
 *
 * @param root          checkout path the port belongs to
 * @param registryDir   the shared ticket directory
 * @param isRootActive  (path) => boolean - is that checkout still a live worktree?
 * @param isPortBusy    (port) => boolean - is something already listening there?
 * @param now           () => ISO string, injectable so tests stay deterministic
 * @returns { port, livePort, root, preferred, createdAt, reused }
 * @throws when every port in the range is reserved or occupied
 */
export function allocatePort({ root, registryDir, isRootActive, isPortBusy = () => false, now = () => new Date().toISOString() }) {
  const me = normalizeRoot(root);
  mkdirSync(registryDir, { recursive: true });

  // 1. Already assigned? The ticket IS the assignment - that is what makes the number survive
  //    restarts, and what every other tool reads instead of re-deciding.
  const existing = ticketsFor(registryDir, me);
  if (existing.length > 0) return { ...collapseToLowest(registryDir, existing), reused: true };

  // 2. Walk the range from this checkout's preference.
  const blocked = [];
  for (let k = 0; k < SLOT_COUNT; k++) {
    const port = candidatePort(me, k);
    const held = readTicket(registryDir, port);
    if (held) {
      if (held.corrupt) {
        blocked.push(`${port} - unreadable reservation (clear it with \`node scripts/dev-port.mjs --prune\`)`);
        continue;
      }
      if (isRootActive(held.root)) {
        blocked.push(`${port} - reserved by ${held.root}`);
        continue;
      }
      // Its worktree is gone: the reservation is stale, so take the slot back.
      rmSync(ticketPath(registryDir, port), { force: true });
    }

    const ticket = { port, livePort: port + 1, root: me, preferred: preferredPort(me), createdAt: now() };
    try {
      writeFileSync(ticketPath(registryDir, port), JSON.stringify(ticket, null, 2) + '\n', { flag: 'wx' });
    } catch (err) {
      if (err?.code !== 'EEXIST') throw err;
      // Another checkout claimed this port between our read and our write. It won; walk on.
      blocked.push(`${port} - claimed by another checkout while starting up`);
      continue;
    }

    // We hold the claim. A listener now means a process outside this registry owns the port.
    // Hand the claim back and keep walking - we never kill what we did not start.
    if (isPortBusy(port) || isPortBusy(port + 1)) {
      rmSync(ticketPath(registryDir, port), { force: true });
      blocked.push(`${port} - a process outside this repo is listening on ${port} or ${port + 1}`);
      continue;
    }

    // Two tools in THIS worktree can allocate at the same moment (vite and playwright, say) and
    // land on different ports, which would be worse than the collision we are fixing. Reconcile
    // on a rule both sides compute identically: lowest port wins, the loser releases.
    const settled = collapseToLowest(registryDir, ticketsFor(registryDir, me));
    return { ...(settled ?? ticket), reused: false };
  }

  throw new Error(
    `No dev-server port is available for ${me}.\n` +
      `All ${SLOT_COUNT} ports in the approved range ${PORT_RANGE_LABEL} are taken:\n` +
      blocked.map((line) => `  ${line}`).join('\n') +
      `\nRemove worktrees that are finished (/cleanup-worktrees), or run ` +
      `\`node scripts/dev-port.mjs --list\` to see who holds what.`,
  );
}

/** Tickets naming `root`, lowest port first. */
function ticketsFor(registryDir, root) {
  return listTickets(registryDir).filter((t) => !t.corrupt && sameRoot(t.root, root));
}

/** Keep the lowest-numbered ticket of a set and release the rest; returns the survivor. */
function collapseToLowest(registryDir, tickets) {
  const [winner, ...rest] = tickets;
  for (const extra of rest) rmSync(ticketPath(registryDir, extra.port), { force: true });
  return winner;
}
