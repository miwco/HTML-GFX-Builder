// The video AI provider seam, parallel to ai/provider.ts. Both providers (Claude harness,
// offline stub) emit ONE complete composition source - a single-file Remotion module or a
// standalone HyperFrames document, whichever ENGINE the context names; the caller injects
// the live validator (static checks -> preview probe, engine-matched) so the provider
// stays UI-free and can feed exact validation errors back to the model in its repair
// rounds.

import type { MotionPlan, VideoChatMessage, VideoEngine, VideoInput } from '../../model/videoTypes';
import type { VideoAssetInfo, VideoCompSettings, VideoValidationResult } from '../../video/types';

export interface VideoGenerateContext {
  /** Which composition format to emit (the project's generation engine). */
  engine: VideoEngine;
  settings: VideoCompSettings;
  assets: VideoAssetInfo[];
  /** Raw asset data URLs by logical name - image assets become vision blocks. */
  assetData?: Map<string, string>;
  /** Model id override for this project (undefined/'' = the global AI setting). */
  model?: string;
}

/** The injected validate pipeline (bound to the live preview bridge by the chat panel;
 *  the caller matches it to the engine the context names). */
export type VideoValidator = (
  source: string,
  /** The inputs the emit declared, so the validator can check every control is actually
   *  wired. HyperFrames declares them IN the document and needs nothing here; Remotion
   *  declares them in the tool call, which is why they have to travel separately. */
  declaredInputs?: { key: string }[],
) => Promise<VideoValidationResult>;

/** Stage reporting for the UI busy line ("Designing the motion plan…"). Generation is a
 *  staged pipeline that can take a minute - the caller shows each stage as it starts so
 *  the user always knows the request is alive and what it is doing. */
export type VideoProgress = (stage: string) => void;

export interface VideoGenerateResult {
  /** One sentence describing the composition, shown as the assistant chat turn. */
  summary: string;
  /** The complete composition source in the context's engine format - a tsx module or a
   *  HyperFrames HTML document (best-so-far even when validation failed). */
  source: string;
  /** The Motion Director's structured plan (null for refinements and the stub). */
  motionPlan: MotionPlan | null;
  /** The editable inputs the composition declares (its Template Definition). `null` means
   *  "leave the current inputs unchanged"; `[]` means "this piece has NO editable content"
   *  and wipes them. A provider must only send `[]` when it really means the empty set - a
   *  refinement that simply didn't re-declare its inputs sends `null`, or the user's Content
   *  panel empties out behind them. */
  inputs: VideoInput[] | null;
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
    onProgress?: VideoProgress,
  ): Promise<VideoGenerateResult>;
  /** Iterative refinement of the current module (chat-driven targeted change). `current.inputs`
   *  is the input set the module already declares - a provider that re-emits the whole module
   *  needs it to keep the keys stable across the edit. */
  refineVideo(
    request: string,
    current: { source: string; chat: VideoChatMessage[]; inputs: VideoInput[] },
    ctx: VideoGenerateContext,
    validate?: VideoValidator,
    onProgress?: VideoProgress,
  ): Promise<VideoGenerateResult>;
}
