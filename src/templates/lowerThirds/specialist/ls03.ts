// ls03 "Duo Void" — the NoaCG house strap, built for two people.
//
// The house lower third (lt11/lt13) is one 8px amber bar against a void panel. This is that
// same graphic asked to carry a second person: the bar stays where it is — the house's
// identity is the bar, and moving it per-person would make two graphics out of one — and the
// panel widens into two columns with a quiet amber hairline between them.
//
// Sibling of lt13 House Interview, which names ONE person and their location; this names two
// and lets the panel say who is who.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { fontById, labelFontFaceCss } from '../../../model/fonts';
import { defineVariant } from '../shared';
import { duoGridCss, duoSplitBalanced, personColumn } from './shared';

export const ls03: TemplateVariant = defineVariant(
  {
    id: 'ls03',
    category: 'lower-third',
    name: 'Duo Void',
    styleTag: 'noacg',
    description: 'The house void panel widened for two — one amber bar, two named columns.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Left name', sample: 'Dr. Leena Virtanen' },
      { title: 'Left role', sample: 'Climate Policy Institute' },
      { title: 'Right name', sample: 'Tomas Reid' },
      { title: 'Right role', sample: 'Energy Correspondent' },
    ],
    logo: 'none',
    // The bar grows first, then the names rise behind their masks — the house entrance,
    // unchanged from lt11/lt13, so the pair reads as a sibling of the single-person strap.
    animationPresets: ['line-reveal', 'mask-wipe', 'slide-up', 'fade', 'slide-down', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Duo Void',
    description:
      'The house strap carrying two people: the 8px accent bar and void blur panel of lt11, ' +
      'widened into two content-sized columns split by an amber hairline. Each person has ' +
      'their own name and role fields; the columns track their own text, so unequal names ' +
      'never force a symmetric split the type does not support.',
    uicolor: '4',
  },
  (o) => {
    const { left, right } = duoSplitBalanced(o);
    const classes = {
      column: 'lower-third-person',
      name: 'lower-third-name',
      role: 'lower-third-title',
    };
    const divider = left.length > 0 && right.length > 0
      ? '\n        <!-- The amber hairline — only while both people are present. -->\n        <div class="lower-third-divider"></div>'
      : '';

    return {
      html: `    <!-- House structure: [8px accent bar] | [void panel: two named columns]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${personColumn(o, left, classes, '        ')}${divider}
${personColumn(o, right, classes, '        ')}
    </div>`,

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The accent bar — 8px, fused to the panel's left edge, with the house's one glow. */
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

${duoGridCss({ gap: 'calc(30px * var(--scale))', columnMax: 'calc(460px * var(--scale))', divider: true })}

/* The panel — the house void, starting where the accent bar ends. The grid declarations
   above set the two-column structure; these are its surface and its room. */
.lower-third-box {
  margin-left: calc(8px * var(--scale));    /* starts where the accent bar ends */
  padding: calc(24px * var(--scale)) calc(46px * var(--scale)) calc(26px * var(--scale)) calc(34px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
}

/* The hairline between the two columns takes the house colour, not the neutral one:
   inside a void panel a grey rule reads as an artefact, an amber one reads as intent. */
.lower-third-divider {
  background: var(--accent);        /* the house's colour, used quietly */
  opacity: 0.35;                    /* a hairline, never a second accent bar */
}

/* Each person's name — the panel's heavy voice. */
.lower-third-name {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.08;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* Each person's role — the house label voice: mono caps, tracked, in the accent color. */
.lower-third-title {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* the quietest voice on the strap */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.3;                 /* room if the role wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* label voice, whatever the operator types */
  color: var(--label-color);        /* the family's label color */
  margin-top: calc(12px * var(--scale));  /* the role is its own beat below the name */
}`,
      hasAccent: true,
    };
  },
);
