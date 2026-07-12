// Deterministic patchers for the marked ANIMATION region in generated template JS.
// The Animation panel only ever touches (a) the three knob variables (animSpeed, easeIn,
// easeOut) and (b) the region between the markers when swapping presets. Everything the
// user wrote outside the markers is never modified.

import { ANIMATION_MARK_CLOSE, ANIMATION_MARK_OPEN, ANIM_PRESETS, type AnimPreset, type PresetConfig, type StepChain } from '../templates/lowerThirds/animPresets';
import { parseTimeline } from './timelineModel';
import { CREDITS_PRESETS } from '../templates/endCredits/creditsPresets';
import { TICKER_PRESETS } from '../templates/tickers/tickerPresets';
import { SS_PRESETS } from '../templates/startingSoon/ssPresets';
import { GT_PRESETS } from '../templates/gameTimers/gtPresets';
import { IG_PRESETS } from '../templates/infographics/igPresets';
import { QUIZ_PRESETS } from '../templates/quiz/quizPresets';
import type { AnimPresetId } from '../model/wizard';
import type { SpxTemplate } from '../model/types';
import { replaceDefinitionInHtml } from '../model/spxDefinition';
import { countLines, detectPrefix, getTemplateParts } from '../model/structure';

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

/** Look up a preset across every category's library. */
export function anyPresetById(id: AnimPresetId): AnimPreset {
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

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The parts a » press may reveal (with their channels): lines, image slots, the accent,
 *  and building-block elements. The root and panel stay out — they are load-bearing
 *  containers. Blocks live OUTSIDE the root's opacity gate; the emitted outside gate
 *  (stepsBlock + patchOutsideExit) gives them the same hidden-at-rest lifecycle. */
function assignableParts(template: SpxTemplate): Map<string, 'mask' | 'rise'> {
  return new Map(
    getTemplateParts(template.html, template.fields)
      .filter((p) => p.kind === 'line' || p.kind === 'image' || p.kind === 'accent' || p.kind === 'block')
      .map((p) => [p.selector, p.channel]),
  );
}

/** Chain selectors whose element lives OUTSIDE the root — they miss its opacity gate.
 *  Decided by real DOM containment, not part kind: where the element actually sits is
 *  the truth (an id-carrying element pasted INSIDE the root needs no gate). */
function outsideChainParts(html: string, prefix: string, chain: StepChain): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.querySelector(`.${prefix}`);
  return chain.groups.flat().filter((sel) => {
    const el = doc.querySelector(sel);
    return !!el && (!root || !root.contains(el));
  });
}

/**
 * Read the template's existing Continue chain as re-emittable RAW literals, filtered to the
 * parts that still exist (channels come from the registry — self-healing if the HTML moved
 * under the chain). Null when there is no (groupable) chain — the emitter then writes its
 * defaults. This is what keeps a preset swap from resetting the user's regrouping.
 */
export function currentStepChain(template: SpxTemplate): StepChain | null {
  const model = parseTimeline(template.js);
  if (!model || model.steps.length === 0 || !model.steps.every((s) => s.groupable)) return null;
  const valid = assignableParts(template);
  const chain: StepChain = { groups: [], durations: [], eases: [], reveals: {} };
  for (const step of model.steps) {
    const targets = step.targets.filter((t) => valid.has(t));
    if (targets.length === 0) continue; // its parts are gone — the press goes with them
    chain.groups.push(targets);
    // The model's values are post-division seconds; write back the pre-division literals.
    chain.durations.push(String(round2(step.duration * model.animSpeed)));
    chain.eases.push(step.ease === null ? 'easeIn' : `'${step.ease}'`);
    for (const t of targets) chain.reveals[t] = valid.get(t)!;
  }
  return chain.groups.length > 0 ? chain : null;
}

/** Derive the PresetConfig for re-emitting the region from the current template code.
 *  `chainOverride`: undefined = carry the template's existing chain; a StepChain = use it
 *  (the assign/unassign paths); null = force the defaults. */
