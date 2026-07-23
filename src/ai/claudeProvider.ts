// The Claude-backed AI provider: prompt → complete SPX template, validated before it can
// apply. The system prompt teaches the model this project's contracts (SPX runtime, :root
// style vars, marked ANIMATION region, auto-fit, teachable ES5) and shows a real catalog
// design's generated code as the canonical example — with the ANIMATION region in its
// AUTHORING shape (legacy GSAP builders), which every emit converts deterministically into
// the timeline-editable NOACG_ANIM data block through the same importer the wizard uses
// (convertEmittedRegion). Results run through the injected validation pipeline (static
// validateTemplate + the runtime bench when the caller provides one) with a bounded
// errors-back repair loop, RE-VALIDATED every round; anything still broken is surfaced to
// the user with its findings attached, never auto-applied.

import { callClaude, callClaudeDetailed, type ClaudeTool, type ContentBlock } from './anthropic';
import type { AiPath, AIProvider, AiTemplateChange, GenerateContext, GenerateOptions } from './provider';
import { startAiRun, type AiRunKind, type AiRunRecorder } from './telemetry';
import { parseDefinition } from '../model/spxDefinition';
import { RESOLUTIONS, type SpxTemplate, type TemplateType, DEFAULT_SETTINGS } from '../model/types';
import { parseDataUrl } from '../assets/assetUtils';
import { validateTemplate, type ValidationResult } from '../validation/validateTemplate';
import { lt01 } from '../templates/lowerThirds/lt01';
import { catalogDigest, DESIGN_ALTERNATIVES_TOOL, DESIGN_SPEC_TOOL, specToTemplate, type DesignSpec } from './designSpec';
import { preferenceHint } from './preferences';
import { applyDesignAdjustments } from './designAdjust';
import { applyPolish, POLISH_TOOL, type PolishPatch } from './polish';
import { variantsFor } from '../templates/catalog';
import type { TemplateVariant } from '../model/wizard';
import { detectPrefix } from '../model/structure';
import { parseAnimData } from '../blocks/animData';
import { emitPresetRegion } from '../blocks/presetRegistry';
import { ANIMATION_MARK_OPEN } from '../templates/lowerThirds/animPresets';
import { convertToDataRegion } from '../templates/shared/standard';
import { specSections } from './spec/specPrompt';
import { applySpecLocks, applySpecOutPreset, narrowedSpecTool } from './spec/specDesign';
import { demoteSpecFields, ensureSpecFonts } from './spec/specValidate';

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

// ── The system prompts: contracts + taste-as-reasoning + one real example ────

// Taste is derived from the brief, never from a fixed aesthetic — shared by the design
// stage and the coder so both reason the same way.
const TASTE_REASONING = `## How to judge design (reason from the context, never from a house look)
Taste is not a fixed aesthetic. Derive it from the brief, the programme's genre, the
audience, and any references: clear hierarchy (what is read first, second, last),
intentional contrast, information density suited to the audience and reading distance,
strong typography, balanced spacing, coherent visual logic, motion that supports the
reading order, restraint where the content is serious, distinctiveness without
unnecessary decoration. A news lower third, an esports ranking, an election result, a
financial ticker, an entertainment graphic, and a children's programme each earn
DIFFERENT answers — density, weight, colour energy, motion speed. Never default to one
look; make every choice follow the programme.`;

/**
 * The canonical example with its ANIMATION region shown in the AUTHORING shape: the legacy
 * GSAP builders the category presets emit, not the NOACG_ANIM data block they convert into
 * at create. The coder writes this natural GSAP grammar — what models are actually good at —
 * and the platform converts the emit deterministically (convertEmittedRegion below), exactly
 * how every wizard category is built: the preset authors legacy choreography and
 * convertToDataRegion flips it. Falls back to the converted form when the variant's preset
 * can't emit for it (still a complete teacher, just data-shaped).
 */
