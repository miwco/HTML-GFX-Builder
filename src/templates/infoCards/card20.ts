// card20 "Volt Now Next" — the SPORT now/next card: the event running now (heat, race, bout)
// with its detail line, then what follows it on the schedule. A flat slab under an accent rail,
// heavy condensed caps throughout. Sibling of lt06 "Split Bar" and card12 "Segment Title".

import { type TemplateVariant } from '../../model/wizard';
import { CARD20_SAMPLES, NOW_NEXT_FIELDS } from '../pack4/content';
import { VOLT } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildNowNext } from './pack4/nowNext';
import { defineCardVariant } from './shared';

export const card20: TemplateVariant = defineCardVariant(
  {
    id: 'card20',
    category: 'info-card',
    name: 'Volt Now Next',
    styleTag: 'sport',
    description: 'A sport slab: the event on now with its detail, then the next one up.',
    maxLines: 5,
    suggestedLines: typeLines(NOW_NEXT_FIELDS, CARD20_SAMPLES),
    logo: 'optional',
    animationPresets: ['snap-stinger', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: VOLT.palette,
    defaultFontId: VOLT.fontId,
    defaultZone: 'bottom-left',
  },
  {
    name: 'Volt Now Next',
    description:
      'The sport now/next slab: a flat near-black panel under a chunky accent rail, the event ' +
      'running now in heavy condensed caps with its detail line, and the next item on the ' +
      'schedule under a hairline. For meets, tournaments and any multi-event programme.',
    uicolor: '5',
  },
  (o) => buildNowNext(VOLT, o),
);
