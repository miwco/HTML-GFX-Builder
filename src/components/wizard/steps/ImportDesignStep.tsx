import { useRef, useState } from 'react';
import type { AssetFile, Resolution } from '../../../model/types';
import type { DesignArt } from '../../../model/wizard';
import { fileToDataUrl, uniqueAssetPath } from '../../../assets/assetUtils';

interface Props {
  art: DesignArt | null;
  images: AssetFile[];
  resolution: Resolution;
  onArt: (art: DesignArt, images: AssetFile[]) => void;
  onClear: () => void;
  onContinue: () => void;
}

/**
 * "Import graphic", step 1 — bring in the finished artwork.
 *
 * ONE image, and it IS the design (not a logo dropped into someone else's template). Its
 * natural size is MEASURED here rather than assumed: it decides the graphic's size, whether
 * the design covers the frame or floats inside it, and where the text defaults land. Guessing
 * any of that would put the user's artwork somewhere they didn't draw it.
 */
export default function ImportDesignStep({ art, images, resolution, onArt, onClear, onContinue }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = art ? images.find((a) => a.path === art.path) : null;
  const fullFrame = !!art && art.width === resolution.width && art.height === resolution.height;

  /** The artwork's real pixel size — an <img> is the only thing that actually knows it. */
  const measure = (dataUrl: string) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('That file could not be read as an image.'));
      img.src = dataUrl;
    });

  const take = async (files: FileList | File[]) => {
    setError(null);
    const file = Array.from(files).find((f) => f.type.startsWith('image/'));
    if (!file) {
      setError('That is not an image. Bring in the finished design as a PNG (transparency is kept).');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      const size = await measure(dataUrl);
      // One design per graphic: a second drop REPLACES the artwork rather than piling up.
      const asset: AssetFile = { path: uniqueAssetPath(file.name, []), data: dataUrl };
      onArt({ path: asset.path, ...size }, [asset]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <div
        className={`wz-drop ${dragOver ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void take(e.dataTransfer.files); }}
        onClick={() => fileInput.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files) void take(e.target.files); e.target.value = ''; }}
        />
        <strong>Drop your finished design here</strong>
        <span className="hint">
          The image you already made — a PNG with transparency keeps everything behind it
          visible on air. It becomes the graphic itself; you add the text next.
        </span>
      </div>

      {error && <p className="status-bad" style={{ marginTop: 10 }}>✗ {error}</p>}

      {art && preview && (
        <div className="panel-section" style={{ marginTop: 16 }}>
          <h3>Your design</h3>
          <div className="asset-card" style={{ maxWidth: 320 }}>
            <div className="asset-thumb">
              <img src={typeof preview.data === 'string' ? preview.data : ''} alt={art.path} />
            </div>
            <div className="asset-path" title={art.path}>{art.path.replace('images/', '')}</div>
            <div className="hint mono" style={{ marginBottom: 6 }}>{art.width} × {art.height}</div>
            <button onClick={onClear}>✕ Use a different design</button>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            {fullFrame
              ? `Frame-sized (${resolution.width} × ${resolution.height}) — it will sit exactly where you drew it, edge to edge.`
              : `Smaller than the ${resolution.width} × ${resolution.height} frame, so it is placed as an object you can position and resize.`}
          </p>
        </div>
      )}

      <div className="panel-section" style={{ marginTop: 14 }}>
        <h3>What happens next</h3>
        <p className="hint">
          You place editable text fields on the design, style them to match it, then choose how
          the whole graphic animates in and out. Your artwork is never redrawn or regenerated —
          NoaCG only adds the broadcast behaviour around it, and exports it as a working template.
        </p>
      </div>

      <button className="primary" disabled={!art} onClick={onContinue}>
        Add text fields ›
      </button>
    </div>
  );
}
