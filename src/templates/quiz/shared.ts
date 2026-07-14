// Quiz scaffolding. Quiz graphics carry six FIXED data fields (they never come from
// o.lines — the wizard's line editor doesn't apply here):
//   f0 "Question" · f1–f4 "Answer A".."Answer D" · f5 "Correct answer" (dropdown A/B/C/D)
//
// Structure contract:
//   <div class="quiz">                 root — zone positioned; opacity:0 until play()
//     <div class="quiz-box">           the panel; presets tween this
//       <div class="quiz-mask"><span id="f0">…</span></div>      the question (mask-up reveal)
//       <div class="quiz-options">                               the four answer rows
//         <div class="quiz-option quiz-option-1">                shared look + its own identity
//           <span class="quiz-letter">A</span>                   static letter chip
//           <span id="f1">…</span>                             the answer text
//         </div>
//         …same for B/#f2, C/#f3, D/#f4 (quiz-option-2..4)…
//       </div>
//     </div>
//     hidden #f5 source SPX writes the correct letter into
//   </div>
//
// The reveal: SPX's Continue button calls next(), which plays the graphic's second step —
// the "Reveal" step, whose whole content is a lifecycle call to revealAnswer(). That reads the
// letter in #f5, marks that .quiz-option with 'quiz-correct' (accent treatment) and the other
// three with 'quiz-dim' (faded) — designs MUST style both classes. Presets tween .quiz-box and
// .quiz-option, so designs never put skew/rotation on those elements (paint it on
// ::before/::after layers).
//
// Why a CALL and not keyframes: WHICH row lights up is chosen by the operator at play time
// (field f5), so the reveal has no fixed target and no static keyframe can describe it. It is
// honestly code-owned motion — the same posture as a clock's startClock() — so the data names
// the function and the logic stays readable JS outside the marked region.

import type { SpxField, SpxTemplate } from '../../model/types';
import { definitionScriptBlock } from '../../model/spxDefinition';
import { resolveEasing } from '../../model/easings';
import {
  resolveOptions,
  type ResolvedOptions,
  type TemplateVariant,
  type WizardOptions,
} from '../../model/wizard';
import {
  baseSettings,
  computeScale,
  documentHtml,
  maxTextWidthCss,
  resetCanvasCss,
  resolveHeadingFont,
  rootVarsCss,
  setFieldValueJs,
  zoneCssText,
} from '../shared/base';
import { convertToDataRegion } from '../shared/standard';
import type { AnimData, AnimStep } from '../../blocks/animData';
import type { PresetConfig } from '../lowerThirds/animPresets';
import { quizPresetById } from './quizPresets';

export interface QuizDesign {
  /**
   * Inner HTML of .quiz — must contain .quiz-box with .quiz-mask > span#f0 and .quiz-options
   * holding the four answer rows (.quiz-letter chip + span#f1..#f4).
   *
   * Each row carries TWO classes: `quiz-option` (the shared look — all four style alike, and
   * revealAnswer() marks the winner through it) and `quiz-option-N`, N = 1..4 (its animation
   * identity). The numbered class is required: the entrance staggers the rows, and a stagger
   * lives in the keyframe model as per-row start times, which a single class matching four
   * elements cannot carry. It is also what makes each row selectable and separately editable.
   */
  html: string;
  /**
   * Variant CSS (panel, question, option rows, letter chips). Colors via :root vars only.
   * MUST style .quiz-correct (accent treatment) and .quiz-dim (faded) for the reveal.
   */
  css: string;
  /** Whether the design includes a .quiz-accent element. */
  hasAccent: boolean;
}

export interface QuizMeta {
  name: string;
  description: string;
  /** SPX UI color label, "1".."7". */
  uicolor: string;
}

/** The six fixed quiz fields — every variant emits exactly these. */
const QUIZ_FIELDS: SpxField[] = [
  { field: 'f0', ftype: 'textfield', title: 'Question', value: 'Which planet is known as the Red Planet?' },
  { field: 'f1', ftype: 'textfield', title: 'Answer A', value: 'Venus' },
  { field: 'f2', ftype: 'textfield', title: 'Answer B', value: 'Mars' },
  { field: 'f3', ftype: 'textfield', title: 'Answer C', value: 'Pluto' },
  { field: 'f4', ftype: 'textfield', title: 'Answer D', value: 'Titan' },
  {
    field: 'f5',
    ftype: 'dropdown',
    title: 'Correct answer',
    value: 'B',
    items: [
      { text: 'A', value: 'A' },
      { text: 'B', value: 'B' },
      { text: 'C', value: 'C' },
      { text: 'D', value: 'D' },
    ],
  },
];

