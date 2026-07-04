// The wizard's working state (the "draft"): every choice the user makes across the steps.
// null means "use the variant's tasteful default" — draftToOptions() maps the draft onto
// WizardOptions, and resolveOptions() (model/wizard.ts) fills the rest.

import { ASPECTS, type Resolution } from '../../model/types';
import type {
  AnimPresetId,
  AnimSpeed,
  ExtraFieldSpec,
  LineSpec,
  TemplateCategory,
  TemplateVariant,
  WizardOptions,
  Zone9,
} from '../../model/wizard';
import { paletteById } from '../../model/wizard';
import type { EasingId } from '../../model/easings';

export interface WizardDraft {
  category: TemplateCategory | null;
  variantId: string | null;
  aspectId: string;
  resolutionLabel: string;
  fps: number;
  lines: LineSpec[];
  extraFields: ExtraFieldSpec[];
  paletteId: string | null;
  fontId: string | null;
  sizeScale: number;
  zone: Zone9 | null;
  nudge: { x: number; y: number };
  animation: {
    presetId: AnimPresetId | null;
    speed: AnimSpeed;
    easing: EasingId;
    steps: boolean;
  };
}

/** A draft update: top-level fields replace; `animation` and `nudge` deep-merge. */
export type DraftPatch = Partial<Omit<WizardDraft, 'animation' | 'nudge'>> & {
  animation?: Partial<WizardDraft['animation']>;
  nudge?: Partial<WizardDraft['nudge']>;
};

/** Merge a patch into the draft (nested animation/nudge merge instead of replace). */
export function mergeDraft(draft: WizardDraft, patch: DraftPatch): WizardDraft {
  return {
    ...draft,
    ...patch,
    animation: patch.animation ? { ...draft.animation, ...patch.animation } : draft.animation,
    nudge: patch.nudge ? { ...draft.nudge, ...patch.nudge } : draft.nudge,
  };
}

export function initialDraft(): WizardDraft {
  return {
    category: null,
    variantId: null,
    aspectId: ASPECTS[0].id,
    resolutionLabel: ASPECTS[0].resolutions[0].label,
    fps: 25,
    lines: [],
    extraFields: [],
    paletteId: null,
    fontId: null,
    sizeScale: 1,
    zone: null,
    nudge: { x: 0, y: 0 },
    animation: { presetId: null, speed: 1, easing: 'auto', steps: false },
  };
}

export function draftResolution(draft: WizardDraft): Resolution {
  const aspect = ASPECTS.find((a) => a.id === draft.aspectId) ?? ASPECTS[0];
  return aspect.resolutions.find((r) => r.label === draft.resolutionLabel) ?? aspect.resolutions[0];
}

/** Map the draft onto WizardOptions (nulls fall back to the variant's defaults). */
export function draftToOptions(variant: TemplateVariant, draft: WizardDraft): WizardOptions {
  return {
    resolution: draftResolution(draft),
    fps: draft.fps,
    lines: draft.lines.length > 0 ? draft.lines : undefined,
    extraFields: draft.extraFields.length > 0 ? draft.extraFields : undefined,
    palette: draft.paletteId ? paletteById(draft.paletteId) : undefined,
    fontId: draft.fontId ?? undefined,
    sizeScale: draft.sizeScale,
    zone: draft.zone ?? undefined,
    nudge: draft.nudge,
    animation: {
      presetId: draft.animation.presetId ?? variant.animationPresets[0],
      speed: draft.animation.speed,
      easing: draft.animation.easing,
      steps: draft.animation.steps,
    },
  };
}
