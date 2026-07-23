import { useRef } from 'react';
import { FONTS, familyFromFileName, fontFormatForExt, registerAppFont } from '../../../model/fonts';
import { PALETTES, paletteById, type Palette, type TemplateVariant, type Zone9 } from '../../../model/wizard';
import { fileToDataUrl } from '../../../assets/assetUtils';
import type { DraftPatch, WizardDraft } from '../draft';

/** A safe relative path for an imported font file (fonts/<sanitized>.<ext>). */
function fontAssetPath(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const base = (dot >= 0 ? fileName.slice(0, dot) : fileName).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'font';
  const ext = dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : 'woff2';
  return `fonts/${base}.${ext}`;
}

interface Props {
  variant: TemplateVariant;
  draft: WizardDraft;
  onDraft: (patch: DraftPatch) => void;
}

/** #rrggbb for the native color input; rgba()/other values fall back to a neutral swatch.
 *  Shared with the AI step's brand-colour rows (steps/ai/MoreControlPanel) — one conversion,
 *  so a colour swatch means the same thing wherever the user picks one. */
export function pickerHex(value: string): string {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const m = value.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return '#888888';
  const h = (n: string) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0');
  return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
}

const CUSTOM_KEYS: { key: 'accent' | 'text' | 'textDim' | 'panel'; label: string; hint: string }[] = [
  { key: 'accent', label: 'Accent', hint: 'the one highlight color' },
  { key: 'text', label: 'Text', hint: 'primary text' },
  { key: 'textDim', label: 'Text dim', hint: 'secondary line' },
  { key: 'panel', label: 'Panel', hint: 'box background — rgba() works' },
];

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

// Text sizes ride ON TOP of the graphic size (--type-scale × --scale), so the range is
// tighter — L text on an L graphic must still sit comfortably inside its panel.
const TYPE_SIZES: { label: string; scale: number }[] = [
  { label: 'S', scale: 0.9 },
  { label: 'M', scale: 1 },
  { label: 'L', scale: 1.15 },
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
  const custom = draft.customPalette;
  const activePalette = custom ? 'custom' : draft.paletteId ?? variant.defaultPalette.id;
  const activeFont = draft.fontId ?? variant.defaultFontId;
  const activeZone = draft.zone ?? variant.defaultZone;
  const fontInput = useRef<HTMLInputElement>(null);

  /** Import a font file: embed it as a data-URL asset and select it. */
  const importFont = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    const family = familyFromFileName(file.name);
    const ext = file.name.split('.').pop() ?? 'woff2';
    registerAppFont(family, dataUrl); // so the picker + preview host can render it
    onDraft({
      customFont: { family, format: fontFormatForExt(ext), asset: { path: fontAssetPath(file.name), data: dataUrl } },
      fontId: 'custom',
    });
  };

  /** Rename the imported font (updates the generated @font-face family). */
  const renameCustomFont = (family: string) => {
    if (!draft.customFont) return;
    if (typeof draft.customFont.asset.data === 'string') registerAppFont(family, draft.customFont.asset.data);
    onDraft({ customFont: { ...draft.customFont, family } });
  };

  /** Start customizing from whatever palette is currently active. */
  const startCustom = () => {
    const base = draft.paletteId ? paletteById(draft.paletteId) : variant.defaultPalette;
    onDraft({ customPalette: { ...base, id: 'custom', name: 'Custom' }, paletteId: null });
  };

  const setCustom = (key: (typeof CUSTOM_KEYS)[number]['key'], value: string) => {
    if (!custom) return;
    onDraft({ customPalette: { ...custom, [key]: value } as Palette });
  };

  return (
    <div>
      <div className="panel-section">
        <h3>Palette <span className="muted">(one accent + neutrals — retint anytime via the CSS variables)</span></h3>
        <div className="wz-palettes">
          {palettes.map((p) => (
            <button
              key={p.id}
              className={`wz-palette ${activePalette === p.id ? 'selected' : ''}`}
              onClick={() => onDraft({ paletteId: p.id, customPalette: null })}
              title={p.name}
            >
              <span className="wz-swatch" style={{ background: p.panel }}>
                <span className="wz-swatch-accent" style={{ background: p.accent }} />
              </span>
              <span className="wz-palette-name">{p.name}</span>
            </button>
          ))}
          <button
            className={`wz-palette ${activePalette === 'custom' ? 'selected' : ''}`}
            onClick={startCustom}
            title="Your own colors"
            data-palette="custom"
          >
            <span className="wz-swatch wz-swatch-custom">
              <span className="wz-swatch-accent" style={{ background: custom?.accent ?? '#e8c547' }} />
            </span>
            <span className="wz-palette-name">Custom</span>
          </button>
        </div>

        {custom && (
          <div className="wz-custom-colors">
            {CUSTOM_KEYS.map(({ key, label, hint }) => (
              <div className="field-row" key={key}>
                <div className="field-meta">
                  <label style={{ margin: 0 }}>{label}</label>
                  <span className="field-id">{hint}</span>
                </div>
                <div className="row">
                  <input
                    type="color"
                    style={{ width: 44, padding: 2 }}
                    value={pickerHex(custom[key])}
                    onChange={(e) => setCustom(key, e.target.value)}
                  />
                  <input
                    className="grow"
                    value={custom[key]}
                    onChange={(e) => setCustom(key, e.target.value)}
                    placeholder="#hex or rgba(…)"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-section">
        <h3>Font <span className="muted">(every font — bundled or imported — ships inside the export)</span></h3>
        <div className="wz-fonts">
          {draft.customFont && (
            <button
              className={`wz-font ${activeFont === 'custom' ? 'selected' : ''}`}
              onClick={() => onDraft({ fontId: 'custom' })}
              title="Your imported font (embedded in the template)"
            >
              <span className="wz-font-sample" style={{ fontFamily: `"${draft.customFont.family}", Arial, sans-serif` }}>Ag</span>
              <span>
                <strong>{draft.customFont.family}</strong>
                <span className="hint">Yours — embedded in the template + export.</span>
              </span>
            </button>
          )}
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
        <div className="row" style={{ gap: 8, marginTop: 10, alignItems: 'center' }}>
          <input
            ref={fontInput}
            type="file"
            accept=".woff2,.woff,.ttf,.otf"
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files?.[0]) void importFont(e.target.files[0]); e.target.value = ''; }}
          />
          <button onClick={() => fontInput.current?.click()}>⬆ Import font…</button>
          {draft.customFont && activeFont === 'custom' && (
            <input
              className="grow"
              value={draft.customFont.family}
              onChange={(e) => renameCustomFont(e.target.value)}
              title="Font name used in the generated CSS"
            />
          )}
        </div>
      </div>

      <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
        <div className="panel-section">
          <h3>Graphic size <span className="muted">(the whole graphic)</span></h3>
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
          <h3>Text size <span className="muted">(type only)</span></h3>
          <div className="row" style={{ gap: 6 }}>
            {TYPE_SIZES.map((s) => (
              <button
                key={s.label}
                className={draft.typeScale === s.scale ? 'active' : ''}
                onClick={() => onDraft({ typeScale: s.scale })}
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
