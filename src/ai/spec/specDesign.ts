// The GenerationSpec's grip on the harness: pin the user's decisions onto the model-emitted
// DesignSpec (the model cannot drift from what the user already decided), narrow the design
// stage's tool schema to the pinned category (a small model never even sees the wrong
// options), and apply the deterministic post-passes (the user's exit preset as a real
// keyframe swap). Pure functions — the provider calls these, the UI never does.

import { parseAnimData, spliceAnimData } from '../../blocks/animData';
import { applyPresetData, presetDonor } from '../../blocks/presetApply';
import { swappablePresetsForType } from '../../blocks/presetRegistry';
import type { SpxTemplate } from '../../model/types';
import type { AnimPresetId } from '../../model/wizard';
import { variantsFor, variantById } from '../../templates/catalog';
import type { ClaudeTool } from '../anthropic';
import type { DesignSpec } from '../designSpec';
import { aiCategoryById } from './categories';
import {
  resolveSpecMotion,
  specExtraFields,
  specLines,
  type GenerationSpec,
} from '../../model/generationSpec';

/** DesignSpec.lines carries at most 3 visible lines (the tool schema's maxItems). */
const MAX_SPEC_LINES = 3;

/**
 * Overwrite a model-emitted DesignSpec with the user's own decisions. The model's creative
 * choices survive wherever the user left the decision open; wherever they didn't, the spec
 * is corrected deterministically — this is what makes results predictable on small models.
 */
export function applySpecLocks(design: DesignSpec, user: GenerationSpec | null | undefined): DesignSpec {
  if (!user) return design;
  const out: DesignSpec = { ...design };

  const cat = user.category === 'auto' ? undefined : aiCategoryById(user.category);
  if (cat) {
    out.category = cat.templateCategory;
    // A chassis from the wrong category cannot stand: drop it and let resolveVariant pick.
    if (out.variantId && variantById(out.variantId)?.category !== cat.templateCategory) delete out.variantId;
  }

  if (user.fields.length) {
    out.lines = specLines(user, MAX_SPEC_LINES);
    out.extraFields = specExtraFields(user, MAX_SPEC_LINES);
  }

  const motion = resolveSpecMotion(user.animation);
  if (user.animation?.inPresetId || motion.speed || motion.easing || user.animation?.steps !== undefined) {
    out.animation = {
      ...design.animation,
      ...(user.animation?.inPresetId ? { presetId: user.animation.inPresetId } : {}),
      ...(motion.easing && motion.easing !== 'auto' ? { easing: motion.easing } : {}),
      ...(motion.speed ? { speed: motion.speed } : {}),
      ...(user.animation?.steps !== undefined ? { steps: user.animation.steps } : {}),
    };
  }

  if (user.fonts?.primary?.fontId) out.fontId = user.fonts.primary.fontId;
  if (user.brandColors) out.palette = user.brandColors;

  return out;
}

/**
 * Narrow the design-stage tool schema to the user's pinned category: the category enum
 * collapses to one value and the chassis enum to that category's variants. The model can
 * then only route WITHIN the decision — the strongest form of "do not override the user".
 */
export function narrowedSpecTool(base: ClaudeTool, user: GenerationSpec | null | undefined): ClaudeTool {
  const cat = user && user.category !== 'auto' ? aiCategoryById(user.category) : undefined;
  if (!cat) return base;
  const tool = JSON.parse(JSON.stringify(base)) as ClaudeTool;
  const root = tool.input_schema as { properties?: Record<string, unknown> };
  // The alternatives tool nests the spec schema under alternatives.items.
  const alts = root.properties?.alternatives as { items?: { properties?: Record<string, unknown> } } | undefined;
  const schemas = alts?.items?.properties ? [alts.items.properties] : root.properties ? [root.properties] : [];
  const pool = variantsFor(cat.templateCategory).map((v) => v.id);
  for (const props of schemas) {
    const category = props.category as { enum?: string[] } | undefined;
    if (category) category.enum = [cat.templateCategory];
    const variantId = props.variantId as { enum?: string[] } | undefined;
    if (variantId && pool.length) variantId.enum = pool;
  }
  return tool;
}

/**
 * The user's explicit EXIT preset, applied as a real keyframe swap through the same
 * derive-from-emitter path the Inspector's preset picker uses (blocks/presetApply.ts) —
 * deterministic, clean-swap, undo-friendly. A template outside the data-block contract, or
 * a structural preset, leaves the template untouched (the prompt already carried the intent).
 */
export function applySpecOutPreset(template: SpxTemplate, user: GenerationSpec | null | undefined): SpxTemplate {
  const presetId = user?.animation?.outPresetId;
  if (!presetId || presetId === user?.animation?.inPresetId) return template;
  if (!swappablePresetsForType(template.type).some((p) => p.id === (presetId as AnimPresetId))) return template;
  const data = parseAnimData(template.js);
  if (!data) return template;
  const donor = presetDonor(template, data, presetId);
  if (!donor) return template;
  const next = applyPresetData(data, donor, 'out', 'all');
  if (!next) return template;
  const js = spliceAnimData(template.js, next);
  return js ? { ...template, js } : template;
}
