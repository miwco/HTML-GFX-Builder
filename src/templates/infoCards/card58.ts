// card58 "Graduate" — the single-name card for the walk across the stage: one graduate, their
// award, and their honours. House style, sibling of card05 (House Title) and cr10 (Graduation
// Roll), which is the same content as a list.
//
// The two designs answer different halves of the same ceremony. cr10 rolls the whole cohort
// for the people watching at home; this one is fired ONE NAME AT A TIME as each graduate is
// read out, which is what the family recording on their phone actually wants on screen.
//
// That makes it an operator-speed graphic: it will be updated and re-taken a few hundred
// times in a row, so the layout has to be stable under any name length. Everything is left
// aligned against the rail and nothing is centred — a centred name shifts the whole card
// every time the next graduate has a shorter surname.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineCardVariant, cardLineMasks } from './shared';

export const card58: TemplateVariant = defineCardVariant(
  {
    id: 'card58',
    category: 'info-card',
    name: 'Graduate',
    styleTag: 'noacg',
    description: 'One graduate at a time — name, award, honours, left-aligned so re-takes never shift the card.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'Ada Fenwick' },
      { title: 'Award', sample: 'BSc Computer Science' },
      { title: 'Honours', sample: 'With Distinction · Dean’s List' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'slide-up', 'blur-in', 'fade', 'mask-wipe'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Graduate',
    description:
      'The house name card for a graduation walk: the graduate in big display type against ' +
      'the amber rail, the award beneath it, and honours in a mono accent line. Left ' +
      'aligned throughout, so firing it two hundred times never makes the card jump.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- Graduate: void panel — amber rail, name, award, honours. -->
    <div class="info-card-accent"></div>
    <div class="info-card-box">
${cardLineMasks(o)}
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The rail — the house's vertical accent edge. It is the .info-card-accent element, so the
   standard presets grow it in ahead of the text. */
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

/* The panel — the house void, sized as a name card rather than a full title card. */
.info-card-box {
  /* The rail is absolutely positioned at the root's left edge, and the panel is painted
     AFTER it in document order — so without this margin the panel's background covers the
     rail completely. Reserving exactly the rail's own width is what keeps it visible. */
  margin-left: var(--accent-weight);  /* the strip the rail occupies */
  padding: calc(28px * var(--scale)) calc(44px * var(--scale));  /* comfortable name-card air */
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
}

/* THE GRADUATE. The whole reason the card is on screen. */
.info-card-name {
  display: block;                  /* its own row */
  font-size: calc(56px * var(--scale) * var(--type-scale));  /* the card's one large line */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken names */
}

/* THE AWARD. What they are graduating with. */
.info-card-title {
  display: block;                  /* its own row */
  margin-top: calc(10px * var(--scale));  /* name and award read as one unit */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* ~2.1:1 under the name */
  font-weight: 400;                /* conversational weight */
  line-height: 1.3;                /* a full degree title may wrap */
  color: var(--text-dim);          /* secondary text color */
  overflow-wrap: break-word;       /* break very long unbroken words */
}

/* THE HONOURS. The mono accent line — the house's way of marking a distinction without
   making it bigger than the person's name. */
.info-card-extra {
  display: block;                  /* its own row */
  margin-top: calc(14px * var(--scale));  /* a clear break from the award above */
  font-family: var(--font-label);  /* the family's mono label face */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* the smallest type on the card */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.3;                /* comfortable if it wraps */
  letter-spacing: var(--label-tracking);  /* wide tracking — the label breathes */
  text-transform: uppercase;       /* label voice, whatever the operator types */
  color: var(--label-color);       /* the honours line carries the accent */
}`,
    hasAccent: true,
    tokens: {
      accentWeight: 'calc(4px * var(--scale))',
      labelTracking: '0.2em',
    },
  }),
);