/**
 * How long the reveal takes: the winning row's spring pop. It is BOTH the tween's length in
 * revealAnswer() and the Reveal step's authored duration, so the step on the timeline is as
 * long as the motion it fires. Speed-relative, like every other time in the data model —
 * playback divides by the speed knob (revealAnswer reads the same knob via motionSpeed()).
 */
const REVEAL_SECONDS = 0.45;

/**
 * The Continue reveal as a real STEP (Timeline v2), inserted just before Out.
 *
 * The reveal is a lifecycle CALL, not layer motion (see the file header), so the legacy region
 * has no shape for it and the importer builds nothing here. Authoring it as data is what makes
 * SPX's `steps: '2'` DERIVED — In + Reveal + Out is three steps, and the timeline computes the
 * Continue count as steps − 1. Without it the data would say one step and the first timeline
 * edit would rewrite `steps` to '1', after which SPX stops sending Continue and the reveal never
 * fires. The step is otherwise ordinary: it can be renamed, retimed, and keyframed (dim the
 * panel as the answer lands), and preset applies never touch it — they only write the first and
 * last steps.
 */
function withRevealStep(ease: string) {
  return (data: AnimData): AnimData => {
    const reveal: AnimStep = {
      name: 'Reveal',
      duration: REVEAL_SECONDS,
      ease,
      calls: [{ time: 0, call: 'revealAnswer' }],
      layers: {},
    };
    const steps = [...data.steps];
    steps.splice(steps.length - 1, 0, reveal); // before the Out step
    return { ...data, steps };
  };
}

/** The quiz runtime: the standard scaffold plus the Continue-driven answer reveal. */
function quizRuntimeJs(name: string, animationBlock: string): string {
  return `// ${name} — generated by NoaCG Studio. SPX calls update(), play(), stop(), next().

// motionSpeed(): the template's speed knob. The NOACG_ANIM data block owns it; a legacy
// animSpeed variable is honored too, and hand-written animation code defaults to 1.
function motionSpeed() {
  if (typeof NOACG_ANIM !== 'undefined' && NOACG_ANIM.speed) return NOACG_ANIM.speed;
  if (typeof animSpeed !== 'undefined' && animSpeed) return animSpeed;
  return 1;
}

${setFieldValueJs}

// clearReveal(): remove a previous reveal so the graphic is back to the neutral state
// (fresh data, replay, or a second question all start un-revealed).
function clearReveal() {
  var options = document.querySelectorAll('.quiz-option');
  for (var i = 0; i < options.length; i++) {
    options[i].classList.remove('quiz-correct');
    options[i].classList.remove('quiz-dim');
  }
}

// update(data): SPX sends field values as JSON, e.g. {"f0":"…","f1":"Venus","f5":"B"}.
// Each value is written into the element whose id matches the field name (f0 -> id="f0");
// the correct letter (f5) lands in a hidden element that next() reads later.
function update(data) {
  var fields = (typeof data === 'string') ? JSON.parse(data) : data;
  for (var key in fields) {
    var el = document.getElementById(key);
    if (el) setFieldValue(el, fields[key]);
  }
  clearReveal();                   // new data means a new, not-yet-revealed question
}

// revealAnswer(): the money moment — read the correct letter from the hidden #f5,
// light that option up ('quiz-correct'), fade the other three ('quiz-dim'), and give the
// winner a small spring pop.
function revealAnswer() {
  var letter = document.getElementById('f5').textContent.trim().toUpperCase();
  var index = 'ABCD'.indexOf(letter);        // A -> row 0, B -> row 1, …
  var options = document.querySelectorAll('.quiz-option');
  if (index === -1 || !options[index]) return;  // unknown letter — do nothing
  clearReveal();                   // a second Continue press stays clean
  for (var i = 0; i < options.length; i++) {
    options[i].classList.add(i === index ? 'quiz-correct' : 'quiz-dim');
  }
  // Pop the correct row: enter slightly enlarged, spring back to rest.
  gsap.fromTo(options[index],
    { scale: 1.06 },
    { scale: 1, duration: ${REVEAL_SECONDS} / motionSpeed(), ease: 'back.out(2)' }
  );
}

// play(): take the quiz on air — start un-revealed, run the entrance timeline.
function play() {
  gsap.killTweensOf('*');          // stop any animation that is still running
  clearReveal();                   // replays always start with the answer hidden
  buildInTimeline();
}

// stop(): take the quiz off air — run the exit timeline.
function stop() {
  gsap.killTweensOf('*');
  buildOutTimeline();
}

// next(): SPX Continue — play the graphic's next step. Step 2 is the answer reveal: the
// animation data below fires revealAnswer() on it (see that step's "calls").
function next() {
  if (typeof revealNextStep === 'function') revealNextStep();
}

${animationBlock}
`;
}

