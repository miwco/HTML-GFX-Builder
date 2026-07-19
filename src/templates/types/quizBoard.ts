// QUIZ BOARD — the flagship, and the type that has to prove the model at its far end.
//
// The test it answers (docs/noacg-master-goals.md §1.4): a question and four answers; reveal
// them; select any answer; change the selection freely; LOCK it, after which selection is
// structurally illegal; reveal the correct one; show the picked and the correct answer
// differently; reset cleanly for the next question.
//
// A naive machine gets this wrong in a specific way: it makes a state per answer, then a
// state per (answer × locked), and a four-option quiz needs a dozen states that are all the
// same picture with a different row highlighted. The model's answer is that the PICK is data.
// There is one `selected` state; which answer it means is the `selectedAnswer` field, applied
// atomically as the event's payload. Adding a fifth option would not add a state.
//
// And "structurally illegal" is meant literally. Nothing evaluates a condition to reject a
// late selection — there simply is no `select` arrow leaving `locked`, so the event finds no
// transition and is dropped along with its payload. That is the entire guard.

import { paletteById } from '../../model/wizard';
import { qz01 } from '../quiz/qz01';
import type { GraphicType } from './graphicType';

export const quizBoardType: GraphicType = {
  id: 'quiz-board',
  name: 'Quiz board',
  description: 'A question, four answers, a locked-in pick, and the reveal.',
  structure: {
    prefix: 'quiz',
    category: 'quiz',
    parts: [
      { id: 'box', selector: '.quiz-box', kind: 'panel', required: true },
      { id: 'question', selector: '#f0', kind: 'line', required: true },
      { id: 'options', selector: '.quiz-options', kind: 'block', required: true },
    ],
  },
  fields: [
    { key: 'question', label: 'Question', kind: 'text', value: 'Which planet is known as the Red Planet?', role: 'line' },
    { key: 'answerA', label: 'Answer A', kind: 'text', value: 'Venus', role: 'line' },
    { key: 'answerB', label: 'Answer B', kind: 'text', value: 'Mars', role: 'line' },
    { key: 'answerC', label: 'Answer C', kind: 'text', value: 'Pluto', role: 'line' },
    { key: 'answerD', label: 'Answer D', kind: 'text', value: 'Titan', role: 'line' },
    // Both dropdowns are the sanctioned exception to the broadcast field policy: four letters
    // is a genuinely constrained choice, which is exactly what that exception is for.
    {
      key: 'correctAnswer', label: 'Correct answer', kind: 'select', value: 'B', role: 'data',
      options: [{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }, { label: 'C', value: 'C' }, { label: 'D', value: 'D' }],
    },
    {
      key: 'selectedAnswer', label: 'Selected answer', kind: 'select', value: '', role: 'data',
      options: [
        { label: '—', value: '' },
        { label: 'A', value: 'A' }, { label: 'B', value: 'B' }, { label: 'C', value: 'C' }, { label: 'D', value: 'D' },
      ],
    },
  ],
  machine: {
    main: {
      // The walk is question -> reveal -> out, so `next` alone still runs the whole thing:
      // a quiz dropped into any playout server without a control page degrades to
      // "show the question, reveal the answer, take it off" and nothing breaks.
      pathEvents: ['judge'],
      branches: [
        {
          id: 'selected',
          name: 'Answer selected',
          // Entering (or RE-entering) this state repaints the highlight from the data, which
          // is what makes "change the selection freely" a self-transition rather than a state.
          timeline: {
            name: 'Select',
            duration: 0.25,
            ease: 'in',
            calls: [{ time: 0, call: 'applySelection' }],
            layers: {},
          },
          edges: [
            { from: { waypoint: 0 }, to: 'selected', trigger: 'operator', event: 'select' },
            { from: 'selected', to: 'selected', trigger: 'operator', event: 'select' },
          ],
        },
        {
          id: 'locked',
          name: 'Locked in',
          timeline: {
            name: 'Lock',
            duration: 0.25,
            ease: 'in',
            calls: [{ time: 0, call: 'applyLock' }],
            layers: {},
          },
          edges: [
            { from: 'selected', to: 'locked', trigger: 'operator', event: 'lock' },
            // From here the ONLY way on is the reveal. No `select` arrow leaves this state,
            // which is what makes a late selection impossible rather than merely refused.
            { from: 'locked', to: { waypoint: 1 }, trigger: 'operator', event: 'judge' },
            // And the rejoin, so an operator who locked in can still just press Next.
            { from: 'locked', to: { waypoint: 1 }, trigger: 'operator', event: 'next' },
          ],
        },
      ],
    },
  },
  controls: [
    { event: 'select', label: 'Select answer', section: 'Answer', order: 1, payload: ['selectedAnswer'] },
    { event: 'lock', label: 'Lock it in', section: 'Answer', order: 2 },
    { event: 'judge', label: 'Reveal correct', section: 'Answer', order: 3 },
  ],
  capabilities: {
    maxLines: 1,
    logo: 'none',
    animationPresets: ['quiz-reveal'],
    defaultZone: 'mid-center',
  },
  designs: [
    {
      id: 'qz01',
      name: 'Arena Quiz',
      description: 'The game-show board: a leaning question slab over four lettered answer rows.',
      styleTag: 'sport',
      palette: paletteById('volt'),
      fontId: 'oswald',
      create: (_type, options) => qz01.create(options),
    },
  ],
};
