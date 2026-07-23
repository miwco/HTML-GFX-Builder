// card19 "Frost Now Next" — the GLASS now/next card, written for music and stage streams: the
// track or set playing now with its artist line, then the interval or the next act under a
// hairline, all in a frosted panel that sits happily over a lit stage. Sibling of lt08
// "Frosted Card".

import { type TemplateVariant } from '../../model/wizard';
import { CARD19_SAMPLES, NOW_NEXT_FIELDS } from '../pack4/content';
import { FROST } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildNowNext } from './pack4/nowNext';
import { defineCardVariant } from './shared';

export const card19: TemplateVariant = defineCardVariant(
  {
    id: 'card19',
    category: 'info-card',
    name: 'Frost Now Next',
    styleTag: 'glass',
    description: 'A frosted now-playing card: the track and artist, then what is coming up.',
    maxLines: 5,
    suggestedLines: typeLines(NOW_NEXT_FIELDS, CARD19_SAMPLES),
    logo: 'optional',
    animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: FROST.palette,
    defaultFontId: FROST.fontId,
    defaultZone: 'bottom-center',
  },
  {
    name: 'Frost Now Next',
    description:
      'The glass now-playing card for concerts, DJ sets and theatre streams: a translucent ' +
      'blurred panel with a short accent stroke, the piece playing now over its artist line, ' +
      'and the interval or next act under a hairline.',
    uicolor: '3',
  },
  (o) => buildNowNext(FROST, o),
);
