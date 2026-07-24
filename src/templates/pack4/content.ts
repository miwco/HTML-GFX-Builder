// The TITLE / TOPIC / INFORMATION pack's CONTENT contract: the field declarations of its
// graphic types, and the starting text every one of its designs ships with.
//
// Why one module and not one per design. A promoted design has to agree with its type twice —
// its wizard `suggestedLines` must carry the type's field LABELS, and its sample text must be
// what the type would show for it (TypeDesign.samples). Those are two files that can drift,
// which is exactly what the factory's samples gate exists to catch. Declaring the words ONCE
// here and deriving both sides from them means they cannot drift in the first place: the
// variant builds `suggestedLines: typeLines(FIELDS, SAMPLES)` and the type declares the same
// `SAMPLES`.
//
// The title-card and topic-card declarations live here too, even though those two types are
// older than this pack, because this pack is what made them shared: types/cards.ts imports
// them from here and the pack's new designs read the same array.

import type { TypeField } from '../types/graphicType';

// ── Titles: shows, events, sessions, segments, episodes, keynotes ────────────

/** TITLE / OPENER CARD — a kicker, one large title, and a quiet supporting line. */
export const TITLE_CARD_FIELDS: TypeField[] = [
  { key: 'title', label: 'Title', kind: 'text', value: 'The Results Show', role: 'line' },
  { key: 'kicker', label: 'Kicker', kind: 'text', value: 'Elections 2026', role: 'line' },
  { key: 'subtitle', label: 'Subtitle', kind: 'text', value: 'Live from the studio · 20:00', role: 'line' },
];

/** card10 "Session Title" — a conference session opener: track, session name, time and room. */
export const CARD10_SAMPLES = {
  title: 'Designing for Trust',
  kicker: 'Track B · Product',
  subtitle: '14:30 — Hall 2, Auditorium',
};

/** card11 "Keynote Title" — the keynote opener: the talk, then who is giving it. */
export const CARD11_SAMPLES = {
  title: 'The Next Ten Years',
  kicker: 'Opening keynote',
  subtitle: 'Dr Amara Osei · Chief Scientist',
};

/** card12 "Segment Title" — the broadcast segment opener, numbered like a rundown item. */
export const CARD12_SAMPLES = {
  title: 'SECOND HALF',
  kicker: 'SEGMENT 03',
  subtitle: 'ANALYSIS · LIVE FROM THE TOUCHLINE',
};

/** card13 "Service Title" — the ceremony opener: the service, the date, a line of welcome. */
export const CARD13_SAMPLES = {
  title: 'Morning Service',
  kicker: 'Sunday 9 March',
  subtitle: 'Welcome — please join us in the opening hymn',
};

// ── Topics and chapters ──────────────────────────────────────────────────────

/** TOPIC / QUESTION CARD — the card that stays up during the discussion. */
export const TOPIC_CARD_FIELDS: TypeField[] = [
  { key: 'heading', label: 'Heading', kind: 'text', value: 'The Story in Numbers', role: 'line' },
  { key: 'line1', label: 'Line 1', kind: 'text', value: 'Renewables grew 28% this year', role: 'line' },
  { key: 'line2', label: 'Line 2', kind: 'text', value: 'Coal at its lowest share since 1965', role: 'line' },
];

/** card14 "Chapter Card" — a documentary chapter marker. */
export const CARD14_SAMPLES = {
  heading: 'Chapter Two — The Long Winter',
  line1: 'How the supply crisis began',
  line2: '1973 to 1979',
};

/** card15 "Question Card" — the question under discussion, with what it turns on. */
export const CARD15_SAMPLES = {
  heading: 'Is a four-day week enough?',
  line1: 'What the trials actually measured',
  line2: 'And what they could not',
};

/** card16 "Topic Slab" — the sport talking point. */
export const CARD16_SAMPLES = {
  heading: 'WHERE THE GAME WAS WON',
  line1: 'PRESSING HIGH FROM MINUTE ONE',
  line2: 'THREE GOALS FROM TURNOVERS',
};

