// The RESULTS BOARD types — the three graphics that render a list the operator typed.
//
// All three answer the same question in the same way. The LIST is data: how many players, how
// many teams, how many rounds is what the operator types, and none of it is a state. What IS a
// state is which row the show is talking about, and whether the table is still provisional.
//
// So each type is one state plus a field:
//
//   roster     `spotlight` + the player number   — moving the spotlight is a self-transition
//   standings  `highlighted` + the row number    — plus `final`, which is what turns a
//                                                  standings board into a result table
//   bracket    `advanced` + the round name       — plus `crowned`, the one-way end of a tree
//
// Ten teams do not need ten states, and an eleventh adds none. That is the whole argument the
// scoreboard type makes about scores, applied to lists.

import { paletteById } from '../../model/wizard';
import { br01 } from '../competition/results/br01';
import { br02 } from '../competition/results/br02';
import { rs01 } from '../competition/results/rs01';
import { rs02 } from '../competition/results/rs02';
import { rs03 } from '../competition/results/rs03';
import { st01 } from '../competition/results/st01';
import { st02 } from '../competition/results/st02';
import { st03 } from '../competition/results/st03';
import { st04 } from '../competition/results/st04';
import { BRACKET_FIELDS, ROSTER_FIELDS, STANDINGS_FIELDS } from '../competition/results/shared';
import type { GraphicType } from './graphicType';

export const rosterType: GraphicType = {
  id: 'roster',
  name: 'Roster / line-up',
  description: 'A team line-up, one player per row, with a spotlight the caster moves.',
  structure: {
    prefix: 'results-board',
    category: 'results-board',
    parts: [
      { id: 'box', selector: '.results-board-box', kind: 'panel', required: true },
      { id: 'accent', selector: '.results-board-accent', kind: 'accent', required: true },
      { id: 'head', selector: '.results-board-head', kind: 'block', required: true },
      { id: 'rows', selector: '.results-board-body', kind: 'block', required: true },
      { id: 'title', selector: '#f0', kind: 'line', required: true },
      { id: 'team', selector: '#f1', kind: 'line', required: true },
    ],
  },
  fields: ROSTER_FIELDS,
  machine: {
    main: {
      branches: [
        {
          id: 'spotlight',
          name: 'Player spotlit',
          timeline: {
            name: 'Spotlight',
            duration: 0.38,
            ease: 'in',
            calls: [{ time: 0, call: 'applySpotlight' }],
            layers: {},
          },
          edges: [
            { from: { waypoint: 0 }, to: 'spotlight', trigger: 'operator', event: 'spotlight' },
            // Moving down the line-up: the same state, a new number in the payload.
            { from: 'spotlight', to: 'spotlight', trigger: 'operator', event: 'spotlight' },
            { from: 'level', to: 'spotlight', trigger: 'operator', event: 'spotlight' },
          ],
        },
        {
          id: 'level',
          name: 'Whole line-up',
          timeline: {
            name: 'Clear spotlight',
            duration: 0.3,
            ease: 'out',
            calls: [{ time: 0, call: 'clearSpotlight' }],
            layers: {},
          },
          edges: [
            { from: 'spotlight', to: 'level', trigger: 'operator', event: 'clear' },
            { from: 'spotlight', to: { waypoint: -1 }, trigger: 'operator', event: 'next' },
          ],
        },
      ],
    },
  },
  controls: [
    { event: 'spotlight', label: 'Spotlight player', section: 'Line-up', order: 1, payload: ['spotlight'] },
    { event: 'clear', label: 'Whole line-up', section: 'Line-up', order: 2 },
  ],
  capabilities: {
    maxLines: 2,
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-impact'],
    defaultZone: 'mid-left',
  },
  designs: [
    {
      id: 'rs01',
      name: 'Starting Line-up',
      description: 'A team line-up with roles — and a spotlight the caster moves down it.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      create: (_type, options) => rs01.create(options),
    },
    {
      id: 'rs02',
      name: 'House Roster',
      description: 'The house line-up: void rows, mono roles, an amber spotlight block.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
      create: (_type, options) => rs02.create(options),
    },
    {
      id: 'rs03',
      name: 'Clean Line-up',
      description: 'A panel-free line-up: hairline rows, roles in small caps, a quiet spotlight.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
      create: (_type, options) => rs03.create(options),
    },
  ],
};

