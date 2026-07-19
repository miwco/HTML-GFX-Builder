import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { composeDocument } from '../../preview/composeDocument';
import type { SpxTemplate } from '../../model/types';

interface Props {
  template: SpxTemplate;
  /** Bumping this replays the animation (used when the user changes the animation). */
  replayKey?: number;
  /** Demo the full lifecycle — in, hold, out, back in — after each (re)play. */
  demoOut?: boolean;
  /** Import graphic's Prepare step: override the FIRST field's pushed value, so the
   *  content-width slider drives the emitted stretch runtime live. Null = the samples. */
  demoText?: string | null;
}

type SpxWindow = Window & { play?: () => void; stop?: () => void; next?: () => void; update?: (d: string) => void };

/**
 * The wizard's persistent live preview: the real composed template in a scaled iframe.
 * The entrance plays automatically on every (debounced) rebuild so each choice is felt
 * immediately; Replay / Out let the user test the motion at any time.
 */
export default function WizardPreview({ template, replayKey = 0, demoOut = false, demoText = null }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [srcdoc, setSrcdoc] = useState('');
  // Zoom-to-graphic: default shows the whole canvas; the toggle reframes the view onto
  // just the graphic so small formats (corner bugs, tickers) are actually inspectable.
  const [zoomed, setZoomed] = useState(false);
  // The graphic's layout box in canvas px, measured transform-free (offset* ignores the
  // entrance's GSAP transforms, so mid-animation measurements still give the settled box).
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // Pending lifecycle-demo timers (out + back in) — cleared on any new play/stop.
  const demoTimers = useRef<number[]>([]);
  const clearDemo = useCallback(() => {
    demoTimers.current.forEach((t) => clearTimeout(t));
    demoTimers.current = [];
  }, []);
  useEffect(() => clearDemo, [clearDemo]);
  // The latest template, for pushing field values: the srcdoc lags the prop by the
  // debounce, and onLoad/demo timers fire from older closures — the ref never lies.
  const templateRef = useRef(template);
  templateRef.current = template;
  const demoTextRef = useRef(demoText);
  demoTextRef.current = demoText;

  /** The values a push sends: the template's samples, with the demo override on field 1. */
  const pushValues = (tpl: SpxTemplate) => {
    const values = Object.fromEntries(tpl.fields.map((f) => [f.field, f.value]));
    const demo = demoTextRef.current;
    if (demo != null && tpl.fields.length) values[tpl.fields[0].field] = demo;
    return values;
  };

  const { width, height } = template.resolution;

  // Track the stage size (the fit scale and the zoom framing both derive from it).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      setStage({ w: r.width, h: r.height });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Rebuild (debounced) when the template changes; auto-play the entrance on load.
  // Committing a new srcdoc also cancels any pending demo timers — a stop()/play()
  // scheduled against the previous document must never hit the reloading one (it
  // would blank the preview right after the user's change).
  const doc = useMemo(() => composeDocument(template), [template]);
  useEffect(() => {
    const t = setTimeout(() => {
      clearDemo();
      setSrcdoc(doc);
    }, 220);
    return () => clearTimeout(t);
  }, [doc, clearDemo]);

  const win = (): SpxWindow | null => (frameRef.current?.contentWindow as SpxWindow) ?? null;

  /** Measure the graphic's box in canvas px. The root is the body's first <div> (the
   *  `.{prefix}` wrapper every generated template has). getBoundingClientRect is right
   *  here: it includes the zone anchoring's STATIC transform (centered zones position
   *  via translate(-50%)), while the entrance's GSAP motion never transforms the root
   *  itself (presets move the box and lines inside it), so a mid-flight measurement
   *  still equals the settled box. The iframe's own scale doesn't reach in — inside
   *  the document, coordinates are plain canvas pixels. */
  const measureBox = () => {
    const root = frameRef.current?.contentDocument?.body?.querySelector('div');
    if (!root) return setBox(null);
    const r = root.getBoundingClientRect();
    setBox(r.width > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null);
  };

  const playIn = () => {
    const w = win();
    if (!w || typeof w.play !== 'function') return;
    clearDemo();
    const tpl = templateRef.current;
    w.update?.(JSON.stringify(pushValues(tpl)));
    w.play();
    measureBox(); // every (re)play follows a load or a data push — refresh the zoom framing
    if (demoOut) {
      // Show the exit too, then come back on air so the preview isn't left empty.
      demoTimers.current.push(
        window.setTimeout(() => win()?.stop?.(), 1700),
        window.setTimeout(() => win()?.play?.(), 2800),
      );
    }
  };

  // Play once the document's fonts are usable (a data-URL @font-face decodes in a few
  // frames) so a font choice is seen on the entrance itself — capped so a slow decode
  // never stalls the preview. No-ops if the iframe has reloaded meanwhile.
  const playWhenReady = () => {
    const loadedDoc = frameRef.current?.contentDocument ?? null;
    let done = false;
    const go = () => {
      if (done || frameRef.current?.contentDocument !== loadedDoc) return;
      done = true;
      playIn();
    };
    void loadedDoc?.fonts?.ready.then(go);
    window.setTimeout(go, 400);
  };

  // Replay when the parent asks (e.g. animation preset changed but srcdoc identical).
  useEffect(() => {
    if (replayKey > 0) playIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey]);

  // Push the demo text live (no replay): the slider drives the emitted stretch runtime in
  // the running document — the user watches the REAL mechanism, not a wizard imitation.
  useEffect(() => {
    if (demoText == null) return;
    const w = win();
    if (!w || typeof w.update !== 'function') return;
    w.update(JSON.stringify(pushValues(templateRef.current)));
  }, [demoText]);

  // The view: whole canvas by default; zoomed reframes onto the graphic's box.
  const fitScale = Math.min(stage.w / width, stage.h / height) || 0.2;
  let z = fitScale;
  let tx = 0;
  let ty = 0;
  if (zoomed && box) {
    const M = 48; // canvas-px breathing room around the framed graphic
    const contain = Math.min(stage.w / (box.w + M), stage.h / (box.h + M));
    // A near-canvas-wide (ticker) or -tall (credits) graphic barely gains from a
    // contain fit — fill the other axis instead and crop: that IS the detail view.
    z = contain >= fitScale * 1.3 ? contain : Math.max(stage.w / (box.w + M), stage.h / (box.h + M));
    z = Math.min(Math.max(z, fitScale), 3);
    tx = width / 2 - (box.x + box.w / 2);
    ty = height / 2 - (box.y + box.h / 2);
  }

  return (
    <div className="wz-preview">
      <div className="wz-stage" ref={stageRef}>
        <iframe
          ref={frameRef}
          title="Wizard live preview"
          sandbox="allow-scripts allow-same-origin"
          srcDoc={srcdoc}
          onLoad={() => setTimeout(playWhenReady, 60)}
          style={{ width, height, transform: `translate(-50%, -50%) scale(${z}) translate(${tx}px, ${ty}px)` }}
        />
      </div>
      <div className="wz-preview-bar">
        <span className="muted">
          {width}×{height} · {template.fps} fps
        </span>
        <div className="row" style={{ gap: 6 }}>
          <button
            className={zoomed ? 'active' : ''}
            disabled={!box}
            onClick={() => { if (!zoomed) measureBox(); setZoomed(!zoomed); }}
            title={zoomed ? 'Show the whole canvas again' : 'Zoom the preview to just the graphic'}
          >
            {zoomed ? '▭ Whole canvas' : '⌖ Zoom to graphic'}
          </button>
          <button onClick={playIn} title={demoOut ? 'Replay the animation (in, then out)' : 'Replay the entrance animation'}>▶ Replay</button>
          <button onClick={() => { clearDemo(); win()?.stop?.(); }} title="Play the exit animation">■ Out</button>
        </div>
      </div>
    </div>
  );
}