/** card17 "Key Term" — the explainer's key-term card: a word, then what it means. */
export const CARD17_SAMPLES = {
  heading: 'Latency',
  line1: 'The delay between an action and its result',
  line2: 'Measured end to end, in milliseconds',
};

// ── Now playing / coming up ──────────────────────────────────────────────────

/**
 * NOW / NEXT — what is on air and what follows it.
 *
 * Both LABELS are operator fields rather than text baked into the design, and that is a
 * deliberate contract decision: "NOW PLAYING" is the one string on this graphic that a
 * non-English show has to change, and a hard-coded label would have made the whole design
 * unusable to them.
 */
export const NOW_NEXT_FIELDS: TypeField[] = [
  { key: 'nowLabel', label: 'Now label', kind: 'text', value: 'NOW PLAYING', role: 'line' },
  { key: 'now', label: 'Now', kind: 'text', value: 'Ordinary Light', role: 'line' },
  { key: 'nowMeta', label: 'Now detail', kind: 'text', value: 'The Hollow Coast · from the album Northbound', role: 'line' },
  { key: 'nextLabel', label: 'Next label', kind: 'text', value: 'COMING UP', role: 'line' },
  { key: 'next', label: 'Next', kind: 'text', value: 'Interval — back at 21:15', role: 'line' },
];

export const CARD18_SAMPLES = {
  nowLabel: 'ON AIR NOW',
  now: 'The Nine O’Clock Debate',
  nowMeta: 'Live from Studio One',
  nextLabel: 'NEXT',
  next: 'Late Edition · 22:15',
};

export const CARD19_SAMPLES = {
  nowLabel: 'NOW PLAYING',
  now: 'Ordinary Light',
  nowMeta: 'The Hollow Coast · live at the Roundhouse',
  nextLabel: 'COMING UP',
  next: 'Interval — back at 21:15',
};

export const CARD20_SAMPLES = {
  nowLabel: 'ON NOW',
  now: 'HEAT THREE — 200M FREESTYLE',
  nowMeta: 'LANE 4 · WORLD RECORD HOLDER',
  nextLabel: 'UP NEXT',
  next: 'MEDAL CEREMONY · 15:40',
};

export const CARD21_SAMPLES = {
  nowLabel: 'NOW',
  now: 'Build a lower third in five minutes',
  nowMeta: 'Workshop · Studio B',
  nextLabel: 'NEXT',
  next: 'Q&A with the team · 16:00',
};

// ── Headline + body ──────────────────────────────────────────────────────────

/** HEADLINE CARD — a kicker, the headline, the paragraph under it, and where it came from. */
export const HEADLINE_FIELDS: TypeField[] = [
  { key: 'kicker', label: 'Kicker', kind: 'text', value: 'BREAKING', role: 'line' },
  { key: 'headline', label: 'Headline', kind: 'text', value: 'Coalition agrees emergency energy package', role: 'line' },
  {
    key: 'body',
    label: 'Body',
    kind: 'text',
    value:
      'Ministers signed the deal shortly after midnight, ending eleven hours of talks. ' +
      'The package caps household bills until spring and funds a winter grid reserve.',
    role: 'line',
  },
  { key: 'source', label: 'Source', kind: 'text', value: 'Reporting · Anna Weiss, political correspondent', role: 'line' },
];

export const CARD22_SAMPLES = {
  kicker: 'BREAKING',
  headline: 'Coalition agrees emergency energy package',
  body:
    'Ministers signed the deal shortly after midnight, ending eleven hours of talks. ' +
    'The package caps household bills until spring and funds a winter grid reserve.',
  source: 'Reporting · Anna Weiss, political correspondent',
};

export const CARD23_SAMPLES = {
  kicker: 'ANNOUNCEMENT',
  headline: 'Season tickets go on sale on Friday',
  body:
    'Members get first access from 09:00 and the general sale opens at noon. Prices are held ' +
    'at last season’s level for every seat in the lower tier.',
  source: 'Box office · tickets.example.com',
};

