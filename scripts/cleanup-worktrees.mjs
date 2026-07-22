// Bulk cleanup of stale worktrees, their merged branches, stale worktree metadata, and empty
// leftover folders - safely, from the primary `main` checkout.
//
// Default is a read-only DRY RUN. Pass --apply to actually delete. The /cleanup-worktrees
// command drives this: dry-run, show the plan, then apply when the assessment is clean.
//
// The ONE trustworthy test for "this work is safely in main" is commit containment:
//   git rev-list --count <ref> --not main   == 0
// (equivalently `git merge-base --is-ancestor <ref> main`). Branch names, `gone` upstream
// markers, and human/AI memory are NEVER trusted for a deletion decision - a branch that
// merged main into itself, or an old ancestor tip, both look alarming by name/diff yet are
// fully contained. Containment is checked against LOCAL main; if origin/main is ahead, it is a
// superset of local main, so containment still holds. Divergence is surfaced, not silently
// trusted.
//
// Hard rules (never broken, even with --apply):
//   - never `git branch -D`, never `git worktree remove --force`, never touch main or the
//     current branch;
//   - never remove a worktree with uncommitted changes, or a detached worktree whose HEAD is
//     not contained in main (it may hold unique work);
//   - never delete a non-empty unregistered folder (report it for manual review);
//   - only ever delete a branch whose commits are fully contained in main, and even then let
//     `git branch -d` refuse as a final backstop.

import { fileURLToPath } from 'node:url';
import { primaryCheckout } from './reattach-main.mjs';
import { pruneStalePorts } from './dev-port.mjs';
import {
  git,
  normalize,
  samePath,
  worktreeRoots,
  sweepEmptyLeftoverFolders,
} from './worktree-cleanup-lib.mjs';

const MAIN = 'main';

/** True when every commit of `ref` is already reachable from main (nothing would be lost). */
function containedInMain(ref, cwd) {
  const res = git(['rev-list', '--count', ref, '--not', MAIN], cwd);
  return res.ok && res.stdout === '0';
}

/** The branch a worktree has checked out, or null if detached. Reads the porcelain record. */
function worktreeBranches(cwd) {
  const res = git(['worktree', 'list', '--porcelain'], cwd);
  const map = new Map(); // normalized path -> { branch|null, head }
  if (!res.ok) return map;
  let path = null;
  for (const line of res.stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      path = normalize(line.slice('worktree '.length));
      map.set(path, { branch: null, head: null });
    } else if (line.startsWith('HEAD ')) {
      if (path) map.get(path).head = line.slice('HEAD '.length).trim();
    } else if (line.startsWith('branch ')) {
      const ref = line.slice('branch '.length).trim();
      if (path) map.get(path).branch = ref.replace('refs/heads/', '');
    }
  }
  return map;
}

