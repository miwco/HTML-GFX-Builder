---
description: Safely merge a branch or worktree into main - live preflight checks, verified build, then push
argument-hint: [branch-name (optional - will be detected if omitted)]
---

Safely merge a branch or worktree into `main`. Do NOT just print git commands for the user
to run - execute each phase yourself, report what you find, and stop whenever reality
disagrees with the happy path.

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
- **Local `main` vs `origin/main` before the requested merge (`MAIN_SYNC` rule):**
  - **Diverged** (each has commits the other lacks): hard STOP. Show both sides
    (`git log --oneline origin/main..main` and `main..origin/main`) and let the user decide.
  - **Ahead only** (local `main` has commits origin lacks, but is not behind): STOP and
    require explicit confirmation. Show `git log --oneline origin/main..main` and explain that
    the final push would also publish these pre-existing local-only commits, not just the branch.
- Never assume the repo root is on `main` merely because it is the usual main checkout
  location. If `main` is checked out nowhere, follow the Phase 1 "main not checked out"
  procedure - never switch, reset, stash, discard, or overwrite anything on a hunch.
- Never stash or discard uncommitted changes without explicitly asking first.
- If a merge hits conflicts you are not confident resolving, `git merge --abort` and
  report the conflicting files rather than guessing.
- Never remove a worktree or delete a branch. Cleanup is out of scope for this command -
  `/cleanup-worktrees` owns it and runs from the primary `main` checkout, where removal
  actually works.
- Never touch other worktrees' work. Merge only the ONE requested branch; its merge brings
  in only that branch's commits and must never overwrite or discard work living on other
  worktrees' branches. Do not `git checkout`/`switch`/`restore` files across worktrees, and
  never run a destructive command (`reset`, `clean`, `checkout -- .`) in any checkout.

## Phase 1 - Assess - no working-tree or branch-history changes

This phase only reads state and fetches remote metadata (`git fetch` touches no working tree
or branch history, so it is safe here). Report findings before any later state change.

Run and summarize:

1. `git status --porcelain` in the root checkout - is main's working tree clean?
2. `git worktree list` - what worktrees exist, what branch is each on, and **where is
   `main` checked out** (or nowhere)? This determines every later main-updating step's
   checkout; if no worktree has it, see "If `main` is not checked out anywhere" below.
3. `git fetch origin --prune`
4. `git rev-list --left-right --count main...origin/main` - ahead, behind, or diverged?
   Apply the `MAIN_SYNC` rule (Hard safety rules).
5. Identify the source branch: use $ARGUMENTS if given; otherwise list candidate branches
   (`git branch --list 'claude/*' --list '*' --no-merged main` plus the worktree list) and
   ask the user which one to merge if it isn't obvious.
6. In the source branch's worktree: `git status --porcelain` - any uncommitted work?
7. Preview the merge: `git log --oneline main..<branch>` (what comes in) and
   `git log --oneline <branch>..main` (what the branch is missing), plus
   `git merge-tree $(git merge-base main <branch>) main <branch> | grep -c '^<<<'`
   or a `git merge --no-commit --no-ff` dry-run equivalent to predict conflicts.
   On Windows PowerShell prefer: `git merge-base main <branch>` then
   `git diff --name-only <base> <branch>` intersected with `git diff --name-only <base> main`
   to list files touched on both sides.

### If `main` is not checked out anywhere

If no worktree has `main` checked out, do NOT assume the root is on `main`. The root
(`C:\claude\NoaCG-Studio`, `<root>` below) is our canonical `main` worktree, but the client
parks it on a detached HEAD when it spins up a linked worktree, so it can drift off `main`.

The single, authoritative definition of "is it safe to reattach `<root>` to `main`?" lives
in `scripts/reattach-main.mjs` - the SAME gate the SessionStart hook uses, so this command
and the hook can never disagree. Assess read-only, and trust its verdict:

    node scripts/reattach-main.mjs --check <root>

It prints `SAFE to reattach to main` (clean checkout, HEAD detached with no commits
unreachable from any branch/remote, no git op in progress, `main` free) or
`will NOT reattach - <reason>`.