export const CARD24_SAMPLES = {
  kicker: 'FULL TIME',
  headline: 'CITY TAKE THE TITLE ON GOAL DIFFERENCE',
  body:
    'A 2–1 win at the Arena ends a nine-year wait. Alvarez scored both, the second from a ' +
    'corner deep in stoppage time.',
  source: 'MATCH REPORT · ROUND 38',
};

export const CARD25_SAMPLES = {
  kicker: 'RELEASE 2.4',
  headline: 'Templates now export to five platforms',
  body:
    'One graphic, five packages: SPX, CasparCG, OGraf, OBS and vMix. Nothing to re-author, ' +
    'and every export stays plug-and-play.',
  source: 'Release notes · noacg.studio/releases',
};

// ── Steps, processes and checklists ──────────────────────────────────────────

/**
 * PROCESS / CHECKLIST — a heading and up to four ordered steps.
 *
 * This is the pack's one STEPPED type (TypeCapabilities.defaultSteps): a process shown all at
 * once is a list, not a process, so the graphic is created with SPX Continue driving one step
 * per press. Every design still degrades to the plain list when the operator turns steps off.
 */
export const PROCESS_FIELDS: TypeField[] = [
  { key: 'heading', label: 'Heading', kind: 'text', value: 'How to take part', role: 'line' },
  { key: 'step1', label: 'Step 1', kind: 'text', value: 'Post your question in the chat', role: 'line' },
  { key: 'step2', label: 'Step 2', kind: 'text', value: 'Add your first name and where you are watching from', role: 'line' },
  { key: 'step3', label: 'Step 3', kind: 'text', value: 'Our producer picks questions from 20:30', role: 'line' },
  { key: 'step4', label: 'Step 4', kind: 'text', value: 'Stay on the line — we may bring you on air', role: 'line' },
];

export const CARD26_SAMPLES = {
  heading: 'How to take part',
  step1: 'Post your question in the chat',
  step2: 'Add your first name and where you are watching from',
  step3: 'Our producer picks questions from 20:30',
  step4: 'Stay on the line — we may bring you on air',
};

export const CARD27_SAMPLES = {
  heading: 'Before you go live',
  step1: 'Camera framed and white balanced',
  step2: 'Microphone levels between −18 and −12 dB',
  step3: 'Graphics loaded and rehearsed',
  step4: 'Recording armed on both machines',
};

export const CARD28_SAMPLES = {
  heading: 'MATCH DAY ROUTINE',
  step1: 'GATES OPEN 90 MINUTES BEFORE KICK-OFF',
  step2: 'WARM-UP FINISHES AT 19:35',
  step3: 'TEAMS OUT AT 19:52',
  step4: 'KICK-OFF 20:00',
};

export const CARD29_SAMPLES = {
  heading: 'Show runbook',
  step1: 'Roll the opening titles',
  step2: 'Anchor intro over the wide shot',
  step3: 'Take the first lower third on cue',
  step4: 'Hand to the reporter in the field',
};

// ── Public information and safety notices ────────────────────────────────────

/**
 * NOTICE — the public-information card: who is speaking, what has happened, the detail, what
 * to do about it, and where to get more. The ACTION line is its own field on purpose: in a
 * safety notice the instruction is the part a viewer must be able to read at a glance, so it
 * gets its own slot and its own weight rather than being buried in the body.
 */
export const NOTICE_FIELDS: TypeField[] = [
  { key: 'label', label: 'Notice label', kind: 'text', value: 'PUBLIC INFORMATION', role: 'line' },
  { key: 'headline', label: 'Headline', kind: 'text', value: 'Severe weather warning in effect', role: 'line' },
  {
    key: 'body',
    label: 'Details',
    kind: 'text',
    value:
      'A red warning for wind and coastal flooding runs from 18:00 tonight until 06:00 ' +
      'tomorrow across the whole county.',
    role: 'line',
  },
  { key: 'action', label: 'What to do', kind: 'text', value: 'Avoid the coast road and secure loose items outdoors', role: 'line' },
  { key: 'contact', label: 'Contact', kind: 'text', value: 'Updates · alerts.example.gov · 0800 555 010', role: 'line' },
];

