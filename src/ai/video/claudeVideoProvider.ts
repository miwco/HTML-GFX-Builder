// The Claude-backed video provider - the NoaCG motion-design harness. Not one raw
// prompt-to-code call but staged: (a) skill detection loads only relevant craft guidance,
// (b) the Motion Director produces a structured timed plan, (c) the coder writes the
// composition against the ENGINE's contract + the plan + one canonical example (Remotion
// TSX or a HyperFrames document, per ctx.engine), (d) a bounded validate/repair loop
// feeds exact validator errors back. Mirrors claudeProvider's doctrine (forced tools,
// real example, errors-back repair) for the video world. Stages a and b are engine-
// independent - the same brief, plan, skills, assets, and settings feed both coders.

import { callClaude, type ContentBlock } from '../anthropic';
import { parseDataUrl } from '../../assets/assetUtils';
import type { MotionPlan, VideoChatMessage, VideoEngine, VideoInput } from '../../model/videoTypes';
import { hyperframesInputs } from '../../video/hyperframes/parse';
import type {
  VideoAIProvider,
  VideoGenerateContext,
  VideoGenerateResult,
  VideoProgress,
  VideoValidator,
} from './provider';
import { BASE_SKILL, detectSkillsByKeyword, skillById, type VideoSkill } from './skills';
import { detectReferenceCards, referenceSection } from './referenceCards';
import { EXAMPLE_COMPOSITION, MOTION_PRINCIPLES, REMOTION_CONTRACT } from './prompts';
import { EXAMPLE_HYPERFRAMES_COMPOSITION, HYPERFRAMES_CONTRACT } from './hyperframesPrompts';
import {
  DETECT_SKILLS_TOOL,
  HYPERFRAMES_MODULE_TOOL,
  MOTION_PLAN_TOOL,
  REMOTION_MODULE_TOOL,
  type EmittedHyperframesModule,
  type EmittedInput,
  type EmittedModule,
  type EmittedMotionPlan,
} from './tools';

/** Bounded automatic repair: the initial emit plus up to two errors-back rounds. */
const MAX_REPAIR_ROUNDS = 2;
const HAIKU = 'claude-haiku-4-5-20251001';

// ── Context formatting ───────────────────────────────────────────────────────

function settingsText(ctx: VideoGenerateContext): string {
  const s = ctx.settings;
  const secs = (s.durationInFrames / s.fps).toFixed(2);
  return `Canvas: ${s.width}x${s.height} @ ${s.fps} fps. Duration: EXACTLY ${secs} s (${s.durationInFrames} frames). Background: ${
    s.transparent ? 'TRANSPARENT (alpha output - the root paints no background)' : 'opaque (design a deliberate background)'
  }.`;
}

function assetsText(ctx: VideoGenerateContext): string {
  if (ctx.assets.length === 0) return 'Assets: none uploaded.';
  const hf = ctx.engine === 'hyperframes';
  const lines = ctx.assets.map((a) => {
    const dims = a.width && a.height ? `, ${a.width}x${a.height}` : '';
    return `- ${hf ? `asset:${a.name}` : `assets['${a.name}']`} (${a.mime}${dims})`;
  });
  return hf
    ? `Assets available as asset: URLs (use these EXACT names, nothing else):\n${lines.join('\n')}`
    : `Assets available via the assets prop (use these EXACT names, nothing else):\n${lines.join('\n')}`;
}

/**
 * The inputs the module ALREADY declares, for a refinement. Without this the model has to
 * re-infer the input set from the `fields.x ?? default` reads in the code, and a dropped or
 * renamed key costs the user whatever they typed into the Content panel (values survive a
 * refinement only key-by-key - model/videoTypes.ts mergeVideoInputs).
 */
