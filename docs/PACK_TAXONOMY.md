# Pack taxonomy — every reference format, mapped

Phase 3's taxonomy deliverable (docs/noacg-master-goals.md): the 60 live-program formats in
`live_format_graphics_needs.xlsx` (repo root, untracked) each map to exactly one **pack** — a
curated subset of graphic types in a fitting style family. The machine-readable half of this
document is **`src/templates/packs.ts`**; `scripts/factory.mjs` validates the two against the
live registry on every run, so this mapping cannot silently rot.

**A pack is pure config.** Because the type × family matrix is full (docs/GRAPHIC_TYPES.md §6),
every `(type, family)` cell already names a shipped, gate-checked design — so declaring a pack
is one entry in `PACKS`, no new template work. That is the "catalog growth is a config change"
half of Phase 3's done-when, made true for the axis it is true on:

- **A new pack = config.** Add the entry; the factory proves it resolves and that the format
  mapping stays exactly-once.
- **A new THEME ≠ config, deliberately.** A fifth family needs a `FAMILY_TOKENS` row, one design
  per type (nineteen of them now, each through the six gates), and the wizard's family chip. The matrix
  fill measured that real cost at ~30 designed variants per two families; pretending a theme is
  a config knob would just move that work somewhere unreviewed. `validatePacks` fails a pack
  pointing at an unfilled family, which keeps the claim honest.
- **The pack's family is a default, not a constraint.** Any pack resolves in any of the four
  families — the family field is the curated taste pick a non-technical user starts from.

What a pack does NOT yet have is a wizard surface (a "start from a pack" entry). That is a
product decision about the creation flow, left open on purpose; the taxonomy and the config are
ready for it either way.

## The twelve packs

| Pack | Family | Types (curated order) | Extras |
|---|---|---|---|
| Match Day | sport | scoreboard, countdown, lower-third, ticker, sponsor-bug, title-card, holding-screen, now-next, notice-card | vs01, cr03 |
| Esports | sport | scoreboard, lower-third, countdown, agenda, social-bug, sponsor-bug, holding-screen, title-card, now-next | vs02 |
| Creator | noacg | holding-screen, lower-third, topic-card, social-bug, sponsor-bug, countdown, poll, now-next, process-steps | — |
| Newsroom | minimal | lower-third, ticker, topic-card, title-card, headline-card, key-facts, notice-card, agenda, sponsor-bug | — |
| Election | minimal | poll, lower-third, ticker, title-card, headline-card, key-facts, agenda, countdown | — |
| Talk Show | glass | lower-third, topic-card, poll, agenda, key-facts, recap-card, social-bug, sponsor-bug, countdown | — |
| Corporate Events | minimal | agenda, lower-third, countdown, title-card, topic-card, poll, holding-screen, now-next, process-steps, recap-card, key-facts | — |
| Classroom | noacg | quiz-board, countdown, lower-third, topic-card, agenda, scoreboard, process-steps, key-facts, recap-card | — |
| Church & Ceremony | minimal | title-card, lower-third, topic-card, statement-card, holding-screen, countdown, agenda, now-next | cr01 |
| Stage & Music | glass | title-card, lower-third, now-next, holding-screen, countdown, social-bug, agenda, ticker, statement-card, notice-card | cr02 |
| Shopping | noacg | topic-card, countdown, lower-third, ticker, title-card, key-facts, sponsor-bug | — |
| Wellness | minimal | countdown, holding-screen, topic-card, process-steps, lower-third, social-bug | — |

The title/topic/information pack's seven types (docs/GRAPHIC_TYPES.md §6) joined the kits that
were standing in for them: the newsroom gets a real headline card and a public notice instead of
a topic card carrying a paragraph, corporate and classroom get the process/checklist and the
recap, church and stage get the bilingual statement, and now/next lands wherever a programme
runs to a schedule. No format's mapping moved — the packs describe the same 60 formats with
graphics that fit them better.

**Extras** are catalog variants outside the type registry that belong in the kit: the versus
card (vs01/vs02) for match-up reveals, end credits (cr01–cr03) where a program rolls them.
They ship without a state machine beyond the derived one, which is correct for what they are.

Family picks, briefly: sport carries both competitive packs; noacg (the house on-air look) goes
to the streamer-native packs where its amber control-room voice reads natively; glass suits the
premium conversational/stage registers; minimal serves every context where the graphics must
defer to the content (news, civic, corporate, worship, wellness). All taste — swappable per
project, and reviewable without touching the mapping below.

## The mapping — all 60 formats

Format names verbatim from the sheet. Notes only where the assignment was a judgement call.

