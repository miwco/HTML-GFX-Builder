// card27 "Frost Checklist" — the GLASS checklist. The same graphic as the numbered process,
// with drawn checkboxes instead of numerals: a pre-flight list, a rehearsal check, a "before we
// go live" card. The boxes are drawn from two rotated borders rather than typed as a glyph, so
// no font has to carry a tick. Sibling of lt08 "Frosted Card".

import { type TemplateVariant } from '../../model/wizard';
import { CARD27_SAMPLES, PROCESS_FIELDS } from '../pack4/content';
import { FROST } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildProcessCard } from './pack4/process';
import { defineCardVariant } from './shared';

export const card27: TemplateVariant = defineCardVariant(
  {
    id: 'card27',
    category: 'info-card',
    name: 'Frost Checklist',
    styleTag: 'glass',
    description: 'A frosted checklist: drawn tick boxes, one item revealed per Continue.',
    maxLines: 5,
    suggestedLines: typeLines(PROCESS_FIELDS, CARD27_SAMPLES),
    logo: 'optional',
    animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: FROST.palette,
    defaultFontId: FROST.fontId,
    defaultZone: 'mid-center',
    defaultSteps: true,
  },
  {
    name: 'Frost Checklist',
    description:
      'The glass checklist: a translucent blurred panel, a soft accent heading, and items with ' +
      'drawn tick boxes that arrive one SPX Continue at a time — so a producer can walk a ' +
      'rehearsal or a pre-flight check live on air, ticking off as they go.',
    uicolor: '3',
  },
  (o) => buildProcessCard(FROST, o),
);
