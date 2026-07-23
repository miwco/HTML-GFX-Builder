// card16 "Topic Slab" — the SPORT talking point. The analysis card a studio cuts to at
// half-time: a flat slab under a chunky accent rail, one heavy condensed caps heading, and the
// two or three points the pundits are about to make. Sibling of lt06 "Split Bar".

import { type TemplateVariant } from '../../model/wizard';
import { CARD16_SAMPLES, TOPIC_CARD_FIELDS } from '../pack4/content';
import { VOLT } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildTopicCard } from './pack4/topics';
import { defineCardVariant } from './shared';

export const card16: TemplateVariant = defineCardVariant(
  {
    id: 'card16',
    category: 'info-card',
    name: 'Topic Slab',
    styleTag: 'sport',
    description: 'A sport talking point: an accent rail over a heavy caps heading and two points.',
    maxLines: 5,
    suggestedLines: typeLines(TOPIC_CARD_FIELDS, CARD16_SAMPLES),
    logo: 'optional',
    animationPresets: ['snap-stinger', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: VOLT.palette,
    defaultFontId: VOLT.fontId,
    defaultZone: 'mid-left',
  },
  {
    name: 'Topic Slab',
    description:
      'The sport analysis card: a flat near-black slab under a chunky accent rail, a heavy ' +
      'condensed caps heading, and marked caps points under it. Made for half-time analysis ' +
      'and for the talking points a studio walks through one press at a time.',
    uicolor: '5',
  },
  (o) => buildTopicCard(VOLT, o),
);
