// card10 "Session Title" — the MINIMAL session opener from the title/topic/information pack.
// A conference or webinar names three things when a session starts: which track it belongs to,
// what it is called, and where and when it happens. No panel: a full-height accent hairline
// runs down the left of the text column (the lt01 motif turned vertical), and the type does
// the rest. Sibling of lt01 "Hairline" and card07 "Clean Title".

import { type TemplateVariant } from '../../model/wizard';
import { CARD10_SAMPLES, TITLE_CARD_FIELDS } from '../pack4/content';
import { CLEAN } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildTitleCard } from './pack4/titles';
import { defineCardVariant } from './shared';

export const card10: TemplateVariant = defineCardVariant(
  {
    id: 'card10',
    category: 'info-card',
    name: 'Session Title',
    styleTag: 'minimal',
    description: 'A panel-free session opener: track kicker, session title, then time and room.',
    maxLines: 5,
    suggestedLines: typeLines(TITLE_CARD_FIELDS, CARD10_SAMPLES),
    logo: 'optional',
    animationPresets: ['line-reveal', 'mask-wipe', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: CLEAN.palette,
    defaultFontId: CLEAN.fontId,
    defaultZone: 'mid-left',
  },
  {
    name: 'Session Title',
    description:
      'The minimal session opener for conferences, webinars and lecture streams: a tracked-caps ' +
      'track kicker, one large session title, and the practical line under it (time and room). ' +
      'No panel — an accent hairline down the left edge holds the column together, and a soft ' +
      'halo keeps the type legible over live video.',
    uicolor: '1',
  },
  (o) => buildTitleCard(CLEAN, o),
);
