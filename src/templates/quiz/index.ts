// The quiz catalog: game-show question graphics, family-consistent with the rest of the
// package (docs/DESIGN_LANGUAGE.md §8). Continue (next()) reveals the correct answer.

import type { TemplateVariant } from '../../model/wizard';
import { qz01 } from './qz01';
import { qz02 } from './qz02';
import { qz03 } from './qz03';
import { qz04 } from './qz04';

export const QUIZ: TemplateVariant[] = [
  qz01, // Arena Quiz — sport leaning card (sibling lt05/lt06)
  qz02, // House Quiz — noacg void card, amber accent (sibling lt11)
  qz03, // Frost Quiz — glass frosted card (sibling lt08)
  qz04, // Clean Quiz — minimal quiet card (sibling lt01)
];

export function quizById(id: string): TemplateVariant | undefined {
  return QUIZ.find((v) => v.id === id);
}
