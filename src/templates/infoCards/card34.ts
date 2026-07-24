// card34 "Statement Card" — the MINIMAL long-text card: an official statement, in one language
// and then in another. Panel-free, a narrow-enough measure to read, paragraph leading, and
// sentence case throughout — the second language is a real field with its own accent rule, not
// an afterthought bolted onto the attribution.

import { type TemplateVariant } from '../../model/wizard';
import { CARD34_SAMPLES, STATEMENT_FIELDS } from '../pack4/content';
import { CLEAN } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildStatementCard } from './pack4/statement';
import { defineCardVariant } from './shared';

export const card34: TemplateVariant = defineCardVariant(
  {
    id: 'card34',
    category: 'info-card',
    name: 'Statement Card',
    styleTag: 'minimal',
    description: 'A long statement with a second language under it, and its attribution.',
    maxLines: 4,
    suggestedLines: typeLines(STATEMENT_FIELDS, CARD34_SAMPLES),
    logo: 'optional',
    animationPresets: ['line-reveal', 'mask-wipe', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: CLEAN.palette,
    defaultFontId: CLEAN.fontId,
    defaultZone: 'mid-center',
  },
  {
    name: 'Statement Card',
    description:
      'The minimal long-text card: an accent hairline down the left, a tracked-caps label, the ' +
      'statement set as prose, the same statement in a second language behind its own accent ' +
      'rule, and the attribution. Sentence case throughout, so accents and diacritics survive.',
    uicolor: '2',
  },
  (o) => buildStatementCard(CLEAN, o),
);
