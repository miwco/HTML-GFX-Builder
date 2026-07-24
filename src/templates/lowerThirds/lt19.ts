// lt19 "Rule Under" — the NAME-ONLY minimal lower third. One line of type with a rule drawn
// under it, and nothing else: no panel, no title line, no second colour. It exists because the
// commonest live need of all — put this person's name on screen — was only ever served by
// two-line designs that leave an empty role line when there is no role to give.
//
// The rule sits under the name and spans exactly the name's width, because the root box
// shrink-wraps its content: a longer name draws a longer rule, with no measuring code.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt19: TemplateVariant = defineVariant(
  {
    id: 'lt19',
    category: 'lower-third',
    name: 'Rule Under',
    styleTag: 'minimal',
    description: 'Name only, over a rule that draws itself to the name\'s own width.',
    maxLines: 1,
    suggestedLines: [{ title: 'Name', sample: 'Alexandra Riva' }],
    logo: 'none',
    // The rule IS the entrance, so line-reveal (which draws the accent first) leads.
    animationPresets: ['line-reveal', 'slide-up', 'fade', 'mask-wipe', 'slide-down'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Rule Under',
    description:
      'The name-only strap: one confident line of type with an accent rule under it and nothing ' +
      'else on screen. Use it when the person needs no introduction, or when a role line would ' +
      'just repeat what the host already said. Sibling of lt01 Hairline — same restraint, turned ' +
      'ninety degrees.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Rule Under: [name] over [an accent rule spanning the name's width]. -->
    <div class="lower-third-box">
${lineMasks(o)}
    </div>
    <div class="lower-third-accent"></div>`,
    css: `/* The rule — pinned to the bottom of the graphic, spanning its full width. The root
   shrink-wraps the name, so the rule always measures exactly as wide as the name is. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  left: 0;                          /* from the block's left edge… */
  right: 0;                         /* …to its right edge — i.e. the name's own width */
  bottom: 0;                        /* sits under the name */
  height: var(--accent-weight);     /* the family's accent-line weight */
  background: var(--accent);        /* the one small, sharp dose of accent color */
  will-change: transform;           /* hint the browser: presets draw this rule in */
}

/* The text block — transparent, with room under the name for the rule to sit clear of it. */
.lower-third-box {
  padding-bottom: calc(16px * var(--scale));  /* air between the baseline and the rule */
}

/* The name — the graphic's only voice, so it carries all the confidence. */
.lower-third-name {
  font-size: calc(58px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);         /* primary text color */
}`,
    hasAccent: true,
  }),
);
