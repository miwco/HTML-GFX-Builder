// The ONE "appears on press" transition — shared by every surface that changes when a part
// appears (the timeline gutter's menu, the canvas selection chip). Pure: takes the template
// and the parsed state, returns the patch (or null when the change is a no-op / blocked).
// Keeping the decision tree here means the canvas and the strip can never drift apart on
// what an assign/unassign/move actually writes.

import type { SpxTemplate } from '../model/types';
import type { TemplatePart } from '../model/structure';
import { applyStepChain, currentStepChain, withStepsSetting } from './animPatch';
import { patchStepRegroup, type TimelineModel } from './timelineModel';
import { parseAnimData, spliceAnimData } from './animData';
import { setLayerActivation } from './animEdit';
import { replaceDefinitionInHtml } from '../model/spxDefinition';

export interface PressChange {
  /** The template fields to apply (spread over the current template). */
  patch: Pick<SpxTemplate, 'js' | 'html' | 'settings'>;
  /** The » press whose segment should be revealed after the apply (null: none — e.g. the
   *  part went back to the entrance). */
  destStep: number | null;
  /** How many » presses the chain has AFTER the change (0 = steps turned off). */
  stepsAfter: number;
}

/**
 * Change WHEN a part appears. Press indices are 0-based groups; -1 means "appears with
 * ▶ Play" (the entrance); `model.steps.length` as a target means "a new press".
 *
 * Three distinct paths, on purpose (they write different code):
 * - entrance → press: the entrance choreography changes, so the IN phase re-emits
 *   (applyStepChain) with the part's reveal CHANNEL from the registry;
 * - press → entrance: removed from every group (emptied presses disappear; the last part
 *   leaving turns steps off entirely) — also an IN re-emit;
 * - press → press: a literal array patch (patchStepRegroup) that keeps the user's tuning.
 */
export function changePartPress(
  template: SpxTemplate,
  parts: TemplatePart[],
  model: TimelineModel | null,
  selector: string,
  fromPress: number,
  toPress: number,
): PressChange | null {
  if (toPress === fromPress) return null;

  // Timeline v2: a data-block template's press chain is the steps' reveals — one data
  // move (setLayerActivation) plus the SPX steps re-sync, same PressChange shape out.
  const dataModel = parseAnimData(template.js);
  if (dataModel) {
    const channel = parts.find((p) => p.selector === selector)?.channel ?? 'rise';
    const next = setLayerActivation(dataModel, selector, toPress, channel);
    if (!next) return null;
    const js = spliceAnimData(template.js, next);
    if (!js) return null;
    const settings = { ...template.settings, steps: String(next.steps.length - 1) };
    const html = replaceDefinitionInHtml(template.html, settings, template.fields);
    const pressesAfter = next.steps.length - 2;
    return {
      patch: { js, html, settings },
      destStep: toPress === -1 ? null : Math.min(toPress, pressesAfter - 1),
      stepsAfter: pressesAfter,
    };
  }
  if (!model) return null;

  if (fromPress === -1) {
    // Assign an on-with-the-graphic part to a press (a new one when toPress points past
    // the chain).
    const chain = currentStepChain(template);
    if (!chain || toPress < 0) return null;
    if (toPress >= chain.groups.length) {
      chain.groups.push([selector]);
      chain.durations.push('0.45');
      chain.eases.push('easeIn');
    } else {
      chain.groups[toPress].push(selector);
    }
    chain.reveals[selector] = parts.find((p) => p.selector === selector)?.channel ?? 'rise';
    return {
      patch: applyStepChain(template, chain),
      destStep: Math.min(toPress, chain.groups.length - 1),
      stepsAfter: chain.groups.length,
    };
  }

  if (toPress === -1) {
    // Back to "appears with ▶ Play" — removed from every press.
    const chain = currentStepChain(template);
    if (!chain) return null;
    chain.groups = chain.groups.map((g) => g.filter((t) => t !== selector));
    for (let i = chain.groups.length - 1; i >= 0; i--) {
      if (chain.groups[i].length === 0) {
        chain.groups.splice(i, 1);
        chain.durations.splice(i, 1);
        chain.eases.splice(i, 1);
      }
    }
    delete chain.reveals[selector];
    return {
      patch: applyStepChain(template, chain.groups.length ? chain : null),
      destStep: null,
      stepsAfter: chain.groups.length,
    };
  }

  // Between presses (or onto a new one): the literal array patch keeps the chain's tuning.
  const emptied = model.steps[fromPress]?.targets.length === 1;
  // Moving the LAST press's only part to "a new press" would just re-create the same press.
  if (toPress === model.steps.length && emptied && fromPress === model.steps.length - 1) return null;
  const js = patchStepRegroup(template.js, selector, fromPress, toPress);
  if (!js) return null;
  // Follow the moved part to its destination segment (indices shift when a press empties).
  let dest = Math.min(toPress, model.steps.length);
  if (emptied && fromPress < dest) dest -= 1;
  return {
    patch: withStepsSetting(template, js),
    destStep: dest,
    stepsAfter: model.steps.length + (toPress === model.steps.length ? 1 : 0) - (emptied ? 1 : 0),
  };
}
