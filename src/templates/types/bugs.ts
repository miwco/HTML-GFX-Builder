// The two persistent BUG types — small marks that sit on screen while other graphics come
// and go. Neither needs a state machine: a bug's whole job is to persist, stop() removes it,
// and the derived linear machine already describes that exactly.

import { paletteById } from '../../model/wizard';
import { bug02 } from '../cornerBug/bug02';
import { lt14 } from '../lowerThirds/lt14';
import type { GraphicType } from './graphicType';

/** SPONSOR / LOGO BUG — 37 of the 60 reference formats want one (sponsor bug, partner logo,
 *  brand bug, logo strip). Second only to the lower third. */
export const sponsorBugType: GraphicType = {
  id: 'sponsor-bug',
  name: 'Sponsor bug',
  description: 'A logo and a caption, parked in a corner for as long as the segment runs.',
  frequency: 37,
  structure: {
    prefix: 'corner-bug',
    category: 'corner-bug',
    parts: [
      { id: 'box', selector: '.corner-bug-box', kind: 'panel', required: true },
      { id: 'caption', selector: '#f0', kind: 'line', required: true },
    ],
  },
  fields: [
    { key: 'caption', label: 'Caption', kind: 'text', value: 'On Air', role: 'line' },
    // The logo compiles LAST — the shared slot derives its id from the count of everything else.
    { key: 'logo', label: 'Logo', kind: 'image', value: '', role: 'logo' },
  ],
  machine: {},
  controls: [],
  capabilities: {
    maxLines: 1,
    logo: 'built-in',
    animationPresets: ['fade', 'slide-up', 'blur-in', 'pop-spring'],
    defaultZone: 'top-left',
  },
  designs: [
    {
      id: 'bug02',
      name: 'House Clock',
      description: 'The NoaCG house bug: the mark over a mono caption and a live accent clock.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      create: (_type, options) => bug02.create(options),
    },
  ],
};

/** SOCIAL HANDLE BUG — 17 of the 60 formats ask for handles or a hashtag on screen, and
 *  nothing in the catalog was shaped for it. The one genuinely NEW type of the set, which
 *  makes it the honest measure of what a type costs: a field list and a design. */
export const socialBugType: GraphicType = {
  id: 'social-bug',
  name: 'Social handle',
  description: 'A handle and its platform, small and persistent — the follow-me mark.',
  frequency: 17,
  structure: {
    prefix: 'lower-third',
    category: 'lower-third',
    parts: [
      { id: 'accent', selector: '.lower-third-accent', kind: 'accent', required: true },
      { id: 'box', selector: '.lower-third-box', kind: 'panel', required: true },
      { id: 'handle', selector: '#f0', kind: 'line', required: true },
      { id: 'platform', selector: '#f1', kind: 'line', required: true },
    ],
  },
  fields: [
    { key: 'handle', label: 'Handle', kind: 'text', value: '@noacg', role: 'line' },
    // Platform stays free TEXT, not a dropdown: platforms are open-ended, and the field policy
    // keeps dropdowns for genuinely constrained choices.
    { key: 'platform', label: 'Platform', kind: 'text', value: 'INSTAGRAM', role: 'line' },
  ],
  machine: {},
  controls: [],
  capabilities: {
    maxLines: 2,
    logo: 'none',
    animationPresets: ['slide-up', 'fade', 'line-reveal', 'mask-wipe', 'blur-in'],
    defaultZone: 'bottom-right',
  },
  designs: [
    {
      id: 'lt14',
      name: 'House Handle',
      description: 'The house social mark: compact void strip, amber bar, mono platform label.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      create: (_type, options) => lt14.create(options),
    },
  ],
};
