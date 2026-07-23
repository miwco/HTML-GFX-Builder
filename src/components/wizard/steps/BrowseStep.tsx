import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { ASPECTS, FPS_OPTIONS } from '../../../model/types';
import type { StyleTag } from '../../../model/fonts';
import type { TemplateVariant } from '../../../model/wizard';
import {
  CAPABILITIES,
  COMPLEXITY_LABELS,
  FAMILIES,
  FORMATS,
  graphicCategoryById,
  SEMANTIC_LABELS,
  STRUCTURE_LABELS,
  STYLE_FAMILY_LABELS,
  type CapabilityId,
  type MotionIntensity,
  type ProgrammeFamilyId,
  type ProgrammeFormatId,
  type StructureId,
} from '../../../model/taxonomy';
import {
  browseTemplates,
  mostRestrictiveFilter,
  offeredCapabilityFilters,
  offeredIntensities,
  offeredStructures,
  NO_BROWSE_FILTERS,
  type BrowseFilters,
  type BrowseResult,
  type FieldBucket,
} from '../../../templates/search';
import { browsableCategories, type TemplateMeta } from '../../../templates/templateMeta';
import MiniPreview from '../MiniPreview';
import type { DraftPatch, WizardDraft } from '../draft';

interface Props {
  draft: WizardDraft;
  filters: BrowseFilters;
  /** React setter so every chip applies as a FUNCTIONAL update — two toggles in one
   *  batch must compose, not overwrite each other through a stale closure. */
  onFilters: Dispatch<SetStateAction<BrowseFilters>>;
  onDraft: (patch: DraftPatch) => void;
  onPickVariant: (variant: TemplateVariant) => void;
  /** The zero-result escape hatch: hand the search over to Create with AI. */
  onAi: () => void;
}

type SortMode = 'relevance' | 'simplest';

const FIELD_BUCKETS: FieldBucket[] = ['1', '2', '3', '4-5', '6+', 'repeating'];
const BUCKET_LABEL: Record<FieldBucket, string> = {
  '1': '1 field', '2': '2 fields', '3': '3 fields', '4-5': '4–5 fields',
  '6+': '6+ fields', repeating: '↻ Repeating',
};
const COMPLEXITY_RANK = { simple: 0, standard: 1, advanced: 2 } as const;

/** "2 names + 2 roles" — the card's field summary off counts + semantics (proposal §12.3). */
function fieldSummary(meta: TemplateMeta): string {
  const { visible, visibleRange } = meta.fieldCounts;
  const bySemantic = new Map<string, number>();
  meta.fieldSemantics.slice(0, visible).forEach((s) => {
    bySemantic.set(s, (bySemantic.get(s) ?? 0) + 1);
  });
  const parts = [...bySemantic.entries()]
    .slice(0, 3)
    .map(([s, n]) => (n > 1 ? `${n} ${SEMANTIC_LABELS[s as keyof typeof SEMANTIC_LABELS].toLowerCase()}s` : SEMANTIC_LABELS[s as keyof typeof SEMANTIC_LABELS].toLowerCase()));
  const range = visibleRange[1] > visible ? ` (up to ${visibleRange[1]})` : '';
  return `${visible} field${visible === 1 ? '' : 's'}${range}: ${parts.join(' + ')}`;
}

function capabilityBadges(meta: TemplateMeta): string[] {
  return meta.capabilities
    .map((id) => CAPABILITIES.find((c) => c.id === id))
    .filter((c): c is (typeof CAPABILITIES)[number] => !!c)
    .slice(0, 3)
    .map((c) => c.name);
}

