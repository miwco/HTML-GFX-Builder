// card47 "Volt Location" — the SPORT location card, sibling of lt05 "Angle Slab" / card02
// "Slab Card" / card40 "Volt Offer". The venue/stage marker: a leaning near-black slab with the
// accent edge fused to it, a drawn map pin, the place in huge condensed caps, the region under
// it, and a mono coordinates/detail line at the bottom.
//
// Like card46 "Frost Location", the pin here is a DRAWN MARKER and nothing more — NoaCG has no
// map surface, so no design in this pack plots a coordinate or renders a tile. The coordinates
// line is text the operator types, which is exactly what a venue caption is on air anyway.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card47: TemplateVariant = defineCardVariant(
  {
    id: 'card47',
    category: 'info-card',
    name: 'Volt Location',
    styleTag: 'sport',
    description: 'A venue marker: a pinned place in heavy caps over its region and a coordinates line.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Place', sample: 'ESTÁDIO DA LUZ' },
      { title: 'Region', sample: 'LISBOA · PORTUGAL' },
      { title: 'Detail', sample: '38.7527° N, 9.1848° W · CAPACITY 64,642' },
    ],
    logo: 'none',
    animationPresets: ['snap-stinger', 'mask-wipe', 'slide-left', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Volt Location',
    description:
      'A forward-leaning sport slab with a chunky accent edge: a drawn map pin beside the venue ' +
      'name in heavy condensed caps, the region under it, and a mono coordinates or capacity ' +
      'line at the bottom. The pin is a drawn marker, not a live map — nothing here plots a ' +
      'coordinate, it prints the one you type.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Volt Location: [accent edge] | [leaning slab: pin + place / region / coordinates]. -->
    <div class="info-card-accent"></div>
    <div class="info-card-box">
      <!-- The place row: the drawn pin sits beside the name, never inside its mask. -->
      <div class="info-card-place-row">
        <span class="info-card-pin" aria-hidden="true"></span>
${maskLines([maskLine('info-card', o, 0, 'info-card-place', '        ')])}
      </div>
${maskLines([
  maskLine('info-card', o, 1, 'info-card-region', '      '),
  maskLine('info-card', o, 2, 'info-card-detail', '      '),
])}
    </div>`,
    css: `/* The accent edge — a chunky bar fused to the slab's leaning left side. The lean is
   painted on ::before because presets tween .info-card-accent itself (line-reveal scales it),
   and a skew written there would be flattened. */
.info-card-accent {
  position: absolute;               /* pinned inside the positioned .info-card root */
  left: 0;                          /* at the very left edge */
  top: 0;                           /* full slab height… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's bar weight */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}
.info-card-accent::before {
  content: '';                      /* the painted surface — the element itself stays unskewed */
  position: absolute;               /* fills its parent… */
  inset: 0;                         /* …edge to edge */
  background: var(--accent);        /* the one accent surface */
  transform: skewX(-8deg);          /* the sport family's lean */
}

/* The slab — near-black, leaning, painted on ::before so no preset can straighten it. */
.info-card-box {
  position: relative;               /* the painted slab is placed against this box */
  padding: calc(22px * var(--scale)) calc(48px * var(--scale)) calc(22px * var(--scale)) calc(30px * var(--scale));
}
.info-card-box::before {
  content: '';                      /* the slab surface itself */
  position: absolute;               /* behind the text… */
  inset: 0;                         /* …across the whole box */
  z-index: -1;                      /* …and under it */
  background: var(--panel-bg);      /* the near-black slab */
  transform: skewX(-8deg);          /* the family's lean, matching the accent edge */
  box-shadow: var(--panel-shadow);  /* the family's lift */
}

/* The place row — the pin and the venue name share one baseline. */
.info-card-place-row {
  display: flex;                    /* pin then name, in a row */
  align-items: center;              /* the marker centres against the name's cap height */
  gap: calc(14px * var(--scale));   /* a thin seam between the marker and the words */
}

/* THE PIN — a drawn map marker: a ring with a downward point, made of two CSS shapes.
   It is a symbol for "a place", not a plotted point; see this file's header. */
.info-card-pin {
  position: relative;               /* the centre dot is positioned against the head */
  flex: none;                       /* never squeezed by a long venue name */
  width: calc(30px * var(--scale));  /* the marker head's width… */
  height: calc(30px * var(--scale));  /* …and height: a circle */
  border: calc(5px * var(--scale)) solid var(--accent);  /* the ring — the accent's second moment */
  border-radius: 50% 50% 50% 0;     /* three round corners and one point: the classic pin */
  transform: rotate(-45deg);        /* turn the square corner downward into the tail */
}
.info-card-pin::after {
  content: '';                      /* the marker's centre dot */
  position: absolute;               /* inside the head… */
  inset: calc(5px * var(--scale));  /* …with an even margin all round */
  border-radius: 50%;               /* a true circle */
  background: var(--accent);        /* the same accent, filled */
}

/* The venue name — the slab's one huge voice. */
.info-card-place {
  font-size: calc(58px * var(--scale) * var(--type-scale));  /* the whole design IS this line (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight — heavy condensed */
  line-height: 1;                   /* huge condensed caps sit very tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;        /* the sport register is always caps */
  color: var(--text-color);         /* primary text color */
}

/* The region — where the venue is, in tracked caps. */
.info-card-region {
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* body scale under the venue */
  font-weight: 700;                 /* bold keeps condensed caps legible over video */
  line-height: 1.25;                /* label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* the sport register is always caps */
  margin-top: calc(8px * var(--scale));  /* place → region: they read as one unit */
  color: var(--label-color);        /* the family's label colour */
}

/* The coordinates / capacity line — data, set apart above a hairline. */
.info-card-detail {
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* the smallest voice on the slab */
  font-weight: 400;                 /* regular weight — it is reference, not a headline */
  line-height: 1.35;                /* body text gets room to breathe */
  letter-spacing: 0.06em;           /* condensed figures need air to be read one by one */
  font-variant-numeric: tabular-nums;  /* digits keep one width across updates */
  padding-top: calc(10px * var(--scale));  /* air under the rule */
  margin-top: calc(12px * var(--scale));  /* region → detail: the slab's largest break */
  border-top: 1px solid rgba(255, 255, 255, 0.16);  /* a hairline divider — the family's one rule */
  color: var(--text-dim);           /* dimmed — the third voice on the slab */
}`,
    hasAccent: true,
  }),
);