/** Build the complete quiz SpxTemplate. */
export function assembleQuiz(meta: QuizMeta, design: QuizDesign, o: ResolvedOptions): SpxTemplate {
  const font = resolveHeadingFont(o); // imported font wins over the bundled set
  const scale = computeScale(o);
  // A question plus four answer rows reads best a bit wider than a single strap.
  const maxTextWidth = Math.round(o.resolution.width * 0.48);

  // steps '2': phase 1 = question + options in, phase 2 (Continue) = answer reveal.
  const settings = baseSettings(meta, o, { steps: '2' });

  const html = documentHtml({
    title: meta.name,
    definitionBlock: definitionScriptBlock(settings, QUIZ_FIELDS),
    body: `  <!-- Quiz root — the question, four answer rows, and the hidden correct letter. -->
  <div class="quiz">
${design.html}
    <!-- Hidden correct-answer source — SPX writes field f5 here; next() reads it. -->
    <div id="f5" style="display: none">B</div>
  </div>`,
  });

  const css = `/* ${meta.name} — generated by NoaCG Studio. Edit freely: this file is yours. */

${rootVarsCss(o, font.stack, scale)}

${font.face}

${resetCanvasCss(o.resolution)}

/* ── Root position (anchor zone) ── */
.quiz {
  position: absolute;
${zoneCssText(o.zone, o.nudge, o.resolution)}
  opacity: 0;                      /* hidden until play() runs the entrance */
}

/* ── Auto-fit: the panel hugs its content and wraps instead of overflowing. ── */
.quiz-box {
  width: fit-content;              /* the panel hugs the question and answers */
  max-width: ${maxTextWidthCss(o.resolution, maxTextWidth)};  /* the wrap cap — follows --scale, stops at the safe area */
  will-change: transform, opacity; /* hint the browser: this element animates */
}
.quiz-mask {
  overflow: hidden;                /* the question animates in from behind this mask */
}
.quiz-mask > span {
  display: inline-block;           /* so the question can move inside its mask */
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped rows get even lengths */
}
.quiz-option {
  will-change: transform, opacity; /* the rows stagger in and pop on reveal */
}

/* ── Design ── */
${design.css}
`;

  const preset = quizPresetById(o.animation.presetId);
  // 'auto' uses the preset's hand-tuned ease pair; a named easing preset overrides both phases.
  const ease = resolveEasing(o.animation.easing, preset.autoEase);
  const cfg: PresetConfig = {
    prefix: 'quiz',
    lineCount: 5, // f0 question · f1–f4 answers (f5 is the hidden correct letter)
    hasAccent: design.hasAccent,
    steps: false, // no » press reveals a line here — the one Continue is the answer reveal step
    speed: o.animation.speed,
    easeIn: ease.easeIn,
    easeOut: ease.easeOut,
  };

  const js = quizRuntimeJs(meta.name, preset.emit(cfg));

  const template: SpxTemplate = {
    name: meta.name,
    type: 'quiz',
    resolution: o.resolution,
    fps: o.fps,
    html,
    css,
    js,
    fields: QUIZ_FIELDS,
    settings,
    assets: [...o.importedImages, ...(o.customFont ? [o.customFont.asset] : [])],
    layers: QUIZ_FIELDS.filter((f) => f.ftype === 'textfield').map((f) => ({
      id: f.field,
      type: 'text' as const,
      label: f.title,
      fieldId: f.field,
      text: f.value,
      styles: {},
    })),
  };

  // Timeline v2: the preset's region becomes the NOACG_ANIM data block, and the operator's
  // Continue becomes a real middle step (the answer reveal) on top of it.
  return convertToDataRegion(template, withRevealStep(ease.easeIn));
}

/** The authoring API for quiz variant modules. */
export function defineQuizVariant(
  spec: Omit<TemplateVariant, 'create'>,
  meta: QuizMeta,
  buildDesign: (o: ResolvedOptions) => QuizDesign,
): TemplateVariant {
  const variant: TemplateVariant = {
    ...spec,
    create(options?: WizardOptions) {
      const o = resolveOptions(variant, options);
      return assembleQuiz(meta, buildDesign(o), o);
    },
  };
  return variant;
}