export function assess(cwd) {
  const plan = {
    ok: true,
    reason: null,
    primaryRoot: null,
    currentBranch: null,
    mainSync: null, // { ahead, behind, state }
    worktrees: [], // { path, branch|null, head, action: 'remove'|'skip', why }
    branches: [], // { name, action: 'delete'|'skip', why }
    otherMerged: [], // non-claude/* branches fully merged into main (reported, not deleted)
    prune: [], // stale worktree metadata git would prune
    emptyFolders: { removed: [], nonEmpty: [], locked: [] },
  };

  const primaryRoot = primaryCheckout(cwd);
  if (!primaryRoot) {
    return { ...plan, ok: false, reason: 'not inside a git checkout' };
  }
  plan.primaryRoot = primaryRoot;

  // Rule #8: only ever run from the PRIMARY checkout. A linked worktree cannot delete the
  // folder it is running inside, and its git ops fall through here confusingly.
  const roots = worktreeRoots(cwd);
  const containing = roots
    .filter((r) => samePath(cwd, r) || normalize(cwd).toLowerCase().startsWith(r.toLowerCase() + '/'))
    .sort((a, b) => b.length - a.length)[0];
  if (!containing || !samePath(containing, primaryRoot)) {
    return {
      ...plan,
      ok: false,
      reason:
        `this must run from the primary checkout (${primaryRoot}); current location resolves to ` +
        `${containing ?? normalize(cwd)}. A worktree cannot safely delete itself - cd to the ` +
        'primary checkout and rerun.',
    };
  }

  // main must exist to test containment against.
  if (!git(['rev-parse', '--verify', '--quiet', `refs/heads/${MAIN}`], primaryRoot).ok) {
    return { ...plan, ok: false, reason: `local branch ${MAIN} does not exist` };
  }
  plan.currentBranch =
    git(['symbolic-ref', '-q', '--short', 'HEAD'], primaryRoot).stdout || null; // null when detached

  // Sync status vs origin/main (read-only; fetch is done by the caller before assess()).
  const lr = git(['rev-list', '--left-right', '--count', `${MAIN}...origin/${MAIN}`], primaryRoot);
  if (lr.ok && /^\d+\s+\d+$/.test(lr.stdout)) {
    const [ahead, behind] = lr.stdout.split(/\s+/).map(Number);
    const state = ahead && behind ? 'diverged' : ahead ? 'ahead' : behind ? 'behind' : 'in-sync';
    plan.mainSync = { ahead, behind, state };
  }

  const wtInfo = worktreeBranches(primaryRoot);

  // Classify each registered worktree except the primary root itself.
  for (const path of roots) {
    if (samePath(path, primaryRoot)) continue;
    const info = wtInfo.get(path) ?? { branch: null, head: null };
    const entry = { path, branch: info.branch, head: info.head, action: 'skip', why: '' };

    const status = git(['status', '--porcelain'], path);
    if (!status.ok) {
      entry.why = 'could not read working-tree status';
    } else if (status.stdout !== '') {
      entry.why = 'uncommitted changes present';
    } else if (info.branch) {
      if (samePath(info.branch, MAIN) || info.branch === MAIN) {
        entry.why = 'holds main - never removed';
      } else if (containedInMain(info.branch, primaryRoot)) {
        entry.action = 'remove';
        entry.why = `branch ${info.branch} fully merged into main`;
      } else {
        entry.why = `branch ${info.branch} has commits not in main`;
      }
    } else {
      // Detached: safe to remove only if the checked-out commit is contained in main.
      if (info.head && containedInMain(info.head, primaryRoot)) {
        entry.action = 'remove';
        entry.why = `detached HEAD ${info.head.slice(0, 7)} contained in main`;
      } else {
        entry.why = 'detached HEAD not contained in main - may hold unique work';
      }
    }
    plan.worktrees.push(entry);
  }

  // Which branches remain checked out in a worktree we are NOT removing? Those cannot be deleted.
  const keptWorktreeBranches = new Set(
    plan.worktrees.filter((w) => w.action !== 'remove' && w.branch).map((w) => w.branch),
  );

  // Branch classification. Default scope: fully-merged claude/* branches (incl. ones whose
  // worktree still exists). Non-claude merged branches are reported only.
  const branchList = git(['for-each-ref', '--format=%(refname:short)', 'refs/heads'], primaryRoot);
  const localBranches = branchList.ok ? branchList.stdout.split('\n').filter(Boolean) : [];
  for (const name of localBranches) {
    if (name === MAIN) continue;
    if (name === plan.currentBranch) continue; // never the current branch
    if (!containedInMain(name, primaryRoot)) continue; // unmerged branches are left entirely alone
    if (!name.startsWith('claude/')) {
      plan.otherMerged.push(name);
      continue;
    }
    if (keptWorktreeBranches.has(name)) {
      plan.branches.push({ name, action: 'skip', why: 'still checked out in a worktree left in place' });
    } else {
      plan.branches.push({ name, action: 'delete', why: 'fully merged into main' });
    }
  }

  // Stale worktree metadata git would prune (folders already gone). -n reports without acting.
  const pruneDry = git(['worktree', 'prune', '-n', '-v'], primaryRoot);
  if (pruneDry.ok && pruneDry.stdout) {
    plan.prune = pruneDry.stdout.split('\n').filter(Boolean);
  }

  // Empty leftover folders (read-only preview: sweep only runs for real under --apply).
  return plan;
}

function apply(plan, cwd) {
  const done = { removedWorktrees: [], deletedBranches: [], pruned: false, sweep: null, releasedPorts: [], errors: [] };

  for (const w of plan.worktrees.filter((x) => x.action === 'remove')) {
    const res = git(['worktree', 'remove', w.path], plan.primaryRoot); // never --force
    if (res.ok) done.removedWorktrees.push(w.path);
    else done.errors.push(`worktree remove ${w.path}: ${res.stderr || res.stdout || 'failed (folder may be locked/busy)'}`);
  }

  // Re-derive deletable branches after removals (a just-freed branch is now deletable). Keep
  // the same containment gate; `git branch -d` is the final backstop that refuses unmerged.
  for (const b of plan.branches.filter((x) => x.action === 'delete')) {
    if (!containedInMain(b.name, plan.primaryRoot)) {
      done.errors.push(`branch ${b.name}: no longer contained in main - skipped`);
      continue;
    }
    const res = git(['branch', '-d', b.name], plan.primaryRoot);
    if (res.ok) done.deletedBranches.push(b.name);
    else done.errors.push(`branch -d ${b.name}: ${res.stderr || res.stdout || 'refused'}`);
  }

  if (plan.prune.length > 0) {
    const res = git(['worktree', 'prune'], plan.primaryRoot);
    done.pruned = res.ok;
    if (!res.ok) done.errors.push(`worktree prune: ${res.stderr || res.stdout}`);
  }

  done.sweep = sweepEmptyLeftoverFolders({
    primaryRoot: plan.primaryRoot,
    registeredRoots: worktreeRoots(plan.primaryRoot),
    protect: [cwd],
  });

  // A removed worktree cannot hand its dev-port reservation back itself, so give it back here -
  // otherwise the port stays held until some later allocation happens to land on it
  // (docs/DEV_PORTS.md). Only reservations whose worktree is gone are touched.
  try {
    done.releasedPorts = pruneStalePorts().map((t) => t.port);
  } catch (err) {
    done.errors.push(`dev-port reservations: ${err.message}`);
  }

  return done;
}

