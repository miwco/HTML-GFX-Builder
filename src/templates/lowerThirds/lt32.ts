// lt32 "Scrim" — the CINEMATIC family's flagship, and the design every other cinematic variant is
// judged against. There is no panel: the type sits on a scrim that fades away toward the frame's
// centre, so the footage is never boxed off, only darkened where the words need it.
//
// The family's two signature type values are both here: the name is set at weight 400 with
// POSITIVE tracking (broadcast type tightens; cinema type opens up), and the label runs at 0.34em
// — the widest tracking in the product.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt32: TemplateVariant = defineVariant(
  {
    id: 'lt32',
    category: 'lower-third',
    name: 'Scrim',
    styleTag: 'cinematic',
    description: 'Name and role on a scrim that fades into the shot — no panel, no edges.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Role', sample: 'Marine Biologist' },
    ],
    logo: 'none',
    // Cinematic motion is slow and still: a fade leads, and nothing overshoots.
    animationPresets: ['fade', 'blur-in', 'line-reveal', 'slide-up', 'mask-wipe'],
    defaultPalette: paletteById('noir'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Scrim',
    description:
      'The documentary name super: a soft scrim under the type instead of a panel, a 1 px hairline ' +
      'above the name, and wide-tracked setting throughout. Made for real locations — a boat deck, ' +
      'a field, a workshop — where a hard-edged panel would look pasted on.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Scrim: [hairline] over [name / role], all on a scrim that fades into the shot. -->
    <div class="lower-third-box">
      <div class="lower-third-accent"></div>
${lineMasks(o, '      ')}
    </div>`,
    css: `/* The scrim — the family's answer to a panel, and the reason it is a RADIAL gradient rather
   than a linear one: a linear fade still leaves two hard edges (top and bottom) and reads as
   a panel with a soft side. Fading from a centre outward leaves no edge at all, which is the
   whole point of the family. The wide padding is what gives the falloff room to happen. */
.lower-third-box {
  padding: calc(46px * var(--scale)) calc(190px * var(--scale)) calc(48px * var(--scale)) calc(34px * var(--scale));
  background: radial-gradient(ellipse 85% 105% at 12% 50%,
              var(--panel-bg) 0%,
              color-mix(in srgb, var(--panel-bg) 55%, transparent) 45%,
              transparent 100%);   /* darkest under the words, gone in every direction */
}

/* The hairline — the only drawn element in the design, and the thinnest in the product. */
.lower-third-accent {
  width: calc(120px * var(--scale));  /* a short mark above the name */
  height: var(--accent-weight);     /* the family's 1px hairline */
  margin-bottom: calc(16px * var(--scale));  /* air between the mark and the name */
  background: var(--accent);        /* bone by default — cinema colour, not signal colour */
  will-change: transform;           /* hint the browser: presets draw this mark in */
}

/* The name — cinema setting: light weight, wide tracking, generous line height. */
.lower-third-name {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight (400 — light, not bold) */
  line-height: 1.15;                /* light type needs more air than heavy type */
  letter-spacing: var(--display-tracking);  /* POSITIVE — the family's type opens up */
  color: var(--text-color);         /* primary text color */
}

/* The role — the widest-tracked line in the product, dimmed rather than accented. */
.lower-third-title {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* small — the tracking gives it presence */
  font-weight: 500;                 /* medium keeps tracked caps crisp at this size */
  line-height: 1.4;                 /* wide tracking needs matching leading */
  letter-spacing: var(--label-tracking);  /* 0.34em — the family's signature */
  text-transform: uppercase;        /* whatever the operator types reads as a caption */
  color: var(--label-color);        /* dimmed — colour belongs to the footage in this family */
  margin-top: calc(12px * var(--scale));  /* clear air below the name */
}`,
    hasAccent: true,
  }),
);
