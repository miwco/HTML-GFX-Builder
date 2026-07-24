// card31 "Frost Advisory" — the GLASS venue advisory: doors, latecomer policy, cloakroom,
// evacuation routes. The same notice structure in a frosted panel, calm rather than alarming,
// which is what a theatre or a concert hall actually wants on its holding screen. Escalate is
// still there when it stops being calm.

import { type TemplateVariant } from '../../model/wizard';
import { CARD31_SAMPLES, NOTICE_FIELDS } from '../pack4/content';
import { FROST } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildNoticeCard } from './pack4/notice';
import { defineCardVariant } from './shared';

export const card31: TemplateVariant = defineCardVariant(
  {
    id: 'card31',
    category: 'info-card',
    name: 'Frost Advisory',
    styleTag: 'glass',
    description: 'A frosted venue advisory: the policy, the detail, and what the audience should do.',
    maxLines: 5,
    suggestedLines: typeLines(NOTICE_FIELDS, CARD31_SAMPLES),
    logo: 'optional',
    animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: FROST.palette,
    defaultFontId: FROST.fontId,
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Advisory',
    description:
      'The glass venue advisory: a translucent blurred panel, an accent-filled advisory chip, ' +
      'the policy at heading size, the detail as a paragraph, and the instruction marked with ' +
      'its own accent rule. Calm by default, escalatable on air.',
    uicolor: '3',
  },
  (o) => buildNoticeCard(FROST, o),
);
