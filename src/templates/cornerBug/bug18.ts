// bug18 "Frost Sponsor Strip" — the GLASS partner strip: one frosted bar with the kicker set
// inline at the left and three sponsor slots running to its right. Drawn for the bottom safe
// area. Sibling of lt08 Frosted Card and bug01 Glass Mark. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug18: TemplateVariant = defineBugVariant(
  {
    id: 'bug18',
    category: 'corner-bug',
    name: 'Frost Sponsor Strip',
    styleTag: 'glass',
    description: 'A frosted partner bar: the kicker inline at the left, three sponsor slots beside it.',
    maxLines: 1,
    suggestedLines: [{ title: 'Kicker', sample: 'IN PARTNERSHIP WITH' }],
    logo: 'built-in',
    animationPresets: ['blur-in', 'slide-up', 'fade', 'pop-spring', 'slide-down'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Frost Sponsor Strip',
    description:
      'The glass partner bar: a translucent blurred strip with the kicker set inline at the ' +
      'left, an accent hairline, and three sponsor logo slots running to its right. Each slot ' +
      'is its own SPX image field, so partners swap between segments without a redesign.',
    uicolor: '3',
  },
  (o) => {
    // Three real SPX image fields ("filelist"), numbered after every wizard field. An unused
    // slot keeps its placeholder — the strip's shape never depends on filling all three.
    const base = o.lines.length + o.extraFields.length;
    const slots = [
      { field: `f${base}`, path: o.logoAssetPath ?? '', title: 'Sponsor 1' },
      { field: `f${base + 1}`, path: '', title: 'Sponsor 2' },
      { field: `f${base + 2}`, path: '', title: 'Sponsor 3' },
    ];

    return {
      html: `    <!-- Frost Sponsor Strip: the kicker, an accent hairline, then three sponsor slots. -->
    <div class="corner-bug-box">
${bugLineMasks(o)}
      <!-- The accent hairline — the strip's single colour moment, dividing words from marks. -->
      <div class="corner-bug-accent"></div>
      <div class="corner-bug-row">
${slots.map((s) => bugSlotHtml(s, 'diamond', '        ')).join('\n')}
      </div>
    </div>`,

      extraFields: slots.map(bugSlotField),

      css: `/* The bar — translucent glass, heavy blur, hairline keyline, one soft lift.
   A sponsor strip is wider than a corner caption, so it opts out of the bug width cap:
   the row of marks IS the graphic, and wrapping it would break the lockup. */
.corner-bug-box {
  max-width: none;                 /* the strip sizes to its marks, not to the caption cap */
  display: flex;                   /* kicker, hairline and marks sit side by side */
  align-items: center;             /* everything centred on the bar's axis */
  gap: calc(18px * var(--scale));  /* even air between the three pieces */
  padding: calc(12px * var(--scale)) calc(24px * var(--scale));  /* even air inside the bar */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* The kicker (f0) — a soft caps label, deliberately quieter than the marks it introduces. */
.corner-bug-name {
  font-size: calc(12px * var(--scale) * var(--type-scale));   /* tiny label size */
  font-weight: 600;                /* semibold keeps small caps crisp */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* glass carries the accent in the label */
  white-space: nowrap;             /* the kicker stays on one line beside the marks */
}

/* The accent hairline — a short vertical stroke between the words and the marks. */
.corner-bug-accent {
  width: var(--accent-weight);     /* the family's stroke weight */
  height: calc(26px * var(--scale));  /* a short stroke, not a full-height edge */
  border-radius: 999px;            /* softened ends — glass never draws hard corners */
  background: var(--accent);       /* the one accent moment */
  flex: none;                      /* never squeezed by the row beside it */
}

/* The row — the three sponsor marks, evenly spaced across the bar. */
.corner-bug-row {
  display: flex;                   /* the marks sit side by side */
  align-items: center;             /* all on one baseline */
  gap: calc(26px * var(--scale));  /* generous air — partner marks must not read as one logo */
}

${bugSlotCss({ width: 88, height: 38, mark: 'diamond', radius: 'calc(8px * var(--scale))' })}`,

      hasAccent: true,
    };
  },
);
