// card23 "Frost Headline" — the GLASS headline card. The announcement graphic: a frosted panel
// with a short accent stroke, the news at heading size, the detail as a paragraph, and where to
// act on it. Calm enough for a venue, a box office or a community stream. Sibling of lt08
// "Frosted Card".

import { type TemplateVariant } from '../../model/wizard';
import { CARD23_SAMPLES, HEADLINE_FIELDS } from '../pack4/content';
import { FROST } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildHeadlineCard } from './pack4/headline';
import { defineCardVariant } from './shared';

export const card23: TemplateVariant = defineCardVariant(
  {
    id: 'card23',
    category: 'info-card',
    name: 'Frost Headline',
    styleTag: 'glass',
    description: 'A frosted announcement card: the news, the detail, and where to act on it.',
    maxLines: 4,
    suggestedLines: typeLines(HEADLINE_FIELDS, CARD23_SAMPLES),
    logo: 'optional',
    animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: FROST.palette,
    defaultFontId: FROST.fontId,
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Headline',
    description:
      'The glass announcement card: a translucent blurred panel, a soft accent kicker, the ' +
      'news at heading size, the detail in paragraph type, and a closing line saying where to ' +
      'act on it. For venues, box offices, member updates and community broadcasts.',
    uicolor: '3',
  },
  (o) => buildHeadlineCard(FROST, o),
);
