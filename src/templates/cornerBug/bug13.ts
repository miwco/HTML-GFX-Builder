// bug13 "House Mark" — the LOGO-ONLY house bug. No caption at all: the channel logo (or the
// LOGO placeholder box) over a short amber rule, sitting bare on the video. This is the
// bug a channel leaves up for an entire broadcast, so it carries the least possible furniture.
// Sibling of bug02 House Clock. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug13: TemplateVariant = defineBugVariant(
  {
    id: 'bug13',
    category: 'corner-bug',
    name: 'House Mark',
    styleTag: 'noacg',
    description: 'Logo only: the house mark over a short amber rule, with no caption at all.',
    // Logo-only by design: the graphic has no text fields, so the wizard offers none.
    maxLines: 0,
    suggestedLines: [],
    logo: 'built-in',
    animationPresets: ['fade', 'blur-in', 'slide-up', 'pop-spring', 'slide-down'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'top-left',
  },
  {
    name: 'House Mark',
    description:
      'The logo-only house bug: the imported logo — or, until one is picked, a LOGO placeholder ' +
      'box — over ' +
      'a short amber rule, bare on the video with a soft shadow. Nothing else: this one is ' +
      'meant to sit in the corner for a whole broadcast.',
    uicolor: '4',
  },
  (o) => {
    // Logo-only: with no text lines the image field is the graphic's first (and only) field.
    const slot = {
      field: `f${o.lines.length + o.extraFields.length}`,
      path: o.logoAssetPath ?? '',
      title: 'Logo',
    };

    return {
      html: `    <!-- House Mark: the logo, then a short amber rule. No caption. -->
    <div class="corner-bug-box">
${bugSlotHtml(slot, 'label')}
      <!-- The accent rule — the design's single colour moment. -->
      <div class="corner-bug-rule"></div>
    </div>`,

      extraFields: [bugSlotField(slot)],

      css: `/* No panel: the mark and its rule sit bare over the video, hugging the same edge. */
.corner-bug-box {
  display: flex;                   /* the mark and the rule stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: flex-start;         /* both hug the same left edge */
  gap: calc(10px * var(--scale));  /* air between the mark and the rule */
}

${bugSlotCss({ width: 108, height: 64, mark: 'label', radius: '0', align: 'left center' })}

/* The logo carries its own shadow here — there is no panel to lift it off the video. */
.corner-bug-logo {
  filter: drop-shadow(0 2px 12px rgba(0, 0, 0, 0.55));  /* readable over bright footage */
}

/* The accent rule — short on purpose: a mark, not a line across the frame. */
.corner-bug-rule {
  width: calc(44px * var(--scale));   /* a short stroke */
  height: var(--accent-weight);       /* the family's bar thickness */
  background: var(--accent);          /* the one accent colour */
  box-shadow: var(--accent-glow);     /* the house glow, on the accent only */
}`,

      hasAccent: false, // the accent moment is the rule beneath the mark, not a drawn line element
    };
  },
);
