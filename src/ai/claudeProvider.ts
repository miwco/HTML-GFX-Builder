// The Claude-backed AI provider: prompt → complete SPX template, validated before it can
// apply. The system prompt teaches the model this project's contracts (SPX runtime, :root
// style vars, marked ANIMATION region, auto-fit, teachable ES5) and shows lt01's real
// generated code as the canonical example — so AI output stays editable by the Style and
// Motion panels exactly like wizard output. One automatic repair round runs when the
// validator finds errors; anything still broken is surfaced to the user, never auto-applied.

import { callClaude, type ClaudeTool, type ContentBlock } from './anthropic';
import type { AIProvider, GenerateContext } from './provider';
import { parseDefinition } from '../model/spxDefinition';
import { RESOLUTIONS, type SpxTemplate, type TemplateChange, type TemplateType, DEFAULT_SETTINGS } from '../model/types';
import { parseDataUrl } from '../assets/assetUtils';
import { validateTemplate } from '../validation/validateTemplate';
import { lt01 } from '../templates/lowerThirds/lt01';

// ── Structured output: the model must return the template via this tool ─────

const TEMPLATE_TOOL: ClaudeTool = {
  name: 'emit_template',
  description: 'Return the complete SPX template as its three code files.',
  input_schema: {
    type: 'object',
    required: ['name', 'type', 'summary', 'html', 'css', 'js'],
    additionalProperties: false,
    properties: {
      name: { type: 'string', description: 'Short template name, e.g. "Neon Lower Third"' },
      type: {
        type: 'string',
        description: 'The closest graphic category',
        enum: ['lower-third', 'info-card', 'end-credits', 'ticker', 'fullscreen', 'bug', 'countdown', 'scoreboard', 'info-box', 'starting-soon', 'infographic', 'quiz', 'blank'],
      },
      summary: { type: 'string', description: 'One sentence describing the design for the user.' },
      html: { type: 'string', description: 'Complete index.html (doctype through </html>).' },
      css: { type: 'string', description: 'Complete template.css.' },
      js: { type: 'string', description: 'Complete template.js.' },
    },
  },
};

interface EmittedTemplate {
  name: string;
  type: TemplateType;
  summary: string;
  html: string;
  css: string;
  js: string;
}

// ── The system prompt: contracts + taste + one real example ─────────────────

