// The graphic-type registry (docs/GRAPHIC_TYPES.md).
//
// A type declares what a graphic IS; its designs are the looks it ships as. Registering one
// here is what puts its designs in the catalog — `catalog.ts` merges `typeVariants()` over the
// hand-written lists, replacing BY ID where a type promotes an existing variant, so a promoted
// design keeps its id everywhere it is already referenced (the AI's variant enum, saved
// preferences, the sweeps).

import type { TemplateCategory, TemplateVariant } from '../../model/wizard';
import { variantsFromType, type GraphicType } from './graphicType';
import { lowerThirdType } from './lowerThird';
import { socialBugType, sponsorBugType } from './bugs';
import { titleCardType, topicCardType } from './cards';
import { agendaType, pollType } from './dataBoards';
import { countdownType, holdingScreenType } from './clocks';
import { esportsScoreType, mapRoundType } from './esports';
import { headToHeadType, matchupType, playerCardType } from './matchups';
import { bracketType, rosterType, standingsType } from './competitionBoards';
import { awardRevealType, nomineeRevealType, verdictCardType, winnerCardType } from './reveals';
import { quizBoardType } from './quizBoard';
import { scoreboardType } from './scoreboard';
import { tickerType } from './ticker';

/** Every registered type, in the reference data's frequency order (the count is how many of
 *  the 60 reference formats ask for that graphic). The last three earn their place by what
 *  they prove rather than by frequency: a scoreboard for parallel groups, a ticker for
 *  timer-driven motion, a quiz board for the far end of the model. */
export const TYPES: GraphicType[] = [
  lowerThirdType,     // 52/60
  sponsorBugType,     // 37/60
  countdownType,      // 30/60
  topicCardType,      // 29/60
  titleCardType,      // 23/60
  agendaType,         // 22/60
  socialBugType,      // 17/60
  pollType,           // 13/60
  holdingScreenType,  //  9/60
  tickerType,         //  8/60
  scoreboardType,     //  5/60 — but the type that proves parallel groups
  quizBoardType,      // the flagship
  // The COMPETITION PACK (docs/COMPETITION_PACK.md) — esports, competition, result and
  // reveal graphics. They come after the reference-frequency list because they answer a
  // different question: not "what does every show need" but "what does a competition need".
  esportsScoreType,
  mapRoundType,
  matchupType,
  headToHeadType,
  playerCardType,
  rosterType,
  standingsType,
  bracketType,
  nomineeRevealType,
  verdictCardType,
  winnerCardType,
  awardRevealType,
];

export function typeById(id: string): GraphicType | undefined {
  return TYPES.find((t) => t.id === id);
}

/** The types that build on a category's assembler. */
export function typesFor(category: TemplateCategory): GraphicType[] {
  return TYPES.filter((t) => t.structure.category === category);
}

/** Every type's designs, compiled to variants and grouped by category. */
export function typeVariants(): Partial<Record<TemplateCategory, TemplateVariant[]>> {
  const out: Partial<Record<TemplateCategory, TemplateVariant[]>> = {};
  for (const type of TYPES) {
    for (const variant of variantsFromType(type)) {
      (out[variant.category] ??= []).push(variant);
    }
  }
  return out;
}

/**
 * Merge type-compiled variants into the hand-written catalog. A compiled variant REPLACES a
 * hand-written one with the same id, in place — promotion must not move a design's position in
 * the browse grid or mint a second id for the same graphic. Anything new is appended.
 */
export function mergeCatalog(
  handWritten: Partial<Record<TemplateCategory, TemplateVariant[]>>,
  compiled: Partial<Record<TemplateCategory, TemplateVariant[]>>,
): Partial<Record<TemplateCategory, TemplateVariant[]>> {
  const merged: Partial<Record<TemplateCategory, TemplateVariant[]>> = { ...handWritten };
  for (const [category, variants] of Object.entries(compiled) as [TemplateCategory, TemplateVariant[]][]) {
    const existing = [...(merged[category] ?? [])];
    for (const variant of variants) {
      const at = existing.findIndex((v) => v.id === variant.id);
      if (at >= 0) existing[at] = variant;
      else existing.push(variant);
    }
    merged[category] = existing;
  }
  return merged;
}
