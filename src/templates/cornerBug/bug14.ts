// bug14 "Frost Mark" — the LOGO-ONLY glass bug: one small frosted tile holding nothing but the
// logo. No caption, no clock, no rule — the quietest persistent mark in the family, drawn for
// the top-right safe area. Sibling of bug01 Glass Mark. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug14: TemplateVariant = defineBugVariant(
  {
    id: 'bug14',
    category: 'corner-bug',
    name: 'Frost Mark',
    styleTag: 'glass',
    description: 'Logo only: one small frosted tile holding the logo and nothing else.',
    // Logo-only by design: the graphic has no text fields, so the wizard offers none.
    maxLines: 0,
    suggestedLines: [],
    logo: 'built-in',
    animationPresets: ['blur-in', 'fade', 'pop-spring', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'top-right',
  },
  {
    name: 'Frost Mark',
    description:
      'The logo-only glass bug: a translucent blurred tile with a hairline keyline and one ' +
      'soft lift, holding the imported logo — or, until one is picked, a LOGO placeholder box. No text at ' +
      'all — the calmest way to keep a brand on screen.',
    uicolor: '3',
  },
  (o) => {
    // Logo-only: with no text lines the image field is the graphic's first (and only) field.
    const slot = {
      field: `f${o.lines.length + o.extraFields.length}`,
      path: o.logoAssetPath ?? '',
      title: 'Logo',
    };

    return {
      html: `    <!-- Frost Mark: one frosted tile, one logo. Nothing else. -->
    <div class="corner-bug-box">
${bugSlotHtml(slot, 'label')}
    </div>`,

      extraFields: [bugSlotField(slot)],

      css: `/* The tile — translucent glass, heavy backdrop blur, hairline keyline, one soft lift. */
.corner-bug-box {
  display: flex;                   /* one child, centred inside the tile */
  padding: calc(16px * var(--scale));  /* even air on all four sides */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

${bugSlotCss({ width: 88, height: 88, mark: 'label', radius: 'calc(12px * var(--scale))' })}`,

      hasAccent: false, // the accent moment is the placeholder box's keyline, not a separate element
    };
  },
);
