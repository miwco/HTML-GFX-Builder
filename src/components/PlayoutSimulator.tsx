import { useEffect, useRef, type RefObject } from 'react';
import { useTemplateStore } from '../store/templateStore';

interface Props {
  iframeRef: RefObject<HTMLIFrameElement>;
}

type SpxWindow = Window & {
  play?: () => void;
  stop?: () => void;
  next?: () => void;
  update?: (data: string) => void;
};

// The preview rebuilds on a ~350 ms debounce after an apply — replay after it settles.
const REPLAY_AFTER_REBUILD_MS = 550;

/** Simulate SPX playout: call play()/stop()/update()/next() on the live preview. */
export default function PlayoutSimulator({ iframeRef }: Props) {
  const sampleData = useTemplateStore((s) => s.sampleData);
  const replayNonce = useTemplateStore((s) => s.replayNonce);

  const win = (): SpxWindow | null => (iframeRef.current?.contentWindow as SpxWindow) ?? null;

  const call = (fn: 'play' | 'stop' | 'next') => {
    const w = win();
    if (w && typeof w[fn] === 'function') w[fn]!();
  };

  const sendUpdate = () => {
    const w = win();
    if (w && typeof w.update === 'function') w.update(JSON.stringify(sampleData));
  };

  // A typical broadcast sequence: push the latest data, then animate in.
  const playWithData = () => {
    sendUpdate();
    call('play');
  };

  // Auto-replay: the Motion panel bumps replayNonce after an apply so the change is
  // immediately visible. Wait out the debounced preview rebuild, then play the new code.
  const playRef = useRef(playWithData);
  playRef.current = playWithData;
  useEffect(() => {
    if (replayNonce === 0) return;
    const handle = setTimeout(() => playRef.current(), REPLAY_AFTER_REBUILD_MS);
    return () => clearTimeout(handle);
  }, [replayNonce]);

  return (
    <div className="simulator">
      <button className="primary" onClick={playWithData} title="Update data + play in">
        ▶ Play
      </button>
      <button onClick={() => call('stop')} title="Animate out">
        ■ Stop
      </button>
      <button onClick={sendUpdate} title="Send current sample data to update()">
        ⟳ Update
      </button>
      <button onClick={() => call('next')} title="Advance multi-step templates">
        » Next
      </button>
    </div>
  );
}
