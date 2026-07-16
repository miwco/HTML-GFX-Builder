import { useMemo, useState } from 'react';
import { ASPECTS, FPS_OPTIONS } from '../../../model/types';
import type { StyleTag } from '../../../model/fonts';
import type { TemplateVariant } from '../../../model/wizard';
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
  style: StyleTag | null;
  logo: boolean;
  manyLines: boolean;
}

const NO_FILTERS: Filters = { style: null, logo: false, manyLines: false };

function matches(v: TemplateVariant, f: Filters): boolean {
  if (f.style && v.styleTag !== f.style) return false;
  if (f.logo && v.logo === 'none') return false;
  if (f.manyLines && v.maxLines < 3) return false;
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

  const filtered = variants.filter((v) => matches(v, filters));
  const active = filters.style !== null || filters.logo || filters.manyLines;

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

      {/* Discovery filters — style family, logo capability, line capacity. */}
      {(styleTags.length > 1 || anyLogo || anyManyLines) && (
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
