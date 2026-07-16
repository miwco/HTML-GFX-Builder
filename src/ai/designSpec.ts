// The design-spec stage of the AI harness: the model emits a structured DESIGN SPEC (not
// code), and the platform assembles it through the real catalog assemblers — the same
// machine the wizard drives, so a grounded result is correct by construction and editable
// by every panel. The spec is also the ROUTER: `fit: 'custom'` sends briefs the catalog
// structurally can't carry to the free-form coder path.
//
// The spec deliberately carries real COMPOSITIONAL freedom (typography scale, density,
// alignment, shape language) beyond variant + palette — "same layout, different colours"
// is a named failure mode. Deterministic adjustments map those parameters onto the
// assembled code (src/ai/designAdjust.ts).

import type { ClaudeTool } from './anthropic';
import type { GenerateContext } from './provider';
import {
  CATEGORIES,
  PALETTES,
  paletteById,
  resolveOptions,
  type AnimSpeed,
  type Palette,
  type TemplateCategory,
  type TemplateVariant,
  type WizardOptions,
  type Zone9,
} from '../model/wizard';
import { EASINGS, type EasingId } from '../model/easings';
import { FONTS } from '../model/fonts';
import { CATALOG, variantById, variantsFor } from '../templates/catalog';
import type { SpxTemplate } from '../model/types';
import type { AiDiversity } from './telemetry';

// ── The spec ──────────────────────────────────────────────────────────────────

export interface SpecTypography {
  /** Heading:body size ratio (~1.4 quiet … ~2.4 dramatic). */
  scaleRatio?: number;
  /** Heading weight step. */
  headingWeight?: 'regular' | 'semibold' | 'bold' | 'black';
  /** Small-caps treatment of the kicker/label line, where the design has one. */
  kickerCase?: 'caps' | 'as-written';
  /** Letterspacing character. */
  tracking?: 'tight' | 'normal' | 'wide';
}

export interface SpecShape {
  corner?: 'sharp' | 'soft' | 'round';
  /** The accent element's form, where the design has one. */
  accentForm?: 'bar' | 'hairline' | 'block' | 'none';
  panel?: 'solid' | 'translucent' | 'outline' | 'none';
}

export interface DesignSpec {
  /** The route: 'catalog' when a listed design family carries the brief's STRUCTURE. */
  fit: 'catalog' | 'custom';
  /** One sentence: why this route (and this design family). */
  reason: string;
  name: string;
  summary: string;
  category: TemplateCategory;
  /** The chassis (a catalog design id, e.g. "lt07") — a starting point, not a skin. */
  variantId?: string;
  /** The operator's visible text lines (1-3): label + realistic sample. */
  lines: { title: string; sample: string }[];
  extraFields?: { title: string; ftype: 'textfield' | 'textarea' | 'number' | 'filelist'; value: string }[];
  /** Place the first uploaded image into the design's logo slot. */
  useLogoSlot?: boolean;
  zone?: Zone9;
  /** A curated palette id — or a bespoke palette when the brief/references demand one. */
  paletteId?: string;
  palette?: { accent: string; text: string; textDim: string; panel: string };
  fontId?: string;
  /** Overall size (0.85 compact … 1.2 large). */
  sizeScale?: number;
  animation?: { presetId?: string; easing?: string; speed?: number; steps?: boolean };
  /** One line: how the motion should support the reading order. */
  motionCharacter?: string;
  // Compositional parameters — deterministic freedom beyond the chassis defaults.
  typography?: SpecTypography;
  density?: 'airy' | 'standard' | 'compact';
  alignment?: 'left' | 'center' | 'right';
  shape?: SpecShape;
  /**
   * When the user uploaded references: the underlying SYSTEM read from them — grid,
   * hierarchy, spacing rhythm, proportions, shape language, colour balance, density,
   * motion cues. References outweigh generic guidance.
   */
  referenceSystem?: string;
  /** A brief for the bounded polish pass — ONLY what the parameters above can't express. */
  flourish?: string | null;
}

// ── The forced tool ───────────────────────────────────────────────────────────

