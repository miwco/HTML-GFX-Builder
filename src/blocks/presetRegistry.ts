// THE PRESET LIBRARY — every category's motion presets, in one lookup, plus the one way to
// emit a preset's region for a given template.
//
// This is what is left of the old animPatch.ts after Phase 8 (docs/TIMELINE_V2_PLAN.md). That
// module was the marked region's literal PATCHER: it spliced phases, swapped presets, and set
// the knob variables in place. Nothing writes legacy regions any more — every category creates
// as a NOACG_ANIM data block, and motion is edited as DATA (blocks/animEdit.ts) — so the
// patchers are gone and only the library survives.
//
// The preset EMITTERS themselves are still load-bearing, and are still the ONE source of the
// catalog's choreography: blocks/presetApply.ts derives a preset's keyframes by emitting its
// region against a scratch copy of the template and converting it through the parity-proven
// importer. Emit here, convert there — no preset's taste is written down twice.

import { ANIM_PRESETS, type AnimPreset } from '../templates/lowerThirds/animPresets';
import { CREDITS_PRESETS } from '../templates/endCredits/creditsPresets';
import { TICKER_PRESETS } from '../templates/tickers/tickerPresets';
import { SS_PRESETS } from '../templates/startingSoon/ssPresets';
import { GT_PRESETS } from '../templates/gameTimers/gtPresets';
import { IG_PRESETS } from '../templates/infographics/igPresets';
import { QUIZ_PRESETS } from '../templates/quiz/quizPresets';
import { DESIGN_PRESETS } from '../templates/importedDesign/designPresets';
import type { AnimPresetId } from '../model/wizard';
import type { SpxTemplate } from '../model/types';
import { countLines, detectPrefix } from '../model/structure';

/** The presets that apply to a template, by its category. */
export function presetsForType(type: SpxTemplate['type']): AnimPreset[] {
  if (type === 'end-credits') return CREDITS_PRESETS;
  if (type === 'ticker') return TICKER_PRESETS;
  if (type === 'starting-soon') return SS_PRESETS;
  if (type === 'countdown') return GT_PRESETS;
  if (type === 'infographic') return IG_PRESETS;
  if (type === 'quiz') return QUIZ_PRESETS;
  // An imported design is one picture: only the whole-unit presets suit it. The line presets
  // would stagger #fN out of masks the artwork was drawn around (templates/importedDesign).
  if (type === 'imported-design') return DESIGN_PRESETS;
  return ANIM_PRESETS;
}

/** Every preset in the product, one list. The wizard's Animation step reads it too (a variant
 *  lists which ones suit it) — kept HERE so a new preset family is registered in exactly one
 *  place; a second copy silently renders an empty picker for whatever it forgot. */
export const ALL_PRESETS = [
  ...ANIM_PRESETS, ...CREDITS_PRESETS, ...TICKER_PRESETS,
  ...SS_PRESETS, ...GT_PRESETS, ...IG_PRESETS, ...QUIZ_PRESETS, ...DESIGN_PRESETS,
];

/** Look up a preset across every category's library. */
export function anyPresetById(id: AnimPresetId): AnimPreset {
  const p = ALL_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown animation preset: ${id}`);
  return p;
}

/** Which half of a graphic's motion an action targets: the entrance, the exit, or both. */
export type AnimPhase = 'in' | 'out' | 'both';

/**
 * Emit a preset's marked region FOR this template — the structure facts (prefix, line count,
 * accent, bars) read off its HTML, so the emitted choreography targets the elements that are
 * actually there. Returns null for a template outside the standard structure contract.
 *
 * Two callers, one shape: presetApply derives keyframes from this (emit → import → lift the
 * tracks), and the legacy timeline's "start over" writes it, converted, over an unconvertible
 * hand-written region. Steps are always OFF: a press's choreography belongs to the target's own
 * reveal steps, not to the donor's.
 */
export function emitPresetRegion(
  template: SpxTemplate,
  presetId: AnimPresetId,
  opts?: { speed?: number; easeIn?: string; easeOut?: string },
): string | null {
  const prefix = detectPrefix(template.html);
  if (!prefix) return null;
  const preset = anyPresetById(presetId);
  return preset.emit({
    prefix,
    lineCount: Math.max(1, countLines(template.html)),
    hasAccent: template.html.includes(`${prefix}-accent`),
    hasBars: template.html.includes(`${prefix}-bar-fill`),
    steps: false,
    stepOutsideParts: [],
    speed: opts?.speed ?? 1,
    easeIn: opts?.easeIn ?? preset.autoEase.easeIn,
    easeOut: opts?.easeOut ?? preset.autoEase.easeOut,
  });
}