| # | Format | Pack | Note |
|---|---|---|---|
| 1 | Sports broadcast / match coverage | Match Day | |
| 2 | Esports tournament | Esports | |
| 3 | Gaming livestream | Creator | |
| 4 | Just Chatting / personality stream | Creator | |
| 5 | News / current affairs livestream | Newsroom | |
| 6 | Live commerce / shopping stream | Shopping | |
| 7 | Talk show / panel discussion | Talk Show | |
| 8 | Podcast livestream / videocast | Talk Show | |
| 9 | Webinar / expert presentation | Corporate Events | |
| 10 | Conference / seminar stream | Corporate Events | |
| 11 | Corporate town hall / internal broadcast | Corporate Events | |
| 12 | Education / lecture livestream | Classroom | |
| 13 | Music performance / concert livestream | Stage & Music | |
| 14 | Award show / gala | Stage & Music | nominee/winner reveals are a gap (below) |
| 15 | Election night / results program | Election | result bars = the poll type; maps/seat counts are a gap |
| 16 | Weather broadcast / climate update | Newsroom | forecast panels/maps are a gap; the strap/ticker/card core is Newsroom's |
| 17 | Religious service / church livestream | Church & Ceremony | |
| 18 | Fitness / workout class | Wellness | interval timer = countdown; round counters ride its fields |
| 19 | Live Q&A / AMA | Talk Show | |
| 20 | Product launch / keynote | Corporate Events | |
| 21 | Charity telethon / fundraising stream | Creator | donation goal = the creator goal overlay pattern; totals bar is a gap |
| 22 | Remote interview show | Talk Show | |
| 23 | Magazine show / morning show | Talk Show | its ticker/weather inserts borrow from Newsroom |
| 24 | Cooking show / food livestream | Shopping | recipe/step cards + timers; secondary fit: Creator |
| 25 | Travel / IRL stream | Creator | |
| 26 | Watch party / reaction stream | Creator | |
| 27 | Debate / political discussion | Election | speaking timers = countdown; polls, topic cards |
| 28 | Student production / school TV | Classroom | end credits available via extras if wanted |
| 29 | Local sports / amateur sports | Match Day | |
| 30 | Theatre / live performance stream | Stage & Music | |
| 31 | DJ set / club stream | Stage & Music | |
| 32 | Radio-style livestream with video | Talk Show | now-playing card = topic card |
| 33 | Auction livestream | Shopping | lot/bid cards = topic card + countdown; live bid feed is a gap |
| 34 | Real estate / property livestream | Shopping | |
| 35 | Finance / market livestream | Newsroom | the market ticker IS the ticker type; charts/heatmaps are a gap |
| 36 | Tech support / coding livestream | Creator | |
| 37 | Art / design livestream | Creator | |
| 38 | Craft / maker livestream | Creator | |
| 39 | Tabletop RPG / board game stream | Creator | initiative/dice overlays are a gap |
| 40 | Quiz / game show livestream | Classroom | the quiz board's home format |
| 41 | Reality-style livestream / house stream | Creator | voting = poll |
| 42 | Security / surveillance-style public stream | Newsroom | label/timestamp/alert register — minimal's quiet voice |
| 43 | Animal cam / nature cam | Wellness | fact cards, calm register |
| 44 | Meditation / ambient livestream | Wellness | |
| 45 | Virtual event / metaverse event | Corporate Events | |
| 46 | Medical / health livestream | Corporate Events | disclaimer/source labels ride lower-third + topic-card fields |
| 47 | Legal / public information livestream | Corporate Events | |
| 48 | Municipal council / public meeting | Election | agenda items, speaking timer, vote result = poll |
| 49 | Press conference | Newsroom | |
| 50 | Emergency information stream | Newsroom | alert banner register; multilingual cards are fields, not new types |
| 51 | Behind-the-scenes production stream | Corporate Events | schedule/labels register |
| 52 | Red carpet / premiere stream | Stage & Music | |
| 53 | Fashion show livestream | Stage & Music | |
| 54 | Beauty / makeup livestream | Shopping | product/shade cards, affiliate CTA |
| 55 | Book launch / author event | Talk Show | interview register; quote/excerpt = topic card |
| 56 | Academic conference livestream | Corporate Events | |
| 57 | Graduation / ceremony stream | Church & Ceremony | |
| 58 | Wedding / private event livestream | Church & Ceremony | |
| 59 | Funeral / memorial livestream | Church & Ceremony | |
| 60 | Hybrid workshop / training session | Corporate Events | |

## What the sheet asks for that no type covers (the gap list)

Recorded so the next type is chosen by evidence, not vibes — the same way the first twelve
were. Roughly by how many formats ask:

- **Goal / progress bar** (donation total, inventory, challenge progress) — the poll type's
  bars are close; a dedicated single-bar goal type would serve ~8 formats.
- **Data charts / maps** (weather, election maps, finance charts, heatmaps) — a real data-viz
  surface, out of scope for the current model; revisit with external data feeds (master goals
  §1.5).
- **Chat / alert overlays** (chat highlight, follower alerts) — show-chat territory
  (src/community/showchat) more than template territory; the bridge is a product decision.
- **Frames** (webcam frame, split-screen, reaction frame) — static surrounds, no data fields;
  arguably a new category rather than a type.
- **QR code** (7 formats: CTAs, donations, listings) — a small, high-value type candidate; an
  image field renders one today but a dedicated type could generate it from a URL field.
- **Reveal moments** (winner reveal, nominee cards, before/after) — the quiz board's reveal
  machinery generalizes; a "reveal card" type is the natural next stateful type.
- **Lineups / brackets / leaderboards / stats panels** (sports & esports depth) — the agenda's
  rows and the scoreboard cover the basics; the full versions are their own types.
- **Lyrics / captions / surtitles** — timed-text playout is a different runtime problem; out
  of scope until external feeds exist.
- **Replay wipes / stingers** — full-frame transition moments; the versus card's territory,
  worth a dedicated "stinger" type if demand shows.

None of these block a pack: every format's CORE need is covered by the shipped types, which is
what the mapping above records.

## Keeping this true

- `scripts/factory.mjs` (dev server up) validates on every run: pack ids unique, every type id
  known, every `(type, family)` cell filled, every extra in the catalog, and the format list
  covering exactly `REFERENCE_FORMAT_COUNT` (60) with no double-mapping.
- Editing the sheet means updating `packs.ts` formats and this document together; the count
  assertion catches a drift in either direction.
- The pack lineup itself (names, family picks, which formats cluster) is a taste layer over a
  mechanical core — review it like a design, change it like config.
