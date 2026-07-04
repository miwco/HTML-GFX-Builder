// The info-card catalog: one design per style family, each the visual sibling of a
// lower third (docs/DESIGN_LANGUAGE.md §8). Built on shared.ts + the shared presets.

import type { TemplateVariant } from '../../model/wizard';
import { card01 } from './card01';
import { card02 } from './card02';
import { card03 } from './card03';

export const INFO_CARDS: TemplateVariant[] = [
  card01, // Hairline Card — minimal, sibling of lt01 Hairline
  card02, // Slab Card — sport, sibling of lt05 Angle Slab
  card03, // Frosted Panel — glass, sibling of lt08 Frosted Card
];

export function infoCardById(id: string): TemplateVariant | undefined {
  return INFO_CARDS.find((v) => v.id === id);
}
