// The info-card catalog: designs per style family, each the visual sibling of a
// lower third (docs/DESIGN_LANGUAGE.md §8). Built on shared.ts + the shared presets.

import type { TemplateVariant } from '../../model/wizard';
import { card01 } from './card01';
import { card02 } from './card02';
import { card03 } from './card03';
import { card04 } from './card04';
import { card05 } from './card05';
import { card06 } from './card06';
import { card07 } from './card07';
import { card08 } from './card08';
import { card09 } from './card09';

export const INFO_CARDS: TemplateVariant[] = [
  card05, // House Title — noacg mono kicker + huge display title (sibling lt11)
  card01, // Hairline Card — minimal, sibling of lt01 Hairline
  card02, // Slab Card — sport, sibling of lt05 Angle Slab
  card03, // Frosted Panel — glass, sibling of lt08 Frosted Card
  card04, // bench-winner card variant
  card06, // House Topic — noacg topic card, amber bar + void panel (sibling lt11)
  card07, // Clean Title — minimal title card (sibling lt01 / lt02)
  card08, // Slab Title — sport title card, leaning slab (sibling lt05 / card02)
  card09, // Frost Title — glass title card, frosted panel (sibling lt08 / card03)
];

export function infoCardById(id: string): TemplateVariant | undefined {
  return INFO_CARDS.find((v) => v.id === id);
}