function systemPrompt(): string {
  // The canonical example is REAL generated code — the same contracts the wizard writes.
  const example = lt01.create();
  return `You are the template generator inside the SPX HTML GFX Builder — a tool that creates
broadcast graphics templates for SPX Graphics / CasparCG playout. You write COMPLETE, working,
marketplace-quality templates. The user is learning to code from what you write.

## The SPX contract (hard requirements)
- The HTML contains a <script> defining window.SPXGCTemplateDefinition with the playout settings
  and DataFields. Every data field is named f0, f1, … and maps to exactly one element with the
  same id (SPX writes the value into it). Input-only values live in hidden divs.
- Field types: textfield, textarea, number, and filelist for images (with
  "assetfolder": "./images/", "extension": "png"). Use dropdown ONLY for a genuinely
  constrained design choice. No color/checkbox fields.
- template.js defines global update(data) (data is a JSON string), play(), stop(), next().
  It loads in <head>, so any load-time DOM work needs a DOMContentLoaded guard.
- External references exactly like the example: js/gsap.min.js, css/template.css,
  js/template.js. GSAP is available as the global "gsap" — it is the ONLY library.
- Image values are relative paths (images/logo.png). Write them into <img> elements via the
  setFieldValue helper (copy it from the example verbatim).

## The house style contracts (keep AI output editable by the app's panels)
- ALL colors flow through :root vars: --accent, --text-color, --text-dim, --panel-bg,
  --font-heading, --scale. Zero hardcoded colors anywhere else in the CSS.
- ALL pixel sizes via calc(N * var(--scale)).
- The root element (one wrapper div) is absolutely positioned in a safe-area zone and starts
  at opacity: 0 — play() reveals it.
- Text boxes hug their content (width: fit-content) with a max-width cap so long text wraps
  instead of overflowing. Lines sit in overflow-hidden mask divs so they can animate in.
- ALL animation code lives between the exact markers
  /* == ANIMATION (generated — the Animation panel rewrites this block) == */ and
  /* == END ANIMATION == */ with three knob variables: var animSpeed, var easeIn, var easeOut.
  Define buildInTimeline() and buildOutTimeline() inside the region. Replay-safe: play() after
  stop() must render correctly.
- Never put skew/rotation on an element a timeline tweens — paint it on a ::before layer.

## Layout safety (hard requirements — the #1 rejection reason)
- Text must NEVER overlap other text or UI elements unless deliberately layered on a panel
  behind it. Stack text with normal flow or flex column + gap — never absolutely position
  two siblings where they can collide. Distinct pieces of information get distinct space.
- Mentally render before emitting: once with the default field values, once with every text
  field twice as long. Nothing may collide, clip mid-word, or escape its panel.
- Labels never wrap mid-word: short caps labels get white-space: nowrap; label columns get
  a min-width that fits the longest label.
- Contrast is broadcast-grade: primary text reads clearly against what it actually sits on
  (aim ≥ 4.5:1); dim/secondary text stays ≥ 60% opacity white on dark panels; never accent
  text on accent background; text over a busy area gets a panel or shadow behind it.
- When the brief asks for a logo/image field, the empty state shows a visible placeholder
  mark (toggle it with the has-image pattern from the example) — never an invisible slot.

## Motion doctrine
- Entrances use Out-direction easings (power2.out/power3.out/expo.out; back.out for a snappy
  pop). Exits use In-direction and run FASTER than entrances. Entrances 0.5–0.9 s total.
- Linear ("none") ONLY for continuous travel (tickers, rolls, timers, progress).
- Bounce/elastic only if the user asks for playful.

## Code style
- Teachable ES5 in template.js (var, function declarations), short useful comments that
  explain WHY. Rich but commented CSS. No frameworks, no cleverness.
- Broadcast taste: one accent color doing sharp small work, generous whitespace, real
  typographic hierarchy, marketplace-grade composition — never a tutorial demo.

## The canonical example (REAL output of this tool — match its structure exactly)
=== index.html ===
${example.html}
=== template.css ===
${example.css}
=== template.js ===
${example.js}
=== end of example ===

Return the template ONLY via the emit_template tool.`;
}

// ── Building an SpxTemplate from the model's output ──────────────────────────

function toTemplate(emitted: EmittedTemplate, ctx?: GenerateContext, base?: SpxTemplate): SpxTemplate {
  const parsed = parseDefinition(emitted.html);
  return {
    name: emitted.name || base?.name || 'AI template',
    type: emitted.type ?? base?.type ?? 'blank',
    resolution: ctx?.resolution ?? base?.resolution ?? RESOLUTIONS[0],
    fps: ctx?.fps ?? base?.fps ?? 25,
    html: emitted.html,
    css: emitted.css,
    js: emitted.js,
    fields: parsed?.fields ?? [],
    settings: parsed?.settings ?? { ...DEFAULT_SETTINGS, description: emitted.name },
    assets: [...(base?.assets ?? []), ...(ctx?.images ?? [])].filter(
      (a, i, all) => all.findIndex((b) => b.path === a.path) === i,
    ),
    layers: [],
  };
}