/** One template card: preview still + the strict info budget of proposal §12.3. */
function ResultCard({ r, selected, onPick }: { r: BrowseResult; selected: boolean; onPick: () => void }) {
  const category = graphicCategoryById(r.meta.category);
  const familyNames = FAMILIES.filter((f) => r.meta.programmeFamilies.includes(f.id))
    .slice(0, 2)
    .map((f) => f.name);
  return (
    <button className={`wz-variant ${selected ? 'selected' : ''}`} onClick={onPick} title={r.meta.description}>
      <MiniPreview variant={r.variant} />
      <div className="wz-variant-cap">
        <strong>{r.meta.name}</strong>
        <span className="wz-style-tag" data-style={r.meta.styleFamily}>
          {STYLE_FAMILY_LABELS[r.meta.styleFamily]}
        </span>
      </div>
      <div className="wz-browse-meta">
        <span className="wz-browse-cat">
          {category.name}
          {r.meta.subtype ? ` · ${r.meta.subtype.replace(/-/g, ' ')}` : ''}
        </span>
        {familyNames.length > 0 && category.relevance !== 'all' && (
          <span className="wz-browse-fams">{familyNames.join(' · ')}</span>
        )}
        <span className="wz-browse-fields">{fieldSummary(r.meta)}</span>
        {capabilityBadges(r.meta).length > 0 && (
          <span className="wz-browse-caps">{capabilityBadges(r.meta).join(' · ')}</span>
        )}
        <span className="wz-browse-complexity">{COMPLEXITY_LABELS[r.meta.complexity]}</span>
      </div>
    </button>
  );
}

/**
 * The Browse step — the faceted Start-from-template storefront
 * (docs/TEMPLATE_TAXONOMY_PROPOSAL.md §12): search + programme format (ranking, optional) +
 * category tiles with live counts + field buckets + style, with the specialist facets under
 * More filters. Replaces the Category → Template pair for the catalog flow; filter state
 * lives in the wizard so Back returns with filters intact.
 */
