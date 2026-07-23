// card33 "House Notice" — the HOUSE service notice: the stream is down, the signal is back in
// a moment, the recording will be posted later. The void panel behind its amber bar, the
// authority chip, and a "keep this page open" instruction — the graphic a stream leaves up
// while it fixes something. Escalate is there for when the outage stops being brief.

import { type TemplateVariant } from '../../model/wizard';
import { CARD33_SAMPLES, NOTICE_FIELDS } from '../pack4/content';
import { HOUSE } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildNoticeCard } from './pack4/notice';
import { defineCardVariant } from './shared';

export const card33: TemplateVariant = defineCardVariant(
  {
    id: 'card33',
    category: 'info-card',
    name: 'House Notice',
    styleTag: 'noacg',
    description: 'The house service notice: what has happened, and what the viewer should do.',
    maxLines: 5,
    suggestedLines: typeLines(NOTICE_FIELDS, CARD33_SAMPLES),
    logo: 'optional',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: HOUSE.palette,
    defaultFontId: HOUSE.fontId,
    defaultZone: 'mid-center',
  },
  {
    name: 'House Notice',
    description:
      'The house service notice, sibling of lt11 House Strap: an 8px amber bar with the house ' +
      'glow fused to a void blur panel, an accent notice chip, the headline, the details, and ' +
      'the instruction under its own rule. For outages, delays and status updates.',
    uicolor: '4',
  },
  (o) => buildNoticeCard(HOUSE, o),
);
