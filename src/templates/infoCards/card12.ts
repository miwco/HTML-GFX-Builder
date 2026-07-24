// card12 "Segment Title" — the SPORT segment opener. A flat solid slab with a chunky accent
// rail across its top edge, a numbered rundown kicker, and one huge condensed title in caps.
// Deliberately NOT card08's leaning slab: a segment title carries a longer subtitle (what the
// segment is, where it comes from) and a lean fights running text, so this one stays square
// and lets the rail do the shouting. Sibling of lt06 "Split Bar" and card02 "Slab Card".

import { type TemplateVariant } from '../../model/wizard';
import { CARD12_SAMPLES, TITLE_CARD_FIELDS } from '../pack4/content';
import { VOLT } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildTitleCard } from './pack4/titles';
import { defineCardVariant } from './shared';

export const card12: TemplateVariant = defineCardVariant(
  {
    id: 'card12',
    category: 'info-card',
    name: 'Segment Title',
    styleTag: 'sport',
    description: 'A square sport slab with an accent top rail: numbered kicker, huge caps title.',
    maxLines: 5,
    suggestedLines: typeLines(TITLE_CARD_FIELDS, CARD12_SAMPLES),
    logo: 'optional',
    animationPresets: ['snap-stinger', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: VOLT.palette,
    defaultFontId: VOLT.fontId,
    defaultZone: 'mid-left',
  },
  {
    name: 'Segment Title',
    description:
      'The sport segment opener: a flat near-black slab under a chunky accent rail, a numbered ' +
      'rundown kicker, one huge heavy condensed title and a tracked caps subtitle. Square on ' +
      'purpose — the leaning slab (card08) is the match opener; this one carries longer lines.',
    uicolor: '5',
  },
  (o) => buildTitleCard(VOLT, o),
);
