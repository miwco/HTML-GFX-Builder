// "CREATE TIMELINE FROM LAYER" — the one composed transform behind the Inspector's button
// and the node editor's "+ from layer" menu (docs/STATE_MACHINE_SCHEMA.md's positional
// binding makes a LAYER TIMELINE a default-path step that animates exactly one layer):
// add a step before Out, name it after the layer, and move the layer's ACTIVATION there
// through the same press mutator the timeline gutter uses — so the layer's reveal keyframes
// travel with it and the SPX `steps` setting stays derived. One template patch, one
// undoable apply at the caller.

import type { SpxTemplate } from '../model/types';
import type { TemplatePart } from '../model/structure';
import { parseAnimData } from './animData';
import { addStep, renameStep } from './animEdit';
import { spxSteps } from './animMachine';
import { changePartPress } from './stepAssign';
import { writeAnimData } from '../templates/shared/animRuntime';
import { replaceDefinitionInHtml } from '../model/spxDefinition';

/** Which press (0-based; -1 = the entrance) currently reveals the selector. */
function currentPress(js: string, selector: string): number {
  const data = parseAnimData(js);
  if (!data) return -1;
  const at = data.steps.findIndex((s) => s.reveals?.includes(selector));
  return at <= 0 ? -1 : at - 1;
}

/**
 * Give `selector` its own default-path step named after it. Returns the patched template
 * (apply as ONE applyTemplate), or null when the template has no editable data block.
 */
export function createStepFromLayer(
  template: SpxTemplate,
  parts: TemplatePart[],
  selector: string,
): SpxTemplate | null {
  const data = parseAnimData(template.js);
  if (!data) return null;
  const part = parts.find((p) => p.selector === selector);
  if (!part) return null;

  let next = addStep(data);
  if (!next) return null;
  const stepIndex = next.steps.length - 2; // the fresh step sits just before Out
  next = renameStep(next, stepIndex, `${part.label} In`) ?? next;

  const js = writeAnimData(template.js, next);
  if (!js) return null;
  const settings = { ...template.settings, steps: String(spxSteps(next)) };
  const html = replaceDefinitionInHtml(template.html, settings, template.fields);
  const staged: SpxTemplate = { ...template, js, html, settings };

  // Move the layer's activation into the new step (press index = stepIndex - 1). The press
  // mutator carries tuned reveal keyframes and re-derives `steps` itself.
  const change = changePartPress(staged, parts, selector, currentPress(staged.js, selector), stepIndex - 1);
  return change ? { ...staged, ...change.patch } : staged;
}
