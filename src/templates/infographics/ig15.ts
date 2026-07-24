// ig15 "Frost Facts" — the GLASS key-facts board: the "good to know" card a venue, a course or
// an event stream puts up — doors, running time, how to get home. A frosted panel with a short
// accent stroke, and one "term | explanation" per line.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { IG15_SAMPLES, KEY_FACTS_FIELDS } from '../pack4/content';
import { FROST } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildFactsBoard } from './pack4/boards';
import { defineInfographicVariant } from './shared';

export const ig15: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig15',
    category: 'infographic',
    name: 'Frost Facts',
    styleTag: 'glass',
    description: 'A frosted good-to-know board — one "term | explanation" per line.',
    maxLines: 2,
    suggestedLines: typeLines(KEY_FACTS_FIELDS, IG15_SAMPLES),
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Facts',
    description:
      'The glass explainer board: a translucent blurred panel with a short accent stroke, a ' +
      'soft heading, and facts as a small accent term over the fact itself. For venue ' +
      'information, course notes and event practicalities.',
    uicolor: '3',
  },
  (o) => buildFactsBoard(FROST, o),
);
