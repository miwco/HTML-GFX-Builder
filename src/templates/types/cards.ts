// The CARD types — full-frame and anchored graphics that carry words rather than data. None
// of them needs a state machine: the preset produces the steps, the derived linear machine
// walks them, and SPX Continue drives the whole thing with nothing declared.

import { paletteById } from '../../model/wizard';
import { card01 } from '../infoCards/card01';
import { card02 } from '../infoCards/card02';
import { card03 } from '../infoCards/card03';
import { card05 } from '../infoCards/card05';
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
      samples: { heading: 'MATCH STATS' },
      create: (_type, options) => card02.create(options),
    },
    {
      id: 'card03',
      name: 'Frosted Panel',
      description: 'A translucent blurred glass panel for schedules and lineups, with an optional logo slot.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      samples: { heading: '20:00 — Opening keynote' },
      create: (_type, options) => card03.create(options),
    },
  ],
};
