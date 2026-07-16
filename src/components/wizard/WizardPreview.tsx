import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { composeDocument } from '../../preview/composeDocument';
import type { SpxTemplate } from '../../model/types';

interface Props {
  template: SpxTemplate;
  /** Bumping this replays the animation (used when the user changes the animation). */
  replayKey?: number;
  /** Demo the full lifecycle — in, hold, out, back in — after each (re)play. */
  demoOut?: boolean;
}

type SpxWindow = Window & { play?: () => void; stop?: () => void; next?: () => void; update?: (d: string) => void };

/**
 * The wizard's persistent live preview: the real composed template in a scaled iframe.
 * The entrance plays automatically on every (debounced) rebuild so each choice is felt
 * immediately; Replay / Out let the user test the motion at any time.
 */
export default function WizardPreview({ template, replayKey = 0, demoOut = false }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  const [srcdoc, setSrcdoc] = useState('');
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

  const { width, height } = template.resolution;

  // Fit the canvas inside the stage.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      const r = stage.getBoundingClientRect();
      setScale(Math.min(r.width / width, r.height / height));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [width, height]);

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

  const playIn = () => {
    const w = win();
    if (!w || typeof w.play !== 'function') return;
    clearDemo();
    const tpl = templateRef.current;
    w.update?.(JSON.stringify(Object.fromEntries(tpl.fields.map((f) => [f.field, f.value]))));
    w.play();
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

  return (
    <div className="wz-preview">
      <div className="wz-stage" ref={stageRef}>
        <iframe
          ref={frameRef}
          title="Wizard live preview"
          sandbox="allow-scripts allow-same-origin"
          srcDoc={srcdoc}
          onLoad={() => setTimeout(playWhenReady, 60)}
          style={{ width, height, transform: `translate(-50%, -50%) scale(${scale})` }}
        />
      </div>
      <div className="wz-preview-bar">
        <span className="muted">
          {width}×{height} · {template.fps} fps
        </span>
        <div className="row" style={{ gap: 6 }}>
          <button onClick={playIn} title={demoOut ? 'Replay the animation (in, then out)' : 'Replay the entrance animation'}>▶ Replay</button>
          <button onClick={() => { clearDemo(); win()?.stop?.(); }} title="Play the exit animation">■ Out</button>
        </div>
      </div>
    </div>
  );
}
