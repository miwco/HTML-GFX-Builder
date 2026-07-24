// card11 "Keynote Title" — the GLASS keynote opener. A frosted panel with a short rounded
// accent stroke above the kicker, the talk's title set large and light, and the speaker line
// under it. Built for the moment the room goes dark and the keynote begins, and calm enough to
// sit over a slowly moving stage shot. Sibling of lt08 "Frosted Card" and card09 "Frost Title".

import { type TemplateVariant } from '../../model/wizard';
import { CARD11_SAMPLES, TITLE_CARD_FIELDS } from '../pack4/content';
import { FROST } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildTitleCard } from './pack4/titles';
import { defineCardVariant } from './shared';

export const card11: TemplateVariant = defineCardVariant(
  {
    id: 'card11',
    category: 'info-card',
    name: 'Keynote Title',
    styleTag: 'glass',
    description: 'A frosted keynote opener: a soft kicker, the talk title, then who is giving it.',
    maxLines: 5,
    suggestedLines: typeLines(TITLE_CARD_FIELDS, CARD11_SAMPLES),
    logo: 'optional',
    animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: FROST.palette,
    defaultFontId: FROST.fontId,
    defaultZone: 'mid-center',
  },
  {
    name: 'Keynote Title',
    description:
      'The glass keynote opener: a translucent blurred panel, a short rounded accent stroke, a ' +
      'soft tracked kicker, the talk title at display size, and the speaker and their role ' +
      'underneath. Centred by default, because a keynote card owns the frame.',
    uicolor: '3',
  },
  (o) => buildTitleCard(FROST, o),
);
