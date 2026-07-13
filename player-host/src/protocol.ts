// The postMessage protocol between the app and the player host. THIS FILE IS THE SPEC -
// src/video/playerBridge.ts in the app mirrors these types verbatim (the two packages
// share no imports on purpose; keep them in sync by hand, and bump V on any change).
//
// Security model: the host iframe runs with sandbox="allow-scripts" and NO
// allow-same-origin, so its origin is opaque - the app posts with targetOrigin '*' and
// both sides authenticate messages by the per-session nonce carried in the iframe URL
// hash (#n=<nonce>) instead. The host additionally checks event.source === window.parent.

export const PLAYER_CHANNEL = 'noacg-player';
export const PLAYER_PROTOCOL_V = 1;

export interface PlayerCompSettings {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
}

/** One asset crossing the boundary: raw bytes (transferred), rebuilt as a blob URL here. */
export interface PlayerAssetPayload {
  name: string;
  mime: string;
  bytes: ArrayBuffer;
}

interface Base {
  channel: typeof PLAYER_CHANNEL;
  v: typeof PLAYER_PROTOCOL_V;
  nonce: string;
}

// ── App -> host ──────────────────────────────────────────────────────────────

export interface LoadMessage extends Base {
  type: 'load';
  /** Monotonic load counter; every host reply echoes it so stale results are droppable. */
  id: number;
  /** The compiled CJS module source (sucrase output; imports resolved by the shim). */
  compiledJs: string;
  settings: PlayerCompSettings;
  /** JSON props for the component; the host merges `assets: Record<name, blobUrl>` in. */
  inputProps: Record<string, unknown>;
  assets: PlayerAssetPayload[];
  /** Autoplay (loop) after a successful mount. */
  autoplay?: boolean;
}

export interface ProbeMessage extends Base {
  type: 'probe';
  id: number;
  /** Frames to render one by one, collecting errors (validation: [0, mid, last]). */
  frames: number[];
}

export interface TransportMessage extends Base {
  type: 'play' | 'pause' | 'replay';
  id: number;
}

export interface SeekMessage extends Base {
  type: 'seek';
  id: number;
  frame: number;
}

export interface SetPropsMessage extends Base {
  type: 'set-props';
  id: number;
  inputProps: Record<string, unknown>;
}

export type AppToHost = LoadMessage | ProbeMessage | TransportMessage | SeekMessage | SetPropsMessage;

// ── Host -> app ──────────────────────────────────────────────────────────────

export interface ReadyEvent extends Base {
  type: 'ready';
}

export interface LoadedEvent extends Base {
  type: 'loaded';
  id: number;
}

export interface LoadErrorEvent extends Base {
  type: 'load-error';
  id: number;
  phase: 'eval' | 'mount';
  message: string;
}

export interface RuntimeErrorEvent extends Base {
  type: 'runtime-error';
  id: number;
  frame: number | null;
  message: string;
}

export interface ProbeResultEvent extends Base {
  type: 'probe-result';
  id: number;
  ok: boolean;
  errors: { frame: number; message: string }[];
}

export interface FrameEvent extends Base {
  type: 'frame';
  id: number;
  frame: number;
}

export interface StateEvent extends Base {
  type: 'state';
  id: number;
  playing: boolean;
}

export type HostToApp =
  | ReadyEvent
  | LoadedEvent
  | LoadErrorEvent
  | RuntimeErrorEvent
  | ProbeResultEvent
  | FrameEvent
  | StateEvent;
