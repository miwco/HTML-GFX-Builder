// The game-timer catalog: two game-show countdown clocks, family-consistent with the
// rest of the package (docs/DESIGN_LANGUAGE.md §8) — built on the shared clock runtime.

import type { TemplateVariant } from '../../model/wizard';
import { gt01 } from './gt01';
import { gt02 } from './gt02';

export const GAME_TIMERS: TemplateVariant[] = [
  gt01, // game-show countdown #1 (style family + lower-third sibling noted in gt01.ts)
  gt02, // game-show countdown #2 (style family + lower-third sibling noted in gt02.ts)
];

export function gameTimerVariantById(id: string): TemplateVariant | undefined {
  return GAME_TIMERS.find((v) => v.id === id);
}
