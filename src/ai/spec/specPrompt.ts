// Deterministic prompt assembly for the user-authored GenerationSpec: the structured
// sections the harness appends to the user turn. Everything here is a pure function of the
// spec and the registries — no model calls, no React, no giant inline strings in the
// provider. The sections exist to REMOVE reasoning from the model (category rules, real
// field lists, the serialized state-machine pattern, the chosen motion), which is what
// makes small models reliable on this task.

import { ALL_PRESETS } from '../../blocks/presetRegistry';
import type { GraphicType, TypeBranch, TypeEdge } from '../../templates/types/graphicType';
import {
  aiCategoryById,
  graphicTypeFor,
  recommendedPresetsFor,
  type AiCategory,
} from './categories';
import {
  resolveSpecMotion,
  specIsEmpty,
  type GenerationSpec,
  type SpecFieldDef,
} from '../../model/generationSpec';

// ── The state-machine pattern, serialized ────────────────────────────────────

const edgeLine = (e: TypeEdge): string => {
  const from = typeof e.from === 'string' ? e.from : `waypoint ${e.from.waypoint}`;
  const to = typeof e.to === 'string' ? e.to : e.to.waypoint === -1 ? 'the exit' : `waypoint ${e.to.waypoint}`;
  const how = e.trigger === 'timer' ? `after ${e.after ?? 0}s` : `on operator event "${e.event ?? 'next'}"`;
  return `  - ${from} -> ${to} ${how}`;
};

const branchLines = (b: TypeBranch): string[] => [
  `- State "${b.id}"${b.name ? ` ("${b.name}")` : ''}${b.timeline ? ' with its own entry timeline' : ' (pose only — entering plays nothing)'}:`,
  ...b.edges.map(edgeLine),
];

/**
 * The type's PROVEN state-machine pattern in words — states, events, controls — so the
 * model reuses the architecture instead of inventing one. For a type whose machine is
 * empty, says so honestly: the derived linear machine is the pattern.
 */
export function machinePatternDoc(type: GraphicType): string {
  const lines: string[] = [`## The proven state-machine pattern for a ${type.name}`];
  const m = type.machine;
  const hasMachine = Boolean(m.main?.pathEvents?.length || m.main?.exitOnNext || m.main?.branches?.length || m.parallel?.length);
  if (!hasMachine) {
    lines.push(
      'A linear machine: play() enters, next() steps along the default path, stop() exits from ' +
        'any state. No branches, no parallel groups — the platform derives this automatically ' +
        'from the timeline steps; do not build machinery for it.',
    );
  } else {
    lines.push('The default path is play -> steps -> stop. On top of it:');
    if (m.main?.pathEvents?.length) lines.push(`- Path arrows carry the events: ${m.main.pathEvents.map((e) => `"${e}"`).join(', ')} (missing = "next").`);
    if (m.main?.exitOnNext) lines.push('- The final next() takes the graphic off air (the arrow into the exit is authored).');
    for (const b of m.main?.branches ?? []) lines.push(...branchLines(b));
    for (const g of m.parallel ?? []) {
      lines.push(`- Parallel group "${g.id}" (independent pointer, initial "${g.initial}"):`);
      for (const s of g.states) lines.push(...branchLines(s).map((l) => `  ${l}`));
    }
  }
  if (type.controls.length) {
    lines.push('Operator control buttons (each event becomes a button on the control page):');
    for (const c of type.controls) {
      lines.push(
        `- "${c.label}" fires "${c.event}"${c.section ? ` [section: ${c.section}]` : ''}` +
          `${c.payload?.length ? ` — carries the ${c.payload.join(', ')} value(s) with it` : ''}`,
      );
    }
  }
  lines.push(
    'Data updates NEVER cause state changes — update() writes fields; state changes come only ' +
      'from events and timers. Parameterize with data, not near-identical states.',
  );
  return lines.join('\n');
}

// ── The structured sections ──────────────────────────────────────────────────

const KIND_WORD: Record<SpecFieldDef['kind'], string> = {
  text: 'text',
  lines: 'multiline text (one item per line)',
  number: 'number',
  image: 'image (filelist — visible placeholder when empty)',
  color: 'colour (a constrained design choice)',
  select: 'selection (dropdown — a genuinely constrained choice)',
  toggle: 'yes/no (a constrained design choice)',
};

function fieldLines(fields: SpecFieldDef[]): string[] {
  return fields.map((fd) => {
    const bits = [KIND_WORD[fd.kind]];
    if (fd.example) bits.push(`example: "${fd.example}"`);
    if (fd.description) bits.push(fd.description);
    return `- "${fd.label}" — ${bits.join('; ')}`;
  });
}

