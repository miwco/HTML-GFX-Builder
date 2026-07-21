// qz02 "House Quiz" — the NoaCG quiz card, sibling of lt11 "House Strap" / card05 "House
// Title". The house void panel with an amber accent edge, the question in display type, and
// four answer rows led by amber letter blocks. No lean (the house family paints flat panels).
// On Continue, the correct row floods amber with dark ink while the other three fade; a
// contestant's pick shows as an amber keyline, and a wrong pick takes the family's down-colour.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineQuizVariant } from './shared';

export const qz02: TemplateVariant = defineQuizVariant(
  {
    id: 'qz02',
    category: 'quiz',
    name: 'House Quiz',
    styleTag: 'noacg',
    description: 'The house quiz card: a void panel, amber accent edge, four amber-lettered answer rows.',
    maxLines: 1,
    suggestedLines: [{ title: 'Question', sample: 'Which planet is known as the Red Planet?' }],
    logo: 'none',
    animationPresets: ['quiz-reveal'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Quiz',
    description:
      'The NoaCG quiz card, sibling of lt11 House Strap and card05 House Title: the house void ' +
      'panel with an amber accent edge, the question in display type above four answer rows, ' +
      'each a void chip led by a solid amber letter block. On Continue the correct row floods ' +
      'amber with dark ink while the others fade.',
    uicolor: '4',
  },
  (o) => ({
    // Structure: the card (.quiz-box) holds the accent edge, the masked question, and the four
    // rows. Each row carries quiz-option (shared look, the reveal marks the winner through it)
    // and quiz-option-N (its own animation identity, for the staggered entrance).
    html: `    <!-- House Quiz: void card — accent edge, question on top, four answer rows below. -->
    <div class="quiz-box">
      <!-- The accent edge — the house amber bar, fused to the panel's left side. -->
      <div class="quiz-accent"></div>
      <!-- The question — slides up from behind this overflow mask on entrance. -->
      <div class="quiz-mask"><span id="f0">${o.lines[0]?.sample || 'Which planet is known as the Red Planet?'}</span></div>
      <!-- The answers: amber letter block + text. Continue marks one row quiz-correct, the rest quiz-dim. -->
      <div class="quiz-options">
        <div class="quiz-option quiz-option-1"><span class="quiz-letter">A</span><span class="quiz-text" id="f1">Venus</span></div>
        <div class="quiz-option quiz-option-2"><span class="quiz-letter">B</span><span class="quiz-text" id="f2">Mars</span></div>
        <div class="quiz-option quiz-option-3"><span class="quiz-letter">C</span><span class="quiz-text" id="f3">Pluto</span></div>
        <div class="quiz-option quiz-option-4"><span class="quiz-letter">D</span><span class="quiz-text" id="f4">Titan</span></div>
      </div>
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The card — the house void panel; presets tween this element (y + opacity). */
.quiz-box {
  position: relative;              /* anchors the accent edge */
  padding: calc(30px * var(--scale)) calc(44px * var(--scale)) calc(30px * var(--scale)) calc(48px * var(--scale));
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);  /* the house strip's amber top edge */
}

/* The accent edge — the house amber bar, fused to the card's left side with the house glow. */
.quiz-accent {
  position: absolute;              /* pinned over the card's left edge */
  left: 0;                         /* flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  box-shadow: var(--accent-glow);  /* the family's glow — follows the accent color */
}

/* The question — house display type, the loudest thing on the card. */
.quiz-mask > span {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* headline scale for a multi-row card */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text on the void */
}

/* The answer stack — four uniform rows under the question. */
.quiz-options {
  margin-top: calc(24px * var(--scale));  /* clear break between question and answers */
  display: flex;                   /* a simple vertical stack… */
  flex-direction: column;          /* …one row per answer */
  gap: calc(12px * var(--scale));  /* even air between the rows */
}

/* One answer row — a faint void chip; the reveal repaints this through .quiz-correct. */
.quiz-option {
  position: relative;              /* anchors the painted row chip (::before) */
  display: flex;                   /* letter block + answer text side by side */
  align-items: center;             /* text centers on the letter block's height */
  height: calc(48px * var(--scale));  /* uniform row height */
}

/* The row chip — a faint on-palette tint behind each answer (house radius 6). */
.quiz-option::before {
  content: '';                     /* painted layer — safe from every preset tween */
  position: absolute;              /* fills the row exactly… */
  inset: 0;                        /* …edge to edge */
  z-index: -1;                     /* behind the letter block and the text */
  background: color-mix(in srgb, var(--text-color) 7%, transparent);  /* faint on-palette tint */
  border-radius: calc(6px * var(--scale));  /* the house chip radius */
}

/* The letter block — a solid amber block leading each row, dark ink on the accent. */
.quiz-letter {
  flex-shrink: 0;                  /* the block never squeezes; text takes the rest */
  width: calc(48px * var(--scale));   /* a chunky square-ish block… */
  height: 100%;                    /* …filling the row's full height */
  display: flex;                   /* centers the letter… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
  margin-right: calc(16px * var(--scale));  /* air between the block and the answer text */
  border-radius: calc(6px * var(--scale)) 0 0 calc(6px * var(--scale));  /* rounds the row's leading corner */
  background: var(--accent);       /* the accent block */
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the letter — loud but under the answers */
  font-weight: 700;                /* block letters hit hard */
  color: var(--accent-ink);        /* the family's ink on an accent-filled block */
}

/* The answer text — clearly under the question. */
.quiz-text {
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* list scale — subordinate to the question */
  font-weight: 500;                /* readable at a glance */
  line-height: 1.2;                /* leading if a long answer wraps */
  color: var(--text-color);        /* primary text on the void */
  padding-right: calc(18px * var(--scale));  /* text never touches the chip's right edge */
  overflow-wrap: break-word;       /* break very long unbroken answers */
}

/* ── The reveal (SPX Continue) ── */

/* Correct — the row's chip floods amber, the money moment. */
.quiz-correct::before {
  background: var(--accent);       /* the faint chip becomes the loud accent slab */
  box-shadow: var(--accent-glow);  /* the house glow, on the winning row */
}
.quiz-correct .quiz-text {
  color: var(--accent-ink);        /* dark ink on the flooded chip */
  font-weight: 700;                /* the winner steps up a weight */
}
.quiz-correct .quiz-letter {
  background: var(--panel-bg);     /* the block inverts — a dark leading edge on the amber row */
  color: var(--accent);            /* amber letter on the dark block */
}

/* Dim — fade the wrong rows' LAYERS, not the row (the entrance tween leaves an inline
   opacity on .quiz-option that would override a plain .quiz-dim opacity rule). */
.quiz-dim::before,
.quiz-dim .quiz-letter,
.quiz-dim .quiz-text {
  opacity: 0.35;                   /* wrong answers drop back, still readable */
}

/* ── The selection arc (the state machine's events) ── */

/* Selected — the contestant's pick, before the reveal. An amber keyline ring only. */
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
  color: var(--panel-bg);          /* dark ink on the down-colour block */
}`,
    hasAccent: true,
  }),
);
