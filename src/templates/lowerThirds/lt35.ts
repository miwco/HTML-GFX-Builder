// lt35 "Letterbox" — the three-line cinematic strap: a hairline spanning the whole block, then the
// name, the role, and a location line. The scrim rises from the bottom of the graphic rather than
// fading sideways, which is the letterboxed reading: the frame darkens toward its lower edge and
// the words live in that darkness.
//
// Sibling of lt32 Scrim — same voice, one more line and a vertical scrim instead of a lateral one.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt35: TemplateVariant = defineVariant(
  {
    id: 'lt35',
    category: 'lower-third',
    name: 'Letterbox',
    styleTag: 'cinematic',
    description: 'Name, role and location under a full-width hairline, on a rising scrim.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Role', sample: 'Marine Biologist' },
      { title: 'Location', sample: 'Svalbard, Norway' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'line-reveal', 'blur-in', 'slide-up', 'mask-wipe'],
    defaultPalette: paletteById('noir'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Letterbox',
    description:
      'The three-voice documentary super: a hairline across the top of the block, the name, the ' +
      'role, and a location line in wide tracked caps. The scrim rises from the bottom edge like ' +
      'a letterbox bar, so the graphic reads as part of the grade. Sibling of lt32 Scrim.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Letterbox: [full-width hairline] over [name / role / location], on a rising scrim. -->
    <div class="lower-third-box">
      <div class="lower-third-accent"></div>
      <div class="lower-third-text">
${lineMasks(o, '        ')}
      </div>
    </div>`,
    css: `/* The scrim — anchored at the block's bottom-left corner and falling away upward and to the
   right, so the graphic still has no edge anywhere. A plain vertical fade would leave hard
   left and right sides, which is the panel look this family exists to avoid. */
.lower-third-box {
  padding: calc(40px * var(--scale)) calc(150px * var(--scale)) calc(34px * var(--scale)) calc(32px * var(--scale));
  background: radial-gradient(ellipse 95% 120% at 10% 100%,
              var(--panel-bg) 0%,
              color-mix(in srgb, var(--panel-bg) 55%, transparent) 50%,
              transparent 100%);   /* darkest under the last line, gone in every direction */
}

/* The hairline — spans the whole block, which is the widest line's own width. */
.lower-third-accent {
  height: var(--accent-weight);     /* the family's 1px hairline */
  margin-bottom: calc(18px * var(--scale));  /* air between the rule and the name */
  background: var(--accent);        /* bone by default — cinema colour, not signal colour */
  will-change: transform;           /* hint the browser: presets draw this rule in */
}

/* The name — cinema setting: light weight, wide tracking, generous line height. */
.lower-third-name {
  font-size: calc(44px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight (400 — light, not bold) */
  line-height: 1.15;                /* light type needs more air than heavy type */
  letter-spacing: var(--display-tracking);  /* POSITIVE — the family's type opens up */
  color: var(--text-color);         /* primary text color */
}

/* The role — a reading line, quieter than the name but not yet a label. */
.lower-third-title {
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 400;                 /* regular weight; contrast comes from the name */
  line-height: 1.35;                /* secondary text gets room to breathe */
  letter-spacing: 0.03em;           /* a hint of the family's openness */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(6px * var(--scale));  /* name + role read as one unit */
}

/* The location (f2) — the third VOICE: the family's signature wide tracked caps. */
.lower-third-extra {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* the smallest voice in the stack */
  font-weight: 500;                 /* medium keeps tracked caps crisp at this size */
  line-height: 1.4;                 /* wide tracking needs matching leading */
  letter-spacing: var(--label-tracking);  /* 0.34em — the family's signature */
  text-transform: uppercase;        /* SVALBARD, NORWAY — whatever the operator types */
  color: var(--label-color);        /* dimmed — colour belongs to the footage in this family */
  margin-top: calc(14px * var(--scale));  /* separated — the location is its own beat */
}`,
    hasAccent: true,
  }),
);