function categorySection(cat: AiCategory): string[] {
  const lines = [
    `## The graphic: ${cat.name}`,
    `${cat.blurb}`,
    '',
    '### Broadcast workflow rules for this graphic',
    cat.workflowNotes,
  ];
  const type = graphicTypeFor(cat);
  if (type) lines.push('', machinePatternDoc(type));
  else if (cat.machineHint) lines.push('', '### The state model', cat.machineHint);
  const presets = recommendedPresetsFor(cat);
  if (presets.length) lines.push('', `Motion presets proven for this graphic: ${presets.join(', ')}.`);
  return lines;
}

function animationSection(spec: GenerationSpec): string[] {
  const a = spec.animation;
  if (!a) return [];
  const lines: string[] = [];
  const preset = (id: string | undefined, phase: string): void => {
    if (!id) return;
    // A stale draft may name a preset that no longer exists — describe what we can, never throw.
    const p = ALL_PRESETS.find((x) => x.id === id);
    lines.push(`- ${phase}: the "${p?.name ?? id}" preset${p ? ` — ${p.description}` : ''}. The user picked it explicitly: keep its intent; if the design genuinely needs to deviate, say so in the summary.`);
  };
  preset(a.inPresetId, 'Entrance');
  preset(a.outPresetId, 'Exit');
  if (a.transition) lines.push(`- State changes use the "${a.transition}" transition style.`);
  if (a.intensity) lines.push(`- Motion character: ${a.intensity}.`);
  const motion = resolveSpecMotion(a);
  if (motion.speed) lines.push(`- Speed: ${motion.speed}× (animSpeed).`);
  if (motion.easing && motion.easing !== 'auto') lines.push(`- Easing family: ${motion.easing}.`);
  if (a.steps !== undefined) lines.push(`- Reveal in steps (Continue presses): ${a.steps ? 'yes' : 'no'}.`);
  return lines.length ? ['### Animation (user-chosen)', ...lines] : [];
}

function fontsSection(spec: GenerationSpec): string[] {
  const fonts = spec.fonts;
  if (!fonts) return [];
  const lines: string[] = [];
  const one = (label: string, c: NonNullable<GenerationSpec['fonts']>['primary']): void => {
    if (!c) return;
    const name = c.customFont ? `"${c.customFont.family}" (uploaded — its @font-face and file are embedded in the template)` : c.fontId ? `the bundled font "${c.fontId}"` : null;
    if (!name) return;
    lines.push(`- ${label}: ${name}${c.note ? ` — ${c.note}` : ''}`);
  };
  one('Primary font', fonts.primary);
  one('Secondary font', fonts.secondary);
  one('Numeric font', fonts.numeric);
  if (!lines.length) return [];
  return [
    '### Fonts (user-chosen)',
    ...lines,
    'Actually USE the chosen families in the CSS (font-family stacks with a sensible fallback) — never merely mention them.',
  ];
}

/**
 * The spec's structured sections, appended to the user turn on every path (design stage +
 * coder). Empty spec → empty string; the harness then reads exactly what it always did.
 */
export function specSections(spec: GenerationSpec | null | undefined): string {
  if (!spec || specIsEmpty(spec)) return '';
  const cat = spec.category === 'auto' ? undefined : aiCategoryById(spec.category);
  const parts: string[] = [
    '# Structured setup (authored by the user — these are DECISIONS, not suggestions)',
  ];
  if (cat) parts.push(categorySection(cat).join('\n'));
  if (spec.fields.length) {
    parts.push(
      [
        '### Data fields (the user defined these — create EXACTLY these operator fields, in this order)',
        ...fieldLines(spec.fields),
      ].join('\n'),
    );
  }
  const style: string[] = [];
  if (spec.styleNotes?.trim()) style.push(`- Visual style: ${spec.styleNotes.trim()}`);
  if (spec.mood?.trim()) style.push(`- Mood: ${spec.mood.trim()}`);
  if (spec.avoidNotes?.trim()) style.push(`- Do NOT copy / avoid: ${spec.avoidNotes.trim()}`);
  if (style.length) parts.push(['### Visual direction', ...style].join('\n'));
  const fonts = fontsSection(spec);
  if (fonts.length) parts.push(fonts.join('\n'));
  const anim = animationSection(spec);
  if (anim.length) parts.push(anim.join('\n'));
  parts.push(
    'The setup above constrains WHAT the graphic is; the brief and references still own the ' +
      'creative answer. Within these decisions, design something distinctive.',
  );
  return parts.join('\n\n');
}
