// DERIVED template metadata — the computed bulk of the discovery facets
// (docs/TEMPLATE_TAXONOMY_PROPOSAL.md §11). Never hand-written: everything here is read
// off canonical sources (the compiled field schema, the type registry, the pack config,
// the preset motion table) and memoized per variant. The declared sliver it layers over
// lives in meta.ts.

import { DATA_FTYPES, type SpxField } from '../model/types';
import type { TemplateVariant } from '../model/wizard';
import { CATEGORIES } from '../model/wizard';
import type { StyleTag } from '../model/fonts';
import {
  COVERAGE_PLACEMENTS,
  FORMATS,
  GRAPHIC_CATEGORIES,
  graphicCategoryById,
  PRESET_MOTION,
  type CapabilityId,
  type Complexity,
  type CoverageClass,
  type FieldSemantic,
  type GraphicCategoryId,
  type MotionIntensity,
  type MotionStyleId,
  type PlacementId,
  type ProgrammeFamilyId,
  type ProgrammeFormatId,
} from '../model/taxonomy';
import {
  CATEGORY_DEFAULT_META,
  HIDDEN_CONFIG_FIELDS,
  TYPE_META,
  VARIANT_META,
  type DeclaredTemplateMeta,
} from './meta';
import { PACKS } from './packs';
import { formatsBySheetName } from '../model/taxonomy';
import { variantsFor } from './catalog';

export interface FieldCounts {
  /** Operator-facing content fields — what the Browse buckets count (proposal §6.1). */
  visible: number;
  /** Everything operator-editable, hidden config inputs included. */
  total: number;
  text: number;
  number: number;
  image: number;
  logo: number;
  choice: number;
  repeating: number;
  /** Reachable visible-field range [min, max] — bucket matching is range intersection. */
  visibleRange: [number, number];
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  category: GraphicCategoryId;
  subtype?: string;
  structures: DeclaredTemplateMeta['structures'];
  coverage: CoverageClass;
  programmeFormats: ProgrammeFormatId[];
  programmeFamilies: ProgrammeFamilyId[];
  fieldSchema: SpxField[];
  fieldSemantics: FieldSemantic[];
  fieldCounts: FieldCounts;
  capabilities: CapabilityId[];
  placements: PlacementId[];
  styleFamily: StyleTag;
  motion: { intensity: MotionIntensity; styles: MotionStyleId[] };
  complexity: Complexity;
}

// ── Declared-meta resolution (proposal §11's order) ─────────────────────────

function declaredFor(variant: TemplateVariant): DeclaredTemplateMeta | null {
  return (
    VARIANT_META[variant.id] ??
    (variant.typeId ? TYPE_META[variant.typeId] : undefined) ??
    CATEGORY_DEFAULT_META[variant.category]
  );
}

// ── Programme relevance (proposal §3) ───────────────────────────────────────
//
// A template is relevant to a format if the format's pack contains any TYPE whose graphic
// category matches the template's, or names the template's id in `extras`. Deriving
// through the CATEGORY (not the typeId) is what gives unclaimed hand-written variants the
// same relevance as their typed siblings. `relevance: 'all'` categories match everything,
// ranked below genuine matches by the search layer.

const typeIdsByCategory = new Map<GraphicCategoryId, string[]>();
for (const [typeId, meta] of Object.entries(TYPE_META)) {
  const list = typeIdsByCategory.get(meta.category) ?? [];
  list.push(typeId);
  typeIdsByCategory.set(meta.category, list);
}

function formatIdsForPack(packFormats: string[]): ProgrammeFormatId[] {
  const bySheet = formatsBySheetName();
  const ids: ProgrammeFormatId[] = [];
  for (const sheetName of packFormats) {
    const format = bySheet.get(sheetName);
    if (format) ids.push(format.id);
  }
  return ids;
}