const ZONES: Zone9[] = [
  'top-left', 'top-center', 'top-right',
  'mid-left', 'mid-center', 'mid-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

const allVariantIds = (): string[] => Object.values(CATALOG).flatMap((list) => (list ?? []).map((v) => v.id));

export const DESIGN_SPEC_TOOL: ClaudeTool = {
  name: 'emit_design_spec',
  description:
    'Return the design decision for the brief: the route (catalog chassis vs custom build) plus ' +
    'every design parameter. The platform assembles catalog specs deterministically.',
  input_schema: {
    type: 'object',
    required: ['fit', 'reason', 'name', 'summary', 'category', 'lines'],
    additionalProperties: false,
    properties: {
      fit: {
        type: 'string',
        enum: ['catalog', 'custom'],
        description:
          'catalog when a listed design family can carry the STRUCTURE of the brief — styling ' +
          'differences never disqualify (express them in the design parameters and flourish). ' +
          'custom when the brief calls for a structure or composition no listed family expresses ' +
          '(a novel layout, an unlisted graphic kind, a composition that would be forced into the ' +
          'wrong shape). custom is a genuine creative route, not a failure.',
      },
      reason: { type: 'string', description: 'One sentence: why this route and this design family.' },
      name: { type: 'string', description: 'Short template name, e.g. "Election Strap".' },
      summary: { type: 'string', description: 'One sentence describing the design for the user.' },
      category: { type: 'string', enum: CATEGORIES.map((c) => c.id) },
      variantId: {
        type: 'string',
        enum: allVariantIds(),
        description: 'REQUIRED when fit=catalog: the chassis design id from the catalog listing.',
      },
      lines: {
        type: 'array',
        minItems: 1,
        maxItems: 3,
        description: "The visible text lines: operator label + a realistic sample from the brief's world.",
        items: {
          type: 'object',
          required: ['title', 'sample'],
          additionalProperties: false,
          properties: { title: { type: 'string' }, sample: { type: 'string' } },
        },
      },
      extraFields: {
        type: 'array',
        maxItems: 4,
        description: 'Extra non-visual operator fields (a number, an image pick, long text).',
        items: {
          type: 'object',
          required: ['title', 'ftype', 'value'],
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            ftype: { type: 'string', enum: ['textfield', 'textarea', 'number', 'filelist'] },
            value: { type: 'string' },
          },
        },
      },
      useLogoSlot: { type: 'boolean', description: 'Place the first uploaded image into the logo slot.' },
      zone: { type: 'string', enum: ZONES },
      paletteId: { type: 'string', enum: PALETTES.map((p) => p.id) },
      palette: {
        type: 'object',
        description:
          'A bespoke palette when the brief or references demand exact colours (otherwise pick a paletteId). ' +
          'One accent + a neutral system; keep text contrast broadcast-safe.',
        required: ['accent', 'text', 'textDim', 'panel'],
        additionalProperties: false,
        properties: {
          accent: { type: 'string' }, text: { type: 'string' }, textDim: { type: 'string' }, panel: { type: 'string' },
        },
      },
      fontId: { type: 'string', enum: FONTS.map((f) => f.id) },
      sizeScale: { type: 'number', description: 'Overall size multiplier, 0.85 compact … 1.2 large.' },
      animation: {
        type: 'object',
        additionalProperties: false,
        properties: {
          presetId: { type: 'string', description: "One of the chassis's listed motion presets." },
          easing: { type: 'string', enum: [...EASINGS.map((e) => e.id as string), 'auto'] },
          speed: { type: 'number', enum: [0.75, 1, 1.5] },
          steps: { type: 'boolean', description: 'Reveal further lines on the operator\'s Continue press.' },
        },
      },
      motionCharacter: { type: 'string', description: 'One line: how motion supports the reading order.' },
      typography: {
        type: 'object',
        additionalProperties: false,
        properties: {
          scaleRatio: { type: 'number', description: 'Heading:body size ratio, ~1.4 quiet … ~2.4 dramatic.' },
          headingWeight: { type: 'string', enum: ['regular', 'semibold', 'bold', 'black'] },
          kickerCase: { type: 'string', enum: ['caps', 'as-written'] },
          tracking: { type: 'string', enum: ['tight', 'normal', 'wide'] },
        },
      },
      density: { type: 'string', enum: ['airy', 'standard', 'compact'], description: 'Padding/spacing character.' },
      alignment: { type: 'string', enum: ['left', 'center', 'right'] },
      shape: {
        type: 'object',
        additionalProperties: false,
        properties: {
          corner: { type: 'string', enum: ['sharp', 'soft', 'round'] },
          accentForm: { type: 'string', enum: ['bar', 'hairline', 'block', 'none'] },
          panel: { type: 'string', enum: ['solid', 'translucent', 'outline', 'none'] },
        },
      },
      referenceSystem: {
        type: 'string',
        description:
          'Only when references were uploaded: the SYSTEM read from them (grid, hierarchy, spacing ' +
          'rhythm, proportions, shape language, colour balance, density, motion cues). References ' +
          'outweigh generic guidance — analyse the system, never copy surface details.',
      },
      flourish: {
        type: ['string', 'null'],
        description:
          'ONE visual signature for the polish pass, only when the parameters above cannot express ' +
          'the intent (a gradient edge, a slanted accent). null when they can.',
      },
    },
  },
};

// ── The catalog digest (the spec prompt's world) ──────────────────────────────

/** One compact listing of everything the platform can assemble, for the system prompt. */
export function catalogDigest(): string {
  const lines: string[] = [];
  for (const cat of CATEGORIES) {
    const variants = variantsFor(cat.id);
    if (!variants.length) continue;
    lines.push(`### ${cat.name} (category: ${cat.id}) — ${cat.description}`);
    for (const v of variants) {
      const bits = [
        `${v.maxLines} line${v.maxLines > 1 ? 's' : ''}`,
        v.hasLogoSlot ? 'logo slot' : null,
        `motion: ${v.animationPresets.join(' | ')}`,
      ].filter(Boolean);
      lines.push(`- ${v.id} "${v.name}" [${v.styleTag}] — ${v.description} (${bits.join('; ')})`);
    }
  }
  lines.push(
    '',
    `Palettes: ${PALETTES.map((p) => `${p.id} (${p.name}: accent ${p.accent})`).join(', ')}.`,
    `Fonts: ${FONTS.map((f) => `${f.id} (${f.family} — ${f.blurb})`).join(', ')}.`,
    `Zones: ${ZONES.join(', ')}.`,
    `Easings: ${EASINGS.map((e) => e.id).join(', ')} (auto = the motion preset's hand-tuned pair).`,
  );
  return lines.join('\n');
}

