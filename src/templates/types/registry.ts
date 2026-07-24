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
import {
  headlineCardType,
  noticeCardType,
  nowNextType,
  processStepsType,
  statementCardType,
} from './briefings';
import { titleCardType, topicCardType } from './cards';
import { keyFactsType, recapType } from './lists';
import { listingCardType, offerCardType, productCardType, qrCardType } from './commerce';
import { callToActionType, goalMeterType, milestoneTrackType } from './goals';
import { agendaType, pollType } from './dataBoards';
import { livePollType } from './livePoll';
import {
  chatHighlightType,
  communityRequestType,
  qaCardType,
  questionQueueType,
  viewerQuestionType,
} from './audience';
import { countdownType, holdingScreenType } from './clocks';
import { esportsScoreType, mapRoundType } from './esports';
import { headToHeadType, matchupType, playerCardType } from './matchups';
import { bracketType, rosterType, standingsType } from './competitionBoards';
import { awardRevealType, nomineeRevealType, verdictCardType, winnerCardType } from './reveals';
import { quizBoardType } from './quizBoard';
import { threeAnswerBoardType, twoAnswerBoardType } from './answerBoard';
import { scoreboardType } from './scoreboard';
import { tickerType } from './ticker';
import { IDENTITY_BUG_TYPES } from './identityBugs';
import { transitionType } from './transitions';

/** Every registered type, in the reference data's frequency order (the count is how many of
 *  the 60 reference formats ask for that graphic). The last three of the original twelve earn
 *  their place by what they prove rather than by frequency: a scoreboard for parallel groups,
 *  a ticker for timer-driven motion, a quiz board for the far end of the model. The IDENTITY
 *  family (identityBugs.ts) follows: the small persistent marks — idents, live status, logo
 *  marks, sponsor strips and rotations, event and award marks, location chips. */
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
  // ── The title / topic / information pack ──
  // These have no frequency count: the reference sheet asked "which graphics does this
  // format need", and it named the OPENER and the TOPIC card, which the two types above
  // already cover. Everything below is a shape those two were being made to stand in for —
  // a now/next card is not a title card with different words, and a process shown all at once
  // is not a process. They earn their place by being a different graphic, not by frequency.
  nowNextType,        // now playing / coming up
  headlineCardType,   // headline + body
  processStepsType,   // steps, processes, checklists — the pack's stepped type
  noticeCardType,     // public information + safety — the pack's state machine
  statementCardType,  // long text, and a second language
  keyFactsType,       // key facts / explainers — a list board, like the agenda
  recapType,          // recap / action items — a list board, like the agenda
  // The identity family: station ident, live status, logo mark, sponsor strip, sponsor
  // rotation, event ident, award mark, location chip — four looks each.
  ...IDENTITY_BUG_TYPES,
  // Not in the reference data's frequency list — it earns its place the way the last three
  // above do, by what it proves: a graphic whose whole content is its lifecycle. A stinger
  // covers the frame, holds for the cut, and clears ITSELF on a timer.
  transitionType,
  // The gap-list types (docs/PACK_TAXONOMY.md, "what the sheet asks for that no type covers").
  // Each is one field contract several looks share, which is the other half of what a type is
  // for — none of them needs a machine, and none of them declares one.
  callToActionType,   // the ask: follow · donate · register · buy, as one graphic
  productCardType,    // live commerce: the thing, its price, what it was
  offerCardType,      // the discount announced on its own
  listingCardType,    // an auction lot / property / resource and its live value
  goalMeterType,      // the gap list's most-asked-for: two numbers, everything else derived
  milestoneTrackType, // the tier rail — a different question from the goal meter
  qrCardType,         // a scannable code the operator supplies, beside the address in words
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
  threeAnswerBoardType, // the same arc at three rows…
  twoAnswerBoardType,   // …and at two: the pick is data, so the machine never changed
  livePollType,       // the vote WHILE it happens — the type that closes itself on a timer
  // The AUDIENCE family (types/audience.ts): what the people watching sent in. Two of the five
  // carry no machine at all, which is the "persist a machine only when the derived one is
  // wrong" rule showing its work.
  viewerQuestionType,
  qaCardType,
  chatHighlightType,
  questionQueueType,
  communityRequestType,
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
