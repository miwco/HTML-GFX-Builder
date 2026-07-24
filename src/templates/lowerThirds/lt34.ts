// lt34 "Title Strap" — the centred cinematic two-liner: the name, a hairline under it, then the
// role in wide caps. Where lt33 Wide Caps is one line for a subject who needs no explanation,
// this one is the same title-card grammar with the explanation restored — the hairline separates
// the two voices instead of merely opening the block.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt34: TemplateVariant = defineVariant(
  {
    id: 'lt34',
    category: 'lower-third',
    name: 'Title Strap',
    styleTag: 'cinematic',
    description: 'Centred name over a hairline, role beneath in wide caps — the title-card pair.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Role', sample: 'Marine Biologist' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'blur-in', 'line-reveal', 'slide-up', 'mask-wipe'],
    defaultPalette: paletteById('ember'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Title Strap',
    description:
      'The centred documentary pair: a light, wide-set name; a hairline; a role in tracked caps. ' +
      'Ships on the Ember palette — warm bone rather than a signal colour — so it belongs to the ' +
      'footage instead of sitting on top of it. Sibling of lt32 Scrim.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Title Strap: [name] / [hairline] / [role], centred on a two-sided scrim. -->
    <div class="lower-third-box">
${lineMasks(o, '      ')}
      <div class="lower-third-accent"></div>
    </div>`,
    css: `/* The scrim — symmetric, fading out to both sides; the composition has no edges. */
.lower-third-box {
  display: flex;                    /* the two lines and the hairline are ordered items */
  flex-direction: column;           /* one above the other */
  align-items: center;              /* the symmetric composition this design is built on */
  text-align: center;               /* …and the wrapped rows centre too */
  padding: calc(46px * var(--scale)) calc(120px * var(--scale)) calc(48px * var(--scale));
  background: radial-gradient(ellipse 62% 95% at 50% 50%,
              var(--panel-bg) 0%,
              color-mix(in srgb, var(--panel-bg) 60%, transparent) 55%,
              transparent 100%);   /* darkest under the words, gone in every direction */
}

/* The hairline — it separates the two voices, so it has to render BETWEEN them although it
   is the last element in the HTML. Flex order does that with two numbers: the hairline takes
   order 1 and the role's mask takes order 2, leaving the name at the default 0. */
.lower-third-accent {
  order: 1;                         /* between the name (0) and the role (2) */
  width: calc(64px * var(--scale));  /* a short centred mark */
  height: var(--accent-weight);     /* the family's 1px hairline */
  margin: calc(14px * var(--scale)) 0;  /* equal air above and below — it separates, not decorates */
  background: var(--accent);        /* warm bone by default — cinema colour */
  will-change: transform;           /* hint the browser: presets draw this mark in */
}

/* The role's mask takes order 2 so the hairline can sit between the two lines. */
.lower-third-mask:nth-child(2) {
  order: 2;                         /* below the hairline */
}

/* The name — cinema setting: light weight, wide tracking, generous line height. */
.lower-third-name {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight (400 — light, not bold) */
  line-height: 1.15;                /* light type needs more air than heavy type */
  letter-spacing: var(--display-tracking);  /* POSITIVE — the family's type opens up */
  color: var(--text-color);         /* primary text color */
}

/* The role — wide tracked caps, dimmed rather than accented. */
.lower-third-title {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* small — the tracking gives it presence */
  font-weight: 500;                 /* medium keeps tracked caps crisp at this size */
  line-height: 1.4;                 /* wide tracking needs matching leading */
  letter-spacing: var(--label-tracking);  /* 0.34em — the family's signature */
  margin-right: calc(-1 * var(--label-tracking));  /* letter-spacing trails the LAST glyph too;
                                       without this the box is one space too wide and the
                                       centred line sits visibly left of centre */
  text-transform: uppercase;        /* whatever the operator types reads as a caption */
  color: var(--label-color);        /* dimmed — colour belongs to the footage in this family */
}`,
    hasAccent: true,
  }),
);
