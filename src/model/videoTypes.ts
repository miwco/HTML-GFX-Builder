// Data model for the AI video project type ("Video or animation with AI").
//
// A VideoProject is the canonical unit of the video editor - a single-file React/Remotion
// composition plus its settings, assets, and AI iteration history. It lives in a world
// PARALLEL to SpxTemplate (live HTML graphics): its own store, its own persistence slots,
// its own editor shell. The two never mix; `kind` discriminates them wherever records may
// later share storage (the cloud `documents` table, mixed saved lists).
//
// The composition source (`tsx`) is the source of truth, exactly like html/css/js is for
// SPX templates: AI and panels emit real code, the editor shows exactly what runs, and the
// SAME compiled module drives the live preview and the final render.

import type { AssetFile } from './types';
import { uuid } from './id';

/** Which editor world the app is showing: SPX live graphics or the video editor. */
export type DocKind = 'spx' | 'video';

/** One turn of the AI iteration chat. Part of the document so context survives reload. */
export interface VideoChatMessage {
  role: 'user' | 'assistant';
  text: string;
  at: string; // ISO timestamp
}

/** One timed phase of the AI's structured motion plan ("0.0-0.4s: sweep enters"). */
export interface MotionPlanPhase {
  name: string;
  startSec: number;
  endSec: number;
  description: string;
}

/** The Motion Director's structured plan - produced before code, shown with the chat. */
export interface MotionPlan {
  concept: string;
  visualDirection: string;
  typography: string;
  background: string;
  easingApproach: string;
  assetUsage: string;
  phases: MotionPlanPhase[];
}

/** Per-project export defaults (last-used render format/scale). */
export interface VideoExportPrefs {
  format: string; // RENDER_FORMATS id ('mp4' | 'webm' | 'png-still' | 'png-sequence' | 'prores4444')
  scale: number; // 1 = authored resolution
}

/** The full video project - the source of truth edited in the video shell. */
export interface VideoProject {
  /** RFC-4122 uuid (model/id.ts) - the cloud documents.id column is a uuid PK. */
  id: string;
  /** Serialized discriminant from day one so mixed record stores can tell kinds apart. */
  kind: 'video';
  name: string;
  /** The original brief from the wizard (also duplicated as chat[0]). */
  prompt: string;
  /** The AI iteration chat, in order. */
  chat: VideoChatMessage[];
  /** The latest structured motion plan, regenerated on each full generation. */
  motionPlan: MotionPlan | null;
  /** The single-file Remotion composition source (default-exported React component). */
  tsx: string;
  durationInFrames: number;
  fps: number; // FPS_OPTIONS member (25/30/50/60)
  width: number;
  height: number;
  /** Render with an alpha channel (WebM/ProRes/PNG targets); the comp paints no background. */
  transparent: boolean;
  /** AI model id for this project (AI_MODELS); '' = follow the global AI settings. */
  aiModel: string;
  /** Uploaded assets as {path, data-URL} - the exact SPX AssetFile shape, so the
   *  backend's shape-agnostic asset walker externalizes them unchanged when sync lands. */
  assets: AssetFile[];
  createdAt: string; // ISO
  updatedAt: string; // ISO - bumped by the autosaver
  exportPrefs: VideoExportPrefs | null;
}

export const DEFAULT_VIDEO_FPS = 30;
export const DEFAULT_VIDEO_DURATION_SEC = 6;

// The starter composition every new project begins with: real, valid Remotion code that
// follows the same contract the AI is held to (imports only react/remotion, everything
// derived from useCurrentFrame/useVideoConfig, no timers or randomness). Monaco and the
// preview always have something working before the first generation lands.
const STARTER_TSX = `// Starter composition - replaced by your first AI generation, or edit it directly.
// Everything derives from the current frame, so scrubbing and rendering are deterministic.

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export default function Composition() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Rise and fade in over the first half second; fade out over the last half second.
  const enter = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exit = interpolate(frame, [durationInFrames - fps * 0.5, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          opacity: Math.min(enter, exit),
          transform: \`translateY(\${(1 - enter) * 40}px)\`,
          color: '#f4f4f5',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
      >
        Your video starts here
      </div>
    </AbsoluteFill>
  );
}
`;

/** Build a fresh project; every field can be seeded (the wizard passes its form values). */
export function createDefaultVideoProject(
  init: Partial<
    Pick<
      VideoProject,
      | 'name'
      | 'prompt'
      | 'chat'
      | 'fps'
      | 'width'
      | 'height'
      | 'durationInFrames'
      | 'transparent'
      | 'aiModel'
      | 'assets'
    >
  > = {},
): VideoProject {
  const now = new Date().toISOString();
  const fps = init.fps ?? DEFAULT_VIDEO_FPS;
  return {
    id: uuid(),
    kind: 'video',
    name: init.name ?? 'New video',
    prompt: init.prompt ?? '',
    chat: init.chat ?? [],
    motionPlan: null,
    tsx: STARTER_TSX,
    durationInFrames: init.durationInFrames ?? DEFAULT_VIDEO_DURATION_SEC * fps,
    fps,
    width: init.width ?? 1920,
    height: init.height ?? 1080,
    transparent: init.transparent ?? false,
    aiModel: init.aiModel ?? '',
    assets: init.assets ?? [],
    createdAt: now,
    updatedAt: now,
    exportPrefs: null,
  };
}
