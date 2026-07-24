// Infographic motion presets. Same marked-region + knob contract as every category — this
// emit is the SOURCE the data block is converted from at create (shared/standard.ts
// convertToDataRegion).
//
// The panel's entrance is ordinary keyframable motion and stays in the region. Everything
// AFTER it is MEASURED — the number counts to the operator's figure, a bar grows to its own
// data-value, the ring draws to that percent, a list cascades one row per line they wrote —
// so the region does not inline that math: it calls a named builder from igMotion.ts, which
// lives outside the markers (docs/DYNAMIC_MOTION_SCOPE.md). That keeps the region parseable,
// so the ordinary importer carries the choreography into the animation data, and the measured
// logic stays readable JS you can edit.
//
// One preset per data shape:
//   - 'count-up' (stat designs): the big number counts from 0 to its value; a paired
//     .infographic-bar-fill progress bar grows once the figure lands.
//   - 'bars-grow' (bar designs): every .infographic-bar-fill grows to its data-value percent.
//   - 'ring-fill' (ring designs): an SVG ring draws to the stat's percent while it counts.
//   - 'rows-cascade' (list designs): the rows of #infographic-rows rise in one after another.
//
// The infographic structure contract (see shared.ts):
//   .infographic (root, opacity:0) → .infographic-box (the panel) → stat value #f0 / #infographic-bars rows
//     / .infographic-ring-fill circle (pathLength="100") / #infographic-rows list rows

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster
var easeIn = '${cfg.easeIn}';   // entrance ease — arrives fast, settles smooth
var easeOut = '${cfg.easeOut}';   // exit ease — starts naturally, leaves quickly`;
}

/** The exit, identical across the presets: the panel fades, then the root hides. Replay resets
 *  live at the START of each entrance (and inside the fromTo builders), so the exit doesn't
 *  need to undo anything — it just leaves. */
function outTimeline(): string {
  return `// buildOutTimeline(): quick fade away — exits run faster than entrances.
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.infographic-box', { opacity: 0, duration: 0.35 / animSpeed, ease: easeOut });
  tl.set('.infographic', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}`;
}

export const IG_PRESETS: AnimPreset[] = [
  {
    id: 'count-up' as AnimPresetId,
    name: 'Count up',
    description: 'The panel rises in, then the big number counts from zero up to its value.',
    autoEase: { easeIn: 'expo.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Count up — reveal the panel, then count the stat (#f0) from 0 to its value.
${knobs(cfg)}

// buildInTimeline(): panel fades and rises in, then the number counts up.
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.infographic', { opacity: 1 });               // reveal the (CSS-hidden) graphic
${
  cfg.hasBars
    ? `  tl.set('.infographic-bar-fill', { width: '0%' });     // the paired bar waits, empty, for its figure
`
    : ''
}  tl.fromTo('.infographic-box',
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.6 / animSpeed, ease: easeIn }
  );
  // MEASURED: the number counts to whatever the operator typed — a value no keyframe can hold,
  // because it changes with the data. infographicCountUp() (below this block) reads it at play
  // time and returns the tween; a paired progress bar grows once the figure lands.
  tl.add(infographicCountUp('#f0'), 0.4 / animSpeed);   // starts while the panel is still settling
  return tl;
}

${outTimeline()}
${MARK_CLOSE}`,
  },

  {
    id: 'bars-grow' as AnimPresetId,
    name: 'Bars grow',
    description: 'The panel pops in, then the bars grow to their values one after another.',
    autoEase: { easeIn: 'back.out(1.4)', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Bars grow — pop the panel in, then each bar grows to its data-value percent.
// The staged reveal runs past the usual 0.5-0.9s entrance window on purpose: a data
// chart earns the extra beats (panel first, then one bar per stagger step).
${knobs(cfg)}

// buildInTimeline(): the panel pops in (glass-family entrance), then the bars grow.
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.infographic', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.set('.infographic-bar-fill', { width: '0%' });     // a rebuild renders the fills AT value — empty them, so they grow
  tl.fromTo('.infographic-box',
    { opacity: 0, y: 20, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.6 / animSpeed, ease: easeIn }
  );
  // MEASURED: each fill grows to its OWN data-value, and there are as many bars as the
  // operator wrote lines — neither is a number a keyframe can hold. infographicBarsGrow()
  // (below this block) reads them at play time and returns the tween.
  tl.add(infographicBarsGrow('.infographic-bar-fill'), 0.6 / animSpeed);
  return tl;
}

${outTimeline()}
${MARK_CLOSE}`,
  },

  {
    id: 'ring-fill' as AnimPresetId,
    name: 'Ring fill',
    description: 'The panel rises in, then a ring draws around the stat while the number counts up.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Ring fill — reveal the panel, then draw the ring to the stat's percent while
// the number (#f0) counts up in sync.
${knobs(cfg)}

// buildInTimeline(): panel fades and rises in, then ring + counter run together.
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.infographic', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.set('.infographic-ring-fill', { strokeDashoffset: 100 });  // the ring waits, empty, for its percent
  tl.fromTo('.infographic-box',
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.6 / animSpeed, ease: easeIn }
  );
  // MEASURED: the ring draws to the operator's percent while the number counts to the same
  // figure — one motion, because it is one value, and the value is theirs. infographicRingFill()
  // (below this block) reads it at play time and returns both tweens, in sync.
  tl.add(infographicRingFill('.infographic-ring-fill'), 0.4 / animSpeed);
  return tl;
}

