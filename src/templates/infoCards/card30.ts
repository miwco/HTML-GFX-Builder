// card30 "Public Notice" — the MINIMAL public-information card. A weather warning, a transport
// disruption, a civic announcement: the authority chip, what has happened, the detail, and —
// with its own accent rule and its own weight — what to do about it.
//
// Carries the pack's state machine: Escalate raises an accent wash over the whole notice and
// Stand down clears it, without re-taking the graphic (types/briefings.ts noticeCardType).

import { type TemplateVariant } from '../../model/wizard';
import { CARD30_SAMPLES, NOTICE_FIELDS } from '../pack4/content';
import { CLEAN } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildNoticeCard } from './pack4/notice';
import { defineCardVariant } from './shared';

export const card30: TemplateVariant = defineCardVariant(
  {
    id: 'card30',
    category: 'info-card',
    name: 'Public Notice',
    styleTag: 'minimal',
    description: 'A public-information notice: authority chip, headline, detail, and what to do.',
    maxLines: 5,
    suggestedLines: typeLines(NOTICE_FIELDS, CARD30_SAMPLES),
    logo: 'optional',
    animationPresets: ['line-reveal', 'mask-wipe', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: CLEAN.palette,
    defaultFontId: CLEAN.fontId,
    defaultZone: 'mid-center',
  },
  {
    name: 'Public Notice',
    description:
      'The minimal public-information notice: an accent-filled authority chip, the headline, ' +
      'the details in paragraph type, and the instruction set apart with its own accent rule ' +
      'and full-strength ink. For weather warnings, disruptions and civic announcements.',
    uicolor: '2',
  },
  (o) => buildNoticeCard(CLEAN, o),
);