export function presetConfigFromTemplate(
  template: SpxTemplate,
  steps: boolean,
  chainOverride?: StepChain | null,
): PresetConfig {
  const info = readAnimationInfo(template.js);
  // Every category uses the same structure contract with its own class prefix.
  const prefix = detectPrefix(template.html) ?? 'lower-third';
  // Visible text lines are the id="fN" elements wrapped in the standard line masks.
  const lineCount = Math.max(1, countLines(template.html));
  const fallbackId = info.inPresetId ?? info.outPresetId;
  const preset = fallbackId ? anyPresetById(fallbackId) : ANIM_PRESETS[0];
  const chain = !steps ? null : chainOverride !== undefined ? chainOverride : currentStepChain(template);
  // A part assigned to a press must not ALSO play in the entrance choreography: the accent
  // is the one structural part presets animate, so its intro/exit tweens drop while it is
  // assigned (it still leaves with the whole graphic — the exit hides the root).
  const assigned = new Set(chain ? chain.groups.flat() : []);
  return {
    prefix,
    lineCount,
    hasAccent: template.html.includes(`${prefix}-accent`) && !assigned.has(`.${prefix}-accent`),
    steps: steps && (lineCount > 1 || !!chain),
    stepChain: chain ?? undefined,
    stepOutsideParts: chain ? outsideChainParts(template.html, prefix, chain) : [],
    speed: info.speed,
    easeIn: info.easeIn ?? preset.autoEase.easeIn,
    easeOut: info.easeOut ?? preset.autoEase.easeOut,
  };
}

/**
 * Turn multi-step reveal on/off — the ONE steps switch (the Motion panel's checkbox and the
 * timeline strip's »+ button both call this). Steps ride with the entrance, so the IN phase
 * is re-emitted with/without the steps block, and the SPX `steps` setting follows so the
 * operator gets the Continue button. Returns the patched template parts.
 */
export function setStepsMode(
  template: SpxTemplate,
  on: boolean,
): Pick<SpxTemplate, 'js' | 'html' | 'settings'> {
  const info = readAnimationInfo(template.js);
  const cfg = presetConfigFromTemplate(template, on);
  const presetId = info.inPresetId ?? 'slide-fade';
  const js = swapAnimationPhase(template.js, presetId, cfg, 'in');
  // SPX steps counts STATES: the entrance plus one per Continue press (reveal group).
  const groupCount = cfg.steps ? (cfg.stepChain?.groups.length ?? cfg.lineCount - 1) : 0;
  const settings = { ...template.settings, steps: String(groupCount + 1) };
  const html = replaceDefinitionInHtml(template.html, settings, template.fields);
  return { js, html, settings };
}

/**
 * Re-emit the IN phase with a MODIFIED Continue chain — the assign/unassign paths (a part
 * entering or leaving the steps world changes the entrance choreography, so an array patch
 * is not enough; moving parts BETWEEN existing presses stays patchStepRegroup's job).
 * A null/empty chain degrades to turning steps off entirely.
 */
export function applyStepChain(
  template: SpxTemplate,
  chain: StepChain | null,
): Pick<SpxTemplate, 'js' | 'html' | 'settings'> {
  if (!chain || chain.groups.length === 0) return setStepsMode(template, false);
  const info = readAnimationInfo(template.js);
  const cfg = presetConfigFromTemplate(template, true, chain);
  const presetId = info.inPresetId ?? 'slide-fade';
  const js = swapAnimationPhase(template.js, presetId, cfg, 'in');
  const settings = { ...template.settings, steps: String(chain.groups.length + 1) };
  const html = replaceDefinitionInHtml(template.html, settings, template.fields);
  return { js, html, settings };
}

/**
 * Re-sync the SPX `steps` setting after a patch that changed the Continue chain's LENGTH
 * (regroups only rewrite JS literals — without this the definition advertises presses that
 * no longer exist, and the OGraf export's stepCount goes wrong with it).
 */
export function withStepsSetting(
  template: SpxTemplate,
  js: string,
): Pick<SpxTemplate, 'js' | 'html' | 'settings'> {
  const groups = parseTimeline(js)?.steps.length ?? 0;
  const steps = String(groups + 1);
  if (template.settings.steps === steps) return { js, html: template.html, settings: template.settings };
  const settings = { ...template.settings, steps };
  return { js, html: replaceDefinitionInHtml(template.html, settings, template.fields), settings };
}

