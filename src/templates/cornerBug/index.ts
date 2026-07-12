// The corner-bug catalog: the persistent on-air mark, the visual sibling of its
// lower-third counterpart (docs/DESIGN_LANGUAGE.md §8). Built on shared.ts + the
// shared presets.

import type { TemplateVariant } from '../../model/wizard';
import { bug01 } from './bug01';
import { bug02 } from './bug02';

export const CORNER_BUGS: TemplateVariant[] = [
  bug02, // House Clock — noacg logo/three-bar mark + live ticking clock (sibling lt11)
  bug01, // Glass Mark — glass, sibling of lt08 Frosted Card / lt09 Gradient Pill
];

export function cornerBugById(id: string): TemplateVariant | undefined {
  return CORNER_BUGS.find((v) => v.id === id);
}
