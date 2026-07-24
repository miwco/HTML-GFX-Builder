// Quiz scaffolding. Quiz graphics carry FIXED data fields (they never come from o.lines —
// the wizard's line editor doesn't apply here), sized by the board's OPTION COUNT n:
//   f0 "Question" · f1…fn "Answer A".."Answer <n-th letter>" ·
//   f(n+1) "Correct answer" (dropdown over the board's own letters) ·
//   f(n+2) "Selected answer" (the same letters, plus the un-picked "—")
//
// n is 2, 3 or 4 — a true/false board, a three-way, and the classic four-answer board are the
// SAME graphic with a different number of rows, so they share this one assembler rather than
// forking it. Everything below that could have hard-coded four (the letter alphabet, the two
// hidden field ids, the preset's row list) is derived from n instead, and n = 4 derives exactly
// the strings the four-answer board always emitted — the existing designs are byte-identical.
//
// Structure contract (shown at n = 4):
//   <div class="quiz">                 root — zone positioned; opacity:0 until play()
//     <div class="quiz-box">           the panel; presets tween this
//       <div class="quiz-mask"><span id="f0">…</span></div>      the question (mask-up reveal)
//       <div class="quiz-options">                               the n answer rows
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
  dataSourceCss,
  documentHtml,
  maxTextWidthCss,
  resetCanvasCss,
  resolveHeadingFont,
  rootVarsCss,
  setFieldValueJs,
  zoneCssText,
} from '../shared/base';
import { composeRefine, convertToDataRegion } from '../shared/standard';
import type { AnimData, AnimStep } from '../../blocks/animData';
import type { PresetConfig } from '../lowerThirds/animPresets';
import { quizPresetById } from './quizPresets';
import { resolveTokens, type ThemeTokens, type TokenOverrides } from '../../model/themeTokens';

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
  /**
   * Where this design disagrees with its style family's shape tokens
   * (model/themeTokens.ts). Every entry is conformance debt - DESIGN_LANGUAGE §8's rule is
   * "reuse the exact token values, don't improvise new ones per category".
   */
  tokens?: TokenOverrides;
}

export interface QuizMeta {
  name: string;
  description: string;
  /** SPX UI color label, "1".."7". */
  uicolor: string;
}

/** The answer alphabet, in row order. A board of n options uses the first n letters. */
export const QUIZ_LETTERS = 'ABCD';

/** The most rows this assembler will lay out — the alphabet above is the hard limit. */
export const MAX_QUIZ_OPTIONS = QUIZ_LETTERS.length;

/**
 * A board's starting content. The answers array's LENGTH is the board's option count, so the
 * field list, the letter chips, the two dropdowns' items and the preset's row list all follow
 * from one declaration and can never disagree with each other.
 */
export interface QuizContent {
  question: string;
  /** One per answer row, in order. 2, 3 or 4 of them. */
  answers: string[];
  /** Which letter is right, in this board's own alphabet. */
  correct: string;
}

/** The four-answer board's original content — the default, so existing variants are unchanged. */
const FOUR_ANSWER: QuizContent = {
  question: 'Which planet is known as the Red Planet?',
  answers: ['Venus', 'Mars', 'Pluto', 'Titan'],
  correct: 'B',
};

/**
 * The TWO-answer board's content: true/false, this-or-that, an A/B call.
 *
 * The rows still carry letter chips rather than nothing, because A and B are the board's
 * ADDRESSES — they are what the operator's "Selected answer" dropdown offers and what the
 * control page's buttons send. A board whose chips said nothing would leave the panel talking
 * about a row the viewer cannot name.
 *
 * Exported because a design has to render the same starting text the field defaults carry:
 * the markup shows `content.answers[i]` and SPX's definition ships the same string, so the
 * two can never drift into showing different things before the first update().
 */
export const TWO_ANSWER_CONTENT: QuizContent = {
  question: 'The human body has 206 bones.',
  answers: ['True', 'False'],
  correct: 'A',
};

/** The THREE-answer board's content. */
export const THREE_ANSWER_CONTENT: QuizContent = {
  question: 'Which ocean is the largest?',
  answers: ['Atlantic', 'Pacific', 'Indian'],
  correct: 'B',
};

