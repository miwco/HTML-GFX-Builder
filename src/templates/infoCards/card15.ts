// card15 "Question Card" — the GLASS question card. A panel discussion, an AMA or a debate
// puts the question on screen and leaves it there: the question is set large in a frosted
// panel, with the two things it turns on marked underneath. Sibling of lt08 "Frosted Card".

import { type TemplateVariant } from '../../model/wizard';
import { CARD15_SAMPLES, TOPIC_CARD_FIELDS } from '../pack4/content';
import { FROST } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildTopicCard } from './pack4/topics';
import { defineCardVariant } from './shared';

export const card15: TemplateVariant = defineCardVariant(
  {
    id: 'card15',
    category: 'info-card',
    name: 'Question Card',
    styleTag: 'glass',
    description: 'A frosted question card: the question large, then what it turns on.',
    maxLines: 5,
    suggestedLines: typeLines(TOPIC_CARD_FIELDS, CARD15_SAMPLES),
    logo: 'optional',
    animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: FROST.palette,
    defaultFontId: FROST.fontId,
    defaultZone: 'mid-right',
  },
  {
    name: 'Question Card',
    description:
      'The glass question card for panels, debates and live Q&As: a translucent blurred panel ' +
      'with a short accent stroke, the question at heading size, and marked points under it. ' +
      'Turn steps on and each point arrives on its own SPX Continue.',
    uicolor: '3',
  },
  (o) => buildTopicCard(FROST, o),
);