export const CARD30_SAMPLES = {
  label: 'PUBLIC INFORMATION',
  headline: 'Severe weather warning in effect',
  body:
    'A red warning for wind and coastal flooding runs from 18:00 tonight until 06:00 ' +
    'tomorrow across the whole county.',
  action: 'Avoid the coast road and secure loose items outdoors',
  contact: 'Updates · alerts.example.gov · 0800 555 010',
};

export const CARD31_SAMPLES = {
  label: 'VENUE ADVISORY',
  headline: 'Doors close at 19:45',
  body:
    'Latecomers are seated at the first suitable break, which may be up to twenty minutes ' +
    'into the performance.',
  action: 'Please take your seats by 19:40',
  contact: 'Front of house · ask any steward',
};

export const CARD32_SAMPLES = {
  label: 'STADIUM ANNOUNCEMENT',
  headline: 'EXIT 4 IS CLOSED',
  body: 'A vehicle is blocking the east ramp. Stewards are directing all lower-tier traffic away from it.',
  action: 'USE EXIT 5 OR 6 AFTER THE FINAL WHISTLE',
  contact: 'STEWARDS ON EVERY CONCOURSE',
};

export const CARD33_SAMPLES = {
  label: 'SERVICE NOTICE',
  headline: 'The stream will resume shortly',
  body:
    'We have lost the signal from the outside broadcast unit. The team is reconnecting and ' +
    'the stream continues automatically.',
  action: 'Keep this page open — there is no need to refresh',
  contact: 'Status · status.example.org',
};

// ── Long text and second languages ───────────────────────────────────────────

/**
 * STATEMENT — one long passage, optionally repeated in a second language, under a label and
 * over its attribution. The pack's long-text layout: a wider measure, a smaller type ramp,
 * and no uppercase anywhere in the running text (see skin.ts readableTextCss — uppercase
 * mangles most non-Latin scripts and strips diacritics that carry meaning).
 */
export const STATEMENT_FIELDS: TypeField[] = [
  { key: 'label', label: 'Label', kind: 'text', value: 'READING', role: 'line' },
  {
    key: 'primary',
    label: 'Primary text',
    kind: 'text',
    value:
      'Those who wait for the Lord shall renew their strength; they shall mount up with ' +
      'wings like eagles, they shall run and not be weary.',
    role: 'line',
  },
  {
    key: 'secondary',
    label: 'Second language',
    kind: 'text',
    value:
      'Mutta ne, jotka Herraa odottavat, saavat uuden voiman; he kohoavat siivilleen kuin ' +
      'kotkat, he juoksevat eivätkä uuvu.',
    role: 'line',
  },
  { key: 'attribution', label: 'Attribution', kind: 'text', value: 'Isaiah 40:31', role: 'line' },
];

export const CARD34_SAMPLES = {
  label: 'STATEMENT',
  primary:
    'We will publish the full findings, in both official languages, before the end of the month.',
  secondary:
    'Nous publierons les conclusions complètes, dans les deux langues officielles, avant la ' +
    'fin du mois.',
  attribution: 'Office of the Commissioner · 14 March',
};

export const CARD35_SAMPLES = {
  label: 'READING',
  primary:
    'Those who wait for the Lord shall renew their strength; they shall mount up with wings ' +
    'like eagles, they shall run and not be weary.',
  secondary:
    'Mutta ne, jotka Herraa odottavat, saavat uuden voiman; he kohoavat siivilleen kuin ' +
    'kotkat, he juoksevat eivätkä uuvu.',
  attribution: 'Isaiah 40:31',
};

export const CARD36_SAMPLES = {
  label: 'INTERVIEW · TRANSLATION',
  primary: '“We came here to win, and at no point did we play for a draw.”',
  secondary: '«Vinimos a ganar y en ningún momento jugamos para empatar.»',
  attribution: 'Head coach · post-match, translated live',
};

