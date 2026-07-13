// The Claude-backed video provider - the NoaCG motion-design harness. Not one raw
// prompt-to-code call but staged: (a) skill detection loads only relevant craft guidance,
// (b) the Motion Director produces a structured timed plan, (c) the Remotion coder writes
// the module against the contract + plan + one canonical example, (d) a bounded
// compile/probe/repair loop feeds exact validator errors back. Mirrors claudeProvider's
// doctrine (forced tools, real example, errors-back repair) for the video world.

import { callClaude, type ContentBlock } from '../anthropic';
import { parseDataUrl } from '../../assets/assetUtils';
import type { MotionPlan, VideoChatMessage } from '../../model/videoTypes';
import type {
  VideoAIProvider,
  VideoGenerateContext,
  VideoGenerateResult,
  VideoValidator,
} from './provider';
import { BASE_SKILL, detectSkillsByKeyword, skillById, type VideoSkill } from './skills';
import { EXAMPLE_COMPOSITION, MOTION_PRINCIPLES, REMOTION_CONTRACT } from './prompts';
import {
  DETECT_SKILLS_TOOL,
  MOTION_PLAN_TOOL,
  REMOTION_MODULE_TOOL,
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
  const lines = ctx.assets.map((a) => {
    const dims = a.width && a.height ? `, ${a.width}x${a.height}` : '';
    return `- assets['${a.name}'] (${a.mime}${dims})`;
  });
  return `Assets available via the assets prop (use these EXACT names, nothing else):\n${lines.join('\n')}`;
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

function directorSystem(skills: VideoSkill[]): string {
  return `You are the Motion Director inside NoaCG Studio - a senior broadcast motion
designer planning a fixed-duration video composition. You produce a concise, structured,
TIMED plan another expert will implement in React/Remotion. Plan phases that cover the
full duration exactly - from 0 to the total - with a clear entrance, a hero moment/hold,
and a decisive exit (unless the brief explicitly wants motion running through the cut).

${MOTION_PRINCIPLES}

${[BASE_SKILL, ...skills].map((s) => s.prompt).join('\n\n')}

Make the plan CONCRETE and BUILDABLE, not generic:
- Name the actual on-screen elements (the exact title/word, the shapes, the accent), where
  each sits, and how big it is relative to the frame. Every phase says what enters, moves,
  or exits and when - no vague "elements animate in".
- State how the frame is filled at the hero moment - what the viewer sees edge to edge.
  Reject any plan that would leave a small element floating in empty space.
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
    system: directorSystem(skills),
    messages: [{ role: 'user', content: [...vision, { type: 'text', text }] }],
    tool: MOTION_PLAN_TOOL,
    maxTokens: 4000,
    model,
  })) as EmittedMotionPlan;
  // Defensive: schema-required or not, never let a malformed plan crash the pipeline.
  if (!Array.isArray(plan.phases)) plan.phases = [];
  return plan;
}

// ── Stage c: the Remotion coder ──────────────────────────────────────────────

function coderSystem(skills: VideoSkill[]): string {
  return `You are the motion designer-engineer inside NoaCG Studio, writing the single
React/Remotion composition module for a fixed-duration video. You write COMPLETE, working,
broadcast-quality code that a professional can read and extend.

${REMOTION_CONTRACT}

${MOTION_PRINCIPLES}

${[BASE_SKILL, ...skills].map((s) => s.prompt).join('\n\n')}

## The canonical example (a REAL module from this tool - match its structure and quality)
=== Composition.tsx ===
${EXAMPLE_COMPOSITION}
=== end example ===

Return the module ONLY via the emit_remotion_module tool.`;
}

// ── Stage d: emit + validate + bounded repair ────────────────────────────────

async function generateValidated(
  system: string,
  baseMessages: { role: 'user' | 'assistant'; content: ContentBlock[] | string }[],
  validate: VideoValidator | undefined,
  model: string | undefined,
): Promise<{ emitted: EmittedModule; validation: Awaited<ReturnType<VideoValidator>> | null }> {
  let emitted = (await callClaude({
    system,
    messages: baseMessages,
    tool: REMOTION_MODULE_TOOL,
    model,
  })) as EmittedModule;

  if (!validate) return { emitted, validation: null };

  let validation = await validate(emitted.tsx);
  for (let round = 0; round < MAX_REPAIR_ROUNDS && !validation.ok; round++) {
    // Hand the EXACT validator findings back with the full module - same doctrine as the
    // SPX repair round. Runtime findings carry frame numbers; remind the model that type
    // errors surface as runtime errors (sucrase does not typecheck).
    const errorList = validation.errors.map((e) => `- ${e.rule}: ${e.message}`).join('\n');
    emitted = (await callClaude({
      system,
      messages: [
        ...baseMessages,
        { role: 'assistant', content: 'I generated a module but validation rejected it.' },
        {
          role: 'user',
          content: `Your module failed validation. Fix ALL of these and re-emit the COMPLETE module (note: TypeScript type errors surface as runtime errors - check prop shapes and undefined values at the reported frames):\n${errorList}\n\n=== Composition.tsx ===\n${emitted.tsx}`,
        },
      ],
      tool: REMOTION_MODULE_TOOL,
      model,
    })) as EmittedModule;
    validation = await validate(emitted.tsx);
  }
  return { emitted, validation };
}

// ── The provider ─────────────────────────────────────────────────────────────

function toMotionPlan(p: EmittedMotionPlan): MotionPlan {
  return { ...p, phases: p.phases.map((ph) => ({ ...ph })) };
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
Phases:\n${phases}`;
}

class ClaudeVideoProvider implements VideoAIProvider {
  async generateVideo(
    prompt: string,
    ctx: VideoGenerateContext,
    validate?: VideoValidator,
  ): Promise<VideoGenerateResult> {
    const model = ctx.model;
    const skills = await detectSkills(prompt, undefined);
    const vision = imageBlocks(ctx, ctx.assetData ?? new Map());

    const plan = await directMotion(prompt, ctx, skills, vision, model);

    const coderText = `${settingsText(ctx)}\n${assetsText(ctx)}\n\nThe motion plan to implement:\n${planText(plan)}\n\nThe original brief:\n${prompt}`;
    const { emitted, validation } = await generateValidated(
      coderSystem(skills),
      [{ role: 'user', content: [...vision, { type: 'text', text: coderText }] }],
      validate,
      model,
    );

    return {
      summary: emitted.summary,
      tsx: emitted.tsx,
      motionPlan: toMotionPlan(plan),
      skills: [BASE_SKILL.id, ...skills.map((s) => s.id)],
      validation,
    };
  }

  async refineVideo(
    request: string,
    current: { tsx: string; chat: VideoChatMessage[] },
    ctx: VideoGenerateContext,
    validate?: VideoValidator,
  ): Promise<VideoGenerateResult> {
    const model = ctx.model;
    // Skills: the refinement request plus recent context (a "make the countdown pulse"
    // follow-up should load the countdown craft even if the request alone wouldn't).
    const recentText = current.chat.slice(-6).map((m) => m.text).join('\n');
    const skills = detectSkillsByKeyword(`${request}\n${recentText}`);
    const vision = imageBlocks(ctx, ctx.assetData ?? new Map());

    // Recent conversation as real turns (compressed), then the edit request + module.
    const history = current.chat.slice(-6).map((m) => ({
      role: m.role,
      content: m.text,
    }));
    const finalText = `${settingsText(ctx)}\n${assetsText(ctx)}\n\nModify the composition below. Change ONLY what the request needs - keep everything else as close to byte-identical as possible.\n\nRequest: ${request}\n\n=== Composition.tsx ===\n${current.tsx}`;
    const { emitted, validation } = await generateValidated(
      coderSystem(skills),
      [...history, { role: 'user', content: [...vision, { type: 'text', text: finalText }] }],
      validate,
      model,
    );

    return {
      summary: emitted.summary,
      tsx: emitted.tsx,
      motionPlan: null, // refinements keep the existing plan
      skills: [BASE_SKILL.id, ...skills.map((s) => s.id)],
      validation,
    };
  }
}

export const claudeVideoProvider: VideoAIProvider = new ClaudeVideoProvider();
