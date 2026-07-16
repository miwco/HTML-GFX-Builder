// qz01 "Arena Quiz" - the sport quiz card, sibling of lt05 (Angle Slab) / lt06 (Split Bar)
// and tk02 (Volt Rail). Same family tokens: zero radius, the -8deg forward lean painted on
// pseudo-layers, a chunky 10px accent edge, condensed heavy caps. The teachable moment is
// the same as lt05's: presets tween .quiz-box and every .quiz-option, so NO lean sits on those
// elements - the card slab and its accent edge live on .quiz-box::before/::after, and each
// row chip / letter block paints its own lean on its ::before. The reveal (SPX Continue)
// floods the correct row's chip with the accent and inverts its letter block; note that
// .quiz-dim fades the row's LAYERS, not the row itself, because the entrance tween leaves an
// inline opacity on .quiz-option that would override a plain opacity rule.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineQuizVariant } from './shared';

export const qz01: TemplateVariant = defineQuizVariant(
  {
    id: 'qz01',
    category: 'quiz',
    name: 'Arena Quiz',
    styleTag: 'sport',
    description: 'A leaning dark quiz card with an accent edge and four letter-chip answer rows - game-show arena energy.',
    maxLines: 1,
    suggestedLines: [{ title: 'Question', sample: 'Which planet is known as the Red Planet?' }],
    logo: 'none',
    animationPresets: ['quiz-reveal'],
    defaultPalette: paletteById('royal'),
    defaultFontId: 'archivo',
    defaultZone: 'mid-center',
  },
  {
    name: 'Arena Quiz',
    description:
      'A centered quiz card on a forward-leaning dark slab with a chunky accent edge - the ' +
      'lt05/lt06 sport family in quiz form. The question shouts in condensed caps above four ' +
      'stacked answer rows, each a subtle slab chip led by a solid accent letter block. On ' +
      'Continue, the correct row floods accent with dark text while the other three fade.',
    uicolor: '5',
  },
  (o) => ({
    // Structure: the card (.quiz-box) holds the masked question, then the four answer rows.
    // The card slab + accent edge are ::before/::after layers, so presets can tween the box
    // (and snap the rows) without ever touching the painted lean.
    html: `    <!-- Arena Quiz: one leaning dark card - question on top, four answer rows below. -->
    <div class="quiz-box">
      <!-- The question - slides up from behind this overflow mask on entrance. -->
      <div class="quiz-mask"><span id="f0">${o.lines[0]?.sample || 'Which planet is known as the Red Planet?'}</span></div>
      <!-- The answers: letter chip + text. Continue marks one row quiz-correct, the rest
           quiz-dim. Each row also carries a NUMBERED class - .quiz-option styles all four the
           same, while .quiz-option-1..4 give each row its own animation identity, so the
           entrance can walk them in one after another and each stays separately editable. -->
      <div class="quiz-options">
        <div class="quiz-option quiz-option-1"><span class="quiz-letter">A</span><span class="quiz-text" id="f1">Venus</span></div>
        <div class="quiz-option quiz-option-2"><span class="quiz-letter">B</span><span class="quiz-text" id="f2">Mars</span></div>
        <div class="quiz-option quiz-option-3"><span class="quiz-letter">C</span><span class="quiz-text" id="f3">Pluto</span></div>
        <div class="quiz-option quiz-option-4"><span class="quiz-letter">D</span><span class="quiz-text" id="f4">Titan</span></div>
      </div>
    </div>`,
    css: `/* The card: the preset tweens THIS element (y + opacity), so it carries no lean of its
   own - the slab and the accent edge are painted on pseudo-layers below. */
.quiz-box {
  position: relative;              /* anchors the painted slab (::before) and edge (::after) */
  padding: calc(30px * var(--scale)) calc(48px * var(--scale));  /* wide sides keep text clear
                                      of the slab's slanted edges on a card this tall */
}

/* The painted slab: the sport lean lives HERE, on a background layer no preset ever tweens
   (same doctrine as lt05 Angle Slab - the family's -8deg signature survives every tween). */
.quiz-box::before {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* fills the box exactly ... */
  inset: 0;                        /* ... edge to edge */
  z-index: -1;                     /* paints behind the question and the rows */
  background: var(--panel-bg);     /* near-black slab behind everything */
  border-radius: 0;                /* hard corners - sport shape language */
  transform: skewX(-8deg);         /* SKEW: the whole card leans forward, mid-sprint */
}

/* The accent edge: a chunky 10px slab fused to the card's leaning left side. Same height
   and same skew as the slab, so both left edges stay perfectly parallel. */
.quiz-box::after {
  content: '';                     /* second painted layer on the same box */
  position: absolute;              /* pinned over the slab's left edge ... */
  left: 0;                         /* ... flush with the box's left side */
  top: 0;                          /* full height, top ... */
  bottom: 0;                       /* ... to bottom */
  z-index: -1;                     /* behind the text, above ::before (later layer wins) */
  width: calc(10px * var(--scale));  /* chunky 10px edge, not a hairline */
  background: var(--accent);       /* the family's loud color moment */
  transform: skewX(-8deg);         /* leans with the slab so the two fuse into one shape */
}

/* The question: condensed heavy caps - the loudest thing on the card. */
.quiz-mask > span {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* headline scale for a multi-row card */
  font-weight: 800;                /* maximum punch */
  line-height: 1.15;               /* tight - big text needs little leading */
  letter-spacing: 0.01em;          /* a touch of air between the caps */
  text-transform: uppercase;       /* quiz questions are shouted, not spoken */
  color: var(--text-color);        /* primary text on the dark slab */
}

/* The answer stack: four uniform rows under the question, zero-radius sport rhythm. */
.quiz-options {
  margin-top: calc(24px * var(--scale));  /* clear break between question and answers */
  display: flex;                   /* a simple vertical stack ... */
  flex-direction: column;          /* ... one row per answer */
  gap: calc(12px * var(--scale));  /* even air between the rows */
}

/* One answer row: the preset staggers these in and pops the winner, so the row itself is
   never skewed - its chip background leans on the ::before layer below. */
.quiz-option {
  position: relative;              /* anchors the painted row chip (::before) */
  display: flex;                   /* letter block + answer text side by side */
  align-items: center;             /* text centers on the letter block's height */
  height: calc(46px * var(--scale));  /* uniform row height - the letter block fills it */
}

/* The row chip: a faint slab behind each answer. color-mix keeps it on-palette - it is
   the text color at 8%, so the Style panel retints it along with everything else. */
.quiz-option::before {
  content: '';                     /* painted layer - safe from every preset tween */
  position: absolute;              /* fills the row exactly ... */
  inset: 0;                        /* ... edge to edge */
  z-index: -1;                     /* behind the letter block and the text */
  background: color-mix(in srgb, var(--text-color) 8%, transparent);  /* faint on-palette tint */
  border-radius: 0;                /* hard corners - sport shape language */
  transform: skewX(-8deg);         /* the family lean, parallel to the card slab */
}

/* The letter block: a solid accent slab leading each row. The block leans on ITS ::before,
   so the letter itself stays dead straight with no counter-skew needed. */
.quiz-letter {
  position: relative;              /* anchors the painted accent block (::before) */
  flex-shrink: 0;                  /* the block never squeezes; text takes the rest */
  width: calc(48px * var(--scale));   /* a chunky square-ish block ... */
  height: 100%;                    /* ... filling the row's full height */
  display: flex;                   /* centers the letter ... */
  align-items: center;             /* ... vertically */
  justify-content: center;         /* ... and horizontally */
  margin-right: calc(18px * var(--scale));  /* air between the block and the answer text */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* the letter - loud but under the answers */
  font-weight: 800;                /* block letters hit hard */
  color: var(--panel-bg);          /* dark ink on the bright accent block */
}

/* The letter block's paint: solid accent, leaning with the rest of the family. */
.quiz-letter::before {
  content: '';                     /* painted layer behind the letter */
  position: absolute;              /* fills the block exactly ... */
  inset: 0;                        /* ... edge to edge */
  z-index: -1;                     /* behind the letter glyph */
  background: var(--accent);       /* four small accent doses - sport uses accent boldly */
  transform: skewX(-8deg);         /* the family lean - fuses with the row chip's edge */
}

/* The answer text: condensed caps, clearly under the question. */
.quiz-text {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* list scale - subordinate to the 40px question */
  font-weight: 700;                /* heavy enough to read at a glance */
  letter-spacing: 0.04em;          /* slight air between the caps */
  text-transform: uppercase;       /* the whole card shouts */
  color: var(--text-color);        /* primary text on the dark slab */
  padding-right: calc(20px * var(--scale));  /* text never touches the chip's slanted edge */
  overflow-wrap: break-word;       /* break very long unbroken answers */
}

/* ── The reveal (SPX Continue) ── */

/* Correct: the row's chip floods solid accent - the game-show money moment. */
.quiz-correct::before {
  background: var(--accent);       /* the faint chip becomes the loud accent slab */
}

/* Correct: dark ink on the flooded chip (the panel hue doubles as text, like lt06's bar). */
.quiz-correct .quiz-text {
  color: var(--panel-bg);          /* highest contrast on the bright accent flood */
  font-weight: 800;                /* the winner steps up a weight */
}

/* Correct: the letter block inverts - a strong dark edge leading the flooded row. */
.quiz-correct .quiz-letter {
  color: var(--accent);            /* accent letter ... */
}
.quiz-correct .quiz-letter::before {
  background: var(--panel-bg);     /* ... on a dark block - the row's hard leading edge */
}

/* Dim: fade the row's LAYERS, not the row - the entrance tween leaves an inline
   opacity on .quiz-option itself, which would override a plain .quiz-dim opacity rule. */
.quiz-dim::before,
.quiz-dim .quiz-letter,
.quiz-dim .quiz-text {
  opacity: 0.35;                   /* wrong answers drop back, still readable */
}`,
    hasAccent: false, // the accent edge is a painted ::after layer, not a .quiz-accent element
  }),
);
