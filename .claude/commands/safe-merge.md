---
description: Safely merge a branch or worktree into main - live preflight checks, verified build, then push
argument-hint: [branch-name (optional - will be detected if omitted)]
---

Safely merge a branch or worktree into `main`. Do NOT just print git commands for the user
to run - execute each phase yourself, report what you find, and stop whenever reality
disagrees with the happy path. The user invokes this precisely so they never have to
worry about wrecking the repo.

Branch to merge: $ARGUMENTS (if empty, detect it in Phase 1 and confirm with the user
before merging).

## Repo layout (this project)

- `main` is normally checked out at the repo root (`C:\claude\NoaCG-Studio`) - but never
  ASSUME it is; determine where (and whether) `main` is checked out from `git worktree list`
  every run.
- Feature/agent worktrees live under `.claude/worktrees/<name>` on `claude/*` branches.
- The verification gate is `npm run build` (typecheck + build). UI-facing changes should
  also get an e2e pass (`npm run test:e2e`) or at least an in-browser check.
- Standing permission exists to push verified work to `origin/main`.

## Hard safety rules (never break these, even if asked mid-flow)

- Never `push --force`, never `reset --hard`, never delete a branch that isn't fully merged.
- Update `main` only with `git pull --ff-only`; the final merge into `main` is
  `git merge --ff-only` (see Phase 4). Git itself must refuse any unexpected non-fast-forward.
- Local `main` vs `origin/main` before the requested merge:
  - **Diverged** (main has commits origin lacks AND origin has commits main lacks): hard STOP.
    Show both sides (`git log --oneline origin/main..main` and `main..origin/main`) and let
    the user decide. Do not proceed.
  - **Ahead only** (local `main` has commits not yet on `origin/main`, but is not behind):
    STOP and require explicit confirmation before continuing. Show
    `git log --oneline origin/main..main` and explain that the final `git push origin main`
    would also publish these pre-existing local-only commits, not just the merged branch.
- Never assume the repo root is on `main` merely because it is the usual main checkout
  location. If `main` is checked out nowhere, follow the Phase 1 "main not checked out"
  procedure - never switch, reset, stash, discard, or overwrite anything on a hunch.
- Never stash or discard uncommitted changes without explicitly asking first.
- If a merge hits conflicts you are not confident resolving, `git merge --abort` and
  report the conflicting files rather than guessing.
- Do not remove any worktree or branch until the merge commit is confirmed to contain it
  (`git branch --merged main`).
- Never touch other worktrees' work. Merge only the ONE requested branch; its merge brings
  in only that branch's commits and must never overwrite or discard work living on other
  worktrees' branches. Do not `git checkout`/`switch`/`restore` files across worktrees, and
  never run a destructive command (`reset`, `clean`, `checkout -- .`) in any checkout.

## Phase 1 - Assess - no working-tree or branch-history changes

This phase only reads state and fetches remote metadata. `git fetch` updates local
remote-tracking refs (`origin/*`) but changes no working tree and no branch history, so it
is safe here. Report findings before doing anything in later phases that changes state.

Run and summarize:

1. `git status --porcelain` in the root checkout - is main's working tree clean?
2. `git worktree list` - what worktrees exist, what branch is each on, and **where is
   `main` checked out** (or is it checked out nowhere)? This determines every later
   main-updating step's target checkout.
3. **Determine main's checkout status explicitly** (see "If `main` is not checked out
   anywhere" below if no worktree has it).
4. `git fetch origin --prune`
5. `git rev-list --left-right --count main...origin/main` - is local main ahead, behind,
   or diverged? Apply the ahead-only / diverged rules from Hard safety rules above.
6. Identify the source branch: use $ARGUMENTS if given; otherwise list candidate branches
   (`git branch --list 'claude/*' --list '*' --no-merged main` plus the worktree list) and
   ask the user which one to merge if it isn't obvious.
7. In the source branch's worktree: `git status --porcelain` - any uncommitted work?
8. Preview the merge: `git log --oneline main..<branch>` (what comes in) and
   `git log --oneline <branch>..main` (what the branch is missing), plus
   `git merge-tree $(git merge-base main <branch>) main <branch> | grep -c '^<<<'`
   or a `git merge --no-commit --no-ff` dry-run equivalent to predict conflicts.
   On Windows PowerShell prefer: `git merge-base main <branch>` then
   `git diff --name-only <base> <branch>` intersected with `git diff --name-only <base> main`
   to list files touched on both sides.

### If `main` is not checked out anywhere

If no worktree in `git worktree list` has `main` checked out, do NOT assume the root is on
`main`. Inspect the expected main checkout (`C:\claude\NoaCG-Studio`, referred to below as
`<root>`) read-only and report all of:

- Is HEAD detached, and at exactly which commit?
  `git -C <root> symbolic-ref -q HEAD` (empty output = detached) and
  `git -C <root> rev-parse HEAD`.
- Uncommitted changes: `git -C <root> status --porcelain`.
- Does the detached commit hold unique work not reachable from any branch?
  `git -C <root> log --oneline HEAD --not --branches --remotes` should be EMPTY; also note
  which branches already contain it: `git -C <root> branch --contains HEAD`.
