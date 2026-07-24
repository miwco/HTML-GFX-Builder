// ig18 "Recap Board" — the MINIMAL recap / action-items board. The graphic a webinar, a town
// hall or a workshop ends on: who owns what, one row per item. Panel-free with an accent rule
// down the left; the owner sits in a fixed column so the actions line up down the board.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { IG18_SAMPLES, RECAP_FIELDS } from '../pack4/content';
import { CLEAN } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildRecapBoard } from './pack4/boards';
import { defineInfographicVariant } from './shared';

export const ig18: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig18',
    category: 'infographic',
    name: 'Recap Board',
    styleTag: 'minimal',
    description: 'A panel-free recap board — one "owner | action" per line.',
    maxLines: 2,
    suggestedLines: typeLines(RECAP_FIELDS, IG18_SAMPLES),
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Recap Board',
    description:
      'The minimal recap board: an accent hairline down the left, a tracked-caps heading, and ' +
      'action items as an accent owner column against the action. An item with no owner still ' +
      'renders — an unassigned action is exactly what a recap needs to show.',
    uicolor: '1',
  },
  (o) => buildRecapBoard(CLEAN, o),
);
