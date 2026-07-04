# Course Planning Prompt — "Learn HTML Broadcast Graphics" (Duolingo-style)

This file is a **paste-ready prompt**. Copy everything below the line into a new planning session
(with an AI, or as a brief for a human co-planner) to kick off the full curriculum plan for the
learning app. Fill in or adjust anything in `[brackets]` first if you want, but it works as-is.

A follow-up course on **OGraf** graphics will be planned later as a separate track — it is
mentioned in the prompt only so the curriculum leaves room for it.

---

## The prompt (copy from here)

You are my curriculum designer and pedagogy partner. We are planning a **mobile/web learning app
in the style of Duolingo/Memrise** that teaches complete beginners how to build **HTML broadcast
graphics** — the kind played out by **SPX Graphics / CasparCG** (lower thirds, bugs, tickers,
full-screens). Think "Duolingo, but the language is HTML/CSS/JS for on-air graphics."

**Read this whole brief before proposing anything, then follow the process at the end.**

### 1. Mission and priorities (non-negotiable)

1. **Learning first, gamified second.** I absolutely want the streaks, XP, levels, challenges and
   all the bells and whistles eventually — but we design the **pedagogy completely first**. Do not
   design any gamification until the full lesson plan and progression are approved. Gamification
   is Phase 2 and must decorate the learning path, never distort it.
2. **Really small steps.** Every lesson introduces **exactly one new idea**. If a lesson needs two
   new ideas, it is two lessons. A student should never see a line of code containing something
   they haven't been taught yet (or that we haven't explicitly marked "boilerplate — trust it for
   now, explained in lesson X.Y").
3. **Only what you need for graphics.** This is *not* a web-development course. We teach the
   minimal, carefully chosen subset of HTML, CSS and JavaScript required to build simple broadcast
   templates — nothing else. No forms, no responsive layout theory, no frameworks, no build tools,
   no server anything. When in doubt, cut it.
4. **Basic templates only, nothing weird or difficult.** The graduation target is that a student
   can build, from scratch, a handful of clean, ordinary, professional templates: a lower third, a
   corner bug, a simple full-screen title, and a basic ticker. Tasteful and reliable beats clever.
5. **Real output.** Everything learned must add up to templates that actually run in SPX. The
   final projects are working SPX templates, not toy exercises.

### 2. The audience

- My students: `[media/broadcast students, adult beginners]`. Assume **zero** prior programming
  knowledge. Assume they know what a lower third *is* from watching TV, but not how it's made.
- They will use the app on **mobile and/or web**, in short sessions (5–15 minutes), Duolingo-style.
- Language of instruction: `[English — but plan lesson text so it is easy to localize later]`.
- Many will go on to use an AI-assisted builder tool and ready-made templates from the internet —
  so the course's real job is **reading fluency and small-edit confidence**: understand a
  template someone (or something) else wrote, and confidently make small, correct changes to it,
  as well as build basic ones from scratch.

### 3. The domain we are teaching (the technical target)

The course teaches the **SPX HTML template contract**. The essentials the curriculum must cover
by the end (this is the ceiling, not the starting point):

- **HTML subset:** `<div>`, `<span>`, `<img>`, ids and classes, nesting, the basic document
  skeleton, `<style>` and `<script>` tags. That's roughly it.
- **CSS subset:** selectors (element/class/id), color, `font-family`/`font-size`/`font-weight`,
  padding/margin, `position: absolute` + offsets (broadcast graphics live on a fixed 1920×1080
  canvas — this makes positioning *easier* to teach than normal web layout), `opacity`,
  `transform: translate/scale`, `transition`, `@keyframes`, CSS variables (`:root`,
  `var(--accent)`), and `@font-face` at the "recognize and edit" level.
- **JavaScript subset:** what a function is, calling vs. defining,
  `document.getElementById(...)`, setting `.textContent` / `.src` / `.style`, adding/removing a
  class, `JSON.parse`, and reading values out of an object. GSAP tweens
  (`gsap.to/from/fromTo/timeline`) at the "read, tweak numbers and easings, write a simple one"
  level.
- **The SPX contract itself:**
  - A global `window.SPXGCTemplateDefinition = { ...settings, DataFields: [...] }` describes the
    operator-editable fields (`f0`, `f1`, … with an `ftype` such as textfield, dropdown, number).
  - SPX calls global functions `play()`, `stop()`, and `update(data)` where `data` is a **JSON
    string**; multi-step graphics also get `next()`.
  - Convention: each field `fN` maps to one element with `id="fN"`; `update()` writes values into
    those elements.
  - Animate **in** on `play()`, **out** on `stop()`; transforms/opacity, professional easing
    (entrances ease out, exits ease in and run faster).
- **Broadcast context woven in throughout, not as a separate unit:** safe areas, the 1920×1080
  coordinate space, transparency/keying (why the background stays empty), why graphics animate in
  and out, what an operator does in the SPX client.

Explicitly **out of scope**: flexbox/grid theory beyond one "trust this centering recipe" pattern,
media queries, npm/tooling, fetch/APIs, canvas/WebGL, TypeScript, frameworks, and anything the
above list doesn't need. An **OGraf course** will follow later as a separate advanced track — just
keep the concept naming compatible (e.g. don't teach "template" in a way that makes "manifest"
confusing later); do not plan it now.

### 4. Pedagogy requirements (this is what I care about most)

