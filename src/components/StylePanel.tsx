import { useRef, useState } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { getCssVariable, listCssVariables, setCssVariable } from '../blocks/cssVars';
import { setCssDeclaration } from '../blocks/edit';
import {
  FONTS,
  customFontFaceCss,
  customFontStack,
  familyFromFileName,
  fontFaceCss,
  fontFormatForExt,
  fontStack,
  registerAppFont,
} from '../model/fonts';
import type { Zone9 } from '../model/wizard';
import { detectPrefix } from '../model/structure';
import { zoneDecls } from '../templates/lowerThirds/shared';
import { fileToDataUrl } from '../assets/assetUtils';

/** rgb()/rgba()/#hex → #rrggbb for the color input swatch; non-colors return null. */
function toHex(value: string): string | null {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return '#' + value.slice(1).split('').map((c) => c + c).join('');
  }
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b] = m[1].split(',').map((n) => parseInt(n.trim(), 10));
  const h = (n: number) => Math.max(0, Math.min(255, n || 0)).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function looksLikeColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) || /^(rgb|rgba|hsl|hsla)\(/i.test(value);
}

const ZONES: Zone9[] = [
  'top-left', 'top-center', 'top-right',
  'mid-left', 'mid-center', 'mid-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

/**
 * The live Style panel. Reads the template's :root style contract straight from the code
 * and writes deterministic patches back (CSS variables, @font-face swap, root position).
 * Works on any template that keeps its :root variables — hand edits elsewhere are safe.
 */
export default function StylePanel() {
  const template = useTemplateStore((s) => s.template);
  const setCss = useTemplateStore((s) => s.patchCss);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const addAsset = useTemplateStore((s) => s.addAsset);
  const fontInput = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);

  const vars = listCssVariables(template.css);
  const colorVars = vars.filter((v) => looksLikeColor(v.value) || toHex(v.value) !== null);
  const scaleVar = vars.find((v) => v.name === 'scale');
  const typeScaleVar = vars.find((v) => v.name === 'type-scale');

  // The generated @font-face block is swappable while its marker comment survives
  // (bundled or imported — both carry a recognizable marker).
  const FONT_BLOCK_RE = /\/\* (?:Bundled open-source|Imported) font[\s\S]*?\}/;
  const canSwapFont = FONT_BLOCK_RE.test(template.css);
  const currentFamily = (template.css.match(/font-family:\s*"([^"]+)"/) || [])[1];

  // Position editing needs the standard structure root (`.{prefix}` with a rule to patch).
  const prefix = detectPrefix(template.html);
  const rootSelector = prefix ? `.${prefix}` : null;
  const canPosition =
    rootSelector !== null && new RegExp(`\\.${prefix}\\s*\\{`).test(template.css);

  const setVar = (name: string, value: string) => {
    setCss(setCssVariable(template.css, name, value));
    setActiveTab('css'); // show the changed line in the editor
  };

  const swapFont = (fontId: string) => {
    const font = FONTS.find((f) => f.id === fontId);
    if (!font) return;
    let css = template.css.replace(FONT_BLOCK_RE, fontFaceCss(font));
    if (getCssVariable(css, 'font-heading')) css = setCssVariable(css, 'font-heading', fontStack(font));
    setCss(css);
    setNote(`Font switched to ${font.family} (see the @font-face rule in the CSS).`);
  };

  /** Import a font file post-creation: embed as an asset + swap the marked @font-face. */
  const importFont = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    const family = familyFromFileName(file.name);
    const ext = file.name.split('.').pop() ?? 'woff2';
    const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-') || 'font';
    const custom = {
      family,
      format: fontFormatForExt(ext),
      asset: { path: `fonts/${base}.${ext.toLowerCase()}`, data: dataUrl },
    };
    registerAppFont(family, dataUrl);
    addAsset(custom.asset);
    let css = template.css.replace(FONT_BLOCK_RE, customFontFaceCss(custom));
    if (getCssVariable(css, 'font-heading')) css = setCssVariable(css, 'font-heading', customFontStack(custom));
    setCss(css);
    setNote(`Imported "${family}" — embedded in the template and its export (see the @font-face rule).`);
  };

  const setZone = (zone: Zone9) => {
    if (!rootSelector) return;
    let css = template.css;
    for (const d of zoneDecls(zone, { x: 0, y: 0 }, template.resolution)) {
      css = setCssDeclaration(css, rootSelector, d.prop, d.value);
    }
    setCss(css);
    setNote(`Moved to ${zone} (see the ${rootSelector} rule in the CSS).`);
  };

  return (
    <div>
      <div className="panel-section">
        <h3>Colors</h3>
        {colorVars.length === 0 && (
          <p className="hint">
            No <code className="inline">:root</code> color variables found. Wizard-made templates
            keep their palette here; you can add your own, e.g.{' '}
            <code className="inline">--accent: #3aa0ff;</code>
          </p>
        )}
        {colorVars.map((v) => {
          const hex = toHex(v.value);
          return (
            <div className="field-row" key={v.name}>
              <div className="field-meta">
                <label style={{ margin: 0 }}>{v.name.replace(/-/g, ' ')}</label>
                <span className="field-id">--{v.name}</span>
              </div>
              <div className="row">
                {hex && (
                  <input
                    type="color"
                    style={{ width: 44, padding: 2 }}
                    value={hex}
                    onChange={(e) => setVar(v.name, e.target.value)}
                  />
                )}
                <input className="grow" value={v.value} onChange={(e) => setVar(v.name, e.target.value)} />
              </div>
            </div>
          );
        })}
      </div>

      {scaleVar && (
        <div className="panel-section">
          <h3>Size</h3>
          <div className="row" style={{ gap: 6 }}>
            {[{ l: 'S', s: 0.85 }, { l: 'M', s: 1 }, { l: 'L', s: 1.2 }].map(({ l, s }) => {
              const resFactor = Math.min(template.resolution.width / 1920, template.resolution.height / 1080);
              return (
                <button key={l} onClick={() => setVar('scale', String(+(s * resFactor).toFixed(3)))}>
                  {l}
                </button>
              );
            })}
            <input
              className="grow"
              value={scaleVar.value}
              onChange={(e) => setVar('scale', e.target.value)}
              title="--scale multiplies every size in the design"
            />
          </div>
        </div>
      )}

      {typeScaleVar && (
        <div className="panel-section">
          <h3>Text size</h3>
          <div className="row" style={{ gap: 6 }}>
            {/* A raw multiplier on top of --scale — resolution is already folded into --scale. */}
            {[{ l: 'S', s: 0.9 }, { l: 'M', s: 1 }, { l: 'L', s: 1.15 }].map(({ l, s }) => (
              <button key={l} onClick={() => setVar('type-scale', String(s))}>
                {l}
              </button>
            ))}
            <input
              className="grow"
              value={typeScaleVar.value}
              onChange={(e) => setVar('type-scale', e.target.value)}
              title="--type-scale multiplies only the text sizes (the graphic keeps its size)"
            />
          </div>
        </div>
      )}

      {canSwapFont && (
        <div className="panel-section">
          <h3>Font</h3>
          <div className="wz-fonts">
            {FONTS.map((f) => (
              <button
                key={f.id}
                className={`wz-font ${currentFamily === f.family ? 'selected' : ''}`}
                onClick={() => swapFont(f.id)}
                title={f.blurb}
              >
                <span className="wz-font-sample" style={{ fontFamily: `"${f.family}", ${f.fallback}` }}>Ag</span>
                <span><strong>{f.family}</strong></span>
              </button>
            ))}
          </div>
          <input
            ref={fontInput}
            type="file"
            accept=".woff2,.woff,.ttf,.otf"
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files?.[0]) void importFont(e.target.files[0]); e.target.value = ''; }}
          />
          <button style={{ marginTop: 8 }} onClick={() => fontInput.current?.click()}>
            ⬆ Import font… <span className="muted">(embedded in template + export)</span>
          </button>
        </div>
      )}

      {canPosition && (
        <div className="panel-section">
          <h3>Position</h3>
          <div className="wz-zones">
            {ZONES.map((z) => (
              <button key={z} className="wz-zone" onClick={() => setZone(z)} title={z} />
            ))}
          </div>
          <p className="hint" style={{ marginTop: 6 }}>
            Zones snap to safe areas and rewrite the <code className="inline">{rootSelector}</code>{' '}
            rule. Fine-tune the pixel values in the CSS tab.
          </p>
        </div>
      )}

      {note && <p className="hint">{note}</p>}
    </div>
  );
}
