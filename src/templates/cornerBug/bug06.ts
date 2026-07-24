// bug06 "Frost Ident" — the GLASS station/show ident, the corner-scale sibling of lt08
// Frosted Card and bug01 Glass Mark: one frosted tile holding the channel logo, an accent dot,
// and the channel name over the show on air. Drawn for a top-left safe area and sized to stay
// there all segment. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug06: TemplateVariant = defineBugVariant(
  {
    id: 'bug06',
    category: 'corner-bug',
    name: 'Frost Ident',
    styleTag: 'glass',
    description: 'A frosted ident tile: the channel logo, an accent dot, the channel over its show.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Channel', sample: 'Northside' },
      { title: 'Show', sample: 'MIDNIGHT SESSIONS' },
    ],
    logo: 'built-in',
    animationPresets: ['blur-in', 'fade', 'pop-spring', 'slide-right', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'top-left',
  },
  {
    name: 'Frost Ident',
    description:
      'A compact frosted tile carrying the channel identity: the logo (or an accent lozenge ' +
      'placeholder) beside a small accent dot, the channel name, and the show currently on air ' +
      'as a soft caps label. Sibling of the lt08 Frosted Card.',
    uicolor: '3',
  },
  (o) => {
    // The logo is a real SPX image field ("filelist"); its id comes after every wizard field.
    const slot = {
      field: `f${o.lines.length + o.extraFields.length}`,
      path: o.logoAssetPath ?? '',
      title: 'Logo',
    };

    return {
      html: `    <!-- Frost Ident: one frosted tile — logo, accent dot, channel over show. -->
    <div class="corner-bug-box">
${bugSlotHtml(slot, 'diamond')}
      <div class="corner-bug-text">
        <!-- The accent dot — the glass family's colour moment, standing before the channel. -->
        <div class="corner-bug-accent"></div>
${bugLineMasks(o, '        ')}
      </div>
    </div>`,

      extraFields: [bugSlotField(slot)],

      css: `/* The tile — translucent glass, heavy backdrop blur, hairline keyline, one soft lift.
   The lockup inside runs horizontally: mark, then the text column. */
.corner-bug-box {
  display: flex;                   /* the mark and the text sit side by side */
  align-items: center;             /* both centered on the lockup's axis */
  gap: calc(14px * var(--scale));  /* air between the mark and the text */
  padding: calc(14px * var(--scale)) calc(20px * var(--scale));  /* even air inside the tile */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

${bugSlotCss({ width: 48, height: 48, mark: 'diamond', radius: 'calc(12px * var(--scale))' })}

/* The text column — the channel over the show, left-aligned beside the mark. */
.corner-bug-text {
  position: relative;              /* the accent dot positions against this column */
  display: flex;                   /* the two lines stack… */
  flex-direction: column;          /* …top to bottom */
  padding-left: calc(18px * var(--scale));  /* room for the dot before the channel */
  text-align: left;                /* both lines hug the same edge (overrides the zone) */
}

/* The accent dot — small and round: glass draws dots, never slabs. */
.corner-bug-accent {
  position: absolute;              /* pinned to the text column's left edge */
  left: 0;                         /* at the start of the lines */
  top: calc(9px * var(--scale));   /* aligned with the channel's cap height */
  width: calc(9px * var(--scale)); /* a small dot… */
  height: calc(9px * var(--scale));/* …round */
  border-radius: 50%;              /* the glass dot */
  background: var(--accent);       /* the one accent moment */
  will-change: transform;          /* hint the browser: presets may pop this */
}

/* The channel (f0) — the name the viewer should recognise at a glance. */
.corner-bug-name {
  font-size: calc(21px * var(--scale) * var(--type-scale));   /* compact — a mark, not a title */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                /* tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text */
}

/* The show (f1) — a soft caps label under the channel, in the accent colour. */
.corner-bug-title,
.corner-bug-extra {
  margin-top: calc(4px * var(--scale));  /* the two lines read as one lockup */
  font-size: calc(12px * var(--scale) * var(--type-scale));   /* clearly subordinate */
  font-weight: 600;                /* semibold keeps small caps crisp */
  line-height: 1.3;                /* air if it wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* glass carries the accent in the label */
}`,

      hasAccent: true,
    };
  },
);
