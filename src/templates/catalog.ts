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
import { VERSUS } from './versus';
import { QUIZ } from './quiz';
import { FRAMES } from './frames';
import { TRANSITIONS } from './transitions';
import { ESPORTS_SCORES } from './competition/esports';
import { MATCHUPS } from './competition/matchup';
import { RESULTS_BOARDS } from './competition/results';
import { REVEALS } from './competition/reveal';
import { IMPORTED_DESIGNS } from './importedDesign/shared';
import { mergeCatalog, typeVariants } from './types/registry';

/**
 * The hand-written variants — a category's own files, in their curated browse order.
 *
 * Exported because the PRE-MERGE list is the only place a promoted design's OWN authored
 * capabilities survive: `mergeCatalog` replaces the entry with the type-compiled one. Comparing
 * the two is what makes the capabilities gate checkable at all (docs/GRAPHIC_TYPES.md §5), and
 * `scripts/factory.mjs` reads it for exactly that.
 */
export const HAND_WRITTEN: Partial<Record<TemplateCategory, TemplateVariant[]>> = {
  'lower-third': LOWER_THIRDS,
  'info-card': INFO_CARDS,
  'end-credits': END_CREDITS,
  'ticker': TICKERS,
  'starting-soon': STARTING_SOON,
  'game-timer': GAME_TIMERS,
  'scoreboard': SCOREBOARDS,
  'corner-bug': CORNER_BUGS,
  'infographic': INFOGRAPHICS,
  'versus': VERSUS,
  'quiz': QUIZ,
  'frame': FRAMES,
  'transition': TRANSITIONS,
  // The competition pack (docs/COMPETITION_PACK.md).
  'esports-score': ESPORTS_SCORES,
  'matchup': MATCHUPS,
  'results-board': RESULTS_BOARDS,
  'reveal': REVEALS,
  // Not browsable in the category grid — the Import Graphic entry is its only way in.
  'imported-design': IMPORTED_DESIGNS,
};

/**
 * The catalog: the hand-written lists with every registered GRAPHIC TYPE's designs merged in.
 * A type that PROMOTES an existing variant replaces it by id and in place, so a promoted
 * design keeps its position in the grid and its identity everywhere else it is referenced.
 */
export const CATALOG: Partial<Record<TemplateCategory, TemplateVariant[]>> = mergeCatalog(
  HAND_WRITTEN,
  typeVariants(),
);

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
