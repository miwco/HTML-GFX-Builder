// lt13 "House Interview" — the NoaCG three-line interview strap, rebuilt from the brand
// kit's lower-third-interview overlay: the lt11 bar + void panel carrying a name, a quiet
// organisation line, and a mono location line in the accent color. Sibling of lt11
// House Strap — same surfaces, one more voice.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineVariant, lineMasks } from './shared';

export const lt13: TemplateVariant = defineVariant(
  {
    id: 'lt13',
    category: 'lower-third',
    name: 'House Interview',
    styleTag: 'noacg',
    description: 'Three-line interview strap: name, organisation, and a mono location line.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'Dr. Leena Virtanen' },
      { title: 'Organisation', sample: 'Climate Policy Institute' },
      { title: 'Location', sample: 'Live · Helsinki' },
    ],
    hasLogoSlot: false,
    animationPresets: ['line-reveal', 'mask-wipe', 'slide-fade'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'House Interview',
    description:
      'The house strap built for interviews: the 8px accent bar and void blur panel of lt11 ' +
      'carrying three voices — a bold name, a quiet organisation line, and a tracked mono ' +
      'location line in the accent color. Made for steps mode: reveal one line per Continue.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- House Interview structure: [8px accent bar] | [void panel: name / org / location]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The accent bar — 8px, fused to the panel's left edge, with the house's one glow. */
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
  padding: calc(24px * var(--scale)) calc(64px * var(--scale)) calc(26px * var(--scale)) calc(34px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: blur(8px);       /* the house blur — subtle, not frosted glass */
  -webkit-backdrop-filter: blur(8px);  /* Safari spelling of the same effect */
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.5);  /* one deep lifting shadow */
}

/* Name (f0) — the strap's one heavy element. */
.lower-third-name {
  font-size: calc(50px * var(--scale));  /* headline size (values are 1080p reference) */
  font-weight: 700;                 /* full display weight */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: -0.01em;          /* large sizes tighten slightly */
  color: var(--text-color);         /* primary text color */
}

/* Organisation (f1) — the quiet middle voice. */
.lower-third-title {
  font-size: calc(28px * var(--scale));  /* clearly below the name */
  font-weight: 400;                 /* regular — hierarchy comes from the name's weight */
  line-height: 1.25;                /* room if the organisation wraps */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(12px * var(--scale));  /* a clear but connected break below the name */
}

/* Location (f2) — the house label voice: mono caps, tracked, in the accent color. */
.lower-third-extra {
  font-family: "JetBrains Mono", Consolas, "Courier New", monospace;  /* the house label face */
  font-size: calc(20px * var(--scale));  /* the smallest voice on the strap */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.3;                 /* single tight label line */
  letter-spacing: 0.2em;            /* wide tracking — the label breathes */
  text-transform: uppercase;        /* LIVE · HELSINKI, whatever the operator types */
  color: var(--accent);             /* the label carries the accent */
  margin-top: calc(16px * var(--scale));  /* separated — the location is its own beat */
}`,
    hasAccent: true,
  }),
);
