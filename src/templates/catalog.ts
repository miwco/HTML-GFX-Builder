// The template catalog: one place that knows every category's variants. The wizard,
// Motion panel, and sweep script all resolve variants through here.

import type { TemplateCategory, TemplateVariant } from '../model/wizard';
import { LOWER_THIRDS } from './lowerThirds';
import { INFO_CARDS } from './infoCards';
import { END_CREDITS } from './endCredits';

export const CATALOG: Partial<Record<TemplateCategory, TemplateVariant[]>> = {
  'lower-third': LOWER_THIRDS,
  'info-card': INFO_CARDS,
  'end-credits': END_CREDITS,
};

export function variantsFor(category: TemplateCategory | null): TemplateVariant[] {
  return (category && CATALOG[category]) || [];
}

export function variantById(id: string): TemplateVariant | undefined {
  for (const list of Object.values(CATALOG)) {
    const hit = list?.find((v) => v.id === id);
    if (hit) return hit;
  }
  return undefined;
}
