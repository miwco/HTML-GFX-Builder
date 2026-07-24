// lt26 "Byline" — the editorial three-line strap, built the way a byline is printed: the
// publication FIRST as a small tracked kicker, then the name, then the role. The publication is
// data field f2 but renders on top — flexbox `order` reorders it visually, so the operator still
// fills the fields in the order they think about them (name first) while the design keeps the
// printed reading order.
//
// Sibling of lt25 Masthead: same rule, same kicker voice, one more line and a different order.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt26: TemplateVariant = defineVariant(
  {
    id: 'lt26',
    category: 'lower-third',
    name: 'Byline',
    styleTag: 'editorial',
    description: 'Publication kicker over the name and role — the printed byline, in that order.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Role', sample: 'Chief Correspondent' },
      { title: 'Publication', sample: 'Northgate Review' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'fade', 'mask-wipe', 'slide-up', 'slide-down'],
    defaultPalette: paletteById('vermilion'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Byline',
    description:
      'A printed byline for the screen: the publication or programme name as a tracked kicker on ' +
      'top, then the person\'s name, then their role. Written as three ordinary fields — the ' +
      'kicker is field f2 and moves to the top with CSS `order`, so nothing about the operator\'s ' +
      'workflow changes. Sibling of lt25 Masthead.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Byline: [short rule] over [publication kicker / name / role]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `/* The rule — a short mark above the kicker, the way a printed standfirst opens. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  top: 0;                           /* the topmost element of the composition */
  left: 0;                          /* at the block's left edge */
  width: calc(48px * var(--scale));  /* a short mark, not a full-width rule */
  height: var(--accent-weight);     /* the family's printed-rule weight */
  background: var(--accent);        /* the one accent surface in the design */
  will-change: transform;           /* hint the browser: presets draw this rule in */
}

/* The text block — a flex column, which is what lets the kicker be reordered visually. */
.lower-third-box {
  display: flex;                    /* so the lines can be ordered independently of the DOM */
  flex-direction: column;           /* one line per row, top to bottom */
  align-items: flex-start;          /* each row hugs its own text */
  padding-top: calc(22px * var(--scale));  /* clears the rule above */
}

/* The publication (f2) — printed FIRST, though it is the last data field: a negative
   order value lifts it above its siblings. The operator's field order never changes. */
.lower-third-extra {
  order: -1;                        /* renders above the name and role */
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* small — the tracking gives it presence */
  font-weight: 600;                 /* small caps need weight to stay crisp */
  line-height: 1.3;                 /* a single tight kicker line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* whatever the operator types reads as a kicker */
  color: var(--label-color);        /* the family's label colour (the accent) */
  margin-bottom: calc(10px * var(--scale));  /* air between the kicker and the name below it */
}

/* The mask around the kicker needs the same order, since ordering applies to the flex ITEM
   (the mask div) and not to the span inside it. */
.lower-third-mask:nth-child(3) {
  order: -1;                        /* keeps the kicker's mask above the other two */
}

/* The name — editorial weight: set, not shouted. */
.lower-third-name {
  font-size: calc(50px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The role — the quiet closing line. */
.lower-third-title {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 400;                 /* regular weight; contrast comes from the name */
  line-height: 1.3;                 /* secondary text gets room to breathe */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(6px * var(--scale));  /* name + role read as one unit */
}`,
    hasAccent: true,
  }),
);
