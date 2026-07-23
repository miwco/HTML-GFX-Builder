// bug16 "Clear Mark" — the LOGO-ONLY minimal bug: no panel, no caption, no accent. Just the
// logo over the video, lifted by a soft drop shadow, in the smallest footprint the catalog
// offers. Sibling of bug04 Hairline Bug and lt01 Hairline. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug16: TemplateVariant = defineBugVariant(
  {
    id: 'bug16',
    category: 'corner-bug',
    name: 'Clear Mark',
    styleTag: 'minimal',
    description: 'Logo only: the bare logo over the video, with nothing else around it.',
    // Logo-only by design: the graphic has no text fields, so the wizard offers none.
    maxLines: 0,
    suggestedLines: [],
    logo: 'built-in',
    animationPresets: ['fade', 'blur-in', 'slide-down', 'slide-up', 'pop-spring'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'top-right',
  },
  {
    name: 'Clear Mark',
    description:
      'The quietest bug in the catalog: the imported logo — or, until one is picked, a LOGO placeholder box — ' +
      'alone over the video, carried by a soft drop shadow. No panel, no caption, no accent — ' +
      'exactly what a broadcaster wants up for hours at a time.',
    uicolor: '2',
  },
  (o) => {
    // Logo-only: with no text lines the image field is the graphic's first (and only) field.
    const slot = {
      field: `f${o.lines.length + o.extraFields.length}`,
      path: o.logoAssetPath ?? '',
      title: 'Logo',
    };

    return {
      html: `    <!-- Clear Mark: the logo alone over the video. -->
    <div class="corner-bug-box">
${bugSlotHtml(slot, 'label')}
    </div>`,

      extraFields: [bugSlotField(slot)],

      css: `/* No panel at all — the box is just the mark's frame of reference. */
.corner-bug-box {
  display: flex;                   /* one child, the mark */
}

${bugSlotCss({ width: 96, height: 96, mark: 'label' })}

/* The logo carries its own shadow here — there is no panel to lift it off the video. */
.corner-bug-logo {
  filter: drop-shadow(0 2px 12px rgba(0, 0, 0, 0.55));  /* readable over bright footage */
}`,

      hasAccent: false, // no accent element at all: minimal keeps this one to the mark
    };
  },
);
