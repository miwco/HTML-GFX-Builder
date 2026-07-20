// The starting-soon catalog: three pre-show holding screens with a countdown clock,
// family-consistent with the rest of the package (docs/DESIGN_LANGUAGE.md §8).

import type { TemplateVariant } from '../../model/wizard';
import { ss01 } from './ss01';
import { ss02 } from './ss02';
import { ss03 } from './ss03';
import { ss04 } from './ss04';

export const STARTING_SOON: TemplateVariant[] = [
  ss04, // noacg holding screen — House Hold (sibling lt11 / card05)
  ss01, // minimal holding screen
  ss02, // sport holding screen
  ss03, // glass holding screen
];

export function startingSoonById(id: string): TemplateVariant | undefined {
  return STARTING_SOON.find((v) => v.id === id);
}
