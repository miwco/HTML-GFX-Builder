// lt30 "Dateline" — the four-input editorial strap: name, role, organisation and a dateline
// (place, or place and time). The dateline is the line that makes it a news graphic rather than a
// name tag, so it gets the treatment a printed dateline gets: separated from the block above by a
// rule, set in tracked caps, in the accent colour.
//
// Lines three and four share the assembler's `-extra` class, so they are told apart by POSITION
// inside the text column — structural, and therefore safe under field renumbering.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt30: TemplateVariant = defineVariant(
  {
    id: 'lt30',
    category: 'lower-third',
    name: 'Dateline',
    styleTag: 'editorial',
    description: 'Name, role and organisation over a ruled dateline — the reporting strap.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Role', sample: 'Chief Correspondent' },
      { title: 'Organisation', sample: 'Northgate Review' },
      { title: 'Dateline', sample: 'Brussels · Live' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'mask-wipe', 'fade', 'slide-up', 'slide-down'],
    defaultPalette: paletteById('vermilion'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Dateline',
    description:
      'The reporting strap: a name and role, the organisation under them, and a ruled dateline ' +
      'closing the block in tracked accent caps. Built for steps mode — reveal the dateline on a ' +
      'Continue when the reporter throws to location. Sibling of lt25 Masthead.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Dateline: [tall rule] | [name / role / organisation] over [ruled dateline]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
      <div class="lower-third-text">
${lineMasks(o, '        ')}
      </div>
    </div>`,
    css: `/* The rule — one tall hairline gathering the whole block. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  left: 0;                          /* at the block's left edge */
  top: 0;                           /* the full height of the stack… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's printed-rule weight */
  background: var(--accent);        /* the one accent surface in the design */
  will-change: transform;           /* hint the browser: presets animate this rule */
}

/* The text block — no panel; the rule and the whitespace are the structure. */
.lower-third-box {
  padding-left: calc(28px * var(--scale));  /* room for the rule plus a printed-margin gap */
}

/* Name (f0) — the block's one heavy element. */
.lower-third-name {
  font-size: calc(48px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* Role (f1) — the second reading voice. */
.lower-third-title {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 400;                 /* regular weight; contrast comes from the name */
  line-height: 1.3;                 /* secondary text gets room to breathe */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(5px * var(--scale));  /* name + role read as one unit */
}

/* Organisation (f2) — still a reading line, one step quieter than the role. */
.lower-third-extra {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* below the role, above the dateline */
  font-weight: 400;                 /* regular weight — this line is not a label */
  line-height: 1.3;                 /* secondary text gets room to breathe */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(3px * var(--scale));  /* sits close under the role: one credential unit */
}

/* Dateline (f3) — the fourth row changes VOICE: ruled off, tracked caps, accent colour.
   Selected by position, so it works whatever the fields end up numbered. */
.lower-third-text .lower-third-mask:nth-child(4) {
  margin-top: calc(15px * var(--scale));  /* air above the dateline */
  padding-top: calc(13px * var(--scale));  /* …and inside it, above the caps */
  border-top: 1px solid color-mix(in srgb, var(--text-color) 20%, transparent);  /* the printed divider */
}
.lower-third-text .lower-third-mask:nth-child(4) .lower-third-extra {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* the smallest voice in the block */
  font-weight: 600;                 /* small caps need weight to stay crisp */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* BRUSSELS · LIVE, whatever the operator types */
  color: var(--label-color);        /* the family's label colour (the accent) */
  margin-top: 0;                    /* the mask's padding already provides the gap */
}`,
    hasAccent: true,
  }),
);
