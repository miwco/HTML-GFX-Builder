// The wizard's working state (the "draft"): every choice the user makes across the steps.
// null means "use the variant's tasteful default" — draftToOptions() maps the draft onto
// WizardOptions, and resolveOptions() (model/wizard.ts) fills the rest.

import { ASPECTS, type AssetFile, type Resolution, type SpxTemplate } from '../../model/types';
import { anyPresetById, type AnimPhase } from '../../blocks/presetRegistry';
import { parseAnimData, spliceAnimData } from '../../blocks/animData';
import { applyPresetData, presetDonor } from '../../blocks/presetApply';
import { resolveEasing } from '../../model/easings';
import type {
  AnimPresetId,
  AnimSpeed,
  DesignArt,
  ExtraFieldSpec,
  LineSpec,
  Palette,
  TemplateCategory,
  TemplateVariant,
  WizardOptions,
  Zone9,
} from '../../model/wizard';
import { paletteById } from '../../model/wizard';
import type { EasingId } from '../../model/easings';
import type { CustomFont } from '../../model/fonts';

export interface WizardDraft {
  category: TemplateCategory | null;
  variantId: string | null;
  aspectId: string;
  resolutionLabel: string;
  fps: number;
  lines: LineSpec[];
  /**
   * Extra definition-only fields. The wizard UI no longer offers these (the generated
   * design can't adapt to them yet — fields are added post-create via the Data tab + AI
   * editing), but the data model stays so WizardOptions.extraFields and future custom
   * fields keep working. Always [] from the wizard.
   */
  extraFields: ExtraFieldSpec[];
  paletteId: string | null;
  /** User-defined colors (takes precedence over paletteId when set). */
  customPalette: Palette | null;
  /** 'custom' selects the imported font; a bundled id or null otherwise. */
  fontId: string | null;
  /** The user's imported font, kept even while a bundled font is selected. */
  customFont: CustomFont | null;
  sizeScale: number;
  zone: Zone9 | null;
  nudge: { x: number; y: number };
  animation: {
    /** The entrance preset (and the exit too while outPresetId is null). */
    presetId: AnimPresetId | null;
    /** A different exit preset, or null = the exit matches the entrance. */
    outPresetId: AnimPresetId | null;
    /** What a preset click changes: both phases (default), entrance, or exit. */
    direction: AnimPhase;
    speed: AnimSpeed;
    easing: EasingId;
    steps: boolean;
  };
  /** Images dropped in via the "Import graphics" entry (stored as data-URL assets). */
  importedImages: AssetFile[];
  /** Which imported image goes into the variant's logo slot (relative assets/ path). */
  logoAssetPath: string | null;
  /** The artwork the graphic IS, in the Import Graphic flow (measured at import). */
  designArt: DesignArt | null;
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
    customPalette: null,
    fontId: null,
    customFont: null,
    sizeScale: 1,
    zone: null,
    nudge: { x: 0, y: 0 },
    animation: { presetId: null, outPresetId: null, direction: 'both', speed: 1, easing: 'auto', steps: false },
    importedImages: [],
    logoAssetPath: null,
    designArt: null,
  };
}

export function draftResolution(draft: WizardDraft): Resolution {
  const aspect = ASPECTS.find((a) => a.id === draft.aspectId) ?? ASPECTS[0];
  return aspect.resolutions.find((r) => r.label === draft.resolutionLabel) ?? aspect.resolutions[0];
}

/** The DraftPatch that applies a saved project brand to the draft (the wizard's "Use current project's colors & font" toggle). */
export function brandPatch(brand: import('../../model/brand').ProjectBrand): DraftPatch {
  return {
    customPalette: brand.palette.id === 'custom' ? brand.palette : null,
    paletteId: brand.palette.id !== 'custom' ? brand.palette.id : null,
    fontId: brand.customFont ? 'custom' : brand.fontId,
    customFont: brand.customFont,
  };
}

/** Map the draft onto WizardOptions (nulls fall back to the variant's defaults). */
export function draftToOptions(variant: TemplateVariant, draft: WizardDraft): WizardOptions {
  return {
    resolution: draftResolution(draft),
    fps: draft.fps,
    lines: draft.lines.length > 0 ? draft.lines : undefined,
    extraFields: draft.extraFields.length > 0 ? draft.extraFields : undefined,
    palette: draft.customPalette ?? (draft.paletteId ? paletteById(draft.paletteId) : undefined),
    fontId: draft.fontId && draft.fontId !== 'custom' ? draft.fontId : undefined,
    customFont: draft.fontId === 'custom' && draft.customFont ? draft.customFont : undefined,
    sizeScale: draft.sizeScale,
    zone: draft.zone ?? undefined,
    nudge: draft.nudge,
    animation: {
      presetId: draft.animation.presetId ?? variant.animationPresets[0],
      speed: draft.animation.speed,
      easing: draft.animation.easing,
      steps: draft.animation.steps,
    },
    importedImages: draft.importedImages.length > 0 ? draft.importedImages : undefined,
    logoAssetPath: variant.hasLogoSlot ? draft.logoAssetPath ?? undefined : undefined,
    designArt: draft.designArt ?? undefined,
  };
}

/**
 * Build the draft's real template. `variant.create` emits the animation data with the entrance
 * preset driving both phases; when the draft mixes a different exit in, that exit is applied
 * onto the Out step with the same generator the Inspector's Animations tab uses — so the wizard
 * preview and the created project are always the exact same code.
 */
export function buildDraftTemplate(variant: TemplateVariant, draft: WizardDraft): SpxTemplate {
  const template = variant.create(draftToOptions(variant, draft));
  const inId = draft.animation.presetId ?? variant.animationPresets[0];
  const outId = draft.animation.outPresetId;
  if (!outId || outId === inId) return template;
  const outPreset = anyPresetById(outId);
  const easeOut = resolveEasing(draft.animation.easing, outPreset.autoEase).easeOut;

  const data = parseAnimData(template.js);
  if (!data) return template; // no data block (a hand-written variant) — nothing to mix onto
  const donor = presetDonor(template, data, outId, { easeOut });
  const mixed = donor && applyPresetData(data, donor, 'out', 'all');
  const js = mixed && spliceAnimData(template.js, mixed);
  return js ? { ...template, js } : template;
}
