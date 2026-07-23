// The reveal category, in browse order: the three nominee cards, the three verdicts, the three
// winner cards, then the three award / launch reveals.

import type { TemplateVariant } from '../../../model/wizard';
import { nm01 } from './nm01';
import { nm02 } from './nm02';
import { nm03 } from './nm03';
import { vd01 } from './vd01';
import { vd02 } from './vd02';
import { vd03 } from './vd03';
import { wn01 } from './wn01';
import { wn02 } from './wn02';
import { wn03 } from './wn03';
import { aw01 } from './aw01';
import { aw02 } from './aw02';
import { aw03 } from './aw03';

export const REVEALS: TemplateVariant[] = [
  nm01, nm02, nm03,
  vd01, vd02, vd03,
  wn01, wn02, wn03,
  aw01, aw02, aw03,
];
