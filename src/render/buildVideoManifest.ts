// Build a kind:'remotion' RenderManifest from a video project. PURE (no DOM): the
// compiled module comes from the same sucrase output the live preview runs, and assets
// ride as data URLs inside inputProps - what previews is exactly what renders.

import {
  RENDER_MANIFEST_VERSION,
  type RemotionRenderManifest,
  type RenderFormatId,
} from './manifest';

export interface VideoRenderInput {
  name: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  /** The preview's compile output, verbatim (sucrase CJS - the worker's shim evals it). */
  compiledJs: string;
  /** Component props; includes assets: Record<logicalName, dataUrl>. */
  inputProps: Record<string, unknown>;
  transparent?: boolean;
}

export interface VideoRenderOptions {
  format: RenderFormatId;
  scale?: number;
  backgroundColor?: string;
  vp9?: boolean;
  crf?: number;
  /** png-still: the frame to capture (default: the middle frame, resolved by the worker). */
  stillFrame?: number;
}

export function buildVideoManifest(p: VideoRenderInput, o: VideoRenderOptions): RemotionRenderManifest {
  return {
    version: RENDER_MANIFEST_VERSION,
    kind: 'remotion',
    projectName: p.name,
    compiledJs: p.compiledJs,
    inputProps: p.inputProps,
    durationInFrames: p.durationInFrames,
    transparent: p.transparent,
    width: p.width,
    height: p.height,
    fps: p.fps,
    scale: o.scale ?? 1,
    output: {
      format: o.format,
      backgroundColor: o.backgroundColor,
      vp9: o.vp9,
      crf: o.crf,
      // Reuses RenderOutput.stillTimeMs: frame -> ms at the project fps (the worker
      // converts back losslessly at the same fps).
      stillTimeMs: o.stillFrame != null ? (o.stillFrame / p.fps) * 1000 : undefined,
    },
  };
}
