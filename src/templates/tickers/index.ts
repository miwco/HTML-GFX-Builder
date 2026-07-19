// The ticker catalog: strips family-consistent with the rest of the package
// (docs/DESIGN_LANGUAGE.md §8) — the first endless-loop graphics.

import type { TemplateVariant } from '../../model/wizard';
import { tk01 } from './tk01';
import { tk02 } from './tk02';
import { tk03 } from './tk03';
import { tk04 } from './tk04';
import { tk05 } from './tk05';
import { tk06 } from './tk06';
import { tk07 } from './tk07';

export const TICKERS: TemplateVariant[] = [
  tk05, // House Wire — noacg news wire with a live clock cap (sibling lt11)
  tk07, // House Rotator — the same strip, one story at a time on the graphic's own timer
  tk06, // House Markets — noacg mono market items, sign-colored deltas (sibling tk05)
  tk01, // News Strip — minimal marquee (sibling lt01/lt02)
  tk02, // Volt Rail — sport marquee (sibling lt05/lt06)
  tk03, // Glass Flip — glass item flip (sibling lt08/lt09)
  tk04, // bench-winner ticker variant
];

export function tickerById(id: string): TemplateVariant | undefined {
  return TICKERS.find((v) => v.id === id);
}
