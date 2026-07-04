// Deterministic patchers for the marked ANIMATION region in generated template JS.
// The Animation panel only ever touches (a) the three knob variables (animSpeed, easeIn,
// easeOut) and (b) the region between the markers when swapping presets. Everything the
// user wrote outside the markers is never modified.

import { ANIMATION_MARK_CLOSE, ANIMATION_MARK_OPEN, ANIM_PRESETS, presetById, type PresetConfig } from '../templates/lowerThirds/animPresets';
import type { AnimPresetId } from '../model/wizard';
import type { SpxTemplate } from '../model/types';

export interface AnimationInfo {
  /** True when the js contains the managed markers (wizard-generated templates). */
  hasRegion: boolean;
  /** The preset currently in the region, matched from its "// Preset: <Name>" line. */
  presetId: AnimPresetId | null;
  speed: number;
  easeIn: string | null;
  easeOut: string | null;
  steps: boolean;
}

/** Inspect the template JS for the managed animation region and its current knobs. */
export function readAnimationInfo(js: string): AnimationInfo {
  const hasRegion = js.includes(ANIMATION_MARK_OPEN) && js.includes(ANIMATION_MARK_CLOSE);
  const presetName = (js.match(/\/\/ Preset: ([^—\n]+)/) || [])[1]?.trim() ?? null;
  const preset = ANIM_PRESETS.find((p) => p.name === presetName);
  return {
    hasRegion,
    presetId: preset?.id ?? null,
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
  const preset = info.presetId ? presetById(info.presetId) : ANIM_PRESETS[0];
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
  const preset = presetById(presetId);
  const block = preset.emit(cfg);
  return js.slice(0, start) + block + js.slice(end + ANIMATION_MARK_CLOSE.length);
}
