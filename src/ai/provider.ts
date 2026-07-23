// AI provider interface. The app is built entirely against this interface so the Claude-backed
// provider and the deterministic stub are interchangeable. AI output is always run through
// validation before it can be applied or exported — the platform owns the structure.

import type { AssetFile, Resolution, SpxTemplate, TemplateChange } from '../model/types';
import type { CustomFont } from '../model/fonts';
import type { Palette } from '../model/wizard';
import type { ValidationResult } from '../validation/validateTemplate';
import type { DesignSpec } from './designSpec';
import type { GenerationSpec } from './spec/generationSpec';

/** Extra inputs for generation: uploaded images (logo / still), brand colors, canvas. */
export interface GenerateContext {
  /** Uploaded images that APPEAR IN the graphic (logo, stills) — data-URL assets
   *  (paths like images/logo.png), bundled into the result. */
  images: AssetFile[];
  /** Style references: images that only INFLUENCE the design (mood boards, screenshots).
   *  Sent to the model as vision input, never bundled, never placed, never copied. */
  references?: AssetFile[];
  /** Brand colors to honor (the project brand or a custom palette), if any. */
  palette: Palette | null;
  /** The user's uploaded primary font — embedded like a wizard font import. */
  customFont?: CustomFont;
  /** The user-authored structured setup (the "More control" panel), if any. */
  spec?: GenerationSpec | null;
  resolution: Resolution;
  fps: number;
}

/**
 * The injected validation pipeline (static validateTemplate + the runtime bench), bound by
 * the UI — the same seam the video harness uses (VideoValidator). The provider stays free of
 * DOM/iframe concerns; callers that can bench inject it, callers that can't simply don't.
 */
export type SpxValidator = (template: SpxTemplate) => Promise<ValidationResult>;

/** Options every template-producing provider method accepts. */
export interface GenerateOptions {
  /** Validate candidates (and drive the repair loop). Falls back to static validation. */
  validate?: SpxValidator;
  /** Stage announcements for the UI's busy line ("Designing…", "Testing it live…"). */
  onProgress?: (stage: string) => void;
  /**
   * For modify: the design spec that PRODUCED the template being modified (returned on a
   * grounded AiTemplateChange). When present and the template is still house-shaped, the
   * refinement happens at spec level — "warmer colours, calmer entrance" re-assembles
   * deterministically instead of round-tripping code.
   */
  spec?: DesignSpec;
}

/** Which pipeline produced a result — surfaced honestly in the UI and in telemetry.
 *  'raw' = the default one-shot generation (harness off). */
export type AiPath = 'grounded' | 'grounded+polish' | 'custom' | 'raw' | 'stub';

/** A template change with the harness's provenance attached. */
export interface AiTemplateChange extends TemplateChange {
  path?: AiPath;
  /** The final validation the harness ran (static + bench when injected). */
  validation?: ValidationResult;
  /** On grounded results: the design spec that produced the template (pass it back via
   *  GenerateOptions.spec so refinements can stay at spec level). */
  spec?: DesignSpec;
}

export interface AIProvider {
  /** Create a new template from a natural-language prompt (+ optional images/brand). */
  generate(prompt: string, context?: GenerateContext, options?: GenerateOptions): Promise<AiTemplateChange>;
  /**
   * The DEFAULT generation (harness off): one model call, no design-spec stage, no bench
   * repair loop — the model's own take, statically validated for honest display. The
   * benchmark showed these look strong; the harness must EARN being switched on.
   */
  generateRaw(prompt: string, context?: GenerateContext, options?: GenerateOptions): Promise<AiTemplateChange>;
  /**
   * The harness path (harness on): THREE genuinely different design directions from one
   * design-stage call, each assembled/validated like generate(). The UI offers the pick;
   * the choice feeds aggregated preference data (src/ai/preferences.ts).
   */
  generateAlternatives(prompt: string, context?: GenerateContext, options?: GenerateOptions): Promise<AiTemplateChange[]>;
  /** Modify the current template per a prompt. */
  modify(prompt: string, template: SpxTemplate, options?: GenerateOptions): Promise<AiTemplateChange>;
  /** Explain a piece of code (returns prose, no template change). */
  explain(code: string): Promise<string>;
  /** Attempt fixes for known validation problems. */
  fix(template: SpxTemplate, options?: GenerateOptions): Promise<AiTemplateChange>;
  /** Make the template more SPX-ready (definition, relative paths, runtime functions). */
  makeSpxReady(template: SpxTemplate, options?: GenerateOptions): Promise<AiTemplateChange>;
  /**
   * Convert an IMPORTED template per a prompt: keep what the user's file got right, bring
   * the rest to the house contracts. The import itself is always the deterministic parser
   * (model/importTemplate.ts) — the AI only ever sees the parsed template, never raw bytes.
   */
  convertImport(
    prompt: string,
    imported: SpxTemplate,
    context?: GenerateContext,
    options?: GenerateOptions,
  ): Promise<AiTemplateChange>;
}
