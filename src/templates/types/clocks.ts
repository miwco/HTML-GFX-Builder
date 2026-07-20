// The two CLOCK types. Both carry the same small parallel group — a clock that an operator
// can pause and resume — which is the cheapest honest demonstration of the model's core
// claim: state that has nothing to do with the graphic's entrance lives in its own group,
// runs alongside the default path, and never multiplies the states on it.
//
// The group's initial state is `running`, so its timeline never plays at play() (a parallel
// group's initial state is where it rests, not something it enters). The clock is started
// exactly as before, by the entrance step's own startClock call. All the group adds is the
// ability to hold it.

import { paletteById } from '../../model/wizard';
import { gt01 } from '../gameTimers/gt01';
import { gt02 } from '../gameTimers/gt02';
import { ss01 } from '../startingSoon/ss01';
import { ss02 } from '../startingSoon/ss02';
import { ss03 } from '../startingSoon/ss03';
import type { GraphicType, TypeGroup } from './graphicType';

/** The pause/resume group, shared by both clock types. The two states carry a short dim/undim
 *  so the operator can SEE that the clock is held, and a call that does the holding. */
function clockGroup(): TypeGroup {
  return {
    id: 'clock',
    initial: 'running',
    states: [
      {
        id: 'running',
        name: 'Running',
        timeline: {
          name: 'Resume',
          duration: 0.25,
          ease: 'in',
          calls: [{ time: 0, call: 'resumeClock' }],
          layers: { clock: { opacity: [{ time: 0, value: 0.55 }, { time: 0.25, value: 1 }] } },
        },
        edges: [{ from: 'paused', to: 'running', trigger: 'operator', event: 'resume' }],
      },
      {
        id: 'paused',
        name: 'Paused',
        timeline: {
          name: 'Pause',
          duration: 0.25,
          ease: 'out',
          calls: [{ time: 0, call: 'pauseClock' }],
          layers: { clock: { opacity: [{ time: 0, value: 1 }, { time: 0.25, value: 0.55 }] } },
        },
        edges: [{ from: 'running', to: 'paused', trigger: 'operator', event: 'pause' }],
      },
    ],
  };
}

const CLOCK_CONTROLS = [
  { event: 'pause', label: 'Pause clock', section: 'Clock', order: 1 },
  { event: 'resume', label: 'Resume clock', section: 'Clock', order: 2 },
];

/** COUNTDOWN / TIMER — 30 of the 60 formats need one (countdown, interval timer, round timer,
 *  deal timer, break timer). A label and a clock; the duration is DATA the operator sets. */
export const countdownType: GraphicType = {
  id: 'countdown',
  name: 'Countdown',
  description: 'A labelled clock counting down to zero, pausable on air.',
  frequency: 30,
  structure: {
    prefix: 'game-timer',
    category: 'game-timer',
    parts: [
      { id: 'box', selector: '.game-timer-box', kind: 'panel', required: true },
      { id: 'clock', selector: '.game-timer-clock', kind: 'block', required: true },
      { id: 'label', selector: '#f0', kind: 'line', required: true },
    ],
  },
  fields: [
    { key: 'label', label: 'Label', kind: 'text', value: 'ROUND 1', role: 'line' },
    // The duration is an operator VALUE, not a state: a timer's length has to be typed, and
    // timer-transition durations are authored data the operator cannot reach.
    { key: 'minutes', label: 'Timer (minutes)', kind: 'number', value: '3', role: 'hidden', min: 0, max: 180 },
  ],
  machine: { parallel: [clockGroup()] },
  controls: CLOCK_CONTROLS,
  capabilities: {
    maxLines: 1,
    logo: 'none',
    animationPresets: ['timer-line-reveal', 'timer-run'],
    defaultZone: 'top-center',
  },
  designs: [
    {
      id: 'gt01',
      name: 'Clean Clock',
      description: 'A quiet label over big tabular digits — the timer that gets out of the way.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      create: (_type, options) => gt01.create(options),
    },
    {
      id: 'gt02',
      name: 'Power Clock',
      description: 'A corner slab clock with a leaning accent edge — flips to the accent and flashes at zero.',
      styleTag: 'sport',
      palette: paletteById('inferno'),
      fontId: 'archivo',
      samples: { label: 'SHOT CLOCK' },
      create: (_type, options) => gt02.create(options),
    },
  ],
};

/** HOLDING SCREEN — the pre-show front door (starting soon, be right back, break screen);
 *  9 of the 60 formats call for one. Not a countdown wearing a different hat: it carries the
 *  show's title as well as the clock, and it breathes while it waits. */
export const holdingScreenType: GraphicType = {
  id: 'holding-screen',
  name: 'Holding screen',
  description: 'The pre-show screen: what is starting, and how long until it does.',
  frequency: 9,
  structure: {
    prefix: 'starting-soon',
    category: 'starting-soon',
    parts: [
      { id: 'box', selector: '.starting-soon-box', kind: 'panel', required: true },
      { id: 'clock', selector: '.starting-soon-clock', kind: 'block', required: true },
      { id: 'title', selector: '#f0', kind: 'line', required: true },
    ],
  },
  fields: [
    { key: 'title', label: 'Title', kind: 'text', value: 'STARTING SOON', role: 'line' },
    { key: 'show', label: 'Show name', kind: 'text', value: 'The Late Line', role: 'line' },
    { key: 'minutes', label: 'Countdown (minutes)', kind: 'number', value: '5', role: 'hidden', min: 0, max: 180 },
  ],
  machine: { parallel: [clockGroup()] },
  controls: CLOCK_CONTROLS,
  capabilities: {
    maxLines: 2,
    logo: 'none',
    animationPresets: ['hold-loop'],
    defaultZone: 'mid-center',
  },
  designs: [
    {
      id: 'ss01',
      name: 'Quiet Hold',
      description: 'A breathing hold screen: the show name, a countdown, and room to wait.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      create: (_type, options) => ss01.create(options),
    },
    {
      id: 'ss02',
      name: 'Volt Hold',
      description: 'Centered sport stack — accent chip, huge condensed show name, slab-mounted countdown.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'archivo',
      samples: { show: 'FRIDAY FIGHT NIGHT' },
      create: (_type, options) => ss02.create(options),
    },
    {
      id: 'ss03',
      name: 'Frost Hold',
      description: 'A centered frosted card with the countdown breathing inside a soft glass pill.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      samples: { show: 'Midnight Sessions' },
      create: (_type, options) => ss03.create(options),
    },
  ],
};
