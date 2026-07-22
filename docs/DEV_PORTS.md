# Dev-server ports across worktrees

Several worktrees of this repo are usually active at once, and each needs its own Vite dev
server running at the same time. This is how each checkout gets a port it can actually start
on, without anyone picking numbers by hand.

## How a port is assigned

Two steps: a **preference** (deterministic, path-derived) and an **assignment** (a reservation
in a registry shared by every worktree of the repo).

| Checkout | Port | Live e2e port |
| --- | --- | --- |
| Primary checkout | 5174 | 5175 |
| Linked worktree | reserved from **5180-5298** (even) | the reserved port + 1 |
| `DEV_PORT=n` set | `n` | `n + 1` |

1. **Preference.** `preferredPort()` (`scripts/port-registry.mjs`) hashes the checkout's
   absolute path - normalised to forward slashes and lowercased - with djb2 and maps it onto
   one of the 60 even ports in 5180-5298. Same path, same number, on every run, in every tool,
   with no coordination.
2. **Assignment.** 60 slots collide. (Real example: six worktrees on one machine, three of
   them preferring the same port. Vite runs with `strictPort`, so only the first could start,
   and the repo's guards correctly refuse a hand-started server, a hand-picked port, or an
   edited `launch.json`.) So the preference is only where the search *starts*.
   `allocatePort()` walks the range from there and takes the first port that is free, creating
   a **ticket file** to claim it. The walk steps 7 slots at a time - coprime with 60, so it
   visits every port exactly once before giving up.

Once a checkout holds a ticket, that ticket **is** the assignment: it is reused on every later
run, so the number stays stable across restarts, reboots and branch switches.

## Where the port is recorded

- **The reservation (authoritative):** one ticket file per reserved port, in the repo's shared
  git directory - `<git-common-dir>/noacg-dev-ports/<port>.json`, e.g.
  `C:/claude/NoaCG-Studio/.git/noacg-dev-ports/5228.json`. Every worktree of the repo sees the
  same directory, nothing outside the repo does, and it disappears with the repo. Each ticket
  records `{ port, livePort, root, preferred, createdAt }`.
- **The published record (per worktree):** `.claude/dev-port.json`, rewritten from the
  reservation on every resolution. It is a *mirror* for tools and humans - the ticket decides.
- **The preview launch config:** `.claude/launch.json`, generated with the same number so
  `preview_start {name: "dev"}` lands on the right server.

Both generated files are gitignored, and both are blocked from hand-editing by
`scripts/hooks/guard-edit.mjs`.

Everything else derives the port by importing `scripts/dev-port.mjs`: `vite.config.ts`,
`playwright.config.ts`, `playwright.live.config.ts`, `e2e/_offline-guard.ts`, the shell guard
hook, and the dev scripts (`l3-sweep`, `ai-bench`, `ai-compare`, `video-bench`, the render
smokes, `factory`, `acceptance-shots`). There is no second source of the number.

## Concurrency

A ticket is created with the exclusive `wx` flag. That is the whole concurrency mechanism: the
filesystem decides who won when two worktrees start in the same instant, and the loser sees
`EEXIST` and walks on. No lock files, no timeouts, no cleanup obligation on the fast path.

Two tools inside *one* worktree can also allocate at the same moment (Vite and Playwright, for
instance). Both reconcile on a rule they compute identically - lowest port wins, the loser
releases - so the worktree still ends up with exactly one port.

## Ownership rules

- A ticket naming an **active** worktree is untouchable, whether or not its server is running.
  A worktree owns its port for as long as it exists; that is what makes the number stable.
- A ticket naming a worktree git no longer lists is **stale** and is reclaimed - on the next
  allocation that lands on it, and by the sweep at session start.
- A ticket that does not parse blocks its slot but is never auto-deleted: a torn read during
  someone else's write must not cost them their port. `--prune` clears those explicitly.
- A port that answers TCP while **nobody holds a ticket** for it belongs to something outside
  the repo - a zombie server from a removed worktree, or an unrelated app. The claim is handed
  back and the walk continues. The process is never signalled: killing another session's server
  is the exact failure this whole mechanism exists to prevent.

## Commands

```bash
node scripts/dev-port.mjs
```

Prints this checkout's port and refreshes the generated files. `--json` prints the full record
(port, live port, preference, source, ticket path). `--list` shows every reservation in the repo
with its holder and whether that holder is still active. `--prune` releases reservations whose
worktree is gone. `--release` gives *this* checkout's reservation back - never anyone else's.

## Troubleshooting

**Vite fails with "Port XXXX is already in use" (`strictPort`).**
Something outside the registry is on this checkout's reserved port. Find out what:

```bash
node scripts/dev-port.mjs --list
```

- The port is listed against **another active worktree**: that worktree legitimately owns it
  and this checkout should not have that number. Something re-derived a port instead of reading
  the reservation - check `.claude/launch.json` matches `node scripts/dev-port.mjs`.
- The port is listed against **this checkout** but a foreign process holds it: a genuinely stuck
  server, most often one left behind by a worktree that has since been removed. Identify the
  owning process before doing anything (`netstat -ano | findstr :5228` on Windows, then
  `tasklist /fi "pid eq <pid>"`). If it is yours and dead weight, stop it. If you cannot tell
  whose it is, do not kill it - move this checkout instead:

```bash
node scripts/dev-port.mjs --release
```

The next resolution allocates a different port, skipping the occupied one automatically.

**The e2e suite refuses to start ("something is already listening on port ...").**
That guard is doing its job: Playwright runs with `reuseExistingServer: true`, so it would
adopt whatever server is there along with whatever env it was started with. Stop your own dev
server (`preview_stop`) and re-run. Servers in *other* worktrees are harmless - they are on
their own ports.

**A worktree's port changed.**
Expected in exactly two cases: its preference was taken when it first allocated (session start
says so - "preferred NNNN was taken"), or its reservation was released. It never changes on its
own while the ticket exists.

**Nothing is available at all.** `allocatePort` throws with the full list of who holds what.
Remove finished worktrees (`/cleanup-worktrees`), then `node scripts/dev-port.mjs --prune`.

## Tests

`npm run test:ports` (`scripts/port-registry.test.mjs`) covers distinct preferences, a real
hash collision, an occupied preferred port, six processes allocating simultaneously, stale
reservation recovery, and the whole tool chain reporting one number.