**Decision:**
- SAFE: plan to **reattach** `<root>` to `main`; it is a state change, so only REPORT the
  plan here and perform it as the first action of Phase 2.
- NOT SAFE (any reason): STOP and report the exact reason it printed. Never switch, reset,
  stash, discard, or overwrite anything.

Then present a short plan: **the source branch and the target (`main`), stated explicitly**
("merge `<branch>` -> `main`"), how many commits, predicted conflict files (if any), any
reattach that Phase 2 will perform, and what verification will run.

**Auto-proceed on a clean preflight (standing permission).** The user has granted standing
permission for this command to run end to end - including the final `git push origin main` -
without a confirmation prompt. When the Phase 1 assessment is clean, state the plan (source
branch -> `main`, commit count, "no risks flagged") and continue straight into Phase 2
without waiting. Only STOP and require an explicit go-ahead when the assessment surfaces a
real risk, meaning any of:

- local `main` is diverged from or ahead-only of `origin/main` (the Hard safety rules cases);
- the source worktree has uncommitted changes;
- the merge is predicted to conflict;
- `main` is checked out nowhere and `reattach-main.mjs --check` does not report SAFE;
- the source branch is ambiguous or was not clearly identified.

In any of those cases, report the specific risk and wait. Absent them, do not pause - the
later phases still enforce every Hard safety rule and abort on their own if reality
disagrees (dirty verification, main moved, non-fast-forward), so a clean run needs no
gate here.

## Phase 2 - Prepare (reattach main if needed, update main, then integrate it INTO the branch)

Order matters: bring the latest main into the WORKTREE branch first, so all conflict
resolution and testing happen on the branch. Main only ever receives an already-tested
branch - it is never where conflicts get resolved.

1. If Phase 1 found `main` checked out nowhere and the gate reported SAFE, reattach now:
   `node scripts/reattach-main.mjs <root>` (it re-verifies safety, then switches).
2. If the source worktree has uncommitted changes: ask the user - commit them there
   (with a proper message), or leave them out? Never silently stash.
3. Update main from the remote: `git pull --ff-only origin main`.
4. Record `INTEGRATED_MAIN_SHA = git rev-parse main` - the exact main integrated into the
   branch, re-checked in Phase 4.
5. In the SOURCE branch's worktree, integrate that main into the branch: `git merge main`.

## Phase 3 - Resolve & verify (on the branch, main untouched)

1. Resolve any conflicts from the `git merge main`, carefully. Resolve only what is
   mechanically obvious; for anything semantic, stop and show the user the conflicting hunks.
   If it is not confidently resolvable, `git merge --abort` and report. This happens on the
   BRANCH, so main stays untouched.
2. Pin the commit under test: `VERIFIED_SHA = git rev-parse <branch>` and state it. The exact
   commit that passes verification must be the exact commit that becomes `main`.
3. Verify on the integrated branch: run `npm run build` in the worktree. If the work is
   user-facing, also run the relevant e2e specs or check the affected flow in the browser
   per CLAUDE.md's "Verifying changes". A red build means fix-or-abort - do not proceed to
   main. (Any fix creates a new commit; re-record `VERIFIED_SHA` and rebuild.)
4. Confirm the branch still points at the verified commit: `git rev-parse <branch>` must
   equal `VERIFIED_SHA`. If it moved, re-verify.

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
   cleanly, bringing in only this branch's commits.
4. Confirm the exact verified commit is now `main`: `git rev-parse main` must equal
   `VERIFIED_SHA`. Do not push otherwise.
5. Push: `git push origin main` (standing permission). If Phase 1 flagged pre-existing
   local-only commits ahead of `origin/main`, you must already have the user's explicit
   confirmation that publishing them is intended.

## Phase 5 - Finish

1. Confirm the branch is contained: `git branch --merged main` includes `<branch>`.
2. Final report: merged commits, verified SHA now on `main`, build result, push result.
3. Do NOT remove the worktree or delete the branch, and do not offer to. Just note that
   `/cleanup-worktrees` (run from the primary `main` checkout) sweeps merged branches and
   their worktrees when the user wants them gone.
