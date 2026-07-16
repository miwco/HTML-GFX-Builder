// lt10 "Soft Stack" — a floating frosted glass card with a small accent dot inline before the
// name. No keyline, one very soft wide shadow, calm editorial hierarchy across up to three
// lines. The dot lives inside the card as the first flex item so the box presets carry it.
//
// Sanctioned structure deviation: the shared.ts contract documents .lower-third-accent as a SIBLING of
// .lower-third-box, but here the dot is intentionally the box's first flex child so it rides every box
// preset for free. Box-level presets (blur-in, the slide family, pop-spring) are unaffected; the
// 'line-reveal' preset (a scaleX 0→1 draw) is deliberately left out of animationPresets below
// because a horizontal draw reads oddly on a circular dot.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt10: TemplateVariant = defineVariant(
  {
    id: 'lt10',
    category: 'lower-third',
    name: 'Soft Stack',
    styleTag: 'glass',
    description: 'A floating glass card with a soft wide shadow and an accent dot before the name.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'Elias Berg' },
      { title: 'Title', sample: 'Product Designer' },
      { title: 'Company', sample: 'Studio Nord' },
    ],
    hasLogoSlot: false,
    // 'line-reveal' is intentionally omitted: its scaleX 0→1 accent draw reads oddly on
    // this variant's circular dot (see the structure-deviation note in the header comment).
    animationPresets: ['blur-in', 'slide-up', 'pop-spring', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('mint'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Soft Stack',
    description:
      'A floating frosted glass card - 14 px radius, no keyline, one very soft wide shadow. ' +
      'A small accent dot sits inline just before the name; the title dims below it and the ' +
      'third line becomes a spaced-out uppercase dimmed label. Calm and editorial.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Soft Stack: one card. The accent dot is the card's FIRST flex item, so it
         sits inline just before the name; every mask after the first forces a flex
         wrap onto its own full-width row (see the .lower-third-mask rules in the CSS). -->
    <div class="lower-third-box">
      <!-- The accent dot — shares the first flex row with the name line. NOTE: this is a
           sanctioned deviation from the standard structure (where .lower-third-accent is a sibling
           of .lower-third-box): living inside the box lets every box preset carry the dot along. -->
      <div class="lower-third-accent"></div>
${lineMasks(o)}
    </div>`,

    css: `/* The card: a frosted glass panel that floats on one soft, wide shadow (no keyline).
   Flex is the trick for the dot: the dot and the name share the first row, and every
   later mask takes flex-basis 100% so it wraps onto a row of its own. */
.lower-third-box {
  display: flex;                   /* lets the dot sit inline before the name */
  flex-wrap: wrap;                 /* later lines wrap onto their own rows */
  align-items: center;             /* the dot centers on the name row */
  row-gap: calc(6px * var(--scale));       /* breathing room between wrapped rows */
  padding: calc(20px * var(--scale)) calc(30px * var(--scale));  /* generous card padding */
  border-radius: calc(14px * var(--scale));                      /* soft, friendly corners */
  background-color: var(--panel-bg);       /* the retintable glass layer */
  backdrop-filter: blur(18px);             /* frosts the video behind the card */
  -webkit-backdrop-filter: blur(18px);     /* Safari spelling of the same effect */
  box-shadow: 0 calc(24px * var(--scale)) calc(70px * var(--scale)) rgba(0, 0, 0, 0.45);  /* one very soft, wide lift */
}

/* The accent dot — the design's single sharp dose of brand color. */
.lower-third-accent {
  width: calc(10px * var(--scale));        /* small on purpose: a signal, not a shape */
  height: calc(10px * var(--scale));       /* same as width — a circle needs a square */
  border-radius: 50%;              /* turn the square into a perfect circle */
  background: var(--accent);       /* the one accent color */
  margin-right: calc(14px * var(--scale)); /* air between the dot and the name */
  flex: none;                      /* never squash the dot when the name wraps */
}

/* Every mask after the first fills a full row, forcing a flex wrap — so only
   the name shares its row with the dot. Works with 1, 2, or 3 lines. */
.lower-third-mask + .lower-third-mask {
  flex-basis: 100%;                /* full-width row: wraps below the name row */
}

/* The third mask (a mask preceded by two masks) gets extra air above it —
   the small-caps label reads better slightly separated from the title. */
.lower-third-mask + .lower-third-mask + .lower-third-mask {
  margin-top: calc(4px * var(--scale));    /* adds to the row-gap for the label */
}

/* The name — the biggest, boldest line; everything else defers to it. */
.lower-third-name {
  font-size: calc(44px * var(--scale) * var(--type-scale));    /* headline size */
  font-weight: 600;                /* strong but not shouty */
  line-height: 1.1;                /* big text sits tight */
  letter-spacing: -0.01em;         /* big text tightens slightly */
  color: var(--text-color);        /* primary text color */
}

/* The title line — quieter through lighter weight and a dimmed color. */
.lower-third-title {
  font-size: calc(22px * var(--scale) * var(--type-scale));    /* half the name: clear hierarchy */
  font-weight: 400;                /* regular weight steps back */
  line-height: 1.3;                /* smaller text gets more air */
  color: var(--text-dim);          /* dimmed so the name leads */
}

/* The third line — a small spaced-out uppercase label, dimmed like the title. */
.lower-third-extra {
  font-size: calc(18px * var(--scale) * var(--type-scale));    /* the smallest line */
  font-weight: 600;                /* semibold keeps small uppercase type crisp */
  line-height: 1.3;                /* matches the title's rhythm */
  letter-spacing: 0.1em;           /* small caps breathe */
  text-transform: uppercase;       /* label styling */
  color: var(--text-dim);          /* dimmed — the dot stays the one sharp accent dose */
}`,

    hasAccent: true,
  }),
);
