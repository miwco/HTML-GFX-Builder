import { ASPECTS, FPS_OPTIONS } from '../../../model/types';
import type { TemplateVariant } from '../../../model/wizard';
import MiniPreview from '../MiniPreview';
import type { DraftPatch, WizardDraft } from '../draft';

interface Props {
  variants: TemplateVariant[];
  draft: WizardDraft;
  onDraft: (patch: DraftPatch) => void;
  onPickVariant: (variant: TemplateVariant) => void;
}

const STYLE_LABEL = { minimal: 'Minimal', sport: 'Sport', glass: 'Glass' } as const;

/** Step 2 — pick the design (plus canvas format). */
export default function TemplateStep({ variants, draft, onDraft, onPickVariant }: Props) {
  const aspect = ASPECTS.find((a) => a.id === draft.aspectId) ?? ASPECTS[0];

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

      {/* Variant cards */}
      <div className="wz-variant-grid">
        {variants.map((v) => (
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
    </div>
  );
}
