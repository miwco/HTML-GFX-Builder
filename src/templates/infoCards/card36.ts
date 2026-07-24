// card36 "Translation Slab" — the SPORT long-text card: a post-match quote and its live
// translation, which is the one place a sport graphic has to carry running text in two
// languages. The slab and the accent rail are the family's; the passage itself stays in
// sentence case, because uppercase would destroy the accents the translation depends on.

import { type TemplateVariant } from '../../model/wizard';
import { CARD36_SAMPLES, STATEMENT_FIELDS } from '../pack4/content';
import { VOLT } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildStatementCard } from './pack4/statement';
import { defineCardVariant } from './shared';

export const card36: TemplateVariant = defineCardVariant(
  {
    id: 'card36',
    category: 'info-card',
    name: 'Translation Slab',
    styleTag: 'sport',
    description: 'A quote and its translation on a sport slab, with the speaker underneath.',
    maxLines: 4,
    suggestedLines: typeLines(STATEMENT_FIELDS, CARD36_SAMPLES),
    logo: 'optional',
    animationPresets: ['snap-stinger', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: VOLT.palette,
    defaultFontId: VOLT.fontId,
    defaultZone: 'mid-left',
  },
  {
    name: 'Translation Slab',
    description:
      'The sport translation card: a flat near-black slab under a chunky accent rail, a caps ' +
      'label, the quote in readable sentence case, the original language behind its own accent ' +
      'rule, and the speaker underneath. For post-match interviews aired in two languages.',
    uicolor: '5',
  },
  (o) => buildStatementCard(VOLT, o),
);
