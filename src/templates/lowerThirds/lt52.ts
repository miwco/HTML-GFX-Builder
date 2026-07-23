// lt52 "House Right" — the right-anchored house strap: the 8 px amber bar moved to the panel's
// trailing edge, with the name and mono role ragged-left against it. It exists so a two-guest
// interview can run house graphics on both sides without one of them pointing its bar into the
// middle of the picture.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineVariant, lineMasks } from './shared';

export const lt52: TemplateVariant = defineVariant(
  {
    id: 'lt52',
    category: 'lower-third',
    name: 'House Right',
    styleTag: 'noacg',
    description: 'The house strap mirrored: accent bar on the right, type ragged-left.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Noa Haline' },
      { title: 'Title', sample: 'Anchor · Evening News' },
    ],
    logo: 'none',
    animationPresets: ['slide-left', 'line-reveal', 'mask-wipe', 'fade', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-right',
  },
  {
    name: 'House Right',
    description:
      'The house strap for the right of the frame: the amber bar on the outside edge, the void ' +
      'panel beside it, the name and mono role set ragged-left. Pairs with lt11 House Strap on ' +
      'the opposite side. Sibling of lt11 House Strap.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- House Right: [void panel: name / mono role] | [8px accent bar on the right]. -->
    <div class="lower-third-box">
${lineMasks(o)}
    </div>
    <div class="lower-third-accent"></div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The accent bar — the house's 8px bar, fused to the panel's RIGHT edge. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  right: 0;                         /* at the very right edge */
  top: 0;                           /* full panel height… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  box-shadow: var(--accent-glow);   /* the family's accent glow */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}

/* The panel — the house void, ending where the bar begins. */
.lower-third-box {
  margin-right: var(--accent-weight);  /* stops where the accent bar starts — fused */
  text-align: right;                /* lines are ragged-LEFT: they align to the bar */
  padding: calc(20px * var(--scale)) calc(30px * var(--scale)) calc(22px * var(--scale)) calc(56px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
}

/* The name — the strap's one heavy element. */
.lower-third-name {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The role — the house label voice: mono caps, tracked, in the accent colour. */
.lower-third-title {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* clearly below the name */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.3;                 /* a single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* whatever the operator types reads as a label */
  color: var(--label-color);        /* the family's label colour (the accent) */
  margin-top: calc(10px * var(--scale));  /* clear air below the name */
}`,
    hasAccent: true,
  }),
);
