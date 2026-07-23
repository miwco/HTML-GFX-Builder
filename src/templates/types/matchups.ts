// The MATCH-UP types — the three graphics that are about the competitors.
//
// MATCH-UP is the pack's clearest statement of the model's central rule. The flow an operator
// actually runs is: show the match-up, pick a winner, change your mind, lock it in. A naive
// machine gives that four states per side and doubles them again for the lock. This one has
// three states TOTAL — neutral, selected, locked — because WHICH side won is the `winner`
// field, carried in as the event's payload. A four-way format would add none.
//
// And the lock is structural. There is no `select` arrow leaving `locked`, so a late pick
// finds no transition and is dropped along with its payload. Nothing evaluates a condition;
// the arrow simply was never drawn.
//
// HEAD-TO-HEAD is the same shape with the verb changed: highlight a side, change the
// highlight, drop it. One state, one field.
//
// PLAYER CARD adds the other half of the model — the ordered walk. Its Continue press is a
// real middle STEP that fires the stat reveal, so `next` alone drives the card end to end
// under any playout server, and the MVP flourish hangs off the walk as a branch.

import { paletteById } from '../../model/wizard';
import { h201 } from '../competition/matchup/h201';
import { h202 } from '../competition/matchup/h202';
import { h203 } from '../competition/matchup/h203';
import { mu01 } from '../competition/matchup/mu01';
import { mu02 } from '../competition/matchup/mu02';
import { mu03 } from '../competition/matchup/mu03';
import { mu04 } from '../competition/matchup/mu04';
import { pc01 } from '../competition/matchup/pc01';
import { pc02 } from '../competition/matchup/pc02';
import { pc03 } from '../competition/matchup/pc03';
import { H2H_FIELDS, MATCHUP_FIELDS, PLAYER_FIELDS } from '../competition/matchup/shared';
import type { GraphicType } from './graphicType';

export const matchupType: GraphicType = {
  id: 'matchup',
  name: 'Match-up',
  description: 'Two competitors meet — then one is picked as the winner and the pick is locked.',
  structure: {
    prefix: 'matchup',
    category: 'matchup',
    parts: [
      { id: 'box', selector: '.matchup-box', kind: 'panel', required: true },
      { id: 'accent', selector: '.matchup-accent', kind: 'accent', required: true },
      { id: 'head', selector: '.matchup-head', kind: 'block', required: true },
      { id: 'body', selector: '.matchup-body', kind: 'block', required: true },
      { id: 'sideA', selector: '.matchup-side-a', kind: 'block', required: true },
      { id: 'sideB', selector: '.matchup-side-b', kind: 'block', required: true },
      { id: 'teamA', selector: '#f0', kind: 'line', required: true },
      { id: 'teamB', selector: '#f1', kind: 'line', required: true },
    ],
  },
  fields: MATCHUP_FIELDS,
  machine: {
    main: {
      branches: [
        {
          id: 'selected',
          name: 'Winner selected',
          // Entering — or RE-entering — this state repaints the pick from the field, which is
          // what makes "change the pick freely" a self-transition rather than a second state.
          timeline: {
            name: 'Select winner',
            duration: 0.4,
            ease: 'in',
            calls: [{ time: 0, call: 'applyWinner' }],
            layers: {},
          },
          edges: [
            { from: { waypoint: 0 }, to: 'selected', trigger: 'operator', event: 'select' },
            { from: 'selected', to: 'selected', trigger: 'operator', event: 'select' },
            { from: 'neutral', to: 'selected', trigger: 'operator', event: 'select' },
          ],
        },
        {
          // Back to level. A POSE would not do: undoing a pick has to CLEAR the marks, and
          // that is an effect. Note it is not the entrance state — re-entering waypoint 0
          // would replay the whole entrance, which is not what "clear the pick" means.
          id: 'neutral',
          name: 'No pick',
          timeline: {
            name: 'Clear pick',
            duration: 0.3,
            ease: 'out',
            calls: [{ time: 0, call: 'clearWinner' }],
            layers: {},
          },
          edges: [{ from: 'selected', to: 'neutral', trigger: 'operator', event: 'clear' }],
        },
        {
          id: 'locked',
          name: 'Locked in',
          timeline: {
            name: 'Lock',
            duration: 0.35,
            ease: 'in',
            calls: [{ time: 0, call: 'applyLock' }],
            layers: {},
          },
          edges: [
            { from: 'selected', to: 'locked', trigger: 'operator', event: 'lock' },
            // From here the only way on is off air. No `select` and no `clear` arrow leaves
            // this state — which is what makes a late change impossible rather than refused.
            { from: 'locked', to: { waypoint: -1 }, trigger: 'operator', event: 'next' },
          ],
        },
      ],
    },
  },
  controls: [
    { event: 'select', label: 'Select winner', section: 'Pick', order: 1, payload: ['winner'] },
    { event: 'lock', label: 'Lock it in', section: 'Pick', order: 2 },
    { event: 'clear', label: 'Clear pick', section: 'Pick', order: 3, destructive: true },
  ],
  capabilities: {
    maxLines: 3,
    logo: 'none',
    animationPresets: ['comp-impact', 'comp-bloom', 'comp-rise'],
    defaultZone: 'mid-center',
  },
  designs: [
    {
      id: 'mu01',
      name: 'Match-up Slam',
      description: 'Two sides meet around an accent VS slab — then one is picked as the winner.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      create: (_type, options) => mu01.create(options),
    },
    {
      id: 'mu02',
      name: 'House Match-up',
      description: 'The house match-up: void stage, amber seam, and an amber-keylined winner.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      animationPresets: ['comp-bloom', 'comp-rise', 'comp-impact'],
      create: (_type, options) => mu02.create(options),
    },
    {
      id: 'mu03',
      name: 'Frost Match-up',
      description: 'Two frosted panels either side of a soft seam — the pick brightens one.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      animationPresets: ['comp-bloom', 'comp-rise', 'comp-impact'],
      create: (_type, options) => mu03.create(options),
    },
    {
      id: 'mu04',
      name: 'Clean Match-up',
      description: 'Two names either side of a hairline seam — the pick is a rule, not a flood.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      animationPresets: ['comp-rise', 'comp-bloom', 'comp-impact'],
      create: (_type, options) => mu04.create(options),
    },
  ],
};