export const standingsType: GraphicType = {
  id: 'standings',
  name: 'Standings / result table',
  description: 'A table of any columns, with a highlighted row and a final state.',
  structure: {
    prefix: 'results-board',
    category: 'results-board',
    parts: [
      { id: 'box', selector: '.results-board-box', kind: 'panel', required: true },
      { id: 'accent', selector: '.results-board-accent', kind: 'accent', required: true },
      { id: 'head', selector: '.results-board-head', kind: 'block', required: true },
      { id: 'rows', selector: '.results-board-body', kind: 'block', required: true },
      { id: 'title', selector: '#f0', kind: 'line', required: true },
      { id: 'subtitle', selector: '#f1', kind: 'line', required: true },
    ],
  },
  fields: STANDINGS_FIELDS,
  machine: {
    main: {
      branches: [
        {
          id: 'highlighted',
          name: 'Row highlighted',
          timeline: {
            name: 'Highlight row',
            duration: 0.36,
            ease: 'in',
            calls: [{ time: 0, call: 'applyHighlight' }],
            layers: {},
          },
          edges: [
            { from: { waypoint: 0 }, to: 'highlighted', trigger: 'operator', event: 'highlight' },
            { from: 'highlighted', to: 'highlighted', trigger: 'operator', event: 'highlight' },
            { from: 'plain', to: 'highlighted', trigger: 'operator', event: 'highlight' },
            { from: 'final', to: 'highlighted', trigger: 'operator', event: 'highlight' },
          ],
        },
        {
          id: 'plain',
          name: 'Whole table',
          timeline: {
            name: 'Clear highlight',
            duration: 0.3,
            ease: 'out',
            calls: [{ time: 0, call: 'clearHighlight' }],
            layers: {},
          },
          edges: [{ from: 'highlighted', to: 'plain', trigger: 'operator', event: 'clear' }],
        },
        {
          // The claim that turns a standings board into a RESULT table. Reachable from the
          // plain board and from a highlighted one, because either is where a show declares it.
          id: 'final',
          name: 'Final table',
          timeline: {
            name: 'Declare final',
            duration: 0.4,
            ease: 'in',
            calls: [{ time: 0, call: 'markFinal' }],
            layers: {},
          },
          edges: [
            { from: { waypoint: 0 }, to: 'final', trigger: 'operator', event: 'final' },
            { from: 'highlighted', to: 'final', trigger: 'operator', event: 'final' },
            { from: 'plain', to: 'final', trigger: 'operator', event: 'final' },
            { from: 'final', to: { waypoint: -1 }, trigger: 'operator', event: 'next' },
          ],
        },
      ],
    },
  },
  controls: [
    { event: 'highlight', label: 'Highlight row', section: 'Table', order: 1, payload: ['highlight'] },
    { event: 'clear', label: 'Whole table', section: 'Table', order: 2 },
    { event: 'final', label: 'Declare final', section: 'Table', order: 3 },
  ],
  capabilities: {
    maxLines: 2,
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-impact'],
    defaultZone: 'mid-center',
  },
  designs: [
    {
      id: 'st01',
      name: 'League Table',
      description: 'A standings table with any columns you declare — and a FINAL state.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      create: (_type, options) => st01.create(options),
    },
    {
      id: 'st02',
      name: 'House Standings',
      description: 'The house table: void rows, mono headers, amber positions and final mark.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
      create: (_type, options) => st02.create(options),
    },
    {
      id: 'st03',
      name: 'Frost Leaderboard',
      description: 'A frosted leaderboard: ranked glass tiles with the position in an accent ring.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      animationPresets: ['comp-cascade', 'comp-bloom', 'comp-rise'],
      // A leaderboard is written around ranking language, not league language.
      samples: { title: 'LEADERBOARD', subtitle: 'AFTER ROUND 4' },
      create: (_type, options) => st03.create(options),
    },
    {
      id: 'st04',
      name: 'Clean Results',
      description: 'A quiet result table: hairline rules, tabular figures, nothing boxed.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
      // This design is authored as the RESULT table of the family, so it says so.
      samples: { title: 'FINAL RESULTS', subtitle: 'GRAND FINAL · BEST OF 5' },
      create: (_type, options) => st04.create(options),
    },
  ],
};

export const bracketType: GraphicType = {
  id: 'bracket',
  name: 'Bracket',
  description: 'A knockout tree in round columns, with a live round and a champion.',
  structure: {
    prefix: 'results-board',
    category: 'results-board',
    parts: [
      { id: 'box', selector: '.results-board-box', kind: 'panel', required: true },
      { id: 'accent', selector: '.results-board-accent', kind: 'accent', required: true },
      { id: 'head', selector: '.results-board-head', kind: 'block', required: true },
      { id: 'rounds', selector: '.results-board-body', kind: 'block', required: true },
      { id: 'title', selector: '#f0', kind: 'line', required: true },
    ],
  },
  fields: BRACKET_FIELDS,
  machine: {
    main: {
      branches: [
        {
          id: 'advanced',
          name: 'Round live',
          timeline: {
            name: 'Advance round',
            duration: 0.36,
            ease: 'in',
            calls: [{ time: 0, call: 'applyRound' }],
            layers: {},
          },
          edges: [
            { from: { waypoint: 0 }, to: 'advanced', trigger: 'operator', event: 'advance' },
            { from: 'advanced', to: 'advanced', trigger: 'operator', event: 'advance' },
          ],
        },
        {
          // One way only: a bracket does not un-finish. The champion's name is DATA — the
          // event says the moment came, the field says who it was.
          id: 'crowned',
          name: 'Champion',
          timeline: {
            name: 'Crown the champion',
            duration: 0.5,
            ease: 'in',
            calls: [{ time: 0, call: 'crownChampion' }],
            layers: {},
          },
          edges: [
            { from: { waypoint: 0 }, to: 'crowned', trigger: 'operator', event: 'crown' },
            { from: 'advanced', to: 'crowned', trigger: 'operator', event: 'crown' },
            { from: 'crowned', to: { waypoint: -1 }, trigger: 'operator', event: 'next' },
          ],
        },
      ],
    },
  },
  controls: [
    { event: 'advance', label: 'Advance round', section: 'Bracket', order: 1, payload: ['round'] },
    { event: 'crown', label: 'Crown champion', section: 'Bracket', order: 2, payload: ['champion'] },
  ],
  capabilities: {
    maxLines: 1,
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-impact'],
    defaultZone: 'mid-center',
  },
  designs: [
    {
      id: 'br01',
      name: 'Playoff Bracket',
      description: 'A knockout tree in round columns, with a cursor and a champion banner.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      create: (_type, options) => br01.create(options),
    },
    {
      id: 'br02',
      name: 'House Bracket',
      description: 'The house knockout tree: void ties, mono rounds, an amber cursor and crown.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
      create: (_type, options) => br02.create(options),
    },
  ],
};
