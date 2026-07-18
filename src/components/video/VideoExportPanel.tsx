// Export for video projects: render to media through the render service (only when
// isRenderConfigured() - unconfigured builds grow zero render UI, same posture as the SPX
// ExportPanel) plus the always-available source download. A HyperFrames project downloads
// as a standalone composition file that any HyperFrames tooling can run - the source
// carries no script or font tags (NoaCG's driver provides gsap, and the composer injects
// the bundled faces), so the download inlines BOTH the bundled GSAP and the bundled
// @font-face CSS to stay plug-and-play offline and look identical outside the app.

import { saveAs } from 'file-saver';
import gsapSource from '../../assets/gsap.min.js?raw';
import { useVideoProjectStore } from '../../store/videoProjectStore';
import { loadHyperframesFontCss } from '../../video/hyperframes/fontCss';
import { inlineHyperframesAssets } from '../../video/hyperframes/compose';
import { isRenderConfigured } from '../../render/config';
import VideoRenderPanel from './VideoRenderPanel';

export default function VideoExportPanel() {
  const project = useVideoProjectStore((s) => s.project);
  const hyperframes = project.engine === 'hyperframes';

  const downloadSource = async () => {
    const stem = project.name.replace(/[^\w-]+/g, '-') || 'composition';
    if (hyperframes) {
      // Inline the fonts and GSAP at the start of <head> so the file runs (and renders via
      // the HyperFrames CLI) with no network and no extra files.
      const fontCss = await loadHyperframesFontCss();
      const head =
        (fontCss ? `<style>/* Bundled broadcast fonts */\n${fontCss}\n</style>\n` : '') +
        `<script>/* GSAP (bundled) */\n${gsapSource}\n</script>`;
      // Uploaded images ride along as data URLs too: `asset:<name>` is a NoaCG convention,
      // so a downloaded file that kept the reference would show a broken image everywhere
      // except inside this app.
      const source = inlineHyperframesAssets(project.html, project.assets);
      const html = /<head[^>]*>/i.test(source)
        ? source.replace(/<head[^>]*>/i, (m) => `${m}\n${head}`)
        : head + source;
      saveAs(new Blob([html], { type: 'text/html;charset=utf-8' }), `${stem}.html`);
      return;
    }
    saveAs(new Blob([project.tsx], { type: 'text/plain;charset=utf-8' }), `${stem}.tsx`);
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
          {hyperframes
            ? 'The composition is a standalone HyperFrames HTML file (GSAP inlined) - open it in a browser or render it with the HyperFrames CLI.'
            : 'The composition is a single React/Remotion file - use it in any Remotion project.'}
        </p>
        <button onClick={() => void downloadSource()}>
          ⬇ Download {hyperframes ? 'composition.html' : 'Composition.tsx'}
        </button>
      </div>
    </div>
  );
}
