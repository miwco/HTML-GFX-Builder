// Lower-third scaffolding — a thin binding of the category-generic assembler
// (templates/shared/standard.ts) to the lower-third contract: class prefix "lower-third",
// strap-width auto-fit cap, and the L3 root comment.
//
// Standard structure contract (all variants; the shared presets rely on it):
//   <div class="lower-third">            root — positioned by zone; opacity:0 until play()
//     [<div class="lower-third-accent">] optional accent shape
//     <div class="lower-third-box">      the panel; presets animate this
//       <div class="lower-third-mask"><span id="f0" class="lower-third-name">…</span></div>
//       <div class="lower-third-mask"><span id="f1" class="lower-third-title">…</span></div>
//     </div>
//   </div>

import type { SpxTemplate } from '../../model/types';
import type { ResolvedOptions } from '../../model/wizard';
import {
  assembleStandard,
  lineClassFor,
  lineMasksFor,
  makeDefineVariant,
  type CategorySpec,
  type StandardDesign,
  type StandardMeta,
} from '../shared/standard';

// Re-exported so existing imports (Style panel, sweep) keep working.
export { zoneDecls, type ZoneDecl } from '../shared/base';

export type L3Design = StandardDesign;
export type L3Meta = StandardMeta;

const L3_CATEGORY: CategorySpec = {
  type: 'lower-third',
  prefix: 'lower-third',
  rootComment: 'Lower third. Hidden until play(); positioned by the .lower-third rule in the CSS.',
  // Timeline v2: lower thirds are the first category on the data-block region — new
  // lower thirds get the keyframe timeline natively. The classic strip (and its literal
  // patchers) still serves every not-yet-migrated category; previously saved lower
  // thirds stay legacy until their owner presses "use keyframes".
  dataRegion: true,
};

/** Class name for the Nth line (line 0 = name, 1 = title, 2 = kicker/extra). */
export function lineClass(index: number): string {
  return lineClassFor('lower-third', index);
}

/** The mask-wrapped line elements for the resolved options (SPX writes into id="fN"). */
export function lineMasks(o: ResolvedOptions, indent = '      '): string {
  return lineMasksFor('lower-third', o, indent);
}

/** Build the complete SpxTemplate from a variant's design + resolved options. */
export function assembleLowerThird(meta: L3Meta, design: L3Design, o: ResolvedOptions): SpxTemplate {
  return assembleStandard(L3_CATEGORY, meta, design, o);
}

/**
 * The authoring API for variant modules: metadata + a design builder in, a complete
 * TemplateVariant out (create() resolves defaults → builds the design → assembles).
 */
export const defineVariant = makeDefineVariant(L3_CATEGORY);
