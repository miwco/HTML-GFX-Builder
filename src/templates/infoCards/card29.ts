// card29 "House Runbook" — the HOUSE process card: the show runbook, the workflow, the "what
// happens next" a creator or a production stream walks through on air. The void panel behind
// its amber bar, with mono step numbers in the house label face. Sibling of lt11 "House Strap".

import { type TemplateVariant } from '../../model/wizard';
import { CARD29_SAMPLES, PROCESS_FIELDS } from '../pack4/content';
import { HOUSE } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildProcessCard } from './pack4/process';
import { defineCardVariant } from './shared';

export const card29: TemplateVariant = defineCardVariant(
  {
    id: 'card29',
    category: 'info-card',
    name: 'House Runbook',
    styleTag: 'noacg',
    description: 'The house process card: mono step numbers in the void panel, one per Continue.',
    maxLines: 5,
    suggestedLines: typeLines(PROCESS_FIELDS, CARD29_SAMPLES),
    logo: 'optional',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: HOUSE.palette,
    defaultFontId: HOUSE.fontId,
    defaultZone: 'mid-right',
    defaultSteps: true,
  },
  {
    name: 'House Runbook',
    description:
      'The house process card, sibling of lt11 House Strap: an 8px amber bar with the house ' +
      'glow fused to a void blur panel, a mono heading, and steps numbered in the house mono ' +
      'label face. For show runbooks, workflows and teaching a process live.',
    uicolor: '4',
  },
  (o) => buildProcessCard(HOUSE, o),
);
