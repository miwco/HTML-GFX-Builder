// lt38 "Fade Rule" — the compact right-anchored cinematic strap: a name and a wide-tracked role,
// closed by a hairline that fades out along its own length. Nothing is boxed, nothing is filled;
// it is the lightest graphic in the pack, for shots that can carry almost no furniture.
//
// The fading rule is the one place the family allows a gradient on the accent itself: a hard-ended
// 1 px line reads as a UI border, while one that dissolves reads as part of the grade.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt38: TemplateVariant = defineVariant(
  {
    id: 'lt38',
    category: 'lower-third',
    name: 'Fade Rule',
    styleTag: 'cinematic',
    description: 'Compact right-anchored pair, closed by a hairline that dissolves as it runs.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Role', sample: 'Marine Biologist' },
    ],
    logo: 'none',
    // No 'blur-in': it animates the box's `filter`, which this design uses for the drop-shadow
    // that is its ONLY separation from the footage (there is no scrim here).
    animationPresets: ['fade', 'slide-left', 'line-reveal', 'mask-wipe', 'slide-up'],
    defaultPalette: paletteById('ember'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-right',
  },
  {
    name: 'Fade Rule',
    description:
      'The lightest strap in the set: a name, a tracked role beneath it, and a hairline under both ' +
      'that fades out as it travels. No scrim, no panel — use it over graded footage that is ' +
      'already dark where the words land. Sibling of lt32 Scrim.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Fade Rule: [name / role, ragged-left] over [a hairline that dissolves leftward]. -->
    <div class="lower-third-box">
${lineMasks(o, '      ')}
    </div>
    <div class="lower-third-accent"></div>`,
    css: `/* The rule — under the block, dissolving toward the middle of the frame. A gradient on
   the accent itself is a cinematic-only move: a hard-ended hairline reads as a UI border. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  left: 0;                          /* from the block's left edge… */
  right: 0;                         /* …to its right edge */
  bottom: 0;                        /* closing the block */
  height: var(--accent-weight);     /* the family's 1px hairline */
  background: linear-gradient(to right,
              transparent 0%,
              var(--accent) 100%);  /* dissolves toward the shot, solid at the frame edge */
  will-change: transform;           /* hint the browser: presets draw this rule in */
}

/* The text block — no scrim and no panel: its separation from the picture is a drop-shadow
   on the box. That is a FILTER and not a text-shadow on the lines, because each line sits in
   an overflow-hidden mask that would clip a shadow of its own (DESIGN_LANGUAGE §3). */
.lower-third-box {
  text-align: right;                /* lines are ragged-LEFT: they align to the frame edge */
  padding-bottom: calc(14px * var(--scale));  /* air between the last line and the rule */
  filter: drop-shadow(0 calc(2px * var(--scale)) calc(16px * var(--scale)) rgba(0, 0, 0, 0.75));
}

/* The name — cinema setting: light weight, wide tracking. */
.lower-third-name {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight (400 — light, not bold) */
  line-height: 1.15;                /* light type needs more air than heavy type */
  letter-spacing: var(--display-tracking);  /* POSITIVE — the family's type opens up */
  color: var(--text-color);         /* primary text color */
}

/* The role — wide tracked caps, dimmed rather than accented. */
.lower-third-title {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* small — the tracking gives it presence */
  font-weight: 500;                 /* medium keeps tracked caps crisp at this size */
  line-height: 1.4;                 /* wide tracking needs matching leading */
  letter-spacing: var(--label-tracking);  /* 0.34em — the family's signature */
  text-transform: uppercase;        /* whatever the operator types reads as a caption */
  color: var(--label-color);        /* dimmed — colour belongs to the footage in this family */
  margin-top: calc(10px * var(--scale));  /* clear air below the name */
}`,
    hasAccent: true,
  }),
);
