// TRANSITION — the type whose whole content is its LIFECYCLE.
//
// Every other graphic in the catalog waits for an operator to take it off air. A transition
// covers the frame, holds for about a beat while the vision mixer cuts underneath, and then
// clears ITSELF. That self-clearing is the graphic: a stinger an operator has to remember to
// stop is a stinger that sits over the new picture.
//
// So this type declares exactly one thing the derived machine could not: a `timer` arrow from
// the entrance waypoint straight to the exit (TypeMachine.main.edges — added for this case,
// because a branch's edges always have the branch at one end and there is no branch here).
// `exitOnNext` rides along so the operator can clear it early with Continue, and `stop()` is
// legal from every state as always. Three ways off air, one of them automatic, none of them a
// setTimeout inside a template.
//
// The trap this type is deliberately clear of (docs/GRAPHIC_TYPES.md, and validateMachine
// enforces it): a timer arms when its state's entry timeline ENDS, so a state carrying endless
// motion never arms one. A transition's cover is a short, finite entrance — which is exactly
// what makes the timer legal here and illegal on a marquee.

import { paletteById } from '../../model/wizard';
import { tr01 } from '../transitions/tr01';
import { tr02 } from '../transitions/tr02';
import { tr03 } from '../transitions/tr03';
import { tr04 } from '../transitions/tr04';
import type { GraphicType } from './graphicType';

/**
 * How long the cover holds before it clears itself, in speed-relative seconds.
 *
 * Broadcast practice, not a guess: a stinger's covered moment is where the cut happens, and it
 * has to be long enough for a switcher (or a human) to make it and short enough that the new
 * source is not sitting behind a graphic. Somewhere around a second is the whole usable range.
 * It rides the speed knob like every other duration, and it is one editable number in the
 * emitted animation data afterwards.
 */
const HOLD = 1.1;

export const transitionType: GraphicType = {
  id: 'transition',
  name: 'Transition',
  description: 'A full-frame moment that covers the picture so a cut can happen, then clears itself.',
  structure: {
    prefix: 'transition',
    category: 'transition',
    parts: [
      { id: 'box', selector: '.transition-box', kind: 'panel', required: true },
      { id: 'label', selector: '#f0', kind: 'line', required: true },
    ],
  },
  fields: [
    // One field, and it may legitimately be left blank — a wordless wipe is a real choice,
    // which is why every design hides its label element when the value is empty.
    { key: 'label', label: 'Label', kind: 'text', value: 'REPLAY', role: 'line' },
  ],
  machine: {
    main: {
      // The self-clear: hold the cover, then run the exit. `{ waypoint: -1 }` is the exit
      // whatever the step count resolves to, so this stays correct if a design grows a beat.
      edges: [{ from: { waypoint: 0 }, to: { waypoint: -1 }, trigger: 'timer', after: HOLD }],
      // …and the manual version, for an operator cutting to their own rhythm.
      exitOnNext: true,
    },
  },
  controls: [],
  capabilities: {
    maxLines: 1,
    logo: 'none',
    animationPresets: ['transition-slam', 'transition-wipe', 'transition-sweep'],
    // A transition covers the frame; the anchor zone is meaningless to it, and mid-center is
    // what makes the full-canvas root land exactly on the frame (the versus-card precedent).
    defaultZone: 'mid-center',
  },
  designs: [
    {
      id: 'tr03',
      name: 'House Replay',
      description: 'The house replay bumper: two void bands close over the frame with an amber seam and a chip.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      animationPresets: ['transition-sweep', 'transition-slam', 'transition-wipe'],
      create: (_type, options) => tr03.create(options),
    },
    {
      id: 'tr01',
      name: 'Volt Stinger',
      description: 'A sport sting: leaning slabs slam across the frame and the mark snaps on over them.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      samples: { label: 'MATCHDAY' },
      animationPresets: ['transition-slam', 'transition-wipe', 'transition-sweep'],
      create: (_type, options) => tr01.create(options),
    },
    {
      id: 'tr02',
      name: 'Clean Wipe',
      description: 'A quiet band wipes across the frame behind a thin accent edge, then wipes on off.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      samples: { label: 'Next' },
      animationPresets: ['transition-wipe', 'transition-sweep', 'transition-slam'],
      create: (_type, options) => tr02.create(options),
    },
    {
      id: 'tr04',
      name: 'Frost Sweep',
      description: 'Frosted columns rise over the frame one after another, then lift away upward.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      samples: { label: 'Coming up' },
      animationPresets: ['transition-sweep', 'transition-wipe', 'transition-slam'],
      create: (_type, options) => tr04.create(options),
    },
  ],
};
