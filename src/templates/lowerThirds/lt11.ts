// lt11 "House Strap" — the NoaCG house lower third (family flagship), rebuilt from the
// brand kit's lower-third-name overlay: an 8px amber bar with a restrained glow fused to
// a void blur panel, a confident display name, and a mono kicker title in the accent
// color. The catalog piece every other noacg variant is judged against.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineVariant, lineMasks } from './shared';

export const lt11: TemplateVariant = defineVariant(
  {
    id: 'lt11',
    category: 'lower-third',
    name: 'House Strap',
    styleTag: 'noacg',
    description: 'The NoaCG house strap: amber accent bar, void blur panel, mono kicker title.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Noa Haline' },
      { title: 'Title', sample: 'Anchor · Evening News' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'House Strap',
    description:
      'The NoaCG house lower third: one 8px accent bar with a restrained glow standing ' +
      'against a dark blur panel, a bold display name, and a tracking-wide mono title in ' +
      'the accent color. The reference piece of the house family.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- House Strap structure: [8px accent bar] | [void blur panel with the lines]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The accent bar — 8px, fused to the panel's left edge, with the house's one glow.
   The glow follows the accent color (color-mix), so retinting keeps it coherent. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  left: 0;                          /* at the very left edge */
  top: 0;                           /* full panel height… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  box-shadow: var(--accent-glow);   /* the family's glow — follows the accent color */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}

/* The panel — the house void: near-black, translucent, softly blurring the video. */
.lower-third-box {
  margin-left: var(--accent-weight);        /* starts where the accent bar ends */
  padding: calc(24px * var(--scale)) calc(56px * var(--scale)) calc(24px * var(--scale)) calc(34px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);       /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* one deep lifting shadow */
}

/* Name line — the confident display moment. */
.lower-third-name {
  font-size: calc(54px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* full display weight */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large sizes tighten slightly */
  color: var(--text-color);         /* primary text color */
}

/* Title line — the house label voice: mono, caps, tracked wide, in the accent color. */
.lower-third-title,
.lower-third-extra {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* label scale — clearly subordinate */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.3;                 /* a touch of air if the title wraps */
  letter-spacing: var(--label-tracking);  /* wide tracking — the label breathes */
  text-transform: uppercase;        /* reads as a technical label */
  color: var(--label-color);        /* the label carries the accent, not a second white */
  margin-top: calc(14px * var(--scale));  /* name + title read as one unit */
}`,
    hasAccent: true,
    // The flagship strap tracks its label a notch wider than the family's 0.2em. Kept as
    // authored; whether the family should follow lt11 or lt11 should follow the family is a
    // conformance question, not a conversion one.
    tokens: { labelTracking: '0.22em' },
  }),
);
