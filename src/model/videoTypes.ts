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
import type { FieldDescriptor, VideoFieldKind } from './fieldModel';
import { uuid } from './id';

/** Which editor world the app is showing: SPX live graphics or the video editor. */
export type DocKind = 'spx' | 'video';

/** One turn of the AI iteration chat. Part of the document so context survives reload. */
export interface VideoChatMessage {
  role: 'user' | 'assistant';
  text: string;
  at: string; // ISO timestamp
}

/**
 * An editable composition input - the video-project counterpart of an SPX DataField. The AI
 * declares a handful (the headline, an accent colour, a score, a logo image) so a
 * non-technical user can change the content in the Content panel WITHOUT touching TSX. The
 * kinds are a subset of the shared field vocabulary (model/fieldModel.ts) - the same kinds
 * the SPX operator controls speak - so one Template Definition across Remotion/SPX/operator
 * controls drops in naturally. The `key` is the prop name the composition reads:
 * `fields.<key>` (always with a `?? default` fallback so the code still renders standalone).
 * Values ride into both the preview and the render inside `inputProps`.
 *
 * Value shape by type: text/color/select carry a string, number a number, and `image` carries
 * the LOGICAL NAME of a project asset (the video counterpart of an SPX `filelist` filename) -
 * the composition resolves it against the `assets` map it already receives, e.g.
 * `assets[String(fields.logo ?? '')]`. An empty string means "none". Because the asset URL
 * lives in `assets`, not the field value, an image input adds no bytes to the manifest budget.
 */
export type VideoInputType = VideoFieldKind;

export interface VideoInput {
  /** The `fields.<key>` prop the composition reads (a plain identifier). */
  key: string;
  type: VideoInputType;
  /** Human label shown in the Content panel. */
  label: string;
  /** The current value (edited by the panel). */
  value: string | number;
  /** The AI-declared default - the fallback in code and the per-field Reset target. */
  default: string | number;
  /** 'select' only: the allowed choices. */
  options?: string[];
  /** 'number' only: bounds + step for the control (advisory clamps). */
  min?: number;
  max?: number;
  step?: number;
}

/**
 * A video input as a shared FIELD DESCRIPTOR - the same shape an SPX DataField becomes
 * (control/controlModel.ts fieldDescriptors). This is the adapter that lets the Content panel
 * render the very same control component as the SPX Data and operator panels: one vocabulary,
 * one control, no drift.
 */
export function videoInputDescriptor(input: VideoInput): FieldDescriptor {
  return {
    key: input.key,
    label: input.label,
    kind: input.type,
    defaultValue: input.default,
    options: input.options?.map((o) => ({ label: o, value: o })),
    min: input.min,
    max: input.max,
    step: input.step,
  };
}

/** The `{ [key]: value }` bag passed to the composition as its `fields` prop (preview + render). */
export function videoFieldValues(inputs: VideoInput[]): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const i of inputs) out[i.key] = i.value;
  return out;
}

/**
 * Adopt a freshly generated input set while preserving values the user actually changed.
 * For a key that persists across a regeneration/refinement AND whose current value differs
 * from its old default (i.e. the user edited it), the user's value wins; otherwise the new
 * default applies. New keys arrive at their default.
 */
export function mergeVideoInputs(prev: VideoInput[], next: VideoInput[]): VideoInput[] {
  const prevByKey = new Map(prev.map((i) => [i.key, i]));
  return next.map((n) => {
    const p = prevByKey.get(n.key);
    if (p && p.value !== p.default) return { ...n, value: p.value };
    return { ...n, value: n.default };
  });
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
  /** Stacking order back-to-front at the hero moment (optional: plans saved before it existed). */
  layering?: string;
  phases: MotionPlanPhase[];
}

/**
 * The composition settings a generation was WRITTEN AGAINST - the ones the AI was told about
 * when it wrote the code that's in the project now.
 *
 * The AI plans motion to a duration and a frame, and writes the resulting numbers into the
 * code: an exit that starts at frame 170, type sized against a 1920-wide frame, a background
 * it paints (or deliberately doesn't, for an alpha render). Changing the project's settings
 * afterwards changes what the player and the renderer do - it does NOT rewrite that code. So
 * shortening a 6 s piece to 3 s cuts its exit off, and ticking "transparent" on a composition
 * that paints its own background still renders opaque.
 *
 * Recording what the code was authored for is what lets the editor SAY so (settingsDrift) and
 * offer to fix it, instead of silently rendering something the user didn't ask for. `null` on
 * a project whose code no AI has written yet - the starter composition derives everything from
 * useVideoConfig, so it fits any settings, and a hand-written module is its author's business.
 */
