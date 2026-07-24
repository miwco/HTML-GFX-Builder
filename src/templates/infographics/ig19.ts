// ig19 "Frost Recap" — the GLASS recap board: the interval card a theatre, a concert or a
// conference puts up between halves — what each department is doing before the show resumes.
// A frosted panel with a short accent stroke, one "owner | action" per line.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { IG19_SAMPLES, RECAP_FIELDS } from '../pack4/content';
import { FROST } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildRecapBoard } from './pack4/boards';
import { defineInfographicVariant } from './shared';

export const ig19: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig19',
    category: 'infographic',
    name: 'Frost Recap',
    styleTag: 'glass',
    description: 'A frosted recap board — one "owner | action" per line.',
    maxLines: 2,
    suggestedLines: typeLines(RECAP_FIELDS, IG19_SAMPLES),
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Recap',
    description:
      'The glass recap board: a translucent blurred panel with a short accent stroke, a soft ' +
      'heading, and items as an accent owner column against the action. For intervals, ' +
      'handovers and the "before we resume" moment.',
    uicolor: '3',
  },
  (o) => buildRecapBoard(FROST, o),
);
