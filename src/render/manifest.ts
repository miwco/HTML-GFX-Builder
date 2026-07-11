// The render manifest — the deterministic contract between the editor and any renderer
// (the local Remotion runner today, Vercel Sandbox in production, others later).
//
// PURE MODULE: no DOM, no Vite-only imports (?raw, import.meta). The Remotion composition
// in render-worker/ imports this file relatively and webpack-compiles it, so the editor UI
// and the renderer read the exact same shapes and constants.
//
// The core promise: manifest + frame number = exact pixels. Everything a frame depends on
// travels here — the fully self-contained document, the data snapshot, the timing model,
// and the virtual-clock epoch (so even wall-clock graphics render reproducibly).

/** Bump when the manifest shape changes incompatibly. The worker rejects unknown versions. */
export const RENDER_MANIFEST_VERSION = 1;

/** Bump when the in-document __noacgRender API changes. The host handshakes on it. */
export const RENDER_RUNTIME_VERSION = 1;

export type RenderFormatId = 'mp4' | 'webm' | 'png-still' | 'png-sequence' | 'prores4444';

/** Static per-format facts shared by the UI (capability copy) and the adapters. */
export interface RenderFormatInfo {
  id: RenderFormatId;
  label: string;
  /** Extension of the finished download (the sequence ships as a zip). */
  ext: string;
  mime: string;
  alpha: boolean;
  video: boolean;
  note: string;
}

export const RENDER_FORMATS: Record<RenderFormatId, RenderFormatInfo> = {
  mp4: {
    id: 'mp4', label: 'MP4 (H.264)', ext: 'mp4', mime: 'video/mp4',
    alpha: false, video: true,
    note: 'Plays everywhere. No transparency — the graphic is flattened onto a background color.',
  },
  webm: {
    id: 'webm', label: 'WebM', ext: 'webm', mime: 'video/webm',
    alpha: true, video: true,
    note: 'Transparent video for OBS/vMix and the web. Alpha plays in Chrome/Firefox (not Safari).',
  },
  'png-still': {
    id: 'png-still', label: 'PNG still', ext: 'png', mime: 'image/png',
    alpha: true, video: false,
    note: 'One lossless transparent frame — thumbnails, socials, rundown art.',
  },
  'png-sequence': {
    id: 'png-sequence', label: 'PNG sequence (ZIP)', ext: 'zip', mime: 'application/zip',
    alpha: true, video: true,
    note: 'Every frame as a lossless transparent PNG, zero-padded names, zipped.',
  },
  prores4444: {
    id: 'prores4444', label: 'ProRes 4444 (MOV)', ext: 'mov', mime: 'video/quicktime',
    alpha: true, video: true,
    note: 'Broadcast-grade transparent video for Premiere / Resolve / Final Cut. Large files.',
  },
};

/** Output settings the user picks per render. */
export interface RenderOutput {
  format: RenderFormatId;
  /** mp4 only: the color the alpha is flattened onto. Default '#000000'. */
  backgroundColor?: string;
  /** webm only: encode VP9 instead of the default VP8. */
  vp9?: boolean;
  /** mp4/webm: constant rate factor override; unset = Remotion's default. */
  crf?: number;
  /** png-still only: the moment to capture, in output-timeline ms.
   *  Unset = the settled on-air moment (IN end + half the first hold), resolved after measurement. */
  stillTimeMs?: number;
}

/** The timing model — total duration is the user's choice; animations keep their real
 *  durations and the remainder becomes HOLD (see schedule.ts for the exact rule). */
export interface RenderTiming {
  /** The user-picked TOTAL output duration. durationInFrames derives from this alone. */
  totalDurationMs: number;
  /** How many middle steps (» presses) to play. Unset = all the graphic has. */
  stepsToPlay?: number;
  /** 'auto' schedules stop() so the exit ends exactly at the total; 'none' never stops
   *  (bugs/tickers — the final hold runs to the end). */
  outMode: 'auto' | 'none';
  /** Holds shorter than this raise a warning (not an error). */
  minHoldMs: number;
  /** Virtual wall-clock at t=0 — Date.now() inside the render document reads epoch + t,
   *  so clock graphics are reproducible. Stamped at manifest build time. */
  epochMs: number;
}

/** What prepare() measured inside the render document (real seconds, at final resolution —
 *  credits rolls and marquees size themselves from layout, so measurement must happen
 *  in-page, not from the animation data). */
export interface MeasuredDurations {
  inMs: number;
  /** Middle steps in press order (may be shorter than the graphic offers if capped). */
  stepMs: number[];
  outMs: number;
  /** A phase with an endless loop (repeat: -1) reports true and a fixed cost of 0 —
   *  the hold absorbs it. */
  continuous: { in: boolean; out: boolean };
  /** False for imported/blank templates without the builder globals — only outMode 'none'
   *  renders are possible (we cannot measure an exit we cannot build). */
  hasBuilders: boolean;
  runtimeVersion: number;
}

/** One operator cue on the output timeline. */
export interface RenderCue {
  atMs: number;
  action: 'update' | 'play' | 'next' | 'stop';
  /** update: the JSON payload string. */
  payload?: string;
}

/** A display segment for the UI breakdown (IN / HOLD / STEP / OUT bands). */
export interface RenderSegment {
  kind: 'in' | 'hold' | 'step' | 'out';
  label: string;
  startMs: number;
  durationMs: number;
  /** True when the segment's animation loops forever (shown as "runs through"). */
  continuous?: boolean;
}

export interface RenderSchedule {
  cues: RenderCue[];
  segments: RenderSegment[];
  durationMs: number;
}

/** The full render job input. documentHtml is completely self-contained (assets and fonts
 *  as data URLs, GSAP inlined, __noacgRender injected) — the renderer needs no network
 *  and no knowledge of templates. */
export interface RenderManifest {
  version: typeof RENDER_MANIFEST_VERSION;
  projectName: string;
  documentHtml: string;
  /** The AUTHORED template resolution. Never change it for output sizing — layout math
   *  (marquee widths, credit roll heights, --scale) depends on it. Use `scale`. */
  width: number;
  height: number;
  /** 25 | 30 | 50 | 60 (template fps by default). */
  fps: number;
  /** Remotion render scale: output pixels = width×scale — same CSS layout, higher density. */
  scale: number;
  timing: RenderTiming;
  /** The Data panel snapshot fed to update(). */
  data: Record<string, string>;
  output: RenderOutput;
  /** Advisory client-side measurement (UI breakdown + preflight). The worker re-measures
   *  in its own page and those numbers are authoritative. */
  estimatedDurations?: MeasuredDurations;
}

/** Frames in the finished output — fixed by the manifest alone, so Remotion's
 *  calculateMetadata never waits on measurement. */
export function durationInFrames(manifest: Pick<RenderManifest, 'fps' | 'timing'>): number {
  return Math.max(1, Math.round((manifest.timing.totalDurationMs / 1000) * manifest.fps));
}

/** The still frame index for a png-still render (defaults handled by the schedule). */
export function stillFrame(timeMs: number, fps: number): number {
  return Math.max(0, Math.round((timeMs / 1000) * fps));
}
