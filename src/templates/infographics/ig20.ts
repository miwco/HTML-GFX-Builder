// ig20 "Volt Recap" — the SPORT recap board: half-time notes by unit — defence, midfield,
// attack. A flat slab under a chunky accent rail, heavy condensed caps, one "unit | note" per
// line. The board a studio walks through while the teams are in the dressing room.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { IG20_SAMPLES, RECAP_FIELDS } from '../pack4/content';
import { VOLT } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildRecapBoard } from './pack4/boards';
import { defineInfographicVariant } from './shared';

export const ig20: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig20',
    category: 'infographic',
    name: 'Volt Recap',
    styleTag: 'sport',
    description: 'A sport half-time board — one "unit | note" per line, in heavy caps.',
    maxLines: 2,
    suggestedLines: typeLines(RECAP_FIELDS, IG20_SAMPLES),
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-left',
  },
  {
    name: 'Volt Recap',
    description:
      'The sport recap board: a flat near-black slab under a chunky accent rail, a tracked-caps ' +
      'heading, and notes as an accent unit column against the instruction. For half-time ' +
      'analysis, coaching points and post-match takeaways.',
    uicolor: '5',
  },
  (o) => buildRecapBoard(VOLT, o),
);