function exampleWithAuthoringRegion(variant: TemplateVariant, presetId?: string): SpxTemplate {
  const tpl = variant.create();
  // When the user explicitly picked an entrance preset the variant knows, the worked example
  // shows THAT preset's authored choreography — the model studies the motion it must ship.
  const preset = presetId && variant.animationPresets.includes(presetId as never)
    ? (presetId as TemplateVariant['animationPresets'][number])
    : variant.animationPresets[0];
  const region = emitPresetRegion(tpl, preset);
  if (!region) return tpl;
  return { ...tpl, js: tpl.js.replace(/\/\* == ANIMATION[\s\S]*?== END ANIMATION == \*\//, () => region) };
}

function systemPrompt(exampleVariant: TemplateVariant = lt01, examplePresetId?: string): string {
  // The canonical example is REAL generated code — the same contracts the wizard writes.
  // The caller picks the nearest catalog design so a scoreboard brief studies a real
  // scoreboard's contracts, not always a lower third.
  const example = exampleWithAuthoringRegion(exampleVariant, examplePresetId);
  return `You are the template generator inside NoaCG Studio — a tool that creates
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

## The structure contract (REQUIRED — this is how the app finds your design's parts)
Choose ONE short kebab-case PREFIX naming the design (the example uses "lower-third"; a
motorsport timing tower would use "timing-tower"). Then, exactly like the example:
- The root wrapper is <div class="PREFIX"> — absolutely positioned in a safe-area zone,
  starting at opacity: 0 (play() reveals it).
- Directly inside it, the stage/panel element is <div class="PREFIX-box">. That exact -box
  class, ALONE on the element (never "PREFIX-box something-else"), is what the editor
  searches for: WITHOUT IT the canvas, timeline and Style panel cannot identify a single
  part of the design, however good the rest of the code is.
- Every other class starts with the same prefix: PREFIX-title, PREFIX-row, PREFIX-logo, …
- Each visible text field sits in its OWN mask, and the mask class is exactly PREFIX-mask:
  <div class="PREFIX-mask"><span id="fN" class="PREFIX-name">…</span></div>, the mask
  overflow: hidden — that is what lets a line slide in from behind its own edge.
- A one-off accent flourish, when the design has one, is <div class="PREFIX-accent">.
Copy this skeleton from the example; only the prefix and what lives inside the box change.

## The house style contracts (keep AI output editable by the app's panels)
- ALL colors flow through :root vars: --accent, --text-color, --text-dim, --panel-bg,
  --font-heading, --scale, --type-scale. Zero hardcoded colors anywhere else in the CSS.
- ALL pixel sizes via calc(N * var(--scale)); font sizes additionally multiply by the
  text-only knob: font-size: calc(N * var(--scale) * var(--type-scale)).
- Text boxes hug their content (width: fit-content) with a max-width cap so long text wraps
  instead of overflowing.
- ALL animation lives between the EXACT markers (copy them character for character)
  ${ANIMATION_MARK_OPEN}
  and /* == END ANIMATION == */, in the AUTHORING shape the example shows: the three knob
  vars (var animSpeed / easeIn / easeOut) followed by buildInTimeline() and
  buildOutTimeline(), each building and returning one gsap.timeline(). After generation the
  platform CONVERTS this region into its timeline-editable keyframe-data form — the same
  converter every built-in design goes through — so stay inside the emitted grammar:
  - Only tl.set / tl.to / tl.fromTo with literal number/string values. Durations, staggers,
    and absolute positions are written as N / animSpeed; overlaps as '-=N'. The ease comes
    from the knob vars (the timeline defaults) or ONE quoted GSAP ease per tween.
  - NO DOM-measured values (scrollWidth, getBoundingClientRect), no nested gsap.timeline()
    inside a tween, no conditionals or helper functions inside the region. A region the
    converter cannot read still plays and exports, but its motion shows read-only on the
    visual timeline — keep it convertible.
  - buildInTimeline starts by revealing the CSS-hidden root (tl.set root { opacity: 1 });
    buildOutTimeline ends by hiding it again — exactly like the example. Entrances are
    fromTo tweens so replay is safe: play() after stop() must render correctly.
  When the template you are MODIFYING already carries the converted form (var NOACG_ANIM +
  its interpreter), keep that form: edit the keyframe DATA and leave the interpreter
  functions verbatim.
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
- Write the SIMPLEST clear code that is correct. Prefer direct HTML, CSS, and JavaScript: a few
  obvious lines over a clever abstraction. A beginner should be able to find the piece that draws
  a thing and understand it without tracing through layers.
- Descriptive names (name the thing it is), simple top-to-bottom control flow, minimal
  indirection. Do NOT add helper functions, wrappers, config objects, generic patterns, or
  clever one-liners unless they clearly make the code simpler to read — usually they do not here.
- Teachable ES5 in template.js (var, function declarations), short useful comments that explain
  WHY (not that something changed). Rich but commented CSS. No frameworks, no build steps.

${TASTE_REASONING}

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

/** The design-stage prompt: decide the route and every design parameter — no code. */
function specSystemPrompt(): string {
  return `You are the design director inside NoaCG Studio — a tool that creates broadcast
graphics templates. You do NOT write code here. You read the brief (and any attached
reference images) and return ONE design decision via the emit_design_spec tool.

${TASTE_REASONING}

## Routing (fit)
Choose "catalog" when a design family below carries the brief's STRUCTURE — the platform
then assembles a guaranteed-correct template from your parameters, and styling differences
(colour, typography, density, spacing, shape, motion character) are expressed through the
parameters and the flourish, never by rejecting the chassis. Choose "custom" when the brief
genuinely calls for a structure or composition no family expresses — a novel layout, an
unlisted graphic kind, a composition that would be forced into the wrong shape. Custom is a
real creative route; never cram a brief into an ill-fitting chassis, and never route to
custom just for a styling difference.

## Variety (a hard requirement)
Different briefs must produce visibly different designs. Choose the chassis, zone, motion,
typography, density, and palette from THIS brief's world — not the same safe family every
time. Fill lines[] with realistic samples from the brief's world, never lorem ipsum.

## References
When images are attached: a logo means brand colours and useLogoSlot where the design has a
slot; screenshots or style frames mean you read the SYSTEM behind them — grid, hierarchy,
spacing rhythm, proportions, shape language, colour balance, density, motion cues — into
referenceSystem, and let it drive your parameters. References outweigh every generic rule
above.

## What the platform can assemble
${catalogDigest()}
${(() => {
    const hint = preferenceHint();
    return hint ? `\n## Aggregated user preferences\n${hint}\n` : '';
  })()}
Return the design ONLY via the requested tool.`;
}

// The default one-shot generation (harness OFF): the model's own take, told only the SPX
// format basics so the result runs in playout — no taste teaching, no worked example, no
// repair loop. The benchmark's raw arm showed these look strong; keeping this path pure is
// what makes the harness's value measurable (and its checkbox honest).
const RAW_SYSTEM = `You make broadcast graphics as SPX / CasparCG HTML templates. Return the complete
template as three files via the emit_template tool.

Format basics (so it runs in playout):
- index.html defines window.SPXGCTemplateDefinition with DataFields named f0, f1, …; each field
  maps to one element with the same id. Field types: textfield, textarea, number, filelist (for
  images).
- template.js (loaded in <head>) defines global update(data /* a JSON string */), play(), stop(),
  next().
- External references are relative: css/template.css, js/template.js, js/gsap.min.js. GSAP is
  available as the global "gsap" (the only library). No CDN or absolute paths.
- Each tool field is the PURE contents of that one file: "html" is the full document
  (doctype…</html>, and the SPXGCTemplateDefinition <script> lives here); "css" is CSS only;
  "js" is JavaScript only — no <script> tags, no HTML.

Return ONLY via the emit_template tool.`;

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

/** How many errors-back repair rounds the free-form path gets (video-harness parity). */
const MAX_REPAIR_ROUNDS = 2;

/** The runtime bench's house-editability rule (src/validation/runtimeBench.ts). */
const EDITABILITY_RULE = 'bench-editability';

/**
 * Deterministic grounding of a free-form emit: the coder authors the ANIMATION region as
 * legacy GSAP builders (the shape the system prompt teaches — natural GSAP the model is
 * good at), and this converts a parseable region into the NOACG_ANIM data block through
 * the SAME importer every wizard category uses at create. An emit that already carries a
 * readable data block passes through untouched; a region the importer cannot read keeps
 * the model's own code — honest hand-crafted output the timeline renders read-only.
 * Exported for verification scripts (like plainGenerate below).
 */
export function convertEmittedRegion(template: SpxTemplate): SpxTemplate {
  if (parseAnimData(template.js)) return template;
  const originalJs = template.js;
  // The converter's writer splices on the exact house marker; a drifted parenthetical in
  // the model's open marker would silently block the swap, so canonicalize it first.
  template.js = template.js.replace(/\/\* == ANIMATION[^\n]*?== \*\//, () => ANIMATION_MARK_OPEN);
  convertToDataRegion(template);
  // Nothing gained (unparseable region): keep the model's code byte-identical.
  if (!parseAnimData(template.js)) template.js = originalJs;
  return template;
}

/**
 * Demote residual editability findings to warnings. After the deterministic conversion has
 * had its chance, an unconvertible region is honest hand-crafted code — the template still
 * plays and exports, the timeline just shows its motion read-only — so a working
 * off-catalog design must not be surfaced as a FAILURE over panel editability.
 */
function demoteEditability(v: ValidationResult): ValidationResult {
  const demoted = v.errors.filter((e) => e.rule === EDITABILITY_RULE);
  if (demoted.length === 0) return v;
  const errors = v.errors.filter((e) => e.rule !== EDITABILITY_RULE);
  return { ok: errors.length === 0, errors, warnings: [...v.warnings, ...demoted] };
}

/** Run the injected validation pipeline (static + runtime bench) or plain static validation. */
async function validateWith(
  template: SpxTemplate,
  options?: GenerateOptions,
  run?: AiRunRecorder,
): Promise<ValidationResult> {
  const t0 = Date.now();
  const result = options?.validate ? await options.validate(template) : validateTemplate(template);
  run?.stage('validate', t0);
  return result;
}

/**
 * Emit → validate → bounded errors-back repair. Every round is RE-VALIDATED (a repair that
 * comes back broken never masquerades as fixed); a result that still fails after the budget
 * is returned with its validation attached — surfaced to the user, never auto-applied.
 */
async function generateValidated(
  userContent: ContentBlock[],
  ctx?: GenerateContext,
  base?: SpxTemplate,
  options?: GenerateOptions,
  run?: AiRunRecorder,
  exampleVariant?: TemplateVariant,
): Promise<AiTemplateChange> {
  const system = systemPrompt(exampleVariant, ctx?.spec?.animation?.inPresetId);
  options?.onProgress?.('Writing the code…');
  let t0 = Date.now();
  // The system prompt is byte-identical across the emit and its repair rounds — one
  // prompt-cache breakpoint absorbs most of the loop's input cost.
  const first = await callClaudeDetailed({
    system,
    messages: [{ role: 'user', content: userContent }],
    tool: TEMPLATE_TOOL,
    cacheSystem: true,
  });
  run?.stage('coder', t0, first.model, first.usage);

  // Ground every emit the same way: region conversion, then the spec's deterministic
  // passes — uploaded fonts land as assets + @font-face whether or not the model wrote
  // them, and an explicit exit preset applies as a real keyframe swap where possible.
  const ground = (e: EmittedTemplate): SpxTemplate =>
    applySpecOutPreset(ensureSpecFonts(convertEmittedRegion(toTemplate(e, ctx, base)), ctx?.spec), ctx?.spec);

  let emitted = first.output as EmittedTemplate;
  let template = ground(emitted);
  let summary = emitted.summary;
  options?.onProgress?.('Testing it…');
  let validation = await validateWith(template, options, run);

  // Editability stays a hard error only when the template being MODIFIED already carried a
  // readable data block — silently losing it would be a real regression the repair loop
  // must fight. Everywhere else (fresh custom builds, foreign imports, hand-written code)
  // a region the converter above couldn't read demotes to a warning at the end instead of
  // burning repair rounds on the one finding the model reliably fails; the findings still
  // ride along in a round a FUNCTIONAL error triggers.
  const editabilityBlocks = !!base && !!parseAnimData(base.js);
  const blocking = (v: ValidationResult) =>
    editabilityBlocks ? v.errors : v.errors.filter((e) => e.rule !== EDITABILITY_RULE);

  for (let round = 1; round <= MAX_REPAIR_ROUNDS && blocking(validation).length > 0; round++) {
    // Errors-back repair: the exact findings (validator rules + bench measurements) with
    // the full current code, forced back through the same tool.
    options?.onProgress?.(`Repairing (round ${round})…`);
    run?.repair();
    t0 = Date.now();
    const repair = await callClaudeDetailed({
      system,
      messages: [
        { role: 'user', content: userContent },
        { role: 'assistant', content: `I generated a template but it failed the platform's checks.` },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Your template failed these checks. Fix ALL of them and re-emit the complete template:
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
      cacheSystem: true,
    });
    run?.stage(`repair-${round}`, t0, repair.model, repair.usage);
    emitted = repair.output as EmittedTemplate;
    template = ground(emitted);
    summary = emitted.summary;
    options?.onProgress?.('Testing it…');
    validation = await validateWith(template, options, run);
  }

  if (!editabilityBlocks) validation = demoteEditability(validation);

  return { summary, template, path: 'custom', validation };
}