function deriveFormats(variant: TemplateVariant, category: GraphicCategoryId): ProgrammeFormatId[] {
  if (graphicCategoryById(category).relevance === 'all') return FORMATS.map((f) => f.id);
  const categoryTypes = new Set(typeIdsByCategory.get(category) ?? []);
  const ids = new Set<ProgrammeFormatId>();
  for (const pack of PACKS) {
    const viaType = pack.types.some((t) => categoryTypes.has(t));
    const viaExtra = (pack.extras ?? []).includes(variant.id);
    if (viaType || viaExtra) for (const id of formatIdsForPack(pack.formats)) ids.add(id);
  }
  return [...ids];
}

// ── Field counts (proposal §6.1) ────────────────────────────────────────────

function isLogoField(field: SpxField): boolean {
  return field.ftype === 'filelist' && /logo/i.test(field.title);
}

function deriveFieldCounts(
  variant: TemplateVariant,
  fields: SpxField[],
  capabilities: Set<CapabilityId>,
): FieldCounts {
  const hiddenIds = new Set(HIDDEN_CONFIG_FIELDS[variant.category] ?? []);
  const content = fields.filter(
    (f) => DATA_FTYPES.includes(f.ftype) && !hiddenIds.has(f.field) && !isLogoField(f),
  );
  const visible = content.length;
  // The reachable range: in the line-based categories the wizard lets lines shrink to 1
  // and grow to maxLines while extras stay constant; fixed-contract categories
  // (scoreboards, versus, quiz, ...) reach exactly what they ship.
  const defaultLines = Math.min(variant.suggestedLines.length, variant.maxLines);
  const growth = Math.max(0, variant.maxLines - defaultLines);
  const shrink = STEP_CATEGORIES.has(variant.category) ? Math.max(0, defaultLines - 1) : 0;
  return {
    visible,
    total: fields.length,
    text: content.filter((f) => f.ftype === 'textfield' || f.ftype === 'textarea').length,
    number: content.filter((f) => f.ftype === 'number').length,
    image: content.filter((f) => f.ftype === 'filelist').length,
    logo: variant.logo === 'none' ? 0 : 1,
    choice: content.filter((f) => f.ftype === 'dropdown' || f.ftype === 'checkbox' || f.ftype === 'color').length,
    repeating: capabilities.has('repeating') ? 1 : 0,
    visibleRange: [Math.max(1, visible - shrink), visible + growth],
  };
}

// ── Capabilities (proposal §7: derived ∪ declared extras) ───────────────────

const LOOP_PRESETS = new Set(['hold-loop', 'ticker-marquee', 'ticker-flip', 'ticker-rotate', 'credits-crawl']);
const STEP_CATEGORIES = new Set(['lower-third', 'info-card']);

function deriveCapabilities(
  variant: TemplateVariant,
  declared: DeclaredTemplateMeta,
  fields: SpxField[],
): Set<CapabilityId> {
  const caps = new Set<CapabilityId>(declared.extraCapabilities ?? []);
  if (variant.logo !== 'none') caps.add('logo-upload');
  if (fields.some((f) => f.ftype === 'filelist' && !isLogoField(f))) caps.add('image-upload');
  if (STEP_CATEGORIES.has(variant.category) && variant.maxLines > 1) caps.add('multi-step');
  for (const preset of variant.animationPresets) {
    if (LOOP_PRESETS.has(preset)) caps.add('loop');
    if (preset === 'count-up') caps.add('count-up');
    if (preset === 'bars-grow' || preset === 'ring-fill') caps.add('progress');
  }
  return caps;
}

// ── Complexity (proposal §12.4) ─────────────────────────────────────────────

function deriveComplexity(capabilities: Set<CapabilityId>, visible: number): Complexity {
  // Advanced = a real state machine beyond the walk: operator events, quiz branches, or a
  // parallel clock group (pause/resume is the tell). Logo support deliberately does not count.
  if (
    capabilities.has('operator-states') ||
    capabilities.has('quiz-states') ||
    capabilities.has('pause-resume')
  ) {
    return 'advanced';
  }
  if (
    capabilities.has('multi-step') ||
    capabilities.has('countdown') ||
    capabilities.has('count-up') ||
    visible > 3
  ) {
    return 'standard';
  }
  return 'simple';
}

