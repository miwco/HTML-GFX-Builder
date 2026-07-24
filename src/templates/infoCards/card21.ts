// card21 "House Now Next" — the HOUSE now/next card: the void panel behind its amber bar,
// the session running now with its room line, then what follows. Written for workshops,
// conference tracks and creator streams that run a schedule. Sibling of lt11 "House Strap".

import { type TemplateVariant } from '../../model/wizard';
import { CARD21_SAMPLES, NOW_NEXT_FIELDS } from '../pack4/content';
import { HOUSE } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildNowNext } from './pack4/nowNext';
import { defineCardVariant } from './shared';

export const card21: TemplateVariant = defineCardVariant(
  {
    id: 'card21',
    category: 'info-card',
    name: 'House Now Next',
    styleTag: 'noacg',
    description: 'The house now/next card: amber bar and void panel, the session now and the one after.',
    maxLines: 5,
    suggestedLines: typeLines(NOW_NEXT_FIELDS, CARD21_SAMPLES),
    logo: 'optional',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: HOUSE.palette,
    defaultFontId: HOUSE.fontId,
    defaultZone: 'bottom-right',
  },
  {
    name: 'House Now Next',
    description:
      'The house now/next card, sibling of lt11 House Strap: an 8px amber bar with the house ' +
      'glow fused to a void blur panel, a mono label over the session running now, and the ' +
      'next one under a hairline. For workshop tracks and scheduled creator streams.',
    uicolor: '4',
  },
  (o) => buildNowNext(HOUSE, o),
);