/** Telemetry wrapper: record the run whether it returns or throws. */
async function recorded(kind: AiRunKind, work: (run: AiRunRecorder) => Promise<AiTemplateChange>): Promise<AiTemplateChange> {
  const run = startAiRun(kind);
  try {
    const result = await work(run);
    if (result.path) run.route(result.path);
    run.finish(result.validation?.ok ?? true, result.validation?.errors.map((e) => e.rule));
    return result;
  } catch (e) {
    run.finish(false, ['exception']);
    throw e;
  }
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
        `The user uploaded ${ctx.images.length} image(s) to APPEAR IN the graphic, attached above ` +
          `first (in order). They are available at these relative paths (already bundled — reference ` +
          `them exactly):\n` +
          ctx.images.map((a, i) => `  ${i + 1}. ${a.path}`).join('\n') +
          `\nUse them the way the brief implies (logo → a logo slot with an <img id="fN"> image field; ` +
          `a full-frame still → background or featured media). Match the design's colors and mood to the images.`,
      );
    }
    if (ctx.references?.length) {
      parts.push(
        `The user also attached ${ctx.references.length} STYLE REFERENCE image(s) (the last ` +
          `${ctx.references.length} attachment(s)). They are design guidance ONLY: read the SYSTEM ` +
          `behind them — grid, hierarchy, spacing rhythm, proportions, shape language, colour balance, ` +
          `density, motion cues — and let it drive your decisions. Never place them in the graphic, ` +
          `never reproduce their layout or artwork literally.`,
      );
    }
    const sections = specSections(ctx.spec);
    if (sections) parts.push(sections);
  }
  return parts.join('\n\n');
}

