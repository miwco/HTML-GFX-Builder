// Project assets for the video editor: logos, images, SVGs, and short video clips the
// AI weaves into the composition (passed to the component as the `assets` prop). Stored
// as data URLs in the project (the SPX AssetFile shape). Sizes are capped hard: assets
// ride inside the render manifest (a 4 MB upload budget) and inside localStorage
// autosave, so big files would silently break both - better an honest limit up front.

import { useRef, useState } from 'react';
import { fileToDataUrl, uniqueAssetPath } from '../../assets/assetUtils';
import { useVideoProjectStore } from '../../store/videoProjectStore';
import { describeAssets } from '../../video/types';

/** Hard per-asset cap (data-URL bytes) - keeps the render manifest under its 4 MB budget. */
const MAX_ASSET_BYTES = 3_000_000;
/** Soft warning threshold. */
const WARN_ASSET_BYTES = 1_500_000;

const ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.svg,.mp4,.webm,.mov';

function dataSize(data: string | Blob): number {
  return typeof data === 'string' ? data.length : data.size;
}

function fmtBytes(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.round(n / 1000)} kB`;
}

export default function VideoAssetsPanel() {
  const assets = useVideoProjectStore((s) => s.project.assets);
  const addAsset = useVideoProjectStore((s) => s.addAsset);
  const removeAsset = useVideoProjectStore((s) => s.removeAsset);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const infos = describeAssets(assets);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    for (const file of Array.from(files)) {
      const data = await fileToDataUrl(file);
      if (data.length > MAX_ASSET_BYTES) {
        setError(
          `"${file.name}" is ${fmtBytes(data.length)} - the limit is ${fmtBytes(MAX_ASSET_BYTES)} per asset ` +
            '(assets travel inside the render upload and the local autosave). Compress or trim it and try again.',
        );
        continue;
      }
      addAsset({ path: uniqueAssetPath(file.name, useVideoProjectStore.getState().project.assets), data });
    }
  };

  return (
    <div className="video-assets">
      <div className="panel-section">
        <h3>Assets</h3>
        <p className="hint">
          Logos, images, SVGs, or a short video clip. The AI uses them by name - e.g. "use my
          logo in the corner" - and your code reads them from the <code>assets</code> prop.
        </p>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={ACCEPT}
          style={{ display: 'none' }}
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button onClick={() => fileInput.current?.click()} data-testid="video-add-asset">
          🖼 Add assets…
        </button>
        {error && <p className="status-bad" style={{ marginTop: 8 }}>✗ {error}</p>}
      </div>

      {assets.length > 0 && (
        <div className="panel-section">
          <ul className="video-asset-list">
            {assets.map((a) => {
              const info = infos.find((i) => i.path === a.path);
              const size = dataSize(a.data);
              return (
                <li key={a.path} className="row" style={{ gap: 8, alignItems: 'center' }}>
                  {typeof a.data === 'string' && info?.mime.startsWith('image/') && (
                    <img src={a.data} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                  )}
                  <span className="grow" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <code>{info?.name ?? a.path}</code>
                    <span className="hint" style={{ marginLeft: 8, color: size > WARN_ASSET_BYTES ? 'var(--warn)' : undefined }}>
                      {fmtBytes(size)}
                      {size > WARN_ASSET_BYTES ? ' - large; watch the render budget' : ''}
                    </span>
                  </span>
                  <button onClick={() => removeAsset(a.path)} title="Remove">✕</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
