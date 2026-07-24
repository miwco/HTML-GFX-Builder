// card24 "Volt Headline" — the SPORT headline card: the full-time report, the transfer, the
// result that needs a paragraph of context. A flat slab under an accent rail, a heavy condensed
// caps headline, and the report itself in sentence case — a paragraph in caps is unreadable,
// whatever the family says. Sibling of lt06 "Split Bar" and card16 "Topic Slab".

import { type TemplateVariant } from '../../model/wizard';
import { CARD24_SAMPLES, HEADLINE_FIELDS } from '../pack4/content';
import { VOLT } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildHeadlineCard } from './pack4/headline';
import { defineCardVariant } from './shared';

export const card24: TemplateVariant = defineCardVariant(
  {
    id: 'card24',
    category: 'info-card',
    name: 'Volt Headline',
    styleTag: 'sport',
    description: 'A sport report card: a caps headline over the match report and its source.',
    maxLines: 4,
    suggestedLines: typeLines(HEADLINE_FIELDS, CARD24_SAMPLES),
    logo: 'optional',
    animationPresets: ['snap-stinger', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: VOLT.palette,
    defaultFontId: VOLT.fontId,
    defaultZone: 'mid-left',
  },
  {
    name: 'Volt Headline',
    description:
      'The sport report card: a flat near-black slab under a chunky accent rail, a FULL TIME ' +
      'style kicker, a heavy condensed caps headline, and the report itself in readable ' +
      'sentence case. For results, transfers and any story that needs more than a scoreline.',
    uicolor: '5',
  },
  (o) => buildHeadlineCard(VOLT, o),
);
