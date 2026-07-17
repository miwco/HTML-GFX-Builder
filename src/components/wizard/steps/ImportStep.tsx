import { useRef, useState } from 'react';
import { CATEGORIES, type TemplateCategory } from '../../../model/wizard';
import type { AssetFile } from '../../../model/types';
import { fileToDataUrl, isImageAsset, uniqueAssetPath } from '../../../assets/assetUtils';
import { isTemplateFile } from '../../../model/importTemplate';

interface Props {
  images: AssetFile[];
  onImages: (images: AssetFile[]) => void;
  onContinue: (category: TemplateCategory) => void;
  /** An .html / .zip template import — resolves to an error message, or null on success. */
  onTemplateFile: (file: File) => Promise<string | null>;
}

/**
 * "Import" — two flows in one drop zone:
 *   - images: they become template assets and the wizard continues with logo-slot
 *     designs first and your first image pre-placed;
 *   - an existing template (.html or SPX-style .zip): split into the editor panes to
 *     edit — or just re-export it as SPX / CasparCG / OGraf.
 */
export default function ImportStep({ images, onImages, onContinue, onTemplateFile }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [category, setCategory] = useState<TemplateCategory>('lower-third');
  const [error, setError] = useState<string | null>(null);

  const addFiles = async (files: FileList | File[]) => {
    setError(null);
    const template = Array.from(files).find(isTemplateFile);
    if (template) {
      // A template import takes over the whole flow (the wizard closes on success).
      setError(await onTemplateFile(template));
      return;
    }
    const next = [...images];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await fileToDataUrl(file);
      next.push({ path: uniqueAssetPath(file.name, next), data: dataUrl });
    }
    onImages(next);
  };

  return (
    <div>
      <div
        className={`wz-drop ${dragOver ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void addFiles(e.dataTransfer.files); }}
        onClick={() => fileInput.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={fileInput}
          type="file"
          accept="image/*,.html,.htm,.zip"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ''; }}
        />
        <strong>Drop images — or an existing template — here</strong>
        <span className="hint">
          Images (logos work best as PNG with transparency) start a new design around them.
          An <code className="inline">.html</code> file or an SPX-style{' '}
          <code className="inline">.zip</code> opens as editable code — fix it up (the AI panel's
          "Make SPX-ready" helps) or just re-export it as SPX / CasparCG / OGraf.
        </span>
      </div>

      {error && <p className="status-bad" style={{ marginTop: 10 }}>✗ {error}</p>}

      {images.length > 0 && (
        <div className="asset-grid" style={{ marginTop: 14 }}>
          {images.filter((a) => isImageAsset(a.path)).map((a) => (
            <div className="asset-card" key={a.path}>
              <div className="asset-thumb">
                <img src={typeof a.data === 'string' ? a.data : ''} alt={a.path} />
              </div>
              <div className="asset-path" title={a.path}>{a.path.replace('assets/', '')}</div>
              <button onClick={() => onImages(images.filter((x) => x.path !== a.path))}>✕ Remove</button>
            </div>
          ))}
        </div>
      )}

      <div className="panel-section" style={{ marginTop: 18 }}>
        <h3>What are you making with these?</h3>
        <select value={category} onChange={(e) => setCategory(e.target.value as TemplateCategory)}>
          {/* 'imported' is not something you make WITH an image — it IS the image (the
              Import graphic entry). See CategoryInfo.group. */}
          {CATEGORIES.filter((c) => c.group !== 'imported').map((c) => (
            <option key={c.id} value={c.id} disabled={!c.available}>
              {c.name}{c.available ? '' : ' — coming soon'}
            </option>
          ))}
        </select>
        <p className="hint" style={{ marginTop: 6 }}>
          Designs with a logo slot are shown first; your first image is placed automatically.
        </p>
      </div>

      <button className="primary" disabled={images.length === 0} onClick={() => onContinue(category)}>
        Continue with {images.length} image{images.length === 1 ? '' : 's'} ›
      </button>
    </div>
  );
}
