// lt14 "House Handle" — the NoaCG social mark, built as lt11's small sibling. Same house
// grammar (8px amber bar fused to a void blur panel, mono label in the accent colour), shrunk
// to a follow-me strip that sits bottom-right for a whole segment without competing with
// whatever else is on screen.
//
// It deliberately does NOT use lt09's full pill: the house token set is radius 0 on panels,
// 6px on chips, so a 999px pill would read as a different family standing next to lt11.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineVariant, lineMasks } from './shared';

export const lt14: TemplateVariant = defineVariant(
  {
    id: 'lt14',
    category: 'lower-third',
    name: 'House Handle',
    styleTag: 'noacg',
    description: 'The house social mark: compact void strip, amber bar, mono platform label.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Handle', sample: '@noacg' },
      { title: 'Platform', sample: 'INSTAGRAM' },
    ],
    logo: 'none',
    animationPresets: ['slide-up', 'fade', 'line-reveal', 'mask-wipe', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-right',
  },
  {
    name: 'House Handle',
    description:
      'A compact social strip in the house grammar: the amber bar against a void blur ' +
      'panel, the handle in display type, and the platform as a tracked mono label in the ' +
      'accent colour. Sized to persist through a segment rather than announce itself.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- House Handle: [amber bar] | [void panel: handle over platform label]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The accent bar — the house's 8px, at the panel's left edge. No glow here: a mark that
   stays on screen for a whole segment should sit quieter than a lower third does. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned root */
  left: 0;                          /* the panel's leading edge */
  top: 0;                           /* full height… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  will-change: transform;           /* hint: presets grow this bar in */
}

/* The panel — the house void, tighter than a strap's: this is a mark, not a title. */
.lower-third-box {
  margin-left: calc(8px * var(--scale));  /* starts where the bar ends */
  padding: calc(14px * var(--scale)) calc(26px * var(--scale)) calc(14px * var(--scale)) calc(20px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* the panel's authored lift */
}

/* The handle — the line the viewer is meant to read and remember. */
.lower-third-name {
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* well under the strap's 54px */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                 /* tight */
  letter-spacing: var(--display-tracking);  /* the handle's authored tracking */
  color: var(--text-color);         /* primary text */
}

/* The platform — the house label voice, one step smaller than the strap's title. */
.lower-third-title,
.lower-third-extra {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* clearly subordinate */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.3;                 /* air if it wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* a technical label, not a sentence */
  color: var(--label-color);        /* the family's label color */
  margin-top: calc(7px * var(--scale));  /* handle + platform read as one unit */
}`,
    hasAccent: true,
    tokens: {
      panelShadow: '0 12px 34px rgba(0, 0, 0, 0.45)',
      displayTracking: '-0.005em',
    },
  }),
);
