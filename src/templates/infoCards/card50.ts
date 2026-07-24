// card50 "Scripture" — the reading card: a verse on screen while it is read aloud, in a
// service, a wedding, a funeral or a broadcast devotional. Minimal family, sibling of card01
// (Hairline Card) and lt01.
//
// The design problem here is not decoration, it is READING. A congregation and a camera are
// both looking at this at once, so the verse has to survive being read slowly by a room and
// glanced at by a viewer: a generous measure, a real reading line-height, and no ornament
// competing with the words. The reference is set small underneath because it is a citation,
// not part of the text.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCardVariant, cardLineMasks } from './shared';

export const card50: TemplateVariant = defineCardVariant(
  {
    id: 'card50',
    category: 'info-card',
    name: 'Scripture',
    styleTag: 'minimal',
    description: 'A reading card built for reading — generous measure, quiet accent, citation underneath.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Verse', sample: 'For God has not given us a spirit of fear, but of power and of love and of a sound mind.' },
      { title: 'Reference', sample: '2 Timothy 1:7' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'line-reveal', 'slide-up', 'blur-in'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Scripture',
    description:
      'A verse set for reading aloud: a wide measure, prose line-height, and a short accent ' +
      'rule above it as the only mark on the card. The reference sits beneath in tracked ' +
      'caps — a citation, deliberately not part of the sentence.',
    uicolor: '1',
  },
  (o) => ({
    // The rule is the accent element, so the standard presets grow it in ahead of the words.
    html: `    <!-- Scripture: a short accent rule above the verse, with the citation beneath. -->
    <div class="info-card-accent"></div>
    <div class="info-card-box">
${cardLineMasks(o)}
    </div>`,
    css: `/* The rule — a short horizontal stroke above the verse. Unlike card01's vertical
   hairline this one sits ABOVE the text, because a centered reading has no left edge. */
.info-card-accent {
  width: calc(72px * var(--scale));  /* a short stroke — a mark, not a divider */
  height: var(--accent-weight);      /* the family's accent-line weight */
  margin: 0 auto calc(34px * var(--scale));  /* centered, with clear air below it */
  background: var(--accent);         /* the one small, sharp dose of accent color */
  transform-origin: center;          /* presets that scale it grow it from the middle */
  will-change: transform;            /* hint the browser: presets animate this line */
}

/* The text block — no panel. A verse over a still or a calm shot needs nothing behind it. */
.info-card-box {
  text-align: center;                /* a reading is centered, like a printed order of service */
}

/* The verse — the whole card. Sized so a long passage still fits without shrinking to
   caption size, and led generously because this is prose, not a headline. */
.info-card-name {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* reading size, not headline size */
  font-weight: 400;                  /* regular: scripture is read, never shouted */
  line-height: 1.45;                 /* prose leading — the single most important value here */
  letter-spacing: 0;                 /* no tracking games on running text */
  color: var(--text-color);          /* primary text color */
  overflow-wrap: break-word;         /* break very long unbroken words */
  text-wrap: balance;                /* wrapped rows get even lengths */
}

/* The citation — small tracked caps, clearly outside the sentence. */
.info-card-title {
  display: block;                    /* its own row under the verse */
  margin-top: calc(30px * var(--scale));  /* a clear break: the citation is not the reading */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* ~1.9:1 under the verse */
  font-weight: 600;                  /* firm enough for small caps to carry */
  line-height: 1.3;                  /* one or two rows at most */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;         /* reads as a citation, whatever the operator types */
  color: var(--label-color);         /* the family's label color */
}

/* Any further line the operator adds — kept in the citation's quiet voice. */
.info-card-extra {
  display: block;                    /* its own row */
  margin-top: calc(10px * var(--scale));  /* close to the citation it follows */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the card's smallest type */
  font-weight: 400;                  /* conversational weight */
  line-height: 1.35;                 /* comfortable if it wraps */
  color: var(--text-dim);            /* secondary text color */
}`,
    hasAccent: true,
    tokens: {
      accentWeight: 'calc(2px * var(--scale))',
      labelTracking: '0.2em',
    },
  }),
);