- Confirm `main` is genuinely free - not checked out in any other worktree (from step 2).

**Decision:**
- If ALL of these hold - the checkout is clean, the detached commit has no unique
  unreferenced work, and `main` is free to be checked out - then plan to **reattach** the
  root checkout to `main`. Because that is a state change, only REPORT the plan here;
  perform the actual `git -C <root> switch main` (or `checkout main`) as the first action of
  Phase 2, after the confirmation checkpoint.
- If ANY of these is uncertain (dirty tree, unique unreferenced commits, `main` not free, or
  anything you cannot positively confirm), STOP and report the exact situation. Never
  switch, reset, stash, discard, or overwrite anything.

Then present a short plan: **the source branch and the target (`main`), stated explicitly**
("merge `<branch>` -> `main`"), how many commits, predicted conflict files (if any), any
reattach that Phase 2 will perform, and what verification will run.

**Confirmation checkpoint (required, every run):** stop here and wait for the user's
explicit go-ahead before doing anything that changes state - even when the picture is
clean. Do not proceed to Phase 2 until they confirm.

## Phase 2 - Prepare (reattach main if needed, update main, then integrate it INTO the branch)

The order matters: bring the latest main into the WORKTREE branch first, so all conflict
resolution and testing happen on the branch. Main only ever receives an already-integrated,
already-tested branch - it is never the place conflicts get resolved.

1. If Phase 1 determined `main` is not checked out anywhere and the all-clear conditions
   held, reattach now: `git -C <root> switch main`. (If the conditions did not hold, you
   already stopped in Phase 1.)
2. If the source worktree has uncommitted changes: ask the user - commit them there
   (with a proper message), or leave them out? Never silently stash.
3. Update main in its checkout from the remote: `git pull --ff-only origin main`.
4. Record the integrated main commit: `INTEGRATED_MAIN_SHA = git rev-parse main`. This is
   the exact `main` that gets integrated into the branch, re-checked in Phase 4.
5. In the SOURCE branch's worktree, integrate the freshly-updated main into the branch:
   `git merge main` (from inside that worktree). This is where the branch catches up to
   main - not the other way around.

## Phase 3 - Resolve & verify (on the branch, main untouched)

1. Resolve any conflicts from the `git merge main` in the worktree, carefully. Resolve
   only what is mechanically obvious; for anything semantic, stop and show the user the
   conflicting hunks rather than guessing. If it is not confidently resolvable,
   `git merge --abort` and report. This all happens on the BRANCH, so main is untouched
   while you work.
2. Pin the commit under test: `VERIFIED_SHA = git rev-parse <branch>` and state it. The
   exact commit that passes verification must be the exact commit that becomes `main`.
3. Verify on the integrated branch: run `npm run build` in the worktree. If the work is
   user-facing, also run the relevant e2e specs or check the affected flow in the browser
   per CLAUDE.md's "Verifying changes". A red build means fix-or-abort - do not proceed to
   main. (Any fix creates a new commit; re-record `VERIFIED_SHA` and rebuild.)
4. After the build passes, confirm the branch still points at the verified commit:
   `git rev-parse <branch>` must equal `VERIFIED_SHA`. If it moved, re-verify before
   continuing.

## Phase 4 - Re-check main, fast-forward merge, and push

Do this immediately before merging - main may have moved on the remote while you verified.

1. `git fetch origin`, then confirm ALL of:
   - local `main` still matches `origin/main`: `git rev-parse main` == `git rev-parse origin/main`;
   - `main` has not moved since it was integrated into the branch:
     `git rev-parse origin/main` == `INTEGRATED_MAIN_SHA`;
   - the final merge is still a fast-forward: `git merge-base --is-ancestor main <branch>`
     succeeds.
2. **If `main` moved** (any check fails): STOP - do not merge. Return to Phase 2, integrate
   the new latest `main` into the source branch (`git pull --ff-only origin main`, then
   `git merge main` in the worktree), rerun the Phase 3 verification (new `VERIFIED_SHA`),
   and only then repeat this Phase 4 re-check.
3. Fast-forward merge from main's checkout: `git merge --ff-only <branch>`. Git refuses this
   if it is not a fast-forward; if it fails, STOP and report (main moved, or the branch does
   not contain main). Because the branch already includes main, a healthy run fast-forwards
   cleanly, bringing in only this branch's commits and never overwriting unrelated work on
   OTHER worktrees' branches.
4. Confirm the exact verified commit is now `main`: `git rev-parse main` must equal
   `VERIFIED_SHA`. Do not push otherwise.
5. Push: `git push origin main` (standing permission). If Phase 1 flagged pre-existing
   local-only commits ahead of `origin/main`, you must already have the user's explicit
   confirmation that publishing them is intended.

## Phase 5 - Finish and clean up

1. Confirm the branch is contained: `git branch --merged main` includes `<branch>`.
2. Only then offer cleanup (ask, don't assume): `git worktree remove <path>` and
   `git branch -d <branch>` (lowercase `-d` only - it refuses if not merged).
3. Final report: merged commits, verified SHA now on `main`, build result, push result,
   remaining worktrees.
