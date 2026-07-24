// lt46 "Glass Column" — the extended glass design: a frosted card with a soft accent edge down its
// left side carrying three voices — name, role, and a tracked handle or location line in the
// accent colour. It is lt15 Frost Strap's larger sibling: same edge, same card, one more line and
// the roomier padding an extended layout wants.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt46: TemplateVariant = defineVariant(
  {
    id: 'lt46',
    category: 'lower-third',
    name: 'Glass Column',
    styleTag: 'glass',
    description: 'A frosted card with a soft accent edge — name, role and a tracked third line.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'Sofia Lindqvist' },
      { title: 'Role', sample: 'Creative Director' },
      { title: 'Studio', sample: 'Northlight Studio' },
    ],
    logo: 'none',
    animationPresets: ['blur-in', 'pop-spring', 'line-reveal', 'fade', 'slide-up'],
    defaultPalette: paletteById('orchid'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Glass Column',
    description:
      'The three-voice glass card: a soft accent edge down the left, then a name, a role, and a ' +
      'studio, handle or location line in tracked accent caps. Built for steps mode — reveal one ' +
      'line per Continue. Sibling of lt15 Frost Strap.',
    uicolor: '3',
  },
  (o) => ({
    html: `    <!-- Glass Column: [soft accent edge] | [frosted card: name / role / studio]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `/* The accent edge — a soft accent-tinted bar fading down the card's left side. */
.lower-third-accent {
  position: absolute;              /* pinned inside the positioned .lower-third root */
  left: 0;                         /* at the card's leading edge */
  top: calc(20px * var(--scale));  /* inset so the edge clears the card's rounding… */
  bottom: calc(20px * var(--scale));  /* …top and bottom */
  width: var(--accent-weight);     /* the family's accent weight */
  border-radius: var(--accent-weight);  /* rounded ends — a soft edge, not a hard slab */
  background: linear-gradient(to bottom,
              var(--accent) 0%,
              color-mix(in srgb, var(--accent) 20%, transparent) 100%);  /* fades down — glass gradient edge */
  will-change: transform;          /* hint the browser: presets can grow this edge */
}

/* The card — the family's frosted surface, with the roomier padding of an extended layout. */
.lower-third-box {
  margin-left: var(--accent-weight);  /* the card begins where the accent edge ends — fused */
  padding: calc(22px * var(--scale)) calc(48px * var(--scale)) calc(24px * var(--scale)) calc(30px * var(--scale));
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* Name (f0) — the line the viewer reads first. */
.lower-third-name {
  font-size: calc(44px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the glass families run heavier weights */
  line-height: 1.1;                /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* Role (f1) — the quiet middle voice. */
.lower-third-title {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 500;                /* medium — quiet next to the name */
  line-height: 1.25;               /* a touch of air at small sizes */
  color: var(--text-dim);          /* dimmed — never pure white twice */
  margin-top: calc(5px * var(--scale));  /* name + role read as one unit */
}

/* Studio (f2) — the third VOICE: tracked caps in the family's label colour. */
.lower-third-extra {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* the smallest voice on the card */
  font-weight: 600;                /* small caps need weight to stay crisp */
  line-height: 1.3;                /* a single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* whatever the operator types reads as a label */
  color: var(--label-color);       /* the family's label colour (the accent) */
  margin-top: calc(13px * var(--scale));  /* separated — the third line is its own beat */
}`,
    hasAccent: true,
  }),
);
