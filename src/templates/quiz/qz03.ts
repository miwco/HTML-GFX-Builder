// qz03 "Frost Quiz" — the GLASS quiz card, sibling of lt08 "Frosted Card" / card09 "Frost
// Title". A translucent frosted panel with the question in the family's heavier weight and
// four answer rows, each a softly-rounded glass chip led by an accent letter block. On
// Continue the correct row floods accent while the others fade; a pick shows as an accent ring,
// a wrong pick takes the family's down-colour.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineQuizVariant } from './shared';

export const qz03: TemplateVariant = defineQuizVariant(
  {
    id: 'qz03',
    category: 'quiz',
    name: 'Frost Quiz',
    styleTag: 'glass',
    description: 'A frosted quiz card with softly-rounded answer chips led by accent letter blocks.',
    maxLines: 1,
    suggestedLines: [{ title: 'Question', sample: 'Which planet is known as the Red Planet?' }],
    logo: 'none',
    animationPresets: ['quiz-reveal'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Quiz',
    description:
      'The glass quiz card, sibling of lt08 Frosted Card and card09 Frost Title: a translucent ' +
      'frosted panel with the question above four answer rows, each a softly-rounded glass chip ' +
      'led by an accent letter block. On Continue the correct row floods accent while the ' +
      'others fade.',
    uicolor: '3',
  },
  (o) => ({
    // Structure: the frosted card (.quiz-box) holds the masked question and the four rows. Each
    // row carries quiz-option (shared look) and quiz-option-N (its staggered-entrance identity).
    html: `    <!-- Frost Quiz: frosted card — question on top, four glass answer rows below. -->
    <div class="quiz-box">
      <!-- The question — slides up from behind this overflow mask on entrance. -->
      <div class="quiz-mask"><span id="f0">${o.lines[0]?.sample || 'Which planet is known as the Red Planet?'}</span></div>
      <!-- The answers: accent letter block + text. Continue marks one row quiz-correct, the rest quiz-dim. -->
      <div class="quiz-options">
        <div class="quiz-option quiz-option-1"><span class="quiz-letter">A</span><span class="quiz-text" id="f1">Venus</span></div>
        <div class="quiz-option quiz-option-2"><span class="quiz-letter">B</span><span class="quiz-text" id="f2">Mars</span></div>
        <div class="quiz-option quiz-option-3"><span class="quiz-letter">C</span><span class="quiz-text" id="f3">Pluto</span></div>
        <div class="quiz-option quiz-option-4"><span class="quiz-letter">D</span><span class="quiz-text" id="f4">Titan</span></div>
      </div>
    </div>`,
    css: `/* The card — the frosted glass panel; presets tween this element (y + opacity). */
.quiz-box {
  padding: calc(30px * var(--scale)) calc(40px * var(--scale));  /* generous card air */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* The question — the family's heavier weight, the loudest thing on the card. */
.quiz-mask > span {
  font-size: calc(36px * var(--scale) * var(--type-scale));  /* headline scale for a multi-row card */
  font-weight: var(--display-weight);  /* the glass families run heavier weights */
  line-height: 1.15;               /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* The answer stack — four uniform rows under the question. */
.quiz-options {
  margin-top: calc(24px * var(--scale));  /* clear break between question and answers */
  display: flex;                   /* a simple vertical stack… */
  flex-direction: column;          /* …one row per answer */
  gap: calc(12px * var(--scale));  /* even air between the rows */
}

/* One answer row — a softly-rounded glass chip; the reveal repaints it through .quiz-correct. */
.quiz-option {
  position: relative;              /* anchors the painted row chip (::before) */
  display: flex;                   /* letter block + answer text side by side */
  align-items: center;             /* text centers on the letter block's height */
  height: calc(48px * var(--scale));  /* uniform row height */
}

/* The row chip — a second layer of glass with a soft keyline. */
.quiz-option::before {
  content: '';                     /* painted layer — safe from every preset tween */
  position: absolute;              /* fills the row exactly… */
  inset: 0;                        /* …edge to edge */
  z-index: -1;                     /* behind the letter block and the text */
  background: rgba(255, 255, 255, 0.08);  /* a faint layer of glass */
  border-radius: calc(12px * var(--scale));  /* a softly-rounded glass chip */
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);  /* a soft keyline */
}

/* The letter block — a rounded accent block leading each row, dark ink on the accent. */
.quiz-letter {
  flex-shrink: 0;                  /* the block never squeezes; text takes the rest */
  width: calc(46px * var(--scale));   /* a chunky block… */
  height: 100%;                    /* …filling the row's full height */
  display: flex;                   /* centers the letter… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
  margin-right: calc(16px * var(--scale));  /* air between the block and the answer text */
  border-radius: calc(12px * var(--scale)) 0 0 calc(12px * var(--scale));  /* rounds the row's leading corner */
  background: var(--accent);       /* the accent block */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the letter — loud but under the answers */
  font-weight: 800;                /* block letters hit hard */
  color: var(--accent-ink);        /* the family's ink on an accent-filled block */
}

/* The answer text — clearly under the question. */
.quiz-text {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* list scale — subordinate to the question */
  font-weight: 500;                /* readable at a glance */
  line-height: 1.2;                /* leading if a long answer wraps */
  color: var(--text-color);        /* primary text color */
  padding-right: calc(18px * var(--scale));  /* text never touches the chip's right edge */
  overflow-wrap: break-word;       /* break very long unbroken answers */
}

/* ── The reveal (SPX Continue) ── */

/* Correct — the row's chip floods accent, the money moment. */
.quiz-correct::before {
  background: var(--accent);       /* the faint chip becomes the loud accent slab */
  box-shadow: none;                /* the flood replaces the keyline */
}
.quiz-correct .quiz-text {
  color: var(--accent-ink);        /* dark ink on the flooded chip */
  font-weight: 700;                /* the winner steps up a weight */
}
.quiz-correct .quiz-letter {
  background: rgba(255, 255, 255, 0.9);  /* the block inverts — a pale leading edge on the accent row */
  color: var(--accent);            /* accent letter on the pale block */
}

/* Dim — fade the wrong rows' LAYERS, not the row (the entrance tween leaves an inline
   opacity on .quiz-option that would override a plain .quiz-dim opacity rule). */
.quiz-dim::before,
.quiz-dim .quiz-letter,
.quiz-dim .quiz-text {
  opacity: 0.35;                   /* wrong answers drop back, still readable */
}

/* ── The selection arc (the state machine's events) ── */

/* Selected — the contestant's pick, before the reveal. An accent keyline ring only. */
.quiz-sel::before {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) var(--accent);
}

/* Locked — the unpicked rows step back so the chosen row is the standing answer. */
.quiz-locked .quiz-option:not(.quiz-sel) .quiz-letter,
.quiz-locked .quiz-option:not(.quiz-sel) .quiz-text {
  opacity: 0.55;                   /* quieter than a dim — the question is still live */
}

/* Wrong — the pick that lost, in the family's semantic down-colour (never a second accent). */
.quiz-wrong::before {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) #e57a7d;
}
.quiz-wrong .quiz-letter {
  background: #e57a7d;             /* the losing row's leading edge carries the colour */
  color: #ffffff;                  /* pale ink on the down-colour block */
}`,
    hasAccent: false, // the accent moments are the letter blocks and the reveal, not a .quiz-accent element
  }),
);
