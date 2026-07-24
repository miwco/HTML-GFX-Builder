// The esports scoreboard category, in browse order: the four series scorebugs, then the
// three map / round indicators.

import type { TemplateVariant } from '../../../model/wizard';
import { es01 } from './es01';
import { es02 } from './es02';
import { es03 } from './es03';
import { es04 } from './es04';
import { mr01 } from './mr01';
import { mr02 } from './mr02';
import { mr03 } from './mr03';

export const ESPORTS_SCORES: TemplateVariant[] = [es01, es02, es03, es04, mr01, mr02, mr03];
