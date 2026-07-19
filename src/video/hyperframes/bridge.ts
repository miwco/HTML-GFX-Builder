// The app-side client for a HyperFrames preview iframe - the 'hyperframes' engine's
// counterpart of PlayerBridge (src/video/playerBridge.ts), speaking the driver's protocol
// (src/video/hyperframes/driver.ts is the spec side).
//
// Same security posture as the Remotion player host: the iframe runs
// sandbox="allow-scripts" with NO allow-same-origin, so composition code can't reach the
// app's localStorage or session. Unlike the player host (a prebuilt page loaded by URL),
// each load here composes a fresh srcdoc - the document IS the composition - so the nonce
// travels inside the injected driver config instead of a URL hash, and messages target
// '*' (an opaque origin can't be named) with the nonce authenticating both directions.

import { uuid } from '../../model/id';
import type { AssetFile } from '../../model/types';
import type { VideoCompSettings } from '../types';
import type { LoadResult, PlayerBridgeCallbacks, ProbeResult, ProbeTextIssue } from '../playerBridge';
import { composeHyperframesDocument } from './compose';
import { loadHyperframesFontCss } from './fontCss';
import { HF_CHANNEL, HF_PROTOCOL_V } from './driver';

/** A srcdoc that never finishes booting still resolves (a broken document must fail
 *  loudly, not hang the validate pipeline). */
const BOOT_TIMEOUT_MS = 10_000;

interface DriverEvent {
  channel: string;
  v: number;
  nonce: string;
  type: string;
  id?: number;
  message?: string;
  frame?: number;
  ok?: boolean;
  errors?: { frame: number; message: string }[];
  textIssues?: ProbeTextIssue[];
  playing?: boolean;
}

export class HyperframesBridge {
  readonly nonce = uuid();
  private iframe: HTMLIFrameElement | null = null;
  private disposedFlag = false;
  private loadId = 0;
  /** Serializes load/probe operations, exactly like PlayerBridge.chain. */
  private chain: Promise<unknown> = Promise.resolve();
  private booted = false;
  private pendingLoad: { id: number; resolve: (r: LoadResult) => void; timer: number } | null = null;
  private pendingProbe: { id: number; resolve: (r: ProbeResult) => void } | null = null;
  private callbacks: PlayerBridgeCallbacks;
  private onMessage = (ev: MessageEvent) => this.handleMessage(ev);

  constructor(callbacks: PlayerBridgeCallbacks = {}) {
    this.callbacks = callbacks;
    window.addEventListener('message', this.onMessage);
  }

  attach(iframe: HTMLIFrameElement): void {
    this.iframe = iframe;
  }

  dispose(): void {
    this.disposedFlag = true;
    window.removeEventListener('message', this.onMessage);
    this.iframe = null;
    if (this.pendingLoad) {
      clearTimeout(this.pendingLoad.timer);
      this.pendingLoad.resolve({ ok: false, message: 'the player was replaced', disposed: true });
      this.pendingLoad = null;
    }
    this.pendingProbe?.resolve({ ok: false, errors: [{ frame: 0, message: 'the player was replaced' }] });
    this.pendingProbe = null;
  }

  get disposed(): boolean {
    return this.disposedFlag;
  }

  /**
   * Compose + load a composition source. Resolves once the driver boots (or with the
   * boot error). Serialized with probes, mirroring PlayerBridge.load.
   */
  load(
    source: string,
    settings: VideoCompSettings,
    values: Record<string, string | number>,
    assets: AssetFile[],
    opts: { autoplay?: boolean } = {},
  ): Promise<LoadResult> {
    const run = () => this.runLoad(source, settings, values, assets, opts);
    const op = this.chain.then(run, run);
    this.chain = op;
    return op;
  }