export type AuthoredSettings = Pick<
  VideoProject,
  'durationInFrames' | 'fps' | 'width' | 'height' | 'transparent'
>;

/** What no longer matches the settings the code was written for, in the user's words. */
export function settingsDrift(project: VideoProject): string[] {
  const a = project.authoredFor;
  if (!a) return [];
  const drift: string[] = [];
  const sec = (frames: number, fps: number) => (frames / fps).toFixed(2);
  const was = sec(a.durationInFrames, a.fps);
  const now = sec(project.durationInFrames, project.fps);
  if (was !== now) drift.push(`the motion was written to fill ${was} s - the project is now ${now} s`);
  if (a.fps !== project.fps) drift.push(`it was written for ${a.fps} fps - the project is now ${project.fps} fps`);
  if (a.width !== project.width || a.height !== project.height) {
    drift.push(
      `it was laid out for a ${a.width}×${a.height} frame - the project is now ${project.width}×${project.height}`,
    );
  }
  if (a.transparent !== project.transparent) {
    drift.push(
      project.transparent
        ? 'it was written to paint its own background - the project now renders with alpha, so that background will still be there'
        : 'it was written for an alpha render and paints no background - the project is now opaque, so it will sit on a flat colour',
    );
  }
  return drift;
}

/** The refinement to send when the user asks the AI to bring the code up to the new settings. */
export function driftRequest(project: VideoProject): string {
  const secs = (project.durationInFrames / project.fps).toFixed(2);
  return (
    `The project settings changed after you wrote this composition:\n` +
    settingsDrift(project)
      .map((d) => `- ${d}`)
      .join('\n') +
    `\n\nUpdate the code to fit the settings as they are now: retime the motion to fill EXACTLY ${secs} s ` +
    `(${project.durationInFrames} frames at ${project.fps} fps), lay it out for a ${project.width}×${project.height} frame, and ` +
    (project.transparent
      ? 'paint NO background - the root must be transparent for the alpha render.'
      : 'design a deliberate background - the render is opaque.') +
    ` Keep the design and the editable inputs as they are; change only what the new settings require.`
  );
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
  /** Editable composition inputs (the video Template Definition) the AI declared and the
   *  Content panel edits; their values ride into the preview and render via inputProps.
   *  The panel ALSO shows inputs read straight out of the code (model/videoInputInfer.ts);
   *  one lands here as soon as it is edited. */
  inputs: VideoInput[];
  /** The settings the current code was written against (see AuthoredSettings). Set on every
   *  AI result; null until one lands. Drives the drift warning, never the player or render -
   *  those always follow the project's live settings. */
  authoredFor: AuthoredSettings | null;
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
const STARTER_HEADLINE = 'Your video starts here';

const STARTER_TSX = `// Starter composition - replaced by your first AI generation, or edit it directly.
// Everything derives from the current frame, so scrubbing and rendering are deterministic.
// The headline is an editable input: change it in the Content panel (no code needed), or
// edit the fallback here. Any value the panel exposes reaches the composition as \`fields\`.

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export default function Composition({ fields = {} }: { fields?: Record<string, string | number> }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const headline = fields.headline ?? '${STARTER_HEADLINE}';

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
        {headline}
      </div>
    </AbsoluteFill>
  );
}
`;

/** The starter project's one editable input (mirrors the STARTER_TSX `fields.headline`). */
const STARTER_INPUTS: VideoInput[] = [
  { key: 'headline', type: 'text', label: 'Headline', value: STARTER_HEADLINE, default: STARTER_HEADLINE },
];

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
    inputs: STARTER_INPUTS.map((i) => ({ ...i })),
    // The starter derives everything from useVideoConfig, so it fits whatever the settings say.
    authoredFor: null,
    createdAt: now,
    updatedAt: now,
    exportPrefs: null,
  };
}
