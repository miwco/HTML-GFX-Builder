// lt18 "Line Handle" — the MINIMAL social handle, small sibling of lt01/lt02: no panel, a
// short vertical accent hairline standing beside a handle over its platform. Parks bottom-right
// for a segment, carried over footage by a soft text shadow. The hairline is a real element,
// so the social-handle graphic type can address it.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt18: TemplateVariant = defineVariant(
  {
    id: 'lt18',
    category: 'lower-third',
    name: 'Line Handle',
    styleTag: 'minimal',
    description: 'A panel-free social mark: a handle over its platform beside a thin accent hairline.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Handle', sample: '@marcuschen' },
      { title: 'Platform', sample: 'YOUTUBE' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-right',
  },
  {
    name: 'Line Handle',
    description:
      'A panel-free minimal social mark in the lt01 family: a thin vertical accent hairline ' +
      'standing beside a handle over a dimmed platform label, carried over the picture by a ' +
      'soft text shadow. Sized to sit bottom-right through a segment. Sibling of lt01 Hairline.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Line Handle: [vertical hairline] | [handle over platform], no panel. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `/* The hairline — a thin vertical accent line spanning the mark's height (lt01 geometry).
   A real element, so the graphic type can address it; presets grow it in. */
.lower-third-accent {
  position: absolute;              /* pinned inside the positioned root */
  left: 0;                         /* stands at the mark's left edge */
  top: 0;                          /* from the top… */
  bottom: 0;                       /* …to the bottom of the text */
  width: var(--accent-weight);     /* the family's hairline weight (3px) */
  background: var(--accent);       /* the one small, sharp accent dose */
  will-change: transform;          /* hint the browser: line-reveal scales this */
}

/* The text block — transparent: no panel, whitespace and a text shadow do the work. */
.lower-third-box {
  padding-left: calc(20px * var(--scale));  /* room for the hairline + a gap */
}

/* The handle — the line the viewer reads, kept legible over footage. */
.lower-third-name {
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* compact — a mark, not a headline */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                /* tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);        /* primary text color */
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);  /* readable over bright footage */
}

/* The platform — a dimmed caps label under the handle. */
.lower-third-title,
.lower-third-extra {
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* clearly subordinate */
  font-weight: 500;                /* regular-plus; contrast comes from the handle */
  line-height: 1.3;                /* air if it wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a platform label, not a sentence */
  color: var(--text-dim);          /* dimmed — never pure white twice */
  margin-top: calc(5px * var(--scale));  /* handle + platform read as one unit */
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);  /* readable over bright footage */
}`,
    hasAccent: true,
  }),
);
