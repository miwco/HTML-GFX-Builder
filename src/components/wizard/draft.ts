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
import type { EraseRect, RegionInk } from '../../assets/eraseRegion';

/** ONE applied baked-text erase: the marked rectangle (in the artwork's SOURCE pixels) and
 *  the sampling verdict it ran with. Its measured ink seeds a real text field per LINE it
 *  held, at create. */
export interface DesignEraseState {
  rect: EraseRect;
  /** Whether the background samples counted as flat (assets/eraseRegion FLAT_BG_TOLERANCE). */
  uniform: boolean;
  maxDeviation: number;
  /** The applied fill colour — the seeded field contrasts against exactly this. */
  fill: { r: number; g: number; b: number; a: number };
  /** Where the erased text ACTUALLY sat, measured from the pixels (SOURCE px). The seeded
   *  field is built from this rather than from the loose rectangle the user drew. Absent on
   *  a region that held only background — and on drafts made before it was measured. */
  ink?: RegionInk;
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
  /** The applied baked-text erases (Prepare step), in the order they were marked; [] = none.
   *  A design usually has more than one piece of baked text — a name AND a title, a scoreline
   *  AND a clock — so each marked region is its own erase, and each seeds its own field(s). */
  designErases: DesignEraseState[];
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
    designErases: [],
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
function withEraseSeedFields(template: SpxTemplate, draft: WizardDraft): SpxTemplate {
  const art = draft.designArt;
  if (!art || draft.designErases.length === 0) return template;
  const k = art.width / (art.sourceWidth ?? art.width);
  // Every line of every erased region becomes a field, in reading order: a user who marked a
  // name and a title got two pieces of text back, not one field over both.
  let next = template;
  let seeded = 0;
  for (const erase of draft.designErases) {
    // The field sits ON the erased fill, so contrast against exactly that: dark ink on a
    // light fill, white on a dark one (a transparent fill reads as the dark broadcast frame).
    const f = erase.fill;
    const luminance = f.a < 64 ? 0 : (0.2126 * f.r + 0.7152 * f.g + 0.0722 * f.b) / 255;
    const color = luminance > 0.5 ? '#16181c' : '#ffffff';
    // Build the replacement from what was MEASURED, not from the lasso the user drew: the
    // rectangle is deliberately loose (you draw it around text, with air), so its edges say
    // nothing about where the type sat. The ink does.
    //
    // Nothing here reconstructs the font — flattened pixels don't carry one. It reproduces the
    // things that ARE in the pixels: each line's bounds, which edge it was set from, how tall
    // it was, and where its top was. That is what makes the field land on the erased text
    // instead of near it; the user restyles from there.
    for (const line of erase.ink?.lines ?? []) {
      const box = { x: line.x * k, width: line.width * k };
      // Cap-top to baseline is ~0.72 em in every face the product bundles (and close to it in
      // anything a broadcast design is set in), which is why the measurement stops at the
      // baseline: the FULL ink run is 0.72 em for a word without descenders and 0.94 em for
      // one with them, so a size read off it would be right for "Riva" and 30% out for "Gray".
      // Verified against real typeset text, not a stand-in bar (e2e/import-canvas.spec.ts).
      // Bounded, too: a region marked over a logo has ink but no type in it at all.
      // …and never so large that the field arrives already overflowing its own slot. A region
      // marked over a LOGO or an illustration has ink as tall as it is wide, and cap height
      // read off that is type the width could never hold: the fit runtime floors its shrink at
      // 55% and then CLIPS, so the field would open showing "Tex". Roughly half an em per
      // glyph of the value it starts with is the bound that never binds on a real line of
      // text (which is many times wider than it is tall) and always binds on a block.
      const title = seedTitle(seeded);
      const fits = (line.width * k) / (0.55 * Math.max(4, title.length));
      const fontSize = Math.max(
        10,
        Math.min(Math.round((line.capHeight * k) / 0.72), Math.round(fits), Math.round(art.height * 0.5)),
      );
      // Which edge the type was set from. Centred is a real design decision (a title card, a
      // badge) and worth detecting: text whose middle sits on the artwork's middle was almost
      // certainly centred, and seeding it left-anchored would drift the moment the operator
      // types a name of a different length — the one thing this field exists to survive.
      const centre = box.x + box.width / 2;
      const align =
        Math.abs(centre - art.width / 2) <= art.width * 0.045 ? 'center' as const
        : centre < art.width / 2 ? 'left' as const
        : 'right' as const;
      const anchorX = align === 'center' ? centre : align === 'right' ? box.x + box.width : box.x;
      const added = addPlacedLine(next, {
        color,
        title,
        ftype: 'textfield',
        // line-height 1 makes the box exactly one em tall, so the glyphs land predictably
        // inside it: the ink starts about a tenth of an em below the box top.
        lineHeight: 1,
        at: { x: Math.round(anchorX), y: Math.round(line.top * k - fontSize * 0.1) },
        fontSize,
        align,
        // The slot is the room the erased text had, measured from its own anchor — plus the
        // side bearings, which is the difference between what type PAINTS and the width it
        // OCCUPIES. Without that margin the slot is a hair narrower than the very text it was
        // measured from, and the fit runtime shrinks the seed on arrival: the field would open
        // ~10% under the size the design was set in, every time.
        maxWidth: Math.max(64, Math.round((align === 'center' ? box.width * 2 : box.width) + fontSize * 0.12)),
      });
      if (added) {
        next = added.template;
        seeded++;
      }
    }
    // No measurable ink (a region marked over blank background): fall back to the rectangle,
    // sized from its box — ~72% of the height (the box wraps ascenders/descenders with air),
    // CAPPED by width/7, since a name is roughly a dozen glyphs at ~half an em each and a tall
    // script original would otherwise seed type twice the size the design was drawn with.
    if (!erase.ink) {
      const r = erase.rect;
      const added = addPlacedLine(next, {
        color,
        title: seedTitle(seeded),
        ftype: 'textfield',
        at: { x: Math.round(r.x * k), y: Math.round(r.y * k) },
        fontSize: Math.max(10, Math.round(Math.min(r.height * k * 0.72, (r.width * k) / 7))),
        maxWidth: Math.max(64, Math.round(r.width * k)),
      });
      if (added) {
        next = added.template;
        seeded++;
      }
    }
  }
  return next;
}

/** What a seeded field is called. The first two get the words a lower third actually uses —
 *  the overwhelmingly common shape is a name over a title — and anything past that is
 *  numbered. Every one is renamed in a click from the Inspector's Style tab. */
function seedTitle(index: number): string {
  return index === 0 ? 'Name' : index === 1 ? 'Title' : `Text ${index + 1}`;
}

/**
 * PREVIEW-ONLY: a sample line for the Prepare step's stretch demo. With stretch picked but
 * nothing erased, the created template is bare — there is no field for the content-width
 * slider to widen — so the preview build (and only it) places one demo line in the middle
 * band, through the same addPlacedLine transform as everything else. This is the ONE
 * sanctioned deviation from preview == created code (docs/IMPORT_MVP.md): the demo exists
 * exactly so the user can verify the guides before creating.
 */
function withStretchDemoLine(template: SpxTemplate, draft: WizardDraft): SpxTemplate {
  const art = draft.designArt;
  const hz = art?.stretch?.horizontal;
  if (!art || !hz || draft.designErases.length > 0) return template; // the erase-seeded fields are the demo
  const added = addPlacedLine(template, {
    title: 'Sample',
    ftype: 'textfield',
    text: 'Alexandra Riva',
    at: { x: Math.round(hz.left + art.width * 0.03), y: Math.round(art.height * 0.4) },
    fontSize: Math.min(64, Math.max(12, Math.round(art.height * 0.12))),
  });
  return added ? added.template : template;
}

export function buildDraftTemplate(
  variant: TemplateVariant,
  draft: WizardDraft,
  // The wizard PREVIEW passes stretchDemo; create() never does — see withStretchDemoLine.
  opts: { stretchDemo?: boolean } = {},
): SpxTemplate {
  let template = variant.create(draftToOptions(variant, draft));
  if (variant.category === 'imported-design') {
    template = withEraseSeedFields(template, draft);
    if (opts.stretchDemo) template = withStretchDemoLine(template, draft);
  }
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
