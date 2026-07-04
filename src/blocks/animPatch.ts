// Deterministic patchers for the marked ANIMATION region in generated template JS.
// The Animation panel only ever touches (a) the three knob variables (animSpeed, easeIn,
// easeOut) and (b) the region between the markers when swapping presets. Everything the
// user wrote outside the markers is never modified.

import { ANIMATION_MARK_CLOSE, ANIMATION_MARK_OPEN, ANIM_PRESETS, type AnimPreset, type PresetConfig } from '../templates/lowerThirds/animPresets';
import { CREDITS_PRESETS } from '../templates/endCredits/creditsPresets';
import { TICKER_PRESETS } from '../templates/tickers/tickerPresets';
import { SS_PRESETS } from '../templates/startingSoon/ssPresets';
import { GT_PRESETS } from '../templates/gameTimers/gtPresets';
import { IG_PRESETS } from '../templates/infographics/igPresets';
import { QUIZ_PRESETS } from '../templates/quiz/quizPresets';
import type { AnimPresetId } from '../model/wizard';
import type { SpxTemplate } from '../model/types';

/** The presets that apply to a template, by its category. */
export function presetsForType(type: SpxTemplate['type']): AnimPreset[] {
  if (type === 'end-credits') return CREDITS_PRESETS;
  if (type === 'ticker') return TICKER_PRESETS;
  if (type === 'starting-soon') return SS_PRESETS;
  if (type === 'countdown') return GT_PRESETS;
  if (type === 'infographic') return IG_PRESETS;
  if (type === 'quiz') return QUIZ_PRESETS;
  return ANIM_PRESETS;
}

const ALL_PRESETS = [
  ...ANIM_PRESETS, ...CREDITS_PRESETS, ...TICKER_PRESETS,
  ...SS_PRESETS, ...GT_PRESETS, ...IG_PRESETS, ...QUIZ_PRESETS,
];

function anyPresetById(id: AnimPresetId): AnimPreset {
  const p = ALL_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown animation preset: ${id}`);
  return p;
}

/** Which half of the region an action targets: the entrance, the exit, or both. */
export type AnimPhase = 'in' | 'out' | 'both';

export interface AnimationInfo {
  /** True when the js contains the managed markers (wizard-generated templates). */
  hasRegion: boolean;
  /** The preset both phases share, or null when in/out differ (see the phase ids). */
  presetId: AnimPresetId | null;
  /** The entrance preset ("// In preset:" line, falling back to "// Preset:"). */
  inPresetId: AnimPresetId | null;
  /** The exit preset ("// Out preset:" line, falling back to "// Preset:"). */
  outPresetId: AnimPresetId | null;
  speed: number;
  easeIn: string | null;
  easeOut: string | null;
  steps: boolean;
}

function presetIdByName(name: string | undefined): AnimPresetId | null {
  const preset = ALL_PRESETS.find((p) => p.name === name?.trim());
  return preset?.id ?? null;
}

/** Inspect the template JS for the managed animation region and its current knobs. */
export function readAnimationInfo(js: string): AnimationInfo {
  const hasRegion = js.includes(ANIMATION_MARK_OPEN) && js.includes(ANIMATION_MARK_CLOSE);
  // A phase-mixed region carries "// In preset:" / "// Out preset:" lines; an untouched
  // preset emit carries the single "// Preset:" line, which counts for both phases.
  const both = presetIdByName((js.match(/\/\/ Preset: ([^—\n]+)/) || [])[1]);
  const inPresetId = presetIdByName((js.match(/\/\/ In preset: ([^—\n]+)/) || [])[1]) ?? both;
  const outPresetId = presetIdByName((js.match(/\/\/ Out preset: ([^—\n]+)/) || [])[1]) ?? both;
  return {
    hasRegion,
    presetId: inPresetId === outPresetId ? inPresetId : null,
    inPresetId,
    outPresetId,
    speed: Number((js.match(/var animSpeed = ([\d.]+)/) || [])[1] ?? 1),
    easeIn: (js.match(/var easeIn = '([^']+)'/) || [])[1] ?? null,
    easeOut: (js.match(/var easeOut = '([^']+)'/) || [])[1] ?? null,
    steps: js.includes('function revealNextStep'),
  };
}

/** Patch one knob variable line (animSpeed / easeIn / easeOut) in place. */
export function setAnimKnob(js: string, knob: 'animSpeed' | 'easeIn' | 'easeOut', value: string): string {
  if (knob === 'animSpeed') {
    return js.replace(/var animSpeed = [\d.]+;/, `var animSpeed = ${value};`);
  }
  const re = new RegExp(`var ${knob} = '[^']*';`);
  return js.replace(re, `var ${knob} = '${value}';`);
}

