// TEMPLATE PACKS — the taxonomy axis of the types × themes catalog (docs/PACK_TAXONOMY.md).
//
// A pack is a CURATED SUBSET of graphic types in a fitting style family: the answer to "I run
// a church stream / an esports night / an election program — which graphics do I need?". The
// 60 reference formats in live_format_graphics_needs.xlsx each map to exactly one pack, and
// that mapping IS the taxonomy document's machine-readable half.
//
// A pack is PURE CONFIG, and that is the point (Phase 3's "catalog growth is a config change"):
// because the type × family matrix is full, every (type, family) cell already has a shipped,
// gate-checked design, so declaring a pack requires no new template work — `resolvePack` just
// looks the cells up in the live registry. A NEW pack is one entry in this array. A new THEME
// is deliberately NOT config: it needs twelve designs and a FAMILY_TOKENS row before a pack
// could point at it, and `validatePacks` would say so.
//
// `scripts/factory.mjs` validates all of this on every run: every type id resolves, every
// cell is filled, every extra exists in the catalog, and the 60 formats are covered exactly
// once. Editing this file cannot silently break the taxonomy.

import type { StyleTag } from '../model/fonts';
import { typeById, TYPES } from './types/registry';

export interface TemplatePack {
  id: string;
  name: string;
  /** Who this pack is for, in the wizard's voice. */
  description: string;
  /** The DEFAULT look. Any family works — the matrix is full — so this is a taste pick,
   *  swappable per project, not a constraint. */
  family: StyleTag;
  /** GraphicType ids, in curated order (the order a rundown would reach for them). */
  types: string[];
  /** Catalog variants OUTSIDE the type registry that belong in the kit (end credits, the
   *  versus card). Validated against the live catalog by the factory. */
  extras?: string[];
  /** The reference formats this pack serves — VERBATIM row values from
   *  live_format_graphics_needs.xlsx. Every format appears in exactly one pack. */
  formats: string[];
}

/** The Excel's row count. The factory asserts the packs below cover exactly this many
 *  formats with no duplicates, so a taxonomy edit cannot quietly drop or double-map one. */
export const REFERENCE_FORMAT_COUNT = 60;

export const PACKS: TemplatePack[] = [
  {
    id: 'match-day',
    name: 'Match Day',
    description: 'Scorebug, clock, lineup strap and full-time card — the live sports kit.',
    family: 'sport',
    types: ['scoreboard', 'countdown', 'lower-third', 'ticker', 'sponsor-bug', 'title-card', 'holding-screen', 'now-next', 'notice-card'],
    extras: ['vs01', 'cr03'],
    formats: ['Sports broadcast / match coverage', 'Local sports / amateur sports'],
  },
  {
    id: 'esports',
    name: 'Esports',
    description: 'Match score, caster straps, schedule and countdown for tournament nights.',
    family: 'sport',
    types: ['scoreboard', 'lower-third', 'countdown', 'agenda', 'social-bug', 'sponsor-bug', 'holding-screen', 'title-card', 'now-next'],
    extras: ['vs02'],
    formats: ['Esports tournament'],
  },
  {
    id: 'creator',
    name: 'Creator',
    description: 'Starting-soon, straps, topic cards and handles — the streamer starter kit.',
    family: 'noacg',
    types: ['holding-screen', 'lower-third', 'topic-card', 'social-bug', 'sponsor-bug', 'countdown', 'poll', 'now-next', 'process-steps'],
    formats: [
      'Gaming livestream',
      'Just Chatting / personality stream',
      'Travel / IRL stream',
      'Watch party / reaction stream',
      'Tech support / coding livestream',
      'Art / design livestream',
      'Craft / maker livestream',
      'Tabletop RPG / board game stream',
      'Reality-style livestream / house stream',
      'Charity telethon / fundraising stream',
    ],
  },
  {
    id: 'newsroom',
    name: 'Newsroom',
    description: 'Anchor straps, the wire ticker, headline and topic cards for news programs.',
    family: 'minimal',
    types: ['lower-third', 'ticker', 'topic-card', 'title-card', 'headline-card', 'key-facts', 'notice-card', 'agenda', 'sponsor-bug'],
    formats: [
      'News / current affairs livestream',
      'Weather broadcast / climate update',
      'Finance / market livestream',
      'Security / surveillance-style public stream',
      'Press conference',
      'Emergency information stream',
    ],
  },
  {
    id: 'election',
    name: 'Election',
    description: 'Result bars, candidate straps and the count ticker for civic broadcasts.',
    family: 'minimal',
    types: ['poll', 'lower-third', 'ticker', 'title-card', 'headline-card', 'key-facts', 'agenda', 'countdown'],
    formats: [
      'Election night / results program',
      'Debate / political discussion',
      'Municipal council / public meeting',
    ],
  },
  {
    id: 'talk-show',
    name: 'Talk Show',
    description: 'Guest straps, topic and question cards, polls — panels, podcasts and Q&As.',
    family: 'glass',
    types: ['lower-third', 'topic-card', 'poll', 'agenda', 'key-facts', 'recap-card', 'social-bug', 'sponsor-bug', 'countdown'],
    formats: [
      'Talk show / panel discussion',
      'Podcast livestream / videocast',
      'Live Q&A / AMA',
      'Remote interview show',
      'Magazine show / morning show',
      'Radio-style livestream with video',
      'Book launch / author event',
    ],
  },
  {
    id: 'corporate',
    name: 'Corporate Events',
    description: 'Agendas, speaker straps, session titles and polls for webinars and keynotes.',
    family: 'minimal',
    types: ['agenda', 'lower-third', 'countdown', 'title-card', 'topic-card', 'poll', 'holding-screen', 'now-next', 'process-steps', 'recap-card', 'key-facts'],
    formats: [
      'Webinar / expert presentation',
      'Conference / seminar stream',
      'Corporate town hall / internal broadcast',
      'Product launch / keynote',
      'Virtual event / metaverse event',
      'Medical / health livestream',
      'Legal / public information livestream',
      'Behind-the-scenes production stream',
      'Academic conference livestream',
      'Hybrid workshop / training session',
    ],
  },
  {
    id: 'classroom',
    name: 'Classroom',
    description: 'Quiz board, timers, lesson cards and a score table for teaching streams.',
    family: 'noacg',
    types: ['quiz-board', 'countdown', 'lower-third', 'topic-card', 'agenda', 'scoreboard', 'process-steps', 'key-facts', 'recap-card'],
    formats: [
      'Education / lecture livestream',
      'Student production / school TV',
      'Quiz / game show livestream',
    ],
  },
  {
    id: 'church',
    name: 'Church & Ceremony',
    description: 'Service titles, scripture cards, program schedule and a quiet countdown.',
    family: 'minimal',
    types: ['title-card', 'lower-third', 'topic-card', 'statement-card', 'holding-screen', 'countdown', 'agenda', 'now-next'],
    extras: ['cr01'],
    formats: [
      'Religious service / church livestream',
      'Graduation / ceremony stream',
      'Wedding / private event livestream',
      'Funeral / memorial livestream',
    ],
  },
  {
    id: 'stage',
    name: 'Stage & Music',
    description: 'Artist straps, setlist cards, intermission screens for performances and galas.',
    family: 'glass',
    types: ['title-card', 'lower-third', 'now-next', 'holding-screen', 'countdown', 'social-bug', 'agenda', 'ticker', 'statement-card', 'notice-card'],
    extras: ['cr02'],
    formats: [
      'Music performance / concert livestream',
      'Award show / gala',
      'Theatre / live performance stream',
      'DJ set / club stream',
      'Red carpet / premiere stream',
      'Fashion show livestream',
    ],
  },
  {
    id: 'shopping',
    name: 'Shopping',
    description: 'Product cards, deal timers and the offer ticker for live commerce.',
    family: 'noacg',
    types: ['topic-card', 'countdown', 'lower-third', 'ticker', 'title-card', 'key-facts', 'sponsor-bug'],
    formats: [
      'Live commerce / shopping stream',
      'Cooking show / food livestream',
      'Auction livestream',
      'Real estate / property livestream',
      'Beauty / makeup livestream',
    ],
  },
  {
    id: 'wellness',
    name: 'Wellness',
    description: 'Interval timers, session titles and calm holding screens for movement and rest.',
    family: 'minimal',
    types: ['countdown', 'holding-screen', 'topic-card', 'process-steps', 'lower-third', 'social-bug'],
    formats: [
      'Fitness / workout class',
      'Meditation / ambient livestream',
      'Animal cam / nature cam',
    ],
  },
];