function currentInputsText(inputs: VideoInput[], engine: VideoEngine): string {
  if (inputs.length === 0) return 'Editable inputs: none declared yet.';
  const lines = inputs.map(
    (i) => `- ${i.key} (${i.type}) "${i.label}", default ${JSON.stringify(i.default)}`,
  );
  const keep =
    engine === 'hyperframes'
      ? 'keep every data-composition-variables declaration and its data-var-text/data-var-src/var(--id) bindings in step'
      : "keep the code's `fields.<key> ?? default` fallbacks in step";
  return `Editable inputs the composition already declares - re-declare ALL of them with the SAME keys and types, and ${keep}. Only add, remove, or rename a key when the request actually changes what content is editable; a key that silently changes loses the value the user typed into it:\n${lines.join('\n')}`;
}

/** Uploaded raster images as vision blocks so the model designs around what it sees. */
function imageBlocks(ctx: VideoGenerateContext, assetData: Map<string, string>): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  for (const a of ctx.assets) {
    if (!a.mime.startsWith('image/') || a.mime === 'image/svg+xml') continue;
    const data = assetData.get(a.name);
    if (!data) continue;
    const parsed = parseDataUrl(data);
    if (!parsed) continue;
    blocks.push({ type: 'image', source: { type: 'base64', media_type: parsed.mime, data: parsed.base64 } });
    if (blocks.length >= 3) break; // enough visual context; keep the request light
  }
  return blocks;
}

// ── Stage a: skill detection ─────────────────────────────────────────────────

async function detectSkills(prompt: string, model?: string): Promise<VideoSkill[]> {
  const byKeyword = detectSkillsByKeyword(prompt);
  if (byKeyword.length > 0) return byKeyword;
  // Nothing matched - one cheap classification call picks up to 3 skills.
  try {
    const result = (await callClaude({
      system:
        'Classify a motion-graphics request onto the most relevant skills. Pick at most 3; pick none when nothing clearly applies.',
      messages: [{ role: 'user', content: prompt }],
      tool: DETECT_SKILLS_TOOL,
      maxTokens: 300,
      model: model ?? HAIKU,
    })) as { skills: string[] };
    return result.skills.map((id) => skillById(id)).filter((s): s is VideoSkill => !!s);
  } catch {
    return []; // classification is best-effort - the base skill alone is fine
  }
}

// ── Stage b: the Motion Director ─────────────────────────────────────────────

function directorSystem(skills: VideoSkill[], engine: VideoEngine, brief: string): string {
  const medium =
    engine === 'hyperframes' ? 'HTML/CSS with a GSAP timeline (HyperFrames)' : 'React/Remotion';
  const references = referenceSection(detectReferenceCards(brief));
  return `You are the Motion Director inside NoaCG Studio - a senior broadcast motion
designer planning a fixed-duration video composition. You produce a concise, structured,
TIMED plan another expert will implement in ${medium}. Plan phases that cover the
full duration exactly - from 0 to the total - with a clear entrance, a hero moment/hold,
and a decisive exit (unless the brief explicitly wants motion running through the cut).

${MOTION_PRINCIPLES}

${[BASE_SKILL, ...skills].map((s) => s.prompt).join('\n\n')}

${references ? `${references}\n\n` : ''}Make the plan CONCRETE and BUILDABLE, not generic:
- \`concept\` names the ONE memorable device this piece is built around and what makes it
  distinct from a default result. Commit to it; do not hedge across several ideas.
- Name the actual on-screen elements (the exact title/word, the shapes, the accent), where
  each sits, and how big it is relative to the frame. Every phase says what enters, moves,
  or exits and when - no vague "elements animate in".
- State how the frame is filled at the hero moment - what the viewer sees edge to edge.
  Reject any plan that would leave a small element floating in empty space.
- State the stacking order at the hero moment in \`layering\`: back-to-front, with the hero
  text/logo on top of every shape, and which layers exit first (text before its panels).
- If the brief expects an asset that isn't in the provided list (e.g. a logo with none
  uploaded), plan the designed substitute explicitly (a typographic wordmark), never a
  placeholder. Put that decision in assetUsage.
- Pick real, tasteful specifics: a font direction, an accent colour that isn't default blue
  or pure red, a deliberate background. The plan is the taste; the coder executes it.

Return the plan ONLY via the emit_motion_plan tool.`;
}

