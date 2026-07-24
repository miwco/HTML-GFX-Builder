// card13 "Service Title" — the HOUSE ceremony opener: the void panel with its glowing amber
// bar, a mono date kicker, the service name, and a line of welcome. Written for the graphics a
// church, a graduation, a wedding or a memorial stream opens with, where the tone has to be
// warm and quiet rather than loud. Sibling of lt11 "House Strap" and card05 "House Title".

import { type TemplateVariant } from '../../model/wizard';
import { CARD13_SAMPLES, TITLE_CARD_FIELDS } from '../pack4/content';
import { HOUSE } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildTitleCard } from './pack4/titles';
import { defineCardVariant } from './shared';

export const card13: TemplateVariant = defineCardVariant(
  {
    id: 'card13',
    category: 'info-card',
    name: 'Service Title',
    styleTag: 'noacg',
    description: 'The house ceremony opener: amber bar and void panel, a date kicker over the service name.',
    maxLines: 5,
    suggestedLines: typeLines(TITLE_CARD_FIELDS, CARD13_SAMPLES),
    logo: 'optional',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: HOUSE.palette,
    defaultFontId: HOUSE.fontId,
    defaultZone: 'mid-center',
  },
  {
    name: 'Service Title',
    description:
      'The house ceremony opener, sibling of lt11 House Strap: an 8px amber bar with the house ' +
      'glow fused to a void blur panel, a mono date kicker, the service name at display size, ' +
      'and a quiet line of welcome. Warm rather than loud — built for services and ceremonies.',
    uicolor: '4',
  },
  (o) => buildTitleCard(HOUSE, o),
);
