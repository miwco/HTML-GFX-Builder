// card18 "Now & Next" — the MINIMAL now/next card. A newsroom or a radio-style stream keeps
// one of these up between items: what is on air now, set large, and what follows it under a
// hairline. No panel, an accent rule down the left, and both labels are operator fields so the
// card works in any language. Sibling of lt01 "Hairline".

import { type TemplateVariant } from '../../model/wizard';
import { CARD18_SAMPLES, NOW_NEXT_FIELDS } from '../pack4/content';
import { CLEAN } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildNowNext } from './pack4/nowNext';
import { defineCardVariant } from './shared';

export const card18: TemplateVariant = defineCardVariant(
  {
    id: 'card18',
    category: 'info-card',
    name: 'Now & Next',
    styleTag: 'minimal',
    description: 'What is on air now, a hairline, and what follows it — panel-free.',
    maxLines: 5,
    suggestedLines: typeLines(NOW_NEXT_FIELDS, CARD18_SAMPLES),
    logo: 'optional',
    animationPresets: ['line-reveal', 'mask-wipe', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: CLEAN.palette,
    defaultFontId: CLEAN.fontId,
    defaultZone: 'bottom-left',
  },
  {
    name: 'Now & Next',
    description:
      'The minimal now/next card: an accent hairline down the left, the current item at ' +
      'display size with its detail under it, a divider, then what is coming up in smaller ' +
      'type. Both labels are fields, so "NOW PLAYING" can say whatever the show says.',
    uicolor: '1',
  },
  (o) => buildNowNext(CLEAN, o),
);
