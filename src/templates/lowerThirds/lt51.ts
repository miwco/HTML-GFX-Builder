// lt51 "House Center" — the centre-anchored house strap. The 8 px bar cannot simply move: a
// vertical bar beside a centred block would break the symmetry it is supposed to serve, so here it
// becomes a horizontal bar ACROSS THE TOP of the void panel — the same weight, the same glow, the
// same fused relationship to the panel, turned through ninety degrees.
//
// Sibling of lt11 House Strap: identical materials, a different axis.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineVariant, lineMasks } from './shared';

export const lt51: TemplateVariant = defineVariant(
  {
    id: 'lt51',
    category: 'lower-third',
    name: 'House Center',
    styleTag: 'noacg',
    description: 'The house bar turned horizontal across a centred void panel — name and mono role.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Noa Haline' },
      { title: 'Title', sample: 'Anchor · Evening News' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'mask-wipe', 'fade', 'slide-up', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-center',
  },
  {
    name: 'House Center',
    description:
      'The house strap for centre-frame shots: the 8 px amber bar laid horizontally across the top ' +
      'of the void panel, with the name and a mono role line centred beneath it. Sibling of lt11 ' +
      'House Strap — same bar, same void, turned through ninety degrees.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- House Center: [8px accent bar across the top] over [void panel: name / mono role]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The accent bar — the house's 8px bar, laid across the panel's top edge. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  top: 0;                           /* the topmost element of the composition */
  left: 0;                          /* spans the panel's full width… */
  right: 0;                         /* …edge to edge */
  height: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  box-shadow: var(--accent-glow);   /* the family's accent glow */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}

/* The panel — the house void, starting where the bar ends. */
.lower-third-box {
  margin-top: var(--accent-weight);  /* starts where the accent bar ends — fused */
  text-align: center;               /* the symmetric composition this design is built on */
  padding: calc(20px * var(--scale)) calc(56px * var(--scale)) calc(22px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
}

/* The name — the strap's one heavy element. */
.lower-third-name {
  font-size: calc(44px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.06;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The role — the house label voice: mono caps, tracked, in the accent colour. */
.lower-third-title {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* clearly below the name */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.3;                 /* a single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  margin-right: calc(-1 * var(--label-tracking));  /* letter-spacing trails the LAST glyph too;
                                       without this the centred line sits left of centre */
  text-transform: uppercase;        /* whatever the operator types reads as a label */
  color: var(--label-color);        /* the family's label colour (the accent) */
  margin-top: calc(10px * var(--scale));  /* clear air below the name */
}`,
    hasAccent: true,
  }),
);
