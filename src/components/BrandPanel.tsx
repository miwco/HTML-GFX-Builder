import { useRef, useState } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { getCssVariable, setCssVariable } from '../blocks/cssVars';
import { appendCss, insertGraphicHtml } from '../blocks/edit';
import {
  extOf,
  fileToDataUrl,
  isFontAsset,
  isImageAsset,
  uniqueAssetPath,
} from '../assets/assetUtils';

/** A brand color managed as a CSS variable in :root. */
const BRAND_COLORS: { name: string; label: string; fallback: string }[] = [
  { name: 'brand-primary', label: 'Primary', fallback: '#3aa0ff' },
  { name: 'brand-secondary', label: 'Secondary', fallback: '#0a3d62' },
  { name: 'brand-accent', label: 'Accent', fallback: '#ffd32a' },
  { name: 'brand-text', label: 'Text', fallback: '#ffffff' },
  { name: 'brand-bg', label: 'Background', fallback: '#11151c' },
];

/** Turn a font file name into a CSS font-family name. */
function fontFamilyFromPath(path: string): string {
  const file = path.split('/').pop() || 'BrandFont';
  const dot = file.lastIndexOf('.');
  const base = dot >= 0 ? file.slice(0, dot) : file;
  return base.replace(/[^a-zA-Z0-9]+/g, ' ').trim() || 'BrandFont';
}

/**
 * Branding & assets. Brand colors are stored as :root CSS variables (code-first); uploaded
 * images/fonts become base64 data-URL assets that the preview inlines and the exporter
 * decodes to real files under assets/. Every action writes visible, readable code.
 */
export default function BrandPanel() {
  const template = useTemplateStore((s) => s.template);
  const setCss = useTemplateStore((s) => s.setCss);
  const setHtml = useTemplateStore((s) => s.setHtml);
  const addAsset = useTemplateStore((s) => s.addAsset);
  const removeAsset = useTemplateStore((s) => s.removeAsset);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);

  const fileInput = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);

  const setColor = (name: string, value: string) => {
    setCss(setCssVariable(template.css, name, value));
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const dataUrl = await fileToDataUrl(file);
      const path = uniqueAssetPath(file.name, template.assets);
      addAsset({ path, data: dataUrl });
    }
    setNote(`Added ${files.length} asset${files.length > 1 ? 's' : ''}.`);
    if (fileInput.current) fileInput.current.value = '';
  };

  const insertImage = (path: string) => {
    const cls = 'brand-image';
    const html = `  <!-- Image from ${path} -->
  <img class="${cls}" src="${path}" alt="" />`;
    setHtml(insertGraphicHtml(template.html, html));
    // Add a starter style if not present.
    if (!new RegExp(`\\.${cls}\\b`).test(template.css)) {
      setCss(appendCss(template.css, 'Brand image', `.${cls} { position: absolute; top: 80px; left: 120px; height: 160px; }`));
    }
    setNote(`Inserted <img> for ${path} (see HTML + CSS tabs).`);
  };

  const addFontFace = (path: string) => {
    const family = fontFamilyFromPath(path);
    const format = extOf(path) === 'woff2' ? 'woff2' : extOf(path) === 'woff' ? 'woff' : extOf(path) === 'otf' ? 'opentype' : 'truetype';
    const css = appendCss(
      template.css,
      `Brand font: ${family}`,
      `@font-face {
  font-family: "${family}";
  src: url("${path}") format("${format}");
  font-display: swap;
}
/* Use it: set font-family: "${family}" on body or an element, or via --brand-font. */`,
    );
    setCss(setCssVariable(css, 'brand-font', `"${family}"`));
    setNote(`Added @font-face for "${family}" + --brand-font variable.`);
  };

  const images = template.assets.filter((a) => isImageAsset(a.path));
  const fonts = template.assets.filter((a) => isFontAsset(a.path));
  const others = template.assets.filter((a) => !isImageAsset(a.path) && !isFontAsset(a.path));

  return (
    <div>
      {/* Brand colors */}
      <div className="panel-section">
        <h3>Brand colors</h3>
        <p className="hint">
          Stored as CSS variables in <code className="inline">:root</code>. Reference them in your CSS
          with <code className="inline">var(--brand-primary)</code>.
        </p>
        {BRAND_COLORS.map((c) => {
          const current = getCssVariable(template.css, c.name) || c.fallback;
          return (
            <div className="field-row" key={c.name}>
              <div className="field-meta">
                <label style={{ margin: 0 }}>{c.label}</label>
                <span className="field-id">--{c.name}</span>
              </div>
              <div className="row">
                <input
                  type="color"
                  style={{ width: 44, padding: 2 }}
                  value={/^#[0-9a-f]{6}$/i.test(current) ? current : c.fallback}
                  onChange={(e) => setColor(c.name, e.target.value)}
                />
                <input
                  className="grow"
                  value={current}
                  onChange={(e) => setColor(c.name, e.target.value)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="divider" />

      {/* Assets */}
      <div className="panel-section">
        <h3>Assets</h3>
        <p className="hint">
          Upload logos, images, and fonts. They are bundled into the exported package under{' '}
          <code className="inline">assets/</code> with relative paths.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="image/*,.woff,.woff2,.ttf,.otf"
          multiple
          onChange={(e) => onFiles(e.target.files)}
          style={{ display: 'none' }}
        />
        <button className="primary" onClick={() => fileInput.current?.click()}>
          + Upload asset
        </button>
        {note && <p className="hint" style={{ marginTop: 8 }}>{note}</p>}
      </div>

      {images.length > 0 && (
        <div className="panel-section">
          <h3>Images</h3>
          <div className="asset-grid">
            {images.map((a) => (
              <div className="asset-card" key={a.path}>
                <div className="asset-thumb">
                  <img src={typeof a.data === 'string' ? a.data : ''} alt={a.path} />
                </div>
                <div className="asset-path" title={a.path}>{a.path.replace('assets/', '')}</div>
                <div className="row" style={{ gap: 4 }}>
                  <button className="grow" onClick={() => insertImage(a.path)} title="Insert an <img> into the HTML">
                    Insert
                  </button>
                  <button onClick={() => removeAsset(a.path)} title="Remove asset">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {fonts.length > 0 && (
        <div className="panel-section">
          <h3>Fonts</h3>
          {fonts.map((a) => (
            <div className="field-row" key={a.path}>
              <div className="field-meta">
                <label style={{ margin: 0 }}>{fontFamilyFromPath(a.path)}</label>
                <span className="field-id">{a.path.replace('assets/', '')}</span>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <button className="grow" onClick={() => addFontFace(a.path)} title="Add an @font-face rule referencing this font">
                  Add @font-face
                </button>
                <button onClick={() => removeAsset(a.path)} title="Remove asset">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className="panel-section">
          <h3>Other files</h3>
          {others.map((a) => (
            <div className="row" key={a.path} style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="muted">{a.path.replace('assets/', '')}</span>
              <button onClick={() => removeAsset(a.path)} title="Remove asset">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="divider" />
      <p className="hint">
        Tip: after inserting an image or font, switch to the{' '}
        <button className="link-btn" onClick={() => setActiveTab('css')}>CSS</button> /{' '}
        <button className="link-btn" onClick={() => setActiveTab('html')}>HTML</button> tab to see and
        refine the generated code.
      </p>
    </div>
  );
}