export const headToHeadType: GraphicType = {
  id: 'head-to-head',
  name: 'Head-to-head',
  description: 'Two competitors compared stat by stat, with a side the operator can highlight.',
  structure: {
    prefix: 'matchup',
    category: 'matchup',
    parts: [
      { id: 'box', selector: '.matchup-box', kind: 'panel', required: true },
      { id: 'accent', selector: '.matchup-accent', kind: 'accent', required: true },
      { id: 'head', selector: '.matchup-head', kind: 'block', required: true },
      { id: 'rows', selector: '.matchup-body', kind: 'block', required: true },
      { id: 'teamA', selector: '#f0', kind: 'line', required: true },
      { id: 'teamB', selector: '#f1', kind: 'line', required: true },
    ],
  },
  fields: H2H_FIELDS,
  machine: {
    main: {
      branches: [
        {
          id: 'highlighted',
          name: 'Side highlighted',
          timeline: {
            name: 'Highlight',
            duration: 0.4,
            ease: 'in',
            calls: [{ time: 0, call: 'applyLeader' }],
            layers: {},
          },
          edges: [
            { from: { waypoint: 0 }, to: 'highlighted', trigger: 'operator', event: 'highlight' },
            // Moving the highlight from one side to the other: a self-transition repaints
            // from the payload, so there is no state per side.
            { from: 'highlighted', to: 'highlighted', trigger: 'operator', event: 'highlight' },
            { from: 'level', to: 'highlighted', trigger: 'operator', event: 'highlight' },
          ],
        },
        {
          id: 'level',
          name: 'Level',
          timeline: {
            name: 'Clear highlight',
            duration: 0.3,
            ease: 'out',
            calls: [{ time: 0, call: 'clearLeader' }],
            layers: {},
          },
          edges: [
            { from: 'highlighted', to: 'level', trigger: 'operator', event: 'clear' },
            // The rejoin, so an operator who highlighted can still press Next to take it off.
            { from: 'highlighted', to: { waypoint: -1 }, trigger: 'operator', event: 'next' },
          ],
        },
      ],
    },
  },
  controls: [
    { event: 'highlight', label: 'Highlight side', section: 'Compare', order: 1, payload: ['leader'] },
    { event: 'clear', label: 'Level', section: 'Compare', order: 2 },
  ],
  capabilities: {
    maxLines: 3,
    logo: 'none',
    animationPresets: ['comp-cascade', 'comp-rise', 'comp-bloom'],
    defaultZone: 'mid-center',
  },
  designs: [
    {
      id: 'h201',
      name: 'Head to Head',
      description: 'Stat-by-stat comparison with share bars that grow from the operator figures.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      create: (_type, options) => h201.create(options),
    },
    {
      id: 'h202',
      name: 'House Compare',
      description: 'The house comparison: void board, mono labels, amber share bars.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      create: (_type, options) => h202.create(options),
    },
    {
      id: 'h203',
      name: 'Clean Compare',
      description: 'A quiet comparison table: hairline rows, accent on whichever side leads.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      create: (_type, options) => h203.create(options),
    },
  ],
};

