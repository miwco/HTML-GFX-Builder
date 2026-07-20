// SCOREBOARD — the type that proves the model's hardest claim, so it is worth reading as an
// argument rather than a config file.
//
// A scorebug is where a naive state machine explodes. Score, clock, possession, flag, period,
// and result are all "state" in the everyday sense, and one machine holding every combination
// of them would need hundreds of states. The model's answer is two rules working together:
//
//   1. DATA IS NOT STATE. The scores are fields. Changing one repaints a number and moves no
//      pointer anywhere — the design's own update() pops the digit, exactly as before. Nothing
//      here declares a state for "home team leads".
//   2. INDEPENDENT THINGS GET INDEPENDENT GROUPS. A flag is up or it is not; a clock runs or
//      it is held; a result is live or it is final. Three small graphs, three pointers, no
//      combinatorics — 2 + 2 + 2 states instead of 8.
//
// The main group carries no authored transitions at all: a scoreboard has no reveal sequence,
// it just comes on air and stays. Everything interesting is beside the default path, which is
// the shape the goals document's scorebug test describes.

import { paletteById } from '../../model/wizard';
import { sb01 } from '../scoreboards/sb01';
import { sb02 } from '../scoreboards/sb02';
import type { GraphicType } from './graphicType';

export const scoreboardType: GraphicType = {
  id: 'scoreboard',
  name: 'Scoreboard',
  description: 'The score strip: teams, scores, a clock that holds, and flags that come and go.',
  frequency: 5,
  structure: {
    prefix: 'scoreboard',
    category: 'scoreboard',
    parts: [
      { id: 'box', selector: '.scoreboard-box', kind: 'panel', required: true },
      { id: 'accent', selector: '.scoreboard-accent', kind: 'accent', required: true },
      { id: 'teamA', selector: '#f0', kind: 'line', required: true },
      { id: 'scoreA', selector: '#f1', kind: 'line', required: true },
      { id: 'teamB', selector: '#f2', kind: 'line', required: true },
      { id: 'scoreB', selector: '#f3', kind: 'line', required: true },
    ],
  },
  // Every one of these is DATA. None of them is a state, and none of them causes a transition:
  // an operator typing a new score changes a number on air and nothing else moves.
  fields: [
    { key: 'teamA', label: 'Team A', kind: 'text', value: 'HOME', role: 'line' },
    { key: 'scoreA', label: 'Score A', kind: 'text', value: '0', role: 'line' },
    { key: 'teamB', label: 'Team B', kind: 'text', value: 'AWAY', role: 'line' },
    { key: 'scoreB', label: 'Score B', kind: 'text', value: '0', role: 'line' },
  ],
  machine: {
    parallel: [
      // The FLAG: a penalty marker that appears and clears, independent of everything else.
      {
        id: 'flag',
        initial: 'none',
        states: [
          {
            id: 'none',
            name: 'No flag',
            timeline: {
              name: 'Flag out',
              duration: 0.22,
              ease: 'out',
              layers: { accent: { opacity: [{ time: 0, value: 1 }, { time: 0.22, value: 0.35 }] } },
            },
            edges: [{ from: 'shown', to: 'none', trigger: 'operator', event: 'clearFlag' }],
          },
          {
            id: 'shown',
            name: 'Flag',
            timeline: {
              name: 'Flag in',
              duration: 0.28,
              ease: 'in',
              layers: {
                accent: {
                  opacity: [{ time: 0, value: 0.35 }, { time: 0.28, value: 1 }],
                  scaleY: [{ time: 0, value: 1 }, { time: 0.14, value: 1.3 }, { time: 0.28, value: 1 }],
                },
              },
            },
            edges: [{ from: 'none', to: 'shown', trigger: 'operator', event: 'flag' }],
          },
        ],
      },
      // The CLOCK: running or held. Pure lifecycle — the states carry only their calls,
      // because stopping a clock is an effect, not a movement.
      {
        id: 'clock',
        initial: 'stopped',
        states: [
          {
            id: 'stopped',
            name: 'Clock stopped',
            timeline: { name: 'Clock stop', duration: 0.1, ease: 'out', calls: [{ time: 0, call: 'stopMatchClock' }], layers: {} },
            edges: [{ from: 'running', to: 'stopped', trigger: 'operator', event: 'clockStop' }],
          },
          {
            id: 'running',
            name: 'Clock running',
            timeline: { name: 'Clock start', duration: 0.1, ease: 'in', calls: [{ time: 0, call: 'startMatchClock' }], layers: {} },
            edges: [{ from: 'stopped', to: 'running', trigger: 'operator', event: 'clockStart' }],
          },
        ],
      },
      // The RESULT: live, or final. One way only — a match does not un-finish.
      {
        id: 'result',
        initial: 'live',
        states: [
          { id: 'live', name: 'Live', timeline: null, edges: [] },
          {
            id: 'final',
            name: 'Final',
            timeline: {
              name: 'Final',
              duration: 0.35,
              ease: 'in',
              calls: [{ time: 0, call: 'markFinal' }],
              layers: { box: { scale: [{ time: 0, value: 1 }, { time: 0.18, value: 1.04 }, { time: 0.35, value: 1 }] } },
            },
            edges: [{ from: 'live', to: 'final', trigger: 'operator', event: 'final' }],
          },
        ],
      },
    ],
  },
  controls: [
    { event: 'flag', label: 'Flag', section: 'Flag', order: 1 },
    { event: 'clearFlag', label: 'Clear flag', section: 'Flag', order: 2 },
    { event: 'clockStart', label: 'Start clock', section: 'Clock', order: 3 },
    { event: 'clockStop', label: 'Stop clock', section: 'Clock', order: 4 },
    { event: 'final', label: 'Full time', section: 'Result', order: 5 },
  ],
  capabilities: {
    maxLines: 1,
    logo: 'none',
    animationPresets: ['snap-stinger', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultZone: 'top-center',
  },
  designs: [
    {
      id: 'sb01',
      name: 'Match Strip',
      description: 'The sport score strip: team names against big scores, one accent edge.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      create: (_type, options) => sb01.create(options),
    },
    {
      id: 'sb02',
      name: 'Quiet Score',
      description: 'Panel-free corner stack - two quiet rows split by a hairline, accent rule on the edge.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      create: (_type, options) => sb02.create(options),
    },
  ],
};
