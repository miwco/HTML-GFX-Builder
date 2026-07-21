---
description: Plan what to do next in this session - concrete options to choose from, or an honest "nothing left"
argument-hint: [optional constraint or focus, e.g. "small tasks only" or "stay in the video area"]
---

Mid-session planning for **NoaCG Studio**. The user wants to decide what to do next in THIS
session and expects real, choosable options - or an honest "we're done".

Optional focus from the user: $ARGUMENTS

## The honesty rule (overrides everything below)

**Never invent work to have something to offer.** If the session's line of work is complete,
verified, and committed, and nothing actionable is outstanding, the correct output is one short
paragraph saying exactly that - and, if true, that the natural next step is `/safe-merge` or
`/handoff`, not more work here. A padded option list is a failure of this command. "Nothing more
to be done in this session" is a fully valid, complete answer.

Do not downgrade real gaps to reach that answer either: uncommitted changes, a failing check, a
bug found but not fixed, or a step the work implies (migration, env var, doc now wrong) mean the
session is NOT done, and fixing that is option one.

## How to ground it (read-only)

Do this for yourself; almost none of it reaches the response. Never write, commit, or fix
anything while grounding.

- **This chat first.** The best options come from the session itself: work started but not
  finished, a bug or smell noticed in passing, a decision made but not built, a review finding
  deferred, something the user said earlier and dropped. Re-read the conversation before
  touching git.
- **Repo state.** `git branch --show-current`, `git status --porcelain=v1 --branch`,
  `git log --oneline -5`, untracked files worth keeping. Uncommitted verified work is always a
  candidate option; unverified work makes verification the option.
- **Verification gap.** Was `npm run build` run after the last code change? Is there observable
  behaviour that was never checked in the browser or with a focused `e2e/` spec? A green build
  alone does not close a UI-visible change.
- **The backlog, only if the session's own work is exhausted:** `docs/GOALS.md` (unchecked
  milestones) and the memory index at
  `C:\Users\ahonemi\.claude\projects\C--claude-NoaCG-Studio\memory\MEMORY.md` (deferred and
  open items). Backlog options must still be honest: only list what is genuinely actionable
  from this checkout, and mark them as new scope, not session leftovers.

## Output

### 1. Where this session stands

Two or three lines max: what the session set out to do and whether it is done, verified, and
committed. This is the basis for everything below - if it says "done", the options section had
better earn its existence.

### 2. The options

3-5 options, best first, each one:

- **A short imperative title** the user can pick by name.
- **What it concretely means** - files/areas touched, roughly how big, and why it is worth doing
  *now* rather than in a fresh session.
- **Its source** - session leftover, verification gap, landing the work (`/safe-merge` + push),
  or backlog (`docs/GOALS.md` / memory). Session leftovers and verification gaps always outrank
  backlog items.

When the session's work is committed and verified, **"merge and push via `/safe-merge`" is a
first-class option** - often the recommended one. Offering it here is fine; the user picking it
is what makes it user-initiated. Never run it yourself off this command.

Mark exactly one option as **recommended** and say why in one line. If only one honest option
exists, list only that one - do not pad to three.

When the honest options number 2-4, ALSO present them with the AskUserQuestion tool (recommended
option first, labelled "(Recommended)"), so the user can pick with one click. Include a "Nothing
- wrap up" style option only when wrapping up is genuinely reasonable at this point.

### 3. If the answer is "nothing"

Skip section 2 entirely. One short paragraph: the session is complete, what evidence says so
(build/e2e/commit state), and whether `/safe-merge` (user-initiated) or `/handoff` is the
natural close. Do not append a consolation backlog list.

## Rules

- **Read, don't write.** This command plans; it changes nothing. No commits, fixes, file
  creation, or memory writes.
- **Options must be about THIS session's line of work.** Suggesting `/safe-merge`/push for this
  session's branch is in scope; never execute it unasked. Never offer repo/workspace cleanup
  (leftover worktrees, stale branches, node_modules pruning, etc.) - the user handles those
  deliberately elsewhere. Same for other worktrees' business or work that plainly belongs in a
  fresh session - name that separately in one line if it exists.
- **Respect the user's focus argument** - filter options through it; if it filters everything
  out, say so rather than stretching.
- **Be fast.** Grounding is a minute of reads, not a research project. Never run the full e2e
  suite or anything that spends tokens/money to generate options.
