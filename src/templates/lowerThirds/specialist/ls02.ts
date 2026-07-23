// ls02 "Duo Frost" — the two-person strap as TWO SEPARATE CARDS.
//
// The other honest way to name two people: instead of one panel split by a rule, give each
// person their own frosted card with real air between them. That is the composition remote
// interviews on premium streams use, and it is not a stylistic variation on ls01 — it is a
// different claim. Two cards say "two sources, two places"; one panel says "one conversation".
// Under a split-screen picture the gap between the cards can be lined up with the seam
// between the two camera feeds, which is exactly why shows reach for it.
//
// Glass family: blur 18, soft radius, a small accent edge leading each card (lt15's motif).

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { duoSplitBalanced, personColumn } from './shared';

export const ls02: TemplateVariant = defineVariant(
  {
    id: 'ls02',
    category: 'lower-third',
    name: 'Duo Frost',
    styleTag: 'glass',
    roleTag: 'interview',
    keywords: ['two people', 'double', 'dual', 'remote', 'split screen', 'two cards', 'guest'],
    description: 'Two frosted cards side by side — one per person, each with its own accent edge.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Left name', sample: 'Sofia Lindqvist' },
      { title: 'Left role', sample: 'Creative Director' },
      { title: 'Right name', sample: 'Marcus Chen' },
      { title: 'Right role', sample: 'Head of Research' },
    ],
    logo: 'none',
    // Blur-in materialises both cards as one gesture — no wipe direction, so neither person
    // is revealed "first". For two peers that neutrality is the whole point.
    animationPresets: ['blur-in', 'fade', 'pop-spring', 'slide-up', 'slide-down', 'line-reveal'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Duo Frost',
    description:
      'Two frosted glass cards, one per person, with a real gap between them — the split-screen ' +
      'remote-interview strap. Each card carries its own name and role as independent SPX ' +
      'fields and is led by a soft accent edge. The cards size to their own text, so unequal ' +
      'names never force one card to stretch to the other.',
    uicolor: '5',
  },
  (o) => {
    const { left, right } = duoSplitBalanced(o);
    const classes = {
      column: 'lower-third-person',
      name: 'lower-third-name',
      role: 'lower-third-title',
    };

    return {
      html: `    <!-- Two independent cards. Each is its own surface: the gap between them is the
         composition, so it can be lined up with the seam of a split-screen picture. -->
    <div class="lower-third-box">
${personColumn(o, left, classes)}
${personColumn(o, right, classes)}
    </div>`,

      css: `/* The pair. Content-sized columns (auto), so each card is exactly as wide as the
   name it holds — a short name never inflates its card to match a long one. min-width: 0
   on the card lets it shrink so a long value wraps INSIDE its own card. */
.lower-third-box {
  display: grid;                    /* the two cards sit side by side… */
  grid-auto-flow: column;           /* …as columns, in document order */
  grid-auto-columns: auto;          /* each card tracks its own text */
  align-items: start;               /* a wrapped name doesn't drag the other card down */
  column-gap: calc(22px * var(--scale));  /* the gap IS the composition — real air, not a divider */
}

/* One person's card — the glass family's surface: blurred, softly cornered, lightly lifted. */
.lower-third-person {
  display: flex;                    /* name over role */
  flex-direction: column;           /* top to bottom */
  min-width: 0;                     /* allow shrinking — long names wrap instead of overflowing */
  max-width: calc(460px * var(--scale));  /* one long value wraps in its own card */
  padding: calc(18px * var(--scale)) calc(26px * var(--scale)) calc(20px * var(--scale)) calc(24px * var(--scale));
  background: var(--panel-bg);      /* the family's translucent white */
  backdrop-filter: var(--panel-blur);  /* the frost itself */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's corner radius */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* lift + the 1px inner edge */
  position: relative;               /* the accent edge below is pinned inside this card */
  overflow: hidden;                 /* the accent edge follows the card's rounded corner */
}

/* Each card's own accent edge — the one sharp dose of colour per person (lt15's motif).
   Drawn as a pseudo-element so it can never be mistaken for the graphic's single
   .lower-third-accent node: there are two cards, and the timeline addresses one accent. */
.lower-third-person::before {
  content: "";                      /* decorative only */
  position: absolute;               /* pinned to the card's left edge */
  left: 0;                          /* flush */
  top: 0;                           /* full card height… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the card's one accent moment */
}

/* The name — this card's primary voice. */
.lower-third-name {
  font-size: calc(34px * var(--scale) * var(--type-scale));  /* headline size at card scale */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;                /* room for a wrapped surname */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The role — dimmed, never a second white. */
.lower-third-title {
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* clearly below the name */
  font-weight: 500;                 /* medium keeps small caps crisp */
  line-height: 1.3;                 /* room if the role wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* the label voice */
  color: var(--label-color);        /* the family's label color */
  margin-top: calc(6px * var(--scale));  /* tied to the name above it */
}`,
      // No .lower-third-accent element: each card paints its own edge, and a single node
      // could only ever belong to one of the two. The presets fall back to fading the box,
      // which is the right gesture for a pair that must arrive together anyway.
      hasAccent: false,
    };
  },
);