export const CARD37_SAMPLES = {
  label: 'ON THE RECORD',
  primary:
    'Every graphic you make here is real HTML, CSS and JavaScript — yours to read, edit and ' +
    'take anywhere.',
  secondary:
    'Jokainen tekemäsi grafiikka on aitoa HTML:ää, CSS:ää ja JavaScriptiä — sinun ' +
    'luettavaksesi, muokattavaksesi ja vietäväksesi minne haluat.',
  attribution: 'NoaCG Studio · the code-is-real pledge',
};

// ── Key facts and recaps (the two list boards) ───────────────────────────────
//
// These two live in the infographic category, where the content is a LIST the operator types
// into one textarea and a design-owned runtime renders. One "term | explanation" per line —
// the same shape the schedule board and the poll already use.

/** KEY FACTS — the explainer board: a term and what it means, one per row. */
export const KEY_FACTS_FIELDS: TypeField[] = [
  {
    key: 'facts',
    label: 'Facts',
    kind: 'lines',
    value:
      'Where it happens | Two fifths of all energy use is in buildings\n' +
      'Who pays | Households carry two thirds of the cost\n' +
      'What changes | New builds must be net zero from 2030',
    role: 'line',
  },
  { key: 'heading', label: 'Heading', kind: 'text', value: 'THE FACTS', role: 'line' },
];

export const IG14_SAMPLES = {
  facts:
    'Where it happens | Two fifths of all energy use is in buildings\n' +
    'Who pays | Households carry two thirds of the cost\n' +
    'What changes | New builds must be net zero from 2030',
  heading: 'THE FACTS',
};

export const IG15_SAMPLES = {
  facts:
    'Doors | 19:00, and seated by 19:45\n' +
    'Running time | Two hours including one interval\n' +
    'Getting home | Last tram from the square at 23:40',
  heading: 'GOOD TO KNOW',
};

export const IG16_SAMPLES = {
  facts:
    'FORM | FOUR WINS FROM FIVE\n' +
    'TOP SCORER | ALVAREZ, 22 GOALS\n' +
    'HEAD TO HEAD | CITY LEAD 9–6',
  heading: 'KEY NUMBERS',
};

export const IG17_SAMPLES = {
  facts:
    'What it is | A browser tool for broadcast graphics\n' +
    'Who it is for | Anyone running a live show\n' +
    'What it costs | Free, forever, for the core',
  heading: 'IN SHORT',
};

/** RECAP / ACTION ITEMS — who owns what, one per row. */
export const RECAP_FIELDS: TypeField[] = [
  {
    key: 'items',
    label: 'Items',
    kind: 'lines',
    value:
      'Anna | Circulate the revised budget by Friday\n' +
      'Marcus | Book the studio for the March recording\n' +
      'Everyone | Confirm availability for launch week',
    role: 'line',
  },
  { key: 'heading', label: 'Heading', kind: 'text', value: 'ACTIONS FROM TODAY', role: 'line' },
];

export const IG18_SAMPLES = {
  items:
    'Anna | Circulate the revised budget by Friday\n' +
    'Marcus | Book the studio for the March recording\n' +
    'Everyone | Confirm availability for launch week',
  heading: 'ACTIONS FROM TODAY',
};

export const IG19_SAMPLES = {
  items:
    'Stage | Reset the lighting state before act two\n' +
    'Sound | Ring out the room again at 18:30\n' +
    'Front of house | Open the doors at 19:00',
  heading: 'BEFORE WE RESUME',
};

export const IG20_SAMPLES = {
  items:
    'DEFENCE | HOLD THE LINE TEN YARDS HIGHER\n' +
    'MIDFIELD | WIN THE SECOND BALL\n' +
    'ATTACK | SHOOT EARLIER FROM THE EDGE',
  heading: 'HALF-TIME NOTES',
};

export const IG21_SAMPLES = {
  items:
    'Producer | Publish the show rundown tonight\n' +
    'Graphics | Rehearse the results sequence twice\n' +
    'Host | Approve the final question list',
  heading: 'WHAT HAPPENS NEXT',
};