function imageBlocks(ctx?: GenerateContext): ContentBlock[] {
  if (!ctx) return [];
  const blocks: ContentBlock[] = [];
  // Assets first, references after — contextText numbers them in exactly this order.
  for (const asset of [...ctx.images, ...(ctx.references ?? [])]) {
    if (typeof asset.data !== 'string') continue;
    const parsed = parseDataUrl(asset.data);
    if (parsed && parsed.mime.startsWith('image/') && parsed.mime !== 'image/svg+xml') {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: parsed.mime, data: parsed.base64 } });
    }
  }
  return blocks;
}

// ── The provider ──────────────────────────────────────────────────────────────

/** The code-level modify content (shared by modifyAs and the spec-refine fallback). */
function modifyContent(prompt: string, template: SpxTemplate): ContentBlock[] {
  return [
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
  ];
}

/** The modify flow shared by modify/fix/makeSpxReady/convertImport (each records its own kind). */
function modifyAs(
  kind: AiRunKind,
  prompt: string,
  template: SpxTemplate,
  options?: GenerateOptions,
): Promise<AiTemplateChange> {
  return recorded(kind, (run) =>
    generateValidated(modifyContent(prompt, template), undefined, template, options, run),
  );
}

/**
 * Spec-level refinement: when the template being modified came from a grounded spec (the
 * caller passed it back) and is still house-shaped, the refinement re-emits the SPEC and
 * re-assembles deterministically — "warmer colours, calmer entrance" never round-trips
 * code. Falls back to the code-level modify when the design stage fails or routes custom.
 */
