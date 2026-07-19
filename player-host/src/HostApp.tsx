// The host application: evaluates compiled composition modules, mounts them in a
// Remotion <Player>, and reports lifecycle/errors/frames back to the app over the
// message protocol. Keeps the LAST GOOD module mounted when a new one fails to eval or
// mount, so fast typing in the code editor never blanks the preview.

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { evalModule, type UserComponent } from './moduleEval';
import {
  PLAYER_CHANNEL,
  PLAYER_PROTOCOL_V,
  type AppToHost,
  type HostToApp,
  type LoadMessage,
  type PlayerCompSettings,
} from './protocol';

/** The readability checks (src/video/textChecks.js) are INLINED into this page's head by
 *  scripts/build-player-host.mjs - one shared implementation across the two isolated video
 *  runtimes and the bench, none of which can import a module from the app. Absent only if
 *  the page was built without it, in which case the probe simply reports nothing. */
declare global {
  interface Window {
    __noacgTextChecks?: {
      clip: () => TextIssue[];
      safeArea: () => TextIssue[];
      occlusion: () => TextIssue[];
    };
  }
}

interface TextIssue {
  kind: string;
  key: string;
  message: string;
  /** Clip findings only: how much of the glyph run is cut (100 = nothing painted). */
  lossPct?: number;
}

/** Omit that distributes over a union (plain Omit collapses HostToApp to common keys). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** The root-level guard: a composition throw must never unmount the host tree. The Player
 *  has its own internal boundary for most render errors; this catches whatever escapes
 *  (and reports it), rendering nothing until the next load swaps the key. */
class RootErrorBoundary extends Component<
  { onError: (message: string) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error.message);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface MountedComp {
  id: number;
  Component: UserComponent;
  settings: PlayerCompSettings;
  inputProps: Record<string, unknown>;
  autoplay: boolean;
}

interface Props {
  nonce: string;
}

