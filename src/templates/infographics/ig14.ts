// ig14 "Fact Sheet" — the MINIMAL key-facts board. The explainer graphic: a tracked-caps
// heading, then one "term | explanation" per line, each separated by a hairline. Panel-free,
// with an accent rule down the left. Type one row per fact; rows-cascade rises them in one
// after another, however many the operator wrote.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { IG14_SAMPLES, KEY_FACTS_FIELDS } from '../pack4/content';
import { CLEAN } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildFactsBoard } from './pack4/boards';
import { defineInfographicVariant } from './shared';

export const ig14: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig14',
    category: 'infographic',
    name: 'Fact Sheet',
    styleTag: 'minimal',
    description: 'A panel-free key-facts board — one "term | explanation" per line.',
    maxLines: 2,
    suggestedLines: typeLines(KEY_FACTS_FIELDS, IG14_SAMPLES),
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Fact Sheet',
    description:
      'The minimal explainer board: an accent hairline down the left, a tracked-caps heading, ' +
      'and facts as a small accent term over the fact itself. A line with no pipe is a fact ' +
      'with no term, and still renders. The cascade is one step per row you type.',
    uicolor: '1',
  },
  (o) => buildFactsBoard(CLEAN, o),
);