async function specRefine(
  prompt: string,
  template: SpxTemplate,
  priorSpec: DesignSpec,
  options: GenerateOptions | undefined,
  run: AiRunRecorder,
): Promise<AiTemplateChange> {
  options?.onProgress?.('Designing…');
  try {
    const t0 = Date.now();
    const result = await callClaudeDetailed({
      system: specSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `The user is refining an existing design. Its current design spec:
${JSON.stringify(priorSpec, null, 2)}

Refinement request: ${prompt}

Return the FULL updated spec — carry forward everything the request does not change
(including the flourish). Route to custom ONLY if the request now needs a structure the
catalog cannot express.`,
            },
          ],
        },
      ],
      tool: DESIGN_SPEC_TOOL,
      maxTokens: 4000,
    });
    run.stage('design-spec', t0, result.model, result.usage);
    const spec = result.output as DesignSpec;
    if (!Array.isArray(spec.lines)) spec.lines = [];
    if (spec.fit === 'catalog') {
      return groundedResult(spec, contextFrom(template), options, run);
    }
  } catch {
    // The design stage failed — the code-level modify below still serves the request.
  }
  return generateValidated(modifyContent(prompt, template), undefined, template, options, run);
}

// ── The grounded pipeline: assemble → adjust → optional polish (revert on any failure) ──

