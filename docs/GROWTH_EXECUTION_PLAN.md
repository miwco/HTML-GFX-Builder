# Growth execution plan - semi-automated

The operational playbook for the adoption push. It executes the GTM plan (the published
"Go-to-Market Plan" artifact, sections 06-08) with **as much automation as possible** and a fixed
human budget of **~5 h/week**. Companion docs: `docs/GOALS.md` (Era 7),
`docs/NIGHTLY_AUTOMATION_PLAN.md` (the library flywheel - reused here, not re-planned).

> Status: **ACTIVE PLAN**. Decisions below are locked (founder, 2026-07-08). Check items off as
> they land; treat the build backlog (§9) as the work queue.

---

## 0. Locked decisions

| Decision | Call |
|---|---|
| Outbound publishing | **Draft queue, human approves.** Nothing goes public under the founder's name without a click. Machines research, draft, package, and measure; the human approves and (for communities) personally posts. |
| Signup | **Open public signup now.** The allowlist gate comes off before any promotion. Hosted AI stays separately limited (free allowance + BYOK), so open signup carries no runaway cost. |
| Domain | **Buy one now.** `noacg.com` is taken. Recommendation: **`noacg.studio`** ($21.99/yr, exact brand match) + **`noacgstudio.com`** ($11.25/yr, defensive redirect). Alternatives checked and available: `noacg.app` $9.99, `noacg.graphics` $22, `noacg.tv` $35, `noacg.io` $37.99, `noacg.live` $3.99. |
| Founder time | **~5 h/week** (see §8 for how it's spent). No interviews/concierge onboarding in the base plan; they're opt-in extras. |
| Money | Adoption-first, free forever (GTM plan §00/§05). Running cost target for this whole engine: **≲ $50/month** (domain amortized + nightly AI generation with a hard spend cap; every channel below is otherwise free). |

## 1. The operating model

One sentence: **machines draft, a human approves, machines publish and measure.**

Every workstream runs the same loop:

```
   sense (scheduled agents / CI)  →  draft (agents)  →  QUEUE (human, ~1 click)
        ↑                                                        │
        └──────────  measure (weekly metrics digest)  ←  publish (CI / human paste)
```

The **approval queue** reuses native review surfaces instead of a new tool:

| Draft type | Queue surface | Approve action | Publish path |
|---|---|---|---|
| Library templates (nightly AI) | 🛡 Moderation queue (already shipped, Era 5.5) | Approve in-app | Goes live in gallery + becomes an SEO page + queues a social draft |
| SEO / content pages | **Pull request** per page | Merge | Vercel auto-deploys |
| Community posts & replies (forum, Reddit, Discord) | GitHub issue labeled `outreach-draft`, full text ready to paste | Copy-paste and post personally | Human posts (authenticity is the point) |
| Social posts (X, YouTube community, etc.) | GitHub issue labeled `social-draft` with copy + attached image/clip | Paste or one-click approve | Human paste now; API auto-post after approval is a later upgrade |
| Videos | CI artifact (mp4) + issue with description/title/tags | Watch, approve | Human uploads to YouTube (API upload later) |
| Weekly metrics digest | GitHub issue (auto) | none - read only | n/a |

Rule of thumb: **anything on our own property (site, gallery, repo) can graduate to auto-publish
once its gate proves itself** (same trajectory as the nightly library: human-reviewed → gate-trusted).
**Anything on someone else's property stays human-posted forever.**

## 2. Workstream W0 - Foundations (one-time, weeks 1-2)

The "make it exist publicly" phase. Everything here is a buildable task (§9).

- [ ] **Domain**: founder buys `noacg.studio` (+ `.com` redirect); wire to the Vercel project,
      set canonical URL, redirect the raw `.vercel.app` URL.
- [ ] **Open signup**: disable allowlist enforcement (keep the table + hook as a kill switch).
      Keep hosted-AI free allowance small; BYOK unlimited.
- [ ] **Public, crawlable marketing surface.** The app is a Vite SPA - crawlers get one shell.
      Fix: a **static prerender step in CI** that generates real HTML pages into the deploy:
      landing page, `/templates/<slug>` (one page per gallery template: screenshot, description,
      "open in NoaCG Studio", per-target download framing - SPX / CasparCG / OGraf / OBS), format-hub
      articles, comparison pages. Sitemap + per-page title/meta/OG image. This is the rails the
      nightly library rides: **every approved template automatically becomes an indexable landing
      page on the next build.**
- [ ] **Anon read access for the gallery** (currently signed-in-only; Era 5.5 deferred item).
      Needed so the prerendered template pages are real and shareable. Includes the login-less
      share page - every shared graphic then advertises the tool (the one in-product viral loop).
- [ ] **Analytics + funnel events**: Vercel Analytics on; a minimal `events` table in Supabase
      (signup, activation = first graphic created, export, return visit) with UTM/source capture.
      This feeds the weekly digest; without it nothing below is measurable.
- [ ] **GitHub public presence**: proper README (screenshots, 60-second pitch, self-host quickstart,
      AGPL clarity), topics, social preview image. The repo is itself a discovery channel
      (self-hosters, students, contributors).
- [ ] **Accounts the founder must create by hand** (automation can't, and shouldn't): CasparCG
      forum, SPX community/Discord, Reddit (note: new accounts need age/karma before posting -
      create NOW even though posting starts weeks later), YouTube channel, X/Bluesky,
      `html.graphics` marketplace seller account.

## 3. Workstream W1 - The library flywheel (the compounding asset)

**This is Era 7 / `docs/NIGHTLY_AUTOMATION_PLAN.md`, promoted from "unscheduled" to "build now"** -
it is the highest-leverage automation in the whole plan. Phases N0-N5 as written there (migration
`0006` least-privilege bot → nightly generate + gate → 🛡 review → digest). What this plan adds on top:

- Every **approved** nightly template automatically: (a) gets its prerendered SEO page, (b) queues
  one `social-draft` (screenshot/clip + copy), (c) enters a "seeding pool" for marketplace drops (W5).
- Brief bank is deliberately spread across **segment × occasion × format** (worship, student TV,
  esports, sports club; seasonal/holiday; vertical/square social formats) so the library covers the
  beachhead segments' actual searches ("church lower thirds", "esports scoreboard").
- Volume: start **3-5 drafts/night, hard spend cap**, human approves in the morning digest
  (~10 min/day inside the §8 budget). Scale only when the approve-rate is high and stable -
  that same signal later justifies gate-trusted auto-publish.

## 4. Workstream W2 - Content factory (SEO pages)

Cadence: **2 pages/week, drafted by a scheduled agent, delivered as PRs.**

Build order (from GTM §06 keyword strategy - own the format terms, wedge the comparisons):

1. Format hub: "What is SPX Graphics", "CasparCG HTML templates explained", "What is OGraf",
   "OBS browser-source graphics", "vMix titles from HTML" - definitive, genuinely useful, backlink bait.
2. Comparison pages: "Loopic alternative", "Singular.live alternative", "free CasparCG graphics
   tool" - honest, feature-by-feature, free-and-open as the closer.
3. Segment pages: "church lower thirds", "student TV graphics package", "esports scoreboard
   overlay" - each anchored on real gallery templates.
4. Tutorials (text twins of the W3 videos).

Mechanics: agent researches → writes the page in the site's prerender format → opens a PR with
preview link → founder merges (or comments; agent revises). Auto-publish for these can be earned
later (§1 rule); start with merge-as-approval since it's one click anyway.

## 5. Workstream W3 - Video factory

The audience lives on YouTube (OBS/vMix/CasparCG tutorial space is active) and video is the only
channel that *shows* the taste edge. Almost fully automatable here because **the app itself is
scriptable**: Playwright already drives the wizard headlessly (`scripts/l3-sweep.mjs` pattern).

Pipeline (all CI, one command): Playwright records the wizard building a specific graphic
(deterministic, pixel-perfect, real product) → tight cut to 60-90 s → AI voiceover from an approved
script (voice cloning/generation via the connected media MCP; founder approves THE voice once) →
title/description/tags drafted → mp4 + metadata land in the queue → founder watches, uploads.

- One **hero demo** (landing page + README + every launch post) first.
- Then **one 60-90 s template/tutorial video per week** ("broadcast lower third for OBS in 2
  minutes"), each doubling as a `social-draft` clip.
- Kill criterion: if after 10 videos watch-time and referral signups are ~zero, drop to
  hero-demo-only and reinvest the effort in W2/W5.

## 6. Workstream W4 - Community presence (listening + drafted replies)

The highest-signal channel (GTM Test 2) and the least automatable on the publish side - by design
(locked decision: human posts).

- **Listening (automated)**: a scheduled agent sweeps public surfaces on a cadence - CasparCG forum,
  r/livestreaming / r/obs / r/vMix / r/Twitch_Startup, worship-tech and student-TV spaces, SPX
  community - for threads where the tool genuinely answers the question ("how do I make lower
  thirds for CasparCG?", "free alternative to X?"). Output: an `outreach-draft` issue per hit with
  a **helpful-first** reply (answer the actual question; mention the tool only where it truly fits;
  never more than ~1 promotional mention per community per week).
- **Launch posts (drafted, human-posted)**: the "I built this" posts for the CasparCG forum and SPX
  community (weeks 3-4), then r/livestreaming etc. Drafted with screenshots/video attached; founder
  personalizes and posts. **Never launch to silence**: each post goes out only when the landing
  page, demo video, and open signup are live.
- **Show HN / Product Hunt (week 8+, optional)**: only if the hero demo is genuinely impressive and
  the first community posts showed pull. Drafted the same way.
- Everything measured via UTM/source in the funnel events, reported in the weekly digest.

## 7. Workstream W5 - Seeding + distribution drip

- **Marketplace seeding (semi-auto)**: from the library's seeding pool, CI packages 5-10 premium
  templates as plug-and-play downloads (the export pipeline already produces these) with listing
  copy + screenshots → founder submits to `html.graphics`, the CasparCG forum template section, and
  OBS/vMix template spaces. Each links "made with / edit in NoaCG Studio". Refresh monthly with the
  library's best new approvals.
- **Social drip (semi-auto)**: the `social-draft` queue (one per approved template + one per video
  + feature notes) gives a steady 3-5 posts/week for X/Bluesky/YouTube-community at ~zero marginal
  effort. Paste-to-post now; API auto-post is an earnable upgrade for our own accounts.
- **In-product loop**: the login-less share page (W0) + a subtle "Made with NoaCG Studio" credit on
  shared/community pages (never injected into users' exports - their output is theirs).

## 8. The founder's 5 hours/week

| When | What | Time |
|---|---|---|
| Daily (mornings) | Digest: approve/reject nightly templates in 🛡, skim health issues | ~10 min/day ≈ 1 h |
| Weekly block 1 | Approve queue: merge content PRs, approve videos/social drafts, post approved community replies | ~1.5 h |
| Weekly block 2 | Personal community presence: answer a few threads yourself, engage where the drafts landed | ~1.5 h |
| Weekly block 3 | Read the metrics digest; one steering decision (scale/kill a channel, tune the brief bank) | ~30 min |
| Slack | Occasional: record/upload a video, submit a marketplace listing | ~30 min |

Explicitly **cut** at this budget (from GTM §08): customer-discovery interviews and concierge
onboarding. Both are high-signal; add them back only if a week frees up - the plan does not depend
on them.

## 9. Build backlog (ordered; each item is one spawnable session)

Foundations first, flywheel second, factories third. Nothing below promotes until 1-6 are done.

1. **Open signup** - disable allowlist enforcement, keep the kill switch; live-verify signup flow.
2. **Funnel events + UTM capture** - Supabase `events` table + client hooks (signup, activation,
   export, return); privacy-respecting, documented.
3. **Anon gallery read + login-less share page** - RLS/RPC change (adversarial review like 0004/0005)
   + public template page + share route.
4. **Static prerender step** - CI generates landing + `/templates/<slug>` + article pages + sitemap
   + OG images into the deploy.
5. **README + repo public presence** - screenshots, pitch, self-host quickstart, topics.
6. **Domain wiring** - after purchase: attach to Vercel, canonical + redirects. *(Founder: buy
   `noacg.studio` + `noacgstudio.com`.)*
7. **Era 7 phases N0-N3** - migration 0006 + bot, nightly-generate script + motion checker, staging,
   🛡 "AI drafts" filter (per `NIGHTLY_AUTOMATION_PLAN.md`).
8. **Era 7 phases N4-N5** - GitHub Actions crons (health + generate) + the read-only review agent +
   morning digest.
9. **Weekly metrics digest** - scheduled job: Supabase funnel numbers, channel attribution, AI spend,
   library stats → GitHub issue.
10. **Content-factory routine** - scheduled agent: 2 SEO pages/week as PRs (format hub first).
11. **Video pipeline v1** - Playwright recording + voiceover + cut for the hero demo; then weekly.
12. **Listening routine** - scheduled agent sweeping communities → `outreach-draft` issues.
13. **Launch-post drafts** - CasparCG forum + SPX community "I built this" (goes out only when 1-6
    + hero demo are live).
14. **Seeding pack v1** - package + listing copy for the first 5-10 marketplace templates.

## 10. Calendar (12 weeks)

| Weeks | Focus | Public? |
|---|---|---|
| 1-2 | W0 foundations (backlog 1-6); founder buys domain + creates accounts | Quiet |
| 2-4 | W1 nightly library live (7-8); digest (9); hero demo (11); launch drafts (13) | Quiet |
| 3-4 | **Soft launch**: CasparCG forum + SPX community posts; listening routine on (12) | Yes - target communities |
| 4-8 | Content factory running (10); weekly videos; Reddit/worship/student-TV posts as drafts mature | Widening |
| 8-12 | Seeding drop 1 (14); optional Show HN; scale nightly volume if approve-rate is high | Public beta |
| 12+ | Steady state: everything recurring; founder steers via digest; earn auto-publish upgrades | Ongoing |

## 11. Metrics + decision rules (unchanged from GTM §08, now automated)

The one number: **week-1 retention among activated users from target communities.**

- Funnel: visit → signup → **activation** (created a graphic) → **D7 return** → export/live use.
- Weekly digest reports: signups by source, activation rate, D7 retention, exports by target,
  library size + approve-rate, AI spend vs cap, top referring pages.
- **Decision rule**: if people find it, make a graphic, and come back - pour effort into
  distribution and breadth. If they try once and never return, that is a **usefulness gap**: pause
  scaling traffic, fix stickiness (the digest will show *where* they drop).
- Per-channel kill criteria: community post with near-zero sustained use → rework positioning, not
  more posts; 10 videos with no referrals → hero-only; nothing ranking/referring by day 90 → keep
  SEO as byproduct-of-library only.
- Cost rule: nightly AI spend is hard-capped in the script; if hosted-AI subsidy grows painful,
  Era 5.6 metering switches on quietly (never blocks BYOK or the free core).
