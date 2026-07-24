// card22 "News Headline" — the MINIMAL headline card: a kicker, the headline, the paragraph
// under it, and the byline. The measure is narrower than the category default because this
// card carries prose, and prose set to a headline's width runs to ninety characters a line.
// Sibling of lt01 "Hairline" and card14 "Chapter Card".

import { type TemplateVariant } from '../../model/wizard';
import { CARD22_SAMPLES, HEADLINE_FIELDS } from '../pack4/content';
import { CLEAN } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildHeadlineCard } from './pack4/headline';
import { defineCardVariant } from './shared';

export const card22: TemplateVariant = defineCardVariant(
  {
    id: 'card22',
    category: 'info-card',
    name: 'News Headline',
    styleTag: 'minimal',
    description: 'A panel-free headline card: kicker, headline, the story under it, then the byline.',
    maxLines: 4,
    suggestedLines: typeLines(HEADLINE_FIELDS, CARD22_SAMPLES),
    logo: 'optional',
    animationPresets: ['line-reveal', 'mask-wipe', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: CLEAN.palette,
    defaultFontId: CLEAN.fontId,
    defaultZone: 'mid-left',
  },
  {
    name: 'News Headline',
    description:
      'The minimal headline card for news and current affairs: an accent hairline down the ' +
      'left, a BREAKING-style kicker, the headline at display size, the story in paragraph ' +
      'type, and a byline in tracked caps. Turn steps on for a newsroom reveal, one press a line.',
    uicolor: '1',
  },
  (o) => buildHeadlineCard(CLEAN, o),
);
