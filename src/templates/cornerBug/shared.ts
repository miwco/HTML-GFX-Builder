// Corner-bug scaffolding — the category-generic assembler (templates/shared/standard.ts)
// bound to the corner-bug contract: class prefix "bug", a narrow auto-fit cap (a bug is a
// compact mark, ~20% of frame width, not a strap), and the bug root comment. Bugs default
// to the top corners and read as the SIBLINGS of their lower-third counterparts
// (docs/DESIGN_LANGUAGE.md §8).
//
// Structure contract (the shared presets rely on it):
//   <div class="corner-bug">            root — positioned by zone; opacity:0 until play()
//     <div class="corner-bug-box">      the tile; presets animate this
//       [logo image or placeholder mark]
//       <div class="corner-bug-mask"><span id="f0" class="corner-bug-name">…</span></div>
//     </div>
//   </div>

import type { SpxTemplate, Resolution } from '../../model/types';
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

export type BugDesign = StandardDesign;
export type BugMeta = StandardMeta;

const BUG_CATEGORY: CategorySpec = {
  type: 'bug',
  prefix: 'corner-bug',
  rootComment: 'Corner bug — a persistent on-air logo mark.',
  // A bug stays a small mark: the caption never grows past ~20% of the frame width.
  maxTextWidth: (res: Resolution) => Math.round(res.width * 0.2),
  // Timeline v2: corner bugs create as animation data blocks — the step timeline,
  // keyframes, and Inspector editing are their native surface. Previously saved bugs
  // stay legacy until their owner presses "use keyframes".
  dataRegion: true,
};

export function bugLineClass(index: number): string {
  return lineClassFor('corner-bug', index);
}

export function bugLineMasks(o: ResolvedOptions, indent = '      '): string {
  return lineMasksFor('corner-bug', o, indent);
}

export function assembleCornerBug(meta: BugMeta, design: BugDesign, o: ResolvedOptions): SpxTemplate {
  return assembleStandard(BUG_CATEGORY, meta, design, o);
}

/** The authoring API for corner-bug variant modules. */
export const defineBugVariant = makeDefineVariant(BUG_CATEGORY);
