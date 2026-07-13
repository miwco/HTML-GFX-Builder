// The video preview: the sandboxed Remotion Player host iframe plus transport controls
// (play/pause/replay/scrub + time readout). The iframe runs sandbox="allow-scripts" ONLY
// - no allow-same-origin - so evaluated composition code can never reach the app's
// localStorage or session (see src/video/playerBridge.ts). Manual code edits recompile on
// a 350 ms debounce; compile/static errors keep the LAST GOOD module playing and show an
// inline banner instead of blanking the stage.

import { useEffect, useRef, useState } from 'react';
import { useVideoProjectStore } from '../../store/videoProjectStore';
import { compileTsx, staticValidate, WARNING_RULES } from '../../video/compile';
import { PlayerBridge } from '../../video/playerBridge';
import { setActiveBridge } from '../../video/bridgeRegistry';
import { describeAssets } from '../../video/types';

const RELOAD_DEBOUNCE_MS = 350;

function fmtTime(frame: number, fps: number): string {
  const t = frame / fps;
  return `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
}

export default function VideoPlayerFrame() {
  const project = useVideoProjectStore((s) => s.project);
  const replayNonce = useVideoProjectStore((s) => s.replayNonce);
  const previewError = useVideoProjectStore((s) => s.previewError);
  const setPreviewError = useVideoProjectStore((s) => s.setPreviewError);

  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // The bridge is created in an effect (remount-safe under StrictMode); the iframe gets
  // its nonce-carrying src on the re-render after creation.
  const [bridge, setBridge] = useState<PlayerBridge | null>(null);

  useEffect(() => {
    const b = new PlayerBridge({
      onFrame: setFrame,
      onState: setPlaying,
      onRuntimeError: (message, f) =>
        useVideoProjectStore
          .getState()
          .setPreviewError(f != null ? `frame ${f}: ${message}` : message),
    });
    if (iframeRef.current) b.attach(iframeRef.current);
    setActiveBridge(b);
    setBridge(b);
    return () => {
      setActiveBridge(null);
      b.dispose();
    };
  }, []);

  // (Re)load the composition: debounced on code/settings/asset changes, and on
  // replayNonce (AI applies + post-failed-validation restores bump it).
  const { tsx, assets, width, height, fps, durationInFrames, transparent } = project;
  useEffect(() => {
    if (!bridge) return;
    const handle = setTimeout(async () => {
      const compiled = compileTsx(tsx);
      if (!compiled.ok) {
        setCodeError(compiled.error);
        return; // the host keeps the last good module playing
      }
      const blocking = staticValidate(tsx, describeAssets(assets)).filter(
        (i) => !WARNING_RULES.has(i.rule),
      );
      if (blocking.length > 0) {
        setCodeError(blocking.map((i) => i.message).join(' '));
        return;
      }
      setCodeError(null);
      setPreviewError(null);
      const res = await bridge.load(
        compiled.js,
        { width, height, fps, durationInFrames, transparent },
        {},
        assets,
        { autoplay: true },
      );
      // A disposed result means this bridge was replaced mid-flight - never overwrite
      // the successor's state.
      if (!res.ok && !res.disposed) setPreviewError(res.message);
    }, RELOAD_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [tsx, assets, width, height, fps, durationInFrames, transparent, replayNonce, bridge, setPreviewError]);

  const scrub = (f: number) => {
    setFrame(f);
    bridge?.seek(f);
  };

  return (
    <div className="preview-wrap">
      <div
        className={`preview-stage ${transparent ? 'checkerboard' : 'black'}`}
        style={{ aspectRatio: `${width} / ${height}` }}
        data-testid="video-stage"
      >
        {bridge && (
          <iframe
            ref={(el) => {
              iframeRef.current = el;
              if (el) bridge.attach(el);
            }}
            className="video-player-frame"
            title="Video preview"
            // allow-scripts WITHOUT allow-same-origin is load-bearing: the opaque origin
            // keeps AI/user composition code away from the app's localStorage (the
            // Anthropic API key) and session. Never add allow-same-origin here.
            sandbox="allow-scripts"
            src={bridge.src}
          />
        )}
      </div>

      <div className="video-transport" data-testid="video-transport">
        <button onClick={() => (playing ? bridge?.pause() : bridge?.play())} title={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
        <button onClick={() => bridge?.replay()} title="Play from the start">⟲</button>
        <input
          type="range"
          className="video-scrubber grow"
          min={0}
          max={Math.max(0, durationInFrames - 1)}
          value={Math.min(frame, durationInFrames - 1)}
          onChange={(e) => scrub(Number(e.target.value))}
          data-testid="video-scrubber"
        />
        <span className="mono muted video-timecode">
          {fmtTime(frame, fps)} / {fmtTime(durationInFrames, fps)} · f{frame}
        </span>
      </div>

      {codeError && (
        <div className="status-bad video-preview-error" data-testid="video-code-error">
          ✗ {codeError} <span className="hint">(showing your previous working version)</span>
        </div>
      )}
      {!codeError && previewError && (
        <div className="status-bad video-preview-error" data-testid="video-preview-error">
          ✗ {previewError}
        </div>
      )}
    </div>
  );
}
