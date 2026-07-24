// The transition catalog: the full-frame moments that hide a cut. One design per style family,
// all four sharing the same lifecycle — cover, hold, clear — declared once by the transition
// TYPE (src/templates/types/transitions.ts) as a timer arrow into the exit.

import type { TemplateVariant } from '../../model/wizard';
import { tr01 } from './tr01';
import { tr02 } from './tr02';
import { tr03 } from './tr03';
import { tr04 } from './tr04';

export const TRANSITIONS: TemplateVariant[] = [
  tr03, // House Replay — noacg replay bumper, void bands + amber seam (sibling lt11 / lt12)
  tr01, // Volt Stinger — sport slam, leaning slabs (sibling lt05 / vs01)
  tr02, // Clean Wipe — minimal single band behind an accent edge (sibling lt01 / card07)
  tr04, // Frost Sweep — glass columns rising over the frame (sibling lt08 / card03)
];

export function transitionById(id: string): TemplateVariant | undefined {
  return TRANSITIONS.find((v) => v.id === id);
}
