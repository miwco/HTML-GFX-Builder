// card32 "Alert Slab" — the SPORT safety notice: the stadium announcement, the closed exit,
// the delayed restart. A flat slab under an accent rail, sized to be read from the back of a
// stand, with the instruction carrying its own rule. The escalated state turns the whole notice
// into an accent-washed alert without the operator re-taking it.

import { type TemplateVariant } from '../../model/wizard';
import { CARD32_SAMPLES, NOTICE_FIELDS } from '../pack4/content';
import { VOLT } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildNoticeCard } from './pack4/notice';
import { defineCardVariant } from './shared';

export const card32: TemplateVariant = defineCardVariant(
  {
    id: 'card32',
    category: 'info-card',
    name: 'Alert Slab',
    styleTag: 'sport',
    description: 'A stadium announcement: caps headline, the detail, and the instruction in its own rule.',
    maxLines: 5,
    suggestedLines: typeLines(NOTICE_FIELDS, CARD32_SAMPLES),
    logo: 'optional',
    animationPresets: ['snap-stinger', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: VOLT.palette,
    defaultFontId: VOLT.fontId,
    defaultZone: 'bottom-center',
  },
  {
    name: 'Alert Slab',
    description:
      'The sport safety notice: a flat near-black slab under a chunky accent rail, an accent ' +
      'announcement chip, a heavy condensed caps headline, and the instruction set apart with ' +
      'its own rule. For stadium announcements, closures and crowd direction.',
    uicolor: '6',
  },
  (o) => buildNoticeCard(VOLT, o),
);
