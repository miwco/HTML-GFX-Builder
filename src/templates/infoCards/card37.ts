// card37 "House Statement" — the HOUSE long-text card: an on-the-record statement, a pledge, a
// policy line, with its second language under its own accent rule. The void panel behind the
// amber bar, a mono label, and a measure tuned for reading rather than for a headline.

import { type TemplateVariant } from '../../model/wizard';
import { CARD37_SAMPLES, STATEMENT_FIELDS } from '../pack4/content';
import { HOUSE } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildStatementCard } from './pack4/statement';
import { defineCardVariant } from './shared';

export const card37: TemplateVariant = defineCardVariant(
  {
    id: 'card37',
    category: 'info-card',
    name: 'House Statement',
    styleTag: 'noacg',
    description: 'The house statement card: a long passage, a second language, an attribution.',
    maxLines: 4,
    suggestedLines: typeLines(STATEMENT_FIELDS, CARD37_SAMPLES),
    logo: 'optional',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: HOUSE.palette,
    defaultFontId: HOUSE.fontId,
    defaultZone: 'mid-left',
  },
  {
    name: 'House Statement',
    description:
      'The house long-text card, sibling of lt11 House Strap: an 8px amber bar with the house ' +
      'glow fused to a void blur panel, a mono label, the statement set as prose, a second ' +
      'language behind its own accent rule, and the attribution underneath.',
    uicolor: '4',
  },
  (o) => buildStatementCard(HOUSE, o),
);