export function packById(id: string): TemplatePack | undefined {
  return PACKS.find((p) => p.id === id);
}

/** One resolved cell of a pack: the design that ships for (type, family). */
export interface PackCell {
  typeId: string;
  designId: string;
}

/**
 * Resolve a pack's types against the live registry. Throws on an unknown type or an unfilled
 * cell — a pack pointing at a design that does not exist is a config error, and config errors
 * fail loudly (the same doctrine as attachMachine).
 */
export function resolvePack(pack: TemplatePack): PackCell[] {
  return pack.types.map((typeId) => {
    const type = typeById(typeId);
    if (!type) throw new Error(`Pack "${pack.id}": unknown graphic type "${typeId}".`);
    const design = type.designs.find((d) => d.styleTag === pack.family);
    if (!design) {
      throw new Error(`Pack "${pack.id}": type "${typeId}" has no ${pack.family} design — the matrix cell is empty.`);
    }
    return { typeId, designId: design.id };
  });
}

/**
 * Every problem with the pack config, as strings (empty = valid). `knownVariantIds` is the
 * merged catalog's id set, passed in by the caller (the factory) so this module never has to
 * import the catalog it is a view over.
 */
export function validatePacks(knownVariantIds?: string[]): string[] {
  const problems: string[] = [];
  const typeIds = new Set(TYPES.map((t) => t.id));

  const seenPackIds = new Set<string>();
  const formatOwner = new Map<string, string>();
  for (const pack of PACKS) {
    if (seenPackIds.has(pack.id)) problems.push(`duplicate pack id "${pack.id}"`);
    seenPackIds.add(pack.id);

    for (const typeId of pack.types) {
      if (!typeIds.has(typeId)) {
        problems.push(`pack "${pack.id}" references unknown type "${typeId}"`);
        continue;
      }
      const type = typeById(typeId);
      if (type && !type.designs.some((d) => d.styleTag === pack.family)) {
        problems.push(`pack "${pack.id}": type "${typeId}" has no ${pack.family} design`);
      }
    }

    if (knownVariantIds) {
      const known = new Set(knownVariantIds);
      for (const extra of pack.extras ?? []) {
        if (!known.has(extra)) problems.push(`pack "${pack.id}" extra "${extra}" is not in the catalog`);
      }
    }

    for (const format of pack.formats) {
      const owner = formatOwner.get(format);
      if (owner) problems.push(`format "${format}" is mapped by both "${owner}" and "${pack.id}"`);
      formatOwner.set(format, pack.id);
    }
  }

  if (formatOwner.size !== REFERENCE_FORMAT_COUNT) {
    problems.push(`the packs map ${formatOwner.size} formats; the reference sheet has ${REFERENCE_FORMAT_COUNT}`);
  }
  return problems;
}
