// The lower-third catalog: 14 hand-tuned designs across four style directions
// (4 minimal · 3 sport · 3 glass · 4 noacg house). Each is a TemplateVariant whose
// create(options) generates a complete, teachable SPX template (see shared.ts +
// docs/DESIGN_LANGUAGE.md).

import type { TemplateVariant } from '../../model/wizard';
import { lt01 } from './lt01';
import { lt02 } from './lt02';
import { lt03 } from './lt03';
import { lt04 } from './lt04';
import { lt05 } from './lt05';
import { lt06 } from './lt06';
import { lt07 } from './lt07';
import { lt08 } from './lt08';
import { lt09 } from './lt09';
import { lt10 } from './lt10';
import { lt11 } from './lt11';
import { lt12 } from './lt12';
import { lt13 } from './lt13';
import { lt14 } from './lt14';
import { lt15 } from './lt15';
import { lt16 } from './lt16';
import { lt17 } from './lt17';
import { lt18 } from './lt18';

export const LOWER_THIRDS: TemplateVariant[] = [
  // NoaCG house (the product's own on-air look — brand-kit overlays as templates)
  lt11, // House Strap — amber bar + void blur panel, mono kicker title
  lt12, // House Breaking — accent label chip over a void headline panel
  lt13, // House Interview — three-line strap: name / org / mono location
  lt14, // House Handle — the compact social mark (the social-handle type's design)
  // Minimal / clean
  lt01, // Hairline — vertical hairline accent, pure typography
  lt02, // Underline — accent underline draws in between name and title
  lt03, // Side Tag — quiet panel with keyline + accent bar
  lt04, // Kicker — light panel, accent kicker chip above the name
  lt18, // Line Handle — compact minimal social mark (social-handle type, minimal)
  // Sport / esport
  lt05, // Angle Slab — skewed slab, condensed caps
  lt06, // Split Bar — stepped name/team bars, bold accent
  lt07, // Number Badge — accent badge (logo slot) + slab text
  lt17, // Volt Handle — compact sport social mark (social-handle type, sport)
  // Modern social / glass
  lt08, // Frosted Card — backdrop-blur glass card (logo slot)
  lt09, // Gradient Pill — compact pill, name + handle inline
  lt10, // Soft Stack — floating card, accent dot, three-line capable
  lt15, // Frost Strap — glass lower third with a real accent edge (lower-third type, glass)
  lt16, // Frost Handle — compact glass social mark (social-handle type, glass)
];

export function lowerThirdById(id: string): TemplateVariant | undefined {
  return LOWER_THIRDS.find((v) => v.id === id);
}
