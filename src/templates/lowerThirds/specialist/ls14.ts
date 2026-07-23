// ls14 "Pulpit" — the church speaker strap.
//
// Worship streams are the clearest case in this pack of context deciding motion. Everything
// else here is competing for attention; this is not. A strap that snaps or pops during a
// sermon is wrong in a way no amount of restyling fixes — it reads as an interruption of the
// thing the stream exists to carry. So the entrance is a plain fade, the palette is quiet,
// the panel is soft, and the accent is a hairline rule rather than a coloured block.
//
// The hierarchy is also inverted from a news strap: the ROLE leads. A congregation knows
// their pastor's name and is being told, week to week, who is speaking today and in what
// capacity — visiting speaker, elder, worship leader — so the capacity is the useful fact and
// it sits above the name in the accent, small and set as a label.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { slot } from './shared';

export const ls14: TemplateVariant = defineVariant(
  {
    id: 'ls14',
    category: 'lower-third',
    name: 'Pulpit',
    styleTag: 'minimal',
    roleTag: 'faith',
    keywords: ['church', 'pastor', 'sermon', 'worship', 'service', 'speaker', 'congregation', 'ministry', 'faith'],
    description: 'A quiet speaker strap with the role above the name — calm entrance, hairline accent.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Role', sample: 'Lead Pastor' },
      { title: 'Name', sample: 'Rev. Miriam Adeyemi' },
      { title: 'Congregation', sample: 'Grace Community Church' },
    ],
    logo: 'none',
    // Fade leads deliberately: during a sermon the strap must appear without announcing
    // itself. Every other option here is slower than the pack's default, never faster.
    animationPresets: ['fade', 'blur-in', 'line-reveal', 'slide-up', 'mask-wipe', 'slide-down'],
    defaultPalette: paletteById('porcelain'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Pulpit',
    description:
      'The worship-service speaker strap: the role set small and coloured above the name, ' +
      'the congregation beneath, on a soft light panel with a hairline accent. The entrance ' +
      'is a plain fade because a sermon strap that snaps reads as an interruption — the ' +
      'motion is part of the design decision here, not a setting on top of it.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- The strap: a hairline rule, then role · name · congregation. -->
    <div class="lower-third-box">
      <div class="lower-third-accent"></div>
${slot(o, 0, 'lower-third-name')}
${slot(o, 1, 'lower-third-title')}
${slot(o, 2, 'lower-third-extra')}
    </div>`,

    css: `/* The panel — light, soft-cornered, barely lifted. A worship graphic sits ON the
   picture rather than over it, so the surface stays close to paper. */
.lower-third-box {
  padding: calc(22px * var(--scale)) calc(46px * var(--scale)) calc(24px * var(--scale)) calc(30px * var(--scale));
  background: var(--panel-bg);      /* the minimal family's quiet panel */
  border-radius: var(--panel-radius);  /* the family's corner radius */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
  max-width: calc(660px * var(--scale));  /* tighter than the category auto-fit: a church
                                             name is often long, and a strap running half
                                             the frame stops being quiet */
}

/* The hairline — short, above the type, drawn rather than filled. It is the only accent
   surface on the graphic, and at 2px it is a punctuation mark, not a bar. */
.lower-third-accent {
  width: calc(46px * var(--scale));  /* a short mark, not a rule across the panel */
  height: calc(2px * var(--scale));  /* a hairline — the family's bar weight would shout here */
  background: var(--accent);        /* the one accent surface */
  margin-bottom: calc(14px * var(--scale));  /* air between the mark and the label */
  transform-origin: left center;    /* line-reveal draws it from this end */
}

/* The ROLE (f0) leads — see the file header. Small, tracked, in the accent: a label, not
   a name, because what changes week to week is the capacity, not the person. */
.lower-third-name {
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* label size — deliberately the smallest voice */
  font-weight: 600;                 /* semibold — small tracked caps need weight to hold */
  line-height: 1.2;                 /* single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* LEAD PASTOR, whatever the operator types */
  color: var(--accent);             /* the label carries the colour */
}

/* The NAME (f1) — the strap's headline, set in the panel's own ink rather than in white:
   on a light panel the dark text IS the primary colour. */
.lower-third-title {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: 600;                 /* semibold: present without shouting */
  line-height: 1.12;                /* room for an honorific and a wrapped surname */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
  margin-top: calc(8px * var(--scale));  /* tied to the label above it */
}

/* The congregation (f2) — the quiet closing line. */
.lower-third-extra {
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* clearly below the name */
  font-weight: 400;                 /* regular — hierarchy comes from the name's weight */
  line-height: 1.3;                 /* room if the congregation's name wraps */
  color: var(--text-dim);           /* dimmed — never the primary ink twice */
  margin-top: calc(6px * var(--scale));  /* tied to the name above it */
}`,
    hasAccent: true,
  }),
);
