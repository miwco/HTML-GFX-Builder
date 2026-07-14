---
description: End-of-session safety check + handoff for NoaCG Studio - decide if the session is safe to archive and produce a pasteable continuation prompt
argument-hint: [optional note about what to focus on or what you know is unfinished]
---

Run a lightweight end-of-session handoff for **NoaCG Studio**. The single goal is to remove the
user's uncertainty about whether it is safe to ARCHIVE this chat/session - without losing work or
context. This is usually run at the very end of a coding session, often right after `/safe-merge`,
so in many cases the work is already committed, already merged into `main`, already pushed, and
already validated by the build gate. Do NOT blindly redo that work. Inspect the real state and
check only what actually needs checking.

Optional focus from the user: $ARGUMENTS

## Repo facts (this project)

- `main` is the default branch, normally checked out at the repo root (`C:\claude\NoaCG-Studio`).
  Feature/agent worktrees live under `.claude/worktrees/<name>` on `claude/*` branches. Never
  ASSUME where `main` is - read `git worktree list`.
- **Verification gate is `npm run build`** (tsc + eslint --max-warnings 0 + vite build). This is
  the CI gate and what `/safe-merge` runs. There is **no unit-test suite**.
- **The expensive suite to AVOID rerunning is `npm run test:e2e`** (Playwright against a live dev
  server - many minutes). Only run it, or a single focused spec from `e2e/`, if a UI-facing change
  went in *after* the last known-good run and nothing else covers it. A `npm run build` alone is
  usually sufficient evidence for non-UI logic.
- Standing permission exists to push verified work to `origin/main`, so after `/safe-merge` the
  work is typically already on the remote.
- **Don't commit `dist/`** as feature work. `.claude/launch.json` is generated/gitignored.
- Easily-forgotten, repo-specific loose ends to check for when relevant to the session's diff:
  - **Supabase migrations** under `supabase/` (backend/render features need them applied; e.g.
    the render pipeline needs migration 0007) and any env requirements (`.env`, `VITE_*` such as
    `VITE_RENDER_API`, `VITE_AI_PROXY_URL`, Supabase keys).
  - **Nested `CLAUDE.md` contracts** - if the session changed behavior in `src/model`,
    `templates`, `store`, `blocks`, `export`, `render`, `landing`, or `components`, was the area's
    CLAUDE.md kept accurate? Root CLAUDE.md and `docs/GOALS.md` milestones too.
  - Isolated packages (`render-worker/`, `player-host/`) are exact-pinned and built by scripts -
    a change there may need a rebuild step (`scripts/build-player-host.mjs`).

## Operating rules (do not break these)

- **Perform the checks yourself.** Do not merely print git commands for the user to run. Run
  them, read the output, and report conclusions.
- **This is a safety check, not a workflow.** Do not merge, push, commit, delete, clean, stash,
  reset, or rewrite history. The ONLY writes allowed are low-risk and clearly necessary to
  complete the handoff safely (see "Allowed writes"). If something significant is unfinished,
  REPORT it - never silently "fix" it by changing history or discarding state.
- **Don't rerun expensive tests** - especially `npm run test:e2e`. Prefer evidence that already
  exists. Only run additional validation for a concrete, named reason, and prefer the narrowest
  check that resolves the doubt (`npm run build`, a single `e2e/` spec, or an in-browser check).
- **Be practical, not ceremonial.** Fast enough to use after every session.

### Allowed writes (default: none)

By default, create NO files. Deliver the handoff directly in your response.

