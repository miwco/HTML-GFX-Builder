// card54 "Wedding Card" — the title card for a wedding stream: the couple, the date, the
// place. Minimal family, sibling of card07 (Clean Title) and lt01.
//
// The one structural decision: the two names are ONE field, not two. Every "Name & Name"
// layout that splits them has to choose a side for the ampersand, and then has to decide what
// happens when one name is much longer than the other — and every answer to that looks like
// an opinion about the couple. One centred line with the ampersand typed in is neutral,
// wraps sanely, and is what the printed stationery does.
//
// The rules above and below the names are the whole ornament, and they are a fixed short
// length rather than the width of the text: a rule that resizes with the names would grow
// every time the couple has long surnames.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCardVariant, cardLineMasks } from './shared';

export const card54: TemplateVariant = defineCardVariant(
  {
    id: 'card54',
    category: 'info-card',
    name: 'Wedding Card',
    styleTag: 'minimal',
    description: 'The couple, the date, the place — set as printed stationery, between two short rules.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Couple', sample: 'Ada & Jonas' },
      { title: 'Date', sample: 'Saturday, the fourteenth of June' },
      { title: 'Place', sample: 'St Mary’s, Ambleside' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'line-reveal', 'blur-in', 'slide-up'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Wedding Card',
    description:
      'A wedding title card set like stationery: the couple’s names large and light between ' +
      'two short accent rules, the date beneath in tracked caps, and the place quietest of ' +
      'all. Both names live in one field, so the ampersand sits where you type it.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Wedding Card: a rule, the names, a rule, then the date and the place. -->
    <div class="info-card-box">
${cardLineMasks(o)}
    </div>`,
    css: `/* The card — no panel. Wedding graphics sit over a still, a venue shot or a soft
   colour wash, and a box would be the one hard-edged thing in the frame. */
.info-card-box {
  padding: calc(6px * var(--scale)) 0;  /* the rules provide the real vertical structure */
  text-align: center;              /* stationery is centered */
}

/* THE NAMES. Large and LIGHT — weight would make this read as a title card for an event
   rather than as an invitation. */
.info-card-name {
  display: block;                  /* its own row, so the rules can sit above and below it */
  padding: calc(30px * var(--scale)) 0;  /* generous air between the names and both rules */
  border-top: var(--accent-weight) solid var(--accent);     /* the rule above the names */
  border-bottom: var(--accent-weight) solid var(--accent);  /* and the one below */
  width: calc(560px * var(--scale));  /* the rules' length — fixed, so they never track the names */
  margin: 0 auto;                  /* centered on the card */
  font-size: calc(64px * var(--scale) * var(--type-scale));  /* the card's one large line */
  font-weight: 300;                /* light: an invitation, not an announcement */
  line-height: 1.15;               /* big text sits tight */
  letter-spacing: 0.01em;          /* light type at this size wants a little air, not less */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken names */
  text-wrap: balance;              /* if the names wrap, the two rows stay even */
}

/* THE DATE. Tracked caps under the lower rule — the formal line of the card. */
.info-card-title {
  display: block;                  /* its own row */
  margin-top: calc(26px * var(--scale));  /* clear of the rule above it */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* label scale — the names lead */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.35;               /* a spelled-out date may wrap */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* the formal voice of printed stationery */
  color: var(--label-color);       /* the family's label color */
}

/* THE PLACE. The quietest line on the card. */
.info-card-extra {
  display: block;                  /* its own row */
  margin-top: calc(10px * var(--scale));  /* date and place read as one block */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* just under the date */
  font-weight: 400;                /* conversational weight */
  line-height: 1.35;               /* a full venue address may wrap */
  color: var(--text-dim);          /* secondary text color */
}`,
    hasAccent: false,
    tokens: {
      accentWeight: 'calc(1px * var(--scale))',
      labelTracking: '0.24em',
    },
  }),
);