export default function HostApp({ nonce }: Props) {
  const [comp, setComp] = useState<MountedComp | null>(null);
  const playerRef = useRef<PlayerRef>(null);
  const lastGoodRef = useRef<MountedComp | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  // Errors observed since the marker was last cleared (probe windows, mount windows).
  const errorLogRef = useRef<{ frame: number | null; message: string }[]>([]);
  const currentIdRef = useRef(0);
  const probeBusyRef = useRef(false);

  const post = useCallback(
    (msg: DistributiveOmit<HostToApp, 'channel' | 'v' | 'nonce'>) => {
      const full = { channel: PLAYER_CHANNEL, v: PLAYER_PROTOCOL_V, nonce, ...msg } as HostToApp;
      window.parent.postMessage(full, '*');
    },
    [nonce],
  );

  const currentFrame = () => playerRef.current?.getCurrentFrame() ?? null;

  const recordError = useCallback(
    (message: string) => {
      errorLogRef.current.push({ frame: currentFrame(), message });
      post({ type: 'runtime-error', id: currentIdRef.current, frame: currentFrame(), message });
    },
    [post],
  );

  // Global error capture: the user module can throw anywhere (event handlers, effects,
  // promise chains); the Player's own error event covers render-phase throws.
  useEffect(() => {
    const onError = (e: ErrorEvent) => recordError(e.message || 'Unknown error');
    const onRejection = (e: PromiseRejectionEvent) =>
      recordError(e.reason instanceof Error ? e.reason.message : String(e.reason));
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [recordError]);

  /** Wait for the renderer to settle: two animation frames, raced against a timeout so
   *  probes still complete when rAF stalls (hidden/background tabs never paint). */
  const settle = () =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 150);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          clearTimeout(timer);
          resolve();
        }),
      );
    });

  const handleLoad = useCallback(
    async (msg: LoadMessage) => {
      currentIdRef.current = msg.id;
      // Rebuild asset blob URLs (the opaque origin can't read the parent's blobs).
      for (const url of blobUrlsRef.current) URL.revokeObjectURL(url);
      blobUrlsRef.current = [];
      const assetUrls: Record<string, string> = {};
      for (const a of msg.assets) {
        const url = URL.createObjectURL(new Blob([a.bytes], { type: a.mime }));
        blobUrlsRef.current.push(url);
        assetUrls[a.name] = url;
      }

      let Component: UserComponent;
      try {
        Component = evalModule(msg.compiledJs);
      } catch (e) {
        post({
          type: 'load-error',
          id: msg.id,
          phase: 'eval',
          message: e instanceof Error ? e.message : String(e),
        });
        return; // last good comp stays mounted
      }

      const next: MountedComp = {
        id: msg.id,
        Component,
        settings: msg.settings,
        inputProps: { ...msg.inputProps, assets: assetUrls },
        autoplay: msg.autoplay ?? true,
      };

      errorLogRef.current = [];
      setComp(next);
      await settle();
      // A render-phase throw during mount surfaces through the Player's error event
      // (recorded in the log) within the settle window.
      const mountError = errorLogRef.current[0];
      if (mountError) {
        post({ type: 'load-error', id: msg.id, phase: 'mount', message: mountError.message });
        if (lastGoodRef.current) setComp(lastGoodRef.current); // revert to last good
        return;
      }
      lastGoodRef.current = next;
      post({ type: 'loaded', id: msg.id });
      if (next.autoplay) {
        playerRef.current?.seekTo(0);
        playerRef.current?.play();
      }
    },
    [post],
  );

  // Duration for probe clamping, read through a ref so the message loop stays stable.
  const durationRef = useRef(1);
  useEffect(() => {
    if (comp) durationRef.current = comp.settings.durationInFrames;
  }, [comp]);

  const handleProbe = useCallback(
    async (id: number, frames: number[], checkFrames: number[] = []) => {
      if (probeBusyRef.current) return;
      probeBusyRef.current = true;
      try {
        const player = playerRef.current;
        const duration = durationRef.current;
        const clamp = (f: number) => Math.max(0, Math.min(duration - 1, Math.round(f)));
        const errorFrames = new Set(frames.map(clamp));
        const readabilityFrames = new Set(checkFrames.map(clamp));
        const errors: { frame: number; message: string }[] = [];
        const textIssues: { frame: number; kind: string; key: string; message: string }[] = [];
        player?.pause();
        // One seek per distinct frame, in order: error probing and the readability checks
        // share the settle.
        for (const frame of [...new Set([...errorFrames, ...readabilityFrames])].sort((a, b) => a - b)) {
          errorLogRef.current = [];
          player?.seekTo(frame);
          await settle();
          if (errorFrames.has(frame)) {
            for (const e of errorLogRef.current) errors.push({ frame, message: e.message });
          }
          // Skip the checks on a frame that just threw - the DOM is whatever survived.
          if (readabilityFrames.has(frame) && errorLogRef.current.length === 0) {
            const checks = window.__noacgTextChecks;
            for (const issue of [
              ...(checks?.clip() ?? []),
              ...(checks?.safeArea() ?? []),
              ...(checks?.occlusion() ?? []),
            ]) {
              textIssues.push({ frame, ...issue });
            }
          }
        }
        post({ type: 'probe-result', id, ok: errors.length === 0, errors, textIssues });
      } finally {
        probeBusyRef.current = false;
      }
    },
    [post],
  );

  // The message loop. Nonce + parent-source checks authenticate the opaque channel.
  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.source !== window.parent) return;
      const msg = ev.data as AppToHost;
      if (!msg || msg.channel !== PLAYER_CHANNEL || msg.nonce !== nonce) return;
      switch (msg.type) {
        case 'load':
          void handleLoad(msg);
          break;
        case 'probe':
          void handleProbe(msg.id, msg.frames, msg.checkFrames);
          break;
        case 'play':
          playerRef.current?.play();
          break;
        case 'pause':
          playerRef.current?.pause();
          break;
        case 'replay':
          playerRef.current?.seekTo(0);
          playerRef.current?.play();
          break;
        case 'seek':
          playerRef.current?.pause();
          playerRef.current?.seekTo(msg.frame);
          break;
        case 'set-props':
          setComp((c) =>
            c ? { ...c, inputProps: { ...msg.inputProps, assets: (c.inputProps.assets as Record<string, string>) ?? {} } } : c,
          );
          break;
      }
    };
    window.addEventListener('message', onMessage);
    post({ type: 'ready' });
    return () => window.removeEventListener('message', onMessage);
  }, [nonce, handleLoad, handleProbe, post]);

  // Player event wiring: frames (throttled ~10 Hz), play/pause state, render errors.
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !comp) return;
    let lastFrameSent = 0;
    const onFrame = (e: { detail: { frame: number } }) => {
      const now = performance.now();
      if (now - lastFrameSent < 100) return;
      lastFrameSent = now;
      post({ type: 'frame', id: comp.id, frame: e.detail.frame });
    };
    const onPlay = () => post({ type: 'state', id: comp.id, playing: true });
    const onPause = () => post({ type: 'state', id: comp.id, playing: false });
    const onError = (e: { detail: { error: Error } }) => recordError(e.detail.error.message);
    player.addEventListener('frameupdate', onFrame);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);
    player.addEventListener('error', onError);
    return () => {
      player.removeEventListener('frameupdate', onFrame);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
      player.removeEventListener('error', onError);
    };
  }, [comp, post, recordError]);

  if (!comp) return null;

  // The Player's INTERNAL error boundary catches composition render throws before any of
  // our listeners exist (the 'error' event can fire mid-mount, ahead of effect wiring).
  // Its errorFallback receives the error, so a tiny reporter component is the reliable
  // channel: it records the error right after commit - inside handleLoad's settle window.
  const ErrorReporter = ({ error }: { error: Error }) => {
    const reported = useRef(false);
    useEffect(() => {
      if (reported.current) return;
      reported.current = true;
      recordError(error.message);
    }, [error]);
    return null;
  };

  // key per load: every module mounts a FRESH Player at frame 0 (never at whatever frame
  // the previous module was parked on) and a fresh boundary after a failure.
  return (
    <RootErrorBoundary key={comp.id} onError={recordError}>
      <Player
        ref={playerRef}
        component={comp.Component}
        inputProps={comp.inputProps}
        durationInFrames={Math.max(1, comp.settings.durationInFrames)}
        fps={comp.settings.fps}
        compositionWidth={comp.settings.width}
        compositionHeight={comp.settings.height}
        style={{ width: '100%', height: '100%' }}
        loop
        errorFallback={({ error }) => <ErrorReporter error={error} />}
      />
    </RootErrorBoundary>
  );
}
