// card56 "Award Card" — the category and the winner, for an awards show, a prize-giving, a
// sports presentation or a staff-recognition segment. House style, sibling of card05 (House
// Title) and lt11.
//
// The reason this is its own design rather than a title card with different words: an award
// has a BEAT. The category goes up, it holds while the presenter reads the nominees, and then
// the winner lands. That beat is exactly what SPX Continue is for — so this card is built to
// be created with "Reveal step by step" switched on in the wizard's Animation step, which
// makes the category step one and the winner a press away.
//
// Created without it the card still works: everything simply appears together, which is what
// you want when the graphic is following the announcement rather than making it.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineCardVariant, cardLineMasks } from './shared';

export const card56: TemplateVariant = defineCardVariant(
  {
    id: 'card56',
    category: 'info-card',
    name: 'Award Card',
    styleTag: 'noacg',
    description: 'Category, winner, citation — built for the Continue beat: hold the category, then land the name.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Category', sample: 'BROADCAST DESIGN OF THE YEAR' },
      { title: 'Winner', sample: 'Northlight Studios' },
      { title: 'Citation', sample: 'for “The Long Night”, BBC Two' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'pop-spring', 'blur-in', 'fade', 'slide-up'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'Award Card',
    description:
      'The house award card: the category as a mono label on an amber rail, the winner in ' +
      'big display type, and the citation beneath. Turn on “Reveal step by step” when you ' +
      'create it and the winner waits for a Continue press.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- Award Card: void panel — amber rail, mono category, winner, citation. -->
    <div class="info-card-accent"></div>
    <div class="info-card-box">
${cardLineMasks(o)}
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The rail — a vertical accent stroke down the left of the panel; the house's edge grammar.
   It is the .info-card-accent element, so the standard presets grow it in ahead of the text. */
.info-card-accent {
  position: absolute;              /* pinned inside the positioned .info-card root */
  left: 0;                         /* at the panel's left edge */
  top: 0;                          /* from the very top… */
  bottom: 0;                       /* …to the very bottom */
  width: var(--accent-weight);     /* the family's accent weight, used as a width */
  background: var(--accent);       /* the one sharp dose of accent color */
  box-shadow: var(--accent-glow);  /* the house glow, on the accent element only */
  will-change: transform;          /* hint the browser: presets animate this rail */
}

/* The panel — the house void, opened up to award-card size. */
.info-card-box {
  /* The rail is absolutely positioned at the root's left edge, and the panel is painted
     AFTER it in document order — so without this margin the panel's background covers the
     rail completely. Reserving exactly the rail's own width is what keeps it visible. */
  margin-left: var(--accent-weight);  /* the strip the rail occupies */
  padding: calc(40px * var(--scale)) calc(56px * var(--scale));  /* generous card air */
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
}

/* THE CATEGORY. The mono label voice — it announces the award, it is not the award. */
.info-card-name {
  display: block;                  /* its own row */
  font-family: var(--font-label);  /* the family's mono label face */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* label scale */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.3;                /* a long category may wrap to two rows */
  letter-spacing: var(--label-tracking);  /* wide tracking — the label breathes */
  text-transform: uppercase;       /* label voice, whatever the operator types */
  color: var(--label-color);       /* the label carries the accent */
}

/* THE WINNER. The moment the whole card exists for. */
.info-card-title {
  display: block;                  /* its own row */
  margin-top: calc(20px * var(--scale));  /* a clear beat between the category and the name */
  font-size: calc(62px * var(--scale) * var(--type-scale));  /* ~2.8:1 over the category */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* the brightest thing on the card */
  overflow-wrap: break-word;       /* break very long unbroken names */
  text-wrap: balance;              /* wrapped rows get even lengths */
}

/* THE CITATION. What the award was for — quiet, and third in line for a reason. */
.info-card-extra {
  display: block;                  /* its own row */
  margin-top: calc(14px * var(--scale));  /* winner and citation read as one unit */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* ~2.6:1 under the winner */
  font-weight: 400;                /* conversational weight */
  line-height: 1.35;               /* a full citation may wrap */
  color: var(--text-dim);          /* secondary text color */
  overflow-wrap: break-word;       /* break very long unbroken words */
}`,
    hasAccent: true,
    tokens: {
      accentWeight: 'calc(4px * var(--scale))',
      labelTracking: '0.22em',
    },
  }),
);