Design the course around these principles and say explicitly, in the plan, how each is honored:

- **One new concept per lesson**, always introduced inside a *graphics* context (never "here is a
  variable" in the abstract — always "here is the presenter's name we need to change").
- **Show → predict → do → build ladder.** Exercise types, roughly in increasing difficulty:
  1. *Observe* — watch a tiny graphic render/animate; tap the line of code responsible.
  2. *Predict* — "what will this show / what color / where will it move?" (multiple choice).
  3. *Fill the blank* — one hole in otherwise-complete code (word bank on mobile, typing on web).
  4. *Fix the bug* — a realistic broken template line; find and correct it.
  5. *Arrange* — order shuffled lines/blocks into working code (Parsons problems).
  6. *Type it* — write one short line or declaration from scratch.
  7. *Build* — end-of-unit checkpoint: assemble a small working graphic from what the unit taught.
  Every lesson should mix 2–4 of these; every exercise renders a **live visual result** wherever
  possible, because the payoff of this domain is that *the code is immediately visible on screen*.
- **Spaced review.** Concepts return in later lessons in new contexts; plan explicit review
  lessons and mark, for every lesson, which earlier concepts it deliberately recycles.
- **Checkpoint projects** at the end of each unit: a real mini-graphic the student completes,
  culminating in the final projects (lower third, bug, full-screen, ticker) as the course's
  capstones.
- **Mastery gates, not time gates.** Define what "passed" means per lesson and per unit, and what
  happens on failure (targeted remediation, not just "try again").
- **Beginner-safe error experience.** Plan how mistakes are handled pedagogically: errors should
  produce visible, explainable results ("the name didn't change — which id did you target?"),
  never silent failure or a raw stack trace.
- **Small-screen honesty.** For every exercise type, note whether it works on a phone. Heavy
  typing belongs on web/tablet; mobile leans on taps, word banks, and arranging. The *curriculum*
  must not depend on typing speed.

### 5. What I want you to produce (the deliverables of this planning session)

Produce these, in order, pausing for my approval between each:

1. **Course map (one page).** The unit arc from "first tap" to "exports a working SPX lower
   third", with a one-line promise per unit ("After this unit you can …"). As a starting point to
   react against — improve it, don't just accept it — I imagine an arc like: *Hello, graphic*
   (what a template is, text on screen) → *Making it yours* (HTML structure, ids, changing
   content) → *Making it look right* (CSS core: color, type, the 1080p canvas, position) →
   *Making it move* (transitions → keyframes → GSAP, easing taste) → *Making it live* (the SPX
   contract: definition, fields, update/play/stop) → *Making it real* (export, the SPX client,
   operator's view, capstone projects). Somewhere between 6 and 10 units feels right.
2. **Unit plans.** For each unit: goal, prerequisite units, the ordered list of lessons (title +
   the single new concept each teaches), which earlier concepts it recycles for spaced review,
   and its checkpoint project.
3. **Lesson plans — the heart of this.** For *every* lesson: (a) the one new concept, (b) the
   1–2-sentence learner-facing explanation in plain language, (c) the concrete graphics context
   it's taught in, (d) 4–8 exercises specified precisely (type from the ladder above, the actual
   code/question/options/answer), (e) success criteria, (f) the common wrong answers and what
   feedback each gets, (g) estimated duration (target: 3–7 minutes). Write lesson plans for the
   first two units in full detail; outline the rest at one-paragraph-per-lesson level, then we
   iterate.
4. **Progression & mastery model.** Prerequisite graph, gating rules, review scheduling, what the
   skill-tree/path looks like structurally (ignore visual theming for now), and placement for
   learners who aren't total beginners (a test-out per unit?).
5. **Only after 1–4 are approved: Gamification plan (Phase 2).** XP, streaks, hearts/lives or a
   kinder alternative, leagues/leaderboards (optional for classroom use), badges tied to *real
   competencies* ("Animated a lower third with correct easing"), daily-goal mechanics, and
   teacher/classroom features (`[I teach real classes — assume a teacher dashboard is wanted
   eventually]`). Every mechanic must state which learning behavior it reinforces.
6. **Last: app/product outline (Phase 3).** Platform recommendation (PWA vs. native vs.
   responsive web), the exercise-player architecture (exercises as data, a safe sandboxed
   renderer for live code preview), content pipeline (lessons authored as versionable
   files), and an MVP cut: the smallest slice — probably Unit 1 fully playable — that lets me
   test the pedagogy with real students.

### 6. Ground rules for the process

- **Ask before assuming.** Start by asking me your highest-impact clarifying questions (max 5),
  then propose deliverable 1.
- **One deliverable at a time.** Do not run ahead to gamification or app tech — I will bring us
  there once the teaching is right.
- **Every example must be broadcast-real.** Presenter names, scores, weather, headlines — never
  `foo`/`bar`, never generic web-page examples.
- **Code style in all teaching materials:** simple, obvious, commented, beginner-friendly. Prefer
  the boring correct way. All example templates must follow the SPX contract described above and
  should be valid enough to actually play out.
- When lesson content needs authoritative SPX details (field types, settings, lifecycle), flag it
  and I'll supply the reference docs (`SPX_TEMPLATE_FORMAT.md` and the SPX template
  documentation) rather than you guessing.

Begin with your clarifying questions, then the course map.
