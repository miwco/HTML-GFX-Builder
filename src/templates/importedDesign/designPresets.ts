// Motion presets for an IMPORTED design — the artwork and its text as ONE unit.
//
// The imported-design structure contract (see shared.ts):
//   .imported-design (root, opacity:0 until play)
//     → .imported-design-box (the design unit: artwork + the text on it)
//       → .imported-design-art (the artwork) + .imported-design-mask > #fN (the text fields)
//
// Every preset here animates the BOX and nothing else, on purpose. A flat design is one
// picture: the operator's text is positioned to sit inside artwork that was drawn around it,
// so moving a line independently of the art it belongs to tears the design apart. The
// catalog's line presets (lowerThirds/animPresets.ts) do exactly that — they stagger #fN
// lines out of their masks — which is why this family exists instead of reusing them.
//
// Per-element motion is not forbidden here, just not the preset's business: the imported
// design is a data-block template like any other, so the timeline can key any layer after
// creation. The presets simply choose the whole unit.
//
// Easing doctrine (docs/DESIGN_LANGUAGE.md §4) as everywhere: entrances use Out-direction
// curves, exits use In-direction curves and run faster than the entrance.

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};        // 1 = normal · 0.75 = slower · 1.5 = faster
var easeIn = '${cfg.easeIn}';   // entrance ease — arrives fast, settles smooth
var easeOut = '${cfg.easeOut}';  // exit ease — starts naturally, leaves quickly`;
}

/**
 * The entrance, around each preset's own box motion. `from`/`to` are the box's GSAP vars;
 * every preset reveals the CSS-hidden root first, exactly like the catalog's presets.
 */
function inTimeline(cfg: PresetConfig, note: string, from: string, to: string): string {
  return `// buildInTimeline(): choreographs the entrance. Called by play().
// ${note}
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });   // reveal the (CSS-hidden) graphic
  tl.fromTo('.${cfg.prefix}-box',
    ${from},
    ${to}
  );
  return tl;
}`;
}

/** The exit: one tween off, then the root goes fully hidden and is ready to play again. */
function outTimeline(cfg: PresetConfig, to: string): string {
  return `// buildOutTimeline(): the exit — leaves faster than it arrived.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-box', ${to});
  tl.set('.${cfg.prefix}', { opacity: 0 });   // fully hidden; ready to play again
  return tl;
}`;
}

function region(cfg: PresetConfig, title: string, inTl: string, outTl: string): string {
  return `${MARK_OPEN}
// ${title}
${knobs(cfg)}

${inTl}

${outTl}
${MARK_CLOSE}`;
}

export const DESIGN_PRESETS: AnimPreset[] = [
  {
    id: 'design-fade' as AnimPresetId,
    name: 'Fade',
    description: 'In: the design dissolves up. Out: it dissolves away. The calmest choice.',
    autoEase: { easeIn: 'sine.out', easeOut: 'sine.in' },
    emit: (cfg) =>
      region(
        cfg,
        'Preset: Fade — a pure opacity dissolve, no movement. Calm, documentary, timeless.',
        inTimeline(
          cfg,
          'The whole design fades up together — artwork and text are one picture.',
          `{ opacity: 0 }`,
          `{ opacity: 1, duration: 0.6 / animSpeed }`,
        ),
        outTimeline(cfg, `{ opacity: 0, duration: 0.4 / animSpeed }`),
      ),
  },

  {
    id: 'design-slide' as AnimPresetId,
    name: 'Slide up',
    description: 'In: the design rises into place as it fades up. Out: it drops back and away.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) =>
      region(
        cfg,
        'Preset: Slide up — the design travels a short distance into place. The workhorse.',
        inTimeline(
          cfg,
          'A short rise reads as "arriving" without drawing attention to the movement itself.',
          `{ opacity: 0, y: 40 }`,
          `{ opacity: 1, y: 0, duration: 0.55 / animSpeed }`,
        ),
        outTimeline(cfg, `{ opacity: 0, y: 24, duration: 0.38 / animSpeed }`),
      ),
  },

  {
    id: 'design-pop' as AnimPresetId,
    name: 'Pop',
    description: 'In: the design springs up to size with a soft overshoot. Out: it shrinks away.',
    autoEase: { easeIn: 'back.out(1.5)', easeOut: 'power2.in' },
    emit: (cfg) =>
      region(
        cfg,
        'Preset: Pop — a small scale overshoot. Energetic; suits sport and entertainment.',
        inTimeline(
          cfg,
          'Scaling the box scales the artwork and its text together, so nothing drifts apart.',
          `{ opacity: 0, scale: 0.86 }`,
          `{ opacity: 1, scale: 1, duration: 0.5 / animSpeed }`,
        ),
        outTimeline(cfg, `{ opacity: 0, scale: 0.94, duration: 0.34 / animSpeed }`),
      ),
  },

  {
    id: 'design-blur' as AnimPresetId,
    name: 'Blur',
    description: 'In: the design resolves out of a soft blur. Out: it dissolves back into one.',
    autoEase: { easeIn: 'power2.out', easeOut: 'power2.in' },
    emit: (cfg) =>
      region(
        cfg,
        'Preset: Blur — the design focuses into place. Filmic; best over calm footage.',
        inTimeline(
          cfg,
          'filter animates as a string — GSAP tweens the number inside it.',
          `{ opacity: 0, filter: 'blur(14px)' }`,
          `{ opacity: 1, filter: 'blur(0px)', duration: 0.6 / animSpeed }`,
        ),
        outTimeline(cfg, `{ opacity: 0, filter: 'blur(10px)', duration: 0.4 / animSpeed }`),
      ),
  },
];