async function directMotion(
  prompt: string,
  ctx: VideoGenerateContext,
  skills: VideoSkill[],
  vision: ContentBlock[],
  model?: string,
): Promise<EmittedMotionPlan> {
  const text = `${settingsText(ctx)}\n${assetsText(ctx)}\n\nThe brief:\n${prompt}`;
  const plan = (await callClaude({
    system: directorSystem(skills, ctx.engine, prompt),
    messages: [{ role: 'user', content: [...vision, { type: 'text', text }] }],
    tool: MOTION_PLAN_TOOL,
    maxTokens: 4000,
    model,
  })) as EmittedMotionPlan;
  // Defensive: schema-required or not, never let a malformed plan crash the pipeline.
  if (!Array.isArray(plan.phases)) plan.phases = [];
  return plan;
}

// ── Stage c: the coder (engine-specific contract + example, shared taste) ────

function coderSystem(skills: VideoSkill[], engine: VideoEngine): string {
  const skillsBlock = [BASE_SKILL, ...skills].map((s) => s.prompt).join('\n\n');
  if (engine === 'hyperframes') {
    return `You are the motion designer-engineer inside NoaCG Studio, writing a standalone
HyperFrames composition (one HTML document, all motion on one paused GSAP timeline) for a
fixed-duration video. You write COMPLETE, working, broadcast-quality code that a
professional can read and extend.

${HYPERFRAMES_CONTRACT}

${MOTION_PRINCIPLES}

${skillsBlock}

Skill notes may use React/Remotion idioms (springs, interpolate, random(seed), fontSize
from useVideoConfig) - translate them to this medium: GSAP eases (back.out, expo.out,
power3.out; spring-like feels come from back/elastic with restraint), timeline positions
in seconds, precomputed value arrays instead of per-frame functions, and px sizes computed
from the given canvas.

## The canonical example (a REAL composition from this tool - match its structure and quality)
=== composition.html ===
${EXAMPLE_HYPERFRAMES_COMPOSITION}
=== end example ===

The example shows the SHAPE of a good composition - variables declared on <html>, clips
with data-* timing, one paused timeline with every tween positioned in seconds, clean
comments - not a style to reproduce. Its visual motifs (angled slabs, the snapping title,
the breathing hold) belong to ITS brief; your document implements the PLAN's concept with
its own vocabulary.

Return the document ONLY via the emit_hyperframes_composition tool.`;
  }
  return `You are the motion designer-engineer inside NoaCG Studio, writing the single
React/Remotion composition module for a fixed-duration video. You write COMPLETE, working,
broadcast-quality code that a professional can read and extend.

${REMOTION_CONTRACT}

${MOTION_PRINCIPLES}

${skillsBlock}

## The canonical example (a REAL module from this tool - match its structure and quality)
=== Composition.tsx ===
${EXAMPLE_COMPOSITION}
=== end example ===

The example shows the SHAPE of a good module - timing constants up top, named phases,
everything frame-derived, clean comments - not a style to reproduce. Its visual motifs
(angled panels, light sweep, breathing hold, small-caps kicker) belong to ITS brief;
your module implements the PLAN's concept with its own vocabulary.

The example above is emitted with these inputs (note how each read has a matching fallback,
and how the image input's value is an asset name resolved against the assets prop):
inputs: [
  { "key": "title", "type": "text", "label": "Title", "default": "Prime Time" },
  { "key": "kicker", "type": "text", "label": "Kicker", "default": "Saturday · Live" },
  { "key": "logo", "type": "image", "label": "Logo", "default": "" },
  { "key": "accent", "type": "color", "label": "Accent colour", "default": "#f6a623" }
]

Return the module ONLY via the emit_remotion_module tool.`;
}