/** Replace the managed region with a freshly emitted block for `presetId`. */
export function swapAnimationPreset(js: string, presetId: AnimPresetId, cfg: PresetConfig): string {
  // A data-block region (Timeline v2) is edited through blocks/presetApply — the legacy
  // splicers must never write choreography into the interpreter.
  if (js.includes('var NOACG_ANIM')) return js;
  const start = js.indexOf(ANIMATION_MARK_OPEN);
  const end = js.indexOf(ANIMATION_MARK_CLOSE);
  if (start === -1 || end === -1) return js;
  const preset = anyPresetById(presetId);
  const block = preset.emit(cfg);
  const swapped = js.slice(0, start) + block + js.slice(end + ANIMATION_MARK_CLOSE.length);
  return patchOutsideExit(swapped, cfg.stepOutsideParts ?? []);
}

// ── The outside gate's exit side ─────────────────────────────────────────────
// Press-revealed parts OUTSIDE the root must also LEAVE with the exit — the presets only
// hide the root. Rather than teaching every preset's out emitter about them, the ONE
// recognizable line below is kept in sync surgically, so assign/unassign never resets the
// user's out-phase tuning (and the line's own tuned duration/position survives updates).

const OUTSIDE_EXIT_MARK = '// press-revealed parts outside the root leave with the exit';
const OUTSIDE_EXIT_LINE_RE =
  /[ \t]*tl\.to\([^\n]*\);[ \t]*\/\/ press-revealed parts outside the root leave with the exit\n/;

/** Insert, update, or remove the outside-parts exit line in buildOutTimeline. */
export function patchOutsideExit(js: string, selectors: string[]): string {
  const start = js.indexOf(ANIMATION_MARK_OPEN);
  const end = js.indexOf(ANIMATION_MARK_CLOSE);
  if (start === -1 || end === -1) return js;
  let region = js.slice(start, end);
  const existing = region.match(OUTSIDE_EXIT_LINE_RE)?.[0];

  if (selectors.length === 0) {
    if (!existing) return js;
    region = region.replace(OUTSIDE_EXIT_LINE_RE, '');
  } else {
    // Keep the line's tuned timing when only its selector list changes.
    const dur = existing?.match(/duration:\s*([\d.]+)\s*\/\s*animSpeed/)?.[1] ?? '0.3';
    const pos = existing?.match(/\},\s*([\d.]+(?:\s*\/\s*animSpeed)?)\s*\);/)?.[1] ?? '0';
    const line = `  tl.to([${selectors.map((s) => `'${s}'`).join(', ')}], { opacity: 0, duration: ${dur} / animSpeed }, ${pos});  ${OUTSIDE_EXIT_MARK}\n`;
    if (existing) {
      region = region.replace(OUTSIDE_EXIT_LINE_RE, line);
    } else {
      const outIdx = region.indexOf(OUT_FN);
      if (outIdx === -1) return js;
      const retRel = region.slice(outIdx).search(/\n[ \t]*return tl;/);
      if (retRel === -1) return js;
      const at = outIdx + retRel + 1; // just after the newline, before `return tl;`
      region = region.slice(0, at) + line + region.slice(at);
    }
  }
  return js.slice(0, start) + region + js.slice(end);
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
  let outIdx = commentIdx !== -1 && commentIdx < fnIdx ? commentIdx : fnIdx;
  // A previously mixed region carries its "// Out preset:" tag just above that comment —
  // it belongs to the exit too (leaving it in the head would strand a stale duplicate
  // when the exit is swapped again, and the stale one would win the readback).
  const tagIdx = region.indexOf('// Out preset:');
  if (tagIdx !== -1 && tagIdx < outIdx) outIdx = tagIdx;
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
  if (js.includes('var NOACG_ANIM')) return js; // data regions: blocks/presetApply owns this
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
  // The outside gate's exit line follows the chain through every phase mix.
  return patchOutsideExit(out, cfg.stepOutsideParts ?? []);
}
