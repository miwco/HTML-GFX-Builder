// lt37 "Slate" — the four-input cinematic strap, right-anchored: name, role, organisation and a
// production note, ragged-left against a hairline column, the way a camera slate stacks its rows.
// It is the family's extended layout — the most information a cinematic graphic can carry before
// the scrim starts to feel like a panel.
//
// Rows three and four share the assembler's `-extra` class and are told apart by POSITION inside
// the text column, which survives field renumbering where an `#f3` selector would not.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt37: TemplateVariant = defineVariant(
  {
    id: 'lt37',
    category: 'lower-third',
    name: 'Slate',
    styleTag: 'cinematic',
    description: 'Four right-anchored rows — name, role, organisation, note — against a hairline.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Role', sample: 'Marine Biologist' },
      { title: 'Organisation', sample: 'Polar Research Institute' },
      { title: 'Note', sample: 'Interviewed March 2026' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'slide-left', 'blur-in', 'line-reveal', 'mask-wipe'],
    defaultPalette: paletteById('noir'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-right',
  },
  {
    name: 'Slate',
    description:
      'The archival credit block: four rows ragged-left against a hairline column on the right — ' +
      'name, role, organisation, and a production note (a date, an archive reference, a ' +
      'attribution). For interviews that need to be sourced on screen. Sibling of lt32 Scrim.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Slate: [name / role / organisation / note, ragged-left] | [hairline column]. -->
    <div class="lower-third-box">
      <div class="lower-third-text">
${lineMasks(o, '        ')}
      </div>
      <div class="lower-third-accent"></div>
    </div>`,
    css: `/* The scrim — fades out toward the LEFT here: the graphic sits on the right of the
   frame, so the open edge is the one facing the middle of the shot. */
.lower-third-box {
  display: flex;                    /* words and hairline on one row */
  align-items: stretch;             /* the hairline runs the block's full height */
  gap: calc(22px * var(--scale));   /* the gap between the rows and their rule */
  text-align: right;                /* rows are ragged-LEFT: they align to the hairline */
  padding: calc(42px * var(--scale)) calc(32px * var(--scale)) calc(44px * var(--scale)) calc(170px * var(--scale));
  background: radial-gradient(ellipse 88% 105% at 88% 50%,
              var(--panel-bg) 0%,
              color-mix(in srgb, var(--panel-bg) 55%, transparent) 48%,
              transparent 100%);   /* darkest under the rows, gone in every direction */
}

/* The words. min-width: 0 lets this flex item shrink, so a long unbroken name wraps
   instead of pushing the hairline out of the frame. */
.lower-third-text {
  min-width: 0;                     /* the flexbox wrap fix — see above */
}

/* The hairline column — the family's 1 px rule, on the outside edge. */
.lower-third-accent {
  width: var(--accent-weight);      /* the family's 1px hairline */
  background: var(--accent);        /* bone by default — cinema colour, not signal colour */
  flex: none;                       /* never squeezed by long text */
  will-change: transform;           /* hint the browser: presets animate this rule */
}

/* Name (f0) — cinema setting: light weight, wide tracking. */
.lower-third-name {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight (400 — light, not bold) */
  line-height: 1.15;                /* light type needs more air than heavy type */
  letter-spacing: var(--display-tracking);  /* POSITIVE — the family's type opens up */
  color: var(--text-color);         /* primary text color */
}

/* Role (f1) — a reading line, quieter than the name. */
.lower-third-title {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 400;                 /* regular weight; contrast comes from the name */
  line-height: 1.35;                /* secondary text gets room to breathe */
  letter-spacing: 0.03em;           /* a hint of the family's openness */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(5px * var(--scale));  /* name + role read as one unit */
}

/* Organisation and note (f2, f3) — both drop to the label voice; the note goes smaller
   still, which is what keeps four rows from reading as a wall. */
.lower-third-extra {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* the label size for this design */
  font-weight: 500;                 /* medium keeps tracked caps crisp at this size */
  line-height: 1.45;                /* wide tracking needs matching leading */
  letter-spacing: var(--label-tracking);  /* 0.34em — the family's signature */
  text-transform: uppercase;        /* whatever the operator types reads as a caption */
  color: var(--label-color);        /* dimmed — colour belongs to the footage in this family */
}

/* The organisation row opens the credit band. */
.lower-third-text .lower-third-mask:nth-child(3) {
  margin-top: calc(14px * var(--scale));  /* separated from the role above */
}

/* The note row (f3) — the quietest thing on screen: smaller and dimmer than the band. */
.lower-third-text .lower-third-mask:nth-child(4) .lower-third-extra {
  font-size: calc(13px * var(--scale) * var(--type-scale));  /* the smallest voice in the pack */
  color: color-mix(in srgb, var(--text-dim) 75%, transparent);  /* one step below the band */
}`,
    hasAccent: true,
  }),
);
