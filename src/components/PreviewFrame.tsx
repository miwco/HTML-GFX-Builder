import { useEffect, useRef, useState, type RefObject } from 'react';
import { composeDocument } from '../preview/composeDocument';
import { useTemplateStore } from '../store/templateStore';
import { computePad } from './pasteboard';
import CanvasGuides from './CanvasGuides';
import CanvasInteraction from './CanvasInteraction';

interface Props {
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

const RELOAD_DEBOUNCE_MS = 350;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 8;

/**
 * Live preview: renders the composed template in a sandboxed iframe scaled to fit the stage,
 * with a zoomable/pannable viewport on top of the fit scale (for precision work and to reach
 * elements that animate in from off-canvas). Reloads (debounced) when the code changes, and
 * reports runtime errors back to the store.
 *
 * Coordinate note: the iframe + overlays live in a `.canvas-world` that is centred in the
 * stage and translated by `pan`; the effective scale passed to the overlays is fit × zoom.
 * CanvasInteraction derives its own scale from that width and reads the overlay's live
 * bounding rect, so pan and zoom need no changes there — the overlay math already follows.
 */
export default function PreviewFrame({ iframeRef }: Props) {
  const template = useTemplateStore((s) => s.template);
  const previewBg = useTemplateStore((s) => s.previewBg);
  const setPreviewBg = useTemplateStore((s) => s.setPreviewBg);
  const setPreviewError = useTemplateStore((s) => s.setPreviewError);
  const guides = useTemplateStore((s) => s.guides);
  const setGuide = useTemplateStore((s) => s.setGuide);

  const stageRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(0.3);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // Live refs for the native wheel handler (attached once, non-passive).
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(pan);
  panRef.current = pan;

  const { width: stageW, height: stageH } = template.resolution;
  const effScale = fit * zoom;

  // The pasteboard: an always-on working margin so off-canvas content is visible and editable.
  // The iframe VIEWPORT, the gesture overlay, and the guides all grow to this padded document
  // together, so the coordinate origin moves with them (see CanvasInteraction). Pad is a pure
  // view concept — it never enters the template or any persisted coordinate.
  const { padX, padY } = computePad(template.resolution);
  const docW = stageW + 2 * padX;
  const docH = stageH + 2 * padY;

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Scale the padded document (canvas + pasteboard) to fit the stage pane.
  // Re-runs when the stage is resized OR when the padded document size changes.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fitNow = () => {
      const { width, height } = stage.getBoundingClientRect();
      setFit(Math.min(width / docW, height / docH));
    };
    fitNow();
    const ro = new ResizeObserver(fitNow);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [docW, docH]);

  // A new graphic (resolution change) starts framed to fit.
  useEffect(() => {
    resetView();
  }, [stageW, stageH]);

  /** Zoom toward a screen point (keeps the content under it fixed). */
  const zoomToward = (nextZoomRaw: number, clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nextZoomRaw));
    const z0 = zoomRef.current;
    if (nextZoom === z0) return;
    const p0 = panRef.current;
    // Stage-local point relative to the stage centre (the world's anchor before pan).
    const sx = clientX - rect.left - rect.width / 2;
    const sy = clientY - rect.top - rect.height / 2;
    const k = 1 - nextZoom / z0;
    setZoom(nextZoom);
    setPan({ x: p0.x + (sx - p0.x) * k, y: p0.y + (sy - p0.y) * k });
  };

  // Wheel over the stage: Ctrl/Cmd (and trackpad pinch, reported as ctrl+wheel) zooms toward
  // the cursor; a plain wheel pans WHEN zoomed in (so it never hijacks page scroll at the
  // default fit). A native non-passive listener so preventDefault actually applies.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomToward(zoomRef.current * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
      } else if (zoomRef.current > 1.001) {
        e.preventDefault();
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
    // zoomToward reads live refs; stage identity is stable for the component's life.
  }, []);

  // Middle-mouse drag pans the viewport. Captured before the overlay so the canvas gesture
  // layer never sees it. (Left-drag stays with the canvas; a plain wheel pans when zoomed in.)
  const panDrag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const onStagePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      panDrag.current = { x: e.clientX, y: e.clientY, px: panRef.current.x, py: panRef.current.y };
    }
  };
  const onStagePointerMove = (e: React.PointerEvent) => {
    const d = panDrag.current;
    if (!d) return;
    setPan({ x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) });
  };
  const onStagePointerUp = () => {
    panDrag.current = null;
  };

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

  // Monotonic document revision, stamped onto the iframe as data-doc-rev once each rebuilt
  // document has LOADED. Anything that must wait out the debounced rebuild (the e2e suite's
  // awaitPreviewRebuild helper) watches this attribute instead of sleeping.
  const docRevRef = useRef(0);

  // Rebuild the iframe document when code or resolution changes (debounced).
  useEffect(() => {
    const handle = setTimeout(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      setPreviewError(null);
      const rev = ++docRevRef.current;
      iframe.addEventListener(
        'load',
        () => {
          // Only the newest commit may stamp — a slow older document must not look current.
          if (rev === docRevRef.current) iframe.dataset.docRev = String(rev);
        },
        { once: true },
      );
      // Authoring mode: render the canvas inset inside the padded document so off-canvas
      // content is painted. Never used by exports/renders (pad is editor-only).
      iframe.srcdoc = composeDocument(template, { authoring: { padX, padY } });
    }, RELOAD_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [template, iframeRef, setPreviewError, padX, padY]);

  return (
    <div
      className={`preview-stage ${previewBg}`}
      ref={stageRef}
      style={{ aspectRatio: `${docW} / ${docH}` }}
      onPointerDownCapture={onStagePointerDown}
      onPointerMove={onStagePointerMove}
      onPointerUp={onStagePointerUp}
      onPointerCancel={onStagePointerUp}
    >
      <div
        className="canvas-world"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
      >
        {/* The iframe viewport is the padded document; the authoring CSS insets the real
            canvas by (padX, padY) inside it (see composeDocument). */}
        <iframe
          ref={iframeRef}
          className="preview-frame"
          title="SPX live preview"
          sandbox="allow-scripts allow-same-origin"
          style={{
            width: docW,
            height: docH,
            transform: `translate(-50%, -50%) scale(${effScale})`,
          }}
        />
        <CanvasGuides
          width={docW * effScale}
          height={docH * effScale}
          safeAreas={guides.safeAreas}
          grid={guides.grid}
          canvasRect={{
            left: padX * effScale,
            top: padY * effScale,
            width: stageW * effScale,
            height: stageH * effScale,
          }}
        />
        {/* Direct manipulation — always on: drag the graphic, double-click text to edit.
            The overlay spans the padded document; padX/padY convert to canvas-logical
            coordinates at the write boundary. */}
        <CanvasInteraction
          iframeRef={iframeRef}
          width={docW * effScale}
          height={docH * effScale}
          padX={padX}
          padY={padY}
        />
      </div>

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
        <div className="zoom-switch" data-testid="zoom-switch">
          <button
            onClick={() => zoomToward(zoom / 1.25, (stageRef.current?.getBoundingClientRect().left ?? 0) + (stageRef.current?.getBoundingClientRect().width ?? 0) / 2, (stageRef.current?.getBoundingClientRect().top ?? 0) + (stageRef.current?.getBoundingClientRect().height ?? 0) / 2)}
            title="Zoom out (Ctrl/Cmd + scroll)"
            data-testid="zoom-out"
          >
            −
          </button>
          <button
            className="zoom-level"
            onClick={resetView}
            title="Reset the view to fit"
            data-testid="zoom-reset"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => zoomToward(zoom * 1.25, (stageRef.current?.getBoundingClientRect().left ?? 0) + (stageRef.current?.getBoundingClientRect().width ?? 0) / 2, (stageRef.current?.getBoundingClientRect().top ?? 0) + (stageRef.current?.getBoundingClientRect().height ?? 0) / 2)}
            title="Zoom in (Ctrl/Cmd + scroll)"
            data-testid="zoom-in"
          >
            +
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
