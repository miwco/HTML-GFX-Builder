// Timeline v2 — the one-time importer for legacy marked regions (docs/TIMELINE_V2_PLAN.md
// §3, migration tier b). It converts a parse-by-construction region (emitted GSAP
// choreography + steps arrays) into the declarative AnimData model. Used two ways:
// read-only rendering of legacy templates on the new timeline, and the explicit,
// undoable convert-on-first-motion-edit. Templates the old parser cannot read stay
// hand-crafted (the honest banner) — this importer never guesses.

import { parseTimeline, type TimelineTween } from './timelineModel';
import { getTemplateParts } from '../model/structure';
import { detectPrefix } from '../model/structure';
import type { SpxTemplate } from '../model/types';
import type { AnimData, AnimKeyframe, AnimStep } from './animData';

/** The settled design state per property — the FROM value for legacy `to()` tweens (a
 *  to() animates from "wherever the element rests", which for the catalog's emitted
 *  exits is always the design state). Unknown props get no from-keyframe (the value
 *  then applies instantly — a degraded but honest conversion). */
const DESIGN_STATE: Record<string, number | string> = {
  x: 0,
  y: 0,
  xPercent: 0,
  yPercent: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  rotationX: 0,
  rotationY: 0,
  skewX: 0,
  skewY: 0,
  opacity: 1,
  filter: 'blur(0px)',
};

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Add one keyframe to a step's layer track, keeping time order. */
function addKf(step: AnimStep, selector: string, prop: string, kf: AnimKeyframe) {
  const layer = (step.layers[selector] ??= {});
  const track = (layer[prop] ??= []);
  // Two keyframes at the same time collapse to the later write (a set over a set).
  const existing = track.findIndex((k) => Math.abs(k.time - kf.time) < 0.001);
  if (existing !== -1) track[existing] = kf;
  else track.push(kf);
  track.sort((a, b) => a.time - b.time);
}

/** Convert one parsed phase tween into keyframes on a step (times are stored
 *  speed-relative, so the model's post-division seconds multiply back by speed). */
function tweenToKeyframes(step: AnimStep, tween: TimelineTween, speed: number, rootSelector: string) {
  const props = Object.keys(tween.toAll ?? {});
  if (props.length === 0) return;
  tween.targets.forEach((selector, member) => {
    // The interpreter owns the root's show/hide — don't import the emitted root sets.
    if (tween.kind === 'set' && selector === rootSelector && props.length === 1 && props[0] === 'opacity') return;
    const offset = member * tween.stagger;
    for (const prop of props) {
      const to = tween.toAll![prop];
      if (tween.kind === 'set') {
        addKf(step, selector, prop, { time: round((tween.start + offset) * speed), value: to });
        continue;
      }
      const from = tween.fromAll?.[prop] ?? DESIGN_STATE[prop];
      if (from !== undefined) {
        addKf(step, selector, prop, { time: round((tween.start + offset) * speed), value: from });
      }
      addKf(step, selector, prop, {
        time: round((tween.start + offset + tween.duration) * speed),
        value: to,
        ...(tween.ease ? { ease: tween.ease } : {}),
      });
    }
  });
}

/**
 * Convert a legacy template's marked region into AnimData. Returns null when the old
 * parser can't read the region (hand-crafted code — the honest-banner case) or the
 * template has no detectable root.
 */
export function importAnimData(template: SpxTemplate): AnimData | null {
  const model = parseTimeline(template.js);
  const prefix = detectPrefix(template.html);
  if (!model || !prefix) return null;
  const root = `.${prefix}`;
  const speed = model.animSpeed || 1;
  const parts = getTemplateParts(template.html, template.fields);
  const channelOf = new Map(parts.map((p) => [p.selector, p.channel]));

  const inPhase = model.phases.find((p) => p.id === 'in') ?? model.phases[0];
  const outPhase = model.phases.find((p) => p.id === 'out') ?? model.phases[model.phases.length - 1];
  if (!inPhase || !outPhase) return null;
  // Endless loops (tickers' marquees, credit rolls) are runtime-owned motion the keyframe
  // model deliberately does not describe — those categories keep their own emits until
  // their Phase 5 migration decides the loop representation.
  if (inPhase.infinite || outPhase.infinite) return null;

  const enter: AnimStep = {
    name: 'Enter',
    duration: round(Math.max(0.05, inPhase.duration) * speed),
    ease: model.easeIn,
    layers: {},
  };
  for (const tween of inPhase.tweens) tweenToKeyframes(enter, tween, speed, root);

  // Each legacy » press becomes one middle step; its reveal choreography (the channel
  // motion the old stepsBlock emitted) becomes ordinary keyframes.
  const middles: AnimStep[] = model.steps.map((s, k) => {
    const step: AnimStep = {
      name: `Step ${k + 2}`,
      duration: round((s.duration + s.stagger * Math.max(0, s.targets.length - 1)) * speed),
      ease: s.ease ?? model.easeIn,
      reveals: [...s.targets],
      layers: {},
    };
    s.targets.forEach((selector, m) => {
      const at = round(m * s.stagger * speed);
      const end = round((m * s.stagger + s.duration) * speed);
      if (channelOf.get(selector) === 'mask') {
        addKf(step, selector, 'yPercent', { time: at, value: 110 });
        addKf(step, selector, 'yPercent', { time: end, value: 0 });
      } else {
        addKf(step, selector, 'opacity', { time: at, value: 0 });
        addKf(step, selector, 'opacity', { time: end, value: 1 });
        addKf(step, selector, 'y', { time: at, value: 14 });
        addKf(step, selector, 'y', { time: end, value: 0 });
      }
    });
    return step;
  });

  const out: AnimStep = {
    name: 'Out',
    duration: round(Math.max(0.05, outPhase.duration) * speed),
    ease: model.easeOut,
    layers: {},
  };
  for (const tween of outPhase.tweens) tweenToKeyframes(out, tween, speed, root);

  return { version: 1, root, speed, steps: [enter, ...middles, out] };
}