- Do NOT create a new handoff file, session-summary file, or timestamped note.
- Do NOT create a new memory file just because a session ended.
- The user keeps a durable auto-memory at
  `C:\Users\ahonemi\.claude\projects\C--claude-NoaCG-Studio\memory\` with a `MEMORY.md` index.
  ONLY if this session produced genuinely important, long-lived project knowledge (an
  architectural decision, a constraint, a known risk, an era/milestone status change) that would
  otherwise be lost, update the relevant EXISTING memory file (and its `MEMORY.md` line) rather
  than creating a new one. When unsure, put it in the response instead and ask.

## Phase 1 - Read the session state (read-only)

Gather the facts in a few batched commands; don't narrate each one. Determine:

1. **Where am I** - `git rev-parse --show-toplevel`, `git branch --show-current`,
   `git worktree list`, `git rev-parse --short HEAD`. Worktree or the `main` root?
2. **Uncommitted tracked changes** - `git status --porcelain=v1 --branch` (staged/modified? the
   `--branch` line also shows ahead/behind vs upstream).
3. **Unresolved conflicts / mid-operation state** - unmerged paths, or a lingering
   `MERGE_HEAD`/`REBASE_HEAD`/`CHERRY_PICK_HEAD`.
4. **Untracked files** - `git ls-files --others --exclude-standard` (respects `.gitignore`, so
   `dist/`, caches, and generated files like `.claude/launch.json` won't appear). Of what
   remains, decide which are *important* (new source, a `supabase/` migration, a doc, config the
   user meant to keep) vs scratch. Don't flag every stray file.
5. **Unpushed commits** - `git log --oneline @{upstream}..` if an upstream exists; otherwise check
   whether this branch's commits are already contained in `origin/main`.
6. **Is the work in `main` when expected?** - if the session's story is "finished and merged"
   (typical after `/safe-merge`), verify it: `git branch --merged main` and
   `git branch -r --contains HEAD`. Work that was supposed to land in `main` but isn't there (or
   isn't on `origin/main`) is a NOT-SAFE signal.
7. **Forgotten git state** - `git stash list`; any detached HEAD holding unique unreferenced work.

## Phase 2 - Reconcile repo state with what you know from the conversation

The repo shows only what was written down; you also have the conversation. Reconcile:

- **Unfinished implementation known only from context** - a half-done feature, an agreed TODO, a
  bug found but not fixed, a decision made in chat but not reflected in code/docs/CLAUDE.md. These
  vanish when the chat is archived - surface them explicitly. This is the most valuable output.
- **Loose ends implied by the diff** - a code change needing a migration, an env var, a
  package-isolated rebuild, a nested CLAUDE.md or `docs/GOALS.md` update, or an in-browser check
  that wasn't done.
- **Validation promised but skipped**, or that genuinely still matters.

## Phase 3 - Validation status (evidence-first, minimal)

Do NOT reflexively run anything. Establish what's already known, then decide:

1. **Reuse existing evidence** - a `npm run build` already run this session, checks run by
   `/safe-merge` (its gate runs `npm run build` on the merged commit), any in-browser/e2e check
   already done. If `/safe-merge` merged the work, its gate already validated it - say so and rely
   on it.
2. **Only run more for concrete uncertainty** - e.g. code changed *after* the last build, or a
   UI flow that nothing exercised. Prefer `npm run build`, then a single focused `e2e/` spec or an
   in-browser check - not the whole `test:e2e` suite.
3. **If you skip expensive validation, say so and why** - state plainly that you did not rerun
   `npm run test:e2e` and which existing evidence makes that acceptable. If a real gap remains,
   flag it as a note rather than implying it's confirmed.

## Phase 4 - Deliver the handoff

End your response with exactly these five sections, in order:

### 1. Archive verdict

Exactly one of (verbatim):

- `SAFE TO ARCHIVE`
- `SAFE TO ARCHIVE WITH NOTES`
- `NOT SAFE TO ARCHIVE YET`

Then one or two sentences on why. Guidance:
- `SAFE TO ARCHIVE` - clean tree, nothing unpushed that matters, expected work is on
  `main`/`origin/main`, no important loose ends, validation adequate.
- `SAFE TO ARCHIVE WITH NOTES` - nothing will be lost by archiving, but there are follow-ups,
  intentionally deferred items, or skipped-but-acceptable validation worth remembering.
- `NOT SAFE TO ARCHIVE YET` - archiving now would lose work or context: uncommitted/unpushed
  important changes, an unfinished task known only in this chat, expected-merged work missing from
  `main`, a pending migration/env step, or a real validation gap. Say exactly what to do first.

### 2. What was completed

A compact summary of the actual work done this session - grounded in git history, the diff, repo
state, and conversation context. Bullet points, no filler.

### 3. Anything left behind

List concretely, or explicitly write "Nothing important left behind." Cover: uncommitted changes,
important untracked files, unpushed commits, unfinished implementation, known bugs, pending
`supabase/` migrations or deploy/env/config steps, isolated-package rebuilds, CLAUDE.md/GOALS.md
updates, decisions not yet in code/docs, and anything known only from this conversation.

### 4. Validation status

What was validated, which existing evidence you relied on (build, `/safe-merge` gate, in-browser),
and that you intentionally did not rerun `npm run test:e2e` (with why) if that applies.

### 5. Pasteable prompt for the next session

A single self-contained prompt the user can paste into a fresh Claude Code or Codex session - put
it in one fenced code block so it copies cleanly. Include only what's useful: what was completed,
current repo/branch state when relevant, remaining work, key architectural decisions or
constraints (point at the right nested CLAUDE.md), known risks, and the best next step. No
transcript dump, no filler.

If nothing remains to continue, say so plainly - but still provide an optional compact context
prompt in the code block in case the user wants to revisit this area later.
