// card26 "Clean Steps" — the MINIMAL numbered process card. "How to take part", "How to
// submit", "What happens next": a heading and up to four numbered steps, revealed one SPX
// Continue at a time. Created STEPPED (defaultSteps) — a process shown all at once is a list.
// Sibling of lt01 "Hairline".

import { type TemplateVariant } from '../../model/wizard';
import { CARD26_SAMPLES, PROCESS_FIELDS } from '../pack4/content';
import { CLEAN } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildProcessCard } from './pack4/process';
import { defineCardVariant } from './shared';

export const card26: TemplateVariant = defineCardVariant(
  {
    id: 'card26',
    category: 'info-card',
    name: 'Clean Steps',
    styleTag: 'minimal',
    description: 'A numbered process: a heading and up to four steps, one revealed per Continue.',
    maxLines: 5,
    suggestedLines: typeLines(PROCESS_FIELDS, CARD26_SAMPLES),
    logo: 'optional',
    animationPresets: ['line-reveal', 'mask-wipe', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: CLEAN.palette,
    defaultFontId: CLEAN.fontId,
    defaultZone: 'mid-left',
    // A process card is stepped by construction: the operator walking through it IS the
    // graphic. Turn it off in the Animation panel and it degrades to a plain numbered list.
    defaultSteps: true,
  },
  {
    name: 'Clean Steps',
    description:
      'The minimal process card: an accent hairline down the left, a tracked-caps heading, and ' +
      'numbered steps that arrive one SPX Continue at a time. The numbers are CSS counters on ' +
      'each step, so clearing one renumbers the rest instead of leaving a gap.',
    uicolor: '1',
  },
  (o) => buildProcessCard(CLEAN, o),
);
