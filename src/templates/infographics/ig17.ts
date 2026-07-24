// ig17 "House Facts" — the HOUSE key-facts board: the "in short" card a product stream, a
// tutorial or a pitch puts up to answer the three questions everyone asks. The void panel
// behind its amber bar, a mono heading, one "term | explanation" per line.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { IG17_SAMPLES, KEY_FACTS_FIELDS } from '../pack4/content';
import { HOUSE } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildFactsBoard } from './pack4/boards';
import { defineInfographicVariant } from './shared';

export const ig17: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig17',
    category: 'infographic',
    name: 'House Facts',
    styleTag: 'noacg',
    description: 'The house explainer board — one "term | explanation" per line in the void panel.',
    maxLines: 2,
    suggestedLines: typeLines(KEY_FACTS_FIELDS, IG17_SAMPLES),
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-right',
  },
  {
    name: 'House Facts',
    description:
      'The house explainer board, sibling of lt11 House Strap: an 8px amber bar with the house ' +
      'glow fused to a void blur panel, a mono heading, and facts as an amber term over the ' +
      'fact itself. For product streams, tutorials and pitches.',
    uicolor: '4',
  },
  (o) => buildFactsBoard(HOUSE, o),
);
