// lt24 "Credential Strap" — the five-input minimal design: name, role, organisation, location and
// a note, which is as much as a lower third can carry before it stops being one. The structure is
// what keeps it readable: two big voices (name, role), a rule, then three small tracked labels
// packed onto one meta band.
//
// Rows three to five all carry the same class (the assembler names line 2+ `-extra`), so they are
// told apart by POSITION inside .lower-third-text — a structural selector that survives field
// renumbering, unlike an #f3 id selector would.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt24: TemplateVariant = defineVariant(
  {
    id: 'lt24',
    category: 'lower-third',
    name: 'Credential Strap',
    styleTag: 'minimal',
    description: 'Five inputs: name and role over a meta band of organisation, location and note.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Role', sample: 'Chief Correspondent' },
      { title: 'Organisation', sample: 'Northgate Review' },
      { title: 'Location', sample: 'Brussels' },
      { title: 'Note', sample: 'Live' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'mask-wipe', 'slide-up', 'fade', 'slide-down'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Credential Strap',
    description:
      'The full-credential strap for panels, hearings and conferences: name and role at reading ' +
      'size, then organisation, location and a status note as a band of small tracked labels ' +
      'under a rule. Every line after the second is optional — leave a field empty in the wizard ' +
      'and the band simply shortens.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Credential Strap: [left rule] | [name / role] over [organisation · location · note]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
      <div class="lower-third-text">
${lineMasks(o, '        ')}
      </div>
    </div>`,
    css: `/* The rule — one tall hairline gathering all five lines into a single block. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  left: 0;                          /* at the block's left edge */
  top: 0;                           /* the full height of the stack… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's accent-line weight */
  background: var(--accent);        /* the one small, sharp dose of accent color */
  will-change: transform;           /* hint the browser: presets animate this rule */
}

/* The text block — transparent; whitespace and one rule carry the structure. */
.lower-third-box {
  padding-left: calc(30px * var(--scale));  /* room for the rule plus a generous gap */
}

/* Name (f0) — the block's one heavy element. */
.lower-third-name {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.06;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);         /* primary text color */
}

/* Role (f1) — the second reading voice. */
.lower-third-title {
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 400;                 /* regular weight; contrast comes from the name */
  line-height: 1.3;                 /* secondary text gets room to breathe */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(5px * var(--scale));  /* name + role read as one unit */
}

/* The meta band (f2, f3, f4) — every line past the role shares one small tracked voice, so
   the block reads as two headlines over a band rather than as five competing lines. */
.lower-third-extra {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* the smallest voice in the stack */
  font-weight: 600;                 /* small caps need weight to stay crisp */
  line-height: 1.35;                /* tight rows — the band is one unit */
  letter-spacing: var(--label-tracking);  /* the family's label tracking — small caps breathe */
  text-transform: uppercase;        /* whatever the operator types reads as a label */
  color: var(--label-color);        /* the family's label colour */
}

/* The rule above the band. It hangs on the FIRST meta row (the third line), so a graphic
   created with only two lines never draws a rule under nothing. */
.lower-third-text .lower-third-mask:nth-child(3) {
  margin-top: calc(16px * var(--scale));  /* air above the band */
  padding-top: calc(14px * var(--scale));  /* …and inside it, above the first label */
  border-top: 1px solid color-mix(in srgb, var(--text-color) 22%, transparent);  /* the hairline divider */
}

/* The fifth line (the note) carries the accent, so the band ends on the one colour the
   design allows itself — a status word ("Live") reads instantly. */
.lower-third-text .lower-third-mask:nth-child(5) .lower-third-extra {
  color: var(--accent);             /* the band's single accent moment */
}`,
    hasAccent: true,
  }),
);
