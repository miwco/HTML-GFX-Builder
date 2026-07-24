// bug26 "Frost Event Bug" — the GLASS event ident: a frosted tile stacking the event logo, the
// event name and its day/venue line. Drawn for a top-right safe area and sized to stay there
// through a session. Sibling of lt08 Frosted Card and bug01 Glass Mark. See DESIGN_LANGUAGE §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug26: TemplateVariant = defineBugVariant(
  {
    id: 'bug26',
    category: 'corner-bug',
    name: 'Frost Event Bug',
    styleTag: 'glass',
    description: 'A frosted event tile: the event logo above its name and the day or venue.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Event', sample: 'Northern Light Festival' },
      { title: 'Detail', sample: 'STAGE TWO · SATURDAY' },
    ],
    logo: 'built-in',
    animationPresets: ['blur-in', 'fade', 'pop-spring', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('orchid'),
    defaultFontId: 'manrope',
    defaultZone: 'top-right',
  },
  {
    name: 'Frost Event Bug',
    description:
      'The glass event ident: a translucent blurred tile with the event logo (or an accent ' +
      'lozenge placeholder) centred above the event name and a soft caps line for the day, ' +
      'stage or venue. Sibling of the lt08 Frosted Card.',
    uicolor: '3',
  },
  (o) => {
    // The event logo is a real SPX image field ("filelist"); its id comes after every wizard
    // field so nothing collides.
    const slot = {
      field: `f${o.lines.length + o.extraFields.length}`,
      path: o.logoAssetPath ?? '',
      title: 'Event logo',
    };

    return {
      html: `    <!-- Frost Event Bug: the event logo above the event name and its detail line. -->
    <div class="corner-bug-box">
${bugSlotHtml(slot, 'diamond')}
${bugLineMasks(o)}
    </div>`,

      extraFields: [bugSlotField(slot)],

      css: `/* The tile — translucent glass, heavy blur, hairline keyline, one soft lift. Everything
   stacks and centres inside it. */
.corner-bug-box {
  display: flex;                   /* mark and lines stack as one column */
  flex-direction: column;          /* top to bottom */
  align-items: center;             /* centred on the tile's axis */
  text-align: center;              /* wrapped rows centre too (overrides the zone alignment) */
  padding: calc(16px * var(--scale)) calc(20px * var(--scale));  /* even air inside the tile */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

${bugSlotCss({ width: 66, height: 66, mark: 'diamond', radius: 'calc(12px * var(--scale))' })}

/* The event name (f0) — the line the viewer reads first. */
.corner-bug-name {
  margin-top: calc(10px * var(--scale));  /* air between the mark and the name */
  font-size: calc(18px * var(--scale) * var(--type-scale));   /* compact — a mark, not a title */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text */
}

/* The detail (f1) — day, stage or venue, as a soft caps label in the accent colour. */
.corner-bug-title,
.corner-bug-extra {
  margin-top: calc(5px * var(--scale));  /* the lines read as one lockup */
  font-size: calc(11px * var(--scale) * var(--type-scale));   /* clearly subordinate */
  font-weight: 600;                /* semibold keeps small caps crisp */
  line-height: 1.3;                /* air if it wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* glass carries the accent in the label */
  /* The glass tile is only a 10 % white wash, so a small accent label sits almost directly
     on the footage. One soft shadow keeps this line readable over a bright shot. */
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.55);
}`,

      hasAccent: false, // the accent moment is the placeholder lozenge and the detail colour
    };
  },
);
