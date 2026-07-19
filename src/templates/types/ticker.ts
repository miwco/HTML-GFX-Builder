// TICKER — the type that has to advance BY ITSELF, which is what makes it the interesting one.
//
// The reference formats want a ticker in 8 of 60, but its real job here is to prove that a
// graphic can move without an operator: items cycle on a timer, and the operator can still
// take hold of it.
//
// Why this type is a ROTATOR and not the classic scrolling marquee: a timer arms when its
// state's entry timeline ends, and a marquee's timeline never ends (it is an endless
// repeat). Verified against GSAP directly — a call scheduled at an endless timeline's
// duration never fires — and now guarded by validateMachine, so the mistake reports itself
// rather than producing a ticker that silently sits still.
//
// So the machine IS the cycle: each beat slides one item out and the next one in with real,
// editable keyframes, and a zero-duration call advances the index. The index stays runtime
// data — never a state per item, which is the model's "parameterize with data" rule at its
// most literal. The marquee remains a catalog variant with no machine, unchanged.

import { paletteById } from '../../model/wizard';
import { tk05 } from '../tickers/tk05';
import type { GraphicType } from './graphicType';

const ITEMS_SAMPLE = [
  'Welcome to tonight’s live show',
  'Guest lineup announced for next week',
  'Send your questions with #ontheair',
  'Tickets for the summer tour are on sale now',
].join('\n');

/** How long each item holds before the next one takes over (speed-relative seconds). */
const HOLD = 3.2;

export const tickerType: GraphicType = {
  id: 'ticker',
  name: 'Ticker',
  description: 'A strip that cycles through its items on its own, pausable on air.',
  frequency: 8,
  structure: {
    prefix: 'ticker',
    category: 'ticker',
    parts: [
      { id: 'box', selector: '.ticker-box', kind: 'panel', required: true },
      { id: 'track', selector: '#ticker-track', kind: 'block', required: true },
    ],
  },
  fields: [
    { key: 'items', label: 'Ticker items', kind: 'lines', value: ITEMS_SAMPLE, role: 'line' },
    { key: 'label', label: 'Label', kind: 'text', value: 'ON AIR', role: 'line' },
  ],
  machine: {
    main: {
      branches: [
        {
          id: 'advance',
          name: 'Next item',
          // The beat: the showing item lifts away, the next one rises in its place. The swap
          // happens at the midpoint, while nothing is visible.
          timeline: {
            name: 'Advance',
            duration: 0.6,
            ease: 'in',
            calls: [{ time: 0.3, call: 'tickerShowNext' }],
            layers: {
              track: {
                y: [
                  { time: 0, value: 0 },
                  { time: 0.3, value: -18 },
                  { time: 0.3, value: 18 },
                  { time: 0.6, value: 0 },
                ],
                opacity: [
                  { time: 0, value: 1 },
                  { time: 0.3, value: 0 },
                  { time: 0.6, value: 1 },
                ],
              },
            },
          },
          edges: [
            // On air, wait, then start cycling — no operator input at all.
            { from: { waypoint: 0 }, to: 'advance', trigger: 'timer', after: HOLD },
            // Then keep going: a self-transition replays the beat for as long as it runs.
            { from: 'advance', to: 'advance', trigger: 'timer', after: HOLD },
            // The operator can always jump ahead.
            { from: { waypoint: 0 }, to: 'advance', trigger: 'operator', event: 'skip' },
          ],
        },
        {
          // Pose-only: entering it plays nothing. Pausing IS entering it — the machine cancels
          // the armed timer on the way out of the cycling state, and nothing re-arms it.
          id: 'paused',
          name: 'Paused',
          timeline: null,
          edges: [
            { from: { waypoint: 0 }, to: 'paused', trigger: 'operator', event: 'pause' },
            { from: 'advance', to: 'paused', trigger: 'operator', event: 'pause' },
            { from: 'paused', to: 'advance', trigger: 'operator', event: 'resume' },
          ],
        },
      ],
    },
  },
  controls: [
    { event: 'pause', label: 'Pause', section: 'Ticker', order: 1 },
    { event: 'resume', label: 'Resume', section: 'Ticker', order: 2 },
    { event: 'skip', label: 'Next item', section: 'Ticker', order: 3 },
  ],
  capabilities: {
    maxLines: 2,
    logo: 'none',
    // Only the rotate preset can carry this machine: the other two animate forever, and a
    // timer never arms on a timeline that never ends.
    animationPresets: ['ticker-rotate'],
    defaultZone: 'bottom-center',
  },
  designs: [
    {
      id: 'tk05',
      name: 'House Wire',
      description: 'The house strip: void blur, half-strength amber edge, solid label block.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      // The preset is pinned rather than inherited: tk05's own default is the endless
      // marquee, which the machine cannot drive.
      create: (_type, options) => tk05.create({ ...options, animation: { ...options?.animation, presetId: 'ticker-rotate' } }),
    },
  ],
};
