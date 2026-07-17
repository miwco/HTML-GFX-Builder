// The template catalog: one place that knows every category's variants. The wizard,
// Motion panel, and sweep script all resolve variants through here.

import type { TemplateCategory, TemplateVariant } from '../model/wizard';
import { LOWER_THIRDS } from './lowerThirds';
import { INFO_CARDS } from './infoCards';
import { END_CREDITS } from './endCredits';
import { TICKERS } from './tickers';
import { STARTING_SOON } from './startingSoon';
import { GAME_TIMERS } from './gameTimers';
import { SCOREBOARDS } from './scoreboards';
import { CORNER_BUGS } from './cornerBug';
import { INFOGRAPHICS } from './infographics';
import { QUIZ } from './quiz';
import { IMPORTED_DESIGNS } from './importedDesign/shared';

export const CATALOG: Partial<Record<TemplateCategory, TemplateVariant[]>> = {
  'lower-third': LOWER_THIRDS,
  'info-card': INFO_CARDS,
  'end-credits': END_CREDITS,
  'ticker': TICKERS,
  'starting-soon': STARTING_SOON,
  'game-timer': GAME_TIMERS,
  'scoreboard': SCOREBOARDS,
  'corner-bug': CORNER_BUGS,
  'infographic': INFOGRAPHICS,
  'quiz': QUIZ,
  // Not browsable in the category grid — the Import Graphic entry is its only way in.
  'imported-design': IMPORTED_DESIGNS,
};

export function variantsFor(category: TemplateCategory | null): TemplateVariant[] {
  return (category && CATALOG[category]) || [];
}

export function variantById(id: string): TemplateVariant | undefined {
  for (const list of Object.values(CATALOG)) {
    const hit = list?.find((v) => v.id === id);
    if (hit) return hit;
  }
  return undefined;
}
