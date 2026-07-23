// The results & standings category, in browse order: the three rosters, the four standings /
// result tables, then the two brackets.

import type { TemplateVariant } from '../../../model/wizard';
import { rs01 } from './rs01';
import { rs02 } from './rs02';
import { rs03 } from './rs03';
import { st01 } from './st01';
import { st02 } from './st02';
import { st03 } from './st03';
import { st04 } from './st04';
import { br01 } from './br01';
import { br02 } from './br02';

export const RESULTS_BOARDS: TemplateVariant[] = [rs01, rs02, rs03, st01, st02, st03, st04, br01, br02];
