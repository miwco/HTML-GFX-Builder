// GSAP animation presets for lower thirds. Each preset emits the complete, commented
// "ANIMATION" block of template.js — the marked region the Animation panel is allowed to
// rewrite. Everything outside the markers (play/stop/update/next scaffolding) never changes.
//
// Presets rely on the standard structure contract, parameterized by a class PREFIX so every
// category shares this library (lower thirds use "lower-third", info cards "info-card", …):
//   .<p> (root, opacity:0 until play) → .<p>-accent? → .<p>-box → .<p>-mask > #fN line elements
// Because the structure is standard, ANY preset applies to ANY variant of ANY category.
//
// Easing contract (docs/DESIGN_LANGUAGE.md §4): the emitted block declares `easeIn` and
// `easeOut` variables that every tween references — one obvious place to change the feel.
// Entrances default to Out-direction curves (arrive fast, settle smooth); exits default to
// In-direction curves (start naturally, leave quickly) and run 30–40 % faster than entrances.
// Each preset carries a hand-tuned `autoEase` pair; the wizard's easing presets
// (model/easings.ts) can override it.

import type { AnimPresetId } from '../../model/wizard';

/** A template's existing Continue chain, carried through re-emits so a preset swap never
 *  resets the user's regrouping or per-step timing. Values are the RAW literals the arrays
 *  are written with (durations pre-division, eases 'easeIn' or a quoted string). */
export interface StepChain {
  groups: string[][];
  durations: string[];
  eases: string[];
}

export interface PresetConfig {
  /** The category's class prefix ('lower-third', 'info-card', 'credits', 'ticker'). */
  prefix: string;
  /** How many visible text lines (#f0…#fN) the design has. */
  lineCount: number;
  /** Whether the design has a .<prefix>-accent element. */
  hasAccent: boolean;
  /** Multi-step mode: in-timeline shows line 1; each next() reveals one more line. */
  steps: boolean;
  /** The current chain to preserve (when the template already has one); absent = defaults. */
  stepChain?: StepChain;
  /** Initial animSpeed value (0.75 slower · 1 normal · 1.5 faster). */
  speed: number;
  /** GSAP ease string for entrance tweens (e.g. 'power3.out', 'back.out(1.6)'). */
  easeIn: string;
  /** GSAP ease string for exit tweens (e.g. 'power2.in'). */
  easeOut: string;
}

export interface AnimPreset {
  id: AnimPresetId;
  name: string;
  description: string;
  /** The preset's hand-tuned ease pair, used when the easing choice is 'auto'. */
  autoEase: { easeIn: string; easeOut: string };
  /** Emit the full marked ANIMATION block for template.js. */
  emit(cfg: PresetConfig): string;
}

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

/** Selectors for the visible line elements, e.g. "'#f0', '#f1'". */
function lineList(count: number): string {
  return Array.from({ length: count }, (_, i) => `'#f${i}'`).join(', ');
}

/** In steps mode only line 1 enters with the in-timeline; the rest wait for next(). */
function linesInIntro(cfg: PresetConfig): string {
  return cfg.steps ? lineList(1) : lineList(cfg.lineCount);
}

/**
 * Shared header of the marked block: the three knobs every tween reads.
 * Change these to retime or re-ease the whole graphic.
 */
function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};${' '.repeat(Math.max(1, 21 - String(cfg.speed).length))}// 1 = normal · 0.75 = slower · 1.5 = faster
var easeIn = '${cfg.easeIn}';${' '.repeat(Math.max(1, 18 - cfg.easeIn.length))}// entrance ease — arrives fast, settles smooth
var easeOut = '${cfg.easeOut}';${' '.repeat(Math.max(1, 17 - cfg.easeOut.length))}// exit ease — starts naturally, leaves quickly`;
}

/** The multi-step block: each next() (SPX Continue) reveals the next GROUP of lines.
 *  Groups + per-step timing/ease live in the arrays — the timeline strip edits those
 *  literals (drag a line between step segments to regroup). */
