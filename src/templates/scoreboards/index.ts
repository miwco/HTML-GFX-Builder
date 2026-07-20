// The scoreboard catalog: two-team score straps, family-consistent with the rest of the
// package (docs/DESIGN_LANGUAGE.md §8) — each variant names its lower-third sibling.

import type { TemplateVariant } from '../../model/wizard';
import { sb01 } from './sb01';
import { sb02 } from './sb02';
import { sb03 } from './sb03';
import { sb04 } from './sb04';

export const SCOREBOARDS: TemplateVariant[] = [
  sb01, // Match Strip — sport leaning slab (sibling lt05/lt06)
  sb02, // Quiet Score — minimal corner stack (sibling lt01)
  sb03, // House Score — noacg void strip, amber accent edge (sibling lt11)
  sb04, // Frost Score — glass frosted strip, soft accent bar (sibling lt08)
];

export function scoreboardById(id: string): TemplateVariant | undefined {
  return SCOREBOARDS.find((v) => v.id === id);
}
