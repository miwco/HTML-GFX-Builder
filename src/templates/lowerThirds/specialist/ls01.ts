// ls01 "Split Interview" — the two-person news interview strap: EQUAL BILLING.
//
// Drawn from the remote two-box interview every rolling-news channel runs (the anchor in one
// window, the guest in the other). The composition follows the picture: two content-sized
// columns under one rule that draws across BOTH of them, so the graphic reads as one strap
// naming two people rather than two straps that happen to be adjacent. Neither person is
// styled above the other — in this format they are peers, and the moment either name gets a
// heavier weight the graphic starts making an editorial claim it wasn't asked to make.
//
// Panel-free like the rest of the minimal family (lt01/lt02): the rule and the type do the
// work, and a text shadow carries them over bright footage.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { duoGridCss, duoSplitBalanced, personColumn } from './shared';

export const ls01: TemplateVariant = defineVariant(
  {
    id: 'ls01',
    category: 'lower-third',
    name: 'Split Interview',
    styleTag: 'minimal',
    roleTag: 'interview',
    keywords: ['two people', 'double', 'dual', 'remote', 'guest', 'two-box', 'panel', 'news'],
    description: 'Two people named side by side under one drawn rule — equal billing, independent fields.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Left name', sample: 'Elena Marchetti' },
      { title: 'Left role', sample: 'Europe Correspondent' },
      { title: 'Right name', sample: 'Bo Li' },
      { title: 'Right role', sample: 'Trade Policy Analyst' },
    ],
    logo: 'none',
    // Line reveal leads because the rule is the composition's binding element: it draws
    // across both columns first, and only then do the names rise. The pair is established
    // as a pair before either person is named.
    animationPresets: ['line-reveal', 'fade', 'mask-wipe', 'slide-up', 'slide-down', 'blur-in'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Split Interview',
    description:
      'The two-person interview strap: two content-sized columns, each carrying its own ' +
      'name and role as independent SPX fields, separated by a hairline and bound by one ' +
      'accent rule drawn across the pair. Columns track their own text, so a short name and ' +
      'a long one sit together without either being padded or squeezed. Remove the role ' +
      'lines and it becomes the classic two-names strap.',
    uicolor: '2',
  },
  (o) => {
    const { left, right } = duoSplitBalanced(o);
    const classes = {
      column: 'lower-third-person',
      name: 'lower-third-name',
      role: 'lower-third-title',
    };
    // The divider is drawn only when there is genuinely something on both sides — with a
    // single line left, this design has to degrade to an ordinary one-person strap, and a
    // rule floating beside nothing would be the tell that it hadn't.
    const divider = left.length > 0 && right.length > 0
      ? '\n      <!-- Separator — drawn only while both people are present. -->\n      <div class="lower-third-divider"></div>'
      : '';

    return {
      html: `    <!-- The accent rule, drawn across the whole pair: one strap, two people. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${personColumn(o, left, classes)}${divider}
${personColumn(o, right, classes)}
    </div>`,

      css: `/* The rule above the pair. It spans the box because the root shrink-wraps to the
   box's width, so 100% here is exactly as wide as the two columns turned out to be. */
.lower-third-accent {
  width: 100%;                      /* as wide as the pair below it */
  height: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  margin-bottom: calc(18px * var(--scale));  /* air between the rule and the names */
  transform-origin: left center;    /* the line-reveal preset draws it from this end */
}

${duoGridCss({ gap: 'calc(34px * var(--scale))', columnMax: 'calc(520px * var(--scale))', divider: true })}

/* Each person's name — the pair's primary voice, identical on both sides on purpose. */
.lower-third-name {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: 600;                 /* semibold: present without shouting */
  line-height: 1.1;                 /* big text sits tight; still room for a wrapped surname */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.55);  /* panel-free: the shadow carries it over bright video */
}

/* Each person's role — the quiet second voice. */
.lower-third-title {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* clearly below the name (2:1) */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.3;                 /* room if the role wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* the label voice */
  color: var(--label-color);        /* the family's label color */
  margin-top: calc(8px * var(--scale));  /* tied to the name above it */
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);  /* same reason as the name */
}`,
      hasAccent: true,
    };
  },
);