function stepsBlock(cfg: PresetConfig): string {
  if (!cfg.steps || cfg.lineCount < 2) return '';
  // An existing chain (regrouped presses, tuned timings) survives the re-emit; without one,
  // the default is one line per press in document order. Note hideStepLines/linesInIntro
  // stay line-count-derived: every line 1..N-1 is in SOME group, so the union is identical.
  const chain = cfg.stepChain && cfg.stepChain.groups.length > 0 ? cfg.stepChain : null;
  const count = chain ? chain.groups.length : cfg.lineCount - 1;
  const groups = chain
    ? chain.groups.map((g) => `[${g.map((t) => `'${t}'`).join(', ')}]`).join(', ')
    : Array.from({ length: count }, (_, i) => `['#f${i + 1}']`).join(', ');
  const durations = (chain ? chain.durations : Array.from({ length: count }, () => '0.45')).join(', ');
  const eases = (chain ? chain.eases : Array.from({ length: count }, () => 'easeIn')).join(', ');
  return `

// Multi-step: the in animation shows only the first line; each Continue (next())
// reveals the next GROUP of lines. Groups + per-step timing below — the timeline
// strip edits these (drag a line between step segments to regroup).
var currentStep = 0;
var stepGroups = [${groups}];  // lines revealed per Continue, in order
var stepDurations = [${durations}];  // seconds per step (divided by animSpeed)
var stepEases = [${eases}];  // ease per step (a quoted string overrides the knob)
function revealNextStep() {
  var group = stepGroups[currentStep];
  if (group === undefined) return null;    // no more steps
  var duration = stepDurations[currentStep] || 0.45;
  var ease = stepEases[currentStep] || easeIn;
  currentStep += 1;
  return gsap.fromTo(group,
    { yPercent: 110 },
    { yPercent: 0, duration: duration / animSpeed, stagger: 0.08 / animSpeed, ease: ease }
  );
}`;
}

/** In steps mode, hide the not-yet-revealed lines at the start of the in-timeline. */
function hideStepLines(cfg: PresetConfig): string {
  if (!cfg.steps || cfg.lineCount < 2) return '';
  const rest = Array.from({ length: cfg.lineCount - 1 }, (_, i) => `'#f${i + 1}'`).join(', ');
  return `
  currentStep = 0;                                 // a fresh play restarts the step sequence
  tl.set([${rest}], { yPercent: 110 });  // step lines start hidden below their mask`;
}

export const ANIM_PRESETS: AnimPreset[] = [
  {
    id: 'slide-fade',
    name: 'Slide + fade',
    description: 'In: the graphic rises into place, lines follow in sequence. Out: it sinks back down and fades. Quiet and universal.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Slide + fade — the whole graphic rises in; text lines follow in sequence.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.${cfg.prefix}-box',
    { y: 26, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.55 / animSpeed }
  );
  tl.fromTo([${linesInIntro(cfg)}],
    { yPercent: 110 },
    { yPercent: 0, duration: 0.5 / animSpeed, stagger: 0.09 / animSpeed },
    '-=0.3'                                          // overlap with the box for flow
  );
  return tl;
}

// buildOutTimeline(): the exit — always faster than the entrance.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-box', { y: 18, opacity: 0, duration: 0.35 / animSpeed });
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'line-reveal',
    name: 'Line reveal',
    description: 'In: the accent line draws in, text slides up from behind its mask. Out: text drops back, the line retracts. Elegant.',
    autoEase: { easeIn: 'expo.out', easeOut: 'power3.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Line reveal — the accent draws in, then text slides up from behind its mask.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}${
    cfg.hasAccent
      ? `
  tl.fromTo('.${cfg.prefix}-accent',
    { scaleX: 0, transformOrigin: 'left center' },   // the line grows from its left end
    { scaleX: 1, duration: 0.45 / animSpeed }
  );`
      : `
  tl.fromTo('.${cfg.prefix}-box', { opacity: 0 }, { opacity: 1, duration: 0.3 / animSpeed });`
  }
  tl.fromTo([${linesInIntro(cfg)}],
    { yPercent: 110 },                               // start hidden below the mask edge
    { yPercent: 0, duration: 0.55 / animSpeed, stagger: 0.1 / animSpeed },
    '-=0.15'
  );
  return tl;
}

