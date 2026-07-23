// card28 "Volt Process" — the SPORT runsheet. Match-day routine, warm-up schedule, the order
// of play: a flat slab under an accent rail, with each step numbered in a solid accent chip.
// Created stepped, so a stadium screen or a pre-match studio can walk it one press at a time.
// Sibling of lt06 "Split Bar" and card12 "Segment Title".

import { type TemplateVariant } from '../../model/wizard';
import { CARD28_SAMPLES, PROCESS_FIELDS } from '../pack4/content';
import { VOLT } from '../pack4/skin';
import { typeLines } from '../types/graphicType';
import { buildProcessCard } from './pack4/process';
import { defineCardVariant } from './shared';

export const card28: TemplateVariant = defineCardVariant(
  {
    id: 'card28',
    category: 'info-card',
    name: 'Volt Process',
    styleTag: 'sport',
    description: 'A sport runsheet: accent-chip numbers, heavy caps steps, one per Continue.',
    maxLines: 5,
    suggestedLines: typeLines(PROCESS_FIELDS, CARD28_SAMPLES),
    logo: 'optional',
    animationPresets: ['snap-stinger', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: VOLT.palette,
    defaultFontId: VOLT.fontId,
    defaultZone: 'mid-left',
    defaultSteps: true,
  },
  {
    name: 'Volt Process',
    description:
      'The sport runsheet: a flat near-black slab under a chunky accent rail, a tracked-caps ' +
      'heading, and steps numbered in solid accent chips. Built for match-day routines, warm-up ' +
      'schedules and orders of play, walked one SPX Continue at a time.',
    uicolor: '5',
  },
  (o) => buildProcessCard(VOLT, o),
);
