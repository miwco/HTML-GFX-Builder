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
    hasLogoSlot: false,
    animationPresets: ['line-reveal', 'slide-fade', 'mask-wipe'],
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
  width: calc(8px * var(--scale));  /* the house bar weight (§8 noacg tokens) */
  background: var(--accent);        /* the one accent surface */
  box-shadow: 0 0 calc(22px * var(--scale)) color-mix(in srgb, var(--accent) 60%, transparent);
  will-change: transform;           /* hint the browser: presets grow this bar in */
}

/* The panel — the house void: near-black, translucent, softly blurring the video. */
.lower-third-box {
  margin-left: calc(8px * var(--scale));    /* starts where the accent bar ends */
  padding: calc(24px * var(--scale)) calc(56px * var(--scale)) calc(24px * var(--scale)) calc(34px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: blur(8px);       /* the house blur — subtle, not frosted glass */
  -webkit-backdrop-filter: blur(8px);  /* Safari spelling of the same effect */
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.5);  /* one deep lifting shadow */
}

/* Name line — the confident display moment. */
.lower-third-name {
  font-size: calc(54px * var(--scale));  /* headline size (values are 1080p reference) */
  font-weight: 700;                 /* full display weight */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: -0.01em;          /* large sizes tighten slightly */
  color: var(--text-color);         /* primary text color */
}

/* Title line — the house label voice: mono, caps, tracked wide, in the accent color. */
.lower-third-title,
.lower-third-extra {
  font-family: "JetBrains Mono", Consolas, "Courier New", monospace;  /* the house label face */
  font-size: calc(22px * var(--scale));  /* label scale — clearly subordinate */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.3;                 /* a touch of air if the title wraps */
  letter-spacing: 0.22em;           /* wide tracking — the label breathes */
  text-transform: uppercase;        /* reads as a technical label */
  color: var(--accent);             /* the label carries the accent, not a second white */
  margin-top: calc(14px * var(--scale));  /* name + title read as one unit */
}`,
    hasAccent: true,
  }),
);