// ── The derivation, memoized per variant id ─────────────────────────────────

const metaCache = new Map<string, TemplateMeta | null>();

/** Compute (or return the cached) discovery metadata for one variant. Returns null for
 *  non-browsable content (imported designs). Calls `variant.create()` once to read the
 *  compiled default field schema — memoized, so the cost is paid on first Browse. */
export function templateMeta(variant: TemplateVariant): TemplateMeta | null {
  const cached = metaCache.get(variant.id);
  if (cached !== undefined) return cached;

  const declared = declaredFor(variant);
  if (!declared) {
    metaCache.set(variant.id, null);
    return null;
  }

  const fields = variant.create().fields;
  const capabilities = deriveCapabilities(variant, declared, fields);
  const fieldCounts = deriveFieldCounts(variant, fields, capabilities);
  const coverage = declared.coverage ?? graphicCategoryById(declared.category).coverage;
  const formats = deriveFormats(variant, declared.category);
  const families = [...new Set(FORMATS.filter((f) => formats.includes(f.id)).map((f) => f.family))];

  // Field semantics: positional array for unclaimed variants; for typed variants the
  // TYPE_META semantic map is authored in the type's field order (lines first, logo last —
  // the same order typeFieldsToSpx enforces), so its values line up positionally too.
  const byKey = declared.semantics ? Object.values(declared.semantics) : [];
  const semantics: FieldSemantic[] = fields.map(
    (_field: SpxField, i: number) => declared.positionalSemantics?.[i] ?? byKey[i] ?? 'description',
  );

  const defaultMotion = PRESET_MOTION[variant.animationPresets[0]];
  const motionStyles = [...new Set(variant.animationPresets.flatMap((p) => PRESET_MOTION[p]?.styles ?? []))];

  const meta: TemplateMeta = {
    id: variant.id,
    name: variant.name,
    description: variant.description,
    category: declared.category,
    subtype: declared.subtype,
    structures: declared.structures,
    coverage,
    programmeFormats: formats,
    programmeFamilies: families,
    fieldSchema: fields,
    fieldSemantics: semantics,
    fieldCounts,
    capabilities: [...capabilities],
    placements: COVERAGE_PLACEMENTS[coverage],
    styleFamily: variant.styleTag,
    motion: { intensity: defaultMotion?.intensity ?? 'medium', styles: motionStyles },
    complexity: deriveComplexity(capabilities, fieldCounts.visible),
  };
  metaCache.set(variant.id, meta);
  return meta;
}

/** Discovery metadata for every browsable catalog variant, in catalog order. */
export function allTemplateMeta(): { variant: TemplateVariant; meta: TemplateMeta }[] {
  const out: { variant: TemplateVariant; meta: TemplateMeta }[] = [];
  for (const category of CATEGORIES) {
    if (category.group === 'imported') continue;
    for (const variant of variantsFor(category.id)) {
      const meta = templateMeta(variant);
      if (meta) out.push({ variant, meta });
    }
  }
  return out;
}

/** Browse tiles: categories that actually have catalog content, with counts —
 *  taxonomy-ahead-of-catalog categories render no tile (proposal §4). */
export function browsableCategories(): { category: GraphicCategoryId; name: string; count: number }[] {
  const counts = new Map<GraphicCategoryId, number>();
  for (const { meta } of allTemplateMeta()) {
    counts.set(meta.category, (counts.get(meta.category) ?? 0) + 1);
  }
  return GRAPHIC_CATEGORIES.filter((c) => counts.has(c.id)).map((c) => ({
    category: c.id,
    name: c.name,
    count: counts.get(c.id) ?? 0,
  }));
}
