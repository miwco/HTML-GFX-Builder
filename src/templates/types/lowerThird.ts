// LOWER THIRD — the most-needed graphic there is: 52 of the 60 reference formats call for
// one (anchor, guest, speaker, artist, player, pastor, candidate…). It is also the type that
// proves the model stays out of the way: one group, three states (off -> on -> out), no
// machine key at all, and the SPX Continue contract drives it with nothing else declared.
//
// Design: promotes lt11 "House Strap" unchanged — the family flagship every other house
// variant is already judged against.

import { paletteById } from '../../model/wizard';
import { lt02 } from '../lowerThirds/lt02';
import { lt05 } from '../lowerThirds/lt05';
import { lt11 } from '../lowerThirds/lt11';
import { lt15 } from '../lowerThirds/lt15';
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
      // The underline is the design's one accent moment, so line-reveal leads; it was never
      // drawn for a mask-wipe, which the type's list adds.
      animationPresets: ['line-reveal', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
      create: (_type, options) => lt02.create(options),
    },
    {
      id: 'lt05',
      name: 'Angle Slab',
      description: 'A forward-leaning dark slab with a chunky accent edge - fast, aggressive sport energy.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      samples: { name: 'JAKE MORRISON', title: '24 PTS · 11 AST' },
      // The design labels its lines "Player" and "Stat line" where the type says "Name" and
      // "Title" — but they are the same two roles: a player name is the primary identifier, a
      // stat line is the secondary descriptor. Sport-flavoured wording for a name and a title.
      semantics: 'Player = the name (primary identifier); stat line = the title (secondary line).',
      // The lean is painted on a pseudo-layer precisely so the stinger's skew cannot flatten
      // it; taking the type's line-reveal default would retire the preset it is drawn around.
      animationPresets: ['snap-stinger', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
      create: (_type, options) => lt05.create(options),
    },
    // On the semantics gate, which is the only one that had to be argued here: lt05 names its
    // fields Player and Stat line where this type names them Name and Title. That is the type
    // GENERALISING its instances, not redefining them - both graphics answer "who is on screen,
    // and one thing about them", and lt05's own file opens by calling itself a sport lower
    // third. It is the mirror of the lt01 mistake rather than a repeat of it: that was a lower
    // third claimed by a DIFFERENT type whose fields mean something else entirely, while here
    // the type and the design already agree on what the graphic is.
    //
    {
      // Designed FOR this cell. NO EXISTING GLASS LOWER THIRD IS PROMOTABLE, and all three
      // fail differently, which is why this cell needed a new design rather than a promotion:
      //  - lt08 Frosted Card fails three gates at once - it emits no .lower-third-accent element
      //    (the accent is its keyline), carries three lines against this type's two, and declares
      //    logo 'optional' where this type declares none;
      //  - lt09 Gradient Pill fails parts for the same reason (its accent is an edge ring drawn
      //    by a pseudo-element, so there is no accent NODE for a timeline to address) and fails
      //    semantics besides: its second line is an @handle, which is the social bug's subject;
      //  - lt10 Soft Stack has a real accent but emits three fields against this type's two.
      // The parts gate is doing genuine work here: five of the fourteen original lower thirds
      // paint their accent rather than placing it, and a type that names `accent` as a required
      // part cannot take any of them however well the rest lines up. lt15 keeps lt08's frosted
      // card but leads it with a real soft accent edge and holds to the two lines this type
      // declares.
      id: 'lt15',
      name: 'Frost Strap',
      description: 'A frosted glass strap led by a soft accent edge — name over a dimmed title.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      samples: { name: 'Sofia Lindqvist', title: 'Creative Director' },
      animationPresets: ['blur-in', 'pop-spring', 'line-reveal', 'fade', 'slide-down', 'flip-3d'],
      create: (_type, options) => lt15.create(options),
    },
    //
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