export default function BrowseStep({ draft, filters, onFilters, onDraft, onPickVariant, onAi }: Props) {
  const aspect = ASPECTS.find((a) => a.id === draft.aspectId) ?? ASPECTS[0];
  const set = (patch: Partial<BrowseFilters>) => onFilters((prev) => ({ ...prev, ...patch }));

  const tiles = useMemo(() => browsableCategories(), []);
  const intensities = useMemo(() => offeredIntensities(), []);
  const structures = useMemo(() => offeredStructures(), []);
  const capabilityFilters = useMemo(() => offeredCapabilityFilters(), []);
  const outcome = useMemo(() => browseTemplates(filters), [filters]);

  const [sort, sortSet] = useState<SortMode>('relevance');
  const sortResults = (list: BrowseResult[]) =>
    sort === 'simplest'
      ? [...list].sort(
          (a, b) =>
            COMPLEXITY_RANK[a.meta.complexity] - COMPLEXITY_RANK[b.meta.complexity] ||
            a.meta.fieldCounts.visible - b.meta.fieldCounts.visible,
        )
      : list;

  const formatOptions = filters.family
    ? FORMATS.filter((f) => f.family === filters.family)
    : FORMATS;
  const selectedFormatName = FORMATS.find((f) => f.id === filters.format)?.name
    ?? FAMILIES.find((f) => f.id === filters.family)?.name;

  const activeStrict: { label: string; clear: () => void }[] = [];
  if (filters.category) {
    activeStrict.push({
      label: graphicCategoryById(filters.category).name,
      clear: () => set({ category: null }),
    });
  }
  if (filters.fieldBucket) activeStrict.push({ label: BUCKET_LABEL[filters.fieldBucket], clear: () => set({ fieldBucket: null }) });
  if (filters.style) activeStrict.push({ label: STYLE_FAMILY_LABELS[filters.style], clear: () => set({ style: null }) });
  for (const s of filters.structures) {
    activeStrict.push({ label: STRUCTURE_LABELS[s], clear: () => set({ structures: filters.structures.filter((x) => x !== s) }) });
  }
  for (const c of filters.capabilities) {
    activeStrict.push({
      label: CAPABILITIES.find((k) => k.id === c)?.name ?? c,
      clear: () => set({ capabilities: filters.capabilities.filter((x) => x !== c) }),
    });
  }
  if (filters.intensity) activeStrict.push({ label: `Motion: ${filters.intensity}`, clear: () => set({ intensity: null }) });
  const anyActive =
    activeStrict.length > 0 || filters.query.trim() !== '' || filters.family !== null || filters.format !== null;

  const relaxKey = outcome.total === 0 ? mostRestrictiveFilter(filters) : null;

  return (
    <div className="wz-browse">
      {/* Canvas format (carried over from the old Template step). */}
      <div className="wz-format row">
        <label>
          Aspect
          <select
            value={draft.aspectId}
            onChange={(e) => {
              const a = ASPECTS.find((x) => x.id === e.target.value) ?? ASPECTS[0];
              onDraft({ aspectId: a.id, resolutionLabel: a.resolutions[0].label });
            }}
          >
            {ASPECTS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </label>
        <label>
          Resolution
          <select value={draft.resolutionLabel} onChange={(e) => onDraft({ resolutionLabel: e.target.value })}>
            {aspect.resolutions.map((r) => (
              <option key={r.label} value={r.label}>{r.label}</option>
            ))}
          </select>
        </label>
        <label>
          FPS
          <select value={draft.fps} onChange={(e) => onDraft({ fps: Number(e.target.value) })}>
            {FPS_OPTIONS.map((f) => (
              <option key={f} value={f}>{f} fps</option>
            ))}
          </select>
        </label>
      </div>

      {/* Search */}
      <input
        className="wz-browse-search"
        type="search"
        placeholder="Search all templates — try “name graphic”, “countdown”, “church verse”…"
        value={filters.query}
        onChange={(e) => set({ query: e.target.value })}
        aria-label="Search templates"
      />

      {/* What are you making? (optional; ranks, never hides) */}
      <div className="wz-format row wz-browse-programme">
        <label>
          What are you making?
          <select
            value={filters.family ?? ''}
            onChange={(e) =>
              set({
                family: (e.target.value || null) as ProgrammeFamilyId | null,
                format: null,
              })
            }
          >
            <option value="">Any programme</option>
            {FAMILIES.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>
        <label>
          Specifically
          <select
            value={filters.format ?? ''}
            onChange={(e) => {
              const id = (e.target.value || null) as ProgrammeFormatId | null;
              const fam = id ? FORMATS.find((f) => f.id === id)?.family ?? filters.family : filters.family;
              set({ format: id, family: fam ?? null });
            }}
          >
            <option value="">{filters.family ? 'Whole family' : 'Any format'}</option>
            {formatOptions.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Category tiles with live counts — only categories with catalog content. */}
      <div className="wz-cat-grid wz-browse-tiles">
        {tiles.map((tile) => (
          <button
            key={tile.category}
            className={`wz-cat ${filters.category === tile.category ? 'selected' : ''}`}
            onClick={() => set({ category: filters.category === tile.category ? null : tile.category })}
          >
            <div className="wz-cat-head">
              <strong>{tile.name}</strong>
              <span className="wz-count">{tile.count}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Primary facet chips: fields + style. */}
      <div className="wz-filter-row" role="group" aria-label="Filter templates">
        {FIELD_BUCKETS.map((b) => (
          <button
            key={b}
            className={`wz-filter ${filters.fieldBucket === b ? 'active' : ''}`}
            onClick={() => set({ fieldBucket: filters.fieldBucket === b ? null : b })}
          >
            {BUCKET_LABEL[b]}
          </button>
        ))}
        <span className="wz-filter-sep" aria-hidden="true" />
        {(Object.keys(STYLE_FAMILY_LABELS) as StyleTag[]).map((t) => (
          <button
            key={t}
            className={`wz-filter ${filters.style === t ? 'active' : ''}`}
            onClick={() => set({ style: filters.style === t ? null : t })}
          >
            {STYLE_FAMILY_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Specialist facets under progressive disclosure (proposal §12.1). */}
      <details className="wz-browse-more">
        <summary>More filters</summary>
        <div className="wz-filter-row">
          {structures.map((s: StructureId) => (
            <button
              key={s}
              className={`wz-filter ${filters.structures.includes(s) ? 'active' : ''}`}
              onClick={() =>
                set({
                  structures: filters.structures.includes(s)
                    ? filters.structures.filter((x) => x !== s)
                    : [...filters.structures, s],
                })
              }
            >
              {STRUCTURE_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="wz-filter-row">
          {capabilityFilters.map((c: CapabilityId) => (
            <button
              key={c}
              className={`wz-filter ${filters.capabilities.includes(c) ? 'active' : ''}`}
              onClick={() =>
                set({
                  capabilities: filters.capabilities.includes(c)
                    ? filters.capabilities.filter((x) => x !== c)
                    : [...filters.capabilities, c],
                })
              }
            >
              {CAPABILITIES.find((k) => k.id === c)?.name ?? c}
            </button>
          ))}
        </div>
        <div className="wz-filter-row">
          {intensities.map((i: MotionIntensity) => (
            <button
              key={i}
              className={`wz-filter ${filters.intensity === i ? 'active' : ''}`}
              onClick={() => set({ intensity: filters.intensity === i ? null : i })}
            >
              Motion: {i}
            </button>
          ))}
        </div>
      </details>

      {/* Active chips + count + sort. */}
      <div className="wz-browse-bar">
        <div className="wz-browse-chips">
          {activeStrict.map((chip) => (
            <button key={chip.label} className="wz-filter active" onClick={chip.clear} title="Remove this filter">
              {chip.label} ✕
            </button>
          ))}
          {anyActive && (
            <button className="wz-filter wz-filter-clear" onClick={() => onFilters(NO_BROWSE_FILTERS)}>
              ✕ Clear all
            </button>
          )}
        </div>
        <div className="wz-browse-count">
          {outcome.total} template{outcome.total === 1 ? '' : 's'}
          <select value={sort} onChange={(e) => sortSet(e.target.value as SortMode)} aria-label="Sort results">
            <option value="relevance">Relevance</option>
            <option value="simplest">Simplest first</option>
          </select>
        </div>
      </div>

      {/* Results — sectioned when a programme is chosen (ranking, never hiding). */}
      {outcome.total > 0 ? (
        <>
          {selectedFormatName && outcome.best.length > 0 && (
            <h3 className="wz-browse-section">Best for {selectedFormatName.toLowerCase()}</h3>
          )}
          <div className="wz-variant-grid">
            {sortResults(outcome.best).map((r) => (
              <ResultCard key={r.meta.id} r={r} selected={draft.variantId === r.meta.id} onPick={() => onPickVariant(r.variant)} />
            ))}
          </div>
          {selectedFormatName && outcome.also.length > 0 && (
            <>
              <h3 className="wz-browse-section">Also works</h3>
              <div className="wz-variant-grid">
                {sortResults(outcome.also).map((r) => (
                  <ResultCard key={r.meta.id} r={r} selected={draft.variantId === r.meta.id} onPick={() => onPickVariant(r.variant)} />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="wz-browse-empty">
          <p className="hint">No template matches this combination.</p>
          {relaxKey && (
            <button className="wz-filter" onClick={() => onFilters(clearFilterKey(filters, relaxKey))}>
              Remove the most limiting filter
            </button>
          )}
          <button className="wz-filter" onClick={onAi}>
            ✦ Create it with AI instead
          </button>
        </div>
      )}
    </div>
  );
}

function clearFilterKey(filters: BrowseFilters, key: keyof BrowseFilters): BrowseFilters {
  const value = filters[key];
  return { ...filters, [key]: Array.isArray(value) ? [] : null } as BrowseFilters;
}