// ── Stage d: emit + validate + bounded repair ────────────────────────────────

/** The engine-neutral emit: whichever tool ran, the caller sees {summary, source, inputs?}. */
interface EmittedSource {
  summary: string;
  source: string;
  /** remotion only: the tool-declared inputs (hyperframes declares them IN the document). */
  inputs?: EmittedInput[];
}

function emitConfig(engine: VideoEngine) {
  if (engine === 'hyperframes') {
    return {
      tool: HYPERFRAMES_MODULE_TOOL,
      fileLabel: 'composition.html',
      repairNote:
        'check the composition root attributes, the timeline registration, and the determinism rules',
      toEmitted: (raw: unknown): EmittedSource => {
        const m = raw as EmittedHyperframesModule;
        return { summary: m.summary, source: m.html };
      },
    };
  }
  return {
    tool: REMOTION_MODULE_TOOL,
    fileLabel: 'Composition.tsx',
    repairNote:
      'note: TypeScript type errors surface as runtime errors - check prop shapes and undefined values at the reported frames',
    toEmitted: (raw: unknown): EmittedSource => {
      const m = raw as EmittedModule;
      return { summary: m.summary, source: m.tsx, inputs: m.inputs };
    },
  };
}

async function generateValidated(
  engine: VideoEngine,
  system: string,
  baseMessages: { role: 'user' | 'assistant'; content: ContentBlock[] | string }[],
  validate: VideoValidator | undefined,
  model: string | undefined,
  onProgress?: VideoProgress,
): Promise<{ emitted: EmittedSource; validation: Awaited<ReturnType<VideoValidator>> | null }> {
  const cfg = emitConfig(engine);
  // cacheSystem: the coder system prompt (contract + skills + the canonical example) is
  // large and IDENTICAL across the first call and every repair round - one cache breakpoint
  // turns those re-sends into cache reads. Cost only; the prompt itself is untouched.
  let emitted = cfg.toEmitted(
    await callClaude({ system, messages: baseMessages, tool: cfg.tool, model, cacheSystem: true }),
  );

  if (!validate) return { emitted, validation: null };

  onProgress?.('Checking the result in the player…');
  let validation = await validate(emitted.source, emitted.inputs);
  for (let round = 0; round < MAX_REPAIR_ROUNDS && !validation.ok; round++) {
    onProgress?.(`Fixing issues the checks found (round ${round + 1} of ${MAX_REPAIR_ROUNDS})…`);
    // Hand the EXACT validator findings back with the full source - same doctrine as the
    // SPX repair round. Runtime findings carry frame numbers.
    const errorList = validation.errors.map((e) => `- ${e.rule}: ${e.message}`).join('\n');
    emitted = cfg.toEmitted(
      await callClaude({
        system,
        messages: [
          ...baseMessages,
          { role: 'assistant', content: 'I generated a composition but validation rejected it.' },
          {
            role: 'user',
            // The static checks QUOTE the offending source line (compile.ts / hyperframes
            // validate.ts). Saying so explicitly is load-bearing: a banned window.* access
            // once survived both repair rounds because the finding read as a general rule
            // rather than an instruction about one specific line of the model's own code.
            content: `Your composition failed validation. Fix ALL of these and re-emit the COMPLETE source (${cfg.repairNote}):\n${errorList}\n\nWhere a finding quotes an offending line, that EXACT line must not survive your fix - delete or rewrite it, do not merely work around it. Re-read your own source for every other place the same mistake appears.\n\n=== ${cfg.fileLabel} ===\n${emitted.source}`,
          },
        ],
        tool: cfg.tool,
        model,
        cacheSystem: true,
      }),
    );
    validation = await validate(emitted.source, emitted.inputs);
  }
  return { emitted, validation: noteUnprobed(demoteSoftFindings(validation)) };
}

/** A validation that never reached a mounted player measured NOTHING at runtime - no clipped
 *  or occluded text, no frame errors. Its empty error list means "not checked", and the
 *  repair loop above (which only fires on `!ok`) therefore never ran. Say so in the warnings
 *  the UI surfaces: an unverified composition must not be presented as a verified one. */
