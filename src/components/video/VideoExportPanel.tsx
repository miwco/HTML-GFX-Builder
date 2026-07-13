// Export for video projects: render to media through the render service (only when
// isRenderConfigured() - unconfigured builds grow zero render UI, same posture as the SPX
// ExportPanel) plus the always-available source download.

import { saveAs } from 'file-saver';
import { useVideoProjectStore } from '../../store/videoProjectStore';
import { isRenderConfigured } from '../../render/config';
import VideoRenderPanel from './VideoRenderPanel';

export default function VideoExportPanel() {
  const project = useVideoProjectStore((s) => s.project);

  const downloadSource = () => {
    saveAs(
      new Blob([project.tsx], { type: 'text/plain;charset=utf-8' }),
      `${project.name.replace(/[^\w-]+/g, '-') || 'composition'}.tsx`,
    );
  };

  return (
    <div className="video-export">
      {isRenderConfigured() ? (
        <VideoRenderPanel />
      ) : (
        <div className="panel-section">
          <h3>Render video</h3>
          <p className="hint">
            Video rendering needs the render service (VITE_RENDER_API) - not configured in this
            build.
          </p>
        </div>
      )}

      <div className="panel-section">
        <h3>Source</h3>
        <p className="hint">
          The composition is a single React/Remotion file - use it in any Remotion project.
        </p>
        <button onClick={downloadSource}>⬇ Download Composition.tsx</button>
      </div>
    </div>
  );
}
