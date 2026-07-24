// The AUDIENCE-ACTION types: the ask, and the progress the ask is making.
//
// docs/PACK_TAXONOMY.md's gap list put "goal / progress bar" at the top by frequency — around
// eight of the sixty reference formats want one — and every one of them is the same two numbers
// (what we have, what we are aiming at) drawn a different way. That is a type, not three
// designs that happen to look similar, and the shared rebuild in
// infographics/dataRuntimes.ts is where the derivation lives once.
//
// None of these needs a state machine. A goal meter changes because its DATA changes, which is
// exactly the case the state schema says must never be a transition: `update()` writes the
// figures and the graphic re-derives itself. The only thing that moves on a timeline is the
// entrance.

import { paletteById } from '../../model/wizard';
import { ig22 } from '../infographics/ig22';
import { ig23 } from '../infographics/ig23';
import { ig24 } from '../infographics/ig24';
import { ig25 } from '../infographics/ig25';
import { lt55 } from '../lowerThirds/lt55';
import { lt56 } from '../lowerThirds/lt56';
import { lt57 } from '../lowerThirds/lt57';
import type { GraphicType } from './graphicType';

/**
 * CALL TO ACTION — the strap that ASKS.
 *
 * The four asks a live programme actually makes — follow, donate, register, buy — are one
 * graphic with a different verb in it, and the reference data spreads them across different
 * formats. Making the verb a FIELD is what stops this being four near-identical designs; it is
 * the same "parameterize with data, not states" instinct the state schema applies to poses,
 * applied to content.
 *
 * It is deliberately NOT the social-handle type. A handle bug states where to find someone and
 * sits there for a whole segment; a call to action asks for something and has a reason line to
 * justify it. Same category, same prefix, different graphic — which is exactly the distinction
 * docs/GRAPHIC_TYPES.md §5's semantics gate exists to protect.
 */
export const callToActionType: GraphicType = {
  id: 'call-to-action',
  name: 'Call to action',
  description: 'The ask: an imperative, what it points at, and why anyone should.',
  structure: {
    prefix: 'lower-third',
    category: 'lower-third',
    parts: [
      { id: 'box', selector: '.lower-third-box', kind: 'panel', required: true },
      { id: 'action', selector: '#f0', kind: 'line', required: true },
      { id: 'target', selector: '#f1', kind: 'line', required: true },
    ],
  },
  fields: [
    // The verb is a field on purpose — see this type's comment.
    { key: 'action', label: 'Action', kind: 'text', value: 'FOLLOW', role: 'line' },
    { key: 'target', label: 'Target', kind: 'text', value: '@noacgstudio', role: 'line' },
    { key: 'detail', label: 'Detail', kind: 'text', value: 'New broadcast graphics every Friday', role: 'line' },
  ],
  machine: {},
  controls: [],
  capabilities: {
    maxLines: 3,
    logo: 'none',
    animationPresets: ['slide-up', 'line-reveal', 'pop-spring', 'fade', 'slide-left', 'blur-in'],
    defaultZone: 'bottom-left',
  },
  designs: [
    {
      id: 'lt55',
      name: 'House Call',
      description: 'The NoaCG call-to-action strap: an amber action chip beside the target it points at.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      create: (_type, options) => lt55.create(options),
    },
    {
      id: 'lt56',
      name: 'Frost Call',
      description: 'A frosted call-to-action pill: an outlined chip, the target, and a drawn arrow.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      // Written around a hospice appeal, in the glass family's sentence case.
      samples: {
        action: 'Donate',
        target: 'give.cityhospice.org',
        detail: 'Every gift is matched until midnight',
      },
      animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-left', 'flip-3d'],
      defaultZone: 'bottom-center',
      create: (_type, options) => lt56.create(options),
    },
    {
      id: 'lt57',
      name: 'Volt Call',
      description: 'A leaning sport slab: the imperative in heavy caps over its target and reason.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      samples: {
        action: 'BUY TICKETS',
        target: 'VOLTAFC.COM/TICKETS',
        detail: 'MEMBERS PRESALE OPENS 09:00 FRIDAY',
      },
      animationPresets: ['snap-stinger', 'mask-wipe', 'slide-left', 'fade', 'slide-up', 'flip-3d'],
      create: (_type, options) => lt57.create(options),
    },
  ],
};

/**
 * GOAL METER — two numbers, and everything else derived.
 *
 * The operator types what has been raised and what the target is; the share, the grouped
 * figures and the caption are all worked out from those two. That is the type's whole promise,
 * and it is why the bar version and the ring version are ONE type: they differ only in where
 * the derived share is drawn (a fill's data-value or an SVG ring's), which is a design
 * decision, not a different graphic.
 *
 * The measured motion is the part a keyframe cannot hold — the ring's angle and the counter's
 * target are the operator's data, so they live in named builders (infographics/igMotion.ts) and
 * the animation region only names them. `goal-ring` exists as its own preset for a reason worth
 * remembering: on a POLL ring the middle figure IS the percent, so one number drives both; on a
 * goal meter the middle figure is money and the ring is raised/goal. Reusing 'ring-fill' here
 * would draw a full ring at 3% raised.
 */
