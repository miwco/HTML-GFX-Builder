// Animation easing presets (GSAP ease strings). House doctrine (docs/DESIGN_LANGUAGE.md §4):
// movement must feel responsive but polished — never mechanical.
//
// - IN animations prefer an *Out-direction* curve (enter quickly, settle smoothly).
// - OUT animations prefer an *In-direction* curve (start naturally, exit quickly).
//   Each preset below therefore carries the correct GSAP ease for each phase.
// - Safe defaults: Easy Ease / Ease Out. Back = snappy pop with a small overshoot.
// - Bounce and Elastic are playful options only — never defaults.
// - Linear is only for continuous motion (tickers, timers, progress bars).

export type EasingId =
  | 'auto'
  | 'linear'
  | 'easy-ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'back'
  | 'bounce'
  | 'elastic'
  | 'expo'
  | 'cubic'
  | 'sine'
  | 'circ';

export interface EasingPreset {
  id: Exclude<EasingId, 'auto'>;
  name: string;
  /** GSAP ease used for entrance (in) animations. */
  gsapIn: string;
  /** GSAP ease used for exit (out) animations. */
  gsapOut: string;
  description: string;
  /** 'standard' = safe pick · 'playful' = use sparingly · 'continuous' = loops/timers only. */
  tag: 'standard' | 'playful' | 'continuous';
}

export const EASINGS: EasingPreset[] = [
  {
    id: 'easy-ease',
    name: 'Easy Ease',
    gsapIn: 'power1.inOut',
    gsapOut: 'power1.inOut',
    description: 'Gentle S-curve at both ends — the classic smooth default.',
    tag: 'standard',
  },
  {
    id: 'ease-out',
    name: 'Ease Out',
    gsapIn: 'power2.out',
    gsapOut: 'power2.out',
    description: 'Fast start that settles softly — the safe pick for entrances.',
    tag: 'standard',
  },
  {
    id: 'ease-in',
    name: 'Ease In',
    gsapIn: 'power2.in',
    gsapOut: 'power2.in',
    description: 'Gentle start that accelerates — the natural pick for exits.',
    tag: 'standard',
  },
  {
    id: 'ease-in-out',
    name: 'Ease In-Out',
    gsapIn: 'power2.inOut',
    gsapOut: 'power2.inOut',
    description: 'A stronger S-curve than Easy Ease — smooth both ends, more drive in the middle.',
    tag: 'standard',
  },
  {
    id: 'cubic',
    name: 'Cubic',
    gsapIn: 'power2.out',
    gsapOut: 'power2.in',
    description: 'The cubic family with the right direction per phase: out on entry, in on exit.',
    tag: 'standard',
  },
  {
    id: 'sine',
    name: 'Sine',
    gsapIn: 'sine.out',
    gsapOut: 'sine.in',
    description: 'The softest curve — subtle, almost linear, but never mechanical.',
    tag: 'standard',
  },
  {
    id: 'circ',
    name: 'Circ',
    gsapIn: 'circ.out',
    gsapOut: 'circ.in',
    description: 'Rounder than cubic — a strong arrival that eases off late.',
    tag: 'standard',
  },
  {
    id: 'expo',
    name: 'Expo',
    gsapIn: 'expo.out',
    gsapOut: 'expo.in',
    description: 'Dramatic: arrives very fast, settles very late. Great for reveals.',
    tag: 'standard',
  },
  {
    id: 'back',
    name: 'Back',
    gsapIn: 'back.out(1.6)',
    gsapOut: 'back.in(1.4)',
    description: 'Snappy pop with a small overshoot in, and a little anticipation out.',
    tag: 'standard',
  },
  {
    id: 'bounce',
    name: 'Bounce',
    gsapIn: 'bounce.out',
    gsapOut: 'power2.in',
    description: 'Lands with bounces. Playful — not a default. Exits cleanly (no bounce out).',
    tag: 'playful',
  },
  {
    id: 'elastic',
    name: 'Elastic',
    gsapIn: 'elastic.out(1, 0.4)',
    gsapOut: 'power2.in',
    description: 'Springs past and oscillates into place. Playful — not a default.',
    tag: 'playful',
  },
  {
    id: 'linear',
    name: 'Linear',
    gsapIn: 'none',
    gsapOut: 'none',
    description: 'Constant speed. Only for continuous motion: tickers, timers, progress bars.',
    tag: 'continuous',
  },
];

export function easingById(id: Exclude<EasingId, 'auto'>): EasingPreset {
  const e = EASINGS.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown easing preset: ${id}`);
  return e;
}

/**
 * Resolve the { easeIn, easeOut } GSAP strings for a choice: 'auto' uses the animation
 * preset's hand-tuned pair; anything else uses the easing preset's phase-correct pair.
 */
export function resolveEasing(
  choice: EasingId,
  autoPair: { easeIn: string; easeOut: string },
): { easeIn: string; easeOut: string } {
  if (choice === 'auto') return autoPair;
  const e = easingById(choice);
  return { easeIn: e.gsapIn, easeOut: e.gsapOut };
}
