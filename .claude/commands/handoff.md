---
description: End-of-session handoff for NoaCG Studio - say what happened, what's next, and produce a pasteable continuation prompt
argument-hint: [optional note about what to focus on or what you know is unfinished]
---

Run a lightweight end-of-session handoff for **NoaCG Studio**. The goal is to tell the user **what
happened and what should or could be done next** - and to preserve the context that would otherwise
die with the chat. This is usually run at the very end of a session, often right after
`/safe-merge`, so in many cases the work is already committed, merged into `main`, pushed, and
validated by the build gate. Do NOT redo that work.

**This is a narrative, not a housekeeping report.** The user does not want a checklist of repo
hygiene read back to them. See "What NOT to produce" below - it is as binding as the rest.

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
- Repo-specific loose ends that are easy to forget. Check these SILENTLY against the session's
  diff; mention one only if it is genuinely outstanding, and then as a next step:
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
  them, read the output, and draw conclusions.
- **Read, don't write.** Do not merge, push, commit, delete, clean, stash, reset, or rewrite
  history. If something significant is unfinished, REPORT it - never silently "fix" it. The only
  writes allowed are in "Allowed writes" below.
- **Don't rerun expensive tests** - especially `npm run test:e2e`. Rely on evidence that already
  exists. Only run more for a concrete, named reason, and prefer the narrowest check that resolves
  the doubt (`npm run build`, a single `e2e/` spec, or an in-browser check).
- **Be practical, not ceremonial.** Fast enough to use after every session.

## What NOT to produce

The user has explicitly asked that this command not read housekeeping back to them. Do NOT emit:

- an "anything left behind" / loose-ends checklist;
- a section reciting repo hygiene - uncommitted files, unpushed commits, stashes, untracked
  scratch files, whether the branch landed on `main`;
- a standalone "validation status" section rehearsing what you did and didn't rerun.

You still READ all of that (Phase 1) - it grounds the summary and it is how you catch a genuine
problem. But it only reaches the response when it is **actually actionable**, and then it appears
as a next step, not as a checklist item. "Everything is committed and pushed" is not worth a line;
"the migration this code needs was never applied" is - because the next session must do it.

Rule of thumb: if the answer is the boring expected one, say nothing. Surface the exception only.

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

## Phase 1 - Read the session state (read-only, and mostly for your own benefit)

Gather the facts in a few batched commands; don't narrate each one. Most of what you find here will
NOT appear in the response - it exists so your summary is grounded in reality rather than in what
you remember doing, and so a genuine problem can't slip past. Determine:

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

## Phase 3 - Establish validation, quietly

Know what the work's validation status actually is - but do not write a section about it. Reuse
existing evidence: a `npm run build` already run this session, the `/safe-merge` gate (which runs
`npm run build` on the merged commit), any in-browser or `e2e/` check already done. Only run
something if there is concrete doubt - code changed *after* the last build, or a UI flow nothing
exercised - and then prefer `npm run build`, or a single focused `e2e/` spec, never the whole
`test:e2e` suite.

This surfaces in the response ONLY if there is a real gap - in which case it is a next step ("the
new Inspector control was never opened in a browser; check it before trusting it"), not a status
report. If everything was validated, the reader learns that from the verdict line and nothing else.

## Phase 4 - Deliver the handoff

Four sections, in this order. The verdict goes LAST, deliberately: it is the one-line summary the
user can jump to if they read nothing else.

### 1. What happened

What this session actually did, grounded in git history, the diff, and the conversation - not a
transcript. Prose or tight bullets; no filler. If a decision was made and *why* it was made, that
reasoning is worth more than the file list.

### 2. What's next

The best next step, plus anything else worth doing. This is where every real loose end lands -
including the ones a checklist would have caught:

- **Unfinished work known only from this chat** - a half-done feature, a bug found but not fixed, a
  design agreed but not built, a decision deferred. THIS IS THE MOST VALUABLE OUTPUT of the command:
  it is the only content here that git cannot reconstruct, and archiving the chat destroys it.
- **A blocking step the work implies** - a `supabase/` migration to apply, a `VITE_*` env var to
  set, `render-worker`/`player-host` to rebuild, a nested CLAUDE.md or `docs/GOALS.md` now wrong.
  Include these only when genuinely outstanding.
- **Optional follow-ups** - clearly marked as optional, so they are easy to skip.

If there is genuinely nothing to do next, say so in one line. Don't invent work.

### 3. Pasteable prompt for the next session

A single self-contained prompt the user can paste into a fresh Claude Code or Codex session - in
one fenced code block so it copies cleanly. Include what a cold reader needs: what was completed,
the repo/branch state if it matters, the remaining work, key constraints or architectural decisions
(point at the right nested CLAUDE.md), known risks, and the best next step. No transcript dump.

If nothing remains, still provide a compact context prompt in case the user revisits this area.

### 4. Bottom line

The last thing in the response, one or two lines. Lead with exactly one of (verbatim):

- `SAFE TO ARCHIVE`
- `SAFE TO ARCHIVE WITH NOTES`
- `NOT SAFE TO ARCHIVE YET`

Then, in the same breath, why - in plain language. This is the lazy-read line: a user who reads only
this sentence should know whether they can close the chat and what, if anything, is hanging.

- `SAFE TO ARCHIVE` - nothing is lost by closing this chat. The default after a clean `/safe-merge`.
- `SAFE TO ARCHIVE WITH NOTES` - nothing is lost, but there are follow-ups or deferred items
  captured above.
- `NOT SAFE TO ARCHIVE YET` - closing now loses work or context: important changes uncommitted or
  unpushed, work that was supposed to land on `main` but didn't, a required migration/env step, or
  an unfinished task known only here. Say in one line exactly what to do first.
