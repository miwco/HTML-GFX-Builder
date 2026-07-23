// The lower-third catalog, in two halves.
//
// The GENERALISTS (lt01…lt18) are hand-tuned designs across four style directions — straps
// that suit any show, filed by look. The SPECIALISTS (./specialist, ls01…ls32) are drawn for
// one production each and filed by `roleTag`: interview duos, host-and-guest pairings,
// commentary booths, athletes, esports, worship, academic, politics, analysis, music, live
// and location, creator identity.
//
// Both halves are the same kind of thing — a TemplateVariant whose create(options) generates
// a complete, teachable SPX template (see shared.ts + docs/DESIGN_LANGUAGE.md). The split is
// about how a user FINDS one, not about how it is built.

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
import { SPECIALIST_LOWER_THIRDS } from './specialist';

/** The GENERALIST straps — designs that suit any show, ordered by style family. They carry
 *  no `roleTag`: filing a universal name-and-title strap under one production would be a
 *  claim it doesn't make. */
const GENERAL_LOWER_THIRDS: TemplateVariant[] = [
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

/**
 * The browsable lower thirds: the generalists first, then the SPECIALIST pack
 * (./specialist) — designs drawn for one production, each carrying its `roleTag`.
 *
 * Order matters: someone who opens the category without a production in mind should meet the
 * universal straps first, and someone who has one reaches for the role chips rather than
 * scrolling. Appending rather than interleaving also keeps every existing design exactly
 * where it has always been in the grid.
 */
export const LOWER_THIRDS: TemplateVariant[] = [...GENERAL_LOWER_THIRDS, ...SPECIALIST_LOWER_THIRDS];

export function lowerThirdById(id: string): TemplateVariant | undefined {
  return LOWER_THIRDS.find((v) => v.id === id);
}
