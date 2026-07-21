// qz04 "Clean Quiz" — the MINIMAL quiz card, sibling of lt01 "Hairline" / card01 "Hairline
// Card". A restrained near-black panel with the question in confident display type over a dim
// keyline, then four answer rows separated by thin hairlines, each led by a small accent
// letter with a thin keyline ring. Whitespace does the work; the reveal is the one loud moment
// — the correct row's ring fills accent while the others fade.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineQuizVariant } from './shared';

export const qz04: TemplateVariant = defineQuizVariant(
  {
    id: 'qz04',
    category: 'quiz',
    name: 'Clean Quiz',
    styleTag: 'minimal',
    description: 'A quiet quiz card: a question over a keyline, four hairline-separated answer rows.',
    maxLines: 1,
    suggestedLines: [{ title: 'Question', sample: 'Which planet is known as the Red Planet?' }],
    logo: 'none',
    animationPresets: ['quiz-reveal'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Clean Quiz',
    description:
      'The minimal quiz card, sibling of lt01 Hairline and card01 Hairline Card: one restrained ' +
      'near-black panel with the question over a dim keyline and four answer rows split by thin ' +
      'hairlines, each led by a small accent letter in a keyline ring. On Continue the correct ' +
      'row fills accent while the others fade.',
    uicolor: '1',
  },
  (o) => ({
    // Structure: the quiet card (.quiz-box) holds the masked question, a keyline, and the four
    // rows. Each row carries quiz-option (shared look) and quiz-option-N (its entrance identity).
    html: `    <!-- Clean Quiz: quiet card — question, keyline, four hairline-separated answer rows. -->
    <div class="quiz-box">
      <!-- The question — slides up from behind this overflow mask on entrance. -->
      <div class="quiz-mask"><span id="f0">${o.lines[0]?.sample || 'Which planet is known as the Red Planet?'}</span></div>
      <!-- The keyline — a dim rule closing the question block. -->
      <div class="quiz-rule"></div>
      <!-- The answers: a small accent letter + text. Continue marks one row quiz-correct, the rest quiz-dim. -->
      <div class="quiz-options">
        <div class="quiz-option quiz-option-1"><span class="quiz-letter">A</span><span class="quiz-text" id="f1">Venus</span></div>
        <div class="quiz-option quiz-option-2"><span class="quiz-letter">B</span><span class="quiz-text" id="f2">Mars</span></div>
        <div class="quiz-option quiz-option-3"><span class="quiz-letter">C</span><span class="quiz-text" id="f3">Pluto</span></div>
        <div class="quiz-option quiz-option-4"><span class="quiz-letter">D</span><span class="quiz-text" id="f4">Titan</span></div>
      </div>
    </div>`,
    css: `/* The card — restrained and near-black, the minimal family's quiet slab. */
.quiz-box {
  padding: calc(30px * var(--scale)) calc(40px * var(--scale));  /* generous card air */
  background: var(--panel-bg);     /* the palette's near-black panel — retints via the :root contract */
  border-radius: var(--panel-radius);  /* the family's near-square radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the authored edge and family lift */
}

/* The question — confident display type, the loudest thing on the card. */
.quiz-mask > span {
  font-size: calc(36px * var(--scale) * var(--type-scale));  /* headline scale for a multi-row card */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* The keyline — a thin dim rule under the question. */
.quiz-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin: calc(20px * var(--scale)) 0;  /* air above and below the rule */
  background: rgba(255, 255, 255, 0.16);  /* dim, not accent — the color stays in the letters */
}

/* The answer stack — four rows separated by thin hairlines. */
.quiz-options {
  display: flex;                   /* a simple vertical stack… */
  flex-direction: column;          /* …one row per answer */
}

/* One answer row — no chip, just the letter, the text, and a hairline below. */
.quiz-option {
  position: relative;              /* anchors the row's hairline (::before) */
  display: flex;                   /* letter + answer text side by side */
  align-items: center;             /* text centers on the letter's height */
  gap: calc(18px * var(--scale));  /* air between the letter and the text */
  height: calc(52px * var(--scale));  /* uniform row height */
}

/* Thin dim separators between rows (not below the last). */
.quiz-option:not(:last-child)::before {
  content: '';                     /* painted layer — safe from every preset tween */
  position: absolute;              /* pinned to the row's bottom edge */
  left: 0;                         /* full width… */
  right: 0;                        /* …edge to edge */
  bottom: 0;                       /* at the very bottom of the row */
  height: 1px;                     /* a true keyline */
  background: rgba(255, 255, 255, 0.10);  /* a quiet hairline between rows */
}

/* The letter — a small accent glyph in a thin keyline ring. */
.quiz-letter {
  flex-shrink: 0;                  /* the ring never squeezes; text takes the rest */
  width: calc(38px * var(--scale));   /* a small round-ish ring… */
  height: calc(38px * var(--scale));  /* …a square ring */
  display: flex;                   /* centers the letter… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
  border-radius: calc(4px * var(--scale));  /* the family's near-square radius */
  box-shadow: inset 0 0 0 calc(2px * var(--scale)) var(--accent);  /* a thin accent keyline ring */
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* the letter — a marker, not a headline */
  font-weight: 700;                /* bold keeps the small glyph legible */
  color: var(--accent);            /* the letter wears the accent */
}

/* The answer text — clearly under the question. */
.quiz-text {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* list scale — subordinate to the question */
  font-weight: 400;                /* regular — the minimal family is quiet */
  line-height: 1.2;                /* leading if a long answer wraps */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken answers */
}

/* ── The reveal (SPX Continue) ── */

/* Correct — the letter's ring fills accent and the answer steps up; the row is the winner. */
.quiz-correct .quiz-letter {
  background: var(--accent);       /* the ring fills */
  color: var(--accent-ink);        /* dark ink on the filled letter */
}
.quiz-correct .quiz-text {
  color: var(--accent);            /* the winning answer wears the accent */
  font-weight: 600;                /* and steps up a weight */
}

/* Dim — fade the wrong rows' contents (the entrance tween leaves an inline opacity on
   .quiz-option that would override a plain .quiz-dim opacity rule). */
.quiz-dim .quiz-letter,
.quiz-dim .quiz-text {
  opacity: 0.35;                   /* wrong answers drop back, still readable */
}

/* ── The selection arc (the state machine's events) ── */

/* Selected — the contestant's pick, before the reveal: the letter's ring goes solid-thick. */
.quiz-sel .quiz-letter {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) var(--accent);
}

/* Locked — the unpicked rows step back so the chosen row is the standing answer. */
.quiz-locked .quiz-option:not(.quiz-sel) .quiz-letter,
.quiz-locked .quiz-option:not(.quiz-sel) .quiz-text {
  opacity: 0.55;                   /* quieter than a dim — the question is still live */
}

/* Wrong — the pick that lost, in the family's semantic down-colour (never a second accent). */
.quiz-wrong .quiz-letter {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) #e57a7d;
  color: #e57a7d;                  /* the losing letter carries the down-colour */
}`,
    hasAccent: false, // the accent moments are the letter rings and the reveal, not a .quiz-accent element
  }),
);
