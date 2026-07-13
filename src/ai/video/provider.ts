// The video AI provider seam, parallel to ai/provider.ts. Both providers (Claude harness,
// offline stub) emit a complete single-file Remotion module; the caller injects the live
// validator (compile -> static checks -> player probe) so the provider stays UI-free and
// can feed exact validation errors back to the model in its repair rounds.

import type { MotionPlan, VideoChatMessage } from '../../model/videoTypes';
import type { VideoAssetInfo, VideoCompSettings, VideoValidationResult } from '../../video/types';

export interface VideoGenerateContext {
  settings: VideoCompSettings;
  assets: VideoAssetInfo[];
  /** Raw asset data URLs by logical name - image assets become vision blocks. */
  assetData?: Map<string, string>;
  /** Model id override for this project (undefined/'' = the global AI setting). */
  model?: string;
}

/** The injected validate pipeline (bound to the live player bridge by the chat panel). */
export type VideoValidator = (tsx: string) => Promise<VideoValidationResult>;

export interface VideoGenerateResult {
  /** One sentence describing the composition, shown as the assistant chat turn. */
  summary: string;
  /** The complete tsx module (best-so-far even when validation failed). */
  tsx: string;
  /** The Motion Director's structured plan (null for refinements and the stub). */
  motionPlan: MotionPlan | null;
  /** The motion/design skills the harness loaded (informational). */
  skills: string[];
  /** The final validation outcome; null when no validator was injected. */
  validation: VideoValidationResult | null;
}

export interface VideoAIProvider {
  /** Full generation: intent -> motion plan -> code -> validate/repair. */
  generateVideo(
    prompt: string,
    ctx: VideoGenerateContext,
    validate?: VideoValidator,
  ): Promise<VideoGenerateResult>;
  /** Iterative refinement of the current module (chat-driven targeted change). */
  refineVideo(
    request: string,
    current: { tsx: string; chat: VideoChatMessage[] },
    ctx: VideoGenerateContext,
    validate?: VideoValidator,
  ): Promise<VideoGenerateResult>;
}
