import { useEffect, useMemo, useRef, useState } from 'react';
import { composeDocument } from '../../preview/composeDocument';
import type { SpxTemplate } from '../../model/types';

interface Props {
  template: SpxTemplate;
  /** Bumping this replays the entrance (used when the user changes the animation). */
  replayKey?: number;
}

type SpxWindow = Window & { play?: () => void; stop?: () => void; next?: () => void; update?: (d: string) => void };

/**
 * The wizard's persistent live preview: the real composed template in a scaled iframe.
 * The entrance plays automatically on every (debounced) rebuild so each choice is felt
 * immediately; Replay / Out let the user test the motion at any time.
 */
export default function WizardPreview({ template, replayKey = 0 }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  const [srcdoc, setSrcdoc] = useState('');

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
  const doc = useMemo(() => composeDocument(template), [template]);
  useEffect(() => {
    const t = setTimeout(() => setSrcdoc(doc), 220);
    return () => clearTimeout(t);
  }, [doc]);

  const win = (): SpxWindow | null => (frameRef.current?.contentWindow as SpxWindow) ?? null;

  const playIn = () => {
    const w = win();
    if (!w || typeof w.play !== 'function') return;
    w.update?.(JSON.stringify(Object.fromEntries(template.fields.map((f) => [f.field, f.value]))));
    w.play();
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
          onLoad={() => setTimeout(playIn, 60)}
          style={{ width, height, transform: `translate(-50%, -50%) scale(${scale})` }}
        />
      </div>
      <div className="wz-preview-bar">
        <span className="muted">
          {width}×{height} · {template.fps} fps
        </span>
        <div className="row" style={{ gap: 6 }}>
          <button onClick={playIn} title="Replay the entrance animation">▶ Replay</button>
          <button onClick={() => win()?.stop?.()} title="Play the exit animation">■ Out</button>
        </div>
      </div>
    </div>
  );
}
