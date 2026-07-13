// The app-side client for the player host iframe (public/player-host/, its own package -
// see player-host/src/protocol.ts, THE spec these types mirror; keep the two in sync by
// hand and bump the version together).
//
// The iframe runs sandbox="allow-scripts" with NO allow-same-origin: an opaque origin, so
// untrusted composition code can't reach the app's localStorage (the Anthropic key lives
// there) or session. Consequences handled here: postMessage targets '*' (an opaque origin
// can't be named) with a per-session nonce in the URL hash doing the authentication, and
// assets cross as transferred ArrayBuffers (parent blob URLs are unreadable over there).

import { uuid } from '../model/id';
import type { AssetFile } from '../model/types';
import { assetLogicalName, assetMime, type VideoCompSettings } from './types';

export const PLAYER_CHANNEL = 'noacg-player';
export const PLAYER_PROTOCOL_V = 1;
export const PLAYER_HOST_URL = '/player-host/index.html';

export interface PlayerFrameInfo {
  frame: number;
}

export interface ProbeResult {
  ok: boolean;
  errors: { frame: number; message: string }[];
}

/** load() outcome. `disposed` = this bridge was torn down (a newer player exists) -
 *  callers must treat it as "ignore me / retry on the fresh bridge", never as a module error. */
export type LoadResult = { ok: true } | { ok: false; message: string; disposed?: boolean };

interface HostEvent {
  channel: string;
  v: number;
  nonce: string;
  type: string;
  id?: number;
  phase?: string;
  message?: string;
  frame?: number | null;
  ok?: boolean;
  errors?: { frame: number; message: string }[];
  playing?: boolean;
}

export interface PlayerBridgeCallbacks {
  onFrame?: (frame: number) => void;
  onState?: (playing: boolean) => void;
  onRuntimeError?: (message: string, frame: number | null) => void;
}

/**
 * Owns the handshake, the load-id counter, and promise-wrapped load/probe. One bridge per
 * mounted iframe; commands queue until the host posts `ready`.
 */
export class PlayerBridge {
  readonly nonce = uuid();
  private iframe: HTMLIFrameElement | null = null;
  private ready = false;
  private queue: object[] = [];
  private loadId = 0;
  private disposedFlag = false;
  /** Serializes load/probe operations: exactly one is in flight at a time (the preview's
   *  debounced reloads, the validator's candidate loads, and probes never race). */
  private chain: Promise<unknown> = Promise.resolve();
  private pendingLoad: {
    id: number;
    resolve: (r: LoadResult) => void;
  } | null = null;
  private pendingProbe: { id: number; resolve: (r: ProbeResult) => void } | null = null;
  private callbacks: PlayerBridgeCallbacks;
  private onMessage = (ev: MessageEvent) => this.handleMessage(ev);

  constructor(callbacks: PlayerBridgeCallbacks = {}) {
    this.callbacks = callbacks;
    window.addEventListener('message', this.onMessage);
  }

  /** The iframe src carrying the session nonce. */
  get src(): string {
    return `${PLAYER_HOST_URL}#n=${this.nonce}`;
  }

  attach(iframe: HTMLIFrameElement): void {
    this.iframe = iframe;
  }

  /** Tear down. In-flight and queued operations resolve `disposed` immediately - nothing
   *  may hang on a replaced bridge (StrictMode remounts create then dispose one). */
  dispose(): void {
    this.disposedFlag = true;
    window.removeEventListener('message', this.onMessage);
    this.iframe = null;
    this.ready = false;
    this.queue = [];
    this.pendingLoad?.resolve({ ok: false, message: 'the player was replaced', disposed: true });
    this.pendingLoad = null;
    this.pendingProbe?.resolve({ ok: false, errors: [{ frame: 0, message: 'the player was replaced' }] });
    this.pendingProbe = null;
  }

  get disposed(): boolean {
    return this.disposedFlag;
  }

  /** The current load generation (host events from older loads are dropped). */
  get currentLoadId(): number {
    return this.loadId;
  }