/** This board's letters: 'AB' for a true/false board, 'ABC', 'ABCD'. */
function lettersFor(content: QuizContent): string {
  return QUIZ_LETTERS.slice(0, content.answers.length);
}

/** The fixed quiz fields for a board of n answers — every variant emits exactly these. */
function quizFields(content: QuizContent): SpxField[] {
  const letters = lettersFor(content);
  const letterItems = [...letters].map((letter) => ({ text: letter, value: letter }));
  return [
    { field: 'f0', ftype: 'textfield', title: 'Question', value: content.question },
    ...content.answers.map((answer, i): SpxField => ({
      field: `f${i + 1}`,
      ftype: 'textfield',
      title: `Answer ${letters[i]}`,
      value: answer,
    })),
    {
      field: `f${letters.length + 1}`,
      ftype: 'dropdown',
      title: 'Correct answer',
      value: content.correct,
      items: letterItems,
    },
    // The contestant's pick. This is DATA, not state: one "Selected" state plus this value is
    // what keeps a four-answer quiz at a handful of states instead of one per answer.
    {
      field: `f${letters.length + 2}`,
      ftype: 'dropdown',
      title: 'Selected answer',
      value: '',
      items: [{ text: '—', value: '' }, ...letterItems],
    },
  ];
}

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

/** How the row count reads in a generated comment. */
const ROW_WORDS: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four' };

/**
 * A board's markup must carry exactly one `quiz-option-N` row per answer.
 *
 * The row count is the one thing the assembler cannot derive from the design — it is drawn by
 * hand — and getting it wrong is silent in every mechanical check: a missing row means an answer
 * field that writes into nothing, and a spare row means a permanently blank chip that the reveal
 * can still dim. Throwing here is the same posture as `attachMachine`: this is our own code
 * compiled by our own code, so a mismatch is a bug to fail the build on, not to ship.
 */
function assertRowsMatchAnswers(name: string, html: string, optionCount: number): void {
  const rows = new Set(Array.from(html.matchAll(/\bquiz-option-(\d+)\b/g), (m) => Number(m[1])));
  const expected = Array.from({ length: optionCount }, (_, i) => i + 1);
  const missing = expected.filter((n) => !rows.has(n));
  const extra = [...rows].filter((n) => n > optionCount).sort((a, b) => a - b);
  if (missing.length === 0 && extra.length === 0) return;
  throw new Error(
    `Quiz "${name}": the design draws ${rows.size} answer row(s) for a ${optionCount}-answer board` +
      `${missing.length ? ` — missing quiz-option-${missing.join(', quiz-option-')}` : ''}` +
      `${extra.length ? ` — unexpected quiz-option-${extra.join(', quiz-option-')}` : ''}.`,
  );
}

/** The ids of the two hidden dropdown sources on a board of n answers. */
function hiddenIds(content: QuizContent): { correct: string; selected: string } {
  const n = content.answers.length;
  return { correct: `f${n + 1}`, selected: `f${n + 2}` };
}

