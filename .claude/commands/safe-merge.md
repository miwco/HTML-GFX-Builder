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

- `main` is normally checked out at the repo root (`C:\claude\NoaCG-Studio`).
- Feature/agent worktrees live under `.claude/worktrees/<name>` on `claude/*` branches.
- The verification gate is `npm run build` (typecheck + build). UI-facing changes should
  also get an e2e pass (`npm run test:e2e`) or at least an in-browser check.
- Standing permission exists to push verified work to `origin/main`.

## Hard safety rules (never break these, even if asked mid-flow)

- Never `push --force`, never `reset --hard`, never delete a branch that isn't fully merged.
- Update `main` only with `git pull --ff-only`. If main has diverged from origin/main,
  STOP and show both sides (`git log --oneline origin/main..main` and `main..origin/main`);
  let the user decide.
- Never stash or discard uncommitted changes without explicitly asking first.
- If a merge hits conflicts you are not confident resolving, `git merge --abort` and
  report the conflicting files rather than guessing.
- Do not remove any worktree or branch until the merge commit is confirmed to contain it
  (`git branch --merged main`).
- Never touch other worktrees' work. Merge only the ONE requested branch; its merge brings
  in only that branch's commits and must never overwrite or discard work living on other
  worktrees' branches. Do not `git checkout`/`switch`/`restore` files across worktrees, and
  never run a destructive command (`reset`, `clean`, `checkout -- .`) in any checkout.

## Phase 1 - Assess (read-only, report findings before touching anything)

Run and summarize:

1. `git status --porcelain` in the root checkout - is main's working tree clean?
2. `git worktree list` - what worktrees exist, what branch is each on, and where is
   `main` checked out? (If main is checked out somewhere other than the root, all
   main-updating steps must happen in THAT checkout.)
3. `git fetch origin --prune`
4. `git rev-list --left-right --count main...origin/main` - is local main ahead, behind,
   or diverged?
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

Then present a short plan: what will be merged, how many commits, predicted conflict
files (if any), and what verification will run. Proceed only if the picture is clean;
otherwise surface the problems and wait for the user.

## Phase 2 - Prepare (update main, then integrate it INTO the branch)

The order matters: bring the latest main into the WORKTREE branch first, so all conflict
resolution and testing happen on the branch. Main only ever receives an already-integrated,
already-tested branch - it is never the place conflicts get resolved.

1. If the source worktree has uncommitted changes: ask the user - commit them there
   (with a proper message), or leave them out? Never silently stash.
2. Update main in its checkout from the remote: `git pull --ff-only origin main`.
3. In the SOURCE branch's worktree, integrate the freshly-updated main into the branch:
   `git merge main` (from inside that worktree). This is where the branch catches up to
   main - not the other way around.

## Phase 3 - Resolve, test, then merge into main

1. Resolve any conflicts from the `git merge main` in the worktree, carefully. Resolve
   only what is mechanically obvious; for anything semantic, stop and show the user the
   conflicting hunks rather than guessing. If it is not confidently resolvable,
   `git merge --abort` and report. This all happens on the BRANCH, so main is untouched
   while you work.
2. Verify on the integrated branch: run `npm run build` in the worktree. If the work is
   user-facing, also run the relevant e2e specs or check the affected flow in the browser
   per CLAUDE.md's "Verifying changes". A red build means fix-or-abort - do not proceed to
   main.
3. Only once the branch is green and contains the latest main, merge it into main from
   main's checkout: `git merge <branch>`. Because the branch already includes main, this
   is a clean fast-forward - it brings in only this branch's commits and cannot overwrite
   unrelated work living on OTHER worktrees' branches (that work is not part of this
   branch's history). If this merge is somehow not a fast-forward, stop and re-examine
   before committing anything.

## Phase 4 - Finish and clean up

1. Push: `git push origin main` (standing permission).
2. Confirm the branch is contained: `git branch --merged main` includes `<branch>`.
3. Only then offer cleanup (ask, don't assume): `git worktree remove <path>` and
   `git branch -d <branch>` (lowercase `-d` only - it refuses if not merged).
4. Final report: merged commits, build result, push result, remaining worktrees.