export const playerCardType: GraphicType = {
  id: 'player-card',
  name: 'Player card',
  description: 'One competitor: portrait, name, role, and a stat block revealed on the press.',
  structure: {
    prefix: 'matchup',
    category: 'matchup',
    parts: [
      { id: 'box', selector: '.matchup-box', kind: 'panel', required: true },
      { id: 'accent', selector: '.matchup-accent', kind: 'accent', required: true },
      { id: 'head', selector: '.matchup-head', kind: 'block', required: true },
      { id: 'stats', selector: '.matchup-body', kind: 'block', required: true },
      { id: 'name', selector: '#f0', kind: 'line', required: true },
      { id: 'role', selector: '#f1', kind: 'line', required: true },
    ],
  },
  fields: PLAYER_FIELDS,
  machine: {
    main: {
      // The walk is card -> stats -> out, so `next` alone still runs the whole card: dropped
      // into a playout server with nothing but Continue, it introduces the player, reveals
      // the numbers, and leaves.
      pathEvents: ['stats'],
      branches: [
        {
          id: 'mvp',
          name: 'MVP flourish',
          timeline: {
            name: 'Call the MVP',
            duration: 0.45,
            ease: 'in',
            calls: [{ time: 0, call: 'markMvp' }],
            layers: {},
          },
          edges: [
            { from: { waypoint: 1 }, to: 'mvp', trigger: 'operator', event: 'mvp' },
            // The rejoin: from the flourish, Next still takes the card off air.
            { from: 'mvp', to: { waypoint: -1 }, trigger: 'operator', event: 'next' },
          ],
        },
        {
          id: 'plain',
          name: 'Flourish cleared',
          timeline: {
            name: 'Clear the flourish',
            duration: 0.3,
            ease: 'out',
            calls: [{ time: 0, call: 'clearMvp' }],
            layers: {},
          },
          edges: [
            { from: 'mvp', to: 'plain', trigger: 'operator', event: 'clearMvp' },
            { from: 'plain', to: 'mvp', trigger: 'operator', event: 'mvp' },
            { from: 'plain', to: { waypoint: -1 }, trigger: 'operator', event: 'next' },
          ],
        },
      ],
    },
  },
  controls: [
    { event: 'stats', label: 'Reveal stats', section: 'Card', order: 1 },
    { event: 'mvp', label: 'Call MVP', section: 'Card', order: 2 },
    { event: 'clearMvp', label: 'Clear MVP', section: 'Card', order: 3 },
  ],
  capabilities: {
    maxLines: 3,
    logo: 'none',
    animationPresets: ['comp-impact', 'comp-rise', 'comp-bloom'],
    defaultZone: 'mid-center',
  },
  designs: [
    {
      id: 'pc01',
      name: 'Player Card',
      description: 'Portrait, name and role — with the stat block revealed on the press.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      create: (_type, options) => pc01.create(options),
    },
    {
      id: 'pc02',
      name: 'House Player',
      description: 'The house competitor card: void portrait frame, mono chip, amber figures.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      animationPresets: ['comp-rise', 'comp-bloom', 'comp-impact'],
      create: (_type, options) => pc02.create(options),
    },
    {
      id: 'pc03',
      name: 'Frost Player',
      description: 'A frosted competitor card: rounded portrait, glass stat tiles on the press.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      animationPresets: ['comp-bloom', 'comp-rise', 'comp-impact'],
      create: (_type, options) => pc03.create(options),
    },
  ],
};
