// The CARD types — full-frame and anchored graphics that carry words rather than data. None
// of them needs a state machine: the preset produces the steps, the derived linear machine
// walks them, and SPX Continue drives the whole thing with nothing declared.

import { paletteById } from '../../model/wizard';
import { card01 } from '../infoCards/card01';
import { card02 } from '../infoCards/card02';
import { card03 } from '../infoCards/card03';
import { card05 } from '../infoCards/card05';
import { card06 } from '../infoCards/card06';
import { card07 } from '../infoCards/card07';
import { card08 } from '../infoCards/card08';
import { card09 } from '../infoCards/card09';
import type { GraphicType } from './graphicType';

/** TITLE / OPENER CARD — 23 of the 60 formats open with one (episode title, session title,
 *  service title, segment opener). Absent from the original ten; the reference data put it
 *  ahead of three types that were on that list. */
export const titleCardType: GraphicType = {
  id: 'title-card',
  name: 'Title card',
  description: 'The opener: a kicker, one large title, and a quiet supporting line.',
  frequency: 23,
  structure: {
    prefix: 'info-card',
    category: 'info-card',
    parts: [
      { id: 'box', selector: '.info-card-box', kind: 'panel', required: true },
      { id: 'title', selector: '#f0', kind: 'line', required: true },
      { id: 'kicker', selector: '#f1', kind: 'line', required: true },
    ],
  },
  fields: [
    { key: 'title', label: 'Title', kind: 'text', value: 'The Results Show', role: 'line' },
    { key: 'kicker', label: 'Kicker', kind: 'text', value: 'Elections 2026', role: 'line' },
    { key: 'subtitle', label: 'Subtitle', kind: 'text', value: 'Live from the studio · 20:00', role: 'line' },
  ],
  machine: {},
  controls: [],
  capabilities: {
    maxLines: 5,
    logo: 'optional',
    animationPresets: ['line-reveal', 'mask-wipe', 'blur-in', 'fade', 'slide-down', 'flip-3d'],
    defaultZone: 'bottom-left',
  },
  designs: [
    {
      id: 'card05',
      name: 'House Title',
      description: 'The NoaCG title card: mono kicker, one huge display title, soft accent glow.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      create: (_type, options) => card05.create(options),
    },
    {
      // Designed FOR this cell: no minimal title card existed. Pure type, no panel — sibling
      // of lt01 Hairline / lt02 Underline, with the underline motif at opener scale.
      id: 'card07',
      name: 'Clean Title',
      description: 'A panel-free opener: a caps kicker over a large title and a quiet subtitle.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      samples: { title: 'The Long Road Back', kicker: 'Episode 4', subtitle: 'A documentary in three parts' },
      animationPresets: ['line-reveal', 'mask-wipe', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
      defaultZone: 'mid-left',
      create: (_type, options) => card07.create(options),
    },
    {
      // Designed FOR this cell: no sport title card existed. The leaning slab as an opener —
      // sibling of lt05 Angle Slab / card02 Slab Card.
      id: 'card08',
      name: 'Slab Title',
      description: 'A leaning sport slab: an accent kicker over one huge condensed title and a subtitle.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      samples: { title: 'GRAND FINAL', kicker: 'MATCHDAY 12', subtitle: 'KICK-OFF 20:00 · ARENA' },
      animationPresets: ['snap-stinger', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
      defaultZone: 'mid-left',
      create: (_type, options) => card08.create(options),
    },
    {
      // Designed FOR this cell: no glass title card existed. A frosted opener panel — sibling
      // of lt08 Frosted Card / card03 Frosted Panel.
      id: 'card09',
      name: 'Frost Title',
      description: 'A frosted panel opener: a soft accent kicker over a large title and a subtitle.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      samples: { title: 'Midnight Sessions', kicker: 'Tonight', subtitle: 'Live music until late' },
      animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
      defaultZone: 'mid-center',
      create: (_type, options) => card09.create(options),
    },
    // card04 is NOT promotable here: it supports three lines and this type declares five, and a
    // compiled variant takes the TYPE's capabilities. Promotion would offer two more lines than
    // the quote card was designed to hold. The mismatch widens rather than strips, which is why
    // no test caught it - it was found by comparing every promotion's declared capabilities
    // against its type's.
  ],
};

/** TOPIC / QUESTION CARD — 29 of the 60 formats need one (topic card, question card, Q&A
 *  card, key-term card, chapter card). The card that stays up DURING the discussion, which is
 *  what separates it from the opener above. */
export const topicCardType: GraphicType = {
  id: 'topic-card',
  name: 'Topic card',
  description: 'The question or topic under discussion, with room for its source.',
  frequency: 29,
  structure: {
    prefix: 'info-card',
    category: 'info-card',
    parts: [
      { id: 'box', selector: '.info-card-box', kind: 'panel', required: true },
      { id: 'topic', selector: '#f0', kind: 'line', required: true },
    ],
  },
  // These are card01's own defaults, unchanged. A type describes the shape of a graphic's
  // content, not new copy for it: rewriting a promoted variant's sample text would change
  // what every existing user of that card sees, for no gain.
  fields: [
    { key: 'heading', label: 'Heading', kind: 'text', value: 'The Story in Numbers', role: 'line' },
    { key: 'line1', label: 'Line 1', kind: 'text', value: 'Renewables grew 28% this year', role: 'line' },
    { key: 'line2', label: 'Line 2', kind: 'text', value: 'Coal at its lowest share since 1965', role: 'line' },
  ],
  machine: {},
  controls: [],
  capabilities: {
    maxLines: 5,
    logo: 'optional',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultZone: 'mid-right',
  },
  designs: [
    {
      id: 'card01',
      name: 'Hairline Card',
      description: 'Pure typography beside one thin accent line — whitespace does the work.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      create: (_type, options) => card01.create(options),
    },
    {
      id: 'card02',
      name: 'Slab Card',
      description: 'A forward-leaning stat slab with a chunky accent edge - lt05 Angle Slab, card-sized.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      samples: {
        heading: 'MATCH STATS',
        line1: 'SHOTS ON TARGET · 9',
        line2: 'POSSESSION · 61%',
      },
      // The slab's lean is painted so it survives the stinger's skew — promoting this card
      // into the type's list dropped snap-stinger entirely, the one preset it is built around.
      animationPresets: ['snap-stinger', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
      // The slab leans forward from the left edge; mirroring it to the right fights the lean.
      defaultZone: 'mid-left',
      create: (_type, options) => card02.create(options),
    },
    {
      id: 'card03',
      name: 'Frosted Panel',
      description: 'A translucent blurred glass panel for schedules and lineups, with an optional logo slot.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      // These were one line out of step: the heading key carried what is actually the FIRST
      // BODY line, so the wizard offered "20:00 — Opening keynote" as the card's heading while
      // the card itself renders "Tonight's Lineup" there. Found by the factory's samples gate.
      samples: {
        heading: "Tonight's Lineup",
        line1: '20:00 — Opening keynote',
        line2: '21:15 — Live Q&A with the hosts',
      },
      // Glass springs and resolves out of blur; the type's line reveal is a news motion.
      animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
      create: (_type, options) => card03.create(options),
    },
    {
      // Designed FOR this cell: no noacg topic card existed. card05 House Title is the house
      // OPENER (kicker/title/subtitle); this is the house card that stays up DURING the
      // discussion — a heading and its points in the void panel. Sibling of lt11 House Strap.
      id: 'card06',
      name: 'House Topic',
      description: 'The house topic card: an amber bar and void panel, a heading over quiet body lines.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      create: (_type, options) => card06.create(options),
    },
  ],
};