/** Derive the PresetConfig for re-emitting the region from the current template code. */
export function presetConfigFromTemplate(template: SpxTemplate, steps: boolean): PresetConfig {
  const info = readAnimationInfo(template.js);
  // Every category uses the same structure contract with its own class prefix.
  const prefix = (template.html.match(/class="(\w+)-box"/) || [])[1] ?? 'l3';
  // Visible text lines are the id="fN" elements wrapped in the standard line masks.
  const lineCount = Math.max(1, (template.html.match(/id="f\d+"[^>]*class="\w+-/g) || []).length);
  const fallbackId = info.inPresetId ?? info.outPresetId;
  const preset = fallbackId ? anyPresetById(fallbackId) : ANIM_PRESETS[0];
  return {
    prefix,
    lineCount,
    hasAccent: template.html.includes(`${prefix}-accent`),
    steps: steps && lineCount > 1,
    speed: info.speed,
    easeIn: info.easeIn ?? preset.autoEase.easeIn,
    easeOut: info.easeOut ?? preset.autoEase.easeOut,
  };
}

/** Replace the managed region with a freshly emitted block for `presetId`. */
export function swapAnimationPreset(js: string, presetId: AnimPresetId, cfg: PresetConfig): string {
  const start = js.indexOf(ANIMATION_MARK_OPEN);
  const end = js.indexOf(ANIMATION_MARK_CLOSE);
  if (start === -1 || end === -1) return js;
  const preset = anyPresetById(presetId);
  const block = preset.emit(cfg);
  return js.slice(0, start) + block + js.slice(end + ANIMATION_MARK_CLOSE.length);
}

// ── Phase-scoped swaps (In / Out / Both) ─────────────────────────────────────

/** Every preset region defines the exit here — the splice point for phase mixing. */
const OUT_FN = 'function buildOutTimeline';
/** Lower-third presets emit the multi-step block AFTER the exit — it belongs to the IN phase. */
const STEPS_MARK = '// Multi-step:';

interface RegionParts {
  /** Open marker + preset comment + knobs + buildInTimeline. */
  head: string;
  /** buildOutTimeline (up to the steps block / close marker). */
  out: string;
  /** The multi-step reveal block, if any — motion vocabulary of the IN phase. */
  steps: string;
}

/** Split a region into entrance / exit / steps parts (null when it can't be mixed). */
function splitRegion(region: string): RegionParts | null {
  // The exit's descriptive comment ("// buildOutTimeline(): …") belongs to the exit part.
  const fnIdx = region.indexOf(OUT_FN);
  const commentIdx = region.indexOf('// buildOutTimeline');
  const outIdx = commentIdx !== -1 && commentIdx < fnIdx ? commentIdx : fnIdx;
  const closeIdx = region.indexOf(ANIMATION_MARK_CLOSE);
  if (fnIdx === -1 || closeIdx === -1 || outIdx > closeIdx) return null;
  const zone = region.slice(outIdx, closeIdx);
  const stepsIdx = zone.indexOf(STEPS_MARK);
  return {
    head: region.slice(0, outIdx),
    out: stepsIdx === -1 ? zone : zone.slice(0, stepsIdx),
    steps: stepsIdx === -1 ? '' : zone.slice(stepsIdx),
  };
}

/** Rename the head's "// Preset:" line so the phase is explicit ("// In preset: …"). */
function tagInPhase(head: string, name: string): string {
  if (head.includes('// In preset:')) return head.replace(/\/\/ In preset: [^\n]*/, `// In preset: ${name}`);
  return head.replace(/\/\/ Preset: [^\n]*/, `// In preset: ${name}`);
}

/** Make sure the tail names its preset ("// Out preset: …"). */
function tagOutPhase(tail: string, name: string): string {
  if (tail.includes('// Out preset:')) return tail.replace(/\/\/ Out preset: [^\n]*/, `// Out preset: ${name}`);
  return `// Out preset: ${name}\n${tail}`;
}

/**
 * Swap the preset for one phase only (or both). Mixing works by splicing two emitted
 * regions at the buildOutTimeline boundary: the head carries the markers, the knob
 * variables, and the entrance; the tail carries the exit. The knobs are re-stamped from
 * cfg afterwards, so the CALLER decides what the untouched phase's easing stays at
 * (pass the current value in cfg for the phase that isn't being swapped).
 */
export function swapAnimationPhase(js: string, presetId: AnimPresetId, cfg: PresetConfig, phase: AnimPhase): string {
  if (phase === 'both') return swapAnimationPreset(js, presetId, cfg);

  const start = js.indexOf(ANIMATION_MARK_OPEN);
  const end = js.indexOf(ANIMATION_MARK_CLOSE);
  if (start === -1 || end === -1) return js;

  const current = js.slice(start, end + ANIMATION_MARK_CLOSE.length);
  const preset = anyPresetById(presetId);
  const fresh = preset.emit(cfg);

  const cur = splitRegion(current);
  const nue = splitRegion(fresh);
  // A region without a recognizable exit function can't be mixed — swap it whole.
  if (!cur || !nue) return swapAnimationPreset(js, presetId, cfg);

  const info = readAnimationInfo(js);
  const currentInName = info.inPresetId ? anyPresetById(info.inPresetId).name : 'Custom';
  const currentOutName = info.outPresetId ? anyPresetById(info.outPresetId).name : 'Custom';

  let region: string;
  if (phase === 'in') {
    // New entrance + its steps block (steps are IN-phase motion); current exit kept.
    region =
      tagInPhase(nue.head, preset.name) +
      tagOutPhase(cur.out, currentOutName) +
      nue.steps +
      ANIMATION_MARK_CLOSE;
  } else {
    // Current entrance + its steps kept; new exit spliced in.
    region =
      tagInPhase(cur.head, currentInName) +
      tagOutPhase(nue.out, preset.name) +
      cur.steps +
      ANIMATION_MARK_CLOSE;
  }

  let out = js.slice(0, start) + region + js.slice(end + ANIMATION_MARK_CLOSE.length);
  // Re-stamp all three knobs from cfg — the caller preserved the untouched phase's value.
  out = setAnimKnob(out, 'animSpeed', String(cfg.speed));
  out = setAnimKnob(out, 'easeIn', cfg.easeIn);
  out = setAnimKnob(out, 'easeOut', cfg.easeOut);
  return out;
}
