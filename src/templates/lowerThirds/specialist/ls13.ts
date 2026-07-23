// ls13 "Desk Duo" — the two casters on the desk, named together.
//
// Distinct from ls06's commentary booth even though both name a pair: a booth strap runs
// under live play and has to stay out of the way, while a desk strap goes up during the
// analysis segment, when the camera is ON the two of them and the graphic can take the room.
// So the composition is bigger — full names, handles under each — and the pair is set on a
// bright accent floor that ties the two halves into one desk rather than two credits.
//
// Both casters are independent field pairs, and the peer split applies: if the operator
// strips the handles, both casters stay named, which is the one thing this strap must never
// give up.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { duoGridCss, duoSplitBalanced, personColumn } from './shared';

export const ls13: TemplateVariant = defineVariant(
  {
    id: 'ls13',
    category: 'lower-third',
    name: 'Desk Duo',
    styleTag: 'sport',
    roleTag: 'esports',
    keywords: ['casters', 'desk', 'analysts', 'esports', 'tournament', 'two people', 'panel', 'studio'],
    description: 'Two casters side by side on an accent floor, each with their own handle.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Caster 1', sample: 'PRIYA RAGHAVAN' },
      { title: 'Caster 1 handle', sample: '@valkyrie' },
      { title: 'Caster 2', sample: 'TOM ADEYEMI' },
      { title: 'Caster 2 handle', sample: '@lowkey' },
    ],
    logo: 'none',
    animationPresets: ['mask-wipe', 'snap-stinger', 'slide-up', 'fade', 'pop-spring', 'slide-left'],
    defaultPalette: paletteById('royal'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Desk Duo',
    description:
      'The analysis-desk strap: two casters set side by side on a bright accent floor, each ' +
      'with their own name and handle as independent SPX fields. Bigger than a commentary ' +
      'booth credit because the camera is on the pair when it airs. Strip the handles and ' +
      'both casters stay named.',
    uicolor: '3',
  },
  (o) => {
    const { left, right } = duoSplitBalanced(o);
    const classes = {
      column: 'lower-third-person',
      name: 'lower-third-name',
      role: 'lower-third-title',
    };
    const divider = left.length > 0 && right.length > 0
      ? '\n        <!-- Separator — drawn only while both casters are present. -->\n        <div class="lower-third-divider"></div>'
      : '';

    return {
      html: `    <!-- The desk: two casters over a shared accent floor. -->
    <div class="lower-third-box">
      <div class="lower-third-casters">
${personColumn(o, left, classes, '        ')}${divider}
${personColumn(o, right, classes, '        ')}
      </div>
      <div class="lower-third-accent"></div>
    </div>`,

      css: `/* The slab — hard-edged, with the accent as a floor under both casters: one surface
   is what makes the pair read as a desk rather than as two adjacent credits. */
.lower-third-box {
  background: var(--panel-bg);      /* the flat dark slab */
  box-shadow: var(--panel-shadow);  /* the family's hard lift */
  width: fit-content;               /* the slab hugs the pair */
}

/* The accent floor — the graphic's accent node, spanning the whole desk. */
.lower-third-accent {
  height: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  transform-origin: left center;    /* line-reveal draws it from this end */
}

/* The casters row. */
.lower-third-casters {
  padding: calc(20px * var(--scale)) calc(32px * var(--scale)) calc(20px * var(--scale));
}

${duoGridCss({
  gap: 'calc(34px * var(--scale))',
  columnMax: 'calc(420px * var(--scale))',
  divider: true,
  container: '.lower-third-casters',
})}

/* Each caster's name — identical on both sides: on the desk neither one is the guest. */
.lower-third-name {
  font-size: calc(36px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: 700;                 /* bold — the desk strap can take the room */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;        /* the tournament voice */
  color: var(--text-color);         /* primary text color */
}

/* Each caster's handle — the follow line, in the accent so it reads as an address. */
.lower-third-title {
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* clearly below the name */
  font-weight: 600;                 /* semibold keeps a small handle legible */
  line-height: 1.25;                /* room if a long handle wraps */
  letter-spacing: 0.02em;           /* handles are read character by character — a little air helps */
  color: var(--accent);             /* the strap's one coloured word */
  margin-top: calc(6px * var(--scale));  /* tied to the name above it */
}`,
      hasAccent: true,
    };
  },
);