  /** The load itself, OFF the chain - callers chain it (see load / loadAndProbe). */
  private runLoad(
    source: string,
    settings: VideoCompSettings,
    values: Record<string, string | number>,
    assets: AssetFile[],
    opts: { autoplay?: boolean } = {},
  ): Promise<LoadResult> {
    const run = async (): Promise<LoadResult> => {
      if (this.disposedFlag || !this.iframe) {
        return { ok: false, message: 'the player was replaced', disposed: true };
      }
      // The bundled fonts resolve once per session; every later load reuses the cache.
      const fontCss = await loadHyperframesFontCss();
      if (this.disposedFlag || !this.iframe) {
        return { ok: false, message: 'the player was replaced', disposed: true };
      }
      const id = ++this.loadId;
      this.booted = false;
      let doc: string;
      try {
        doc = composeHyperframesDocument(source, {
          settings,
          assets,
          values,
          mode: 'preview',
          fontCss,
          nonce: this.nonce,
          autoplay: opts.autoplay ?? true,
        });
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : String(e) };
      }
      return new Promise((resolve) => {
        const timer = window.setTimeout(() => {
          if (this.pendingLoad?.id === id) {
            this.pendingLoad = null;
            resolve({ ok: false, message: 'the composition never finished loading (script error before the driver could start?)' });
          }
        }, BOOT_TIMEOUT_MS);
        this.pendingLoad = { id, resolve, timer };
        this.iframe!.srcdoc = doc;
      });
    };
    return run();
  }

  /**
   * Mount a composition and probe it as ONE chain entry - the call validation must use.
   *
   * Separate `load()` then `probe()` are two entries, and the gap between them is not empty:
   * the preview panel rebuilds this same iframe on a debounce, and a rebuild enqueued while
   * the candidate is still loading lands BEFORE the probe (the probe can only be enqueued once
   * the load resolves). The checks then measure the project's own composition and report it
   * clean - a verdict about a document nobody asked to validate. Measured happening: a
   * readability spec failed about one run in eight under load, with the trace showing
   * `load(project) done` landing between `probe start` and `probe done`.
   */
  loadAndProbe(
    source: string,
    settings: VideoCompSettings,
    assets: AssetFile[],
    frames: number[],
    checkFrames: number[],
  ): Promise<{ loaded: LoadResult; probe: ProbeResult | null }> {
    const run = async (): Promise<{ loaded: LoadResult; probe: ProbeResult | null }> => {
      const loaded = await this.runLoad(source, settings, {}, assets, { autoplay: false });
      if (!loaded.ok) return { loaded, probe: null };
      return { loaded, probe: await this.runProbe(frames, checkFrames) };
    };
    const op = this.chain.then(run, run);
    this.chain = op;
    return op;
  }

  /** Probe frames on the currently loaded composition (validation). `checkFrames`
   *  additionally get the driver's readability checks - pass HOLD frames only. */
  probe(frames: number[], checkFrames: number[] = []): Promise<ProbeResult> {
    const run = () => this.runProbe(frames, checkFrames);
    const op = this.chain.then(run, run);
    this.chain = op;
    return op;
  }

  /** The probe itself, OFF the chain - callers chain it (see probe / loadAndProbe). */
  private runProbe(frames: number[], checkFrames: number[]): Promise<ProbeResult> {
    if (this.disposedFlag || !this.booted) {
      return Promise.resolve({
        ok: false,
        errors: [{ frame: 0, message: 'no composition is loaded' }],
        textIssues: [],
      });
    }
    const id = this.loadId;
    return new Promise((resolve) => {
      this.pendingProbe = { id, resolve };
      this.post({ type: 'probe', id, frames, checkFrames });
    });
  }

  play(): void {
    this.post({ type: 'play' });
  }
  pause(): void {
    this.post({ type: 'pause' });
  }
  replay(): void {
    this.post({ type: 'replay' });
  }
  seek(frame: number): void {
    this.post({ type: 'seek', frame });
  }

  /** Live scalar-variable edits: re-apply values and re-render, no reload. (Image
   *  variables substitute a URL and go through a recompose instead - the frame component
   *  keys its reload on them.) */
  setVars(values: Record<string, string | number>): void {
    this.post({ type: 'set-vars', values });
  }

  private post(msg: object): void {
    // Transport before boot is a harmless no-op (the driver ignores it).
    this.iframe?.contentWindow?.postMessage(
      { channel: HF_CHANNEL, v: HF_PROTOCOL_V, nonce: this.nonce, ...msg },
      '*',
    );
  }

  private handleMessage(ev: MessageEvent): void {
    const msg = ev.data as DriverEvent;
    if (!msg || msg.channel !== HF_CHANNEL || msg.nonce !== this.nonce) return;
    if (ev.source !== this.iframe?.contentWindow) return;

    switch (msg.type) {
      case 'ready': {
        this.booted = true;
        const pending = this.pendingLoad;
        if (pending) {
          clearTimeout(pending.timer);
          pending.resolve({ ok: true });
          this.pendingLoad = null;
        }
        break;
      }
      case 'boot-error': {
        const pending = this.pendingLoad;
        if (pending) {
          clearTimeout(pending.timer);
          pending.resolve({ ok: false, message: msg.message ?? 'the composition failed to load' });
          this.pendingLoad = null;
        }
        break;
      }
      case 'probe-result': {
        const pending = this.pendingProbe;
        if (pending && pending.id === msg.id) {
          pending.resolve({ ok: !!msg.ok, errors: msg.errors ?? [], textIssues: msg.textIssues ?? [] });
          this.pendingProbe = null;
        }
        break;
      }
      case 'frame':
        this.callbacks.onFrame?.(msg.frame ?? 0);
        break;
      case 'state':
        this.callbacks.onState?.(!!msg.playing);
        break;
      case 'runtime-error':
        this.callbacks.onRuntimeError?.(msg.message ?? 'error', null);
        break;
    }
  }
}
