// The camera-frame catalog: the chrome that goes AROUND a picture rather than over it —
// a single webcam surround, a two-up interview, a split screen, and a screen-share layout.
// One design per style family, each stating its window rectangles in its own header so an
// operator knows exactly where to put the sources (src/templates/frames/shared.ts).

import type { TemplateVariant } from '../../model/wizard';
import { fr01 } from './fr01';
import { fr02 } from './fr02';
import { fr03 } from './fr03';
import { fr04 } from './fr04';

export const FRAMES: TemplateVariant[] = [
  fr01, // House Cam — noacg single webcam surround, amber brackets (sibling lt11)
  fr02, // Frost Interview — glass two-up remote interview (sibling lt08)
  fr03, // Volt Split — sport split screen, leaning divider (sibling lt05 / vs01)
  fr04, // Clean Share — minimal screen-share + presenter inset (sibling lt01 / card42)
];

export function frameById(id: string): TemplateVariant | undefined {
  return FRAMES.find((v) => v.id === id);
}
