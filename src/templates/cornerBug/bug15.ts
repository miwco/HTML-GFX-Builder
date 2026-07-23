// bug15 "Block Mark" — the LOGO-ONLY sport bug: the club or channel logo on a solid slab with
// the accent fused along its bottom edge. Square corners, hard offset shadow, no text. Sibling
// of bug03 Slab Bug and lt05/lt06. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug15: TemplateVariant = defineBugVariant(
  {
    id: 'bug15',
    category: 'corner-bug',
    name: 'Block Mark',
    styleTag: 'sport',
    description: 'Logo only: a solid slab with the logo and a fused accent edge — no text.',
    // Logo-only by design: the graphic has no text fields, so the wizard offers none.
    maxLines: 0,
    suggestedLines: [],
    logo: 'built-in',
    animationPresets: ['pop-spring', 'slide-down', 'snap-stinger', 'fade', 'blur-in'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'top-right',
  },
  {
    name: 'Block Mark',
    description:
      'The logo-only sport bug: the imported logo — or, until one is picked, a LOGO placeholder box — on a ' +
      'square-cornered slab with the accent fused along its bottom edge, lifted by the ' +
      "family's hard offset shadow. No caption — the mark carries the identity.",
    uicolor: '5',
  },
  (o) => {
    // Logo-only: with no text lines the image field is the graphic's first (and only) field.
    const slot = {
      field: `f${o.lines.length + o.extraFields.length}`,
      path: o.logoAssetPath ?? '',
      title: 'Logo',
    };

    return {
      html: `    <!-- Block Mark: the logo on a slab, with the accent fused along the bottom edge. -->
    <div class="corner-bug-box">
${bugSlotHtml(slot, 'label')}
    </div>`,

      extraFields: [bugSlotField(slot)],

      css: `/* The slab — solid, square-cornered, with the accent fused along its bottom edge. */
.corner-bug-box {
  display: flex;                   /* one child, centred inside the slab */
  padding: calc(14px * var(--scale));  /* even air around the mark */
  background: var(--panel-bg);     /* the solid slab */
  border-bottom: var(--accent-weight) solid var(--accent);  /* the one accent moment */
  border-radius: var(--panel-radius);  /* sport is square-cornered */
  box-shadow: var(--panel-shadow); /* the family's hard offset shadow */
}

${bugSlotCss({ width: 92, height: 62, mark: 'label', radius: '0' })}`,

      hasAccent: false, // the accent moment is the slab's fused bottom edge, not an element
    };
  },
);
