// lt48 "Glass Tag" — the glass family's name-only tag, anchored bottom-right: a small frosted
// capsule with an accent dot before one line of type. It is the least assertive graphic in the
// pack: small enough to sit under a returning guest for a whole segment without ever becoming the
// thing the viewer looks at.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt48: TemplateVariant = defineVariant(
  {
    id: 'lt48',
    category: 'lower-third',
    name: 'Glass Tag',
    styleTag: 'glass',
    description: 'A small right-anchored frosted capsule: an accent dot and one name.',
    maxLines: 1,
    suggestedLines: [{ title: 'Name', sample: 'Sofia Lindqvist' }],
    logo: 'none',
    animationPresets: ['pop-spring', 'blur-in', 'fade', 'slide-left', 'slide-up'],
    defaultPalette: paletteById('mint'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-right',
  },
  {
    name: 'Glass Tag',
    description:
      'A quiet frosted capsule for the corner of the frame: one accent dot, one name. Made to sit ' +
      'under a guest for a long stretch — a returning panellist, a remote contributor — where a ' +
      'full strap would have to be pulled after a few seconds. Sibling of lt09 Gradient Pill.',
    uicolor: '3',
  },
  (o) => ({
    html: `    <!-- Glass Tag: [accent dot] [one name] inside a small frosted capsule. -->
    <div class="lower-third-box">
      <div class="lower-third-accent"></div>
${lineMasks(o, '      ')}
    </div>`,
    css: `/* The capsule — fully rounded, the family's frosted surface at its smallest. */
.lower-third-box {
  display: flex;                   /* the dot and the name sit side by side */
  align-items: center;             /* …vertically centred against each other */
  gap: calc(14px * var(--scale));  /* the gap between dot and name */
  padding: calc(12px * var(--scale)) calc(26px * var(--scale));
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: 999px;            /* fully rounded — a capsule, not a card */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* The dot — glass geometry: the family's accent as a circle rather than a bar. */
.lower-third-accent {
  width: calc(10px * var(--scale));   /* dot diameter */
  height: calc(10px * var(--scale));  /* …kept square so the radius makes a circle */
  border-radius: 50%;              /* the circle itself */
  background: var(--accent);       /* the one accent surface in the design */
  flex: none;                      /* never squeezed by a long name */
  will-change: transform;          /* hint the browser: presets animate this dot */
}

/* The name — the graphic's only voice, sized to persist rather than to announce. */
.lower-third-name {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* small on purpose: this graphic stays up */
  font-weight: var(--display-weight);  /* the glass families run heavier weights */
  line-height: 1.15;               /* one comfortable line */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}`,
    hasAccent: true,
  }),
);
