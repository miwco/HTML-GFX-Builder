---
description: End-of-session handoff for NoaCG Studio - what should be done next, and whether this chat is safe to archive
argument-hint: [optional note about what to focus on or what you know is unfinished]
---

End-of-session handoff for **NoaCG Studio**. Usually run right after `/safe-merge`, so the work
is typically already committed, merged, pushed, and validated. Do NOT redo that work.

Optional focus from the user: $ARGUMENTS

## Output

**The question this command answers is "what should be done next?"** Everything else is
optional weight. No "what happened" summary, no hygiene checklist, no validation status
section, no mention of other branches or worktrees (the user prunes those deliberately, in
their own sessions).

### 1. What's next

A short list, best next step first. Concrete enough to act on without re-reading the chat.
Scope it to THIS session's line of work - never "go merge branch X". Include:

- **Unfinished work known only from this chat** - a half-done feature, a bug found but not
  fixed, a design agreed but not built, a decision deferred. This is the most valuable line in
  the output: git cannot reconstruct it and archiving the chat destroys it.
- **A blocking step the work implies** - a `supabase/` migration, a `VITE_*` env var, a
  `render-worker`/`player-host` rebuild, a nested `CLAUDE.md` or `docs/GOALS.md` now wrong.
- **Optional follow-ups**, clearly marked as optional so they are easy to skip.

If there is genuinely nothing to do next, say so in one line. Don't invent work.

### 2. Pasteable prompt - only if work remains

A single self-contained code block for a fresh Claude Code or Codex session: what was
completed, repo/branch state if it matters, the remaining work, key constraints or decisions
(point at the right nested `CLAUDE.md`), known risks, the best next step. No transcript dump.

Skip this section entirely when nothing remains - don't pad it out to look complete.

### 3. Bottom line

One or two lines, last. Lead with exactly one of these, verbatim, then why, in plain language:

- `SAFE TO ARCHIVE` - nothing is lost by closing this chat. The default after a clean `/safe-merge`.
- `SAFE TO ARCHIVE WITH NOTES` - nothing lost, but there are follow-ups captured in the prompt.
- `NOT SAFE TO ARCHIVE YET` - closing now loses work or context: important changes uncommitted or
  unpushed, work that should have landed on `main` but didn't, a required migration/env step, or
  an unfinished task known only here. Say in one line exactly what to do first.

## How to ground it (read-only)

Do this work for yourself - almost none of it reaches the response. Run the checks; don't print
commands for the user to run.

- **Where am I** - `git branch --show-current`, `git worktree list`, `git rev-parse --short HEAD`.
  Never ASSUME where `main` is; worktrees live under `.claude/worktrees/<name>` on `claude/*`.
- **What's outstanding** - `git status --porcelain=v1 --branch`, untracked files worth keeping
  (`git ls-files --others --exclude-standard`), `git stash list`, any mid-merge/rebase state, and
  whether the work actually reached `main`/`origin/main` when the session's story says it did.
- **Validation** - reuse existing evidence: a `npm run build` already run, the `/safe-merge` gate,
  any `e2e/` or in-browser check already done. `npm run build` (tsc + eslint + vite) is the gate;
  there is no unit-test suite. Only run something if code changed *after* the last check, and then
  prefer `npm run build` or ONE focused `e2e/` spec - **never the whole `npm run test:e2e` suite**.

A finding reaches the response only if it is actionable, and then it belongs in the prompt as
remaining work. If the answer is the boring expected one, say nothing.

## Rules

- **Read, don't write.** Never merge, push, commit, delete, clean, stash, reset, or rewrite
  history. Report problems; never silently fix them.
- **Create no files** - no handoff file, session summary, or timestamped note. Deliver in the
  response. Only if the session produced genuinely long-lived project knowledge (an architectural
  decision, a constraint, a known risk, a milestone change), update the relevant EXISTING memory
  file and its `MEMORY.md` line at
  `C:\Users\ahonemi\.claude\projects\C--claude-NoaCG-Studio\memory\`. When unsure, ask instead.
- **Be fast enough to use after every session.**
