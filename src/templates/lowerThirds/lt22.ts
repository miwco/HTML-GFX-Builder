// lt22 "Stack Three" — the three-line minimal strap: name, role, and an organisation or location
// line set as a tracked small-caps label. The third line is what makes it different from lt01 and
// lt03: it is not "another dim line", it changes VOICE, so the block still reads as a hierarchy
// rather than a paragraph.
//
// A generous left rule holds all three lines together; the block is extended in height on purpose
// (the "extended" density of the pack), so it wants a calm shot with room at the bottom.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt22: TemplateVariant = defineVariant(
  {
    id: 'lt22',
    category: 'lower-third',
    name: 'Stack Three',
    styleTag: 'minimal',
    description: 'Name, role and a tracked organisation line, held by one tall left rule.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Role', sample: 'Chief Correspondent' },
      { title: 'Organisation', sample: 'Northgate Review' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Stack Three',
    description:
      'The three-voice minimal strap: a confident name, a regular-weight role, and an ' +
      'organisation or location line in tracked small caps. Made for steps mode — reveal one ' +
      'line per Continue and the block builds itself on air. Sibling of lt01 Hairline.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Stack Three: [tall accent rule] | [name / role / organisation]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `/* The rule — one tall hairline holding three lines together as a single block. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  left: 0;                          /* at the block's left edge */
  top: 0;                           /* the full height of the stack… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's accent-line weight */
  background: var(--accent);        /* the one small, sharp dose of accent color */
  will-change: transform;           /* hint the browser: presets animate this rule */
}

/* The text block — transparent; the rule and the whitespace do all the structural work. */
.lower-third-box {
  padding-left: calc(30px * var(--scale));  /* room for the rule plus a generous gap */
}

/* Name (f0) — the block's one heavy element. */
.lower-third-name {
  font-size: calc(50px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.06;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);         /* primary text color */
}

/* Role (f1) — the middle voice: regular weight, dimmed. */
.lower-third-title {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 400;                 /* regular weight; contrast comes from the name */
  line-height: 1.3;                 /* secondary text gets room to breathe */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(6px * var(--scale));  /* name + role read as one unit */
}

/* Organisation (f2) — the third VOICE, not just a third line: tracked small caps. */
.lower-third-extra {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* the smallest voice in the stack */
  font-weight: 600;                 /* small caps need weight to stay crisp */
  line-height: 1.3;                 /* a single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking — small caps breathe */
  text-transform: uppercase;        /* whatever the operator types reads as a label */
  color: var(--label-color);        /* the family's label colour */
  margin-top: calc(14px * var(--scale));  /* separated — the organisation is its own beat */
}`,
    hasAccent: true,
  }),
);
