// bug27 "Fixture Bug" — the SPORT event ident: a solid slab carrying the competition logo, the
// fixture or round name in heavy condensed caps, and the venue/round line beneath, with the
// accent fused along the bottom edge. Sibling of bug03 Slab Bug and lt05/lt06.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug27: TemplateVariant = defineBugVariant(
  {
    id: 'bug27',
    category: 'corner-bug',
    name: 'Fixture Bug',
    styleTag: 'sport',
    description: 'A solid event slab: the competition logo, the fixture name, and the round or venue.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Event', sample: 'CITY CUP 2026' },
      { title: 'Detail', sample: 'QUARTER FINAL · ARENA WEST' },
    ],
    logo: 'built-in',
    animationPresets: ['slide-left', 'snap-stinger', 'pop-spring', 'fade', 'slide-down'],
    defaultPalette: paletteById('inferno'),
    defaultFontId: 'oswald',
    defaultZone: 'top-right',
  },
  {
    name: 'Fixture Bug',
    description:
      'The sport event ident: the competition logo (or a solid accent placeholder block) beside ' +
      'the fixture in heavy condensed caps and the round or venue beneath, on a square-cornered ' +
      'slab with the accent fused along its bottom edge.',
    uicolor: '5',
  },
  (o) => {
    // The competition logo is a real SPX image field ("filelist"); its id comes after every
    // wizard field so nothing collides.
    const slot = {
      field: `f${o.lines.length + o.extraFields.length}`,
      path: o.logoAssetPath ?? '',
      title: 'Event logo',
    };

    return {
      html: `    <!-- Fixture Bug: the competition logo, then the fixture over its round/venue line. -->
    <div class="corner-bug-box">
${bugSlotHtml(slot, 'slab')}
      <div class="corner-bug-text">
${bugLineMasks(o, '        ')}
      </div>
    </div>`,

      extraFields: [bugSlotField(slot)],

      css: `/* The slab — solid, square-cornered, with the accent fused along its bottom edge. */
.corner-bug-box {
  display: flex;                   /* the mark and the text sit side by side */
  align-items: center;             /* both centred on the lockup's axis */
  gap: calc(14px * var(--scale));  /* air between the mark and the text */
  padding: calc(12px * var(--scale)) calc(18px * var(--scale));  /* even air inside the slab */
  background: var(--panel-bg);     /* the solid slab */
  border-bottom: var(--accent-weight) solid var(--accent);  /* the one accent moment */
  border-radius: var(--panel-radius);  /* sport is square-cornered */
  box-shadow: var(--panel-shadow); /* the family's hard offset shadow */
}

${bugSlotCss({ width: 48, height: 48, mark: 'slab', radius: '0' })}

/* The placeholder block is quiet: it marks the slot, it is not a shape in the design. */
.corner-bug-mark {
  opacity: 0.35;                   /* clearly a placeholder until a file is picked */
}

/* The text column — the fixture over its round or venue. */
.corner-bug-text {
  display: flex;                   /* the two lines stack… */
  flex-direction: column;          /* …top to bottom */
  text-align: left;                /* both lines hug the same edge (overrides the zone) */
}

/* The fixture (f0) — heavy condensed caps, the sport voice at bug scale. */
.corner-bug-name {
  font-size: calc(21px * var(--scale) * var(--type-scale));   /* compact — a mark, not a title */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1;                  /* condensed caps need no leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* sport shouts in caps */
  color: var(--text-color);        /* primary text */
}

/* The detail (f1) — the round, stage or venue, as a tracked caps line. */
.corner-bug-title,
.corner-bug-extra {
  margin-top: calc(5px * var(--scale));  /* the two lines read as one lockup */
  font-size: calc(11px * var(--scale) * var(--type-scale));   /* clearly subordinate */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.25;               /* air if it wraps */
  letter-spacing: var(--label-tracking);  /* sport opens its labels up */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* the family's label colour */
}`,

      hasAccent: false, // the accent moment is the slab's fused bottom edge, not an element
    };
  },
);
