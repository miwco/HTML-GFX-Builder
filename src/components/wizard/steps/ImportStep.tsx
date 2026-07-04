import { useRef, useState } from 'react';
import { CATEGORIES, type TemplateCategory } from '../../../model/wizard';
import type { AssetFile } from '../../../model/types';
import { fileToDataUrl, isImageAsset, uniqueAssetPath } from '../../../assets/assetUtils';

interface Props {
  images: AssetFile[];
  onImages: (images: AssetFile[]) => void;
  onContinue: (category: TemplateCategory) => void;
}

/**
 * "Import graphics" — drop in your logos/images first, then pick what you're making.
 * The images become template assets; the wizard continues with logo-slot designs first
 * and your first image pre-placed in the slot.
 */
export default function ImportStep({ images, onImages, onContinue }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [category, setCategory] = useState<TemplateCategory>('lower-third');

  const addFiles = async (files: FileList | File[]) => {
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
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ''; }}
        />
        <strong>Drop images here</strong>
        <span className="hint">…or click to browse. Logos work best as PNG with transparency.</span>
      </div>

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
          {CATEGORIES.map((c) => (
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
