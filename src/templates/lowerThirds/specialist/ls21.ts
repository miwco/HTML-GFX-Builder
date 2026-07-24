// ls21 "Debate Podium" — the candidate strap that has to work on BOTH sides of the frame.
//
// A debate is the one format where a lower third is routinely placed twice, mirrored: one
// candidate at bottom-left under their podium, one at bottom-right under theirs. That
// constraint decides the whole design. A strap with a left-anchored colour block (ls20) looks
// wrong mirrored — the block ends up on the inside edge, pointing away from the person it
// belongs to — so this one is built symmetric: the party colour is a floor under the whole
// card, and the text is centred, so the same graphic reads correctly at either anchor with
// nothing but the zone changed.
//
// It also stays compact on purpose. Two of these are on screen at once, under people who are
// talking, and between them they must not become the picture.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { hasLine, slot } from './shared';

export const ls21: TemplateVariant = defineVariant(
  {
    id: 'ls21',
    category: 'lower-third',
    name: 'Debate Podium',
    styleTag: 'minimal',
    description: 'A compact, symmetric candidate card — reads correctly at bottom-left or bottom-right.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Candidate', sample: 'Ingrid Sørensen' },
      { title: 'Party', sample: 'Green Alliance' },
      { title: 'Standing for', sample: 'Bergen North' },
    ],
    logo: 'none',
    // Slide-up rather than a lateral move: a lateral entrance has a direction, and a
    // direction is wrong on one of the two sides. Rising is the same gesture mirrored.
    animationPresets: ['slide-up', 'fade', 'blur-in', 'line-reveal', 'mask-wipe', 'pop-spring'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Debate Podium',
    description:
      'The mirrored debate card: centred text over a party-colour floor, compact enough for ' +
      'two to sit on screen at once under the people speaking. Symmetric by design — the same ' +
      'graphic reads correctly at bottom-left or bottom-right with only the zone changed, ' +
      'which a side-anchored colour block cannot do. The party colour is the accent.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- The card: centred candidate, party, and what they are standing for, over a
         party-colour floor. Symmetric, so mirroring it needs no second design. -->
    <div class="lower-third-box">
      <div class="lower-third-text">
${slot(o, 0, 'lower-third-name', '        ')}
${slot(o, 1, 'lower-third-title', '        ')}
${hasLine(o, 2) ? slot(o, 2, 'lower-third-extra', '        ') : ''}
      </div>
      <div class="lower-third-accent"></div>
    </div>`,

    css: `/* The card. Centred content is what makes it mirror-safe: nothing in the composition
   points left or right, so the same file serves both podiums. */
.lower-third-box {
  background: var(--panel-bg);      /* the quiet panel behind the text */
  border-radius: var(--panel-radius) var(--panel-radius) 0 0;  /* soft at the top, square on
                                                                  the floor the accent draws */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
  overflow: hidden;                 /* the accent floor follows the rounded top */
  min-width: calc(360px * var(--scale));  /* a floor and two candidates keep ONE width */
  max-width: calc(520px * var(--scale));  /* compact: two are on screen at once */
}

.lower-third-text {
  display: flex;                    /* stack the lines… */
  flex-direction: column;           /* …top to bottom */
  align-items: center;              /* CENTRED — the mirror-safety decision */
  text-align: center;               /* wrapped rows centre too */
  padding: calc(14px * var(--scale)) calc(26px * var(--scale)) calc(15px * var(--scale));
}

/* The party-colour floor — the graphic's accent node, and the identity a debate viewer
   reads before any word on the card. */
.lower-third-accent {
  height: calc(6px * var(--scale));  /* thicker than a hairline: it is the party's colour */
  background: var(--accent);        /* THE party colour — set it in the Style panel */
  transform-origin: center;         /* the reveal grows from the middle, so it mirrors */
}

/* The candidate (f0) — the card's headline. */
.lower-third-name {
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* compact headline (1080p reference) */
  font-weight: 600;                 /* semibold: present without shouting */
  line-height: 1.12;                /* room for a wrapped surname */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The party (f1) — in the party's own colour, which is what ties the name to the floor. */
.lower-third-title {
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* half the name */
  font-weight: 700;                 /* bold — small tracked caps need the weight */
  line-height: 1.25;                /* room if a long party name wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* the civic register */
  color: var(--accent);             /* the same colour as the floor below */
  margin-top: calc(5px * var(--scale));  /* tied to the name above it */
}

/* What they are standing for (f2) — the quietest line, and the first one a busy debate
   graphic drops. */
.lower-third-extra {
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* the smallest voice on the card */
  font-weight: 400;                 /* regular — reference, not billing */
  line-height: 1.3;                 /* room if it wraps */
  color: var(--text-dim);           /* dimmed — never the primary ink twice */
  margin-top: calc(3px * var(--scale));  /* tied to the party above it */
}`,
    hasAccent: true,
  }),
);
