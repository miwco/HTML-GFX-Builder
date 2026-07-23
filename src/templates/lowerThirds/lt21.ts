// lt21 "Right Rail" — the RIGHT-ANCHORED minimal lower third: lt01's hairline mirrored, with the
// line standing on the right of the text and every line ragged-left. It ships because a
// right-anchored graphic is not a left one moved across the frame — the accent has to change
// sides or it ends up buried under the text it is supposed to introduce.
//
// Its default entrance is Slide left (in from the right edge), the direction of travel that
// matches where the graphic lives.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt21: TemplateVariant = defineVariant(
  {
    id: 'lt21',
    category: 'lower-third',
    name: 'Right Rail',
    styleTag: 'minimal',
    description: 'Right-anchored twin of the hairline: type ragged-left against a right-edge rule.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Title', sample: 'Chief Correspondent' },
    ],
    logo: 'none',
    // Enters from the edge it lives on; line-reveal stays available for the vertical rule.
    animationPresets: ['slide-left', 'fade', 'line-reveal', 'blur-in', 'slide-up'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-right',
  },
  {
    name: 'Right Rail',
    description:
      'The hairline design mirrored for the right side of the frame: a thin vertical accent rule ' +
      'on the right, the name and title set ragged-left against it. Use it when the subject sits ' +
      'frame-left, or as the second strap in a two-person interview. Sibling of lt01 Hairline.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Right Rail: [text block, ragged-left] | [vertical accent rule on the right]. -->
    <div class="lower-third-box">
${lineMasks(o)}
    </div>
    <div class="lower-third-accent"></div>`,
    css: `/* The hairline — the same rule as lt01, moved to the block's right edge. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  right: 0;                         /* sits at the block's RIGHT edge */
  top: 0;                           /* stretches from the very top… */
  bottom: 0;                        /* …to the very bottom of the text block */
  width: var(--accent-weight);      /* the family's accent-line weight */
  background: var(--accent);        /* the one small, sharp dose of accent color */
  will-change: transform;           /* hint the browser: presets animate this line */
}

/* The text block — transparent, aligned toward the rule it stands against. */
.lower-third-box {
  text-align: right;                /* lines are ragged-LEFT: they align to the right rule */
  padding-right: calc(27px * var(--scale));  /* room for the 3px rule + a generous 24px gap */
}

/* Name line — big and confident; the only heavy element in the design. */
.lower-third-name {
  font-size: calc(54px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.08;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);         /* primary text color */
}

/* Title line — quiet on purpose: smaller, lighter, dimmed. */
.lower-third-title {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* ≈2.2:1 below the name — clear hierarchy */
  font-weight: 400;                 /* regular weight; contrast comes from the name */
  line-height: 1.3;                 /* secondary text gets room to breathe */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(6px * var(--scale));  /* small gap: name + title read as one unit */
}`,
    hasAccent: true,
  }),
);
