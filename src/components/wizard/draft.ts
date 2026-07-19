// The wizard's working state (the "draft"): every choice the user makes across the steps.
// null means "use the variant's tasteful default" — draftToOptions() maps the draft onto
// WizardOptions, and resolveOptions() (model/wizard.ts) fills the rest.

import { ASPECTS, type AssetFile, type Resolution, type SpxTemplate } from '../../model/types';
import { addPlacedLine } from '../../blocks/designLayout';
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
import type { EraseRect } from '../../assets/eraseRegion';

/** The applied baked-text erase: the marked rectangle (in the artwork's SOURCE pixels) and
 *  the sampling verdict it ran with. The rectangle also seeds the first text field at create. */
export interface DesignEraseState {
  rect: EraseRect;
  /** Whether the background samples counted as flat (assets/eraseRegion FLAT_BG_TOLERANCE). */
  uniform: boolean;
  maxDeviation: number;
}

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
  /** Text-only size multiplier (--type-scale) on top of the whole-graphic sizeScale. */
  typeScale: number;
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
  /** The Fields step's logo toggle on an 'optional'-logo variant; null = undecided
   *  (falls back to "a logo image was provided"). */
  logoEnabled: boolean | null;
  /** The artwork the graphic IS, in the Import Graphic flow (measured at import). */
  designArt: DesignArt | null;
  /** The untouched upload, kept so an erase re-runs from clean pixels (never compounds). */
  designOriginal: AssetFile | null;
  /** The applied baked-text erase (Prepare step); null = none. */
  designErase: DesignEraseState | null;
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
    typeScale: 1,
    zone: null,
    nudge: { x: 0, y: 0 },
    animation: { presetId: null, outPresetId: null, direction: 'both', speed: 1, easing: 'auto', steps: false },
    importedImages: [],
    logoAssetPath: null,
    logoEnabled: null,
    designArt: null,
    designOriginal: null,
    designErase: null,
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
    // An imported design owns its lines OUTRIGHT — the wizard creates it BARE (fields are
    // added in the editor's Data tab), so its empty array must reach the assembler as-is.
    // Everywhere else an empty draft means "not decided yet" and falls back to suggestions.
    lines:
      variant.category === 'imported-design'
        ? draft.lines
        : draft.lines.length > 0
          ? draft.lines
          : undefined,
    extraFields: draft.extraFields.length > 0 ? draft.extraFields : undefined,
    palette: draft.customPalette ?? (draft.paletteId ? paletteById(draft.paletteId) : undefined),
    fontId: draft.fontId && draft.fontId !== 'custom' ? draft.fontId : undefined,
    customFont: draft.fontId === 'custom' && draft.customFont ? draft.customFont : undefined,
    sizeScale: draft.sizeScale,
    typeScale: draft.typeScale,
    zone: draft.zone ?? undefined,
    nudge: draft.nudge,
    animation: {
      presetId: draft.animation.presetId ?? variant.animationPresets[0],
      speed: draft.animation.speed,
      easing: draft.animation.easing,
      steps: draft.animation.steps,
    },
    importedImages: draft.importedImages.length > 0 ? draft.importedImages : undefined,
    logoAssetPath: variant.logo !== 'none' ? draft.logoAssetPath ?? undefined : undefined,
    // null = the user hasn't decided; resolveOptions then falls back to "an image exists".
    logoEnabled: draft.logoEnabled ?? undefined,
    designArt: draft.designArt ?? undefined,
  };
}

/**
 * Build the draft's real template. `variant.create` emits the animation data with the entrance
 * preset driving both phases; when the draft mixes a different exit in, that exit is applied
 * onto the Out step with the same generator the Inspector's Animations tab uses — so the wizard
 * preview and the created project are always the exact same code.
 */
/**
 * The erased region's field (Import Graphic, Prepare step). An imported design creates BARE
 * — with ONE exception: erasing baked-in text is an explicit "editable text goes here", so
 * the erased rectangle seeds the first field, through the same addPlacedLine transform the
 * Data tab and canvas text tools use. The rect is in the artwork's SOURCE pixels; placement
 * is design px, so the fitToFrame ratio maps between them (the retina case).
 */
function withEraseSeedField(template: SpxTemplate, draft: WizardDraft): SpxTemplate {
  if (!draft.designErase || !draft.designArt) return template;
  const art = draft.designArt;
  const k = art.width / (art.sourceWidth ?? art.width);
  const r = draft.designErase.rect;
  const added = addPlacedLine(template, {
    title: 'Name',
    ftype: 'textfield',
    at: { x: Math.round(r.x * k), y: Math.round(r.y * k) },
    // The marked box wraps the text with a little air — the type itself is about 72% of it.
    fontSize: Math.max(10, Math.round(r.height * k * 0.72)),
    maxWidth: Math.max(64, Math.round(r.width * k)),
  });
  return added ? added.template : template;
}

export function buildDraftTemplate(variant: TemplateVariant, draft: WizardDraft): SpxTemplate {
  let template = variant.create(draftToOptions(variant, draft));
  if (variant.category === 'imported-design') template = withEraseSeedField(template, draft);
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