${outTimeline()}
${MARK_CLOSE}`,
  },

  {
    id: 'goal-ring' as AnimPresetId,
    name: 'Goal ring',
    description: 'The panel rises in, then a ring draws to the share of the goal while the total counts up.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Goal ring — reveal the panel, then draw the ring to raised/goal while the raised
// total (#f0) counts up beside it. Unlike 'ring-fill', the ring's angle and the counted
// number are DIFFERENT values: the ring shows the share of the goal, the number shows the
// money. See infographicGoalRing() below this block.
${knobs(cfg)}

// buildInTimeline(): panel fades and rises in, then ring + total run together.
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.infographic', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.set('.infographic-ring-fill', { strokeDashoffset: 100 });  // the ring waits, empty, for its share
  tl.fromTo('.infographic-box',
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.6 / animSpeed, ease: easeIn }
  );
  // MEASURED: the ring draws to raised/goal and the figure counts to the raised total — both
  // are the operator's data, so neither is a number a keyframe can hold.
  tl.add(infographicGoalRing('.infographic-ring-fill'), 0.4 / animSpeed);
  return tl;
}

${outTimeline()}
${MARK_CLOSE}`,
  },

  {
    id: 'milestone-run' as AnimPresetId,
    name: 'Milestone run',
    description: 'The panel rises in, then the progress line runs along the track, popping each milestone it passes.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Milestone run — reveal the panel, then grow the progress line to its percent while
// each milestone the line passes pops into its reached state. See infographicMilestoneRun()
// below this block: both the line's length and the number of nodes come from the data.
${knobs(cfg)}

// buildInTimeline(): panel fades and rises in, then the line runs the track.
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.infographic', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.set('.infographic-milestone-fill', { width: '0%' });  // the rebuild renders it AT value — empty it, so it runs
  tl.fromTo('.infographic-box',
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.6 / animSpeed, ease: easeIn }
  );
  // MEASURED: how far the line runs is current/target, and how many nodes it passes is how
  // many milestones the operator wrote — neither fits in a static keyframe.
  tl.add(infographicMilestoneRun('.infographic-milestone-fill'), 0.5 / animSpeed);
  return tl;
}

${outTimeline()}
${MARK_CLOSE}`,
  },

  {
    id: 'rows-cascade' as AnimPresetId,
    name: 'Rows cascade',
    description: 'The panel rises in, then the rows cascade up into place one after another.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Rows cascade — reveal the panel, then each row of #infographic-rows rises in with a
// short stagger.
${knobs(cfg)}

// buildInTimeline(): panel fades and rises in, then the rows cascade up one by one.
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.infographic', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.infographic-box',
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.6 / animSpeed, ease: easeIn }
  );
  // MEASURED: the rebuild makes one row per line the operator wrote, so the cascade's length
  // is their content — there is no fixed number of rows to keyframe. infographicRowsCascade()
  // (below this block) reads them at play time and returns the staggered tween.
  tl.add(infographicRowsCascade('#infographic-rows'), 0.4 / animSpeed);
  return tl;
}

${outTimeline()}
${MARK_CLOSE}`,
  },
];

export function igPresetById(id: AnimPresetId): AnimPreset {
  const p = IG_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown infographic preset: ${id}`);
  return p;
}
