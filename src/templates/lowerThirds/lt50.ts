// lt50 "House Tag" — the house family's name-only strap: the 8 px amber bar and void blur panel of
// lt11, holding one line. It is the compact house graphic — the one to leave under a presenter
// between full straps, and the house answer to lt19, lt31, lt39 and lt48.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt50: TemplateVariant = defineVariant(
  {
    id: 'lt50',
    category: 'lower-third',
    name: 'House Tag',
    styleTag: 'noacg',
    description: 'The house bar and void panel carrying a single name — the compact house strap.',
    maxLines: 1,
    suggestedLines: [{ title: 'Name', sample: 'Noa Haline' }],
    logo: 'none',
    animationPresets: ['line-reveal', 'mask-wipe', 'slide-up', 'fade', 'slide-right'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'House Tag',
    description:
      'The house strap reduced to one line: the 8 px amber bar with its restrained glow, the void ' +
      'blur panel, and a name. For a host the audience already knows, or as the quiet strap ' +
      'between fuller ones. Sibling of lt11 House Strap.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- House Tag: [8px accent bar] | [void panel: one name]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `/* The accent bar — 8px, fused to the panel's left edge, with the house's one glow. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  left: 0;                          /* at the very left edge */
  top: 0;                           /* full panel height… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  box-shadow: var(--accent-glow);   /* the family's accent glow */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}

/* The panel — the house void: near-black, translucent, softly blurring the video. */
.lower-third-box {
  margin-left: var(--accent-weight);  /* starts where the accent bar ends */
  padding: calc(16px * var(--scale)) calc(48px * var(--scale)) calc(18px * var(--scale)) calc(28px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
}

/* The name — the graphic's only voice. */
.lower-third-name {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}`,
    hasAccent: true,
  }),
);
