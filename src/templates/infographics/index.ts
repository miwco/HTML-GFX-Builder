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
import { ig14 } from './ig14';
import { ig15 } from './ig15';
import { ig16 } from './ig16';
import { ig17 } from './ig17';
import { ig18 } from './ig18';
import { ig19 } from './ig19';
import { ig20 } from './ig20';
import { ig21 } from './ig21';
import { ig22 } from './ig22';
import { ig23 } from './ig23';
import { ig24 } from './ig24';
import { ig25 } from './ig25';

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
  // ── The title / topic / information pack's two list boards ──
  ig14, // Fact Sheet — minimal key facts (key-facts)
  ig15, // Frost Facts — glass key facts (key-facts)
  ig16, // Volt Facts — sport key numbers (key-facts)
  ig17, // House Facts — house key facts (key-facts)
  ig18, // Recap Board — minimal recap / actions (recap-card)
  ig19, // Frost Recap — glass recap (recap-card)
  ig20, // Volt Recap — sport half-time notes (recap-card)
  ig21, // House Actions — house recap (recap-card)
  ig22, // House Goal — noacg goal meter, total + progress bar (sibling lt11 / ig05)
  ig23, // Frost Goal — glass goal ring, share of the target (sibling lt08 / ig04)
  ig24, // House Milestones — noacg tier rail with reached nodes (sibling lt11 / ig22)
  ig25, // Volt Milestones — sport tier rail, leaning markers (sibling lt05 / ig03)
];

export function infographicById(id: string): TemplateVariant | undefined {
  return INFOGRAPHICS.find((v) => v.id === id);
}
