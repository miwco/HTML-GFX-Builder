// card53 "Translation" — the bilingual caption: what was said, and what it means. Glass
// family, sibling of card03 (Frosted Panel) and lt10.
//
// The layout answers one question: which language is the audience reading? For a translated
// service, a subtitled interview or an international ceremony, the SOURCE is context and the
// TRANSLATION is the thing being read — so this design inverts the usual hierarchy. The first
// field (spoken) is set small and dimmed with a language tag beside it; the second field (the
// translation) gets the size, the weight and the brightness.
//
// It is anchored at the bottom, like every caption that has to live under a talking head.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCardVariant, cardLineMasks } from './shared';

export const card53: TemplateVariant = defineCardVariant(
  {
    id: 'card53',
    category: 'info-card',
    name: 'Translation',
    styleTag: 'glass',
    description: 'Spoken line above, translation below and brighter — the language the audience reads leads.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Spoken', sample: 'Vi er glade for å ønske dere alle velkommen i kveld.' },
      { title: 'Translation', sample: 'We are delighted to welcome you all this evening.' },
      { title: 'Language note', sample: 'Norwegian → English' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'slide-up', 'line-reveal', 'blur-in'],
    defaultPalette: paletteById('mint'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Translation',
    description:
      'A bilingual caption band: the spoken line small and dimmed behind an accent bar, the ' +
      'translation beneath it at full reading size and brightness, and an optional language ' +
      'note in tracked caps. The line the audience actually reads is the one that leads.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Translation: a frosted band — spoken line, then the translation, then the note. -->
    <div class="info-card-box">
${cardLineMasks(o)}
    </div>`,
    css: `/* The band — a wide, shallow frosted panel: a caption sits across the bottom of the
   picture, never as a block in the middle of it. */
.info-card-box {
  padding: calc(24px * var(--scale)) calc(44px * var(--scale));  /* comfortable band padding */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* THE SPOKEN LINE. Small, dimmed, and marked with an accent bar down its left edge — the
   bar is what says "this is the other language" without spending a word on it. */
.info-card-name {
  display: block;                  /* its own row, so the accent bar spans its full height */
  padding-left: calc(18px * var(--scale));  /* room for the bar plus a real gap */
  border-left: var(--accent-weight) solid var(--accent);  /* the source-language marker */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* context size, not reading size */
  font-weight: 400;                /* regular — this line is reference, not the message */
  font-style: italic;              /* the second visual cue that it is the source language */
  line-height: 1.35;               /* comfortable if the sentence wraps */
  color: var(--text-dim);          /* secondary text color */
  overflow-wrap: break-word;       /* break very long unbroken words */
}

/* THE TRANSLATION. Full reading size and brightness: this is what the audience is reading. */
.info-card-title {
  display: block;                  /* its own row under the spoken line */
  margin-top: calc(14px * var(--scale));  /* a clear break between the two languages */
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* ~1.6:1 over the spoken line */
  font-weight: 600;                /* solid without shouting */
  line-height: 1.3;                /* a caption almost always wraps to two rows */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* the brightest thing in the band */
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped rows get even lengths */
}

/* THE LANGUAGE NOTE. Optional, tracked caps, the smallest thing on the card. */
.info-card-extra {
  display: block;                  /* its own row */
  margin-top: calc(14px * var(--scale));  /* clear of the translation */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* the band's smallest type */
  font-weight: 600;                /* firm enough for small caps to carry */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a tag, not as speech */
  color: var(--label-color);       /* the family's label color */
}`,
    hasAccent: false,
    tokens: {
      accentWeight: 'calc(3px * var(--scale))',
      labelTracking: '0.16em',
    },
  }),
);
