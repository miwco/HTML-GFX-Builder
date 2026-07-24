// ig16 "Volt Facts" — the SPORT key-numbers board: form, top scorer, head to head. A flat slab
// under a chunky accent rail, heavy condensed caps throughout, one "term | number" per line.
// The pre-match graphic a studio talks over.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { IG16_SAMPLES, KEY_FACTS_FIELDS } from '../pack4/content';
import { VOLT } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildFactsBoard } from './pack4/boards';
import { defineInfographicVariant } from './shared';

export const ig16: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig16',
    category: 'infographic',
    name: 'Volt Facts',
    styleTag: 'sport',
    description: 'A sport key-numbers board — one "term | number" per line, in heavy caps.',
    maxLines: 2,
    suggestedLines: typeLines(KEY_FACTS_FIELDS, IG16_SAMPLES),
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-left',
  },
  {
    name: 'Volt Facts',
    description:
      'The sport key-numbers board: a flat near-black slab under a chunky accent rail, a ' +
      'tracked-caps heading, and rows of accent term over heavy condensed caps. For pre-match ' +
      'build-up, head-to-head records and any set of numbers a studio talks over.',
    uicolor: '5',
  },
  (o) => buildFactsBoard(VOLT, o),
);