// buildOutTimeline(): the exit — text drops back behind the mask, accent retracts.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to([${lineList(cfg.lineCount)}], { yPercent: 110, duration: 0.35 / animSpeed, stagger: 0.05 / animSpeed });${
    cfg.hasAccent
      ? `
  tl.to('.${cfg.prefix}-accent', { scaleX: 0, transformOrigin: 'right center', duration: 0.3 / animSpeed }, '-=0.1');`
      : ''
  }
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'mask-wipe',
    name: 'Mask wipe',
    description: 'In: the panel wipes open left-to-right like a curtain. Out: it wipes shut the other way.',
    autoEase: { easeIn: 'expo.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Mask wipe — the panel reveals via a clip-path wipe; text follows just behind.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.${cfg.prefix}-box',
    { clipPath: 'inset(0 100% 0 0)' },               // fully clipped from the right…
    { clipPath: 'inset(0 0% 0 0)', duration: 0.55 / animSpeed }  // …wipes open
  );
  tl.fromTo([${linesInIntro(cfg)}],
    { x: -24, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.45 / animSpeed, stagger: 0.08 / animSpeed },
    '-=0.35'
  );
  tl.set('.${cfg.prefix}-box', { clearProps: 'clipPath' });     // drop the clip once open — skewed ::before/::after layers may poke past the box
  return tl;
}

// buildOutTimeline(): the exit — wipes closed the way it came, a touch faster.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to([${lineList(cfg.lineCount)}], { opacity: 0, duration: 0.2 / animSpeed });
  tl.fromTo('.${cfg.prefix}-box',
    { clipPath: 'inset(0 0% 0 0%)' },                // re-arm the clip (the entrance cleared it)…
    { clipPath: 'inset(0 0% 0 100%)', duration: 0.4 / animSpeed },  // …and wipe closed
    '-=0.1');
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'pop-spring',
    name: 'Pop spring',
    description: 'In: pops up with a springy overshoot. Out: shrinks away cleanly, no bounce. Friendly, social-stream energy.',
    autoEase: { easeIn: 'back.out(1.6)', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Pop spring — the card pops in with a springy overshoot (Back Out ease).
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.${cfg.prefix}-box',
    { scale: 0.9, y: 24, opacity: 0 },
    { scale: 1, y: 0, opacity: 1, duration: 0.6 / animSpeed }
  );
  tl.fromTo([${linesInIntro(cfg)}],
    { y: 14, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.4 / animSpeed, stagger: 0.07 / animSpeed },
    '-=0.25'
  );
  return tl;
}

// buildOutTimeline(): the exit — shrinks away quickly, no bounce on the way out.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-box', { scale: 0.94, y: 14, opacity: 0, duration: 0.35 / animSpeed });
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'snap-stinger',
    name: 'Snap stinger',
    description: 'In: slams in from the left and snaps straight. Out: snaps away to the right, even faster. Sport-fast.',
    autoEase: { easeIn: 'power4.out', easeOut: 'power3.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Snap stinger — slams in from the left with a skew that settles. Fast by design.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.${cfg.prefix}-box',
    { x: -90, skewX: -10, opacity: 0 },              // arrives fast with a lean…
    { x: 0, skewX: 0, opacity: 1, duration: 0.38 / animSpeed }  // …and snaps straight
  );
  tl.fromTo([${linesInIntro(cfg)}],
    { x: -30, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.3 / animSpeed, stagger: 0.05 / animSpeed },
    '-=0.22'
  );
  return tl;
}

