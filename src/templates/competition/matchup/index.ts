// The match-up & competitor category, in browse order: the four match-up cards, the three
// head-to-head comparisons, then the three player cards.

import type { TemplateVariant } from '../../../model/wizard';
import { mu01 } from './mu01';
import { mu02 } from './mu02';
import { mu03 } from './mu03';
import { mu04 } from './mu04';
import { h201 } from './h201';
import { h202 } from './h202';
import { h203 } from './h203';
import { pc01 } from './pc01';
import { pc02 } from './pc02';
import { pc03 } from './pc03';

export const MATCHUPS: TemplateVariant[] = [mu01, mu02, mu03, mu04, h201, h202, h203, pc01, pc02, pc03];