/** The quiz runtime: the standard scaffold plus the Continue-driven answer reveal. */
function quizRuntimeJs(name: string, animationBlock: string, content: QuizContent): string {
  const letters = lettersFor(content);
  const id = hiddenIds(content);
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
// (fresh data, replay, or a second question all start un-revealed). It clears the SELECTION
// and the lock too: a visual reset that left a board looking judged would be a lie, and snap
// clears inline styles but never classes.
function clearReveal() {
  var options = document.querySelectorAll('.quiz-option');
  for (var i = 0; i < options.length; i++) {
    options[i].classList.remove('quiz-correct');
    options[i].classList.remove('quiz-dim');
    options[i].classList.remove('quiz-sel');
    options[i].classList.remove('quiz-wrong');
  }
  var root = document.querySelector('.quiz');
  if (root) root.classList.remove('quiz-locked');
}

// quizRow(letter): the option row a letter names, or null. A -> row 0, B -> row 1, …
function quizRow(letter) {
  var index = '${letters}'.indexOf(String(letter || '').trim().toUpperCase());
  var options = document.querySelectorAll('.quiz-option');
  return index === -1 ? null : (options[index] || null);
}

// applySelection(): mark the contestant's pick, read from the hidden #${id.selected}. One state and this
// value carry every answer — there is deliberately no state per option.
function applySelection() {
  var options = document.querySelectorAll('.quiz-option');
  for (var i = 0; i < options.length; i++) options[i].classList.remove('quiz-sel');
  var row = quizRow(document.getElementById('${id.selected}').textContent);
  if (!row) return;                // nothing picked yet, or an unknown letter
  row.classList.add('quiz-sel');
  gsap.fromTo(row, { scale: 1.04 }, { scale: 1, duration: 0.25 / motionSpeed(), ease: 'back.out(1.6)' });
}

// applyLock(): the answer is locked in. The dimming says so; the MACHINE is what actually
// makes it final, by simply having no "select" arrow leaving this state.
function applyLock() {
  var root = document.querySelector('.quiz');
  if (root) root.classList.add('quiz-locked');
}

// update(data): SPX sends field values as JSON, e.g. {"f0":"…","f1":"${content.answers[0]}","${id.correct}":"${content.correct}"}.
// Each value is written into the element whose id matches the field name (f0 -> id="f0");
// the correct letter (${id.correct}) lands in a hidden element that next() reads later.
function update(data) {
  var fields = (typeof data === 'string') ? JSON.parse(data) : data;
  for (var key in fields) {
    var el = document.getElementById(key);
    if (el) setFieldValue(el, fields[key]);
  }
  clearReveal();                   // new data means a new, not-yet-revealed question
}

// revealAnswer(): the money moment — read the correct letter from the hidden #${id.correct},
// light that option up ('quiz-correct'), fade the ${content.answers.length === 2 ? 'other one' : content.answers.length === 3 ? 'other two' : 'other three'} ('quiz-dim'), and give the
// winner a small spring pop.
function revealAnswer() {
  var letter = document.getElementById('${id.correct}').textContent.trim().toUpperCase();
  var index = '${letters}'.indexOf(letter);        // A -> row 0, B -> row 1, …
  var options = document.querySelectorAll('.quiz-option');
  if (index === -1 || !options[index]) return;  // unknown letter — do nothing
  var picked = document.getElementById('${id.selected}');
  var pickedLetter = picked ? picked.textContent.trim().toUpperCase() : '';
  clearReveal();                   // a second Continue press stays clean
  for (var i = 0; i < options.length; i++) {
    options[i].classList.add(i === index ? 'quiz-correct' : 'quiz-dim');
  }
  // Pop the correct row: enter slightly enlarged, spring back to rest.
  gsap.fromTo(options[index],
    { scale: 1.06 },
    { scale: 1, duration: ${REVEAL_SECONDS} / motionSpeed(), ease: 'back.out(2)' }
  );
  // A WRONG pick gets its own treatment — the criterion asks for the selected and the correct
  // answer to be told apart, not just for the right one to light up.
  if (pickedLetter && pickedLetter !== letter) {
    var wrong = quizRow(pickedLetter);
    if (wrong) {
      wrong.classList.remove('quiz-dim');
      wrong.classList.add('quiz-wrong');
      gsap.fromTo(wrong, { x: -6 }, { x: 0, duration: 0.4 / motionSpeed(), ease: 'elastic.out(1, 0.4)' });
    }
  }
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
  return (typeof revealNextStep === 'function') ? revealNextStep() : null;
}

${animationBlock}
`;
}

/** Build the complete quiz SpxTemplate. */
export function assembleQuiz(
  meta: QuizMeta,
  design: QuizDesign,
  o: ResolvedOptions,
  /** Refine the converted animation data — the seam a graphic TYPE injects its machine
   *  through (see shared/standard.ts composeRefine for the ordering rule). */
  refine?: (data: AnimData) => AnimData,
  /** The design's resolved SHAPE tokens (model/themeTokens.ts). Resolved by the caller,
   *  because the family lives on the VARIANT (styleTag) and this function only sees the
   *  design. Absent = emit no token lines, which is what every template did before they
   *  existed. */
  tokens?: ThemeTokens,
  /** The board's starting content — and, through its answer count, how many rows it has.
   *  Absent = the original four-answer board. */
  content: QuizContent = FOUR_ANSWER,
): SpxTemplate {
  const font = resolveHeadingFont(o); // imported font wins over the bundled set
  const scale = computeScale(o);
  // A question plus four answer rows reads best a bit wider than a single strap.
  const maxTextWidth = Math.round(o.resolution.width * 0.48);
  const optionCount = content.answers.length;
  const fields = quizFields(content);
  const id = hiddenIds(content);
  assertRowsMatchAnswers(meta.name, design.html, optionCount);

  // steps '2': phase 1 = question + options in, phase 2 (Continue) = answer reveal.
  const settings = baseSettings(meta, o, { steps: '2' });

  const html = documentHtml({
    title: meta.name,
    definitionBlock: definitionScriptBlock(settings, fields),
    body: `  <!-- Quiz root — the question, ${ROW_WORDS[optionCount]} answer rows, and the hidden correct letter. -->
  <div class="quiz">
${design.html}
    <!-- Hidden correct-answer source — SPX writes field ${id.correct} here; the reveal reads it. -->
    <div id="${id.correct}" class="noacg-data-source">${content.correct}</div>
    <!-- Hidden selected-answer source — the contestant's pick (field ${id.selected}). It is DATA: one
         "selected" state plus this letter, never one state per answer. -->
    <div id="${id.selected}" class="noacg-data-source"></div>
  </div>`,
  });

  const css = `/* ${meta.name} — generated by NoaCG Studio. Edit freely: this file is yours. */

${rootVarsCss(o, font.stack, scale, { tokens, consumerCss: design.css })}

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

${dataSourceCss}
`;

  const preset = quizPresetById(o.animation.presetId);
  // 'auto' uses the preset's hand-tuned ease pair; a named easing preset overrides both phases.
  const ease = resolveEasing(o.animation.easing, preset.autoEase);
  const cfg: PresetConfig = {
    // f0 question + one per answer. The preset reads the ROW COUNT back off this (lineCount − 1),
    // which is how a two-answer board's entrance staggers two rows instead of four.
    lineCount: optionCount + 1,
    prefix: 'quiz',
    hasAccent: design.hasAccent,
    steps: false, // no » press reveals a line here — the one Continue is the answer reveal step
    speed: o.animation.speed,
    easeIn: ease.easeIn,
    easeOut: ease.easeOut,
  };

  const js = quizRuntimeJs(meta.name, preset.emit(cfg), content);

  const template: SpxTemplate = {
    name: meta.name,
    type: 'quiz',
    resolution: o.resolution,
    fps: o.fps,
    html,
    css,
    js,
    fields,
    settings,
    assets: [...o.importedImages, ...(o.customFont ? [o.customFont.asset] : [])],
    layers: fields.filter((f) => f.ftype === 'textfield').map((f) => ({
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
  // The reveal step must be inserted BEFORE a machine compiles, because the machine derives
  // its default path from the final step list (shared/standard.ts composeRefine).
  return convertToDataRegion(template, composeRefine(withRevealStep(ease.easeIn), refine));
}

/** The authoring API for quiz variant modules. */
export function defineQuizVariant(
  spec: Omit<TemplateVariant, 'create'>,
  meta: QuizMeta,
  buildDesign: (o: ResolvedOptions) => QuizDesign,
  /** Optional animation-data refinement (a graphic type's machine rides in here). It is
   *  built per create() because a type's compiled machine depends on the resolved options. */
  refine?: (o: ResolvedOptions) => ((data: AnimData) => AnimData) | undefined,
  /** The board's content, whose answer count is its row count. Absent = the four-answer board. */
  content?: QuizContent,
): TemplateVariant {
  const variant: TemplateVariant = {
    ...spec,
    create(options?: WizardOptions) {
      const o = resolveOptions(variant, options);
      const design = buildDesign(o);
      // The family lives on the variant, the overrides on the design — resolved here
      // because this is the only place that holds both.
      const tokens = resolveTokens(spec.styleTag, design.tokens);
      return assembleQuiz(meta, design, o, refine?.(o), tokens, content);
    },
  };
  return variant;
}
