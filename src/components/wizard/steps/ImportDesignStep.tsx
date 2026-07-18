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
}

/**
 * "Import graphic", step 1 — bring in the finished artwork.
 *
 * ONE image, and it IS the design (not a logo dropped into someone else's template). Its
 * natural size is MEASURED here rather than assumed: it decides the graphic's size, whether
 * the design covers the frame or floats inside it, and where the text defaults land. Guessing
 * any of that would put the user's artwork somewhere they didn't draw it.
 */
export default function ImportDesignStep({ art, images, resolution, onArt, onClear }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = art ? images.find((a) => a.path === art.path) : null;
  const fullFrame = !!art && art.width === resolution.width && art.height === resolution.height;
  const scaled = !!art && art.sourceWidth != null;

  /** The artwork's real pixel size — an <img> is the only thing that actually knows it. */
  const measure = (dataUrl: string) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('That file could not be read as an image.'));
      img.src = dataUrl;
    });

  /**
   * The design-space size: artwork larger than the frame is scaled down to FIT it, because a
   * larger file is almost always the same design exported at higher resolution (a 2× / retina
   * export), and placing it at natural size would push most of it off the frame. The file keeps
   * every pixel — only the display size shrinks — and the real size is kept for the summary.
   */
  const fitToFrame = (size: { width: number; height: number }): Omit<DesignArt, 'path'> => {
    if (size.width <= resolution.width && size.height <= resolution.height) return size;
    const fit = Math.min(resolution.width / size.width, resolution.height / size.height);
    return {
      width: Math.round(size.width * fit),
      height: Math.round(size.height * fit),
      sourceWidth: size.width,
      sourceHeight: size.height,
    };
  };

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
      onArt({ path: asset.path, ...fitToFrame(size) }, [asset]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      {/* Once the design is in, the drop zone steps DOWN to a quiet swap target: keeping it
          at full height would give the loudest element on the step to an action the user has
          already finished, and push everything that still matters below the fold. */}
      <div
        className={`wz-drop ${art ? 'compact' : ''} ${dragOver ? 'over' : ''}`}
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
        <strong>{art ? 'Drop another design to replace it' : 'Drop your finished design here'}</strong>
        {!art && (
          <span className="hint">
            The image you already made — a PNG with transparency keeps everything behind it
            visible on air. It becomes the graphic itself; you add the fields in the editor.
          </span>
        )}
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
            <div className="hint mono" style={{ marginBottom: 6 }}>
              {art.sourceWidth ?? art.width} × {art.sourceHeight ?? art.height}
            </div>
            <button onClick={onClear}>✕ Use a different design</button>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            {fullFrame && scaled
              ? `A ${Math.round((art.sourceWidth! / art.width) * 10) / 10}× export of the ${resolution.width} × ${resolution.height} frame — shown frame-sized, edge to edge, exactly as you drew it (the extra resolution keeps it sharp).`
              : fullFrame
                ? `Frame-sized (${resolution.width} × ${resolution.height}) — it will sit exactly where you drew it, edge to edge.`
                : scaled
                  ? `Larger than the ${resolution.width} × ${resolution.height} frame, so it is scaled down to fit it (the extra resolution keeps it sharp) and placed as an object you can position.`
                  : `Smaller than the ${resolution.width} × ${resolution.height} frame, so it is placed as an object you can position and resize.`}
          </p>
        </div>
      )}

      <div className="panel-section" style={{ marginTop: 14 }}>
        <h3>What happens next</h3>
        <p className="hint">
          Create the project and you land in the real editor with the <strong>Data</strong> tab
          open: add text, number, and image fields there — each appears on your design, ready to
          drag into place, style, and animate as its own layer. Your artwork is never redrawn or
          regenerated — NoaCG only adds the broadcast behaviour around it, and exports it as a
          working template.
        </p>
      </div>
    </div>
  );
}
