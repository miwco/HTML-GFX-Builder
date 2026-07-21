// The infographic catalog: two data callouts, family-consistent with the rest of the
// package (docs/DESIGN_LANGUAGE.md §8) — a big stat count-up and a growing bar chart.

import type { TemplateVariant } from '../../model/wizard';
import { ig01 } from './ig01';
import { ig02 } from './ig02';
import { ig03 } from './ig03';
import { ig04 } from './ig04';
import { ig05 } from './ig05';
import { ig06 } from './ig06';
import { ig07 } from './ig07';
import { ig08 } from './ig08';
import { ig09 } from './ig09';
import { ig10 } from './ig10';
import { ig11 } from './ig11';
import { ig12 } from './ig12';
import { ig13 } from './ig13';

export const INFOGRAPHICS: TemplateVariant[] = [
  ig01, // Big stat count-up
  ig02, // Bar chart grow
  ig03, // bench-winner infographic variant
  ig04, // bench-winner infographic variant
  ig05, // bench-winner infographic variant
  ig06, // bench-winner infographic variant
  ig07, // bench-winner election results bars
  ig08, // House Schedule — noacg agenda board (sibling lt11 / ig06)
  ig09, // Frost Schedule — glass agenda board (sibling lt08 / ig02)
  ig10, // Volt Schedule — sport agenda board (sibling lt06 / card02)
  ig11, // House Poll — noacg bar chart (sibling lt11 / ig08)
  ig12, // Volt Poll — sport bar chart (sibling lt06 / card02)
  ig13, // Clean Poll — minimal bar chart (sibling lt01 / ig06)
];

export function infographicById(id: string): TemplateVariant | undefined {
  return INFOGRAPHICS.find((v) => v.id === id);
}
