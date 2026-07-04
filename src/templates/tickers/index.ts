// The ticker catalog: three strips, family-consistent with the rest of the package
// (docs/DESIGN_LANGUAGE.md §8) — the first endless-loop graphics.

import type { TemplateVariant } from '../../model/wizard';
import { tk01 } from './tk01';
import { tk02 } from './tk02';
import { tk03 } from './tk03';

export const TICKERS: TemplateVariant[] = [
  tk01, // News Strip — minimal marquee (sibling lt01/lt02)
  tk02, // Volt Rail — sport marquee (sibling lt05/lt06)
  tk03, // Glass Flip — glass item flip (sibling lt08/lt09)
];

export function tickerById(id: string): TemplateVariant | undefined {
  return TICKERS.find((v) => v.id === id);
}
