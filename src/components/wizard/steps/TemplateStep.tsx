import { useMemo, useState } from 'react';
import { ASPECTS, FPS_OPTIONS } from '../../../model/types';
import type { StyleTag } from '../../../model/fonts';
import {
  ROLE_LABELS,
  ROLE_TAGS,
  variantMatchesQuery,
  type RoleTag,
  type TemplateVariant,
} from '../../../model/wizard';
import MiniPreview from '../MiniPreview';
import type { DraftPatch, WizardDraft } from '../draft';

interface Props {
  variants: TemplateVariant[];
  draft: WizardDraft;
  onDraft: (patch: DraftPatch) => void;
  onPickVariant: (variant: TemplateVariant) => void;
}

const STYLE_LABEL = { minimal: 'Minimal', sport: 'Sport', glass: 'Glass', noacg: 'NoaCG' } as const;

/** The discovery filters — every facet derives from variant metadata, so a new
 *  template family inherits filtering with no extra code. Ephemeral UI state
 *  (not part of the draft): re-entering the step starts from the full catalog. */
interface Filters {
  /** The PRODUCTION facet: what show this is for. Answered before style, because that is
   *  the order someone actually knows things in — "I run a church stream" comes to mind
   *  long before "I want a minimal design". */
  role: RoleTag | null;
  style: StyleTag | null;
  logo: boolean;
  manyLines: boolean;
  /** Free text over name, description, role, keywords and field labels. */
  query: string;
}

const NO_FILTERS: Filters = { role: null, style: null, logo: false, manyLines: false, query: '' };

function matches(v: TemplateVariant, f: Filters): boolean {
  if (f.role && v.roleTag !== f.role) return false;
  if (f.style && v.styleTag !== f.style) return false;
  if (f.logo && v.logo === 'none') return false;
  if (f.manyLines && v.maxLines < 3) return false;
  if (!variantMatchesQuery(v, f.query)) return false;
  return true;
}

/** Step 2 — pick the design (plus canvas format), narrowed by practical filters. */
export default function TemplateStep({ variants, draft, onDraft, onPickVariant }: Props) {
  const aspect = ASPECTS.find((a) => a.id === draft.aspectId) ?? ASPECTS[0];
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  // Only offer chips that can actually narrow THIS category's catalog.
  const styleTags = useMemo(
    () => (['minimal', 'sport', 'glass', 'noacg'] as StyleTag[]).filter((t) => variants.some((v) => v.styleTag === t)),
    [variants],
  );
  const anyLogo = variants.some((v) => v.logo !== 'none');
  const anyManyLines = variants.some((v) => v.maxLines >= 3) && variants.some((v) => v.maxLines < 3);

  // Only the productions this category actually ships a design for, in the registry's order.
  const roleTags = useMemo(
    () => ROLE_TAGS.filter((t) => variants.some((v) => v.roleTag === t)),
    [variants],
  );

  const filtered = variants.filter((v) => matches(v, filters));
  const active =
    filters.role !== null ||
    filters.style !== null ||
    filters.logo ||
    filters.manyLines ||
    filters.query.trim() !== '';

  return (
    <div>
      {/* Canvas format */}
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

      {/* Free-text search — the fastest route once the catalog is bigger than a screen.
          One shared predicate with the insert dialog (model/wizard variantMatchesQuery), so
          the two surfaces can never disagree about what a word matches. */}
      <div className="wz-search-row">
        <input
          className="wz-search"
          type="search"
          value={filters.query}
          placeholder="Search designs — a role, a show, a field (“caster”, “scripture”, “squad number”)"
          aria-label="Search designs"
          data-testid="wz-search"
          onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
        />
      </div>

      {/* The PRODUCTION facet, in its own row above the look facets: a user knows what show
          they are making long before they know which style family they want. */}
      {roleTags.length > 0 && (
        <div className="wz-role-row" role="group" aria-label="Filter by production">
          {roleTags.map((t) => (
            <button
              key={t}
              className={`wz-rolechip ${filters.role === t ? 'active' : ''}`}
              onClick={() => setFilters((f) => ({ ...f, role: f.role === t ? null : t }))}
              title={`Designs drawn for ${ROLE_LABELS[t].toLowerCase()}`}
              data-testid={`wz-role-${t}`}
            >
              {ROLE_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {/* Discovery filters — style family, logo capability, line capacity. The row also
          renders when any facet is active, so Clear is reachable in a category whose only
          live facets are the role chips and the search box. */}
      {(styleTags.length > 1 || anyLogo || anyManyLines || active) && (
        <div className="wz-filter-row" role="group" aria-label="Filter templates">
          {styleTags.length > 1 &&
            styleTags.map((t) => (
              <button
                key={t}
                className={`wz-filter ${filters.style === t ? 'active' : ''}`}
                onClick={() => setFilters((f) => ({ ...f, style: f.style === t ? null : t }))}
                title={`Only ${STYLE_LABEL[t]} designs`}
              >
                {STYLE_LABEL[t]}
              </button>
            ))}
          {anyLogo && (
            <button
              className={`wz-filter ${filters.logo ? 'active' : ''}`}
              onClick={() => setFilters((f) => ({ ...f, logo: !f.logo }))}
              title="Only designs with a logo slot (built-in or optional)"
            >
              ◨ Logo slot
            </button>
          )}
          {anyManyLines && (
            <button
              className={`wz-filter ${filters.manyLines ? 'active' : ''}`}
              onClick={() => setFilters((f) => ({ ...f, manyLines: !f.manyLines }))}
              title="Only designs that take three or more text lines"
            >
              ☰ 3+ lines
            </button>
          )}
          {active && (
            <button className="wz-filter wz-filter-clear" onClick={() => setFilters(NO_FILTERS)}>
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {/* Variant cards */}
      <div className="wz-variant-grid">
        {filtered.map((v) => (
          <button
            key={v.id}
            className={`wz-variant ${draft.variantId === v.id ? 'selected' : ''}`}
            onClick={() => onPickVariant(v)}
            title={v.description}
          >
            <MiniPreview variant={v} />
            <div className="wz-variant-cap">
              <strong>{v.name}</strong>
              <span className="wz-style-tag" data-style={v.styleTag}>{STYLE_LABEL[v.styleTag]}</span>
            </div>
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="hint wz-filter-empty">
          No design matches these filters.{' '}
          <button className="wz-filter" onClick={() => setFilters(NO_FILTERS)}>Clear filters</button>
        </p>
      )}
    </div>
  );
}