/** One call → template; if validation fails, one repair round with the errors. */
async function generateValidated(
  userContent: ContentBlock[],
  ctx?: GenerateContext,
  base?: SpxTemplate,
): Promise<TemplateChange> {
  const emitted = (await callClaude({
    system: systemPrompt(),
    messages: [{ role: 'user', content: userContent }],
    tool: TEMPLATE_TOOL,
  })) as EmittedTemplate;

  let template = toTemplate(emitted, ctx, base);
  let summary = emitted.summary;

  const validation = validateTemplate(template);
  if (!validation.ok) {
    // One automatic repair round: hand the exact validator errors back with the code.
    const repair = (await callClaude({
      system: systemPrompt(),
      messages: [
        { role: 'user', content: userContent },
        { role: 'assistant', content: `I generated a template but the validator rejected it.` },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Your template failed validation. Fix ALL of these and re-emit the complete template:
${validation.errors.map((e) => `- ${e.rule}: ${e.message}`).join('\n')}

=== index.html ===
${template.html}
=== template.css ===
${template.css}
=== template.js ===
${template.js}`,
            },
          ],
        },
      ],
      tool: TEMPLATE_TOOL,
    })) as EmittedTemplate;
    template = toTemplate(repair, ctx, base);
    summary = repair.summary;
  }

  return { summary, template };
}

// ── Prompt assembly ───────────────────────────────────────────────────────────

function contextText(prompt: string, ctx?: GenerateContext): string {
  const parts = [`Create a broadcast graphics template.\n\nUser brief: ${prompt}`];
  if (ctx) {
    parts.push(`Canvas: ${ctx.resolution.width}×${ctx.resolution.height} @ ${ctx.fps} fps.`);
    if (ctx.palette) {
      parts.push(
        `Brand colors (use EXACTLY these as the :root vars): --accent: ${ctx.palette.accent}; ` +
          `--text-color: ${ctx.palette.text}; --text-dim: ${ctx.palette.textDim}; --panel-bg: ${ctx.palette.panel}.`,
      );
    }
    if (ctx.images.length > 0) {
      parts.push(
        `The user uploaded ${ctx.images.length} image(s), attached above in order. They are available ` +
          `at these relative paths (already bundled — reference them exactly):\n` +
          ctx.images.map((a, i) => `  ${i + 1}. ${a.path}`).join('\n') +
          `\nUse them the way the brief implies (logo → a logo slot with an <img id="fN"> image field; ` +
          `a full-frame still → background or featured media). Match the design's colors and mood to the images.`,
      );
    }
  }
  return parts.join('\n\n');
}

function imageBlocks(ctx?: GenerateContext): ContentBlock[] {
  if (!ctx) return [];
  const blocks: ContentBlock[] = [];
  for (const asset of ctx.images) {
    if (typeof asset.data !== 'string') continue;
    const parsed = parseDataUrl(asset.data);
    if (parsed && parsed.mime.startsWith('image/') && parsed.mime !== 'image/svg+xml') {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: parsed.mime, data: parsed.base64 } });
    }
  }
  return blocks;
}

// ── The provider ──────────────────────────────────────────────────────────────

export const claudeProvider: AIProvider = {
  async generate(prompt, context) {
    return generateValidated(
      [...imageBlocks(context), { type: 'text', text: contextText(prompt, context) }],
      context,
    );
  },

  async modify(prompt, template) {
    return generateValidated(
      [
        {
          type: 'text',
          text: `Modify the template below. Change ONLY what the request needs — keep everything else
(byte-identical where possible), including the user's own edits and comments.

Request: ${prompt}

=== index.html ===
${template.html}
=== template.css ===
${template.css}
=== template.js ===
${template.js}`,
        },
      ],
      undefined,
      template,
    );
  },

  async explain(code) {
    const text = (await callClaude({
      system:
        'You are a patient broadcast-graphics coding teacher inside the SPX HTML GFX Builder. ' +
        'Explain the given template code for a beginner: what it does, section by section, short and concrete. Plain text.',
      messages: [{ role: 'user', content: [{ type: 'text', text: code }] }],
      maxTokens: 1500,
    })) as string;
    return text;
  },

  async fix(template) {
    const validation = validateTemplate(template);
    const problems = validation.ok
      ? 'No validator errors — review the template for runtime bugs (replay-safety, missing ids) and fix what you find.'
      : validation.errors.map((e) => `- ${e.rule}: ${e.message}`).join('\n');
    return this.modify(`Fix these validation problems:\n${problems}`, template);
  },

  async makeSpxReady(template) {
    return this.modify(
      'Make this template fully SPX-ready: a complete SPXGCTemplateDefinition matching the DOM ' +
        '(every fN has exactly one element), global update/play/stop/next functions, relative asset ' +
        'paths only, and the standard external references (css/template.css, js/gsap.min.js, js/template.js).',
      template,
    );
  },
};
