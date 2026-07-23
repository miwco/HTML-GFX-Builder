// card25 "House Headline" — the HOUSE headline card: the release note, the product update, the
// thing a creator or a company stream wants to say in one headline and one paragraph. The void
// panel behind its amber bar, a mono kicker, and a link line to read more. Sibling of lt11
// "House Strap" and card06 "House Topic".

import { type TemplateVariant } from '../../model/wizard';
import { CARD25_SAMPLES, HEADLINE_FIELDS } from '../pack4/content';
import { HOUSE } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildHeadlineCard } from './pack4/headline';
import { defineCardVariant } from './shared';

export const card25: TemplateVariant = defineCardVariant(
  {
    id: 'card25',
    category: 'info-card',
    name: 'House Headline',
    styleTag: 'noacg',
    description: 'The house headline card: a mono kicker, the news, the paragraph, then where to read more.',
    maxLines: 4,
    suggestedLines: typeLines(HEADLINE_FIELDS, CARD25_SAMPLES),
    logo: 'optional',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: HOUSE.palette,
    defaultFontId: HOUSE.fontId,
    defaultZone: 'mid-right',
  },
  {
    name: 'House Headline',
    description:
      'The house headline card, sibling of lt11 House Strap: an 8px amber bar with the house ' +
      'glow fused to a void blur panel, a mono release kicker, the headline, the paragraph ' +
      'under it, and a closing link line. For launches, release notes and product streams.',
    uicolor: '4',
  },
  (o) => buildHeadlineCard(HOUSE, o),
);