// buildOutTimeline(): the exit — snaps out the opposite way, even faster.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-box', { x: 70, skewX: 6, opacity: 0, duration: 0.28 / animSpeed });
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'blur-in',
    name: 'Blur in',
    description: 'In: materialises out of a blur. Out: dissolves back into it. Soft, premium, glassy.',
    autoEase: { easeIn: 'power2.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Blur in — the card materialises out of a blur (filter animates on the box only).
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.${cfg.prefix}-box',
    { opacity: 0, filter: 'blur(14px)', y: 12 },
    { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.6 / animSpeed }
  );
  tl.fromTo([${linesInIntro(cfg)}],
    { y: 10, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.4 / animSpeed, stagger: 0.08 / animSpeed },
    '-=0.3'
  );
  return tl;
}

// buildOutTimeline(): the exit — dissolves back into the blur, faster.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-box', { opacity: 0, filter: 'blur(10px)', duration: 0.35 / animSpeed });
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'fade',
    name: 'Fade',
    description: 'In: a clean crossfade, no movement at all. Out: fades to nothing. The calmest choice.',
    autoEase: { easeIn: 'sine.out', easeOut: 'sine.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Fade — a pure opacity dissolve, no movement. Calm, documentary, timeless.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.${cfg.prefix}-box',
    { opacity: 0 },
    { opacity: 1, duration: 0.6 / animSpeed }
  );
  tl.fromTo([${linesInIntro(cfg)}],
    { opacity: 0 },
    { opacity: 1, duration: 0.5 / animSpeed, stagger: 0.12 / animSpeed },
    '-=0.35'                                         // lines join while the box is still fading
  );
  return tl;
}

// buildOutTimeline(): the exit — fades away faster than it arrived.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-box', { opacity: 0, duration: 0.4 / animSpeed });
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'drop-in',
    name: 'Drop in',
    description: 'In: the card falls from above and lands with a soft overshoot. Out: it lifts straight back up and away.',
    autoEase: { easeIn: 'back.out(1.4)', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Drop in — the card falls from above and settles with a small overshoot.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.${cfg.prefix}-box',
    { y: -70, opacity: 0 },                          // starts well above its resting spot…
    { y: 0, opacity: 1, duration: 0.6 / animSpeed }  // …falls in and settles (Back Out)
  );
  tl.fromTo([${linesInIntro(cfg)}],
    { y: -12, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.4 / animSpeed, stagger: 0.07 / animSpeed },
    '-=0.3'
  );
  return tl;
}

// buildOutTimeline(): the exit — lifts straight back up and away, faster.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-box', { y: -40, opacity: 0, duration: 0.35 / animSpeed });
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'flip-3d',
    name: 'Flip 3D',
    description: 'In: the card swings down from a 3D hinge along its top edge. Out: it folds forward and away. Dimensional.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Flip 3D — the card swings in on a 3D hinge along its top edge.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.${cfg.prefix}-box',
    { rotationX: -80, opacity: 0, transformPerspective: 900, transformOrigin: 'center top' },
    { rotationX: 0, opacity: 1, duration: 0.65 / animSpeed }
  );
  tl.fromTo([${linesInIntro(cfg)}],
    { opacity: 0 },
    { opacity: 1, duration: 0.35 / animSpeed, stagger: 0.08 / animSpeed },
    '-=0.25'
  );
  return tl;
}

// buildOutTimeline(): the exit — folds forward past the camera, faster.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-box',
    { rotationX: 65, opacity: 0, transformPerspective: 900, transformOrigin: 'center top', duration: 0.4 / animSpeed });
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },
];

export function presetById(id: AnimPresetId): AnimPreset {
  const preset = ANIM_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown animation preset: ${id}`);
  return preset;
}

export { MARK_OPEN as ANIMATION_MARK_OPEN, MARK_CLOSE as ANIMATION_MARK_CLOSE };
