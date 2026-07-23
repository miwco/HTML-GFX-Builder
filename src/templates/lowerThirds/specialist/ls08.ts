// ls08 "Squad Number" — the player strap where the NUMBER leads.
//
// The thing that makes a player graphic a player graphic: the squad number is set larger than
// the name. That looks backwards written down and is obviously right on screen — the viewer
// has just watched a number run past, and the number is how they find the person the strap is
// about. Football, basketball and hockey coverage all do it, and they all do it the same way:
// a big figure in a coloured block, the name beside it, the position and club underneath.
//
// The number is its own SPX field, not part of the name, because it changes independently
// (a squad list is per-match) and because the design sets it in tabular figures at a size the
// name never uses.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { TABULAR_FIGURES, hasLine, slot } from './shared';

export const ls08: TemplateVariant = defineVariant(
  {
    id: 'ls08',
    category: 'lower-third',
    name: 'Squad Number',
    styleTag: 'sport',
    roleTag: 'sport',
    keywords: ['player', 'squad', 'shirt number', 'football', 'basketball', 'position', 'club', 'athlete'],
    description: 'The squad number set large in an accent block, with the player named beside it.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Number', sample: '10' },
      { title: 'Player', sample: 'JAKE MORRISON' },
      { title: 'Position', sample: 'Attacking Midfield' },
      { title: 'Club', sample: 'Northgate United' },
    ],
    logo: 'none',
    // Sport-fast: this strap goes up on a replay and comes off on the restart.
    animationPresets: ['snap-stinger', 'mask-wipe', 'slide-left', 'pop-spring', 'fade', 'slide-up'],
    defaultPalette: paletteById('inferno'),
    defaultFontId: 'bebas-neue',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Squad Number',
    description:
      'The player strap built the way sports coverage builds it: the squad number set large ' +
      'in a solid accent block, the player name beside it, position and club beneath. The ' +
      'number is its own SPX field in tabular figures, so a two-digit number never shifts ' +
      'the name beside it. Drop the number and the strap becomes an ordinary player credit.',
    uicolor: '7',
  },
  (o) => {
    // The BLOCK is unconditional, its CONTENT is not. The block is this design's
    // .lower-third-accent node and the animation data keyframes it by selector, so a block
    // that disappeared with its field would leave the timeline addressing an element that
    // isn't there. Emptied it is still a colour block, which is a coherent strap.
    const numberBlock = `      <!-- The squad-number block — the strap's largest element and its accent node. -->
      <div class="lower-third-accent">
${hasLine(o, 0) ? `        <div class="lower-third-mask"><span id="f0" class="lower-third-number">${o.lines[0].sample}</span></div>\n` : ''}      </div>
`;

    return {
      html: `    <!-- The slab: [accent number block] | [player name over position · club]. -->
    <div class="lower-third-box">
${numberBlock}      <div class="lower-third-text">
${slot(o, 1, 'lower-third-name', '        ')}
        <div class="lower-third-meta">
${slot(o, 2, 'lower-third-title', '          ')}
${slot(o, 3, 'lower-third-extra', '          ')}
        </div>
      </div>
    </div>`,

      css: `/* The slab — number block and text fused into one hard-edged unit (zero radius on purpose). */
.lower-third-box {
  display: flex;                    /* block and text side by side */
  align-items: stretch;             /* the block runs the full height of the text */
  background: var(--panel-bg);      /* the flat dark slab */
  box-shadow: var(--panel-shadow);  /* the family's hard lift */
}

/* The number block — a solid accent square. Fixed minimum width so a "7" and a "23" produce
   the same block: a strap that changes shape with the squad list looks unfinished on air. */
.lower-third-accent {
  flex: 0 0 auto;                   /* never squeezed by a long name beside it */
  min-width: calc(104px * var(--scale));  /* one digit and two digits give the same block */
  max-width: calc(190px * var(--scale));  /* and a pathological value clips inside its own
                                             block instead of eating the name's room — a squad
                                             number is two characters, whatever gets typed */
  overflow: hidden;                 /* the clip is what makes the max-width real: without it a
                                       long value overflows the centred flex child straight into
                                       the name beside it (proven by the runtime bench) */
  display: flex;                    /* centre the figure inside the block */
  align-items: center;              /* …vertically */
  justify-content: center;          /* …horizontally */
  padding: calc(10px * var(--scale)) calc(14px * var(--scale));
  background: var(--accent);        /* the accent used boldly, sport-style */
}

/* The figure itself. A squad number is one or two characters; the span is bounded and
   clipped so a pathological value ellipsizes ON ONE LINE inside the block rather than laying
   out wider than it (a clipped-but-still-wide box collides with the name in the bench). */
.lower-third-number {
  display: block;                   /* so the width bound and the ellipsis apply */
  max-width: calc(160px * var(--scale));  /* the block's inner width — the measured cap */
  white-space: nowrap;              /* a number stays on one line… */
  overflow: hidden;                 /* …and a too-long one is clipped… */
  text-overflow: ellipsis;          /* …with an honest ellipsis */
  font-size: calc(78px * var(--scale) * var(--type-scale));  /* larger than the name, on purpose */
  line-height: 0.9;                 /* figures have no descenders — tighten to centre them */
  letter-spacing: 0;                /* tracking on a two-digit number just unbalances it */
  ${TABULAR_FIGURES}
  color: var(--accent-ink);         /* the family's ink for text ON accent */
}

/* The text stack, centred against the block. */
.lower-third-text {
  display: flex;                    /* stack the lines vertically */
  flex-direction: column;           /* top to bottom */
  justify-content: center;          /* vertically centred against the number block */
  min-width: 0;                     /* let it shrink so long names wrap instead of overflowing */
  max-width: calc(620px * var(--scale));  /* the wrap point for a very long player name */
  padding: calc(16px * var(--scale)) calc(30px * var(--scale)) calc(18px * var(--scale)) calc(26px * var(--scale));
}

/* The player name — second in size to the number, first in importance to the reader. */
.lower-third-name {
  font-size: calc(52px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  line-height: 1.02;                /* condensed caps sit tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;        /* matchday voice */
  color: var(--text-color);         /* primary text color */
}

/* Position and club sit INLINE behind a drawn middot — two facts, one line, so the strap
   stays two rows tall whatever the operator fills in. */
.lower-third-meta {
  display: flex;                    /* position · club on one row… */
  flex-wrap: wrap;                  /* …wrapping only if both are long */
  align-items: baseline;            /* shared baseline */
  gap: calc(10px * var(--scale));   /* the drawn middot sits in this gap */
  margin-top: calc(6px * var(--scale));  /* tied to the name above */
  min-width: 0;                     /* allow shrinking */
}
.lower-third-meta > .lower-third-mask {
  display: flex;                    /* each fact hugs its own text… */
  min-width: 0;                     /* …and may shrink */
}

/* Position (f2) and club (f3) — the same quiet voice; neither outranks the other. */
.lower-third-title,
.lower-third-extra {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* clearly subordinate to the name */
  line-height: 1.2;                 /* single tight row */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* keeps the row uniform */
  color: var(--label-color);        /* the family's label color */
}

/* The middot is DRAWN and only between the two — a strap with just a position has no
   dangling separator. */
.lower-third-meta > .lower-third-mask + .lower-third-mask::before {
  content: "·";                     /* the join, owned by the design */
  margin-right: calc(10px * var(--scale));  /* balances the flex gap on the other side */
  color: var(--text-dim);           /* quieter than the facts it joins */
}`,
      hasAccent: true,
      tokens: { labelColor: 'var(--text-dim)' },
    };
  },
);
