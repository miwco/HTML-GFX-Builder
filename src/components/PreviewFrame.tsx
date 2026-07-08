import { useEffect, useRef, useState, type RefObject } from 'react';
import { composeDocument } from '../preview/composeDocument';
import { useTemplateStore } from '../store/templateStore';
import CanvasGuides from './CanvasGuides';
import CanvasInteraction from './CanvasInteraction';

interface Props {
  iframeRef: RefObject<HTMLIFrameElement>;
}

const RELOAD_DEBOUNCE_MS = 350;

/**
 * Live preview: renders the composed template in a sandboxed iframe scaled to fit the stage.
 * Reloads (debounced) when the code changes, and reports runtime errors back to the store.
 * The iframe is scaled from the template's native resolution (e.g. 1920×1080) to fit the pane.
 */
export default function PreviewFrame({ iframeRef }: Props) {
  const template = useTemplateStore((s) => s.template);
  const previewBg = useTemplateStore((s) => s.previewBg);
  const setPreviewBg = useTemplateStore((s) => s.setPreviewBg);
  const setPreviewError = useTemplateStore((s) => s.setPreviewError);
  const guides = useTemplateStore((s) => s.guides);
  const setGuide = useTemplateStore((s) => s.setGuide);

  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  const { width: stageW, height: stageH } = template.resolution;

  // Scale the template iframe (stageW × stageH) to fit the stage pane.
  // Re-runs when the stage is resized OR when the template resolution changes.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      const { width, height } = stage.getBoundingClientRect();
      setScale(Math.min(width / stageW, height / stageH));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [stageW, stageH]);

  // Listen for runtime errors posted from the preview document.
  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.data && ev.data.type === 'spx-preview-error') {
        setPreviewError(String(ev.data.message));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [setPreviewError]);

  // Rebuild the iframe document when code or resolution changes (debounced).
  useEffect(() => {
    const handle = setTimeout(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      setPreviewError(null);
      iframe.srcdoc = composeDocument(template);
    }, RELOAD_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [template, iframeRef, setPreviewError]);

  return (
    <div
      className={`preview-stage ${previewBg}`}
      ref={stageRef}
      // The stage's own height follows the template's aspect (clamped by max-height in
      // CSS); the iframe then scales to fit whatever box results.
      style={{ aspectRatio: `${stageW} / ${stageH}` }}
    >
      <iframe
        ref={iframeRef}
        className="preview-frame"
        title="SPX live preview"
        sandbox="allow-scripts allow-same-origin"
        style={{
          width: stageW,
          height: stageH,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      />
      <CanvasGuides width={stageW * scale} height={stageH * scale} />
      {/* Direct manipulation — always on: drag the graphic, double-click text to edit. */}
      <CanvasInteraction iframeRef={iframeRef} width={stageW * scale} height={stageH * scale} />

      <div className="preview-toolbar">
        <div className="guide-switch">
          <button
            className={guides.safeAreas ? 'active' : ''}
            onClick={() => setGuide('safeAreas', !guides.safeAreas)}
            title="Toggle broadcast safe areas (title-safe / action-safe)"
          >
            Safe
          </button>
          <button
            className={guides.grid ? 'active' : ''}
            onClick={() => setGuide('grid', !guides.grid)}
            title="Toggle rule-of-thirds grid"
          >
            Grid
          </button>
        </div>
        <div className="bg-switch">
          {(['checkerboard', 'black', 'video'] as const).map((bg) => (
            <button
              key={bg}
              className={previewBg === bg ? 'active' : ''}
              onClick={() => setPreviewBg(bg)}
              title={`${bg} background`}
            >
              {bg === 'checkerboard' ? 'Trans' : bg === 'black' ? 'Black' : 'Video'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
