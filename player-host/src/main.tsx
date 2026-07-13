// Boot: read the session nonce from the URL hash (#n=<nonce>, set by the embedding app)
// and mount the host. `#demo` mounts a built-in composition with no app involvement -
// the standalone smoke check for the build/serving pipeline.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Player } from '@remotion/player';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import HostApp from './HostApp';

function DemoComp() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const exit = interpolate(frame, [durationInFrames - fps * 0.5, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: '#101318' }}>
      <div
        style={{
          opacity: Math.min(enter, exit),
          transform: `scale(${0.7 + enter * 0.3})`,
          color: '#f6a623',
          fontFamily: 'Arial, sans-serif',
          fontSize: 80,
          fontWeight: 800,
        }}
        data-testid="demo-title"
      >
        Player host OK
      </div>
    </AbsoluteFill>
  );
}

const hash = new URLSearchParams(window.location.hash.slice(1));
const root = createRoot(document.getElementById('root')!);

if (hash.has('demo')) {
  root.render(
    <StrictMode>
      <Player
        component={DemoComp}
        durationInFrames={90}
        fps={30}
        compositionWidth={1920}
        compositionHeight={1080}
        style={{ width: '100%', height: '100%' }}
        autoPlay
        loop
      />
    </StrictMode>,
  );
} else {
  root.render(
    <StrictMode>
      <HostApp nonce={hash.get('n') ?? ''} />
    </StrictMode>,
  );
}
