// ig21 "House Actions" — the HOUSE recap board: what happens next, and who is doing it. The
// card a production stream, a community call or a class ends on. The void panel behind its
// amber bar, a mono heading, one "owner | action" per line.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { IG21_SAMPLES, RECAP_FIELDS } from '../pack4/content';
import { HOUSE } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildRecapBoard } from './pack4/boards';
import { defineInfographicVariant } from './shared';

export const ig21: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig21',
    category: 'infographic',
    name: 'House Actions',
    styleTag: 'noacg',
    description: 'The house action board — one "owner | action" per line in the void panel.',
    maxLines: 2,
    suggestedLines: typeLines(RECAP_FIELDS, IG21_SAMPLES),
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-right',
  },
  {
    name: 'House Actions',
    description:
      'The house action board, sibling of lt11 House Strap: an 8px amber bar with the house ' +
      'glow fused to a void blur panel, a mono heading, and items as an amber owner column ' +
      'against the action. For the end of a production call, a class or a community stream.',
    uicolor: '4',
  },
  (o) => buildRecapBoard(HOUSE, o),
);
