// card17 "Key Term" — the HOUSE explainer card. When a stream uses a word the audience may not
// know, this is the graphic that defines it: the term in the void panel behind the amber bar,
// then what it means and how it is measured. Sibling of lt11 "House Strap" and card06 "House
// Topic" — where card06 holds a topic and its points, this one holds a single term.

import { type TemplateVariant } from '../../model/wizard';
import { CARD17_SAMPLES, TOPIC_CARD_FIELDS } from '../pack4/content';
import { HOUSE } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildTopicCard } from './pack4/topics';
import { defineCardVariant } from './shared';

export const card17: TemplateVariant = defineCardVariant(
  {
    id: 'card17',
    category: 'info-card',
    name: 'Key Term',
    styleTag: 'noacg',
    description: 'The explainer key-term card: a word in the void panel, then what it means.',
    maxLines: 5,
    suggestedLines: typeLines(TOPIC_CARD_FIELDS, CARD17_SAMPLES),
    logo: 'optional',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: HOUSE.palette,
    defaultFontId: HOUSE.fontId,
    defaultZone: 'mid-right',
  },
  {
    name: 'Key Term',
    description:
      'The house explainer card: an 8px amber bar with the house glow fused to a void blur ' +
      'panel, the term at heading size, and marked lines saying what it means. For education ' +
      'streams, tech shows and anywhere a word needs defining on air.',
    uicolor: '4',
  },
  (o) => buildTopicCard(HOUSE, o),
);
