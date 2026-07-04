// GSAP animation presets for lower thirds. Each preset emits the complete, commented
// "ANIMATION" block of template.js — the marked region the Animation panel is allowed to
// rewrite. Everything outside the markers (play/stop/update/next scaffolding) never changes.
//
// Presets rely on the standard lower-third structure contract (see shared.ts):
//   .l3 (root, opacity:0 until play) → .l3-accent? → .l3-box → .l3-mask > #fN line elements
// Because the structure is standard, ANY preset can be applied to ANY variant.
//
// Easing contract (docs/DESIGN_LANGUAGE.md §4): the emitted block declares `easeIn` and
// `easeOut` variables that every tween references — one obvious place to change the feel.
// Entrances default to Out-direction curves (arrive fast, settle smooth); exits default to
// In-direction curves (start naturally, leave quickly) and run 30–40 % faster than entrances.
// Each preset carries a hand-tuned `autoEase` pair; the wizard's easing presets
// (model/easings.ts) can override it.

import type { AnimPresetId } from '../../model/wizard';

export interface PresetConfig {
  /** How many visible text lines (#f0…#fN) the design has. */
  lineCount: number;
  /** Whether the design has an .l3-accent element. */
  hasAccent: boolean;
  /** Multi-step mode: in-timeline shows line 1; each next() reveals one more line. */
  steps: boolean;
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

/** The multi-step block: reveals one further line per next() call (SPX Continue). */
function stepsBlock(cfg: PresetConfig): string {
  if (!cfg.steps || cfg.lineCount < 2) return '';
  const rest = Array.from({ length: cfg.lineCount - 1 }, (_, i) => `'#f${i + 1}'`).join(', ');
  return `

// Multi-step: the in animation shows only the first line; each Continue (next())
// reveals one more line with the same motion vocabulary.
var currentStep = 0;
var stepLines = [${rest}];  // lines revealed by steps, in order
function revealNextStep() {
  var line = stepLines[currentStep];
  if (!line) return;                       // no more lines to reveal
  currentStep += 1;
  gsap.fromTo(line,
    { yPercent: 110 },
    { yPercent: 0, duration: 0.45 / animSpeed, ease: easeIn }
  );
}`;
}

/** In steps mode, hide the not-yet-revealed lines at the start of the in-timeline. */
function hideStepLines(cfg: PresetConfig): string {
  if (!cfg.steps || cfg.lineCount < 2) return '';
  const rest = Array.from({ length: cfg.lineCount - 1 }, (_, i) => `'#f${i + 1}'`).join(', ');
  return `\n  tl.set([${rest}], { yPercent: 110 });  // step lines start hidden below their mask`;
}

export const ANIM_PRESETS: AnimPreset[] = [
  {
    id: 'slide-fade',
    name: 'Slide + fade',
    description: 'The graphic rises into place while lines fade up in sequence. Quiet and universal.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Slide + fade — the whole graphic rises in; text lines follow in sequence.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.l3', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.l3-box',
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
  tl.to('.l3-box', { y: 18, opacity: 0, duration: 0.35 / animSpeed });
  tl.set('.l3', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'line-reveal',
    name: 'Line reveal',
    description: 'The accent line draws in first, then text slides up from behind an invisible mask. Elegant.',
    autoEase: { easeIn: 'expo.out', easeOut: 'power3.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Line reveal — the accent draws in, then text slides up from behind its mask.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.l3', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}${
    cfg.hasAccent
      ? `
  tl.fromTo('.l3-accent',
    { scaleX: 0, transformOrigin: 'left center' },   // the line grows from its left end
    { scaleX: 1, duration: 0.45 / animSpeed }
  );`
      : `
  tl.fromTo('.l3-box', { opacity: 0 }, { opacity: 1, duration: 0.3 / animSpeed });`
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
  tl.to('.l3-accent', { scaleX: 0, transformOrigin: 'right center', duration: 0.3 / animSpeed }, '-=0.1');`
      : ''
  }
  tl.set('.l3', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'mask-wipe',
    name: 'Mask wipe',
    description: 'The panel wipes open left-to-right like a curtain; text settles right behind it.',
    autoEase: { easeIn: 'expo.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Mask wipe — the panel reveals via a clip-path wipe; text follows just behind.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.l3', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.l3-box',
    { clipPath: 'inset(0 100% 0 0)' },               // fully clipped from the right…
    { clipPath: 'inset(0 0% 0 0)', duration: 0.55 / animSpeed }  // …wipes open
  );
  tl.fromTo([${linesInIntro(cfg)}],
    { x: -24, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.45 / animSpeed, stagger: 0.08 / animSpeed },
    '-=0.35'
  );
  return tl;
}

// buildOutTimeline(): the exit — wipes closed the way it came, a touch faster.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to([${lineList(cfg.lineCount)}], { opacity: 0, duration: 0.2 / animSpeed });
  tl.to('.l3-box', { clipPath: 'inset(0 0 0 100%)', duration: 0.4 / animSpeed }, '-=0.1');
  tl.set('.l3', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'pop-spring',
    name: 'Pop spring',
    description: 'Scales up with a springy overshoot — friendly, social-stream energy.',
    autoEase: { easeIn: 'back.out(1.6)', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Pop spring — the card pops in with a springy overshoot (Back Out ease).
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.l3', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.l3-box',
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
  tl.to('.l3-box', { scale: 0.94, y: 14, opacity: 0, duration: 0.35 / animSpeed });
  tl.set('.l3', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'snap-stinger',
    name: 'Snap stinger',
    description: 'Slams in from the side and settles in under half a second. Sport-fast.',
    autoEase: { easeIn: 'power4.out', easeOut: 'power3.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Snap stinger — slams in from the left with a skew that settles. Fast by design.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.l3', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.l3-box',
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
  tl.to('.l3-box', { x: 70, skewX: 6, opacity: 0, duration: 0.28 / animSpeed });
  tl.set('.l3', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'blur-in',
    name: 'Blur in',
    description: 'Materialises out of a blur — soft, premium, glassy.',
    autoEase: { easeIn: 'power2.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Blur in — the card materialises out of a blur (filter animates on the box only).
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.l3', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.l3-box',
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
  tl.to('.l3-box', { opacity: 0, filter: 'blur(10px)', duration: 0.35 / animSpeed });
  tl.set('.l3', { opacity: 0 });                     // fully hidden; ready to play again
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
