// LOWER THIRD — the most-needed graphic there is: 52 of the 60 reference formats call for
// one (anchor, guest, speaker, artist, player, pastor, candidate…). It is also the type that
// proves the model stays out of the way: one group, three states (off -> on -> out), no
// machine key at all, and the SPX Continue contract drives it with nothing else declared.
//
// Design: promotes lt11 "House Strap" unchanged — the family flagship every other house
// variant is already judged against.

import { paletteById } from '../../model/wizard';
import { lt02 } from '../lowerThirds/lt02';
import { lt11 } from '../lowerThirds/lt11';
import type { GraphicType } from './graphicType';

export const lowerThirdType: GraphicType = {
  id: 'lower-third',
  name: 'Lower third',
  description: 'A name and a title, anchored bottom-left. The workhorse of live graphics.',
  frequency: 52,
  structure: {
    prefix: 'lower-third',
    category: 'lower-third',
    parts: [
      { id: 'accent', selector: '.lower-third-accent', kind: 'accent', required: true },
      { id: 'box', selector: '.lower-third-box', kind: 'panel', required: true },
      { id: 'name', selector: '#f0', kind: 'line', required: true },
      { id: 'title', selector: '#f1', kind: 'line', required: true },
    ],
  },
  fields: [
    { key: 'name', label: 'Name', kind: 'text', value: 'Noa Haline', role: 'line' },
    { key: 'title', label: 'Title', kind: 'text', value: 'Anchor · Evening News', role: 'line' },
  ],
  // No branches, no parallel groups, no event overrides: the derived linear machine is
  // already exactly right, so nothing is persisted and the emitted template is unchanged.
  machine: {},
  controls: [],
  capabilities: {
    maxLines: 2,
    logo: 'none',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultZone: 'bottom-left',
  },
  designs: [
    {
      id: 'lt11',
      name: 'House Strap',
      description: 'The NoaCG house strap: amber accent bar, void blur panel, mono kicker title.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      create: (_type, options) => lt11.create(options),
    },
    {
      id: 'lt02',
      name: 'Underline',
      description: 'Panel-free name and title separated by a short accent underline.',
      styleTag: 'minimal',
      palette: paletteById('signal'),
      fontId: 'space-grotesk',
      samples: { name: 'Marcus Chen', title: 'Senior Analyst' },
      create: (_type, options) => lt02.create(options),
    },
    // lt07 is NOT promotable here either, for a third reason worth naming: a compiled variant
    // takes the TYPE's capabilities, not the design's. lt07 declares `logo: 'optional'` and
    // three lines; this type declares no logo and two. Promoting it silently stripped the badge
    // it is named for and dropped it out of the wizard's logo-first ordering. The sport
    // lower-third cell needs a two-line design with no logo slot.
    // lt10 is NOT promotable here: this type declares two fields (name, title) and lt10 emits
    // three. A type's field count is part of its contract — the control page and the compiled
    // fN ids are built from it — so a design carrying an extra field is a different graphic,
    // not the same graphic in another skin. The glass lower-third cell needs a two-field design.
  ],
};
