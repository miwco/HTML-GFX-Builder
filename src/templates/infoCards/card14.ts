// card14 "Chapter Card" — the MINIMAL chapter marker. Documentaries, long-form interviews and
// lecture streams break into chapters, and the graphic that names one has to be quiet enough
// to sit under a voice-over: no panel, an accent hairline down the left, the chapter title,
// and two small marked points saying what it covers. Sibling of lt01 "Hairline".

import { type TemplateVariant } from '../../model/wizard';
import { CARD14_SAMPLES, TOPIC_CARD_FIELDS } from '../pack4/content';
import { CLEAN } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildTopicCard } from './pack4/topics';
import { defineCardVariant } from './shared';

export const card14: TemplateVariant = defineCardVariant(
  {
    id: 'card14',
    category: 'info-card',
    name: 'Chapter Card',
    styleTag: 'minimal',
    description: 'A quiet chapter marker: the chapter, what it covers, and when it happened.',
    maxLines: 5,
    suggestedLines: typeLines(TOPIC_CARD_FIELDS, CARD14_SAMPLES),
    logo: 'optional',
    animationPresets: ['line-reveal', 'mask-wipe', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: CLEAN.palette,
    defaultFontId: CLEAN.fontId,
    defaultZone: 'mid-left',
  },
  {
    name: 'Chapter Card',
    description:
      'The minimal chapter marker: no panel, an accent hairline down the left, the chapter ' +
      'title, and marked points under it. Quiet enough to run under narration, and it takes ' +
      'up to five points if the chapter needs them.',
    uicolor: '1',
  },
  (o) => buildTopicCard(CLEAN, o),
);
