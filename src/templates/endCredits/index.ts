// The end-credits catalog: four formats, family-consistent with the rest of the package
// (docs/DESIGN_LANGUAGE.md §8). Every one ends with the logo placeholder + year block.

import type { TemplateVariant } from '../../model/wizard';
import { cr01 } from './cr01';
import { cr02 } from './cr02';
import { cr03 } from './cr03';
import { cr04 } from './cr04';

export const END_CREDITS: TemplateVariant[] = [
  cr01, // Classic Roll — stacked role-above-name (minimal, sibling lt01)
  cr02, // Column Roll — title left / name right (glass, sibling lt10)
  cr03, // Pager — one-pager section swaps (sport, sibling lt05)
  cr04, // Crawl — horizontal single-line credits (minimal, sibling lt02)
];

export function endCreditsById(id: string): TemplateVariant | undefined {
  return END_CREDITS.find((v) => v.id === id);
}