/** Try the bounded polish pass; null = reverted (the caller keeps the assembled template). */
async function polishStage(
  template: SpxTemplate,
  spec: DesignSpec,
  options: GenerateOptions | undefined,
  run: AiRunRecorder,
): Promise<{ template: SpxTemplate; validation: ValidationResult } | null> {
  options?.onProgress?.('Polishing…');
  try {
    const t0 = Date.now();
    const result = await callClaudeDetailed({
      system:
        `You add ONE bounded visual flourish to an assembled broadcast graphics template in NoaCG Studio.\n\n` +
        `Hard rules: every colour flows through the :root vars (--accent, --text-color, --text-dim, ` +
        `--panel-bg); every size via calc(N * var(--scale)); never redeclare :root or @font-face; ` +
        `never touch JavaScript or the animation; keep the auto-fit behaviour (width: fit-content + ` +
        `max-width caps) intact; keep every field id exactly once and the mask structure when you ` +
        `return html. Touch ONLY what the flourish needs — the design is already sound.\n\n` +
        `Return the patch ONLY via the emit_polish tool.`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Add this flourish to the template below.

Flourish: ${spec.flourish}
${spec.referenceSystem ? `Reference system (from the user's uploads): ${spec.referenceSystem}` : ''}

=== index.html ===
${template.html}
=== template.css ===
${template.css}`,
            },
          ],
        },
      ],
      tool: POLISH_TOOL,
      maxTokens: 8000,
    });
    run.stage('polish', t0, result.model, result.usage);
    const polished = applyPolish(template, result.output as PolishPatch);
    if (!polished) return null;
    options?.onProgress?.('Testing it…');
    const validation = await validateWith(polished, options, run);
    return validation.ok ? { template: polished, validation } : null;
  } catch {
    return null; // a polish failure never costs the user the assembled result
  }
}

/** Spec → assembled, adjusted, validated (and polished when the spec asks) result. */
async function groundedResult(
  spec: DesignSpec,
  ctx: GenerateContext | undefined,
  options: GenerateOptions | undefined,
  run: AiRunRecorder,
): Promise<AiTemplateChange> {
  options?.onProgress?.('Assembling…');
  const t0 = Date.now();
  const assembled = specToTemplate(spec, ctx);
  // The spec's compositional parameters (typography scale, density, shape, panel) apply
  // as deterministic overrides — the brief shapes the composition, not just the colours.
  // Then the user's own decisions: secondary/numeric uploaded fonts ground as embedded
  // assets, and an explicit exit preset swaps in as real keyframes (blocks/presetApply).
  let template = applySpecOutPreset(ensureSpecFonts(applyDesignAdjustments(assembled.template, spec), ctx?.spec), ctx?.spec);
  run.stage('assemble', t0);
  run.diversity(assembled.diversity);
  options?.onProgress?.('Testing it…');
  // No repair loop here: a grounded assembly failing its own bench is a platform bug
  // worth surfacing, not something a model round-trip should paper over. A user field a
  // FIXED-CONTRACT category cannot carry demotes to an honest warning (no loop to fight it).
  let validation = demoteSpecFields(await validateWith(template, options, run));
  let path: AiPath = 'grounded';
  if (spec.flourish && validation.ok) {
    const polished = await polishStage(template, spec, options, run);
    if (polished) {
      template = polished.template;
      validation = polished.validation;
      path = 'grounded+polish';
    }
  }
  return {
    summary: spec.summary || 'Built from the catalog design system.',
    template,
    path,
    validation,
    spec,
  };
}

/** Rebuild a GenerateContext from a template being refined (its images ride its assets). */
function contextFrom(template: SpxTemplate): GenerateContext {
  return {
    images: template.assets.filter((a) => a.path.startsWith('images/')),
    palette: null,
    resolution: template.resolution,
    fps: template.fps,
  };
}

/** The design stage's decisions, carried into the free-form coder as plain direction. */
function designNotes(spec: DesignSpec): string {
  return [
    'Design direction (decided in the design stage — follow it):',
    `- ${spec.reason}`,
    spec.motionCharacter ? `- Motion: ${spec.motionCharacter}` : null,
    spec.referenceSystem ? `- Reference system (read from the uploads): ${spec.referenceSystem}` : null,
    spec.flourish ? `- Signature: ${spec.flourish}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export const claudeProvider: AIProvider = {
  async generate(prompt, context, options) {
    return recorded('generate', async (run) => {
      const userContent: ContentBlock[] = [
        ...imageBlocks(context),
        { type: 'text', text: contextText(prompt, context) },
      ];

      // Stage 1 — the design spec (also the router). A stage failure must never kill the
      // generation: fall through to the free-form path with no spec.
      options?.onProgress?.('Designing…');
      let spec: DesignSpec | null = null;
      try {
        const t0 = Date.now();
        const result = await callClaudeDetailed({
          system: specSystemPrompt(),
          messages: [{ role: 'user', content: userContent }],
          // A pinned user category narrows the tool schema itself — the model can only
          // route within the decision.
          tool: narrowedSpecTool(DESIGN_SPEC_TOOL, context?.spec),
          maxTokens: 4000,
        });
        run.stage('design-spec', t0, result.model, result.usage);
        spec = result.output as DesignSpec;
        if (!Array.isArray(spec.lines)) spec.lines = [];
        // The user's structured decisions overwrite the model's — deterministically.
        spec = applySpecLocks(spec, context?.spec);
      } catch {
        // No spec — the free-form path below still serves the brief.
      }

      if (spec && spec.fit === 'catalog') {
        // Stage 2 — deterministic assembly through the real catalog assemblers: correct
        // by construction, panel- and timeline-editable like any wizard output.
        return groundedResult(spec, context, options, run);
      }

      // Custom route — the free-form coder, studying the NEAREST catalog design as its
      // canonical example and carrying the design stage's direction.
      const exampleVariant = spec ? variantsFor(spec.category)[0] : undefined;
      const content: ContentBlock[] = spec
        ? [...userContent, { type: 'text', text: designNotes(spec) }]
        : userContent;
      return generateValidated(content, context, undefined, options, run, exampleVariant);
    });
  },

  async generateRaw(prompt, context, options) {
    return recorded('generate', async (run) => {
      options?.onProgress?.('Generating…');
      const t0 = Date.now();
      const result = await callClaudeDetailed({
        system: RAW_SYSTEM,
        messages: [
          { role: 'user', content: [...imageBlocks(context), { type: 'text', text: contextText(prompt, context) }] },
        ],
        tool: TEMPLATE_TOOL,
      });
      run.stage('raw', t0, result.model, result.usage);
      const emitted = result.output as EmittedTemplate;
      const template = toTemplate(emitted, context);
      // Static validation only, for honest display — no bench, no repair: this path IS the
      // baseline the harness gets measured against.
      return { summary: emitted.summary, template, path: 'raw', validation: validateTemplate(template) };
    });
  },

  async generateAlternatives(prompt, context, options) {
    const run = startAiRun('generate');
    try {
      const userContent: ContentBlock[] = [
        ...imageBlocks(context),
        { type: 'text', text: contextText(prompt, context) },
      ];

      // ONE design-stage call returns three distinct directions; each assembles like a
      // single harness generation (grounded deterministically, or the validated custom path).
      options?.onProgress?.('Designing three directions…');
      let specs: DesignSpec[] = [];
      try {
        const t0 = Date.now();
        const result = await callClaudeDetailed({
          system: specSystemPrompt(),
          messages: [{ role: 'user', content: userContent }],
          tool: narrowedSpecTool(DESIGN_ALTERNATIVES_TOOL, context?.spec),
          maxTokens: 8000,
        });
        run.stage('design-alternatives', t0, result.model, result.usage);
        const output = result.output as { alternatives?: DesignSpec[] };
        specs = (Array.isArray(output.alternatives) ? output.alternatives : []).slice(0, 3);
        // Each direction stays free where the user left freedom; each is pinned where not.
        specs = specs.map((s) => applySpecLocks({ ...s, lines: Array.isArray(s.lines) ? s.lines : [] }, context?.spec));
      } catch {
        specs = [];
      }

      const results: AiTemplateChange[] = [];
      for (const [i, spec] of specs.entries()) {
        options?.onProgress?.(`Building option ${i + 1} of ${specs.length}…`);
        if (spec.fit === 'catalog') {
          results.push(await groundedResult(spec, context, options, run));
        } else {
          const change = await generateValidated(
            [...userContent, { type: 'text', text: designNotes(spec) }],
            context,
            undefined,
            options,
            run,
            variantsFor(spec.category)[0],
          );
          results.push({ ...change, spec });
        }
      }
      // The design stage failing (or returning nothing) must not kill the generation:
      // fall back to one full harness run so the user still gets a result.
      if (!results.length) results.push(await this.generate(prompt, context, options));

      run.finish(
        results.every((r) => r.validation?.ok ?? true),
        results.flatMap((r) => r.validation?.errors.map((e) => e.rule) ?? []),
      );
      return results;
    } catch (e) {
      run.finish(false, ['exception']);
      throw e;
    }
  },

  async modify(prompt, template, options) {
    // A grounded result refines at SPEC level while it is still house-shaped; anything
    // else (foreign imports, hand-edited code, custom builds) refines at code level.
    if (options?.spec && detectPrefix(template.html) && parseAnimData(template.js)) {
      const spec = options.spec;
      return recorded('modify', (run) => specRefine(prompt, template, spec, options, run));
    }
    return modifyAs('modify', prompt, template, options);
  },

  async explain(code) {
    const text = (await callClaude({
      system:
        'You are a patient broadcast-graphics coding teacher inside NoaCG Studio. ' +
        'Explain the given template code for a beginner: what it does, section by section, short and concrete. Plain text.',
      messages: [{ role: 'user', content: [{ type: 'text', text: code }] }],
      maxTokens: 1500,
    })) as string;
    return text;
  },

  async fix(template, options) {
    const validation = validateTemplate(template);
    const problems = validation.ok
      ? 'No validator errors — review the template for runtime bugs (replay-safety, missing ids) and fix what you find.'
      : validation.errors.map((e) => `- ${e.rule}: ${e.message}`).join('\n');
    return modifyAs('fix', `Fix these validation problems:\n${problems}`, template, options);
  },

  async makeSpxReady(template, options) {
    return modifyAs(
      'make-ready',
      'Make this template fully SPX-ready: a complete SPXGCTemplateDefinition matching the DOM ' +
        '(every fN has exactly one element), global update/play/stop/next functions, relative asset ' +
        'paths only, and the standard external references (css/template.css, js/gsap.min.js, js/template.js).',
      template,
      options,
    );
  },

  async convertImport(prompt, imported, _context, options) {
    const request = prompt.trim() || 'Bring it fully up to the house standards.';
    return modifyAs(
      'convert',
      `This template was IMPORTED from the user's existing file — keep what it gets right ` +
        `(its content, its design intent, its working markup), and convert the rest to this ` +
        `tool's contracts: SPXGCTemplateDefinition + fN field mapping, the :root style vars, ` +
        `the marked ANIMATION region as the NOACG_ANIM data block with the standard ` +
        `interpreter, and relative asset paths only.\n\nRequest: ${request}`,
      imported,
      options,
    );
  },
};

/**
 * The PRE-HARNESS generation path, exported for scripts/ai-compare.mjs only: the house
 * system prompt + the lt01 example + the validated repair loop, with NO design-spec stage.
 * The app never calls this — it is the benchmark's stage-ablation arm, kept so the
 * harness's added value stays measurable against the previous product.
 */
export async function plainGenerate(
  prompt: string,
  context?: GenerateContext,
  options?: GenerateOptions,
): Promise<AiTemplateChange> {
  return recorded('generate', (run) =>
    generateValidated(
      [...imageBlocks(context), { type: 'text', text: contextText(prompt, context) }],
      context,
      undefined,
      options,
      run,
    ),
  );
}
