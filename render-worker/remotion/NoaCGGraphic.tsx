// The ONE generic Remotion composition: hosts a graphic's render document in a same-origin
// srcdoc iframe and drives its __noacgRender runtime frame by frame. No graphic is ever
// recreated as a Remotion composition — the manifest's document IS the graphic, and this
// component only synchronizes its virtual clock with Remotion's frame counter.
//
// Per frame: delayRender → seek the runtime to frame/fps → settle paint (microtasks +
// double rAF on the HOST page, whose clock is real — only the iframe's clock is virtual)
// → continueRender. Seeks are serialized through a promise chain so they never interleave,
// and a backward seek (Remotion may distribute frames across tabs) triggers a hard reset:
// fresh iframe, re-prepare, fast-forward — always correct, just slower.

import { AbsoluteFill, cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { useEffect, useRef } from 'react';
import { computeSchedule } from '../../src/render/schedule';
import { RENDER_RUNTIME_VERSION, type HtmlRenderManifest, type MeasuredDurations, type RenderCue } from '../../src/render/manifest';

interface RenderRuntime {
  version: number;
  prepare(opts: { epochMs: number; fps: number; data: Record<string, string> }): Promise<MeasuredDurations>;
  setSchedule(cues: RenderCue[]): void;
  seek(tMs: number): void;
  vNow(): number;
  getErrors(): string[];
}

interface HostState {
  chain: Promise<void>;
  iframe: HTMLIFrameElement | null;
  runtime: RenderRuntime | null;
}

const settlePaint = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export const NoaCGGraphic: React.FC<HtmlRenderManifest> = (manifest) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HostState>({ chain: Promise.resolve(), iframe: null, runtime: null });

  // The host page's color scheme must match the render document's (light) — Chromium
  // paints a scheme-mismatched iframe opaque, which would silently kill alpha output.
  useEffect(() => {
    document.documentElement.style.colorScheme = 'light';
  }, []);

  /** (Re)create the iframe, run prepare(), compute + register the cue schedule. */
  const boot = async (): Promise<void> => {
    const container = containerRef.current;
    if (!container) throw new Error('noacg host: container missing');
    stateRef.current.iframe?.remove();
    stateRef.current.iframe = null;
    stateRef.current.runtime = null;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.style.cssText = `width: ${manifest.width}px; height: ${manifest.height}px; border: 0; display: block; background: transparent; color-scheme: light;`;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('noacg host: document load timed out')), 30_000);
      iframe.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
      iframe.srcdoc = manifest.documentHtml;
      container.appendChild(iframe);
    });

    const w = iframe.contentWindow as (Window & { __noacgRender?: RenderRuntime }) | null;
    const runtime = w?.__noacgRender;
    if (!runtime) throw new Error('noacg host: __noacgRender missing from the render document');
    if (runtime.version !== RENDER_RUNTIME_VERSION) {
      throw new Error(`noacg host: runtime version ${runtime.version} !== ${RENDER_RUNTIME_VERSION} (stale document?)`);
    }

    const measured = await runtime.prepare({
      epochMs: manifest.timing.epochMs,
      fps: manifest.fps,
      data: manifest.data,
    });
    const { schedule, issues } = computeSchedule(measured, manifest.timing, manifest.fps, JSON.stringify(manifest.data));
    if (!schedule) {
      throw new Error('noacg host: unrenderable timing — ' + issues.map((i) => i.message).join(' | '));
    }
    runtime.setSchedule(schedule.cues);
    stateRef.current.iframe = iframe;
    stateRef.current.runtime = runtime;
  };

  useEffect(() => {
    const handle = delayRender(`noacg seek f${frame}`);
    stateRef.current.chain = stateRef.current.chain
      .then(async () => {
        const tMs = (frame / fps) * 1000;
        const st = stateRef.current;
        if (!st.runtime || tMs < st.runtime.vNow() - 0.001) await boot(); // first frame or rewind
        st.runtime!.seek(tMs);
        await Promise.resolve(); // flush the image-shim MutationObserver microtasks
        await settlePaint();
        const errors = st.runtime!.getErrors();
        if (errors.length > 0) throw new Error('graphic errors: ' + errors.join(' | '));
        continueRender(handle);
      })
      .catch((err: unknown) => cancelRender(err));
    // The chain serializes work; effects only enqueue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, fps]);

  const background =
    manifest.output.format === 'mp4' ? (manifest.output.backgroundColor ?? '#000000') : undefined;

  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      <div ref={containerRef} style={{ width: manifest.width, height: manifest.height }} />
    </AbsoluteFill>
  );
};
