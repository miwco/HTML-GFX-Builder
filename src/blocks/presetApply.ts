// Timeline v2 Phase 5 — presets as keyframe generators (docs/TIMELINE_V2_PLAN.md,
// decision 8). A preset's keyframe form is DERIVED from its legacy emitter through the
// parity-proven importer: emit the preset's region for a scratch copy of this template,
// convert it, and lift out the entrance/exit tracks. One choreography source, zero taste
// drift, and the result is ordinary editable keyframes.
//
// Application semantics (ratification points 6-8):
// - a preset declares the properties it controls = the props its donor animates; applying
//   replaces ONLY those tracks in the targeted scope — a manually keyed rotation survives
//   a Slide In (unless the preset itself rotates);
// - "In" is relative to the layer: it targets the step where THAT layer becomes active;
// - "Out" always targets the final step; "Both" writes both, independently editable after;
// - selecting the WHOLE GRAPHIC applies the preset's full choreography (every donor layer),
//   adopting the donor's step duration and ease — the classic whole-preset swap, as data.

import type { SpxTemplate } from '../model/types';
import type { AnimPresetId } from '../model/wizard';
import { anyPresetById } from './animPatch';
import { importAnimData } from './animImport';
import { layerPress } from './animEdit';
import { activationStep } from './animEval';
import { countLines, detectPrefix } from '../model/structure';
import type { AnimData } from './animData';

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Build a preset's donor data for THIS template: its legacy emit (steps off — press
 *  choreography lives in the target's own reveal steps), converted via the importer.
 *  Returns null for presets/templates outside the standard structure contract. */
export function presetDonor(
  template: SpxTemplate,
  data: AnimData,
  presetId: AnimPresetId,
  eases?: { easeIn?: string; easeOut?: string },
): AnimData | null {
  const prefix = detectPrefix(template.html);
  if (!prefix) return null;
  const preset = anyPresetById(presetId);
  const region = preset.emit({
    prefix,
    lineCount: Math.max(1, countLines(template.html)),
    hasAccent: template.html.includes(`${prefix}-accent`),
    steps: false,
    stepOutsideParts: [],
    speed: data.speed,
    easeIn: eases?.easeIn ?? preset.autoEase.easeIn,
    easeOut: eases?.easeOut ?? preset.autoEase.easeOut,
  });
  return importAnimData({ ...template, js: region });
}

export type PresetScope = 'all' | string; // 'all' = the whole graphic, else one selector

/**
 * Apply a donor's keyframes onto the data. Pure; returns new data (or null when the donor
 * offers nothing for the scope). Undeclared properties and other layers are untouched.
 */
export function applyPresetData(
  data: AnimData,
  donor: AnimData,
  phase: 'in' | 'out' | 'both',
  scope: PresetScope,
): AnimData | null {
  const next = JSON.parse(JSON.stringify(data)) as AnimData;
  const phases: ('in' | 'out')[] = phase === 'both' ? ['in', 'out'] : [phase];
  let touched = false;

  for (const ph of phases) {
    const donorStep = ph === 'in' ? donor.steps[0] : donor.steps[donor.steps.length - 1];

    if (scope === 'all') {
      for (const [selector, tracks] of Object.entries(donorStep.layers)) {
        // A press-revealed layer's entrance belongs to its » press, not to ▶ Play —
        // exactly the classic rule (assigned parts drop from the intro choreography).
        if (ph === 'in' && layerPress(next, selector) !== -1) continue;
        const targetStep = ph === 'in' ? next.steps[0] : next.steps[next.steps.length - 1];
        const layer = (targetStep.layers[selector] ??= {});
        for (const [prop, kfs] of Object.entries(tracks)) {
          layer[prop] = kfs.map((k) => ({ ...k }));
          touched = true;
        }
      }
      // The whole-graphic swap adopts the preset's designed pace for the phase.
      const t = ph === 'in' ? next.steps[0] : next.steps[next.steps.length - 1];
      t.duration = donorStep.duration;
      t.ease = donorStep.ease;
    } else {
      // One layer: its own donor tracks when the donor animates it; otherwise the donor's
      // first line's motion, retargeted (so an image/block can take a line-style preset).
      let tracks: import('./animData').AnimLayerTracks | undefined = donorStep.layers[scope];
      if (!tracks) {
        const lineSel = Object.keys(donorStep.layers).find((s) => /^#f\d+$/.test(s));
        tracks = lineSel ? donorStep.layers[lineSel] : undefined;
      }
      if (!tracks) continue;
      const targetIdx = ph === 'out' ? next.steps.length - 1 : activationStep(next, scope);
      const targetStep = next.steps[targetIdx];
      const layer = (targetStep.layers[scope] ??= {});
      for (const [prop, kfs] of Object.entries(tracks)) {
        layer[prop] = kfs.map((k) => ({ ...k }));
        touched = true;
      }
      // The step stretches if the preset's motion outlasts it (never silently truncates).
      const maxT = Math.max(...Object.values(layer).flat().map((k) => k.time));
      if (targetStep.duration < maxT) targetStep.duration = round(maxT);
    }
  }
  return touched ? next : null;
}
