// ls26 "Stage Artist" — the performance billing, where the ARTIST leads.
//
// The mirror of ls25, and the pair is the point: a now-playing strap serves a viewer who
// wants to know what they are hearing, while a stage strap serves an audience watching a
// performer they came for. At a festival, a gala or a concert stream the artist is the
// billing — the name on the poster — and the track is what they happen to be playing right
// now. Getting these two round the wrong way is the most common mistake in music graphics.
//
// So the artist is set big, the track sits under it as the current item, and the stage or
// venue closes it. House look, because this is broadcast furniture for a whole night.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { fontById, labelFontFaceCss } from '../../../model/fonts';
import { defineVariant } from '../shared';
import { hasLine, slot } from './shared';

export const ls26: TemplateVariant = defineVariant(
  {
    id: 'ls26',
    category: 'lower-third',
    name: 'Stage Artist',
    styleTag: 'noacg',
    description: 'The artist billed large, with the current track and the stage beneath.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Artist', sample: 'MIRA KANO' },
      { title: 'Track', sample: 'Ultraviolet Hours' },
      { title: 'Stage', sample: 'Main Stage · 22:40' },
    ],
    logo: 'none',
    animationPresets: ['pop-spring', 'slide-up', 'line-reveal', 'mask-wipe', 'fade', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Stage Artist',
    description:
      'The performance billing: the artist set large — they are the name on the poster — with ' +
      'the current track beneath as the item of the moment and the stage and set time closing ' +
      'it in the house mono. The deliberate mirror of Now Playing, which leads with the track ' +
      'because it serves a listener rather than an audience.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- House structure: [8px accent bar] | [void panel: artist / track / stage]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${slot(o, 0, 'lower-third-name')}
${hasLine(o, 1) ? `      <div class="lower-third-trackrow">\n${slot(o, 1, 'lower-third-title', '        ')}\n      </div>` : ''}
${slot(o, 2, 'lower-third-extra')}
    </div>`,

    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The accent bar — 8px, fused to the panel's left edge, with the house's one glow. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  left: 0;                          /* at the very left edge */
  top: 0;                           /* full panel height… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  box-shadow: var(--accent-glow);   /* the family's accent glow */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}

/* The panel — the house void, starting where the accent bar ends. */
.lower-third-box {
  margin-left: calc(8px * var(--scale));    /* starts where the accent bar ends */
  padding: calc(22px * var(--scale)) calc(56px * var(--scale)) calc(24px * var(--scale)) calc(32px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
  max-width: calc(760px * var(--scale));  /* a band name and a track title both run long */
}

/* The artist (f0) — the billing. The largest thing in the pack's music designs, on purpose. */
.lower-third-name {
  font-size: calc(54px * var(--scale) * var(--type-scale));  /* poster size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.02;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The track row — the current item, marked by a small accent tick drawn in the CSS so it
   reads as "playing now" rather than as a second billing line. */
.lower-third-trackrow {
  display: flex;                    /* the tick and the title on one row */
  align-items: baseline;            /* shared baseline */
  gap: calc(11px * var(--scale));
  margin-top: calc(12px * var(--scale));  /* a clear break below the artist */
  min-width: 0;                     /* allow shrinking */
}
.lower-third-trackrow::before {
  content: "";                      /* the "playing" tick, owned by the design */
  flex: none;                       /* never squeezed by a long title */
  align-self: center;               /* centred against the row */
  width: calc(9px * var(--scale));  /* a small square… */
  height: calc(9px * var(--scale)); /* …in the accent */
  background: var(--accent);
}
.lower-third-trackrow > .lower-third-mask {
  display: flex;                    /* the title hugs its own text… */
  min-width: 0;                     /* …and may shrink */
}

/* The track (f1) — the item of the moment. */
.lower-third-title {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* clearly below the artist */
  font-weight: 400;                 /* regular — hierarchy comes from the artist's weight */
  line-height: 1.25;                /* room if a long title wraps */
  color: var(--text-dim);           /* dimmed — never pure white twice */
}

/* The stage and set time (f2) — schedule metadata, in the house mono. */
.lower-third-extra {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* the smallest voice on the strap */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.3;                 /* single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* MAIN STAGE · 22:40, whatever the operator types */
  font-variant-numeric: tabular-nums;  /* set times keep an even rhythm */
  color: var(--label-color);        /* the family's label color */
  margin-top: calc(14px * var(--scale));  /* the stage line is its own beat */
}`,
    hasAccent: true,
  }),
);