// ── Deterministic assembly with clamps ────────────────────────────────────────

const clampNumber = (v: number | undefined, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined;

/** Pick the best chassis when the spec's variantId is missing or wrong (never fail). */
function resolveVariant(spec: DesignSpec, wantsLogo: boolean): TemplateVariant {
  const direct = spec.variantId ? variantById(spec.variantId) : undefined;
  if (direct && direct.category === spec.category) return direct;
  const pool = variantsFor(spec.category);
  const fallback = pool.length ? pool : variantsFor('lower-third');
  if (wantsLogo) {
    const withLogo = fallback.find((v) => v.hasLogoSlot);
    if (withLogo) return withLogo;
  }
  return direct ?? fallback[0];
}

export interface AssembledSpec {
  template: SpxTemplate;
  variant: TemplateVariant;
  /** What was actually used after clamping — telemetry's diversity record. */
  diversity: AiDiversity;
}

/**
 * Spec + context → a guaranteed-valid template through the REAL catalog assemblers.
 * Every out-of-range value CLAMPS to the nearest legal one instead of failing — the
 * platform owns correctness, the spec owns intent.
 */
export function specToTemplate(spec: DesignSpec, ctx?: GenerateContext): AssembledSpec {
  const wantsLogo = Boolean(spec.useLogoSlot && ctx?.images?.length);
  const variant = resolveVariant(spec, wantsLogo);

  // Palette precedence: the project brand (ctx) wins, then a bespoke spec palette, then a
  // curated palette id, then the chassis default (via resolveOptions).
  let palette: Palette | undefined = ctx?.palette ?? undefined;
  if (!palette && spec.palette) {
    palette = {
      id: 'ai-custom',
      name: 'Brief palette',
      styleTags: [variant.styleTag],
      accent: spec.palette.accent,
      text: spec.palette.text,
      textDim: spec.palette.textDim,
      panel: spec.palette.panel,
    };
  }
  if (!palette && spec.paletteId) palette = paletteById(spec.paletteId);

  const presetOk = spec.animation?.presetId && variant.animationPresets.includes(spec.animation.presetId as never);
  const easingOk = spec.animation?.easing && EASINGS.some((e) => e.id === spec.animation?.easing);
  const speed: AnimSpeed | undefined =
    spec.animation?.speed === 0.75 || spec.animation?.speed === 1.5 ? spec.animation.speed : spec.animation?.speed === 1 ? 1 : undefined;

  const lines = (spec.lines ?? [])
    .filter((l) => l && typeof l.title === 'string' && typeof l.sample === 'string' && l.title.trim())
    .slice(0, variant.maxLines);

  const options: WizardOptions = {
    resolution: ctx?.resolution,
    fps: ctx?.fps,
    lines: lines.length ? lines : undefined,
    extraFields: (spec.extraFields ?? []).filter((f) =>
      ['textfield', 'textarea', 'number', 'filelist'].includes(f.ftype),
    ),
    palette,
    fontId: FONTS.some((f) => f.id === spec.fontId) ? spec.fontId : undefined,
    sizeScale: clampNumber(spec.sizeScale, 0.7, 1.4),
    zone: ZONES.includes(spec.zone as Zone9) ? spec.zone : undefined,
    animation: {
      ...(presetOk ? { presetId: spec.animation?.presetId as never } : {}),
      ...(easingOk ? { easing: spec.animation?.easing as EasingId } : {}),
      ...(speed ? { speed } : {}),
      ...(typeof spec.animation?.steps === 'boolean' ? { steps: spec.animation.steps } : {}),
    },
    importedImages: ctx?.images ?? [],
    logoAssetPath: wantsLogo && variant.hasLogoSlot ? ctx?.images[0]?.path : undefined,
  };

  const template = variant.create(options);
  const named: SpxTemplate = spec.name ? { ...template, name: spec.name } : template;

  // Record what was ACTUALLY used (post-clamp) so diversity metrics reflect reality.
  const resolved = resolveOptions(variant, options);
  const diversity: AiDiversity = {
    variantId: variant.id,
    category: variant.category,
    presetId: resolved.animation.presetId,
    paletteId: resolved.palette.id,
    zone: resolved.zone,
    ...(spec.density ? { density: spec.density } : {}),
    ...(spec.typography
      ? {
          typography: [
            spec.typography.scaleRatio ? `ratio ${spec.typography.scaleRatio}` : null,
            spec.typography.headingWeight,
            spec.typography.tracking ? `${spec.typography.tracking} tracking` : null,
          ]
            .filter(Boolean)
            .join(', '),
        }
      : {}),
  };

  return { template: named, variant, diversity };
}
