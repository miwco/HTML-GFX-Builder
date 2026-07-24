// card55 "In Memoriam" — the memorial card: one person, their years, and a line about them.
// Minimal family, sibling of card07 (Clean Title) and cr11 (Roll of Remembrance), which is the
// same job done as a list.
//
// The restraint here is deliberate and total. No panel, no keyline, no glow, no accent bar —
// the only colour on the card is one hairline under the name, and even that is softened. The
// name is set light rather than bold: weight reads as emphasis, and emphasis on a memorial
// card reads as promotion.
//
// The years are tabular so a sequence of these cards has its dates in the same place every
// time — which matters when a broadcast runs several in a row.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCardVariant, cardLineMasks } from './shared';

export const card55: TemplateVariant = defineCardVariant(
  {
    id: 'card55',
    category: 'info-card',
    name: 'In Memoriam',
    styleTag: 'minimal',
    description: 'One name, the years, one line — with every decoration the other cards carry removed.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'Ada Fenwick' },
      { title: 'Years', sample: '1948 – 2026' },
      { title: 'Line', sample: 'Teacher, gardener, and the best of us' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'blur-in', 'line-reveal'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'In Memoriam',
    description:
      'A memorial card stripped to three lines: the name set large and light, the years ' +
      'beneath a softened hairline in tabular figures, and one sentence at the bottom. No ' +
      'panel, no accent bar, nothing that could read as emphasis.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- In Memoriam: the name, a softened hairline, the years, and one line. -->
    <div class="info-card-box">
${cardLineMasks(o)}
    </div>`,
    css: `/* The card — nothing behind the words. On a memorial the picture underneath (a still,
   a candle, a plain wash) is part of the graphic, and a panel would cut it in half. */
.info-card-box {
  text-align: center;              /* a memorial card is centered */
}

/* THE NAME. Large and light. Weight would read as emphasis, and there is nothing here to
   emphasise: the person is the whole content of the card. */
.info-card-name {
  font-size: calc(68px * var(--scale) * var(--type-scale));  /* the card's one large line */
  font-weight: 300;                /* light on purpose — see above */
  line-height: 1.15;               /* big text sits tight */
  letter-spacing: 0.01em;          /* light type at this size wants a little air */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken names */
  text-wrap: balance;              /* wrapped rows get even lengths */
}

/* THE YEARS. Under a softened hairline — the only colour anywhere on the card, and it is
   deliberately below full accent strength. */
.info-card-title {
  display: block;                  /* its own row */
  width: calc(200px * var(--scale));  /* the hairline's length — short, fixed, centered */
  margin: calc(28px * var(--scale)) auto 0;  /* air above; centered on the card */
  padding-top: calc(24px * var(--scale));    /* air between the hairline and the years */
  border-top: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);  /* the softened rule */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* ~2.6:1 under the name */
  font-weight: 400;                /* the card's one weight for everything but the name */
  line-height: 1.3;                /* one row in every realistic case */
  letter-spacing: 0.06em;          /* dates read better with a little air */
  font-variant-numeric: tabular-nums;  /* a run of these cards keeps its dates aligned */
  color: var(--text-dim);          /* secondary text color */
}

/* THE LINE. One sentence about the person — the quietest thing on the card. */
.info-card-extra {
  display: block;                  /* its own row */
  max-width: calc(680px * var(--scale));  /* a reading measure, so a long sentence stays readable */
  margin: calc(22px * var(--scale)) auto 0;  /* air above; centered under the years */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* just under the years */
  font-weight: 400;                /* conversational weight */
  line-height: 1.4;                /* prose leading — this line is read, not scanned */
  color: var(--text-dim);          /* secondary text color */
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped rows get even lengths */
}`,
    hasAccent: false,
  }),
);