function report(plan, done) {
  const L = [];
  const mode = done ? 'APPLIED' : 'DRY RUN';
  L.push(`# Worktree cleanup - ${mode}`);
  L.push(`Primary checkout: ${plan.primaryRoot} (current branch: ${plan.currentBranch ?? 'detached'})`);

  if (plan.mainSync) {
    const { ahead, behind, state } = plan.mainSync;
    L.push(`main vs origin/main: ${state}` + (state === 'in-sync' ? '' : ` (ahead ${ahead}, behind ${behind})`));
    if (state === 'diverged' || state === 'ahead') {
      L.push(
        `  ! local main is ${state} of origin/main. Deletions below are still safe (all are ` +
          'contained in LOCAL main, so no work is lost), but push/reconcile main soon.',
      );
    }
  }

  const toRemove = plan.worktrees.filter((w) => w.action === 'remove');
  const wtSkip = plan.worktrees.filter((w) => w.action === 'skip');
  const toDelete = plan.branches.filter((b) => b.action === 'delete');
  const brSkip = plan.branches.filter((b) => b.action === 'skip');

  L.push('');
  L.push(`## Worktrees to remove (${toRemove.length})`);
  for (const w of toRemove) {
    const applied = done ? (done.removedWorktrees.some((p) => samePath(p, w.path)) ? ' [removed]' : ' [FAILED]') : '';
    L.push(`  - ${w.path} (${w.why})${applied}`);
  }
  if (toRemove.length === 0) L.push('  (none)');

  L.push('');
  L.push(`## Branches to delete (${toDelete.length})`);
  for (const b of toDelete) {
    const applied = done ? (done.deletedBranches.includes(b.name) ? ' [deleted]' : ' [FAILED/refused]') : '';
    L.push(`  - ${b.name} (${b.why})${applied}`);
  }
  if (toDelete.length === 0) L.push('  (none)');

  const skips = [
    ...wtSkip.map((w) => `worktree ${w.path}: ${w.why}`),
    ...brSkip.map((b) => `branch ${b.name}: ${b.why}`),
  ];
  L.push('');
  L.push(`## Skipped (${skips.length})`);
  for (const s of skips) L.push(`  - ${s}`);
  if (skips.length === 0) L.push('  (none)');

  L.push('');
  L.push('## Stale worktree metadata to prune');
  if (plan.prune.length === 0) L.push('  (none)');
  else {
    for (const p of plan.prune) L.push(`  - ${p}`);
    if (done) L.push(done.pruned ? '  [pruned]' : '  [prune FAILED]');
  }

  L.push('');
  L.push('## Empty leftover folders');
  if (done && done.sweep) {
    const { removed, nonEmpty, locked } = done.sweep;
    if (removed.length === 0 && nonEmpty.length === 0 && locked.length === 0) L.push('  (none)');
    for (const d of removed) L.push(`  - ${d} [removed]`);
    for (const d of locked) L.push(`  - ${d} [locked/busy - rerun later]`);
    for (const d of nonEmpty) L.push(`  - ${d} [NON-EMPTY - manual review, not deleted]`);
  } else {
    L.push('  (swept only under --apply)');
  }

  L.push('');
  L.push('## Dev-port reservations');
  if (done) {
    L.push(done.releasedPorts.length === 0 ? '  (none to release)' : `  - released ${done.releasedPorts.join(', ')}`);
  } else {
    L.push('  (released only under --apply)');
  }

  if (plan.otherMerged.length > 0) {
    L.push('');
    L.push('## Also fully merged into main, NOT deleted (non-claude/* branches - remove manually if unwanted)');
    for (const n of plan.otherMerged) L.push(`  - ${n}`);
  }

  const manual = [
    ...wtSkip.map((w) => `${w.path} - ${w.why}`),
    ...(done?.sweep?.nonEmpty ?? []).map((d) => `${d} - non-empty leftover folder`),
    ...(done?.sweep?.locked ?? []).map((d) => `${d} - locked, rerun later`),
    ...(done?.errors ?? []),
  ];
  L.push('');
  L.push(`## Manual cleanup remaining (${manual.length})`);
  for (const m of manual) L.push(`  - ${m}`);
  if (manual.length === 0) L.push('  (none)');

  return L.join('\n');
}

// CLI: `node scripts/cleanup-worktrees.mjs [--apply]` (default: dry run).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const doApply = process.argv.includes('--apply');
  const cwd = normalize(process.cwd());

  const plan = assess(cwd);
  if (!plan.ok) {
    console.log(`Cannot run cleanup: ${plan.reason}`);
    process.exit(0);
  }

  const done = doApply ? apply(plan, cwd) : null;
  console.log(report(plan, done));
  process.exit(0);
}