export const goalMeterType: GraphicType = {
  id: 'goal-meter',
  name: 'Goal meter',
  description: 'A running total against a target, with the share of the goal derived from both.',
  structure: {
    prefix: 'infographic',
    category: 'infographic',
    parts: [
      { id: 'box', selector: '.infographic-box', kind: 'panel', required: true },
      { id: 'raised', selector: '#f0', kind: 'line', required: true },
    ],
  },
  fields: [
    { key: 'raised', label: 'Raised', kind: 'text', value: '124213', role: 'line' },
    // Plain numbers in both, deliberately: a currency mark typed into them would defeat the
    // count-up's parse, which is why the unit is a field of its own below.
    { key: 'goal', label: 'Goal', kind: 'text', value: '250000', role: 'line' },
    { key: 'label', label: 'Label', kind: 'text', value: 'TOTAL RAISED', role: 'data' },
    // Blank for a subscriber or sign-up goal; a currency mark for an appeal.
    { key: 'unit', label: 'Unit', kind: 'text', value: '€', role: 'data' },
  ],
  machine: {},
  controls: [],
  capabilities: {
    maxLines: 2,
    logo: 'none',
    animationPresets: ['count-up'],
    defaultZone: 'bottom-center',
  },
  designs: [
    {
      id: 'ig22',
      name: 'House Goal',
      description: 'The NoaCG goal meter: the running total over a progress bar toward its target.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      create: (_type, options) => ig22.create(options),
    },
    {
      id: 'ig23',
      name: 'Frost Goal',
      description: 'A goal ring: the accent draws to the share of the target while the total counts up.',
      styleTag: 'glass',
      palette: paletteById('frost'),
      fontId: 'manrope',
      samples: { raised: '8420', goal: '15000' },
      // The ring is drawn by its own builder — see this type's comment for why it cannot be
      // the poll board's 'ring-fill'.
      animationPresets: ['goal-ring'],
      defaultZone: 'mid-right',
      create: (_type, options) => ig23.create(options),
    },
  ],
  // ig05 "Rising Total" is the minimal member of this family and is NOT promoted here: it
  // predates the type and carries three fields (total, goal, kicker) where the type declares
  // four — it has no unit field, because its currency mark is drawn into the markup. Promoting
  // it would mean either lying about its field list or rewriting a design people already use.
  // It stays a hand-written variant, which the catalog has always allowed.
};

/**
 * MILESTONE TRACK — the tier rail: which sub-goals are behind us, and where we are between the
 * last one and the next.
 *
 * Different question from the goal meter, which is why it is a different type rather than a
 * third design of one: a goal meter answers "how far to the target", a milestone track answers
 * "which tiers have we passed". A creator's follower tiers, a telethon's stretch goals and a
 * challenge's stages are all this graphic.
 *
 * The geometry decision is recorded in infographics/dataRuntimes.ts and is worth knowing about
 * from here too: the nodes are spaced EVENLY and the progress line is interpolated BETWEEN
 * them, not plotted at current/max. A rail drawn as "1 → 2 → 3 → 4" has to have its line mean a
 * position on that rail, and even spacing is what keeps four labels readable when someone adds
 * a stretch goal ten times the size of the first.
 */
export const milestoneTrackType: GraphicType = {
  id: 'milestone-track',
  name: 'Milestone track',
  description: 'A rail of tiers with the passed ones lit and the line run out to where we are.',
  structure: {
    prefix: 'infographic',
    category: 'infographic',
    parts: [{ id: 'box', selector: '.infographic-box', kind: 'panel', required: true }],
  },
  fields: [
    // One "Label | target" per line — the same source shape the agenda and poll boards use, so
    // an operator who can fill one can fill all three.
    { key: 'milestones', label: 'Milestones', kind: 'lines', value: 'Warm-up | 5000\nHalfway | 15000\nStretch | 30000\nDream | 50000', role: 'line' },
    { key: 'current', label: 'Current', kind: 'text', value: '18400', role: 'line' },
    { key: 'label', label: 'Label', kind: 'text', value: 'MILESTONES', role: 'data' },
  ],
  machine: {},
  controls: [],
  capabilities: {
    maxLines: 2,
    logo: 'none',
    animationPresets: ['milestone-run'],
    defaultZone: 'bottom-center',
  },
  designs: [
    {
      id: 'ig24',
      name: 'House Milestones',
      description: 'The NoaCG tier rail: evenly spaced nodes on a void panel, the reached ones in amber.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      create: (_type, options) => ig24.create(options),
    },
    {
      id: 'ig25',
      name: 'Volt Milestones',
      description: 'A leaning sport slab carrying the same tier rail with hard-edged square markers.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      samples: {
        milestones: 'BRONZE | 1000\nSILVER | 2500\nGOLD | 5000\nLEGEND | 10000',
        current: '3120',
      },
      create: (_type, options) => ig25.create(options),
    },
  ],
};
