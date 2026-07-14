// Quiz motion presets. Same marked-region + knob contract as every category — this emit is the
// SOURCE the data block is converted from at create (shared/standard.ts convertToDataRegion).
// The entrance choreographs box → question → answer rows; the answer REVEAL itself is not part
// of the preset — which row lights up depends on the operator's f5, so it is code-owned motion:
// it lives in the runtime's revealAnswer(), fired by the Reveal step's lifecycle call.
//
// The quiz structure contract (see shared.ts):
//   .quiz (root, opacity:0) → .quiz-box (the panel) → .quiz-mask > #f0 (question)
//     → .quiz-options → four .quiz-option rows (.quiz-letter chip + #f1..#f4)

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster
var easeIn = '${cfg.easeIn}';   // entrance ease — arrives fast, settles smooth
var easeOut = '${cfg.easeOut}';   // exit ease — starts naturally, leaves quickly`;
}

export const QUIZ_PRESETS: AnimPreset[] = [
  {
    id: 'quiz-reveal' as AnimPresetId,
    name: 'Quiz reveal',
    description: 'Box rises in, the question wipes up, the four answers stagger in — Continue reveals the correct one.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Quiz reveal — panel in, question mask-up, answers stagger in one by one.
// The correct-answer highlight is NOT here: the Reveal step calls revealAnswer() on Continue.
${knobs(cfg)}

// buildInTimeline(): choreographed entrance — box, then question, then the answer rows.
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.quiz', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.quiz-box',                         // the panel: fade + a small rise
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.5 / animSpeed, ease: easeIn });
  tl.fromTo('#f0',                             // the question slides up from behind its mask
    { yPercent: 110 },
    { yPercent: 0, duration: 0.55 / animSpeed, ease: easeIn }, '-=0.25');
  // The four answers walk in one after another. They are named row by row (not by the shared
  // .quiz-option class) so each keeps its own start time — that is what a stagger IS, and it
  // keeps every row independently editable on the timeline.
  tl.fromTo(['.quiz-option-1', '.quiz-option-2', '.quiz-option-3', '.quiz-option-4'],
    { x: -24, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.45 / animSpeed, ease: easeIn, stagger: 0.1 / animSpeed },
    '-=0.2');
  return tl;
}

// buildOutTimeline(): quick exit — the whole panel lifts away, then the root hides.
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.quiz-box', { opacity: 0, y: -16, duration: 0.35 / animSpeed, ease: easeOut });
  tl.set('.quiz', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },
];

export function quizPresetById(id: AnimPresetId): AnimPreset {
  const p = QUIZ_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown quiz preset: ${id}`);
  return p;
}