function noteUnprobed<T extends Awaited<ReturnType<VideoValidator>>>(validation: T): T {
  if (validation.probed) return validation;
  return {
    ...validation,
    warnings: [
      ...validation.warnings,
      {
        rule: 'not-probed',
        message:
          'The runtime checks did not run - no preview was mounted, so text the frame clips or ' +
          'another layer covers would not have been caught. Open the preview and regenerate to verify.',
      },
    ],
  };
}

/** Findings that must DRIVE a repair round but must not, alone, throw the work away after
 *  the rounds are spent - the SPX harness's doctrine for its editability findings. A clipped
 *  headline is a real defect and worth two rewrites; a false positive that survives them
 *  should ship with a warning, not silently discard a composition the user waited for. */
const SOFT_RULES = new Set(['text-clip', 'text-safe-area', 'text-occluded']);

/**
 * `text-clip-total` is missing from that set ON PURPOSE, and must stay missing: it is the
 * verdict that no part of the line is painted at any hold frame (src/video/readability.ts).
 * The demotion above exists to protect work from a finding that might be wrong; a total crop
 * cannot be wrong, so demoting it just ships text the viewer never sees. The guard below
 * already handles it - one non-soft error is enough to keep the whole result failed - so
 * nothing here needs to name it, only to leave it out.
 */

function demoteSoftFindings<T extends Awaited<ReturnType<VideoValidator>>>(validation: T): T {
  if (validation.ok || validation.errors.some((e) => !SOFT_RULES.has(e.rule))) return validation;
  return { ...validation, ok: true, errors: [], warnings: [...validation.warnings, ...validation.errors] };
}

// ── The provider ─────────────────────────────────────────────────────────────

function toMotionPlan(p: EmittedMotionPlan): MotionPlan {
  return { ...p, phases: p.phases.map((ph) => ({ ...ph })) };
}

/** Map the tool's declared inputs to project VideoInputs (value starts at the default). A
 *  missing/malformed array yields null - "the model said nothing about inputs", which the
 *  caller reads as "leave them alone". Never a pipeline failure: inputs are optional. */
function toInputs(emitted: EmittedInput[] | undefined): VideoInput[] | null {
  if (!Array.isArray(emitted)) return null;
  return emitted
    .filter((i) => i && typeof i.key === 'string' && i.key.length > 0)
    .map((i) => ({
      key: i.key,
      type: i.type,
      label: i.label || i.key,
      value: i.default,
      default: i.default,
      ...(i.options ? { options: i.options } : {}),
      ...(i.min != null ? { min: i.min } : {}),
      ...(i.max != null ? { max: i.max } : {}),
      ...(i.step != null ? { step: i.step } : {}),
    }));
}

function planText(plan: EmittedMotionPlan): string {
  const phases = plan.phases
    .map((p) => `  ${p.startSec.toFixed(2)}-${p.endSec.toFixed(2)}s ${p.name}: ${p.description}`)
    .join('\n');
  return `Concept: ${plan.concept}
Visual direction: ${plan.visualDirection}
Typography: ${plan.typography}
Background: ${plan.background}
Easing: ${plan.easingApproach}
Assets: ${plan.assetUsage}
Layering: ${plan.layering}
Phases:\n${phases}`;
}

