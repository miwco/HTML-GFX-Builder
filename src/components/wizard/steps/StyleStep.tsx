import { FONTS } from '../../../model/fonts';
import { PALETTES, type TemplateVariant, type Zone9 } from '../../../model/wizard';
import type { DraftPatch, WizardDraft } from '../draft';

interface Props {
  variant: TemplateVariant;
  draft: WizardDraft;
  onDraft: (patch: DraftPatch) => void;
}

const ZONES: Zone9[] = [
  'top-left', 'top-center', 'top-right',
  'mid-left', 'mid-center', 'mid-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

const SIZES: { label: string; scale: number }[] = [
  { label: 'S', scale: 0.85 },
  { label: 'M', scale: 1 },
  { label: 'L', scale: 1.2 },
];

/** Step 4 — colors, font, size, and position. */
export default function StyleStep({ variant, draft, onDraft }: Props) {
  // The variant's own style family first, then the rest.
  const palettes = [...PALETTES].sort(
    (a, b) => Number(b.styleTags.includes(variant.styleTag)) - Number(a.styleTags.includes(variant.styleTag)),
  );
  const fonts = [...FONTS].sort(
    (a, b) => Number(b.styleTags.includes(variant.styleTag)) - Number(a.styleTags.includes(variant.styleTag)),
  );
  const activePalette = draft.paletteId ?? variant.defaultPalette.id;
  const activeFont = draft.fontId ?? variant.defaultFontId;
  const activeZone = draft.zone ?? variant.defaultZone;

  return (
    <div>
      <div className="panel-section">
        <h3>Palette <span className="muted">(one accent + neutrals — retint anytime via the CSS variables)</span></h3>
        <div className="wz-palettes">
          {palettes.map((p) => (
            <button
              key={p.id}
              className={`wz-palette ${activePalette === p.id ? 'selected' : ''}`}
              onClick={() => onDraft({ paletteId: p.id })}
              title={p.name}
            >
              <span className="wz-swatch" style={{ background: p.panel }}>
                <span className="wz-swatch-accent" style={{ background: p.accent }} />
              </span>
              <span className="wz-palette-name">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3>Font <span className="muted">(bundled, open-license — ships with the export)</span></h3>
        <div className="wz-fonts">
          {fonts.map((f) => (
            <button
              key={f.id}
              className={`wz-font ${activeFont === f.id ? 'selected' : ''}`}
              onClick={() => onDraft({ fontId: f.id })}
              title={f.blurb}
            >
              <span className="wz-font-sample" style={{ fontFamily: `"${f.family}", ${f.fallback}` }}>Ag</span>
              <span>
                <strong>{f.family}</strong>
                <span className="hint">{f.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
        <div className="panel-section">
          <h3>Size</h3>
          <div className="row" style={{ gap: 6 }}>
            {SIZES.map((s) => (
              <button
                key={s.label}
                className={draft.sizeScale === s.scale ? 'active' : ''}
                onClick={() => onDraft({ sizeScale: s.scale })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h3>Position <span className="muted">(zones snap to safe areas)</span></h3>
          <div className="wz-zones">
            {ZONES.map((z) => (
              <button
                key={z}
                className={`wz-zone ${activeZone === z ? 'selected' : ''}`}
                onClick={() => onDraft({ zone: z })}
                title={z}
              />
            ))}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <label className="wz-nudge">
              Nudge X
              <input
                type="number"
                value={draft.nudge.x}
                onChange={(e) => onDraft({ nudge: { x: Number(e.target.value) || 0 } })}
              />
            </label>
            <label className="wz-nudge">
              Nudge Y
              <input
                type="number"
                value={draft.nudge.y}
                onChange={(e) => onDraft({ nudge: { y: Number(e.target.value) || 0 } })}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
