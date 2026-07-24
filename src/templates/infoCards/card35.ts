// card35 "Reading Card" — the GLASS long-text card: a scripture reading, a poem, a passage
// read aloud at a ceremony, with the same passage in the congregation's second language under
// it. A frosted panel keeps it legible over a lit sanctuary or stage without shouting.

import { type TemplateVariant } from '../../model/wizard';
import { CARD35_SAMPLES, STATEMENT_FIELDS } from '../pack4/content';
import { FROST } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildStatementCard } from './pack4/statement';
import { defineCardVariant } from './shared';

export const card35: TemplateVariant = defineCardVariant(
  {
    id: 'card35',
    category: 'info-card',
    name: 'Reading Card',
    styleTag: 'glass',
    description: 'A frosted reading card: the passage, a second language, then the reference.',
    maxLines: 4,
    suggestedLines: typeLines(STATEMENT_FIELDS, CARD35_SAMPLES),
    logo: 'optional',
    animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: FROST.palette,
    defaultFontId: FROST.fontId,
    defaultZone: 'mid-center',
  },
  {
    name: 'Reading Card',
    description:
      'The glass reading card for services, ceremonies and memorials: a translucent blurred ' +
      'panel, a soft label, the passage set as prose, the same passage in a second language ' +
      'behind its own accent rule, and the reference underneath.',
    uicolor: '3',
  },
  (o) => buildStatementCard(FROST, o),
);