  /** Load a compiled module; resolves when mounted (or with the eval/mount error).
   *  Loads are SERIALIZED - each waits for the previous load/probe to finish. */
  load(
    compiledJs: string,
    settings: VideoCompSettings,
    inputProps: Record<string, unknown>,
    assets: AssetFile[],
    opts: { autoplay?: boolean } = {},
  ): Promise<LoadResult> {
    const run = (): Promise<LoadResult> => {
      if (this.disposedFlag) {
        return Promise.resolve({ ok: false, message: 'the player was replaced', disposed: true });
      }
      const id = ++this.loadId;
      const payload = assets.map((a) => assetPayload(a));
      return new Promise((resolve) => {
        this.pendingLoad = { id, resolve };
        this.post(
          {
            type: 'load',
            id,
            compiledJs,
            settings: {
              width: settings.width,
              height: settings.height,
              fps: settings.fps,
              durationInFrames: settings.durationInFrames,
            },
            inputProps,
            assets: payload,
            autoplay: opts.autoplay ?? true,
          },
          payload.map((p) => p.bytes),
        );
      });
    };
    const op = this.chain.then(run, run);
    this.chain = op;
    return op;
  }

  /** Probe frames on the current module (validation). Serialized like load. */
  probe(frames: number[]): Promise<ProbeResult> {
    const run = (): Promise<ProbeResult> => {
      if (this.disposedFlag) {
        return Promise.resolve({ ok: false, errors: [{ frame: 0, message: 'the player was replaced' }] });
      }
      const id = this.loadId;
      return new Promise((resolve) => {
        this.pendingProbe = { id, resolve };
        this.post({ type: 'probe', id, frames });
      });
    };
    const op = this.chain.then(run, run);
    this.chain = op;
    return op;
  }

  play(): void {
    this.post({ type: 'play', id: this.loadId });
  }
  pause(): void {
    this.post({ type: 'pause', id: this.loadId });
  }
  replay(): void {
    this.post({ type: 'replay', id: this.loadId });
  }
  seek(frame: number): void {
    this.post({ type: 'seek', id: this.loadId, frame });
  }

  private post(msg: object, transfer: Transferable[] = []): void {
    const full = { channel: PLAYER_CHANNEL, v: PLAYER_PROTOCOL_V, nonce: this.nonce, ...msg };
    if (!this.ready) {
      this.queue.push(full);
      return;
    }
    // targetOrigin '*': the sandboxed frame's origin is opaque and cannot be named; the
    // nonce (never exposed outside this session) authenticates both directions instead.
    this.iframe?.contentWindow?.postMessage(full, '*', transfer);
  }

  private handleMessage(ev: MessageEvent): void {
    const msg = ev.data as HostEvent;
    if (!msg || msg.channel !== PLAYER_CHANNEL || msg.nonce !== this.nonce) return;
    if (ev.source !== this.iframe?.contentWindow) return;

    switch (msg.type) {
      case 'ready': {
        this.ready = true;
        const queued = this.queue;
        this.queue = [];
        for (const m of queued) this.iframe?.contentWindow?.postMessage(m, '*');
        break;
      }
      case 'loaded': {
        const pending = this.pendingLoad;
        if (pending && pending.id === msg.id) {
          pending.resolve({ ok: true });
          this.pendingLoad = null;
        }
        break;
      }
      case 'load-error': {
        const pending = this.pendingLoad;
        if (pending && pending.id === msg.id) {
          pending.resolve({ ok: false, message: msg.message ?? 'load failed' });
          this.pendingLoad = null;
        }
        break;
      }
      case 'probe-result': {
        const pending = this.pendingProbe;
        if (pending && pending.id === msg.id) {
          pending.resolve({ ok: !!msg.ok, errors: msg.errors ?? [] });
          this.pendingProbe = null;
        }
        break;
      }
      case 'frame':
        if (msg.id === this.loadId) this.callbacks.onFrame?.(msg.frame ?? 0);
        break;
      case 'state':
        if (msg.id === this.loadId) this.callbacks.onState?.(!!msg.playing);
        break;
      case 'runtime-error':
        if (msg.id === this.loadId) {
          this.callbacks.onRuntimeError?.(msg.message ?? 'error', (msg.frame as number | null) ?? null);
        }
        break;
    }
  }
}

/** Convert an AssetFile (a data URL in practice) into transfer bytes for the host. */
function assetPayload(asset: AssetFile): { name: string; mime: string; bytes: ArrayBuffer } {
  const name = assetLogicalName(asset.path);
  const mime = assetMime(asset) || 'application/octet-stream';
  if (typeof asset.data !== 'string') {
    // Blob assets are not produced by the video panels today; guard anyway.
    return { name, mime, bytes: new ArrayBuffer(0) };
  }
  const m = /^data:[^;,]*;base64,(.*)$/s.exec(asset.data);
  if (!m) return { name, mime, bytes: new TextEncoder().encode(asset.data).buffer as ArrayBuffer };
  const bin = atob(m[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { name, mime, bytes: bytes.buffer };
}