class ClaudeVideoProvider implements VideoAIProvider {
  async generateVideo(
    prompt: string,
    ctx: VideoGenerateContext,
    validate?: VideoValidator,
    onProgress?: VideoProgress,
  ): Promise<VideoGenerateResult> {
    const model = ctx.model;
    onProgress?.('Reading the brief…');
    const skills = await detectSkills(prompt, undefined);
    const vision = imageBlocks(ctx, ctx.assetData ?? new Map());

    onProgress?.('Designing the motion plan…');
    const plan = await directMotion(prompt, ctx, skills, vision, model);

    onProgress?.(ctx.engine === 'hyperframes' ? 'Writing the HyperFrames composition…' : 'Writing the Remotion code…');
    const coderText = `${settingsText(ctx)}\n${assetsText(ctx)}\n\nThe motion plan to implement:\n${planText(plan)}\n\nThe original brief:\n${prompt}`;
    const { emitted, validation } = await generateValidated(
      ctx.engine,
      coderSystem(skills, ctx.engine),
      [{ role: 'user', content: [...vision, { type: 'text', text: coderText }] }],
      validate,
      model,
      onProgress,
    );

    return {
      summary: emitted.summary,
      source: emitted.source,
      motionPlan: toMotionPlan(plan),
      // A fresh generation defines the input set outright - an empty set really does mean
      // "this piece has no editable content", and there is nothing to preserve anyway.
      // HyperFrames declares inputs IN the document (composition variables) - parse them;
      // Remotion declares them in the emit tool.
      inputs:
        ctx.engine === 'hyperframes'
          ? hyperframesInputs(emitted.source)
          : toInputs(emitted.inputs) ?? [],
      skills: [BASE_SKILL.id, ...skills.map((s) => s.id)],
      validation,
    };
  }

  async refineVideo(
    request: string,
    current: { source: string; chat: VideoChatMessage[]; inputs: VideoInput[] },
    ctx: VideoGenerateContext,
    validate?: VideoValidator,
    onProgress?: VideoProgress,
  ): Promise<VideoGenerateResult> {
    const model = ctx.model;
    onProgress?.('Writing the change…');
    // Skills: the refinement request plus recent context (a "make the countdown pulse"
    // follow-up should load the countdown craft even if the request alone wouldn't).
    const recentText = current.chat.slice(-6).map((m) => m.text).join('\n');
    const skills = detectSkillsByKeyword(`${request}\n${recentText}`);
    const vision = imageBlocks(ctx, ctx.assetData ?? new Map());

    // Recent conversation as real turns (compressed), then the edit request + source.
    const history = current.chat.slice(-6).map((m) => ({
      role: m.role,
      content: m.text,
    }));
    const fileLabel = ctx.engine === 'hyperframes' ? 'composition.html' : 'Composition.tsx';
    const finalText = `${settingsText(ctx)}\n${assetsText(ctx)}\n${currentInputsText(current.inputs, ctx.engine)}\n\nModify the composition below. Change ONLY what the request needs - keep everything else as close to byte-identical as possible.\n\nRequest: ${request}\n\n=== ${fileLabel} ===\n${current.source}`;
    const { emitted, validation } = await generateValidated(
      ctx.engine,
      coderSystem(skills, ctx.engine),
      [...history, { role: 'user', content: [...vision, { type: 'text', text: finalText }] }],
      validate,
      model,
      onProgress,
    );

    // A refinement re-emits the COMPLETE source, so it re-declares its inputs, and merging
    // against the current set (in applyResult) preserves values the user already edited.
    // But an empty set here is far more likely a model that forgot to repeat the
    // declarations than a deliberate "this piece has no editable content" - and honouring
    // it would silently empty the user's Content panel and revert their text to the code
    // defaults. Treat it as "unchanged"; a refinement that really should drop an input
    // still emits the others, so the genuine removal case survives. (Applies to both
    // engines: HyperFrames inputs parse out of the document's variable declarations.)
    const inputs =
      ctx.engine === 'hyperframes' ? hyperframesInputs(emitted.source) : toInputs(emitted.inputs);

    return {
      summary: emitted.summary,
      source: emitted.source,
      motionPlan: null, // refinements keep the existing plan
      inputs: inputs && inputs.length > 0 ? inputs : null,
      skills: [BASE_SKILL.id, ...skills.map((s) => s.id)],
      validation,
    };
  }
}

export const claudeVideoProvider: VideoAIProvider = new ClaudeVideoProvider();
